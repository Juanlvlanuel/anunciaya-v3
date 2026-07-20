/**
 * ListaComentariosPublicacionNegocio.tsx
 * ==========================================
 * Solo la LISTA de comentarios de una publicación de negocio (sin input) —
 * separada de `InputComentarioPublicacionNegocio.tsx` para poder colocarlos
 * en lugares distintos del layout (ej. lista dentro de un scroll combinado
 * con el resto del cuerpo, input fijo al fondo del modal).
 *
 * `SeccionComentariosPublicacionNegocio.tsx` sigue siendo el punto de
 * entrada normal (lista + input juntos, con su propio scroll interno) —
 * úsalo salvo que necesites separar el layout como hace
 * `ModalComentariosPublicacionNegocio.tsx` en escritorio.
 *
 * Deep-link desde notificación (`comentarioDestacadoId`): hace polling por
 * `document.getElementById('comentario-<id>')` (el comentario puede tardar
 * en llegar — carga async, o estar detrás de "Ver N respuestas" que
 * `ComentarioItem` fuerza a abrir), hace scroll y prende un anillo
 * transitorio (~3s) — mismo patrón que `ModalResenas.tsx` con `resenaId`.
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/ListaComentariosPublicacionNegocio.tsx
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ComentarioItem } from '../../marketplace/ComentarioItem';
import { useSeccionComentariosPublicacionNegocio } from './useSeccionComentariosPublicacionNegocio';

interface ListaComentariosPublicacionNegocioProps {
    publicacionId: string;
    negocioId?: string;
    autorUsuarioId?: string;
    className?: string;
    comentarioDestacadoId?: string | null;
}

export function ListaComentariosPublicacionNegocio({
    publicacionId,
    negocioId,
    autorUsuarioId,
    className = '',
    comentarioDestacadoId = null,
}: ListaComentariosPublicacionNegocioProps) {
    const {
        comentarios,
        isLoading,
        usuarioActual,
        vendedorIdParaUI,
        usuario,
        crearComentario,
        handleEditar,
        handleEliminar,
        handleResponder,
    } = useSeccionComentariosPublicacionNegocio({ publicacionId, negocioId, autorUsuarioId });

    const [comentarioResaltado, setComentarioResaltado] = useState<string | null>(null);

    useEffect(() => {
        if (!comentarioDestacadoId) return;
        const buscandoId = `comentario-${comentarioDestacadoId}`;
        let intentos = 0;
        const maxIntentos = 20;
        const intervalo = setInterval(() => {
            intentos++;
            const el = document.getElementById(buscandoId);
            if (el) {
                clearInterval(intervalo);
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setComentarioResaltado(comentarioDestacadoId);
                setTimeout(() => setComentarioResaltado(null), 3000);
            } else if (intentos >= maxIntentos) {
                clearInterval(intervalo);
            }
        }, 100);
        return () => clearInterval(intervalo);
    }, [comentarioDestacadoId]);

    return (
        <div className={`space-y-4 ${className}`} data-testid="lista-comentarios-publicacion-negocio">
            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
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
                    vendedorId={vendedorIdParaUI}
                    usuarioActual={usuarioActual}
                    etiquetaAutor="Negocio"
                    puedeComentar={!!usuario}
                    enviandoRespuesta={crearComentario.isPending}
                    onEditar={handleEditar}
                    onEliminar={handleEliminar}
                    onResponder={handleResponder}
                    colorTema="blue"
                    estiloFacebook
                    comentarioDestacadoId={comentarioDestacadoId}
                    comentarioResaltadoId={comentarioResaltado}
                />
            ))}
        </div>
    );
}

export default ListaComentariosPublicacionNegocio;
