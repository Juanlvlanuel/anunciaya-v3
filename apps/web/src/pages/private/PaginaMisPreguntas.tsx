/**
 * PaginaMisPreguntas.tsx
 * =======================
 * Histórico de TODAS las preguntas del usuario actual (activa, cerrada y
 * oculta), más recientes primero. A diferencia del feed del Home (filtrado
 * a 'activa' por ciudad), esta vista no filtra por estado — el autor ve
 * su histórico completo para gestionarlo (reabrir/eliminar/ver resueltas).
 *
 * UX:
 *   - Header con "Volver" → /inicio.
 *   - Cada card muestra un badge del estado (Activa / Cerrada / Oculta) y
 *     un badge "Resuelta" si aplica. Los conteos (respuestas/interesados)
 *     se muestran igual que en el feed.
 *   - El MenuAutorPregunta funciona aquí también — si la pregunta ya está
 *     oculta, el menú interno se oculta automáticamente (no hay acciones
 *     posibles sobre algo ya borrado).
 *   - Las respuestas siguen siendo accesibles desde el botón "Ver N
 *     respuestas" (RespuestasComunidad funciona igual).
 *
 * Ruta: /inicio/mis-preguntas (anidada para que back lleve al Home).
 *
 * Ubicación: apps/web/src/pages/private/PaginaMisPreguntas.tsx
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Inbox,
    RefreshCcw,
    CheckCircle2,
    XCircle,
    EyeOff,
    Activity,
} from 'lucide-react';
import { useMisPreguntas } from '../../hooks/queries/usePreguntasComunidad';
import { useEstadoCoyo } from '../../hooks/queries/usePreguntasComunidad';
import { MenuAutorPregunta } from '../../components/home/MenuAutorPregunta';
import { RespuestasComunidad } from '../../components/home/RespuestasComunidad';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type {
    PreguntaComunidad,
    EstadoCoyo,
    EstadoPregunta,
} from '../../types/preguntasComunidad';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaMisPreguntas() {
    const navigate = useNavigate();
    const { data, isPending, isError, refetch } = useMisPreguntas();

    const preguntas = data ?? [];

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 lg:py-10 space-y-5 lg:space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/inicio')}
                        aria-label="Volver al inicio"
                        data-testid="mis-preguntas-volver"
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 lg:cursor-pointer transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
                    </button>
                    <div className="min-w-0">
                        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                            Mis preguntas
                        </h1>
                        <p className="text-xs lg:text-sm text-slate-500">
                            Todas las preguntas que has publicado en el Home.
                        </p>
                    </div>
                </div>

                {/* Contenido */}
                {isError ? (
                    <EstadoError onReintentar={() => refetch()} />
                ) : isPending ? (
                    <EsqueletoCarga />
                ) : preguntas.length === 0 ? (
                    <EstadoVacio onIrAlHome={() => navigate('/inicio')} />
                ) : (
                    <ul className="space-y-2.5 lg:space-y-3" data-testid="mis-preguntas-lista">
                        {preguntas.map((p) => (
                            <CardMiPregunta key={p.id} pregunta={p} />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default PaginaMisPreguntas;

// =============================================================================
// CARD — versión adaptada para "Mis preguntas" (sin avatar del autor —
// el usuario YA sabe quién es)
// =============================================================================

function CardMiPregunta({ pregunta }: { pregunta: PreguntaComunidad }) {
    const tiempo = (() => {
        try {
            return formatearTiempoRelativo(pregunta.createdAt);
        } catch {
            return '';
        }
    })();

    // Sondeo de Coyo (igual que en el Home — si ya está en estado final
    // no hace requests).
    const sondeo = useEstadoCoyo(pregunta.id, pregunta.estadoCoyo);
    const estadoCoyo: EstadoCoyo = sondeo.data?.estadoCoyo ?? pregunta.estadoCoyo;

    const estaActiva = pregunta.estadoPregunta === 'activa';
    const estaCerrada = pregunta.estadoPregunta === 'cerrada';
    const estaOculta = pregunta.estadoPregunta === ('oculta' as EstadoPregunta);

    return (
        <li
            className="bg-white border border-slate-200 rounded-2xl p-3.5 lg:p-4 shadow-sm"
            data-testid={`mi-pregunta-${pregunta.id}`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                    <BadgeEstado estado={pregunta.estadoPregunta} />
                    {pregunta.resueltaAt && (
                        <span
                            className="inline-flex items-center gap-1 text-[11px] lg:text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5"
                            data-testid={`mi-pregunta-resuelta-${pregunta.id}`}
                        >
                            <CheckCircle2
                                className="w-3 h-3"
                                strokeWidth={2.5}
                                aria-hidden="true"
                            />
                            Resuelta
                        </span>
                    )}
                    {tiempo && (
                        <span className="text-xs lg:text-sm text-slate-400">
                            {tiempo}
                        </span>
                    )}
                </div>
                <MenuAutorPregunta pregunta={pregunta} />
            </div>

            <p className="text-sm lg:text-base text-slate-800 leading-relaxed wrap-break-word font-medium">
                {pregunta.texto}
            </p>

            {/* Stats inline — totales del feed (no hay conteo de "vistas" hoy) */}
            <div className="mt-2 flex items-center gap-3 text-[11px] lg:text-xs text-slate-500">
                <span>
                    <span className="font-bold text-slate-700">
                        {pregunta.totalRespuestas}
                    </span>{' '}
                    {pregunta.totalRespuestas === 1 ? 'respuesta' : 'respuestas'}
                </span>
                {pregunta.totalInteresados > 0 && (
                    <span>
                        <span className="font-bold text-slate-700">
                            {pregunta.totalInteresados}
                        </span>{' '}
                        {pregunta.totalInteresados === 1
                            ? 'persona interesada'
                            : 'personas interesadas'}
                    </span>
                )}
            </div>

            {/* Estado de Coyo en una línea minimal — solo para preguntas activas
                que aún están procesando (es info útil; las cerradas/ocultas
                ya pasaron). */}
            {estaActiva &&
                (estadoCoyo === 'pendiente' || estadoCoyo === 'procesando') && (
                    <p className="mt-2 text-xs lg:text-sm text-slate-500 italic">
                        Coyo está procesando tu pregunta…
                    </p>
                )}

            {/* Hilo de respuestas — accesible incluso para preguntas cerradas
                (el autor puede leer lo que recibió). En 'oculta' también funciona,
                pero típicamente no llegan aquí porque las eliminadas se filtran
                visualmente menos. */}
            {!estaOculta && (
                // En "Mis preguntas" el caller SIEMPRE es el autor — el
                // backend ya filtra por usuarioId del JWT. Pasamos esAutor
                // hardcoded a true: el autor lee las respuestas que dejó
                // la comunidad pero no se autorresponde.
                <RespuestasComunidad
                    preguntaId={pregunta.id}
                    totalRespuestas={pregunta.totalRespuestas}
                    puedeResponder={estaActiva}
                    esAutor={true}
                />
            )}

            {estaCerrada && (
                <p className="mt-3 text-[11px] lg:text-xs text-slate-400">
                    Esta pregunta ya no recibe respuestas nuevas.
                </p>
            )}
            {estaOculta && (
                <p className="mt-3 text-[11px] lg:text-xs text-slate-400">
                    Esta pregunta fue eliminada — ya no aparece en el feed público.
                </p>
            )}
        </li>
    );
}

// =============================================================================
// BADGE DE ESTADO
// =============================================================================

function BadgeEstado({ estado }: { estado: EstadoPregunta }) {
    if (estado === 'activa') {
        return (
            <span
                className="inline-flex items-center gap-1 text-[11px] lg:text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5"
                data-testid="badge-estado-activa"
            >
                <Activity className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
                Activa
            </span>
        );
    }
    if (estado === 'cerrada') {
        return (
            <span
                className="inline-flex items-center gap-1 text-[11px] lg:text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5"
                data-testid="badge-estado-cerrada"
            >
                <XCircle className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
                Cerrada
            </span>
        );
    }
    return (
        <span
            className="inline-flex items-center gap-1 text-[11px] lg:text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5"
            data-testid="badge-estado-oculta"
        >
            <EyeOff className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
            Eliminada
        </span>
    );
}

// =============================================================================
// ESTADOS
// =============================================================================

function EstadoVacio({ onIrAlHome }: { onIrAlHome: () => void }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 text-center">
            <div className="inline-flex w-12 h-12 lg:w-14 lg:h-14 items-center justify-center rounded-full bg-slate-50 border border-slate-200 mb-3">
                <Inbox
                    className="w-5 h-5 lg:w-6 lg:h-6 text-slate-400"
                    strokeWidth={1.75}
                    aria-hidden="true"
                />
            </div>
            <p className="text-sm lg:text-base font-bold text-slate-800">
                Todavía no has publicado preguntas
            </p>
            <p className="mt-1 text-xs lg:text-sm text-slate-500">
                Pregúntale a tu ciudad y aquí verás tu histórico.
            </p>
            <button
                type="button"
                onClick={onIrAlHome}
                data-testid="mis-preguntas-ir-al-home"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-700 lg:cursor-pointer transition-colors"
            >
                Ir al inicio
            </button>
        </div>
    );
}

function EstadoError({ onReintentar }: { onReintentar: () => void }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 lg:p-6 text-center">
            <p className="text-sm lg:text-base text-slate-600">
                No pudimos cargar tus preguntas. Revisa tu conexión.
            </p>
            <button
                type="button"
                onClick={onReintentar}
                className="mt-3 inline-flex items-center gap-1.5 text-xs lg:text-sm font-bold text-blue-600 hover:text-blue-700 lg:cursor-pointer"
            >
                <RefreshCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Reintentar
            </button>
        </div>
    );
}

function EsqueletoCarga() {
    return (
        <ul className="space-y-2.5 lg:space-y-3" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
                <li
                    key={i}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 lg:p-4"
                >
                    <div className="space-y-2 animate-pulse">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-20 bg-slate-200 rounded-full" />
                            <div className="h-3 w-16 bg-slate-200 rounded" />
                        </div>
                        <div className="h-3.5 w-full bg-slate-200 rounded" />
                        <div className="h-3.5 w-3/4 bg-slate-200 rounded" />
                    </div>
                </li>
            ))}
        </ul>
    );
}
