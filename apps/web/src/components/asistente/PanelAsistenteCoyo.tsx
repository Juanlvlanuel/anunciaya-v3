/**
 * PanelAsistenteCoyo.tsx
 * =========================
 * Panel de chat del Asistente Coyo (FAB global) — Fase 1: navegar a una
 * sección, armar el borrador de una publicación de MarketPlace, o responder
 * preguntas normales (mismo buscador del Home). Texto o voz; historial
 * persistido en `localStorage` (useAsistenteCoyoStore) con botón de vaciar.
 *
 * Regla de oro: NUNCA publica nada solo. Una acción de "crear publicación"
 * solo dejar armado el borrador — el usuario da el último "Publicar" en el
 * composer, con sus propias casillas legales.
 *
 * Ubicación: apps/web/src/components/asistente/PanelAsistenteCoyo.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Mic, Pause, Play, Send, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { useUiStore } from '../../stores/useUiStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useAsistenteCoyoStore, type MensajeAsistenteCoyo } from '../../stores/useAsistenteCoyoStore';
import { useComposerPrefillStore } from '../../stores/composerPrefillStore';
import {
    useInterpretarAsistente,
    type InterpretarAsistentePayload,
    type ResultadoAsistente,
    type TurnoChatAsistente,
} from '../../hooks/queries/useAsistente';
import { useAudioChat } from '../../hooks/useAudioChat';
import { useVozCoyo } from '../../hooks/useVozCoyo';
import { FILTRO_CONTORNO_COYO } from '../../config/estilosCoyo';
import { AnimacionBasuraAudio } from '../ui/AnimacionBasuraAudio';

/** Formatea segundos como "0:0X" / "X:XX" — mismo formato que ChatYA. */
function formatearDuracion(segundos: number): string {
    const s = Math.floor(segundos);
    const min = Math.floor(s / 60);
    const seg = s % 60;
    return `${min}:${seg.toString().padStart(2, '0')}`;
}

/** Máximo de turnos previos que se mandan como contexto — el backend también topa en 20. */
const MAX_TURNOS_HISTORIAL = 10;

