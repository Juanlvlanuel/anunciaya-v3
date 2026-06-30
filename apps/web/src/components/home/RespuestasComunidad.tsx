/**
 * RespuestasComunidad.tsx
 * =========================
 * Bloque colapsable de COMENTARIOS debajo de una pregunta del Home.
 * Reescrito sobre el componente genérico `ComentarioItem` (hilos de 1 nivel),
 * el mismo de MarketPlace y Servicios.
 *
 * Reglas propias de Coyo (preservadas):
 *   - El AUTOR de la pregunta NO comenta en su hilo (no se le muestra input;
 *     el backend además devuelve 403).
 *   - Solo el AUTOR de un comentario puede borrarlo → `ComentarioItem` recibe
 *     `permiteEliminarDueno={false}` (el autor de la pregunta no modera).
 *   - Etiqueta de autor: "Autor".
 *
 * Ubicación: apps/web/src/components/home/RespuestasComunidad.tsx
 */

import { useState } from 'react';
import { MessageSquare, Pointer, X, Send, Loader2, AlertCircle } from 'lucide-react';
import {
    useComentariosComunidad,
    useCrearComentarioComunidad,
    useEditarComentarioComunidad,
    useEliminarComentarioComunidad,
} from '../../hooks/queries/usePreguntasComunidad';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import { ComentarioItem, type UsuarioComentario } from '../marketplace/ComentarioItem';

const TEXTO_MIN = 2;
const TEXTO_MAX = 500;

interface RespuestasComunidadProps {
    preguntaId: string;
    /** Autor (dueño) de la pregunta — `vendedorId` para `ComentarioItem`. */
    autorPreguntaId: string;
    /** Conteo del feed para el botón "Ver N comentarios". */
    totalRespuestas: number;
    /** Si la pregunta no está 'activa', se oculta el input. */
    puedeResponder: boolean;
    /** `true` si el caller es el AUTOR de la pregunta (no comenta su propio hilo). */
    esAutor: boolean;
    /** Acción opcional a la derecha del trigger (ej. botón "Yo también"). */
    accionDerecha?: React.ReactNode;
}

export function RespuestasComunidad({
    preguntaId,
    autorPreguntaId,
    totalRespuestas,
    puedeResponder,
    esAutor,
    accionDerecha,
}: RespuestasComunidadProps) {
    const [abierto, setAbierto] = useState(false);

    // El autor de la pregunta lee pero no comenta.
    const puedeEscribir = puedeResponder && !esAutor;

    const hayTrigger = totalRespuestas > 0 || puedeEscribir;
    if (!hayTrigger && !accionDerecha) {
        return null;
    }

    const trigger =
        totalRespuestas > 0 ? (
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                data-testid={`pregunta-toggle-respuestas-${preguntaId}`}
                className="group inline-flex items-center gap-1.5 -ml-0.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-blue-600 hover:text-blue-700 lg:cursor-pointer"
                aria-expanded={abierto}
                aria-controls={`comentarios-${preguntaId}`}
            >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                <span>{abierto ? 'Ocultar' : `Comentarios (${totalRespuestas})`}</span>
            </button>
        ) : puedeEscribir ? (
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                data-testid={`pregunta-toggle-respuestas-${preguntaId}`}
                className="group inline-flex items-center gap-1.5 -ml-0.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-blue-600 hover:text-blue-700 lg:cursor-pointer"
                aria-expanded={abierto}
                aria-controls={`comentarios-${preguntaId}`}
            >
                <span aria-hidden="true" className={abierto ? 'inline-flex' : 'finger-bob inline-flex'}>
                    {abierto
                        ? <X className="w-4 h-4" strokeWidth={2.5} />
                        : <Pointer className="w-4 h-4 rotate-180" strokeWidth={2} />}
                </span>
                <span>{abierto ? 'Cancelar' : 'Comentar'}</span>
            </button>
        ) : null;

    return (
        <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">{trigger}</div>
                {accionDerecha && <div className="shrink-0">{accionDerecha}</div>}
            </div>

            {abierto && (
                <div id={`comentarios-${preguntaId}`}>
                    <PanelComentarios
                        preguntaId={preguntaId}
                        autorPreguntaId={autorPreguntaId}
                        puedeEscribir={puedeEscribir}
                        hayComentarios={totalRespuestas > 0}
                    />
                </div>
            )}
        </div>
    );
}

// =============================================================================
// PANEL: lista de comentarios (hilos) + input raíz
// =============================================================================

