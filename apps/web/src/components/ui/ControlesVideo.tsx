/**
 * ControlesVideo.tsx
 * ===================
 * Barra de controles personalizada para `<video>` — estilo Facebook: play/
 * pausa, línea de tiempo, ajustes (velocidad), volumen con slider vertical al
 * hover, y expandir. Reemplaza los controles nativos del navegador, que no se
 * pueden personalizar así (ni la barra de volumen vertical).
 *
 * Solo se usa en escritorio (`lg:`) — los call-sites deciden cuándo montarla;
 * en móvil se sigue usando el atributo `controls` nativo del `<video>` (drag
 * táctil de un slider vertical no es una interacción móvil estándar).
 *
 * Se posiciona `absolute` dentro de un contenedor `relative`/`absolute` que
 * envuelve al `<video>`. Aparece con el mouse en movimiento sobre
 * `contenedorRef` y se oculta tras `TIEMPO_INACTIVIDAD_MS` sin movimiento
 * (salvo con el video en pausa, o mientras el usuario interactúa con algún
 * control — ajustes/volumen abiertos).
 *
 * Ubicación: apps/web/src/components/ui/ControlesVideo.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, MessageCircle, Pause, Play, Settings, Volume1, Volume2, VolumeX } from 'lucide-react';

const TIEMPO_INACTIVIDAD_MS = 2500;
const VELOCIDADES = [0.5, 1, 1.25, 1.5, 2] as const;

interface ControlesVideoProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    /** Contenedor sobre el que se detecta movimiento de mouse para mostrar/ocultar la barra. */
    contenedorRef: React.RefObject<HTMLElement | null>;
    /** Acción del ícono "expandir" — abre el modal fullscreen (en cards) o pide Fullscreen API (en el modal). */
    onExpandir: () => void;
    /** Si se pasa, muestra el ícono de comentarios (estilo Facebook) — abre/cierra el sidebar del caller. */
    onToggleComentarios?: () => void;
    /** Si el sidebar de comentarios del caller está abierto — resalta el ícono en azul. */
    comentariosAbiertos?: boolean;
}

