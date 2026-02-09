/**
 * TablaHistorialCompras.tsx
 * ==========================
 * Historial de puntos ganados y canjeados.
 * Móvil: filtros chips sticky + lista agrupada por mes
 * Desktop: card con filtros fijos + tabla con scroll interno
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/TablaHistorialCompras.tsx
 */

import { useState } from 'react';
import { TrendingUp, TrendingDown, Gift, Store, Calendar, Inbox, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import type { Transaccion, TipoTransaccion } from '../../../../types/cardya';

// =============================================================================
// TIPOS DE FILTRO Y ORDENAMIENTO
// =============================================================================

type FiltroTipo = 'todos' | TipoTransaccion;

type ColumnaOrden = 'fecha' | 'puntos';
type DireccionOrden = 'asc' | 'desc';

interface EstadoOrden {
  columna: ColumnaOrden;
  direccion: DireccionOrden;
}

const FILTROS_CONFIG: { id: FiltroTipo; label: string; color: string; bg: string; border: string }[] = [
  { id: 'todos', label: 'Todos', color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' },
  { id: 'compra', label: 'Ganados', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { id: 'canje', label: 'Canjeados', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
];

// =============================================================================
// HELPERS
// =============================================================================

const formatearFechaCorta = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

const formatearFechaTabla = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const obtenerMesAnio = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
};

/** Agrupa transacciones por mes */
const agruparPorMes = (transacciones: Transaccion[]) => {
  const grupos: Record<string, Transaccion[]> = {};
  for (const tx of transacciones) {
    const clave = obtenerMesAnio(tx.fecha);
    if (!grupos[clave]) grupos[clave] = [];
    grupos[clave].push(tx);
  }
  return Object.entries(grupos);
};

// =============================================================================
// COMPONENTE
// =============================================================================

export default function TablaHistorialCompras({
  transacciones,
  onClickTransaccion,
  stickyTop = 0,
  negocioFiltro = 'todos',
}: {
  transacciones: Transaccion[];
  onClickTransaccion?: (tx: Transaccion) => void;
  stickyTop?: number;
  negocioFiltro?: string;
}) {
  const [filtroActivo, setFiltroActivo] = useState<FiltroTipo>('todos');

  // Ordenamiento: null = default (fecha desc)
  const [orden, setOrden] = useState<EstadoOrden | null>(null);

  /** Alterna ordenamiento de una columna: desc → asc → null (default) */
  const alternarOrden = (columna: ColumnaOrden) => {
    setOrden((prev) => {
      if (!prev || prev.columna !== columna) return { columna, direccion: 'desc' };
      if (prev.direccion === 'desc') return { columna, direccion: 'asc' };
      return null; // vuelve al default
    });
  };

  // Filtrado combinado (tipo + negocio)
  const transaccionesFiltradas = transacciones.filter((tx) => {
    const pasaTipo = filtroActivo === 'todos' || tx.tipo === filtroActivo;
    const pasaNegocio = negocioFiltro === 'todos' || tx.negocioNombre === negocioFiltro;
    return pasaTipo && pasaNegocio;
  });

  // Conteos (respetan filtro de negocio)
  const baseParaConteo = negocioFiltro === 'todos'
    ? transacciones
    : transacciones.filter((tx) => tx.negocioNombre === negocioFiltro);
  const conteos: Record<FiltroTipo, number> = {
    todos: baseParaConteo.length,
    compra: baseParaConteo.filter((tx) => tx.tipo === 'compra').length,
    canje: baseParaConteo.filter((tx) => tx.tipo === 'canje').length,
  };

  if (transacciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Inbox className="w-12 h-12 mb-3 text-slate-300" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-slate-500">Sin transacciones</p>
        <p className="text-xs text-slate-400 mt-1">Aún no has ganado ni canjeado puntos</p>
      </div>
    );
  }

  // Ordenadas según estado de orden
  const txOrdenadas = [...transaccionesFiltradas].sort((a, b) => {
    // Si no hay orden activo, default: fecha descendente
    if (!orden) return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();

    const dir = orden.direccion === 'asc' ? 1 : -1;
    if (orden.columna === 'fecha') {
      return (new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) * dir;
    }
    // puntos: usar valor real (positivos primero en desc, negativos al final)
    return (a.puntos - b.puntos) * dir;
  });

  // Agrupación por mes solo cuando ordena por fecha (o default)
  const mostrarAgrupado = !orden || orden.columna === 'fecha';
  const gruposMes = mostrarAgrupado ? agruparPorMes(txOrdenadas) : [];

  // Chips + select de negocio reutilizables
  const renderFiltros = (className: string, style?: React.CSSProperties) => (
    <div className={className} style={style}>
      <div className="flex gap-2 flex-1 overflow-x-auto cardya-tabs items-center">
        {FILTROS_CONFIG.map((chip) => {
          const activo = filtroActivo === chip.id;
          const cantidad = conteos[chip.id];
          if (cantidad === 0 && chip.id !== 'todos') return null;

          return (
            <button
              key={chip.id}
              onClick={() => setFiltroActivo(chip.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer outline-none focus:outline-none"
              style={{
                background: activo ? chip.bg : '#f8fafc',
                color: activo ? chip.color : '#64748b',
                border: `1.5px solid ${activo ? chip.color : '#cbd5e1'}`,
              }}
            >
              <span>{chip.label}</span>
              <span
                className="text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none"
                style={{
                  background: activo ? chip.border : '#e2e8f0',
                  color: activo ? chip.color : '#64748b',
                }}
              >
                {cantidad}
              </span>
            </button>
          );
        })}

        {/* ── Separador visual ── */}
        <div className="w-px h-5 bg-slate-300 shrink-0 lg:hidden" />

        {/* ── Chips de ordenamiento (solo móvil) ── */}
        {(['fecha', 'puntos'] as ColumnaOrden[]).map((col) => {
          const activo = orden?.columna === col;
          const label = col === 'fecha' ? 'Fecha' : 'Puntos';

          return (
            <button
              key={`orden-${col}`}
              onClick={() => alternarOrden(col)}
              className="lg:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer outline-none focus:outline-none"
              style={{
                background: activo ? '#fffbeb' : '#f8fafc',
                color: activo ? '#d97706' : '#94a3b8',
                border: `1.5px solid ${activo ? '#f59e0b' : '#cbd5e1'}`,
              }}
            >
              {activo ? (
                orden.direccion === 'desc' ? (
                  <ChevronDown className="w-3 h-3" strokeWidth={3} />
                ) : (
                  <ChevronUp className="w-3 h-3" strokeWidth={3} />
                )
              ) : (
                <ArrowUpDown className="w-3 h-3" strokeWidth={2.5} />
              )}
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE: Filtros sticky + lista agrupada por mes (< lg)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden">

        {/* Chips de filtro sticky */}
        {renderFiltros(
          'sticky z-10 flex items-center gap-2 pb-2.5 pt-2 mb-2 -mx-4 px-4',
          { top: `${stickyTop}px`, background: '#f8fafc' }
        )}

        {/* Lista agrupada por mes o plana según ordenamiento */}
        {txOrdenadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Inbox className="w-10 h-10 mb-2 text-slate-300" strokeWidth={1.5} />
            <p className="text-xs font-semibold text-slate-400">Sin transacciones en este filtro</p>
          </div>
        ) : mostrarAgrupado ? (
          <div className="flex flex-col gap-3">
            {gruposMes.map(([mes, txs]) => (
              <div
                key={mes}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
              >
                {/* Header del mes */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5"
                  style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                >
                  <Calendar className="w-4 h-4 text-amber-400" strokeWidth={2} />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {mes}
                  </span>
                  <span className="ml-auto text-xs font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full">
                    {txs.length}
                  </span>
                </div>

                {/* Transacciones del mes */}
                <div className="divide-y divide-slate-100">
                {txs.map((tx) => {
                  const esGanado = tx.tipo === 'compra';
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-slate-50"
                      onClick={() => onClickTransaccion?.(tx)}
                    >
                      {/* Ícono tipo */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: esGanado
                            ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                            : 'linear-gradient(135deg, #ffe4e6, #fecdd3)',
                        }}
                      >
                        {esGanado ? (
                          <TrendingUp className="w-[18px] h-[18px] text-emerald-700" strokeWidth={2.5} />
                        ) : (
                          <Gift className="w-[18px] h-[18px] text-rose-600" strokeWidth={2.5} />
                        )}
                      </div>

                      {/* Info central */}
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-bold text-slate-800 truncate block">
                          {tx.negocioNombre}
                        </span>
                        <span className="text-xs text-slate-400 truncate block">
                          {tx.descripcion}
                        </span>
                        {tx.montoCompra !== undefined && (
                          <span className="text-xs text-amber-700 font-bold block mt-0.5">
                            {"$"}{tx.montoCompra.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Puntos + Balance + Fecha */}
                      <div className="shrink-0 text-right pl-2">
                        <span
                          className={`text-base font-black block leading-tight ${esGanado ? 'text-emerald-600' : 'text-rose-500'}`}
                        >
                          {esGanado ? '+' : ''}{tx.puntos.toLocaleString()} pts
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {formatearFechaCorta(tx.fecha)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Lista plana (sin agrupación por mes) — cuando ordena por puntos ── */
          <div
            className="bg-white rounded-2xl overflow-hidden divide-y divide-slate-100 border border-slate-200 shadow-sm"
          >
            {txOrdenadas.map((tx) => {
              const esGanado = tx.tipo === 'compra';
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-slate-50"
                  onClick={() => onClickTransaccion?.(tx)}
                >
                  {/* Ícono tipo */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: esGanado
                        ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
                        : 'linear-gradient(135deg, #ffe4e6, #fecdd3)',
                    }}
                  >
                    {esGanado ? (
                      <TrendingUp className="w-[18px] h-[18px] text-emerald-700" strokeWidth={2.5} />
                    ) : (
                      <Gift className="w-[18px] h-[18px] text-rose-600" strokeWidth={2.5} />
                    )}
                  </div>

                  {/* Info central */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[15px] font-bold text-slate-800 truncate block">
                      {tx.negocioNombre}
                    </span>
                    <span className="text-xs text-slate-400 truncate block">
                      {tx.descripcion}
                    </span>
                    {tx.montoCompra !== undefined && (
                      <span className="text-xs text-amber-700 font-bold block mt-0.5">
                        {"$"}{tx.montoCompra.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Puntos + Balance + Fecha */}
                  <div className="shrink-0 text-right pl-2">
                    <span
                      className={`text-base font-black block leading-tight ${esGanado ? 'text-emerald-600' : 'text-rose-500'}`}
                    >
                      {esGanado ? '+' : ''}{tx.puntos.toLocaleString()} pts
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatearFechaCorta(tx.fecha)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP: Card con filtros fijos + tabla con scroll (>= lg)
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:flex-col rounded-2xl overflow-hidden"
        style={{
          border: '1px solid #cbd5e1',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          height: 'calc(100vh - 300px)',
          minHeight: '400px',
        }}
      >
        {/* Filtros fijos (no hacen scroll) */}
        {renderFiltros(
          'flex items-center gap-2 px-5 2xl:px-6 py-3 shrink-0',
          { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }
        )}

        {/* Contenido con scroll */}
        {txOrdenadas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Inbox className="w-10 h-10 mb-2 text-slate-300" strokeWidth={1.5} />
            <p className="text-xs font-semibold text-slate-400">Sin transacciones en este filtro</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-1">
                <tr style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                  <th className="px-5 py-3 text-left text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
                    Negocio
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
                    <button
                      onClick={() => alternarOrden('puntos')}
                      className="inline-flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors outline-none focus:outline-none uppercase"
                    >
                      <span>Puntos</span>
                      {orden?.columna === 'puntos' ? (
                        orden.direccion === 'desc' ? (
                          <ChevronDown className="w-5 h-5 text-amber-400" strokeWidth={3} />
                        ) : (
                          <ChevronUp className="w-5 h-5 text-amber-400" strokeWidth={3} />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-white/50" strokeWidth={2.5} />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-5 py-3 text-right text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
                    <button
                      onClick={() => alternarOrden('fecha')}
                      className="inline-flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors ml-auto outline-none focus:outline-none uppercase"
                    >
                      <span>Fecha</span>
                      {orden?.columna === 'fecha' ? (
                        orden.direccion === 'desc' ? (
                          <ChevronDown className="w-5 h-5 text-amber-400" strokeWidth={3} />
                        ) : (
                          <ChevronUp className="w-5 h-5 text-amber-400" strokeWidth={3} />
                        )
                      ) : (
                        <ArrowUpDown className="w-4 h-4 text-white/50" strokeWidth={2.5} />
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200">
                {txOrdenadas.map((tx) => {
                  const esGanado = tx.tipo === 'compra';
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 cursor-pointer"
                      onClick={() => onClickTransaccion?.(tx)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: esGanado
                                ? 'linear-gradient(135deg, #d1fae5, #bbf7d0)'
                                : 'linear-gradient(135deg, #ffe4e6, #fecdd3)',
                            }}
                          >
                            {esGanado ? (
                              <TrendingUp className="w-4 h-4 text-emerald-700" strokeWidth={2.5} />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-rose-600" strokeWidth={2.5} />
                            )}
                          </div>
                          <span className={`text-[13px] font-bold ${esGanado ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {esGanado ? 'Ganados' : 'Canjeados'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[13px] font-semibold text-slate-700 truncate">
                            {tx.negocioNombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div>
                          <span className="text-[13px] text-slate-500 block">{tx.descripcion}</span>
                          {tx.montoCompra !== undefined && (
                            <span className="text-[11px] text-slate-400 font-medium">{"$"}{tx.montoCompra.toFixed(2)} MXN</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span
                          className={`text-sm font-bold ${esGanado ? 'text-emerald-700' : 'text-rose-600'}`}
                        >
                          {esGanado ? '+' : '-'}
                          {Math.abs(tx.puntos).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="text-[12px] text-slate-400 font-medium">{formatearFechaTabla(tx.fecha)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}