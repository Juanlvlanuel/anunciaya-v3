/**
 * RespuestasComunidad.tsx
 * =========================
 * Bloque colapsable de respuestas debajo de una pregunta del Home.
 *
 * Comportamiento:
 *   - Por defecto colapsado: muestra un botón "Ver N respuestas".
 *   - Al abrir: muestra la lista de respuestas (cronológica ascendente) +
 *     una caja para responder (si la pregunta está 'activa').
 *   - Si N=0 y la pregunta está activa: muestra solo la caja para responder
 *     (con CTA "Sé el primero en responder").
 *   - El autor de cada respuesta ve un botón "Eliminar" en la suya. El autor
 *     de la PREGUNTA NO cura este tablón (decisión de producto).
 *
 * Datos:
 *   - `useRespuestas(preguntaId, { enabled: abierto })` — carga al abrir.
 *   - `useCrearRespuesta()` — invalida lista + feed.
 *   - `useBorrarMiRespuesta()` — soft-delete (estado='borrada' en BD).
 *
 * Ubicación: apps/web/src/components/home/RespuestasComunidad.tsx
 */

import { useState, type KeyboardEvent, type FormEvent } from 'react';
import { Send, Loader2, MessageSquare, Trash2 } from 'lucide-react';
import {
    useRespuestas,
    useCrearRespuesta,
    useBorrarMiRespuesta,
} from '../../hooks/queries/usePreguntasComunidad';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type { RespuestaPreguntaComunidad } from '../../types/preguntasComunidad';

const TEXTO_MAX_RESPUESTA = 1000;

interface RespuestasComunidadProps {
    preguntaId: string;
    /** Conteo proveniente del feed (subquery). Sirve para el botón "Ver N respuestas". */
    totalRespuestas: number;
    /** Si la pregunta no está 'activa', se oculta la caja de responder. */
    puedeResponder: boolean;
    /**
     * `true` si el caller es el AUTOR de la pregunta. Cuando lo es:
     *   - NO se muestra el CTA "Sé el primero en responder" (no tiene
     *     sentido invitar al autor a responderse a sí mismo).
     *   - NO se muestra la caja para responder dentro del panel
     *     expandido (el autor solo lee lo que la comunidad le dice).
     *   - SÍ se muestra "Ver N respuestas" cuando ya hay respuestas
     *     (el autor necesita poder leerlas).
     *
     * El autor de una pregunta interactúa con la comunidad vía el menú
     * de autor (cerrar / marcar resuelta / editar / borrar), NO
     * respondiéndose a sí mismo. Si quiere agregar contexto antes de
     * tener respuestas, puede usar "Editar".
     */
    esAutor: boolean;
}

