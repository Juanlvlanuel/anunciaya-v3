/**
 * ModalVideoFeed.tsx
 * ===================
 * Reproductor de video para el feed. Botón de cerrar: X gris arriba a la
 * izquierda, DENTRO del wrapper que se manda a fullscreen nativo (no afuera
 * como hermano) — si quedara afuera desaparecería al entrar a fullscreen y el
 * navegador metería su propio control genérico encima, que no se puede ni
 * estilizar ni quitar (bug real encontrado 1-ago-2026: el header vivía fuera
 * del wrapper, así que en escritorio el usuario veía la "X" nativa del
 * navegador en vez de la nuestra).
 *
 * Comentarios (`children`, opcional, solo escritorio) — estilo Facebook:
 * sidebar blanco a la derecha que se abre/cierra con el ícono de comentarios
 * de `ControlesVideo`, arranca CERRADO (el video es lo primero que se ve). El
 * caller pasa la MISMA "Sección comentarios" que usa en el resto del módulo
 * (`SeccionComentariosMarketplace` / `SeccionComentariosPublicacionNegocio` /
 * en Servicios `ListaComentariosServicio`+`InputComentarioServicio`) — no hay
 * lista/input propios acá. Al igual que el botón de cerrar, el sidebar vive
 * DENTRO del wrapper que se fullscreenea (si no, desaparecería en fullscreen
 * nativo por la misma razón que el botón de cerrar). En móvil el ícono de
 * comentarios de `ControlesVideo` no aparece (ver ese componente) — comentar
 * ahí sigue siendo desde el modal de comentarios normal del módulo.
 *
 * Ocupa toda la pantalla en cualquier breakpoint (móvil y escritorio). Usa
 * `ControlesVideo` (barra propia estilo Facebook: play/pausa, línea de tiempo
 * arrastrable, ajustes) en vez de los controles nativos del navegador, en
 * AMBOS breakpoints — en escritorio con volumen/expandir/comentarios
 * completos, en móvil simplificada (ver docstring de `ControlesVideo`) y con
 * la barra mostrándose/ocultándose con un tap en cualquier parte del video
 * (`mostrarPorTap`, default true). Solo en escritorio, al abrirse pide
 * automáticamente la pantalla completa NATIVA del navegador (Fullscreen API)
 * sobre el WRAPPER que contiene video + controles + botón de cerrar +
 * sidebar. En móvil NO se pide fullscreen nativo: `playsInline` mantiene el
 * video dentro de nuestra propia UI; pedir fullscreen ahí tomaría el
 * reproductor del sistema operativo y taparía nuestra UI.
 *
 * Click directo sobre el video (solo escritorio, cursor `pointer`): 1 click
 * = play/pausa, 2 clicks rápidos = minimizar (cerrar). Se distingue con un
 * timeout de 250ms en vez de `onClick`+`onDoubleClick` directos, porque un
 * doble click real dispara igual 2 eventos "click" antes del "dblclick". En
 * móvil este gesto no aplica — el tap ahí lo captura `ControlesVideo`
 * (mostrar/ocultar barra) y el play/pausa vive como botón dentro de ella.
 *
 * Reusa `usePortalTarget` + `useBackNativo` — mismo patrón que `ModalImagenes.tsx`.
 *
 * Ubicación: apps/web/src/components/ui/ModalVideoFeed.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { usePortalTarget, PortalTargetProvider } from '../../hooks/usePortalTarget';
import { useBackNativo } from '../../hooks/useBackNativo';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { ControlesVideo } from './ControlesVideo';

interface ModalVideoFeedProps {
    isOpen: boolean;
    onClose: () => void;
    videoUrl: string;
    posterUrl?: string;
    /** Sección de comentarios del módulo (lista + input) — sidebar de escritorio, toggleable. */
    children?: React.ReactNode;
}

