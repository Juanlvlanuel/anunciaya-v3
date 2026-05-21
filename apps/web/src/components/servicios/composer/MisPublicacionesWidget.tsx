/**
 * MisPublicacionesWidget.tsx
 * ============================
 * Widget compacto que vive a la derecha del composer en el feed de
 * Servicios (solo PC, oculto en móvil). Muestra las 2 publicaciones
 * activas más recientes del usuario con miniatura, tipo·categoría,
 * título, KPIs (vistas · chats · tiempo) y atajo para editar cada una.
 * Footer con link a "/mis-publicaciones" para gestión completa.
 *
 * Estados:
 *   - Loading → spinner compacto
 *   - Vacío   → mensaje amistoso apuntando al composer ("empieza a la izquierda")
 *   - Con publicaciones → 2 mini-cards + footer "Ver mis N publicaciones →"
 *
 * El header muestra dos conteos: activas e inactivas (pausadas), para que
 * el usuario tenga el panorama de su actividad sin abrir Mis Publicaciones.
 *
 * NO duplica Mis Publicaciones — es un atajo de contexto rápido para el
 * autor sin sacarlo del feed.
 *
 * Ubicación: apps/web/src/components/servicios/composer/MisPublicacionesWidget.tsx
 */

import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileEdit, MessageCircle, Eye, Sparkles } from 'lucide-react';
import { useMisPublicacionesServicio } from '../../../hooks/queries/useServicios';
import { Spinner } from '../../ui/Spinner';
import { labelCategoria } from '../../../utils/servicios';
import { formatearTiempoRelativo } from '../../../utils/marketplace';
import type {
    FiltroClasificado,
    PublicacionServicio,
} from '../../../types/servicios';

interface MisPublicacionesWidgetProps {
    /** Cuando el composer al lado está expandido hay más altura
     *  disponible; cargamos hasta 5 publicaciones. Colapsado: solo 2. */
    composerExpandido?: boolean;
}

