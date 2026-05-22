/**
 * ClasificadosWidget.tsx
 * =======================
 * Widget embebido en el feed de Servicios para las solicitudes
 * `modo='solicito'` (rama #3 del catálogo: publica usuario personal,
 * filtro tab "Solicitudes"). Reemplaza a `SeccionClasificados.tsx`
 * (estilo periódico) con el diseño formal del handoff
 * `design_handoff_clasificados/`.
 *
 * Nota nomenclatura (Sprint 9.3): el archivo sigue llamándose
 * `ClasificadosWidget` por historia (renombrarlo arrastraría imports
 * y data-testids), pero TODO lo visible al usuario dice "Solicitudes"
 * para matchear la tab y el badge de los cards (VACANTE / SERVICIO /
 * SOLICITUD). Próximo refactor del módulo: renombrar a `SolicitudesWidget`.
 *
 * Decisión visual: card unificada blanca con header (icono + título + KPI) +
 * tag strip de categorías + filas de solicitudes + footer "Publicar
 * solicitud / Ver". Diferencia vs el feed normal:
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
    tonoCategoria,
} from '../../utils/servicios';

interface ClasificadosWidgetProps {
    /** Lista ya ordenada (urgentes primero) y filtrada por categoría.
     *  El KPI del header refleja `pedidos.length` (filtrado). */
    pedidos: PublicacionServicio[];
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
    /** Nombre corto de la ciudad (ya sin ", Estado"). Si se pasa, se
     *  muestra como subtítulo prominente con icono MapPin a la derecha
     *  del título — reemplaza al genérico "Solicitudes abiertas en tu
     *  ciudad" con info real. Solo visible en desktop (el espacio en
     *  móvil ya lo ocupa el conteo `(N)` al lado del título). */
    ciudad?: string | null;
}

