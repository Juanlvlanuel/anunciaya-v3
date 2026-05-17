/**
 * ClasificadosWidget.tsx
 * =======================
 * Widget embebido en el feed de Servicios para los pedidos `modo='solicito'`.
 * Reemplaza a `SeccionClasificados.tsx` (estilo periódico) con el diseño
 * formal del handoff `design_handoff_clasificados/`.
 *
 * Decisión visual: card unificada blanca con header (icono + título + KPI) +
 * tag strip de categorías + filas de pedidos + footer "Publicar pedido / Ver".
 * Diferencia vs el feed normal:
 *   - Precio en amber-600 + tabular-nums (token §8: valor sobre blanco = -600)
 *   - Eyebrow de categoría en pill rectangular rounded-md (badge de estado)
 *   - CTA en slate-900 sólido (matiza vs el FAB sky del feed)
 *   - Urgente: eyebrow rojo + pin al top de la lista (lo aplica el padre
 *     en el orden de `pedidos`, el widget solo renderiza lo que recibe)
 *
 * Alineado a tokens del proyecto (TOKENS_GLOBALES.md):
 *   - §1 tamaños: `text-sm` base / `text-[11px]` lg / `text-sm` 2xl en interfaz
 *   - §2 tonos: bordes slate-300, fondos slate-200 mínimo, texto slate-600+
 *   - §5 iconos: header `w-4 h-4` fijo; inline `w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4`
 *   - §6 bordes: `border-2` en card y chips de filtro (interactivos)
 *   - §9 KPI: valor `text-xl lg:text-lg 2xl:text-xl font-bold slate-800`
 *   - §10 transitions: chips de filtro sin `transition` (cambio instantáneo)
 *
 * El widget NO fetcha — recibe `pedidos` ya ordenado y filtrado. Tampoco
 * pagina: su rol es teaser; "Ver todos" va a una ruta dedicada.
 *
 * Ubicación: apps/web/src/components/servicios/ClasificadosWidget.tsx
 */

import { ArrowRight, Briefcase, MapPin, Plus } from 'lucide-react';
import type {
    FiltroClasificado,
    PublicacionServicio,
} from '../../types/servicios';
import { FILTROS_CLASIFICADO } from '../../types/servicios';
import {
    formatearPresupuesto,
    formatearTiempoRelativo,
    labelCategoria,
    obtenerNombreCorto,
    tonoCategoria,
} from '../../utils/servicios';

interface ClasificadosWidgetProps {
    /** Lista ya ordenada (urgentes primero) y filtrada por categoría.
     *  El KPI del header refleja `pedidos.length` (filtrado). */
    pedidos: PublicacionServicio[];
    /** Total absoluto del día SIN filtros — solo lo usa el botón "Ver los N →"
     *  del footer. Si no se pasa, cae a `pedidos.length`. */
    totalHoy?: number;
    /** Filtro activo del tag strip ('todos' | 'urgente' | categoría). */
    filtroActivo: FiltroClasificado;
    onFiltroChange: (f: FiltroClasificado) => void;
    onPedidoClick?: (id: string) => void;
    onPublicar?: () => void;
    onVerTodos?: () => void;
    /** 2 columnas compactas (desktop) o 1 columna con cuerpo (mobile). */
    desktop?: boolean;
    /** Cuántos pedidos mostrar. Default: 4 móvil / 6 desktop. */
    n?: number;
}

