/**
 * TablaHistorialVouchers.tsx
 * ===========================
 * Historial de vouchers del usuario.
 * Móvil: lista agrupada por estado (pendientes primero)
 * Desktop: tabla clásica con columnas
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/TablaHistorialVouchers.tsx
 */

import { useState } from 'react';
import {
  Ticket,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Store,
  Gift,
  ChevronRight,
  Inbox,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { Voucher, EstadoVoucher } from '../../../../types/cardya';

// =============================================================================
// TIPOS DE ORDENAMIENTO
// =============================================================================

type ColumnaOrdenVoucher = 'puntos' | 'createdAt' | 'expiraAt';
type DireccionOrden = 'asc' | 'desc';

interface EstadoOrden {
  columna: ColumnaOrdenVoucher;
  direccion: DireccionOrden;
}

// =============================================================================
// CONFIGURACIÓN DE ESTADOS
// =============================================================================

const ESTADO_CONFIG: Record<
  EstadoVoucher,
  { label: string; color: string; bg: string; border: string; icono: typeof Clock }
> = {
  pendiente: {
    label: 'Pendiente',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    icono: Clock,
  },
  usado: {
    label: 'Usado',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icono: CheckCircle,
  },
  cancelado: {
    label: 'Cancelado',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icono: XCircle,
  },
  expirado: {
    label: 'Expirado',
    color: '#6b7280',
    bg: '#f9fafb',
    border: '#e5e7eb',
    icono: AlertTriangle,
  },
};

// =============================================================================
// HELPERS
// =============================================================================

const formatearFecha = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatearFechaCorta = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  });
};