export function ModalVideoFeed({ isOpen, onClose, videoUrl, posterUrl, children }: ModalVideoFeedProps) {
    const portalTarget = usePortalTarget();
    const videoRef = useRef<HTMLVideoElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    // Estado espejo del wrapper (además del ref) para poder pasarlo como target
    // reactivo a PortalTargetProvider — ver por qué más abajo, junto al sidebar.
    const [wrapperElement, setWrapperElement] = useState<HTMLDivElement | null>(null);
    const asignarWrapperRef = (el: HTMLDivElement | null) => {
        wrapperRef.current = el;
        setWrapperElement(el);
    };
    const { esEscritorio } = useBreakpoint();
    const [comentariosAbiertos, setComentariosAbiertos] = useState(false);

    useBackNativo({
        abierto: isOpen,
        onCerrar: onClose,
        discriminador: '_modalVideoFeed',
    });

    // Bloquear scroll del body mientras está abierto (mismo criterio que ModalImagenes).
    useEffect(() => {
        if (!isOpen) return;
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.bottom = '0';
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.bottom = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            window.scrollTo(0, scrollY);
        };
    }, [isOpen]);

    // Escritorio: pedir pantalla completa nativa del wrapper (video + barra propia) al
    // abrir (estilo Facebook). Si el navegador rechaza el gesto, se queda con el
    // fallback visual: nuestro modal ya cubre toda la pantalla igual.
    useEffect(() => {
        if (!isOpen || !esEscritorio) return;
        wrapperRef.current?.requestFullscreen?.().catch(() => {});
    }, [isOpen, esEscritorio]);

    // Si el usuario sale de la pantalla completa nativa (Esc), cerramos el modal
    // también — son la misma superficie.
    useEffect(() => {
        if (!isOpen || !esEscritorio) return;
        const manejarCambio = () => {
            if (document.fullscreenElement !== wrapperRef.current) onClose();
        };
        document.addEventListener('fullscreenchange', manejarCambio);
        return () => document.removeEventListener('fullscreenchange', manejarCambio);
    }, [isOpen, esEscritorio, onClose]);

    // Click en el video (solo escritorio): 1 click = play/pausa, 2 clicks rápidos =
    // minimizar (cerrar). Se distingue con un timeout corto en vez de onClick+
    // onDoubleClick directos — un doble click SIEMPRE dispara 2 "click" antes del
    // "dblclick", así que sin esto el video pausaría y reproduciría de golpe (y podría
    // pelearse con el .play()/.pause() en vuelo) justo antes de cerrarse.
    const clickVideoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const manejarClickVideo = () => {
        if (clickVideoTimeoutRef.current) {
            clearTimeout(clickVideoTimeoutRef.current);
            clickVideoTimeoutRef.current = null;
            cerrar();
            return;
        }
        clickVideoTimeoutRef.current = setTimeout(() => {
            clickVideoTimeoutRef.current = null;
            const video = videoRef.current;
            if (!video) return;
            if (video.paused) video.play(); else video.pause();
        }, 250);
    };
    useEffect(() => () => {
        if (clickVideoTimeoutRef.current) clearTimeout(clickVideoTimeoutRef.current);
    }, []);

    // El botón "expandir" de la barra propia: si ya está en fullscreen nativo lo
    // encoge, si no lo pide (por si el navegador rechazó el intento automático).
    const alternarFullscreenNativo = () => {
        if (document.fullscreenElement === wrapperRef.current) {
            document.exitFullscreen().catch(() => {});
        } else {
            wrapperRef.current?.requestFullscreen?.().catch(() => {});
        }
    };

    // Salir de pantalla completa nativa antes de cerrar por otras vías (flecha,
    // back nativo) — si no, el navegador queda "atorado" en fullscreen un instante
    // mientras el modal ya desapareció.
    const cerrar = () => {
        if (document.fullscreenElement === wrapperRef.current) {
            document.exitFullscreen().catch(() => {});
        }
        onClose();
    };

    // Escape para cerrar en escritorio (mismo criterio que ModalImagenes).
    useEffect(() => {
        if (!isOpen) return;
        const manejarTecla = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cerrar();
        };
        window.addEventListener('keydown', manejarTecla);
        return () => window.removeEventListener('keydown', manejarTecla);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;

    const mostrarSidebar = esEscritorio && comentariosAbiertos && !!children;

    return createPortal(
        <div className="fixed inset-0 z-9999 bg-black">
            {/* Wrapper — TODO lo que debe seguir visible en fullscreen nativo vive
                ADENTRO de este div (video, controles, botón de cerrar, sidebar de
                comentarios): si algo quedara afuera (hermano), desaparecería al entrar a
                fullscreen nativo — el navegador solo renderiza el elemento fullscreenado
                y sus hijos — y en el caso del botón de cerrar, el navegador terminaba
                metiendo su propio control genérico encima, que no podemos ni estilizar
                ni quitar. */}
            <div ref={asignarWrapperRef} className="flex h-full w-full bg-black">
                {/* Video */}
                <div
                    className={`relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black ${esEscritorio ? 'lg:cursor-pointer' : ''}`}
                    onClick={esEscritorio ? manejarClickVideo : undefined}
                >
                    {/* Cerrar — X gris a la izquierda (reemplaza la flecha de regreso: en
                        escritorio, con fullscreen nativo activo, es lo único visible para salir). */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); cerrar(); }}
                        aria-label="Cerrar"
                        data-testid="modal-video-feed-regresar"
                        className="absolute left-4 top-[calc(1rem+env(safe-area-inset-top,0px))] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-slate-600/60 text-white lg:cursor-pointer lg:hover:bg-slate-500/70"
                    >
                        <X className="h-6 w-6" strokeWidth={2.5} />
                    </button>

                    <video
                        ref={videoRef}
                        src={videoUrl}
                        poster={posterUrl}
                        autoPlay
                        playsInline
                        disablePictureInPicture
                        disableRemotePlayback
                        className="max-h-full max-w-full"
                    />
                    <ControlesVideo
                        videoRef={videoRef}
                        contenedorRef={wrapperRef}
                        onExpandir={alternarFullscreenNativo}
                        onToggleComentarios={children ? () => setComentariosAbiertos((v) => !v) : undefined}
                        comentariosAbiertos={comentariosAbiertos}
                    />
                </div>

                {/* Comentarios — sidebar blanco a la derecha, estilo Facebook.
                    Envuelto en PortalTargetProvider apuntando al wrapper (no a
                    document.body): dentro de él viven menús propios que hacen
                    su propio createPortal (ej. el ⋮ de cada comentario, ver
                    ComentarioItem.tsx) — sin esto, esos portales caerían fuera
                    del elemento en Fullscreen API nativo y quedarían invisibles
                    (bug real encontrado 2-ago-2026, mismo motivo que el botón
                    de cerrar de este modal). */}
                {mostrarSidebar && (
                    <div className="flex h-full w-[420px] shrink-0 flex-col overflow-hidden bg-white p-4">
                        <PortalTargetProvider target={wrapperElement}>
                            {children}
                        </PortalTargetProvider>
                    </div>
                )}
            </div>
        </div>,
        portalTarget
    );
}

export default ModalVideoFeed;
