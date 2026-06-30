/**
 * SeccionComentariosServicio.tsx
 * ==============================
 * Comentarios públicos (hilos de 1 nivel) en el detalle de una publicación de
 * Servicios. Reemplaza el Q&A `SeccionPreguntasServicio`.
 *
 * Reusa el componente genérico `ComentarioItem` (mismo que MarketPlace), con la
 * etiqueta de autor "Autor" (en MP es "Vendedor"). Aquí viven las mutaciones
 * (React Query) y el input raíz.
 *
 * Ubicación: apps/web/src/components/servicios/SeccionComentariosServicio.tsx
 */

import { useMemo, useState } from 'react';
import { AlertCircle, Send, Loader2 } from 'lucide-react';
import {
    useComentariosServicio,
    useCrearComentarioServicio,
    useEditarComentarioServicio,
    useEliminarComentarioServicio,
} from '../../hooks/queries/useServicios';
import { useAuthStore } from '../../stores/useAuthStore';
import { ComentarioItem, type UsuarioComentario } from '../marketplace/ComentarioItem';
import { notificar } from '../../utils/notificaciones';
import type { PublicacionDetalle } from '../../types/servicios';

const TEXTO_MIN = 2;
const TEXTO_MAX = 500;

interface SeccionComentariosServicioProps {
    publicacion: PublicacionDetalle;
}

/** Extrae el mensaje del backend de un error de Axios. */
function mensajeError(e: unknown): { status?: number; mensaje?: string } {
    const err = e as { response?: { status?: number; data?: { message?: string } } };
    return { status: err?.response?.status, mensaje: err?.response?.data?.message };
}

