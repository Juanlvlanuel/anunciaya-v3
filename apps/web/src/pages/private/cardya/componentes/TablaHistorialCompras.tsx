/**
 * TablaHistorialCompras.tsx
 * ==========================
 * Historial de puntos ganados y canjeados.
 * Móvil: filtros chips sticky + lista agrupada por mes
 * Desktop: card con filtros fijos + tabla con scroll interno
 *
 * COLUMNAS DESKTOP: TIPO | NEGOCIO (logo) | CONCEPTO | MONTO | PUNTOS ↕ | FECHA ↕
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/TablaHistorialCompras.tsx
 */

import { useState, Fragment } from 'react';
import { Store, Inbox, ArrowUpDown, ChevronUp, ChevronDown, Ticket } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const TrendingUp = (p: IconoWrapperProps) => <Icon icon={ICONOS.tendenciaSubida} {...p} />;
const TrendingDown = (p: IconoWrapperProps) => <Icon icon={ICONOS.tendenciaBajada} {...p} />;
const Gift = (p: IconoWrapperProps) => <Icon icon={ICONOS.recompensa} {...p} />;
const Calendar = (p: IconoWrapperProps) => <Icon icon={ICONOS.fechas} {...p} />;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
// ArrowUpDown, ChevronUp, ChevronDown se usan en los headers de tabla para ordenamiento
import type { Transaccion, TipoTransaccion } from '../../../../types/cardya';

// =============================================================================
// TIPOS DE FILTRO Y ORDENAMIENTO
// =============================================================================

type FiltroTipo = 'todos' | TipoTransaccion | 'con_cupon';

type ColumnaOrden = 'fecha' | 'puntos';
type DireccionOrden = 'asc' | 'desc';

interface EstadoOrden {
  columna: ColumnaOrden;
  direccion: DireccionOrden;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatearCupon = (tipo: string, valor: number | null, valorTexto?: string | null): string => {
  switch (tipo) {
    case 'porcentaje': return `${valor}%`;
    case 'monto_fijo': return `$${valor}`;
    case '2x1': return '2×1';
    case '3x2': return '3×2';
    case 'envio_gratis': return 'Envío gratis';
    case 'gratis': return 'Gratis';
    case 'otro': return valorTexto || 'Cupón';
    default: return 'Cupón';
  }
};

const formatearFechaCorta = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
};

