/**
 * SeccionComentariosPublicacionNegocio.tsx
 * ============================================
 * Sección de comentarios estilo Facebook para una publicación de negocio:
 * lista con scroll propio + input inferior fijo. Compone
 * `ListaComentariosPublicacionNegocio` + `InputComentarioPublicacionNegocio`
 * (separados para poder colocarlos aparte en otros layouts — ver
 * `ModalComentariosPublicacionNegocio.tsx` en escritorio).
 *
 * Usada por:
 *  - `DetallePublicacionNegocioContenido.tsx` (página de detalle).
 *  - `ModalComentariosPublicacionNegocio.tsx` (variante móvil).
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/SeccionComentariosPublicacionNegocio.tsx
 */

import { ListaComentariosPublicacionNegocio } from './ListaComentariosPublicacionNegocio';
import { InputComentarioPublicacionNegocio } from './InputComentarioPublicacionNegocio';

interface SeccionComentariosPublicacionNegocioProps {
    publicacionId: string;
    /** negocioId de la publicación — habilita moderación si el usuario es dueño/gerente. */
    negocioId?: string;
    /** Fallback de moderación cuando el usuario no es dueño del negocio. */
    autorUsuarioId?: string;
    comentarioDestacadoId?: string | null;
}

export function SeccionComentariosPublicacionNegocio({
    publicacionId,
    negocioId,
    autorUsuarioId,
    comentarioDestacadoId,
}: SeccionComentariosPublicacionNegocioProps) {
    return (
        <div className="flex h-full min-h-0 flex-col" data-testid="seccion-comentarios-publicacion-negocio">
            <div className="scroll-discreto flex-1 min-h-0 overflow-y-auto pr-1">
                <ListaComentariosPublicacionNegocio
                    publicacionId={publicacionId}
                    negocioId={negocioId}
                    autorUsuarioId={autorUsuarioId}
                    comentarioDestacadoId={comentarioDestacadoId}
                />
            </div>
            <InputComentarioPublicacionNegocio publicacionId={publicacionId} className="shrink-0 pt-3" />
        </div>
    );
}

export default SeccionComentariosPublicacionNegocio;