export function ClasificadosWidget({
    pedidos,
    totalHoy,
    filtroActivo,
    onFiltroChange,
    onPedidoClick,
    onPublicar,
    onVerTodos,
    desktop = false,
    n,
}: ClasificadosWidgetProps) {
    const limit = n ?? (desktop ? 6 : 4);
    const visibles = pedidos.slice(0, limit);
    // KPI del header refleja el conteo filtrado (lo que el usuario está viendo).
    const total = pedidos.length;
    // El total absoluto del día (para "Ver los N" en footer).
    const totalAbsoluto = totalHoy ?? pedidos.length;

    // Label del KPI cambia según el filtro activo — refleja el contexto.
    const labelKpi =
        filtroActivo === 'todos'
            ? total === 1
                ? 'pedido hoy'
                : 'pedidos hoy'
            : filtroActivo === 'urgente'
              ? total === 1
                  ? 'urgente'
                  : 'urgentes'
              : `en ${labelCategoria(filtroActivo)}`;

    // Tag strip: 'todos' + 'urgente' + 6 categorías. Omitimos 'otros' del strip
    // (sí existe como valor en BD, pero no la mostramos como filtro UI).
    const filtros = FILTROS_CLASIFICADO.filter((f) => f !== 'otros');

    return (
        <section
            data-testid="servicios-widget-clasificados"
            className="mt-8 lg:mt-10 mb-32 bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden"
        >
            {/* ───── Header ───── */}
            <header className="px-5 lg:px-6 pt-5 pb-4 border-b-2 border-slate-300">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 grid place-items-center text-white shrink-0">
                                <Briefcase
                                    className="w-4 h-4"
                                    strokeWidth={2.25}
                                />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl lg:text-2xl 2xl:text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                                    Clasificados
                                </h2>
                                <div className="mt-1 text-sm lg:text-[12px] 2xl:text-sm text-slate-600 font-medium">
                                    Lo que buscan los vecinos
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* KPI — token §9. Refleja el conteo filtrado + label
                        dinámico según `filtroActivo`. */}
                    <div className="text-right shrink-0">
                        <div
                            data-testid="kpi-clasificados-total"
                            className="text-xl lg:text-lg 2xl:text-xl font-bold text-slate-800 tabular-nums leading-none"
                        >
                            {total}
                        </div>
                        <div className="text-sm lg:text-[11px] 2xl:text-sm uppercase tracking-[0.1em] font-semibold text-slate-600 mt-1">
                            {labelKpi}
                        </div>
                    </div>
                </div>

                {/* Tag strip de categorías — scroll horizontal en móvil */}
                <div
                    role="tablist"
                    aria-label="Categoría de pedidos"
                    className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar"
                >
                    {filtros.map((f) => {
                        const active = f === filtroActivo;
                        const isUrgente = f === 'urgente';
                        return (
                            <button
                                key={f}
                                role="tab"
                                aria-selected={active}
                                data-testid={`chip-clasificado-${f}`}
                                onClick={() => onFiltroChange(f)}
                                className={
                                    'shrink-0 px-3.5 lg:px-3 2xl:px-3.5 py-2 lg:py-1.5 2xl:py-2 rounded-md text-sm lg:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap lg:cursor-pointer ' +
                                    (active
                                        ? 'bg-slate-900 text-white border-2 border-slate-900'
                                        : isUrgente
                                          ? 'border-2 border-red-300 text-red-700 hover:bg-red-100'
                                          : 'border-2 border-slate-300 text-slate-700 hover:bg-slate-200')
                                }
                            >
                                {isUrgente && !active && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block mr-1.5 -translate-y-0.5" />
                                )}
                                {labelCategoria(f)}
                            </button>
                        );
                    })}
                </div>
            </header>

            {/* ───── Lista de pedidos ───── */}
            {visibles.length === 0 ? (
                <div className="px-5 py-12 text-center">
                    <p className="text-sm lg:text-[13px] 2xl:text-sm text-slate-600 font-medium">
                        Nadie ha publicado pedidos en{' '}
                        <b className="text-slate-900">
                            {labelCategoria(filtroActivo)}
                        </b>{' '}
                        hoy.
                    </p>
                    {onPublicar && (
                        <button
                            onClick={onPublicar}
                            className="mt-3 text-sm lg:text-[12px] 2xl:text-sm font-semibold text-sky-700 lg:cursor-pointer hover:text-sky-800"
                        >
                            Sé el primero →
                        </button>
                    )}
                </div>
            ) : desktop ? (
                <div className="grid grid-cols-2 px-6 divide-x-2 divide-slate-300">
                    {[0, 1].map((col) => {
                        const colItems = visibles.filter((_, i) => i % 2 === col);
                        return (
                            <div key={col} className={col === 0 ? 'pr-6' : 'pl-6'}>
                                {colItems.map((p, i) => (
                                    <div
                                        key={p.id}
                                        className={
                                            i > 0
                                                ? 'border-t-2 border-slate-200'
                                                : ''
                                        }
                                    >
                                        <PedidoRow
                                            pedido={p}
                                            compact
                                            onClick={() => onPedidoClick?.(p.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="px-5">
                    {visibles.map((p, i) => (
                        <div
                            key={p.id}
                            className={
                                i > 0 ? 'border-t-2 border-slate-200' : ''
                            }
                        >
                            <PedidoRow
                                pedido={p}
                                onClick={() => onPedidoClick?.(p.id)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* ───── Footer CTA ───── */}
            <footer className="px-5 lg:px-6 py-3.5 border-t-2 border-slate-300 bg-slate-200 flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-sm lg:text-[13px] 2xl:text-sm font-bold text-slate-900 leading-tight">
                        ¿Necesitas algo?
                    </div>
                    <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium leading-tight mt-0.5">
                        Publica tu pedido y los vecinos te contactan
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {onVerTodos && (
                        <button
                            onClick={onVerTodos}
                            data-testid="btn-clasificados-ver-todos"
                            className="text-sm lg:text-[12px] 2xl:text-sm font-semibold text-slate-700 hover:text-slate-900 px-2 py-2 lg:cursor-pointer"
                        >
                            Ver los {totalAbsoluto} →
                        </button>
                    )}
                    {onPublicar && (
                        <button
                            onClick={onPublicar}
                            data-testid="btn-clasificados-publicar"
                            className="flex items-center gap-1.5 px-4 py-2.5 lg:px-3.5 lg:py-2 2xl:px-4 2xl:py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm lg:text-[12px] 2xl:text-sm lg:cursor-pointer shadow-sm"
                        >
                            <Plus className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
                            Publicar pedido
                        </button>
                    )}
                </div>
            </footer>
        </section>
    );
}

// =============================================================================
// SUBCOMPONENTE — PedidoRow
// =============================================================================

interface PedidoRowProps {
    pedido: PublicacionServicio;
    compact?: boolean;
    onClick?: () => void;
}

function PedidoRow({ pedido, compact, onClick }: PedidoRowProps) {
    const presupuesto = pedido.presupuesto
        ? formatearPresupuesto(pedido.presupuesto)
        : 'A convenir';
    const tiempo = formatearTiempoRelativo(pedido.createdAt);
    const zona = pedido.zonasAproximadas[0] ?? pedido.ciudad.split(',')[0];
    const categoriaLabel = pedido.categoria
        ? labelCategoria(pedido.categoria)
        : 'Otros';
    // Placeholder hasta que el feed embeba al solicitante (Sprint 4+).
    const autor = obtenerNombreCorto('Vecino', '');

    return (
        <article
            data-testid={`pedido-row-${pedido.id}`}
            onClick={onClick}
            className="py-4 group lg:cursor-pointer"
        >
            <div className="flex items-baseline gap-2 mb-2">
                <span
                    className={
                        'inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] uppercase tracking-[0.06em] font-bold ' +
                        tonoCategoria(pedido.categoria, pedido.urgente)
                    }
                >
                    {pedido.urgente && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block" />
                    )}
                    {pedido.urgente ? 'Urgente' : categoriaLabel}
                </span>
                <span className="ml-auto text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                    {tiempo}
                </span>
            </div>

            <div className="flex items-baseline gap-4">
                <h3
                    className={
                        'font-semibold text-slate-900 tracking-tight flex-1 min-w-0 group-hover:text-sky-700 ' +
                        (compact
                            ? 'text-sm lg:text-[14px] 2xl:text-sm truncate'
                            : 'text-base lg:text-[15px] 2xl:text-base leading-snug')
                    }
                >
                    {pedido.titulo}
                </h3>
                <span className="text-base lg:text-sm 2xl:text-base font-bold text-amber-600 shrink-0 tabular-nums whitespace-nowrap">
                    {presupuesto}
                </span>
            </div>

            {!compact && (
                <p className="mt-1.5 text-sm lg:text-[13px] 2xl:text-sm text-slate-600 leading-relaxed line-clamp-2 max-w-[60ch] font-medium">
                    {pedido.descripcion}
                </p>
            )}

            <div className="mt-2.5 flex items-center gap-2 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                <MapPin
                    className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-500 shrink-0"
                    strokeWidth={1.75}
                />
                <span className="text-slate-700 font-semibold">{zona}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-700">{autor}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-sky-700 font-bold text-sm lg:text-[12px] 2xl:text-sm group-hover:gap-1.5 transition-all">
                    Cotizar
                    <ArrowRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
                </span>
            </div>
        </article>
    );
}

export default ClasificadosWidget;