const formatearFechaTabla = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  const texto = fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  return texto.replace(/ [a-z]/g, (c) => c.toUpperCase());
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
  stickyTop: _stickyTop = 0,
  negocioFiltro = 'todos',
  filtroEstado = 'todos',
}: {
  transacciones: Transaccion[];
  onClickTransaccion?: (tx: Transaccion) => void;
  stickyTop?: number;
  negocioFiltro?: string;
  filtroEstado?: string;
}) {
  const filtroActivo = filtroEstado as FiltroTipo;

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

  // Filtrado combinado (tipo + negocio + cupón)
  const transaccionesFiltradas = transacciones.filter((tx) => {
    let pasaTipo: boolean;
    if (filtroActivo === 'todos') pasaTipo = true;
    else if (filtroActivo === 'con_cupon') pasaTipo = !!tx.cuponTipo;
    else pasaTipo = tx.tipo === filtroActivo;
    const pasaNegocio = negocioFiltro === 'todos' || tx.negocioNombre === negocioFiltro;
    return pasaTipo && pasaNegocio;
  });

  if (transacciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 rounded-full bg-linear-to-br from-amber-100 to-amber-50 flex items-center justify-center ring-8 ring-amber-50 mb-6">
          <Clock className="w-12 h-12 lg:w-16 lg:h-16 text-amber-400" strokeWidth={1.5} />
        </div>
        <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Sin transacciones</h3>
        <p className="text-base lg:text-lg font-medium text-gray-600 mt-1">Aún no has ganado ni canjeado puntos</p>
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

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE: Filtros sticky + lista agrupada por mes (< lg)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden">

        {/* Lista agrupada por mes o plana según ordenamiento */}
        {txOrdenadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-600">
            <Inbox className="w-10 h-10 mb-2 text-slate-300" strokeWidth={1.5} />
            <p className="text-xs font-semibold text-slate-600">Sin transacciones en este filtro</p>
          </div>
        ) : mostrarAgrupado ? (
          <div className="flex flex-col gap-3">
            {gruposMes.map(([mes, txs]) => (
              <div
                key={mes}
                className="bg-white rounded-2xl overflow-hidden border border-slate-300 shadow-sm"
              >
                {/* Header del mes */}
                <div
                  className="flex items-center gap-2 px-4 py-2.5"
                  style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                >
                  <Calendar className="w-4 h-4 text-amber-400" strokeWidth={2} />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    {mes}
                  </span>
                  <span className="ml-auto text-sm font-bold text-white bg-white/20 px-2.5 py-0.5 rounded-full">
                    {txs.length}
                  </span>
                </div>

                {/* Transacciones del mes */}
                <div className="divide-y-[1.5px] divide-slate-300">
                  {txs.map((tx) => {
                    const esGanado = tx.tipo === 'compra';
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-slate-200"
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
                          <span className="text-sm text-slate-600 font-medium truncate block">
                            {tx.descripcion.includes('||') ? (
                              <>
                                <strong className="text-slate-600">{tx.descripcion.split('||')[1]}</strong>
                                {tx.descripcion.split('||')[2]}
                              </>
                            ) : tx.descripcion}
                          </span>
                          {tx.montoCompra !== undefined && (
                            <span className="text-sm text-amber-700 font-bold block mt-0.5">
                              {"$"}{tx.montoCompra.toFixed(2)}
                            </span>
                          )}
                          {tx.cuponTipo && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700 mt-0.5">
                              <Ticket className="w-3 h-3" strokeWidth={2.5} />
                              {formatearCupon(tx.cuponTipo, tx.cuponValor ?? null, tx.cuponValorTexto)}
                            </span>
                          )}
                        </div>

                        {/* Puntos + Fecha */}
                        <div className="shrink-0 text-right pl-2">
                          <span
                            className={`text-base font-black block leading-tight ${esGanado ? 'text-emerald-600' : 'text-rose-500'}`}
                          >
                            {esGanado ? '+' : ''}{tx.puntos.toLocaleString()} pts
                          </span>
                          <span className="text-sm text-slate-600 font-medium">
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
            className="bg-white rounded-2xl overflow-hidden divide-y-[1.5px] divide-slate-300 border border-slate-300 shadow-sm"
          >
            {txOrdenadas.map((tx) => {
              const esGanado = tx.tipo === 'compra';
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-slate-200"
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
                    <span className="text-sm text-slate-600 font-medium truncate block">
                      {tx.descripcion}
                    </span>
                    {tx.montoCompra !== undefined && (
                      <span className="text-sm text-amber-700 font-bold block mt-0.5">
                        {"$"}{tx.montoCompra.toFixed(2)}
                      </span>
                    )}
                    {tx.cuponTipo && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700 mt-0.5">
                        <Ticket className="w-3 h-3" strokeWidth={2.5} />
                        {formatearCupon(tx.cuponTipo, tx.cuponValor ?? null, tx.cuponValorTexto)}
                      </span>
                    )}
                  </div>

                  {/* Puntos + Fecha */}
                  <div className="shrink-0 text-right pl-2">
                    <span
                      className={`text-base font-black block leading-tight ${esGanado ? 'text-emerald-600' : 'text-rose-500'}`}
                    >
                      {esGanado ? '+' : ''}{tx.puntos.toLocaleString()} pts
                    </span>
                    <span className="text-sm text-slate-600 font-medium">
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
          COLUMNAS: TIPO | NEGOCIO (logo) | CONCEPTO | MONTO | PUNTOS ↕ | FECHA ↕
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        data-testid="tabla-historial-compras-desktop"
        className="hidden lg:flex lg:flex-col rounded-xl overflow-hidden bg-white border-2 border-slate-300"
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          height: 'calc(100vh - 300px)',
          minHeight: '400px',
        }}
      >
        {/* Contenido con scroll */}
        {txOrdenadas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <Inbox className="w-10 h-10 mb-2 text-slate-300" strokeWidth={1.5} />
            <p className="text-xs font-semibold text-slate-600">Sin transacciones en este filtro</p>
          </div>
        ) : (
          <>
            {/* Header fijo (no hace scroll) */}
            <div className="shrink-0 h-12" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
              <table className="w-full h-full" style={{ tableLayout: 'fixed', marginRight: '15px', width: 'calc(100% - 15px)' }}>
                <colgroup>
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-left text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-left text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
                      Negocio
                    </th>
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-left text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
                      Concepto
                    </th>
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-right text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-right text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
                      <button
                        onClick={() => alternarOrden('puntos')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-amber-300 transition-colors outline-none focus:outline-none uppercase group"
                      >
                        <span>Puntos</span>
                        {orden?.columna === 'puntos' ? (
                          orden.direccion === 'desc' ? (
                            <ChevronDown className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-400" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-white/80 group-hover:text-amber-300" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-right text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
                      <button
                        onClick={() => alternarOrden('fecha')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-amber-300 transition-colors ml-auto outline-none focus:outline-none uppercase group"
                      >
                        <span>Fecha</span>
                        {orden?.columna === 'fecha' ? (
                          orden.direccion === 'desc' ? (
                            <ChevronDown className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-400" />
                          ) : (
                            <ChevronUp className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-400" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-white/80 group-hover:text-amber-300" />
                        )}
                      </button>
                    </th>
                  </tr>
                </thead>
              </table>
            </div>
            {/* Body con scroll */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '13%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <tbody>
                  {(() => {
                    let mesAnterior = '';
                    let filaIdx = 0;
                    return txOrdenadas.map((tx) => {
                      const esGanado = tx.tipo === 'compra';
                      const mesActual = obtenerMesAnio(tx.fecha);
                      const mostrarSeparador = mostrarAgrupado && mesActual !== mesAnterior;
                      mesAnterior = mesActual;
                      const bgFila = filaIdx % 2 === 0 ? 'bg-white' : 'bg-slate-100';
                      filaIdx++;
                      return (
                        <Fragment key={tx.id}>
                          {mostrarSeparador && (
                            <tr>
                              <td colSpan={6} className="px-0 py-0">
                                <div
                                  className="flex items-center justify-end gap-2.5 px-5 py-2"
                                  style={{ background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)' }}
                                >
                                  <Calendar className="w-3.5 h-3.5 text-slate-600" strokeWidth={2.5} />
                                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    {mesActual.charAt(0).toUpperCase() + mesActual.slice(1)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr
                            data-testid={`fila-historial-${tx.id}`}
                            className={`${bgFila} hover:bg-slate-200 cursor-pointer border-b border-slate-300`}
                            onClick={() => onClickTransaccion?.(tx)}
                          >
                            {/* ── TIPO ── */}
                            <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-lg flex items-center justify-center shrink-0"
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
                                <span className={`text-sm lg:text-[11px] 2xl:text-sm font-bold ${esGanado ? 'text-emerald-700' : 'text-rose-600'}`}>
                                  {esGanado ? 'Ganados' : 'Canjeados'}
                                </span>
                              </div>
                            </td>
                            {/* ── NEGOCIO (con logo) ── */}
                            <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2">
                              <div className="flex items-center gap-2">
                                {tx.negocioLogo ? (
                                  <img
                                    src={tx.negocioLogo}
                                    alt={tx.negocioNombre}
                                    className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <Store className="w-4 h-4 text-slate-600 shrink-0" />
                                )}
                                <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">
                                  {tx.negocioNombre}
                                </span>
                              </div>
                            </td>
                            {/* ── CONCEPTO ── */}
                            <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2">
                              <span className="text-sm lg:text-xs 2xl:text-sm text-slate-600 font-medium block truncate">
                                {tx.descripcion.includes('||') ? (
                                  <>
                                    <strong className="text-slate-800">{tx.descripcion.split('||')[1]}</strong>
                                    {tx.descripcion.split('||')[2]}
                                  </>
                                ) : tx.descripcion}
                              </span>
                              {tx.cuponTipo && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold bg-emerald-100 text-emerald-700 mt-0.5">
                                  <Ticket className="w-3 h-3" strokeWidth={2.5} />
                                  {formatearCupon(tx.cuponTipo, tx.cuponValor ?? null, tx.cuponValorTexto)}
                                </span>
                              )}
                            </td>
                            {/* ── MONTO ── */}
                            <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2 text-right">
                              {tx.montoCompra !== undefined && tx.montoCompra > 0 ? (
                                <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-600">
                                  {"$"}{tx.montoCompra.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                            {/* ── PUNTOS ── */}
                            <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2 text-right">
                              {tx.puntos === 0 ? (
                                <span className="text-xs text-slate-300">—</span>
                              ) : (
                              <span
                                className={`text-sm lg:text-xs 2xl:text-sm font-bold ${esGanado ? 'text-emerald-700' : 'text-rose-600'}`}
                              >
                                {esGanado ? '+' : '-'}
                                {Math.abs(tx.puntos).toLocaleString()}
                              </span>
                              )}
                            </td>
                            {/* ── FECHA ── */}
                            <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2 text-right">
                              <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                                {formatearFechaTabla(tx.fecha)}
                              </span>
                            </td>
                          </tr>
                        </Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}