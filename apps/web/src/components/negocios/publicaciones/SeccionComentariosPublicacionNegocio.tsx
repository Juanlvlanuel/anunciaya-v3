/**
 * SeccionComentariosPublicacionNegocio.tsx
 * ============================================
 * Sección de comentarios estilo Facebook para una publicación de negocio:
 * lista plana (sin card contenedor por hilo, respuestas colapsadas detrás de
 * "Ver N respuestas") + input inferior sin avatar ("Comentar como {nombre}").
 * Acento azul (`colorTema="blue"`) — tema de Negocios.
 *
 * Compartida entre:
 *  - `ModalComentariosPublicacionNegocio.tsx` (modal full-screen abierto
 *    desde el ícono de comentarios del feed).
 *  - `DetallePublicacionNegocioContenido.tsx` (página de detalle).
 *
 * Encapsula TODO el data-fetching de comentarios a partir de un
 * `publicacionId` — el caller solo decide dónde se monta.
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/SeccionComentariosPublicacionNegocio.tsx
 */

import { useCallback, useState } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { ComentarioItem, type UsuarioComentario } from '../../marketplace/ComentarioItem';
import { useAuthStore } from '../../../stores/useAuthStore';
import { notificar } from '../../../utils/notificaciones';
import {
    useComentariosPublicacionNegocio,
    useCrearComentarioNegocio,
    useEditarComentarioNegocio,
    useEliminarComentarioNegocio,
} from '../../../hooks/queries/useNegocioPublicaciones';

const TEXTO_MIN = 2;
const TEXTO_MAX = 500;

interface SeccionComentariosPublicacionNegocioProps {
    publicacionId: string;
    /** negocioId de la publicación — habilita moderación si el usuario es dueño/gerente. */
    negocioId?: string;
    /** Fallback de moderación cuando el usuario no es dueño del negocio (ver detalle). */
    autorUsuarioId?: string;
}