function formatearTiempo(segundos: number): string {
    if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
    const m = Math.floor(segundos / 60);
    const s = Math.floor(segundos % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ControlesVideo({ videoRef, contenedorRef, onExpandir, onToggleComentarios, comentariosAbiertos }: ControlesVideoProps) {
    const [reproduciendo, setReproduciendo] = useState(false);
    const [tiempoActual, setTiempoActual] = useState(0);
    const [duracion, setDuracion] = useState(0);
    const [volumen, setVolumen] = useState(1);
    const [silenciado, setSilenciado] = useState(false);
    const [velocidad, setVelocidad] = useState(1);
    const [visible, setVisible] = useState(true);
    const [ajustesAbiertos, setAjustesAbiertos] = useState(false);
    const [volumenAbierto, setVolumenAbierto] = useState(false);
    const [arrastrandoVolumen, setArrastrandoVolumen] = useState(false);
    const interactuandoRef = useRef(false);
    const ocultarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pillVolumenRef = useRef<HTMLDivElement>(null);
    const wrapperVolumenRef = useRef<HTMLDivElement>(null);

    // Sincronizar estado con el elemento <video> real.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const alReproducir = () => setReproduciendo(true);
        const alPausar = () => setReproduciendo(false);
        const alActualizarTiempo = () => setTiempoActual(video.currentTime);
        const alCargarMetadatos = () => setDuracion(video.duration || 0);
        const alCambiarVolumen = () => {
            setVolumen(video.volume);
            setSilenciado(video.muted);
        };
        video.addEventListener('play', alReproducir);
        video.addEventListener('pause', alPausar);
        video.addEventListener('timeupdate', alActualizarTiempo);
        video.addEventListener('loadedmetadata', alCargarMetadatos);
        video.addEventListener('volumechange', alCambiarVolumen);
        setReproduciendo(!video.paused);
        setDuracion(video.duration || 0);
        setVolumen(video.volume);
        setSilenciado(video.muted);
        return () => {
            video.removeEventListener('play', alReproducir);
            video.removeEventListener('pause', alPausar);
            video.removeEventListener('timeupdate', alActualizarTiempo);
            video.removeEventListener('loadedmetadata', alCargarMetadatos);
            video.removeEventListener('volumechange', alCambiarVolumen);
        };
    }, [videoRef]);

    // Mostrar/ocultar por inactividad del mouse sobre el contenedor.
    useEffect(() => {
        const contenedor = contenedorRef.current;
        if (!contenedor) return;

        const programarOcultar = () => {
            if (ocultarTimeoutRef.current) clearTimeout(ocultarTimeoutRef.current);
            ocultarTimeoutRef.current = setTimeout(() => {
                if (!interactuandoRef.current && reproduciendo) setVisible(false);
            }, TIEMPO_INACTIVIDAD_MS);
        };
        const alMoverMouse = () => {
            setVisible(true);
            programarOcultar();
        };
        const alSalirMouse = () => {
            if (!interactuandoRef.current && reproduciendo) setVisible(false);
        };

        contenedor.addEventListener('mousemove', alMoverMouse);
        contenedor.addEventListener('mouseleave', alSalirMouse);
        programarOcultar();

        return () => {
            contenedor.removeEventListener('mousemove', alMoverMouse);
            contenedor.removeEventListener('mouseleave', alSalirMouse);
            if (ocultarTimeoutRef.current) clearTimeout(ocultarTimeoutRef.current);
        };
    }, [contenedorRef, reproduciendo]);

    // Video en pausa → la barra se queda visible (no tiene sentido ocultarla).
    useEffect(() => {
        if (!reproduciendo) setVisible(true);
    }, [reproduciendo]);

    const alternarPlay = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) video.play(); else video.pause();
    }, [videoRef]);

    const buscar = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video || !duracion) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const fraccion = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        video.currentTime = fraccion * duracion;
    }, [videoRef, duracion]);

    const alternarSilencio = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
    }, [videoRef]);

    const aplicarVolumenDesdeY = useCallback((clientY: number) => {
        const video = videoRef.current;
        const pill = pillVolumenRef.current;
        if (!video || !pill) return;
        const rect = pill.getBoundingClientRect();
        const fraccion = Math.min(1, Math.max(0, (rect.bottom - clientY) / rect.height));
        video.volume = fraccion;
        video.muted = fraccion === 0;
    }, [videoRef]);

    // Mousedown en la barra: fija el volumen a esa posición Y arranca el arrastre —
    // desde ahí el mousemove/mouseup se escuchan en window (no en la pastilla), así
    // el drag sigue funcionando aunque el cursor se salga de la pastilla chica.
    const iniciarArrastreVolumen = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        interactuandoRef.current = true;
        setArrastrandoVolumen(true);
        aplicarVolumenDesdeY(e.clientY);
    }, [aplicarVolumenDesdeY]);

    useEffect(() => {
        if (!arrastrandoVolumen) return;
        const alMover = (e: MouseEvent) => aplicarVolumenDesdeY(e.clientY);
        const alSoltar = (e: MouseEvent) => {
            setArrastrandoVolumen(false);
            interactuandoRef.current = false;
            // Si soltó fuera de la zona del control de volumen, cerrar la pastilla
            // (mientras arrastraba, el mouseleave del wrapper se ignoró a propósito).
            if (!wrapperVolumenRef.current?.contains(e.target as Node)) {
                setVolumenAbierto(false);
            }
        };
        window.addEventListener('mousemove', alMover);
        window.addEventListener('mouseup', alSoltar);
        return () => {
            window.removeEventListener('mousemove', alMover);
            window.removeEventListener('mouseup', alSoltar);
        };
    }, [arrastrandoVolumen, aplicarVolumenDesdeY]);

    const cambiarVelocidad = useCallback((v: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (video) video.playbackRate = v;
        setVelocidad(v);
        setAjustesAbiertos(false);
    }, [videoRef]);

    const progresoPct = duracion > 0 ? (tiempoActual / duracion) * 100 : 0;
    const IconoVolumen = silenciado || volumen === 0 ? VolumeX : volumen < 0.5 ? Volume1 : Volume2;

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 bg-linear-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-8 transition-opacity duration-200 ${visible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        >
            {/* Línea de tiempo */}
            <div onClick={buscar} className="group/seek relative mx-1 h-1 lg:cursor-pointer rounded-full bg-white/30">
                <div className="absolute inset-y-0 left-0 rounded-full bg-blue-500" style={{ width: `${progresoPct}%` }} />
                <div
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500 opacity-0 transition-opacity group-hover/seek:opacity-100"
                    style={{ left: `${progresoPct}%` }}
                />
            </div>

            <div className="flex items-center gap-3 text-white">
                <button type="button" onClick={alternarPlay} aria-label={reproduciendo ? 'Pausar' : 'Reproducir'} className="lg:cursor-pointer">
                    {reproduciendo ? <Pause className="h-4.5 w-4.5" fill="currentColor" /> : <Play className="h-4.5 w-4.5" fill="currentColor" />}
                </button>

                <span className="text-xs font-medium tabular-nums">
                    {formatearTiempo(tiempoActual)} / {formatearTiempo(duracion)}
                </span>

                <div className="flex-1" />

                {/* Comentarios — abre/cierra el sidebar del caller (estilo Facebook) */}
                {onToggleComentarios && (
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleComentarios(); }}
                        aria-label={comentariosAbiertos ? 'Ocultar comentarios' : 'Mostrar comentarios'}
                        aria-pressed={comentariosAbiertos}
                        className={`lg:cursor-pointer ${comentariosAbiertos ? 'text-blue-400' : 'text-white'}`}
                    >
                        <MessageCircle className="h-4.5 w-4.5" fill={comentariosAbiertos ? 'currentColor' : 'none'} />
                    </button>
                )}

                {/* Ajustes — velocidad de reproducción */}
                <div
                    className="relative"
                    onMouseEnter={() => { interactuandoRef.current = true; }}
                    onMouseLeave={() => { interactuandoRef.current = false; }}
                >
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAjustesAbiertos((v) => !v); }}
                        aria-label="Ajustes de reproducción"
                        className="lg:cursor-pointer"
                    >
                        <Settings className="h-4.5 w-4.5" />
                    </button>
                    {ajustesAbiertos && (
                        <div className="absolute bottom-7 right-0 min-w-[84px] overflow-hidden rounded-lg bg-black/90 py-1 text-xs shadow-lg">
                            {VELOCIDADES.map((v) => (
                                <button
                                    key={v}
                                    type="button"
                                    onClick={(e) => cambiarVelocidad(v, e)}
                                    className={`block w-full px-3 py-1.5 text-left lg:cursor-pointer lg:hover:bg-white/10 ${v === velocidad ? 'font-bold text-blue-400' : 'text-white'}`}
                                >
                                    {v === 1 ? 'Normal' : `${v}x`}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Volumen — slider vertical al hover, con bolita arrastrable */}
                <div
                    ref={wrapperVolumenRef}
                    className="relative"
                    onMouseEnter={() => { setVolumenAbierto(true); interactuandoRef.current = true; }}
                    onMouseLeave={() => {
                        if (arrastrandoVolumen) return; // se cierra al soltar (ver iniciarArrastreVolumen)
                        setVolumenAbierto(false);
                        interactuandoRef.current = false;
                    }}
                >
                    {volumenAbierto && (
                        // El wrapper toca el botón sin hueco (`bottom-full`, gap 0) para que el
                        // mouse no pase por encima de "nada" al subir del ícono a la barra — ese
                        // hueco era lo que disparaba mouseleave y escondía la barra a medio camino.
                        // El espacio visual entre ícono y pastilla es `pb-2` (padding, sigue
                        // formando parte del área "hovereable"), no un margen real.
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2">
                            <div
                                ref={pillVolumenRef}
                                onMouseDown={iniciarArrastreVolumen}
                                className="relative h-20 w-5 lg:cursor-pointer rounded-full bg-black/90 p-1 shadow-lg"
                            >
                                <div className="relative h-full w-full rounded-full bg-white/25">
                                    <div
                                        className="absolute inset-x-0 bottom-0 rounded-full bg-blue-500"
                                        style={{ height: `${silenciado ? 0 : volumen * 100}%` }}
                                    />
                                    {/* Bolita — arrastrable, se posiciona en el nivel de volumen actual */}
                                    <div
                                        className="absolute left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow"
                                        style={{ bottom: `${silenciado ? 0 : volumen * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <button type="button" onClick={alternarSilencio} aria-label={silenciado ? 'Activar sonido' : 'Silenciar'} className="lg:cursor-pointer">
                        <IconoVolumen className="h-4.5 w-4.5" />
                    </button>
                </div>

                <button type="button" onClick={(e) => { e.stopPropagation(); onExpandir(); }} aria-label="Expandir" className="lg:cursor-pointer">
                    <Maximize2 className="h-4.5 w-4.5" />
                </button>
            </div>
        </div>
    );
}

export default ControlesVideo;