function PanelComentarios({
    preguntaId,
    autorPreguntaId,
    puedeEscribir,
    hayComentarios,
}: {
    preguntaId: string;
    autorPreguntaId: string;
    puedeEscribir: boolean;
    hayComentarios: boolean;
}) {
    const usuario = useAuthStore((s) => s.usuario);
    const { data: comentarios = [], isPending, isError, refetch } = useComentariosComunidad(
        preguntaId,
        { enabled: hayComentarios },
    );
    const crear = useCrearComentarioComunidad();
    const editar = useEditarComentarioComunidad();
    const eliminar = useEliminarComentarioComunidad();

    const [texto, setTexto] = useState('');
    const [error, setError] = useState<string | null>(null);

    const usuarioActual: UsuarioComentario | null = usuario
        ? {
              id: usuario.id,
              nombre: usuario.nombre ?? '',
              apellidos: usuario.apellidos ?? '',
              avatarUrl: usuario.avatarUrl ?? null,
          }
        : null;

    const msg = (e: unknown) => (e instanceof Error ? e.message : undefined);

    const handleCrearRaiz = async (e: React.FormEvent) => {
        e.preventDefault();
        const limpio = texto.trim();
        if (limpio.length < TEXTO_MIN) {
            setError(`Escribe al menos ${TEXTO_MIN} caracteres`);
            return;
        }
        setError(null);
        try {
            await crear.mutateAsync({ preguntaId, texto: limpio });
            setTexto('');
        } catch (e) {
            setError(msg(e) ?? 'No se pudo publicar el comentario');
        }
    };

    const handleResponder = async (parentId: string, txt: string): Promise<boolean> => {
        try {
            await crear.mutateAsync({ preguntaId, texto: txt, parentId });
            return true;
        } catch (e) {
            notificar.error(msg(e) ?? 'No se pudo publicar la respuesta');
            return false;
        }
    };

    const handleEditar = async (id: string, txt: string): Promise<boolean> => {
        try {
            await editar.mutateAsync({ comentarioId: id, preguntaId, texto: txt });
            notificar.exito('Comentario actualizado');
            return true;
        } catch (e) {
            notificar.error(msg(e) ?? 'No se pudo guardar');
            return false;
        }
    };

    const handleEliminar = (id: string) => {
        if (!confirm('¿Eliminar este comentario?')) return;
        eliminar.mutate(
            { comentarioId: id, preguntaId },
            {
                onSuccess: () => notificar.exito('Comentario eliminado'),
                onError: (e) => notificar.error(msg(e) ?? 'No se pudo eliminar'),
            },
        );
    };

    return (
        <div className="space-y-3">
            {hayComentarios && isPending && (
                <div className="pl-3 lg:pl-4 border-l-2 border-slate-300 py-2 text-sm font-medium text-slate-600">
                    Cargando comentarios…
                </div>
            )}

            {hayComentarios && isError && (
                <div className="pl-3 lg:pl-4 border-l-2 border-slate-300 py-2 text-sm font-medium text-slate-600">
                    No pudimos cargar los comentarios.{' '}
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="font-semibold text-blue-600 hover:text-blue-700 lg:cursor-pointer"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {comentarios.length > 0 && (
                <div className="space-y-3">
                    {comentarios.map((c) => (
                        <ComentarioItem
                            key={c.id}
                            comentario={c}
                            vendedorId={autorPreguntaId}
                            etiquetaAutor="Autor"
                            permiteEliminarDueno={false}
                            usuarioActual={usuarioActual}
                            puedeComentar={puedeEscribir}
                            enviandoRespuesta={crear.isPending}
                            onEditar={handleEditar}
                            onEliminar={handleEliminar}
                            onResponder={handleResponder}
                        />
                    ))}
                </div>
            )}

            {/* Input raíz — solo si el usuario puede escribir (no el autor). */}
            {puedeEscribir && (
                <form onSubmit={handleCrearRaiz}>
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

                        <div className="flex flex-1 items-center gap-2 rounded-full border-2 border-slate-300 bg-slate-100 py-1 pl-4 pr-1.5 transition-all focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20">
                            <input
                                type="text"
                                data-testid={`comunidad-input-comentario-${preguntaId}`}
                                value={texto}
                                onChange={(e) => {
                                    setTexto(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder="Responde a tu vecino…"
                                maxLength={TEXTO_MAX}
                                disabled={crear.isPending}
                                className="flex-1 bg-transparent py-1.5 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:font-normal placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                data-testid={`comunidad-enviar-comentario-${preguntaId}`}
                                disabled={crear.isPending || texto.trim().length < TEXTO_MIN}
                                aria-label="Publicar comentario"
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all disabled:cursor-not-allowed lg:cursor-pointer ${
                                    texto.trim().length >= TEXTO_MIN && !crear.isPending
                                        ? 'bg-blue-600 text-white shadow-sm lg:hover:bg-blue-700'
                                        : 'bg-transparent text-slate-400'
                                }`}
                            >
                                {crear.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                                ) : (
                                    <Send className="h-4 w-4" strokeWidth={2.5} />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="mt-1 flex items-center px-3 text-sm">
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
        </div>
    );
}

export default RespuestasComunidad;