export function SeccionComentariosPublicacionNegocio({
    publicacionId,
    negocioId,
    autorUsuarioId,
}: SeccionComentariosPublicacionNegocioProps) {
    const usuario = useAuthStore((s) => s.usuario);
    const { data: comentarios = [], isLoading } = useComentariosPublicacionNegocio(publicacionId);
    const crearComentario = useCrearComentarioNegocio();
    const editarComentario = useEditarComentarioNegocio();
    const eliminarComentario = useEliminarComentarioNegocio();

    const [textoComentario, setTextoComentario] = useState('');
    const [errorComentario, setErrorComentario] = useState<string | null>(null);

    const usuarioActual: UsuarioComentario | null = usuario
        ? {
              id: usuario.id,
              nombre: usuario.nombre ?? '',
              apellidos: usuario.apellidos ?? '',
              avatarUrl: usuario.avatarUrl ?? null,
          }
        : null;

    // Cualquier usuario logueado puede comentar/moderar (sin restricción de
    // modo, a diferencia de MarketPlace). Si es dueño/gerente del negocio de
    // esta publicación, "se hace pasar" por el vendedor para que el botón
    // eliminar aparezca también sobre comentarios ajenos (ComentarioItem solo
    // compara un único id — el backend igual valida pertenencia al negocio).
    const esPropioNegocio = !!usuario?.negocioId && usuario.negocioId === negocioId;
    const vendedorIdParaUI = esPropioNegocio ? (usuario?.id ?? '') : (autorUsuarioId ?? '');

    const leerError = (e: unknown) => {
        const err = e as { response?: { status?: number; data?: { message?: string } } };
        return { status: err?.response?.status, mensaje: err?.response?.data?.message };
    };

    const handleEnviarComentario = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const limpio = textoComentario.trim();
            if (!usuario) {
                notificar.info('Inicia sesión para comentar');
                return;
            }
            if (limpio.length < TEXTO_MIN) {
                setErrorComentario(`Escribe al menos ${TEXTO_MIN} caracteres`);
                return;
            }
            setErrorComentario(null);
            try {
                await crearComentario.mutateAsync({ publicacionId, texto: limpio });
                setTextoComentario('');
            } catch (err) {
                const { status, mensaje } = leerError(err);
                if (status === 422) setErrorComentario(mensaje ?? 'Contenido no permitido');
                else setErrorComentario(mensaje ?? 'No se pudo publicar el comentario');
            }
        },
        [textoComentario, usuario, crearComentario, publicacionId]
    );

    const handleResponder = useCallback(
        async (parentId: string, texto: string): Promise<boolean> => {
            try {
                await crearComentario.mutateAsync({ publicacionId, texto, parentId });
                return true;
            } catch (err) {
                notificar.error(leerError(err).mensaje ?? 'No se pudo publicar la respuesta');
                return false;
            }
        },
        [crearComentario, publicacionId]
    );

    const handleEditar = useCallback(
        async (id: string, texto: string): Promise<boolean> => {
            try {
                await editarComentario.mutateAsync({ comentarioId: id, publicacionId, texto });
                notificar.exito('Comentario actualizado');
                return true;
            } catch (err) {
                notificar.error(leerError(err).mensaje ?? 'No se pudo guardar');
                return false;
            }
        },
        [editarComentario, publicacionId]
    );

    const handleEliminar = useCallback(
        (id: string) => {
            if (!confirm('¿Eliminar este comentario?')) return;
            eliminarComentario.mutate(
                { comentarioId: id, publicacionId },
                {
                    onSuccess: () => notificar.exito('Comentario eliminado'),
                    onError: () => notificar.error('No se pudo eliminar el comentario'),
                }
            );
        },
        [eliminarComentario, publicacionId]
    );

    return (
        <div className="flex h-full min-h-0 flex-col" data-testid="seccion-comentarios-publicacion-negocio">
            {/* Lista — sin card por hilo, respuestas colapsadas (estiloFacebook). */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
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
                    />
                ))}
            </div>

            {/* Input estilo Facebook — sin avatar, "Comentar como {nombre}". */}
            {usuario ? (
                <div className="shrink-0 pt-3">
                    <form onSubmit={handleEnviarComentario}>
                        <div className="flex items-center gap-2 rounded-full border-2 border-slate-300 bg-slate-100 py-1 pl-4 pr-1.5 transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20">
                            <input
                                type="text"
                                data-testid="input-comentario-negocio-facebook"
                                value={textoComentario}
                                onChange={(e) => {
                                    setTextoComentario(e.target.value);
                                    if (errorComentario) setErrorComentario(null);
                                }}
                                placeholder={`Comentar como ${usuario.nombre ?? 'tú'}…`}
                                maxLength={TEXTO_MAX}
                                disabled={crearComentario.isPending}
                                className="flex-1 bg-transparent py-1.5 text-base font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                data-testid="enviar-comentario-negocio-facebook"
                                disabled={crearComentario.isPending || textoComentario.trim().length < TEXTO_MIN}
                                aria-label="Publicar comentario"
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed lg:cursor-pointer ${
                                    textoComentario.trim().length >= TEXTO_MIN && !crearComentario.isPending
                                        ? 'bg-blue-600 text-white shadow-sm lg:hover:bg-blue-700'
                                        : 'bg-transparent text-slate-400'
                                }`}
                            >
                                {crearComentario.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                                ) : (
                                    <Send className="h-4 w-4" strokeWidth={2.5} />
                                )}
                            </button>
                        </div>
                        {errorComentario && (
                            <div className="mt-1 flex items-center gap-1 px-3 text-sm text-rose-600">
                                <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                                {errorComentario}
                            </div>
                        )}
                    </form>
                </div>
            ) : (
                <p className="shrink-0 pt-3 text-sm text-slate-600 text-center">
                    Inicia sesión para comentar.
                </p>
            )}
        </div>
    );
}

export default SeccionComentariosPublicacionNegocio;
