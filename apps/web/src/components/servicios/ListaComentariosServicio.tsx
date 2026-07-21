/**
 * ListaComentariosServicio.tsx
 * ==============================
 * Solo la LISTA de comentarios de una publicación de Servicios (sin
 * input) — separada de `InputComentarioServicio.tsx` para poder colocarlos
 * en lugares distintos del layout (lista dentro de un scroll combinado con
 * el resto del cuerpo, input fijo al fondo del modal). Mismo patrón que
 * `ListaComentariosMarketplace.tsx`.
 *
 * `SeccionComentariosServicio.tsx` sigue siendo el punto de entrada normal
 * (lista + input juntos) — úsalo salvo que necesites separar el layout
 * como hace `ModalComentariosServicio.tsx` en escritorio.
 *
 * Ubicación: apps/web/src/components/servicios/ListaComentariosServicio.tsx
 */

import { Loader2 } from 'lucide-react';
import { ComentarioItem } from '../marketplace/ComentarioItem';
import { useSeccionComentariosServicio } from './useSeccionComentariosServicio';

interface ListaComentariosServicioProps {
    publicacionId: string;
    duenoId: string;
    className?: string;
}

export function ListaComentariosServicio({
    publicacionId,
    duenoId,
    className = '',
}: ListaComentariosServicioProps) {
    const {
        comentarios,
        isLoading,
        usuarioActual,
        puedeComentar,
        crearComentario,
        handleEditar,
        handleEliminar,
        handleResponder,
    } = useSeccionComentariosServicio({ publicacionId, duenoId });

    return (
        <div className={`space-y-4 ${className}`} data-testid="lista-comentarios-servicio">
            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
                </div>
            )}
            {!isLoading && comentarios.length === 0 && (
                <p className="text-sm text-slate-600 text-center py-6">
                    Sé el primero en comentar.
                </p>
            )}
            {comentarios.map((comentario) => (
                <ComentarioItem
                    key={comentario.id}
                    comentario={comentario}
                    vendedorId={duenoId}
                    etiquetaAutor="Autor"
                    usuarioActual={usuarioActual}
                    puedeComentar={puedeComentar}
                    enviandoRespuesta={crearComentario.isPending}
                    onEditar={handleEditar}
                    onEliminar={handleEliminar}
                    onResponder={handleResponder}
                    colorTema="sky"
                    estiloFacebook
                />
            ))}
        </div>
    );
}

export default ListaComentariosServicio;
