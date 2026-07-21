/**
 * ModalComentariosServicio.tsx
 * ==============================
 * Modal con TODOS los comentarios de una publicación de Servicios — estilo
 * Facebook. Se abre desde el ícono de comentarios del feed
 * (`CardServicioFeed.tsx`). Mismo patrón exacto que
 * `ModalComentariosMarketplace.tsx`/`ModalComentariosPublicacionNegocio.tsx`:
 *   1. Header FIJO — datos del oferente (`HeaderPublicacionServicio`) + X.
 *   2. Zona con scroll ÚNICO — cuerpo de la publicación
 *      (`CuerpoPublicacionServicio`: título/precio/chips/descripción/
 *      galería/vistas) + lista de comentarios (`ListaComentariosServicio`),
 *      todo scrollea junto.
 *   3. Input de comentario FIJO al fondo (`InputComentarioServicio`).
 *
 * `ModalAdaptativo` decide el chrome: en móvil es un `ModalBottom` casi de
 * pantalla completa (`alturaMaxima="xl"` = 93vh), solo comentarios (la
 * publicación ya se ve detrás, en el feed) — la lista scrollea y el input
 * queda fijo al fondo dentro del mismo flujo. En escritorio, un `Modal`
 * centrado con las 3 zonas fijas descritas arriba.
 *
 * Ubicación: apps/web/src/components/servicios/ModalComentariosServicio.tsx
 */

import { useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useAuthStore } from '../../stores/useAuthStore';
import {
    usePublicacionServicio,
    useRegistrarVistaServicio,
} from '../../hooks/queries/useServicios';
import { HeaderPublicacionServicio } from './HeaderPublicacionServicio';
import { CuerpoPublicacionServicio } from './CuerpoPublicacionServicio';
import { ListaComentariosServicio } from './ListaComentariosServicio';
import { InputComentarioServicio } from './InputComentarioServicio';

const VISTA_REGISTRADA_STORAGE_PREFIX = 'aya:servicios:vista:';

interface ModalComentariosServicioProps {
    abierto: boolean;
    onCerrar: () => void;
    publicacionId: string;
}

export function ModalComentariosServicio({
    abierto,
    onCerrar,
    publicacionId,
}: ModalComentariosServicioProps) {
    const { esMobile } = useBreakpoint();
    const { data: publicacion } = usePublicacionServicio(publicacionId);

    // Registrar vista una vez por sesión — mismo dedupe en sessionStorage
    // que usa `PaginaServicio.tsx` (el detalle), así abrir el modal desde
    // el feed también cuenta como vista sin inflar el contador en reloads.
    const usuarioActual = useAuthStore((s) => s.usuario);
    const registrarVista = useRegistrarVistaServicio();
    const vistaYaRegistrada = useRef(false);
    useEffect(() => {
        if (!publicacion || vistaYaRegistrada.current) return;
        if (usuarioActual?.id === publicacion.usuarioId) return;
        const key = `${VISTA_REGISTRADA_STORAGE_PREFIX}${publicacion.id}`;
        if (typeof window !== 'undefined' && sessionStorage.getItem(key)) {
            vistaYaRegistrada.current = true;
            return;
        }
        registrarVista.mutate(publicacion.id);
        vistaYaRegistrada.current = true;
        try {
            sessionStorage.setItem(key, '1');
        } catch {
            /* noop */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicacion]);

    if (esMobile) {
        return (
            <ModalAdaptativo
                abierto={abierto}
                onCerrar={onCerrar}
                mostrarHeader={false}
                ancho="md"
                alturaMaxima="xl"
                sinScrollInterno
                paddingContenido="none"
            >
                <div className="relative flex h-full min-h-0 flex-col">
                    {/* Sin título "Comentarios" — solo una X discreta arriba
                        a la derecha (sin fondo ni círculo, mismo criterio
                        que un ícono utilitario neutro). */}
                    <button
                        type="button"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="absolute right-2 top-1 z-10 rounded-full p-1.5 text-slate-400"
                    >
                        <X className="h-5 w-5" strokeWidth={2} />
                    </button>
                    <div className="flex h-full min-h-0 flex-col px-4 pb-4 pt-10">
                        {publicacion ? (
                            <>
                                <div className="min-h-0 flex-1 overflow-y-auto">
                                    <ListaComentariosServicio
                                        publicacionId={publicacionId}
                                        duenoId={publicacion.oferente.id}
                                    />
                                </div>
                                <InputComentarioServicio
                                    publicacionId={publicacionId}
                                    className="shrink-0 pt-3"
                                />
                            </>
                        ) : (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            </ModalAdaptativo>
        );
    }

    return (
        <ModalAdaptativo
            abierto={abierto}
            onCerrar={onCerrar}
            mostrarHeader={false}
            ancho="lg"
            paddingContenido="none"
        >
            <div className="relative flex h-full min-h-0 flex-col">
                {/* 1. Header fijo — datos del oferente + X, misma línea. */}
                <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-4">
                    <div className="min-w-0 flex-1">
                        {publicacion && <HeaderPublicacionServicio publicacion={publicacion} />}
                    </div>
                    <button
                        type="button"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="shrink-0 rounded-full p-1.5 text-slate-400 lg:cursor-pointer lg:hover:bg-slate-100 lg:hover:text-slate-600"
                    >
                        <X className="h-5 w-5" strokeWidth={2} />
                    </button>
                </div>

                {/* 2. Scroll único — cuerpo de la publicación + comentarios. */}
                <div className="scroll-discreto min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
                    {publicacion ? (
                        <>
                            <CuerpoPublicacionServicio publicacion={publicacion} />
                            <div className="border-t-[1.5px] border-slate-200 pt-4">
                                <ListaComentariosServicio
                                    publicacionId={publicacionId}
                                    duenoId={publicacion.oferente.id}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
                        </div>
                    )}
                </div>

                {/* 3. Input fijo al fondo. */}
                <div className="shrink-0 border-t border-slate-200 p-4">
                    <InputComentarioServicio publicacionId={publicacionId} />
                </div>
            </div>
        </ModalAdaptativo>
    );
}

export default ModalComentariosServicio;
