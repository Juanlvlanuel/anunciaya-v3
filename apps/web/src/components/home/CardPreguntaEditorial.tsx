/**
 * CardPreguntaEditorial.tsx — Card del feed (estilo "Editorial") del Home.
 * =========================================================================
 * Cabecera del autor (avatar + nombre + tiempo + chip Resuelta + menú ⋮) +
 * pregunta grande + bloque de respuesta de Coyo + acciones de comunidad.
 *
 * Reutiliza los componentes existentes SIN reescribirlos:
 *   - BotonInteresComunidad, RespuestasComunidad, MenuAutorPregunta, CoyoAnimado.
 *
 * Conserva la funcionalidad del Home anterior dentro del nuevo look:
 *   - Sondeo de Coyo (useEstadoCoyo) que se autoapaga al llegar a estado final.
 *   - Subtipos de `no_aplica` (vaga → ámbar "Coyo sugiere" / no_local → slate
 *     "Coyo aclara") vía detectarSubtipoNoAplica.
 *   - `sin_respuesta` con botón Reintentar (solo autor).
 *   - Tarjetas de resultado clicables al detalle + data-testid de E2E.
 *
 * El carrusel de resultados es ÚNICO (mezcla negocios/ofertas/marketplace/
 * servicios en un solo scroll horizontal con badge de tipo) — decisión de
 * diseño del rediseño 2 columnas.
 *
 * Ubicación: apps/web/src/components/home/CardPreguntaEditorial.tsx
 */

import {
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    RefreshCcw,
    Loader2,
} from 'lucide-react';
import {
    useEstadoCoyo,
    useReintentarMiPregunta,
} from '../../hooks/queries/usePreguntasComunidad';
import { useAuthStore } from '../../stores/useAuthStore';
import { CoyoAnimado } from '../CoyoAnimado';
import { BotonInteresComunidad } from './BotonInteresComunidad';
import { RespuestasComunidad } from './RespuestasComunidad';
import { MenuAutorPregunta } from './MenuAutorPregunta';
import { CardItemCoyo } from './CardItemCoyo';
import { detectarSubtipoNoAplica, obtenerIniciales, itemsPlanosCoyo } from './navegacionCoyo';
import { notificar } from '../../utils/notificaciones';
import { formatearTiempoRelativo } from '../../utils/marketplace';
import type { PreguntaComunidad, EstadoCoyo } from '../../types/preguntasComunidad';

// =============================================================================
// AVATAR — gradiente azul de marca (TOKENS_GLOBALES R2)
// =============================================================================

function Avatar({ url, alt, fallback }: { url: string | null; alt: string; fallback: string }) {
    if (url) {
        return <img src={url} alt={alt} className="shrink-0 w-9 h-9 rounded-full object-cover" />;
    }
    return (
        <div
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 50%, #1d4ed8 100%)' }}
        >
            <span aria-hidden="true">{fallback}</span>
        </div>
    );
}

// =============================================================================
// BLOQUE DE RESPUESTA DE COYO (según estadoCoyo)
// =============================================================================