export function ClasificadosWidget({
    pedidos,
    filtroActivo,
    onFiltroChange,
    onPedidoClick,
    onPublicar,
    onVerTodos,
    desktop = false,
    n,
    ciudad = null,
}: ClasificadosWidgetProps) {
    const limit = n ?? (desktop ? 6 : 4);
    const visibles = pedidos.slice(0, limit);
    // KPI del header refleja el conteo filtrado (lo que el usuario está viendo).
    const total = pedidos.length;

    // `labelKpi` eliminado Sprint 9.3 — el KPI bloque "N PEDIDOS HOY" a la
    // derecha del header se reemplazó por el conteo INLINE "(N)" al lado
    // del título "Solicitudes". El contexto (urgentes / categoría) ya está
    // visible en el tag strip activo justo debajo del título.

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
                {/* Layout Sprint 9.3: una sola fila horizontal en TODOS
                    los breakpoints — icono + título + "Ver más" a la izq,
                    ciudad a la der. Mismo patrón en móvil y desktop, solo
                    cambian tamaños. Si el ancho aprieta, el título trunca
                    primero (gracias a `min-w-0` + `truncate`) y la ciudad
                    se mantiene por su `shrink-0`. Título unificado
                    "Solicitudes" (matchea tab y badges del feed). */}
                <div className="flex items-center justify-between gap-3 lg:gap-4">
                    {/* Lado izquierdo: icono + título + conteo + "Ver más".
                        El "Ver más" se renderiza al lado del título igual
                        que `TituloSeccion` de las otras 2 secciones del
                        feed (Vacantes/Servicios) — consistencia de
                        ubicación + tipografía. Antes vivía en el footer
                        del widget; se movió aquí Sprint 9.3 para liberar
                        el footer como CTA puro de "Publicar solicitud". */}
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 grid place-items-center text-white shrink-0">
                            <Briefcase
                                className="w-4 h-4"
                                strokeWidth={2.25}
                            />
                        </div>
                        <h2 className="text-xl lg:text-2xl 2xl:text-2xl font-extrabold text-slate-900 tracking-tight leading-none truncate">
                            Solicitudes
                            {total > 0 && (
                                <span
                                    data-testid="kpi-clasificados-total"
                                    className="ml-1.5 text-base lg:text-lg font-semibold text-slate-500 tabular-nums"
                                >
                                    ({total})
                                </span>
                            )}
                        </h2>
                        {onVerTodos && (
                            <button
                                type="button"
                                onClick={onVerTodos}
                                data-testid="btn-clasificados-ver-todos"
                                className="shrink-0 inline-flex items-center gap-0.5 text-[13px] lg:text-[12px] 2xl:text-[13px] font-semibold text-sky-700 hover:text-sky-800 lg:cursor-pointer"
                            >
                                Ver más
                                <ArrowRight
                                    className="h-3.5 w-3.5"
                                    strokeWidth={2.5}
                                />
                            </button>
                        )}
                    </div>
                    {/* Lado derecho: nombre de la ciudad con icono MapPin.
                        Visible en TODOS los breakpoints (Sprint 9.3 —
                        antes solo desktop). Tipografía móvil más sobria
                        (text-sm + slate-700) para no competir con el
                        título; desktop sube a text-[15px]/text-lg +
                        slate-900 + font-bold. Fallback a "tu ciudad". */}
                    <div className="flex items-center gap-1.5 text-sm lg:text-[15px] 2xl:text-lg text-slate-700 lg:text-slate-900 font-semibold lg:font-bold shrink-0">
                        <MapPin
                            className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-700"
                            strokeWidth={2.25}
                        />
                        {ciudad ?? 'tu ciudad'}
                    </div>
                </div>

                {/* Tag strip de categorías — scroll horizontal en móvil */}
                <div
                    role="tablist"
                    aria-label="Categoría de solicitudes"
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
                                    'shrink-0 px-3.5 lg:px-3 2xl:px-3.5 py-2 rounded-full text-sm lg:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap lg:cursor-pointer ' +
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

            {/* ───── Lista de solicitudes ───── */}
            {visibles.length === 0 ? (
                <div className="px-5 py-12 text-center">
                    <p className="text-sm lg:text-[13px] 2xl:text-sm text-slate-600 font-medium">
                        Nadie ha publicado solicitudes en{' '}
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

            {/* ───── Footer CTA — Banner amber de conversión ─────
                Sprint 9.3: pasó de "mensaje secundario gris" a CTA real.
                Es el momento de conversión clave del widget — el usuario
                está VIENDO solicitudes de otros y aquí lo invitamos a
                publicar la suya. Por eso:
                  - Fondo gradiente amber-50 → orange-50 (refuerza el
                    color del badge SOLICITUD sin caer en pastel saturado).
                  - Borde superior amber-200 (separa del listado arriba).
                  - Pregunta principal `text-base lg:text-[15px] 2xl:text-base`
                    (un escalón arriba del texto general del widget).
                  - Botón amber-500 sólido con shadow.
                  - Layout responsivo: en móvil texto arriba + botón
                    full-width abajo (los textos no se comprimen y el
                    botón se vuelve target táctil grande); en desktop
                    todo en una sola línea (texto izq, botón der). */}
            <footer className="px-5 lg:px-6 py-4 lg:py-3.5 border-t-2 border-amber-200 bg-linear-to-r from-amber-50 to-orange-50 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
                <div className="min-w-0">
                    <div className="text-base lg:text-[15px] 2xl:text-base font-extrabold text-slate-900 leading-tight">
                        ¿Necesitas un servicio?
                    </div>
                    <div className="text-sm lg:text-[12px] 2xl:text-sm text-slate-700 font-medium leading-snug mt-1">
                        Publica tu solicitud y conecta con quien puede ayudarte
                    </div>
                </div>
                {/* Footer ahora es CTA puro de "Publicar solicitud" —
                    el "Ver más →" se movió al header del widget (junto
                    al título) para mantener consistencia con las otras
                    2 secciones del feed (Vacantes/Servicios).

                    Móvil: `w-full` + `justify-center` — botón full-width
                    debajo del texto, target táctil grande.
                    Desktop: `lg:w-auto` + ancho hug-content — botón a la
                    derecha del texto. */}
                {onPublicar && (
                    <button
                        onClick={onPublicar}
                        data-testid="btn-clasificados-publicar"
                        className="w-full lg:w-auto lg:shrink-0 flex items-center justify-center gap-1.5 px-4 py-3 lg:px-4 lg:py-2.5 2xl:px-5 2xl:py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm lg:text-[13px] 2xl:text-sm lg:cursor-pointer shadow-md shadow-amber-500/30 ring-1 ring-amber-600/20 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4" strokeWidth={2.75} />
                        Publicar solicitud
                    </button>
                )}
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
    // Nota Sprint 9.3: antes la fila pintaba un texto "Vecino" como
    // placeholder del nombre del solicitante (el feed no embebe `usuario`).
    // Se eliminó porque siempre decía lo mismo y no aportaba info real.
    // Cuando el backend embeba el nombre, restaurar el span al lado de la
    // zona ("Centro · Juan P.") siguiendo el patrón anterior.

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
                <span className="ml-auto inline-flex items-center gap-1 text-sky-700 font-bold text-sm lg:text-[12px] 2xl:text-sm group-hover:gap-1.5 transition-all">
                    Cotizar
                    <ArrowRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
                </span>
            </div>
        </article>
    );
}

export default ClasificadosWidget;