/** Devuelve label + fecha según estado del voucher */
function fechaDinamica(voucher: Voucher): { label: string; fecha: string } {
  switch (voucher.estado) {
    case 'pendiente':
      return { label: 'Vence', fecha: formatearFechaCorta(voucher.expiraAt) };
    case 'usado':
      return { label: 'Usado', fecha: formatearFechaCorta(voucher.usadoAt || voucher.createdAt) };
    case 'cancelado':
      return { label: 'Cancelado', fecha: formatearFechaCorta(voucher.createdAt) };
    case 'expirado':
      return { label: 'Expiró', fecha: formatearFechaCorta(voucher.expiraAt) };
  }
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function TablaHistorialVouchers({
  vouchers,
  onClickVoucher,
  stickyTop = 0,
  negocioFiltro: negocioFiltroExterno,
}: {
  vouchers: Voucher[];
  onClickVoucher?: (voucher: Voucher) => void;
  stickyTop?: number;
  negocioFiltro?: string;
}) {
  const [filtroActivo, setFiltroActivo] = useState<EstadoVoucher | 'todos'>('todos');
  
  // Filtro de negocio viene del padre (header)
  const negocioFiltro = negocioFiltroExterno ?? 'todos';

  // Ordenamiento: null = default (fecha canje desc)
  const [orden, setOrden] = useState<EstadoOrden | null>(null);

  /** Alterna ordenamiento: desc → asc → null (default) */
  const alternarOrden = (columna: ColumnaOrdenVoucher) => {
    setOrden((prev) => {
      if (!prev || prev.columna !== columna) return { columna, direccion: 'desc' };
      if (prev.direccion === 'desc') return { columna, direccion: 'asc' };
      return null;
    });
  };

  // Filtrado combinado (estado + negocio)
  const vouchersFiltrados = vouchers.filter((v) => {
    const pasaEstado = filtroActivo === 'todos' || v.estado === filtroActivo;
    const pasaNegocio = negocioFiltro === 'todos' || v.negocioNombre === negocioFiltro;
    return pasaEstado && pasaNegocio;
  });

  // Contar por estado (respeta filtro de negocio)
  const baseParaConteo = negocioFiltro === 'todos'
    ? vouchers
    : vouchers.filter((v) => v.negocioNombre === negocioFiltro);
  const conteos: Record<EstadoVoucher | 'todos', number> = {
    todos: baseParaConteo.length,
    pendiente: baseParaConteo.filter((v) => v.estado === 'pendiente').length,
    usado: baseParaConteo.filter((v) => v.estado === 'usado').length,
    cancelado: baseParaConteo.filter((v) => v.estado === 'cancelado').length,
    expirado: baseParaConteo.filter((v) => v.estado === 'expirado').length,
  };

  // Config para chip "Todos"
  const FILTROS_CHIPS: { id: EstadoVoucher | 'todos'; label: string; color: string; bg: string; border: string }[] = [
    { id: 'todos', label: 'Todos', color: '#334155', bg: '#f1f5f9', border: '#cbd5e1' },
    { id: 'pendiente', label: 'Pendientes', color: ESTADO_CONFIG.pendiente.color, bg: ESTADO_CONFIG.pendiente.bg, border: ESTADO_CONFIG.pendiente.border },
    { id: 'usado', label: 'Usados', color: ESTADO_CONFIG.usado.color, bg: ESTADO_CONFIG.usado.bg, border: ESTADO_CONFIG.usado.border },
    { id: 'cancelado', label: 'Cancelados', color: ESTADO_CONFIG.cancelado.color, bg: ESTADO_CONFIG.cancelado.bg, border: ESTADO_CONFIG.cancelado.border },
    { id: 'expirado', label: 'Expirados', color: ESTADO_CONFIG.expirado.color, bg: ESTADO_CONFIG.expirado.bg, border: ESTADO_CONFIG.expirado.border },
  ];

  if (vouchers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Inbox className="w-12 h-12 mb-3 text-slate-300" strokeWidth={1.5} />
        <p className="text-sm font-semibold text-slate-500">Sin vouchers aún</p>
        <p className="text-xs text-slate-400 mt-1">Canjea recompensas para ver tus vouchers aquí</p>
      </div>
    );
  }

  // Vouchers ordenados según estado de orden
  const vouchersOrdenados = [...vouchersFiltrados].sort((a, b) => {
    if (!orden) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

    const dir = orden.direccion === 'asc' ? 1 : -1;
    switch (orden.columna) {
      case 'puntos':
        return (a.puntosUsados - b.puntosUsados) * dir;
      case 'createdAt':
        return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      case 'expiraAt':
        return (new Date(a.expiraAt).getTime() - new Date(b.expiraAt).getTime()) * dir;
    }
  });

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE: Filtros chips + cards horizontales (< lg)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden">

        {/* Chips de filtro + select negocio - sticky */}
        <div
          className="sticky z-10 flex items-center gap-2 pb-2.5 pt-2 mb-2 -mx-4 px-4"
          style={{ top: `${stickyTop}px`, background: '#f8fafc' }}
        >
          <div className="flex gap-2 flex-1 overflow-x-auto cardya-tabs items-center">
            {FILTROS_CHIPS.map((chip) => {
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
            <div className="w-px h-5 bg-slate-300 shrink-0" />

            {/* ── Chips de ordenamiento ── */}
            {([
              { col: 'puntos' as ColumnaOrdenVoucher, label: 'Puntos' },
              { col: 'createdAt' as ColumnaOrdenVoucher, label: 'Canje' },
              { col: 'expiraAt' as ColumnaOrdenVoucher, label: 'Vence' },
            ]).map(({ col, label }) => {
              const activo = orden?.columna === col;
              return (
                <button
                  key={`orden-${col}`}
                  onClick={() => alternarOrden(col)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer outline-none focus:outline-none"
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

        {/* Lista de cards */}
        {vouchersOrdenados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Inbox className="w-10 h-10 mb-2 text-slate-300" strokeWidth={1.5} />
            <p className="text-xs font-semibold text-slate-400">Sin vouchers en este filtro</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {vouchersOrdenados.map((voucher) => {
              const estadoConf = ESTADO_CONFIG[voucher.estado];
              const IconoEstado = estadoConf.icono;

              return (
                <div
                  key={voucher.id}
                  onClick={() => onClickVoucher?.(voucher)}
                  className="group bg-white rounded-2xl overflow-hidden flex flex-row cursor-pointer active:bg-slate-50 transition-all duration-300"
                  style={{
                    border: '1px solid #e2e8f0',
                    height: '125px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                  }}
                >
                  {/* Imagen izquierda */}
                  <div className="w-24 shrink-0 relative overflow-hidden">
                    {voucher.recompensaImagen ? (
                      <img
                        src={voucher.recompensaImagen}
                        alt={voucher.recompensaNombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                      >
                        <Gift className="w-7 h-7 text-slate-500" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Línea separadora vertical con gradiente */}
                  <div
                    className="w-1 shrink-0 self-stretch"
                    style={{ background: 'linear-gradient(to bottom, #DD7C07, #000000)' }}
                  />

                  {/* Info derecha */}
                  <div className="flex-1 px-3 py-2.5 flex flex-col justify-between min-w-0 overflow-hidden">
                    {/* Top: Nombre + Badge estado */}
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="text-base font-bold text-slate-800 truncate leading-tight flex-1">
                          {voucher.recompensaNombre}
                        </h4>
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg shrink-0"
                          style={{
                            background: estadoConf.bg,
                            border: `1px solid ${estadoConf.border}`,
                          }}
                        >
                          <IconoEstado className="w-3.5 h-3.5" style={{ color: estadoConf.color }} strokeWidth={2.5} />
                          <span className="text-[11px] font-bold" style={{ color: estadoConf.color }}>
                            {estadoConf.label}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" strokeWidth={2.5} />
                        <span className="text-sm text-amber-700 font-bold truncate">
                          {voucher.negocioNombre}
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Puntos + Fecha dinámica */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Ticket className="w-4 h-4 text-slate-400" strokeWidth={2} />
                        <span className="text-base font-black text-slate-700">
                          {voucher.puntosUsados.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">pts</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">
                          {fechaDinamica(voucher).label} {fechaDinamica(voucher).fecha}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300" strokeWidth={2} />
                      </div>
                    </div>
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
        <div
          className="flex items-center gap-2 px-5 2xl:px-6 py-3 shrink-0"
          style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}
        >
          <div className="flex gap-2 flex-1">
            {FILTROS_CHIPS.map((chip) => {
              const activo = filtroActivo === chip.id;
              const cantidad = conteos[chip.id];
              if (cantidad === 0 && chip.id !== 'todos') return null;

              return (
                <button
                  key={chip.id}
                  onClick={() => setFiltroActivo(chip.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer outline-none focus:outline-none"
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
          </div>
        </div>

        {/* Contenido con scroll */}
        {vouchersOrdenados.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Inbox className="w-10 h-10 mb-2 text-slate-300" strokeWidth={1.5} />
            <p className="text-xs font-semibold text-slate-400">Sin vouchers en este filtro</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-1">
                <tr style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                  <th className="px-4 py-3 text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
                    Recompensa
                  </th>
                  <th className="px-4 py-3 text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
                    Negocio
                  </th>
                  <th className="px-4 py-3 text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
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
                  <th className="px-4 py-3 text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
                    <button
                      onClick={() => alternarOrden('createdAt')}
                      className="inline-flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors outline-none focus:outline-none uppercase"
                    >
                      <span>Fecha Canje</span>
                      {orden?.columna === 'createdAt' ? (
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
                  <th className="px-4 py-3 text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
                    <button
                      onClick={() => alternarOrden('expiraAt')}
                      className="inline-flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors outline-none focus:outline-none uppercase"
                    >
                      <span>Vencimiento</span>
                      {orden?.columna === 'expiraAt' ? (
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
                  <th className="px-4 py-3 text-[11px] 2xl:text-xs font-bold text-white/70 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200">
                {vouchersOrdenados.map((voucher) => {
                  const config = ESTADO_CONFIG[voucher.estado];
                  const Icono = config.icono;

                  return (
                    <tr
                      key={voucher.id}
                      onClick={() => onClickVoucher?.(voucher)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-slate-100">
                            {voucher.recompensaImagen ? (
                              <img
                                src={voucher.recompensaImagen}
                                alt={voucher.recompensaNombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Gift className="w-4 h-4 text-slate-400" strokeWidth={2} />
                            )}
                          </div>
                          <span className="text-xs 2xl:text-sm font-bold text-slate-800 truncate max-w-[140px]">
                            {voucher.recompensaNombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs 2xl:text-sm text-slate-600 font-medium">
                        {voucher.negocioNombre}
                      </td>
                      <td className="px-4 py-3 text-xs 2xl:text-sm font-bold text-slate-700">
                        {voucher.puntosUsados.toLocaleString()} pts
                      </td>
                      <td className="px-4 py-3 text-xs 2xl:text-sm text-slate-500">
                        {formatearFecha(voucher.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs 2xl:text-sm text-slate-500">
                        {formatearFecha(voucher.expiraAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 text-[11px] 2xl:text-xs font-bold px-2.5 py-1 rounded-lg"
                          style={{
                            background: config.bg,
                            color: config.color,
                            border: `1px solid ${config.border}`,
                          }}
                        >
                          <Icono className="w-3 h-3" strokeWidth={2.5} />
                          {config.label}
                        </span>
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