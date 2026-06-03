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

import { useRef, useState, type FormEvent } from 'react';
import { Send, Loader2, MessageSquare, Trash2, Pointer, X } from 'lucide-react';
import {
    useRespuestas,
    useCrearRespuesta,
    useBorrarMiRespuesta,
} from '../../hooks/queries/usePreguntasComunidad';
import { useAuthStore } from '../../stores/useAuthStore';
import { notificar } from '../../utils/notificaciones';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import { ModalImagenes } from '../ui/ModalImagenes';
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
    /** Acción opcional a la derecha del trigger (ej. botón "Yo también"). */
    accionDerecha?: React.ReactNode;
}

export function RespuestasComunidad({
    preguntaId,
    totalRespuestas,
    puedeResponder,
    esAutor,
    accionDerecha,
}: RespuestasComunidadProps) {
    const [abierto, setAbierto] = useState(false);

    // ¿El caller puede ESCRIBIR una respuesta? Solo si la pregunta está
    // activa Y no es el autor. El autor lee pero no responde.
    const puedeEscribir = puedeResponder && !esAutor;

    // Sin trigger (ni respuestas ni poder escribir) y sin acción a la
    // derecha → no hay nada que mostrar.
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
                aria-controls={`respuestas-${preguntaId}`}
            >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
                <span>
                    {abierto
                        ? totalRespuestas === 1
                            ? 'Ocultar respuesta'
                            : 'Ocultar respuestas'
                        : totalRespuestas === 1
                            ? 'Ver respuesta (1)'
                            : `Ver respuestas (${totalRespuestas})`}
                </span>
            </button>
        ) : puedeEscribir ? (
            // Sin respuestas y SE PUEDE escribir → "Responder" con dedo
            // animado. Nunca le aparece al autor (esAutor → puedeEscribir=false).
            <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                data-testid={`pregunta-toggle-respuestas-${preguntaId}`}
                className="group inline-flex items-center gap-1.5 -ml-0.5 text-sm lg:text-xs 2xl:text-sm font-semibold text-blue-600 hover:text-blue-700 lg:cursor-pointer"
                aria-expanded={abierto}
                aria-controls={`respuestas-${preguntaId}`}
            >
                <span aria-hidden="true" className="finger-bob inline-flex">
                    <Pointer className="w-4 h-4 rotate-180" strokeWidth={2} />
                </span>
                <span>Responder</span>
            </button>
        ) : null;

    return (
        <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">{trigger}</div>
                {accionDerecha && <div className="shrink-0">{accionDerecha}</div>}
            </div>

            {abierto && (
                <div
                    id={`respuestas-${preguntaId}`}
                    className="pl-3 lg:pl-4 border-l-2 border-slate-300 space-y-2.5"
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
            <div className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-600 py-2">
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
            className="flex items-start gap-2.5 bg-slate-200 rounded-lg p-2.5"
            data-testid={`respuesta-${respuesta.id}`}
        >
            <AvatarMini
                url={respuesta.autorAvatarUrl}
                alt={respuesta.autorNombre}
                fallback={iniciales}
            />
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800 truncate">
                        {respuesta.autorNombre}
                    </span>
                    {tiempo && (
                        <span className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-600">{tiempo}</span>
                    )}
                </div>
                <p className="mt-0.5 text-sm lg:text-xs 2xl:text-sm font-medium text-slate-700 leading-relaxed wrap-break-word">
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
                    className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-100 lg:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {borrar.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                        <Trash2 className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
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
    const [flying, setFlying] = useState(false);
    const ref = useRef<HTMLInputElement>(null);
    const crear = useCrearRespuesta();

    const puedeEnviar = texto.trim().length > 0 && !crear.isPending;

    const handleEnviar = () => {
        if (!puedeEnviar) return;
        setFlying(true);
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

    return (
        <form onSubmit={onSubmit} className="flex items-center gap-2">
            <div
                className="flex-1 min-w-0 flex items-center gap-1.5 bg-white rounded-full border-2 border-slate-300 focus-within:border-slate-500 px-5 py-2"
                style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}
            >
                <input
                    ref={ref}
                    type="text"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value.slice(0, TEXTO_MAX_RESPUESTA))}
                    placeholder="Responde a tu vecino…"
                    maxLength={TEXTO_MAX_RESPUESTA}
                    disabled={crear.isPending}
                    aria-label="Tu respuesta"
                    data-testid={`respuesta-input-${preguntaId}`}
                    className="flex-1 min-w-0 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500 disabled:text-slate-400 disabled:cursor-not-allowed"
                />
                {texto && !crear.isPending && (
                    <button
                        type="button"
                        aria-label="Borrar"
                        onClick={() => {
                            setTexto('');
                            ref.current?.focus();
                        }}
                        className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-500 hover:bg-slate-600 lg:cursor-pointer transition-colors"
                    >
                        <X className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </button>
                )}
            </div>
            <button
                type="submit"
                disabled={!puedeEnviar}
                aria-label="Publicar respuesta"
                data-testid={`respuesta-enviar-${preguntaId}`}
                className="send-btn shrink-0 inline-flex items-center justify-center w-11 h-11 lg:w-10 lg:h-10 2xl:w-11 2xl:h-11 rounded-full text-white lg:cursor-pointer active:scale-[0.94] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', boxShadow: '0 3px 10px rgba(30,41,59,0.35)' }}
            >
                {crear.isPending ? (
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" aria-hidden="true" />
                ) : (
                    <span
                        className={`send-ico inline-flex ${flying ? 'flying' : ''}`}
                        onAnimationEnd={() => setFlying(false)}
                    >
                        <Send className="w-4 h-4 shrink-0" aria-hidden="true" />
                    </span>
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
    const [visorAbierto, setVisorAbierto] = useState(false);
    const mostrarImagen = !!url && !errorImagen;

    if (mostrarImagen && url) {
        return (
            <>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setVisorAbierto(true);
                    }}
                    aria-label={`Ver foto de ${alt}`}
                    className="shrink-0 w-9 h-9 rounded-full overflow-hidden shadow-md lg:cursor-pointer active:scale-[0.97]"
                >
                    <img
                        src={url}
                        alt={alt}
                        className="w-full h-full object-cover"
                        onError={() => setErrorImagen(true)}
                    />
                </button>
                <ModalImagenes images={[url]} isOpen={visorAbierto} onClose={() => setVisorAbierto(false)} />
            </>
        );
    }

    return (
        <div
            className="shrink-0 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
        >
            <span aria-hidden="true">{fallback}</span>
        </div>
    );
}

function obtenerIniciales(nombre: string, apellidos: string): string {
    const a = (nombre || '').trim().charAt(0).toUpperCase();
    const b = (apellidos || '').trim().charAt(0).toUpperCase();
    return (a + b) || '?';
}

export default RespuestasComunidad;
