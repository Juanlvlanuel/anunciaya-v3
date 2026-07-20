/**
 * ModalComentariosPublicacionNegocio.tsx
 * =========================================
 * Modal con TODOS los comentarios de una publicación de negocio — estilo
 * Facebook. Se abre desde el ícono de comentarios del feed
 * (`CardPublicacionNegocioFeed.tsx`), reemplazando la vista previa inline
 * que tenía antes la card (2 comentarios + input siempre visibles).
 *
 * Pide el detalle de la publicación (`usePublicacionNegocio`) en AMBOS
 * dispositivos — en móvil solo se usa para registrar la vista (el cuerpo no
 * se muestra ahí, ya se ve detrás en el feed), pero abrir el modal SÍ debe
 * contar como vista igual que en escritorio.
 *
 * `ModalAdaptativo` decide el chrome: en móvil es un `ModalBottom` casi de
 * pantalla completa (`alturaMaxima="xl"` = 93vh), solo comentarios (la
 * publicación ya se ve detrás, en el feed). En escritorio, un `Modal`
 * centrado y más ancho con 3 zonas fijas verticalmente:
 *   1. Header FIJO — datos del negocio (`HeaderPublicacionNegocio`) + X.
 *   2. Zona con scroll ÚNICO — cuerpo de la publicación
 *      (`CuerpoPublicacionNegocio`: texto/precio/galería/vistas) + lista de
 *      comentarios (`ListaComentariosPublicacionNegocio`), todo scrollea
 *      junto.
 *   3. Input de comentario FIJO al fondo (`InputComentarioPublicacionNegocio`).
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/ModalComentariosPublicacionNegocio.tsx
 */

import { X, Loader2 } from 'lucide-react';
import { ModalAdaptativo } from '../../ui/ModalAdaptativo';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useGpsStore } from '../../../stores/useGpsStore';
import { usePublicacionNegocio, useRegistrarVistaPublicacionNegocio } from '../../../hooks/queries/useNegocioPublicaciones';
import { HeaderPublicacionNegocio } from './HeaderPublicacionNegocio';
import { CuerpoPublicacionNegocio } from './CuerpoPublicacionNegocio';
import { ListaComentariosPublicacionNegocio } from './ListaComentariosPublicacionNegocio';
import { InputComentarioPublicacionNegocio } from './InputComentarioPublicacionNegocio';
import { SeccionComentariosPublicacionNegocio } from './SeccionComentariosPublicacionNegocio';

interface ModalComentariosPublicacionNegocioProps {
    abierto: boolean;
    onCerrar: () => void;
    publicacionId: string;
    /** Deep-link desde notificación: comentario a resaltar + hacer scroll. */
    comentarioDestacadoId?: string | null;
}

export function ModalComentariosPublicacionNegocio({
    abierto,
    onCerrar,
    publicacionId,
    comentarioDestacadoId,
}: ModalComentariosPublicacionNegocioProps) {
    const { esMobile } = useBreakpoint();
    const { latitud, longitud } = useGpsStore();
    const { data: publicacion } = usePublicacionNegocio(publicacionId, { latitud, longitud });
    useRegistrarVistaPublicacionNegocio(publicacion);

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
                        <SeccionComentariosPublicacionNegocio
                            publicacionId={publicacionId}
                            comentarioDestacadoId={comentarioDestacadoId}
                        />
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
                {/* 1. Header fijo — datos del negocio + X, misma línea. */}
                <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 p-4">
                    <div className="min-w-0 flex-1">
                        {publicacion && <HeaderPublicacionNegocio publicacion={publicacion} />}
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
                        <CuerpoPublicacionNegocio publicacion={publicacion} />
                    ) : (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                        </div>
                    )}
                    <div className="border-t-[1.5px] border-slate-200 pt-4">
                        <ListaComentariosPublicacionNegocio
                            publicacionId={publicacionId}
                            negocioId={publicacion?.negocioId}
                            autorUsuarioId={publicacion?.autorUsuarioId}
                            comentarioDestacadoId={comentarioDestacadoId}
                        />
                    </div>
                </div>

                {/* 3. Input fijo al fondo. */}
                <div className="shrink-0 border-t border-slate-200 p-4">
                    <InputComentarioPublicacionNegocio publicacionId={publicacionId} />
                </div>
            </div>
        </ModalAdaptativo>
    );
}

export default ModalComentariosPublicacionNegocio;