export function MisPublicacionesWidget({
    composerExpandido = false,
}: MisPublicacionesWidgetProps = {}) {
    const navigate = useNavigate();
    const limitActivas = composerExpandido ? 5 : 2;
    // Publicaciones activas (limit dinámico) + conteo de pausadas (limit
    // 1 = solo el total, no necesitamos los items).
    const { data: activasData, isPending } = useMisPublicacionesServicio(
        'activa',
        { limit: limitActivas, offset: 0 },
    );
    const { data: pausadasData } = useMisPublicacionesServicio('pausada', {
        limit: 1,
        offset: 0,
    });

    const publicaciones = activasData?.data ?? [];
    const totalActivas = activasData?.paginacion.total ?? 0;
    const totalInactivas = pausadasData?.paginacion.total ?? 0;
    const totalGlobal = totalActivas + totalInactivas;

    return (
        <aside
            data-testid="mis-publicaciones-widget"
            className="rounded-2xl border-2 border-slate-300 bg-white shadow-sm overflow-hidden lg:h-full lg:flex lg:flex-col"
        >
            {/* ── Header ────────────────────────────────────────────── */}
            <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-3 border-b-2 border-slate-300">
                <h3 className="text-[15px] font-bold text-slate-900 leading-tight truncate">
                    Mis Publicaciones
                </h3>
                <span className="shrink-0 text-[13px] font-semibold text-slate-600 tabular-nums">
                    {totalActivas} {totalActivas === 1 ? 'activa' : 'activas'}
                    {totalInactivas > 0 && (
                        <>
                            {' · '}
                            {totalInactivas}{' '}
                            {totalInactivas === 1 ? 'inactiva' : 'inactivas'}
                        </>
                    )}
                </span>
            </div>

            {/* ── Cuerpo ─────────────────────────────────────────────── */}
            <div className="flex-1 px-2 py-2">
                {isPending ? (
                    <div className="flex items-center justify-center py-8">
                        <Spinner tamanio="sm" />
                    </div>
                ) : publicaciones.length === 0 ? (
                    <EstadoVacio />
                ) : (
                    <div>
                        {publicaciones.map((p) => (
                            <MiniCard
                                key={p.id}
                                publicacion={p}
                                onEditar={() =>
                                    navigate(`/servicios?editar=${p.id}`)
                                }
                                onVer={() => navigate(`/servicios/${p.id}`)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Footer ─────────────────────────────────────────────── */}
            {totalGlobal > 0 && (
                <button
                    type="button"
                    data-testid="widget-ver-todas"
                    onClick={() => navigate('/mis-publicaciones')}
                    className="w-full px-4 py-3 border-t-2 border-slate-300 inline-flex items-center justify-center gap-2 text-[15px] font-semibold text-sky-700 hover:bg-sky-100 hover:text-sky-800 lg:cursor-pointer"
                >
                    Ver mis {totalGlobal}{' '}
                    {totalGlobal === 1 ? 'publicación' : 'publicaciones'}
                    <ArrowRight className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </button>
            )}
        </aside>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

function MiniCard({
    publicacion,
    onEditar,
    onVer,
}: {
    publicacion: PublicacionServicio;
    onEditar: () => void;
    onVer: () => void;
}) {
    const portada =
        publicacion.fotos[publicacion.fotoPortadaIndex] ?? publicacion.fotos[0];
    const tipoLabel = publicacion.modo === 'ofrezco' ? 'Ofrezco' : 'Solicito';
    const catLabel = publicacion.categoria
        ? labelCategoria(publicacion.categoria as FiltroClasificado)
        : null;
    const tiempo = formatearTiempoRelativo(publicacion.createdAt);

    return (
        <div
            data-testid={`widget-card-${publicacion.id}`}
            className="group relative rounded-lg p-2.5 flex items-center gap-3 hover:bg-slate-100"
        >
            {/* Cuadrado con miniatura + dot verde "activa" */}
            <button
                type="button"
                onClick={onVer}
                aria-label="Ver publicación"
                className="relative shrink-0 lg:cursor-pointer"
            >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100">
                    {portada ? (
                        <img
                            src={portada}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div
                            className="w-full h-full"
                            style={{
                                background:
                                    'linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)',
                            }}
                        />
                    )}
                </div>
                <span
                    aria-hidden
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"
                />
            </button>

            {/* Texto */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span
                        className={
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-semibold ' +
                            (publicacion.modo === 'ofrezco'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-amber-100 text-amber-700')
                        }
                    >
                        {tipoLabel}
                    </span>
                    {catLabel && (
                        <span className="text-[12px] font-semibold text-slate-600 truncate">
                            {catLabel}
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onVer}
                    className="block w-full text-left text-[14px] font-semibold text-slate-700 truncate mt-0.5 lg:cursor-pointer hover:text-sky-700"
                >
                    {publicacion.titulo}
                </button>
                <div className="mt-1.5 flex items-center gap-3 text-[13px] font-semibold text-slate-600">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                        <Eye className="w-[18px] h-[18px]" strokeWidth={2.25} />
                        {publicacion.totalVistas}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                        <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2.25} />
                        {publicacion.totalMensajes}
                    </span>
                    <span className="text-slate-500">· {tiempo}</span>
                </div>
            </div>

            {/* Botón editar con cuadro (estilo conservado del anterior) */}
            <button
                type="button"
                data-testid={`widget-editar-${publicacion.id}`}
                onClick={onEditar}
                aria-label="Editar publicación"
                className="shrink-0 self-center w-10 h-10 grid place-items-center rounded-lg border-2 border-slate-200 text-slate-600 hover:border-sky-400 hover:bg-sky-100 hover:text-sky-700 lg:cursor-pointer"
            >
                <FileEdit className="w-5 h-5" strokeWidth={2} />
            </button>
        </div>
    );
}

function EstadoVacio() {
    return (
        <div className="flex flex-col items-center text-center px-3 py-6">
            <div
                aria-hidden
                className="w-12 h-12 rounded-full bg-sky-100 grid place-items-center mb-3"
            >
                <Sparkles className="w-6 h-6 text-sky-600" strokeWidth={2} />
            </div>
            <p className="text-[14px] font-bold text-slate-900">
                Aún no publicas nada
            </p>
            <p className="mt-1 text-[13px] text-slate-500 font-medium leading-snug">
                Empieza con el composer de la izquierda.
            </p>
        </div>
    );
}

export default MisPublicacionesWidget;
