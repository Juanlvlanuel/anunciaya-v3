/**
 * ListaComentariosMarketplace.tsx
 * ==================================
 * Solo la LISTA de comentarios de un artículo de MarketPlace (sin input) —
 * separada de `InputComentarioMarketplace.tsx` para poder colocarlos en
 * lugares distintos del layout (ej. lista dentro de un scroll combinado con
 * el resto del cuerpo, input fijo al fondo del modal).
 *
 * `SeccionComentariosMarketplace.tsx` sigue siendo el punto de entrada
 * normal (lista + input juntos, con su propio scroll interno) — úsalo salvo
 * que necesites separar el layout como hace
 * `ModalComentariosMarketplace.tsx` en escritorio.
 *
 * Deep-link desde notificación (`comentarioDestacadoId`): hace polling por
 * `document.getElementById('comentario-<id>')` (el comentario puede tardar
 * en llegar — carga async, o estar detrás de "Ver N respuestas" que
 * `ComentarioItem` fuerza a abrir), hace scroll y prende un anillo
 * transitorio (~3s) — mismo patrón que `ModalResenas.tsx` con `resenaId`.
 *
 * Ubicación: apps/web/src/components/marketplace/ListaComentariosMarketplace.tsx
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { ComentarioItem } from './ComentarioItem';
import { useSeccionComentariosMarketplace } from './useSeccionComentariosMarketplace';

interface ListaComentariosMarketplaceProps {
    articuloId: string;
    vendedorId: string;
    className?: string;
    comentarioDestacadoId?: string | null;
}

export function ListaComentariosMarketplace({
    articuloId,
    vendedorId,
    className = '',
    comentarioDestacadoId = null,
}: ListaComentariosMarketplaceProps) {
    const {
        comentarios,
        isLoading,
        usuarioActual,
        puedeComentar,
        crearComentario,
        handleEditar,
        handleEliminar,
        handleResponder,
    } = useSeccionComentariosMarketplace({ articuloId, vendedorId });

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
        <div className={`space-y-4 ${className}`} data-testid="lista-comentarios-marketplace">
            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
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
                    vendedorId={vendedorId}
                    usuarioActual={usuarioActual}
                    puedeComentar={puedeComentar}
                    enviandoRespuesta={crearComentario.isPending}
                    onEditar={handleEditar}
                    onEliminar={handleEliminar}
                    onResponder={handleResponder}
                    colorTema="teal"
                    estiloFacebook
                    comentarioDestacadoId={comentarioDestacadoId}
                    comentarioResaltadoId={comentarioResaltado}
                />
            ))}
        </div>
    );
}

export default ListaComentariosMarketplace;