function blobABase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const resultado = reader.result as string;
            resolve(resultado.split(',')[1] ?? '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export function PanelAsistenteCoyo() {
    const asistenteCoyoAbierto = useUiStore((s) => s.asistenteCoyoAbierto);
    const cerrarAsistenteCoyo = useUiStore((s) => s.cerrarAsistenteCoyo);

    const mensajes = useAsistenteCoyoStore((s) => s.mensajes);
    const silenciado = useAsistenteCoyoStore((s) => s.silenciado);
    const hidratarDesdeStorage = useAsistenteCoyoStore((s) => s.hidratarDesdeStorage);
    const agregarMensaje = useAsistenteCoyoStore((s) => s.agregarMensaje);
    const vaciarChat = useAsistenteCoyoStore((s) => s.vaciarChat);
    const toggleSilenciado = useAsistenteCoyoStore((s) => s.toggleSilenciado);

    const usuario = useAuthStore((s) => s.usuario);
    const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? undefined);
    const lat = useGpsStore((s) => s.latitud ?? undefined);
    const lng = useGpsStore((s) => s.longitud ?? undefined);
    const location = useLocation();
    const navigate = useNavigate();

    const interpretarMutation = useInterpretarAsistente();
    const audioChat = useAudioChat();
    const { hablar, detener } = useVozCoyo();

    const [texto, setTexto] = useState('');
    const [animacionBasura, setAnimacionBasura] = useState(false);
    const listaRef = useRef<HTMLDivElement>(null);

    const { esMobile } = useBreakpoint();
    const chatYAAbierto = useUiStore((s) => s.chatYAAbierto);

    useEffect(() => {
        if (asistenteCoyoAbierto) hidratarDesdeStorage();
    }, [asistenteCoyoAbierto, hidratarDesdeStorage]);

    // Único cierre automático: cuando se abre ChatYA. Ambos son sidebars del
    // mismo lado en escritorio — ChatYA gana. Cualquier otro cierre (navegar,
    // dejar un borrador listo, click afuera) queda desactivado a propósito:
    // el usuario quiere poder seguir viendo/hablando con Coyo mientras
    // navega o revisa lo que le armó. Solo la "X" cierra.
    useEffect(() => {
        if (chatYAAbierto) cerrarAsistenteCoyo();
    }, [chatYAAbierto, cerrarAsistenteCoyo]);

    // Auto-scroll al fondo con cada mensaje nuevo.
    useEffect(() => {
        listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: 'smooth' });
    }, [mensajes.length]);

    // Cortar cualquier audio en curso al cerrar el panel.
    useEffect(() => {
        if (!asistenteCoyoAbierto) detener();
    }, [asistenteCoyoAbierto, detener]);

    function construirHistorial(): TurnoChatAsistente[] {
        return useAsistenteCoyoStore
            .getState()
            .mensajes.slice(-MAX_TURNOS_HISTORIAL)
            .map((m) => ({ rol: m.rol, texto: m.texto }));
    }

    function procesarResultado(resultado: ResultadoAsistente, origenVoz: boolean) {
        switch (resultado.tipo) {
            case 'pregunta':
            case 'respuesta': {
                agregarMensaje({ rol: 'coyo', texto: resultado.texto });
                if (origenVoz) hablar(resultado.texto);
                break;
            }
            case 'navegar': {
                // `mensaje` viene de Gemini (explica cómo seguir desde ahí, ej.
                // "abre el cupón y toca revelar código"). Si no generó nada,
                // cae al texto genérico.
                const respuesta = resultado.mensaje?.trim() || 'Listo, ahí te dejo 👋';
                agregarMensaje({ rol: 'coyo', texto: respuesta });
                if (origenVoz) hablar(respuesta);
                // No se cierra: el usuario quiere seguir viendo/hablando con
                // Coyo mientras navega. Solo la "X" cierra el panel.
                navigate(resultado.ruta);
                break;
            }
            case 'prefill_marketplace': {
                const respuesta = resultado.mensaje?.trim() || 'Te dejo esto listo para que lo revises y publiques.';
                agregarMensaje({
                    rol: 'coyo',
                    texto: respuesta,
                    accionPublicarMarketplace: {
                        ruta: resultado.ruta,
                        titulo: resultado.descripcionArticulo,
                        precio: resultado.precio,
                    },
                });
                if (origenVoz) hablar(respuesta);
                break;
            }
        }
    }

    function enviarTurno(
        payloadTurno: { texto?: string; audioBase64?: string; audioMimeType?: InterpretarAsistentePayload['audioMimeType'] },
        origenVoz: boolean,
    ) {
        const historial = construirHistorial();
        interpretarMutation.mutate(
            {
                ...payloadTurno,
                historial,
                rutaActual: location.pathname,
                modoComercial: usuario?.modoActivo === 'comercial',
                ciudad,
                lat,
                lng,
            },
            {
                onSuccess: (data) => {
                    if (data.success) {
                        procesarResultado(data.resultado, origenVoz);
                    } else {
                        agregarMensaje({ rol: 'coyo', texto: 'Ahorita no puedo ayudarte, ¿lo intentamos de nuevo?' });
                    }
                },
                onError: () => {
                    agregarMensaje({ rol: 'coyo', texto: 'Se me fue la señal, ¿lo intentas de nuevo en un momento?' });
                },
            },
        );
    }

    function handleEnviarTexto() {
        const mensaje = texto.trim();
        if (!mensaje || interpretarMutation.isPending) return;
        agregarMensaje({ rol: 'usuario', texto: mensaje });
        setTexto('');
        enviarTurno({ texto: mensaje }, false);
    }

    function handleClickMic() {
        if (audioChat.grabando) {
            audioChat.detenerGrabacion();
        } else {
            audioChat.iniciarGrabacion();
        }
    }

    function handleCancelarGrabacion() {
        audioChat.cancelarGrabacion();
        setAnimacionBasura(true);
    }

    // Cuando useAudioChat termina de procesar la grabación, mandar el audio.
    // El blob se guarda como object URL SOLO en memoria de esta pestaña (para
    // poder reproducirlo en la burbuja) — nunca se sube a ningún lado.
    useEffect(() => {
        if (!audioChat.audioListo) return;
        const { blob, waveform, duracion } = audioChat.audioListo;
        agregarMensaje({
            rol: 'usuario',
            texto: '🎤 Mensaje de voz',
            origenVoz: true,
            audioUrl: URL.createObjectURL(blob),
            audioWaveform: waveform,
            audioDuracion: duracion,
        });
        blobABase64(audioChat.audioListo.blob).then((audioBase64) => {
            enviarTurno(
                {
                    audioBase64,
                    audioMimeType: audioChat.audioListo!.contentType as InterpretarAsistentePayload['audioMimeType'],
                },
                true,
            );
        });
        audioChat.limpiar();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [audioChat.audioListo]);

    /** Revoca los object URLs de audio antes de vaciar — si no, quedan colgados en memoria del navegador. */
    function handleVaciarChat() {
        useAsistenteCoyoStore.getState().mensajes.forEach((m) => {
            if (m.audioUrl) URL.revokeObjectURL(m.audioUrl);
        });
        vaciarChat();
    }

    function handleClickPublicar(accion: NonNullable<MensajeAsistenteCoyo['accionPublicarMarketplace']>) {
        useComposerPrefillStore.getState().setPrefillMarketplace({
            titulo: accion.titulo,
            precio: accion.precio,
        });
        // No se cierra: mismo criterio que "navegar" — el usuario decide
        // cuándo cerrar, con la "X".
        navigate(accion.ruta);
    }

    if (!asistenteCoyoAbierto) return null;

    const contenido = (
        <>
            {/* Header */}
            <div className={`flex shrink-0 items-center gap-2.5 bg-linear-to-br from-amber-500 to-amber-700 px-4 py-3 ${esMobile ? 'rounded-t-2xl' : ''}`}>
                <img
                    src="/cabeza-coyo.webp"
                    alt=""
                    className="h-12 w-12 shrink-0 object-contain"
                    style={{ filter: FILTRO_CONTORNO_COYO }}
                />
                <div className="flex-1 min-w-0">
                    <span className="block text-[15px] font-bold leading-tight text-white">Coyo</span>
                    <span className="block text-[12px] leading-tight text-white/85">Tu asistente virtual</span>
                </div>
                {/* Los 3 íconos de acción: un poco más grandes en móvil, tamaño normal en escritorio. */}
                <button
                    type="button"
                    data-testid="asistente-toggle-silenciado"
                    aria-label={silenciado ? 'Activar voz' : 'Silenciar voz'}
                    onClick={toggleSilenciado}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 lg:h-8 lg:w-8 lg:cursor-pointer lg:hover:bg-white/15"
                >
                    {silenciado ? <VolumeX className="h-5 w-5 lg:h-4 lg:w-4" /> : <Volume2 className="h-5 w-5 lg:h-4 lg:w-4" />}
                </button>
                <button
                    type="button"
                    data-testid="asistente-vaciar-chat"
                    aria-label="Vaciar chat"
                    onClick={handleVaciarChat}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 lg:h-8 lg:w-8 lg:cursor-pointer lg:hover:bg-white/15"
                >
                    <Trash2 className="h-5 w-5 lg:h-4 lg:w-4" />
                </button>
                <button
                    type="button"
                    data-testid="asistente-cerrar"
                    aria-label="Cerrar"
                    onClick={cerrarAsistenteCoyo}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/90 lg:h-8 lg:w-8 lg:cursor-pointer lg:hover:bg-white/15"
                >
                    <X className="h-6 w-6 lg:h-5 lg:w-5" />
                </button>
            </div>

            {/* Mensajes */}
                <div ref={listaRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
                    {mensajes.length === 0 && (
                        <p className="px-2 text-center text-sm text-slate-500">
                            Pregúntame algo de tu ciudad, o dime qué quieres hacer — por ejemplo &ldquo;quiero vender mi bicicleta en 800&rdquo;.
                        </p>
                    )}
                    {mensajes.map((m) => (
                        <div key={m.id} className={`flex ${m.rol === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                            <div
                                data-testid={`asistente-mensaje-${m.rol}`}
                                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${
                                    m.rol === 'usuario'
                                        ? 'bg-slate-800 text-white'
                                        : 'border border-amber-200 bg-amber-50 text-slate-800'
                                }`}
                            >
                                {m.audioUrl ? (
                                    <BurbujaAudioCoyo url={m.audioUrl} waveform={m.audioWaveform ?? []} duracion={m.audioDuracion ?? 0} />
                                ) : (
                                    m.texto
                                )}
                                {m.accionPublicarMarketplace && (
                                    <button
                                        type="button"
                                        data-testid="asistente-btn-revisar-publicar"
                                        onClick={() => handleClickPublicar(m.accionPublicarMarketplace!)}
                                        className="mt-2 block w-full rounded-full bg-teal-600 px-3 py-1.5 text-center text-[13px] font-semibold text-white lg:cursor-pointer lg:hover:bg-teal-700"
                                    >
                                        Revisar y publicar
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {interpretarMutation.isPending && (
                        <div className="flex justify-start">
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-amber-700" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input — modo normal o barra de grabación (mismo patrón visual que ChatYA: onda en vivo + timer + cancelar). */}
                <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))]">
                    {audioChat.grabando ? (
                        <>
                            <button
                                type="button"
                                data-testid="asistente-audio-cancelar"
                                aria-label="Cancelar grabación"
                                onClick={handleCancelarGrabacion}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-500 lg:cursor-pointer lg:hover:bg-red-50"
                            >
                                <X className="h-6 w-6" />
                            </button>

                            <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-red-200 bg-red-50 py-2 pl-3 pr-4">
                                <div className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
                                <div className="flex h-7 flex-1 items-center gap-0.5 overflow-hidden">
                                    {(audioChat.waveformEnVivo.length > 0
                                        ? audioChat.waveformEnVivo
                                        : Array.from({ length: 20 }, () => 0.15)
                                    ).map((valor, i) => (
                                        <div
                                            key={i}
                                            className="w-[2.5px] shrink-0 rounded-full bg-red-500"
                                            style={{ height: `${Math.max(15, valor * 100)}%`, minHeight: '3px' }}
                                        />
                                    ))}
                                </div>
                                <span className="min-w-10 shrink-0 text-right text-sm font-medium tabular-nums text-red-600">
                                    {formatearDuracion(audioChat.duracion)}
                                </span>
                            </div>

                            <button
                                type="button"
                                data-testid="asistente-audio-detener"
                                aria-label="Detener y enviar"
                                onClick={handleClickMic}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-red-500 to-red-600 text-white shadow-[0_3px_10px_rgba(239,68,68,0.3)] lg:cursor-pointer lg:hover:scale-105"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                data-testid="asistente-input-texto"
                                value={texto}
                                onChange={(e) => setTexto(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleEnviarTexto();
                                }}
                                placeholder="Escribe o graba tu mensaje"
                                className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[14px] text-slate-800 outline-none placeholder:text-slate-400"
                            />
                            <button
                                type="button"
                                data-testid="asistente-btn-mic"
                                aria-label="Grabar mensaje de voz"
                                onClick={handleClickMic}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 lg:cursor-pointer lg:hover:bg-slate-200"
                            >
                                <Mic className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                data-testid="asistente-btn-enviar"
                                aria-label="Enviar"
                                onClick={handleEnviarTexto}
                                disabled={!texto.trim() || interpretarMutation.isPending}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white disabled:cursor-not-allowed disabled:opacity-40 lg:cursor-pointer lg:hover:bg-amber-700"
                            >
                                <Send className="h-5 w-5" />
                            </button>
                        </>
                    )}
                </div>
                {audioChat.error && (
                    <p className="px-3 pb-2 text-xs text-red-600">{audioChat.error}</p>
                )}
                {animacionBasura && (
                    <AnimacionBasuraAudio onCompleta={() => setAnimacionBasura(false)} />
                )}
        </>
    );

    // Móvil: bottom sheet con backdrop. Escritorio: sidebar de alto completo (ver abajo).
    if (esMobile) {
        return (
            <div className="fixed inset-0 z-[60] flex items-end justify-center">
                {/* Sin onClick: el panel solo cierra con la "X" (pedido explícito). */}
                <div className="absolute inset-0 bg-slate-900/40" aria-hidden />
                <div
                    data-testid="panel-asistente-coyo"
                    className="relative flex h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl"
                >
                    {contenido}
                </div>
            </div>
        );
    }

    // Escritorio: sidebar pegado al borde derecho, arrancando justo debajo
    // del header — usa `--ay-navbar-h` (medida en vivo por `MainLayout.tsx`,
    // mismo mecanismo que ya usa ChatYA para no taparlo). Ancho pensado para
    // cubrir la columna de publicidad y un poco más — esa columna mide
    // EXACTO `lg:w-56 2xl:w-80` (224px/320px, ver `ColumnaDerecha` en
    // `MainLayout.tsx`).
    return (
        <div
            data-testid="panel-asistente-coyo"
            className="fixed right-0 bottom-0 z-[60] flex w-[260px] flex-col bg-white shadow-2xl lg:w-[260px] 2xl:w-[360px]"
            style={{ top: 'var(--ay-navbar-h, 72px)' }}
        >
            {contenido}
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTE: burbuja de audio grabado (onda + reproducir)
// =============================================================================

interface BurbujaAudioCoyoProps {
    url: string;
    waveform: number[];
    duracion: number;
}

/** Reproductor simple del audio que el usuario grabó — onda estática (misma data que capturó `useAudioChat`) + play/pausa. Solo vive mientras dure la pestaña (`url` es un blob URL, nunca se sube a ningún lado). */
function BurbujaAudioCoyo({ url, waveform, duracion }: BurbujaAudioCoyoProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [reproduciendo, setReproduciendo] = useState(false);

    function toggle() {
        const audio = audioRef.current;
        if (!audio) return;
        if (reproduciendo) {
            audio.pause();
        } else {
            audio.play().catch(() => undefined);
        }
    }

    return (
        <div className="flex min-w-[160px] items-center gap-2">
            <audio
                ref={audioRef}
                src={url}
                onPlay={() => setReproduciendo(true)}
                onPause={() => setReproduciendo(false)}
                onEnded={() => setReproduciendo(false)}
                className="hidden"
            />
            <button
                type="button"
                data-testid="asistente-audio-play"
                aria-label={reproduciendo ? 'Pausar' : 'Reproducir'}
                onClick={toggle}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-800 lg:cursor-pointer"
            >
                {reproduciendo ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-0.5" />}
            </button>
            <div className="flex flex-1 items-center gap-0.5 h-6 overflow-hidden">
                {(waveform.length > 0 ? waveform : Array.from({ length: 24 }, () => 0.3)).map((valor, i) => (
                    <div
                        key={i}
                        className="w-[2.5px] shrink-0 rounded-full bg-slate-400"
                        style={{ height: `${Math.max(15, valor * 100)}%`, minHeight: '3px' }}
                    />
                ))}
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-slate-300">{formatearDuracion(duracion)}</span>
        </div>
    );
}

export default PanelAsistenteCoyo;