export function RespuestasComunidad({
    preguntaId,
    totalRespuestas,
    puedeResponder,
    esAutor,
}: RespuestasComunidadProps) {
    const [abierto, setAbierto] = useState(false);

    // ¿El caller puede ESCRIBIR una respuesta? Solo si la pregunta está
    // activa Y no es el autor. El autor lee pero no responde.
    const puedeEscribir = puedeResponder && !esAutor;

    // Si no hay respuestas y el caller no puede escribir, no hay nada que
    // mostrar — el bloque entero desaparece. Esto cubre 2 casos:
    //   - Pregunta cerrada/oculta sin respuestas (legacy).
    //   - Autor mirando su propia pregunta sin respuestas (Sprint 2.B').
    if (totalRespuestas === 0 && !puedeEscribir) {
        return null;
    }

    return (
        <div className="mt-3 space-y-2">
            {/* Cabecera: botón para abrir/cerrar */}
            {totalRespuestas > 0 ? (
                <button
                    type="button"
                    onClick={() => setAbierto((v) => !v)}
                    data-testid={`pregunta-toggle-respuestas-${preguntaId}`}
                    className="inline-flex items-center gap-1.5 h-8 px-2 -ml-2 rounded-md text-xs lg:text-sm font-semibold text-slate-600 hover:bg-slate-100 lg:cursor-pointer transition-colors"
                    aria-expanded={abierto}
                    aria-controls={`respuestas-${preguntaId}`}
                >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                    <span>
                        {abierto
                            ? totalRespuestas === 1
                                ? 'Ocultar respuesta'
                                : 'Ocultar respuestas'
                            : totalRespuestas === 1
                                ? 'Ver 1 respuesta'
                                : `Ver ${totalRespuestas} respuestas`}
                    </span>
                </button>
            ) : puedeEscribir ? (
                // Sin respuestas y SE PUEDE escribir → "Sé el primero en
                // responder". Este botón nunca le aparece al autor de la
                // pregunta (esAutor=true → puedeEscribir=false).
                <button
                    type="button"
                    onClick={() => setAbierto((v) => !v)}
                    data-testid={`pregunta-toggle-respuestas-${preguntaId}`}
                    className="inline-flex items-center gap-1.5 h-8 px-2 -ml-2 rounded-md text-xs lg:text-sm font-semibold text-blue-600 hover:bg-blue-50 lg:cursor-pointer transition-colors"
                    aria-expanded={abierto}
                    aria-controls={`respuestas-${preguntaId}`}
                >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                    <span>{abierto ? 'Cancelar' : 'Sé el primero en responder'}</span>
                </button>
            ) : null}

            {abierto && (
                <div
                    id={`respuestas-${preguntaId}`}
                    className="pl-3 lg:pl-4 border-l-2 border-slate-100 space-y-2.5"
                >
                    {totalRespuestas > 0 && (
                        <ListaRespuestas preguntaId={preguntaId} />
                    )}
                    {puedeEscribir && (
                        <CajaResponder preguntaId={preguntaId} />
                    )}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// LISTA DE RESPUESTAS
// =============================================================================

function ListaRespuestas({ preguntaId }: { preguntaId: string }) {
    const { data, isPending, isError, refetch } = useRespuestas(preguntaId, {
        enabled: true,
    });

    if (isPending) {
        return (
            <ul className="space-y-2 animate-pulse" aria-hidden="true">
                {[0, 1].map((i) => (
                    <li
                        key={i}
                        className="flex items-start gap-2.5 bg-slate-50 rounded-lg p-2.5"
                    >
                        <div className="shrink-0 w-7 h-7 rounded-full bg-slate-200" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-2.5 w-1/4 bg-slate-200 rounded" />
                            <div className="h-2.5 w-full bg-slate-200 rounded" />
                            <div className="h-2.5 w-3/4 bg-slate-200 rounded" />
                        </div>
                    </li>
                ))}
            </ul>
        );
    }

    if (isError) {
        return (
            <div className="text-xs lg:text-sm text-slate-500 py-2">
                No pudimos cargar las respuestas.{' '}
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="font-semibold text-blue-600 hover:text-blue-700 lg:cursor-pointer"
                >
                    Reintentar
                </button>
            </div>
        );
    }

    const respuestas = data ?? [];
    if (respuestas.length === 0) {
        return null;
    }

    return (
        <ul className="space-y-2">
            {respuestas.map((r) => (
                <ItemRespuesta key={r.id} respuesta={r} preguntaId={preguntaId} />
            ))}
        </ul>
    );
}

// =============================================================================
// ITEM DE RESPUESTA
// =============================================================================

function ItemRespuesta({
    respuesta,
    preguntaId,
}: {
    respuesta: RespuestaPreguntaComunidad;
    preguntaId: string;
}) {
    const usuarioId = useAuthStore((s) => s.usuario?.id);
    const esAutorRespuesta = usuarioId === respuesta.autorId;
    const borrar = useBorrarMiRespuesta();

    const tiempo = (() => {
        try {
            return formatearTiempoRelativo(respuesta.createdAt);
        } catch {
            return '';
        }
    })();

    const iniciales = obtenerIniciales(respuesta.autorNombre, respuesta.autorApellidos);

    const handleBorrar = () => {
        if (borrar.isPending) return;
        borrar.mutate(
            { respuestaId: respuesta.id, preguntaId },
            {
                onError: (err) => {
                    const mensaje =
                        err instanceof Error ? err.message : 'No se pudo borrar la respuesta';
                    notificar.error(mensaje);
                },
            },
        );
    };

    return (
        <li
            className="flex items-start gap-2.5 bg-slate-50 rounded-lg p-2.5"
            data-testid={`respuesta-${respuesta.id}`}
        >
            <AvatarMini
                url={respuesta.autorAvatarUrl}
                alt={respuesta.autorNombre}
                fallback={iniciales}
            />
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs lg:text-sm font-bold text-slate-800 truncate">
                        {respuesta.autorNombre}
                    </span>
                    {tiempo && (
                        <span className="text-[11px] lg:text-xs text-slate-400">{tiempo}</span>
                    )}
                </div>
                <p className="mt-0.5 text-xs lg:text-sm text-slate-700 leading-relaxed wrap-break-word">
                    {respuesta.texto}
                </p>
            </div>
            {esAutorRespuesta && (
                <button
                    type="button"
                    onClick={handleBorrar}
                    disabled={borrar.isPending}
                    aria-label="Borrar mi respuesta"
                    data-testid={`respuesta-borrar-${respuesta.id}`}
                    className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 lg:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {borrar.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                    )}
                </button>
            )}
        </li>
    );
}

// =============================================================================
// CAJA DE RESPONDER
// =============================================================================

function CajaResponder({ preguntaId }: { preguntaId: string }) {
    const [texto, setTexto] = useState('');
    const crear = useCrearRespuesta();

    const puedeEnviar = texto.trim().length > 0 && !crear.isPending;

    const handleEnviar = () => {
        if (!puedeEnviar) return;
        crear.mutate(
            { preguntaId, texto: texto.trim() },
            {
                onSuccess: () => {
                    setTexto('');
                },
                onError: (err) => {
                    const mensaje =
                        err instanceof Error ? err.message : 'No se pudo publicar la respuesta';
                    notificar.error(mensaje);
                },
            },
        );
    };

    const onSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleEnviar();
    };

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        // Enter sin Shift envía. Shift+Enter inserta salto de línea.
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleEnviar();
        }
    };

    return (
        <form onSubmit={onSubmit} className="flex items-start gap-2">
            <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value.slice(0, TEXTO_MAX_RESPUESTA))}
                onKeyDown={onKeyDown}
                placeholder="Responde a tu vecino…"
                rows={2}
                disabled={crear.isPending}
                maxLength={TEXTO_MAX_RESPUESTA}
                aria-label="Tu respuesta"
                data-testid={`respuesta-input-${preguntaId}`}
                className="flex-1 min-w-0 resize-none bg-slate-100 rounded-lg px-3 py-2 text-xs lg:text-sm font-medium text-slate-800 placeholder:text-slate-500 border-2 border-slate-200 focus:border-blue-400 focus:bg-white outline-none transition-colors disabled:opacity-50"
            />
            <button
                type="submit"
                disabled={!puedeEnviar}
                aria-label="Publicar respuesta"
                data-testid={`respuesta-enviar-${preguntaId}`}
                className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600 text-white hover:bg-blue-700 lg:cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
                {crear.isPending ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                    <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                )}
            </button>
        </form>
    );
}

// =============================================================================
// AVATAR MINI — pequeño helper con fallback robusto
// =============================================================================

function AvatarMini({
    url,
    alt,
    fallback,
}: {
    url: string | null;
    alt: string;
    fallback: string;
}) {
    const [errorImagen, setErrorImagen] = useState(false);
    const mostrarImagen = !!url && !errorImagen;

    return (
        <div className="shrink-0 w-7 h-7 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center text-[10px] font-bold text-slate-500">
            {mostrarImagen ? (
                <img
                    src={url}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={() => setErrorImagen(true)}
                />
            ) : (
                <span aria-hidden="true">{fallback}</span>
            )}
        </div>
    );
}

function obtenerIniciales(nombre: string, apellidos: string): string {
    const a = (nombre || '').trim().charAt(0).toUpperCase();
    const b = (apellidos || '').trim().charAt(0).toUpperCase();
    return (a + b) || '?';
}

export default RespuestasComunidad;