function BloqueSinRespuesta({ preguntaId, esAutor }: { preguntaId: string; esAutor: boolean }) {
    const reintentar = useReintentarMiPregunta();

    const handleReintentar = () => {
        if (reintentar.isPending) return;
        reintentar.mutate(preguntaId, {
            onSuccess: () => notificar.exito('Reintentando — Coyo está procesando de nuevo'),
            onError: (err) =>
                notificar.error(err instanceof Error ? err.message : 'No se pudo reintentar'),
        });
    };

    return (
        <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                <span className="text-sm font-bold text-slate-700">Coyo no pudo procesar tu pregunta</span>
            </div>
            <p className="text-sm lg:text-base text-slate-600 leading-relaxed">
                {esAutor
                    ? 'Hubo un problema temporal con el asistente. Puedes intentar de nuevo.'
                    : 'Coyo no pudo responder ahorita, pero los vecinos sí pueden ayudar.'}
            </p>
            {esAutor && (
                <button
                    type="button"
                    onClick={handleReintentar}
                    disabled={reintentar.isPending}
                    data-testid={`coyo-reintentar-${preguntaId}`}
                    className="mt-2.5 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-700 text-white text-xs lg:text-sm font-bold hover:bg-slate-800 lg:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {reintentar.isPending ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            Reintentando…
                        </>
                    ) : (
                        <>
                            <RefreshCcw className="w-3.5 h-3.5" aria-hidden="true" />
                            Reintentar
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

function BloqueNoAplica({ texto }: { texto: string }) {
    const subtipo = detectarSubtipoNoAplica(texto);
    const tono =
        subtipo === 'vaga'
            ? { fondo: 'bg-amber-50 border-amber-200', icono: 'text-amber-600', titulo: 'Coyo sugiere' }
            : { fondo: 'bg-slate-100 border-slate-200', icono: 'text-slate-500', titulo: 'Coyo aclara' };

    return (
        <div className={`mt-3 rounded-xl border p-3 lg:p-3.5 ${tono.fondo}`}>
            <div className="flex items-center gap-2 mb-1">
                <Sparkles className={`w-4 h-4 shrink-0 ${tono.icono}`} strokeWidth={2.5} aria-hidden="true" />
                <span className="text-sm font-bold text-slate-700">{tono.titulo}</span>
            </div>
            <p className="text-sm lg:text-base text-slate-600 leading-relaxed wrap-break-word">{texto}</p>
        </div>
    );
}

function RespuestaCoyo({ pregunta }: { pregunta: PreguntaComunidad }) {
    // Sondea el estado de Coyo; si ya viene final del feed, el hook no hace
    // requests. Mientras no haya data del sondeo, usamos lo del feed.
    const sondeo = useEstadoCoyo(pregunta.id, pregunta.estadoCoyo);
    const estadoCoyo: EstadoCoyo = sondeo.data?.estadoCoyo ?? pregunta.estadoCoyo;
    const respuestaCoyo = sondeo.data?.respuestaCoyo ?? pregunta.respuestaCoyo;
    const resultadosCoyo = sondeo.data?.resultadosCoyo ?? pregunta.resultadosCoyo;

    const usuarioId = useAuthStore((s) => s.usuario?.id);
    const esAutor = !!usuarioId && usuarioId === pregunta.autorId;

    if (estadoCoyo === 'pendiente' || estadoCoyo === 'procesando') {
        return (
            <div className="mt-3 flex items-center gap-2 text-slate-600" aria-live="polite">
                <CoyoAnimado
                    estado="pensando"
                    align="center"
                    alt="Coyo está pensando"
                    className="shrink-0 w-10 h-10 lg:w-12 lg:h-12"
                />
                <span className="text-sm font-bold">Coyo está pensando</span>
                <span className="coyo-dots inline-flex gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </span>
            </div>
        );
    }

    if (estadoCoyo === 'no_aplica' && respuestaCoyo) {
        return <BloqueNoAplica texto={respuestaCoyo} />;
    }

    if (estadoCoyo === 'sin_respuesta') {
        return <BloqueSinRespuesta preguntaId={pregunta.id} esAutor={esAutor} />;
    }

    // listo
    const items = itemsPlanosCoyo(resultadosCoyo);
    const encabezado = items.length > 0 ? 'Coyo encontró esto' : 'Coyo dice';

    return (
        <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-1.5 mb-1.5">
                <img
                    src="/cabeza-coyo.webp"
                    alt=""
                    aria-hidden="true"
                    className="w-7 h-7 shrink-0 object-contain"
                />
                <span className="text-sm font-bold text-slate-700">{encabezado}</span>
            </div>
            {respuestaCoyo && (
                <p className="text-sm lg:text-base text-slate-600 leading-relaxed mb-2.5">{respuestaCoyo}</p>
            )}
            {items.length > 0 && (
                <div className="-mx-1 px-1 flex gap-2.5 overflow-x-auto pb-1.5 mp-scroll">
                    {items.map((it) => (
                        <CardItemCoyo key={`${it.tipo}-${it.id}`} item={it} />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// CARD PREGUNTA EDITORIAL
// =============================================================================

interface CardPreguntaEditorialProps {
    pregunta: PreguntaComunidad;
}

export function CardPreguntaEditorial({ pregunta }: CardPreguntaEditorialProps) {
    const usuarioId = useAuthStore((s) => s.usuario?.id);
    const esAutor = !!usuarioId && usuarioId === pregunta.autorId;
    const preguntaActiva = pregunta.estadoPregunta === 'activa';
    const mostrarInteres = preguntaActiva && !esAutor;
    const resuelta = pregunta.resueltaAt !== null;

    const tiempo = (() => {
        try {
            return formatearTiempoRelativo(pregunta.createdAt);
        } catch {
            return '';
        }
    })();

    const iniciales = obtenerIniciales(pregunta.autorNombre, pregunta.autorApellidos);

    return (
        <li
            id={`feed-${pregunta.id}`}
            data-testid={`pregunta-${pregunta.id}`}
            className="scroll-mt-24 bg-white rounded-xl p-4 lg:p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.10)]"
        >
            {/* Header del autor */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar url={pregunta.autorAvatarUrl} alt={pregunta.autorNombre} fallback={iniciales} />
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate leading-tight">{pregunta.autorNombre}</p>
                        {tiempo && <p className="text-xs text-slate-400 font-medium">{tiempo}</p>}
                    </div>
                    {resuelta && (
                        <span
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5 shrink-0"
                            data-testid={`pregunta-resuelta-${pregunta.id}`}
                        >
                            <CheckCircle2 className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" /> Resuelta
                        </span>
                    )}
                </div>
                {esAutor && <MenuAutorPregunta pregunta={pregunta} />}
            </div>

            {/* Pregunta */}
            <p className="mt-3 text-lg lg:text-xl font-semibold text-slate-800 leading-snug text-balance wrap-break-word">
                {pregunta.texto}
            </p>

            {/* Respuesta de Coyo */}
            <RespuestaCoyo pregunta={pregunta} />

            {/* Acciones de comunidad */}
            {mostrarInteres && (
                <div className="mt-3 flex items-center justify-end">
                    <BotonInteresComunidad
                        preguntaId={pregunta.id}
                        yoTambienInteresado={pregunta.yoTambienInteresado}
                        totalInteresados={pregunta.totalInteresados}
                    />
                </div>
            )}
            <RespuestasComunidad
                preguntaId={pregunta.id}
                totalRespuestas={pregunta.totalRespuestas}
                puedeResponder={preguntaActiva}
                esAutor={esAutor}
            />
        </li>
    );
}

export default CardPreguntaEditorial;
