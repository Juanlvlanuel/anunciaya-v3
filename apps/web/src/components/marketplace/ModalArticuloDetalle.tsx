/**
 * ModalArticuloDetalle.tsx
 * =========================
 * Modal overlay estilo Facebook que muestra la card del feed completa sobre
 * el feed, sin cambiar de página. Se abre al hacer click en
 * "Ver N preguntas más" en la card del feed.
 *
 * Renderiza directamente `<CardArticuloFeed>` adentro — mismo diseño del
 * feed con todas las preguntas visibles (modo expandido). El modal solo
 * añade el chrome: backdrop, X para cerrar, soporte para back nativo.
 *
 * Comportamiento:
 *  - Backdrop oscuro + modal centrado en desktop, full-screen en móvil.
 *  - Header con X para cerrar.
 *  - Body scrollable: la card del feed completa, con todas las preguntas
 *    expandidas (sin "Ver más" interno — ya estamos en la vista completa).
 *  - history.pushState al abrir → el botón back nativo del celular cierra
 *    el modal sin salir del feed.
 *  - Tecla Escape también cierra.
 *
 * Ubicación: apps/web/src/components/marketplace/ModalArticuloDetalle.tsx
 */

import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { CardArticuloFeed } from './CardArticuloFeed';
import type { ArticuloFeedInfinito } from '../../types/marketplace';

interface ModalArticuloDetalleProps {
    articulo: ArticuloFeedInfinito | null;
    onClose: () => void;
}

export function ModalArticuloDetalle({ articulo, onClose }: ModalArticuloDetalleProps) {
    // ─── History API: back nativo cierra el modal ───────────────────────────
    // Solo se ejecuta cuando articulo cambia (NO cuando onClose cambia, para
    // evitar pushState múltiple si el padre re-renderiza).
    const onCloseRef = useRef(onClose);
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        if (!articulo) return;

        window.history.pushState({ modalArticulo: articulo.id }, '');
        const onPop = () => { onCloseRef.current(); };
        window.addEventListener('popstate', onPop);

        return () => {
            window.removeEventListener('popstate', onPop);
            // Si al desmontar el state aún tiene el modal pusheado (cierre
            // vía X), pop manual para que un back posterior no re-abra.
            if (window.history.state?.modalArticulo) {
                window.history.back();
            }
        };
    }, [articulo?.id]);

    // Escape cierra
    useEffect(() => {
        if (!articulo) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCloseRef.current();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [articulo?.id]);

    // Lock del scroll del body
    useEffect(() => {
        if (!articulo) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [articulo?.id]);

    const handleCerrar = useCallback(() => {
        onClose();
    }, [onClose]);

    if (!articulo) return null;

    return createPortal(
        <>
            {/* Backdrop + scroll wrapper. Click en overlay cierra. El modal
                vive directamente sobre el backdrop, sin wrapper de card —
                solo el CardArticuloFeed se renderiza con su rounded propio. */}
            <div
                className="fixed inset-0 z-[10000] flex items-start justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={handleCerrar}
                role="dialog"
                aria-modal="true"
            >
                {/* X flotante sobre el overlay (esquina superior derecha) */}
                <button
                    type="button"
                    onClick={handleCerrar}
                    aria-label="Cerrar"
                    data-testid="modal-articulo-cerrar"
                    className="fixed top-3 right-3 z-[10002] flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg lg:cursor-pointer lg:hover:bg-white lg:top-4 lg:right-4"
                >
                    <X className="h-5 w-5" strokeWidth={2.5} />
                </button>

                {/* Card centrada — altura fija para que el scroll viva solo
                    dentro de la zona de mensajes (modoModal). */}
                <div
                    className="mx-auto my-4 flex flex-col h-[calc(100vh-2rem)] w-full max-w-[620px] px-3 lg:my-6 lg:h-[calc(100vh-3rem)] lg:max-h-[900px] lg:px-0 animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <CardArticuloFeed articulo={articulo} modoModal />
                </div>
            </div>
        </>,
        document.body
    );
}

export default ModalArticuloDetalle;
