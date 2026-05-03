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

type ColumnaOrdenVoucher = 'puntos' | 'usadoAt' | 'expiraAt';
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
  { label: string; clases: string; icono: typeof Clock }
> = {
  pendiente: {
    label: 'Pendiente',
    clases: 'bg-amber-100 text-amber-700',
    icono: Clock,
  },
  usado: {
    label: 'Usado',
    clases: 'bg-green-100 text-green-700',
    icono: CheckCircle,
  },
  cancelado: {
    label: 'Cancelado',
    clases: 'bg-red-100 text-red-700',
    icono: XCircle,
  },
  expirado: {
    label: 'Expirado',
    clases: 'bg-slate-200 text-slate-600',
    icono: AlertTriangle,
  },
};

// =============================================================================
// HELPERS
// =============================================================================

const formatearFecha = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  const texto = fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return texto.replace(/ [a-z]/g, (c) => c.toUpperCase());
};

const formatearFechaCorta = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  const texto = fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  });
  return texto.replace(/\b[a-z]/g, (c) => c.toUpperCase());
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
  stickyTop: _stickyTop = 0,
  negocioFiltro: negocioFiltroExterno,
  onClickImagen,
  filtroEstado = 'todos',
}: {
  vouchers: Voucher[];
  onClickVoucher?: (voucher: Voucher) => void;
  onClickImagen?: (url: string) => void;
  stickyTop?: number;
  negocioFiltro?: string;
  filtroEstado?: string;
}) {
  const filtroActivo = filtroEstado as EstadoVoucher | 'todos';

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

  if (vouchers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 rounded-full bg-linear-to-br from-amber-100 to-amber-50 flex items-center justify-center ring-8 ring-amber-50 mb-6">
          <Ticket className="w-12 h-12 lg:w-16 lg:h-16 text-amber-400" strokeWidth={1.5} />
        </div>
        <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Sin vouchers aún</h3>
        <p className="text-base lg:text-lg font-medium text-gray-600 mt-1 text-center">Canjea recompensas<br />para ver tus vouchers aquí</p>
      </div>
    );
  }

  const ORDEN_ESTADO: Record<EstadoVoucher, number> = {
    pendiente: 0,
    usado: 1,
    expirado: 2,
    cancelado: 3,
  };

  // Vouchers ordenados según estado de orden
  const vouchersOrdenados = [...vouchersFiltrados].sort((a, b) => {
    if (!orden) {
      return ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado];
    }

    const dir = orden.direccion === 'asc' ? 1 : -1;
    switch (orden.columna) {
      case 'puntos':
        return (a.puntosUsados - b.puntosUsados) * dir;
      case 'usadoAt':
        return ((a.usadoAt ? new Date(a.usadoAt).getTime() : 0) - (b.usadoAt ? new Date(b.usadoAt).getTime() : 0)) * dir;
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

        {/* Lista de cards */}
        {vouchersOrdenados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-600">
            <Inbox className="w-10 h-10 mb-2 text-slate-300" strokeWidth={1.5} />
            <p className="text-xs font-semibold text-slate-600">Sin vouchers en este filtro</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {vouchersOrdenados.map((voucher) => {
              const estadoConf = ESTADO_CONFIG[voucher.estado];


              return (
                <div
                  key={voucher.id}
                  onClick={() => onClickVoucher?.(voucher)}
                  className="group bg-white rounded-2xl overflow-hidden flex flex-row cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl"
                  style={{ height: '185px' }}
                >
                  {/* Imagen izquierda */}
                  <div className="w-36 shrink-0 relative overflow-hidden">
                    {voucher.recompensaImagen ? (
                      <img
                        src={voucher.recompensaImagen}
                        alt={voucher.recompensaNombre}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                      >
                        <Gift className="w-10 h-10 text-slate-600" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>

                  {/* Línea separadora vertical con gradiente */}
                  <div
                    className="w-1 shrink-0 self-stretch"
                    style={{ background: 'linear-gradient(to bottom, #DD7C07, #000000)' }}
                  />

                  {/* Info derecha */}
                  <div className="flex-1 p-3 flex flex-col justify-between min-w-0 overflow-hidden">
                    {/* Top: Logo + Negocio → Nombre recompensa */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {voucher.negocioLogo ? (
                          <img
                            src={voucher.negocioLogo}
                            alt={voucher.negocioNombre}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <Store className="w-8 h-8 shrink-0 text-amber-600" strokeWidth={2} />
                        )}
                        <p className="text-lg font-bold text-slate-700 truncate leading-tight">
                          {voucher.negocioNombre}
                        </p>
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 truncate leading-tight mt-1">
                        {voucher.recompensaNombre}
                      </h4>
                    </div>

                    {/* Middle: Puntos + Badge estado */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Ticket className="w-4 h-4 text-slate-600" strokeWidth={2} />
                        {voucher.puntosUsados > 0 ? (
                          <>
                            <span className="text-2xl font-black text-slate-800 leading-none">
                              {voucher.puntosUsados.toLocaleString()}
                            </span>
                            <span className="text-sm text-slate-600 font-medium">pts</span>
                          </>
                        ) : (
                          <span data-testid={`gratis-${voucher.id}`} className="text-lg font-bold text-emerald-600">Gratis</span>
                        )}
                      </div>
                      <span
                        className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full shrink-0 text-sm lg:text-[11px] 2xl:text-sm font-bold ${estadoConf.clases}`}
                      >
                        {estadoConf.label}
                      </span>
                    </div>

                    {/* Bottom: Fecha + Botón */}
                    <div>
                      <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 mb-1.5">
                        {fechaDinamica(voucher).label}:{' '}
                        <strong>{fechaDinamica(voucher).fecha}</strong>
                      </p>
                      <div
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm lg:text-[11px] 2xl:text-sm text-white"
                        style={{ background: '#1e293b' }}
                      >
                        <span>Ver detalles</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
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
        data-testid="tabla-vouchers-desktop"
        className="hidden lg:flex lg:flex-col rounded-xl overflow-hidden bg-white border-2 border-slate-300"
        style={{
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          height: 'calc(100vh - 300px)',
          minHeight: '400px',
        }}
      >
        {/* Contenido con scroll */}
        {vouchersOrdenados.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
            <Inbox className="w-10 h-10 mb-2 text-slate-300" strokeWidth={1.5} />
            <p className="text-xs font-semibold text-slate-600">Sin vouchers en este filtro</p>
          </div>
        ) : (
          <>
            {/* Header fijo (no hace scroll) */}
            <div className="shrink-0 h-12" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
              <table className="w-full h-full" style={{ tableLayout: 'fixed', marginRight: '15px', width: 'calc(100% - 15px)' }}>
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-left text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
                      Recompensa
                    </th>
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-left text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
                      Negocio
                    </th>
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-left text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
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
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-left text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
                      <button
                        onClick={() => alternarOrden('usadoAt')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-amber-300 transition-colors outline-none focus:outline-none uppercase group"
                      >
                        <span>Fecha Uso</span>
                        {orden?.columna === 'usadoAt' ? (
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
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-left text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
                      <button
                        onClick={() => alternarOrden('expiraAt')}
                        className="inline-flex items-center gap-1 cursor-pointer hover:text-amber-300 transition-colors outline-none focus:outline-none uppercase group"
                      >
                        <span>Vencimiento</span>
                        {orden?.columna === 'expiraAt' ? (
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
                    <th className="px-4 lg:px-3 2xl:px-5 py-2 text-left text-[11px] 2xl:text-sm font-semibold text-white/70 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
              </table>
            </div>
            {/* Body con scroll */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '14%' }} />
                </colgroup>
                <tbody>
                {(() => {
                  return vouchersOrdenados.map((voucher, idx) => {
                    const config = ESTADO_CONFIG[voucher.estado];
                    const bgFila = idx % 2 === 0 ? 'bg-white' : 'bg-slate-100';

                    return (
                        <tr
                          key={voucher.id}
                          data-testid={`fila-voucher-${voucher.id}`}
                          onClick={() => onClickVoucher?.(voucher)}
                          className={`${bgFila} hover:bg-slate-200 cursor-pointer border-b border-slate-300`}
                        >
                          <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-slate-200 cursor-pointer hover:scale-110 transition-transform"
                                onClick={(e) => { if (voucher.recompensaImagen) { e.stopPropagation(); onClickImagen?.(voucher.recompensaImagen); } }}
                              >
                                {voucher.recompensaImagen ? (
                                  <img
                                    src={voucher.recompensaImagen}
                                    alt={voucher.recompensaNombre}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Gift className="w-4 h-4 text-slate-600" strokeWidth={2} />
                                )}
                              </div>
                              <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">
                                {voucher.recompensaNombre}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2">
                            <div className="flex items-center gap-2">
                              {voucher.negocioLogo ? (
                                <img
                                  src={voucher.negocioLogo}
                                  alt={voucher.negocioNombre}
                                  className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <Store className="w-4 h-4 text-slate-600 shrink-0" />
                              )}
                              <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">
                                {voucher.negocioNombre}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2 text-sm lg:text-xs 2xl:text-sm font-bold">
                            {voucher.puntosUsados > 0 ? (
                              <span className="text-slate-600">{voucher.puntosUsados.toLocaleString()} pts</span>
                            ) : (
                              <span data-testid={`gratis-desktop-${voucher.id}`} className="text-emerald-600">Gratis</span>
                            )}
                          </td>
                          <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                            {voucher.usadoAt ? formatearFecha(voucher.usadoAt) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                            {formatearFecha(voucher.expiraAt)}
                          </td>
                          <td className="px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2 text-left">
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold ${config.clases}`}
                            >
                              {config.label}
                            </span>
                          </td>
                        </tr>
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