export function SeccionComentariosServicio({ publicacion }: SeccionComentariosServicioProps) {
    const usuario = useAuthStore((s) => s.usuario);
    const modoActivo = usuario?.modoActivo ?? 'personal';

    const publicacionId = publicacion.id;
    const duenoId = publicacion.oferente.id;

    const { data: comentarios = [], isLoading } = useComentariosServicio(publicacionId);
    const crearMutation = useCrearComentarioServicio();
    const editarMutation = useEditarComentarioServicio();
    const eliminarMutation = useEliminarComentarioServicio();

    const [texto, setTexto] = useState('');
    const [error, setError] = useState<string | null>(null);

    const enModoComercial = modoActivo === 'comercial';
    const puedeComentar = !!usuario && !enModoComercial;

    const usuarioActual: UsuarioComentario | null = usuario
        ? {
              id: usuario.id,
              nombre: usuario.nombre ?? '',
              apellidos: usuario.apellidos ?? '',
              avatarUrl: usuario.avatarUrl ?? null,
          }
        : null;

    const total = useMemo(
        () => comentarios.reduce((acc, c) => acc + 1 + c.respuestas.length, 0),
        [comentarios]
    );

    // ─── Mutaciones (callbacks para ComentarioItem) ──────────────────────────
    const handleCrearRaiz = async (e: React.FormEvent) => {
        e.preventDefault();
        const limpio = texto.trim();
        if (limpio.length < TEXTO_MIN) {
            setError(`Escribe al menos ${TEXTO_MIN} caracteres`);
            return;
        }
        setError(null);
        try {
            await crearMutation.mutateAsync({ publicacionId, texto: limpio });
            setTexto('');
        } catch (e) {
            const { mensaje } = mensajeError(e);
            setError(mensaje ?? 'No se pudo publicar el comentario');
        }
    };

    const handleResponder = async (parentId: string, txt: string): Promise<boolean> => {
        try {
            await crearMutation.mutateAsync({ publicacionId, texto: txt, parentId });
            return true;
        } catch (e) {
            notificar.error(mensajeError(e).mensaje ?? 'No se pudo publicar la respuesta');
            return false;
        }
    };

    const handleEditar = async (id: string, txt: string): Promise<boolean> => {
        try {
            await editarMutation.mutateAsync({ comentarioId: id, publicacionId, texto: txt });
            notificar.exito('Comentario actualizado');
            return true;
        } catch (e) {
            notificar.error(mensajeError(e).mensaje ?? 'No se pudo guardar');
            return false;
        }
    };

    const handleEliminar = (id: string) => {
        if (!confirm('¿Eliminar este comentario?')) return;
        eliminarMutation.mutate(
            { comentarioId: id, publicacionId },
            {
                onSuccess: () => notificar.exito('Comentario eliminado'),
                onError: () => notificar.error('No se pudo eliminar el comentario'),
            }
        );
    };

    if (isLoading) return null;

    return (
        <div data-testid="seccion-comentarios-servicio" className="space-y-4">
            <h2 className="text-base font-bold text-slate-900">
                Comentarios
                {total > 0 && (
                    <span className="ml-1.5 text-xs font-medium text-slate-500">({total})</span>
                )}
            </h2>

            {comentarios.length === 0 ? (
                <p className="text-sm font-medium text-slate-600">
                    {puedeComentar
                        ? 'Sé el primero en comentar esta publicación.'
                        : 'Aún no hay comentarios sobre esta publicación.'}
                </p>
            ) : (
                <div className="max-h-[500px] space-y-4 overflow-y-auto pr-1">
                    {comentarios.map((c) => (
                        <ComentarioItem
                            key={c.id}
                            comentario={c}
                            vendedorId={duenoId}
                            etiquetaAutor="Autor"
                            usuarioActual={usuarioActual}
                            puedeComentar={puedeComentar}
                            enviandoRespuesta={crearMutation.isPending}
                            onEditar={handleEditar}
                            onEliminar={handleEliminar}
                            onResponder={handleResponder}
                        />
                    ))}
                </div>
            )}

            {/* Input raíz — solo usuarios autenticados en modo personal. */}
            {puedeComentar && (
                <form onSubmit={handleCrearRaiz} className="pt-1">
                    <div className="flex items-center gap-2.5">
                        {usuario?.avatarUrl ? (
                            <img
                                src={usuario.avatarUrl}
                                alt=""
                                aria-hidden="true"
                                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-slate-200"
                            />
                        ) : (
                            <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-md ring-2 ring-slate-200"
                                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
                                aria-hidden="true"
                            >
                                {((usuario?.nombre ?? '?').charAt(0) +
                                    (usuario?.apellidos ?? '').charAt(0)).toUpperCase()}
                            </div>
                        )}

                        <div className="flex flex-1 items-center gap-2 rounded-full border-2 border-slate-300 bg-slate-100 py-1 pl-4 pr-1.5 transition-all focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20">
                            <input
                                type="text"
                                data-testid="input-comentario-servicio"
                                value={texto}
                                onChange={(e) => {
                                    setTexto(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder="Escribe un comentario…"
                                maxLength={TEXTO_MAX}
                                disabled={crearMutation.isPending}
                                className="flex-1 bg-transparent py-1.5 text-base font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                data-testid="btn-comentar-servicio"
                                disabled={crearMutation.isPending || texto.trim().length < TEXTO_MIN}
                                aria-label="Publicar comentario"
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed lg:cursor-pointer ${
                                    texto.trim().length >= TEXTO_MIN && !crearMutation.isPending
                                        ? 'bg-teal-600 text-white shadow-sm lg:hover:bg-teal-700'
                                        : 'bg-transparent text-slate-400'
                                }`}
                            >
                                {crearMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                                ) : (
                                    <Send className="h-4 w-4" strokeWidth={2.5} />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="mt-1 flex items-center justify-between px-3 text-sm">
                        {error ? (
                            <span className="flex items-center gap-1 text-rose-600">
                                <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                                {error}
                            </span>
                        ) : (
                            <span className="text-slate-600">
                                {texto.length > 0 ? `${texto.length}/${TEXTO_MAX}` : ''}
                            </span>
                        )}
                    </div>
                </form>
            )}

            {/* Modo Comercial — bloqueado para comentar. */}
            {!!usuario && enModoComercial && (
                <div className="rounded-xl border-2 border-amber-300 bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800">
                    Cambia a modo Personal para comentar en Servicios.
                </div>
            )}
        </div>
    );
}

export default SeccionComentariosServicio;
