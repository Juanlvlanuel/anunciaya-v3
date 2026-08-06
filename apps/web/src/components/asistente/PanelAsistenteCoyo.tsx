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
import { Loader2, Mic, Send, Square, Trash2, Volume2, VolumeX, X } from 'lucide-react';
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

    // Cuando useAudioChat termina de procesar la grabación, mandar el audio.
    useEffect(() => {
        if (!audioChat.audioListo) return;
        agregarMensaje({ rol: 'usuario', texto: '🎤 Mensaje de voz', origenVoz: true });
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
                    onClick={vaciarChat}
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
                                {m.texto}
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

                {/* Input */}
                <div
                    className="flex shrink-0 items-center gap-2 border-t border-slate-100 px-3 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))]"
                >
                    <input
                        type="text"
                        data-testid="asistente-input-texto"
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEnviarTexto();
                        }}
                        placeholder={audioChat.grabando ? `Grabando… ${audioChat.duracion.toFixed(0)}s` : 'Escribe o graba tu mensaje'}
                        disabled={audioChat.grabando}
                        className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[14px] text-slate-800 outline-none placeholder:text-slate-400"
                    />
                    <button
                        type="button"
                        data-testid="asistente-btn-mic"
                        aria-label={audioChat.grabando ? 'Detener grabación' : 'Grabar mensaje de voz'}
                        onClick={handleClickMic}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full lg:cursor-pointer ${
                            audioChat.grabando ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 lg:hover:bg-slate-200'
                        }`}
                    >
                        {audioChat.grabando ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <button
                        type="button"
                        data-testid="asistente-btn-enviar"
                        aria-label="Enviar"
                        onClick={handleEnviarTexto}
                        disabled={!texto.trim() || interpretarMutation.isPending || audioChat.grabando}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white disabled:cursor-not-allowed disabled:opacity-40 lg:cursor-pointer lg:hover:bg-amber-700"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
                {audioChat.error && (
                    <p className="px-3 pb-2 text-xs text-red-600">{audioChat.error}</p>
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

export default PanelAsistenteCoyo;
