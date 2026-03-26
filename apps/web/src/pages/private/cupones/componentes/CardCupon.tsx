/**
 * CardCupon.tsx
 * ==============
 * Card de cupón para vista cliente (Mis Cupones).
 * Mismo patrón que CardRecompensaCliente.tsx
 *
 * Móvil: layout horizontal (imagen izq + info der)
 * Desktop: layout vertical (imagen arriba + info abajo)
 *
 * UBICACIÓN: apps/web/src/pages/private/cupones/componentes/CardCupon.tsx
 */

import { Ticket, Store, CheckCircle, XCircle, Clock, AlertTriangle, Calendar, Gift } from 'lucide-react';
import type { CuponCliente } from '../../../../services/misCuponesService';

// =============================================================================
// HELPERS
// =============================================================================

function getBadgeEstado(estado: string): { label: string; clases: string; icono: React.ComponentType<{ className?: string }> } {
    switch (estado) {
        case 'activo':
            return { label: 'Activo', clases: 'bg-emerald-600 text-white', icono: CheckCircle };
        case 'usado':
            return { label: 'Usado', clases: 'bg-slate-200 text-slate-700', icono: CheckCircle };
        case 'expirado':
            return { label: 'Expirado', clases: 'bg-amber-100 text-amber-700', icono: Clock };
        case 'revocado':
            return { label: 'Revocado', clases: 'bg-red-100 text-red-700', icono: XCircle };
        default:
            return { label: estado, clases: 'bg-slate-200 text-slate-700', icono: AlertTriangle };
    }
}

function formatearTipoValor(tipo: string, valor: string | null): string {
    switch (tipo) {
        case 'porcentaje': return `${valor}% desc.`;
        case 'monto_fijo': return `$${valor} desc.`;
        case '2x1': return '2×1';
        case '3x2': return '3×2';
        case 'envio_gratis': return 'Envío Gratis';
        default: return valor || 'Promo';
    }
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function CardCupon({
    cupon,
    onVerDetalle,
    destacado = false,
}: {
    cupon: CuponCliente;
    onVerDetalle: (cupon: CuponCliente) => void;
    destacado?: boolean;
}) {
    const badge = getBadgeEstado(cupon.estado);
    const BadgeIcono = badge.icono;
    const esActivo = cupon.estado === 'activo';
    const opacityClass = !esActivo ? 'opacity-60' : '';

    // Imagen
    const imagenCupon = cupon.imagen ? (
        <img src={cupon.imagen} alt={cupon.titulo} className="w-full h-full object-cover" />
    ) : (
        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)' }}>
            <Ticket className="w-10 h-10 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 text-emerald-400/40" />
        </div>
    );

    // Badge estado
    const badgeEstadoEl = (
        <div className={`absolute top-2 right-2 lg:top-2.5 lg:right-2.5 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-lg flex items-center gap-1 ${badge.clases}`}>
            <BadgeIcono className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
            <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold">{badge.label}</span>
        </div>
    );

    return (
        <>
            {/* ── MOBILE ── */}
            <div
                data-testid={`cupon-${cupon.cuponId}`}
                onClick={!esActivo ? () => onVerDetalle(cupon) : undefined}
                className={`lg:hidden bg-white rounded-2xl overflow-hidden flex flex-row ${opacityClass} ${!esActivo ? 'cursor-pointer' : ''} ${destacado ? 'animate-[glow_1.5s_ease-in-out_2]' : ''}`}
                style={{
                    border: destacado ? '2px solid #10b981' : '2px solid #cbd5e1',
                    height: '185px',
                    boxShadow: destacado ? '0 0 20px rgba(16,185,129,0.4)' : '0 4px 16px rgba(0,0,0,0.06)',
                }}
            >
                {/* Imagen izquierda + logo arriba-izq + badge abajo-izq */}
                <div className="w-36 shrink-0 relative overflow-hidden">
                    {imagenCupon}
                    <div className="absolute inset-y-0 right-0 w-8 pointer-events-none" style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.3), transparent)' }} />
                    {/* Logo negocio — arriba izquierda */}
                    <div className="absolute top-2 left-2">
                        {cupon.negocioLogo ? (
                            <img src={cupon.negocioLogo} alt={cupon.negocioNombre} className="w-12 h-12 rounded-full object-cover border-2 border-white/50 shadow-md" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center border-2 border-white/30">
                                <Store className="w-6 h-6 text-white" strokeWidth={2.5} />
                            </div>
                        )}
                    </div>
                    {/* Badge estado — abajo izquierda */}
                    <div className={`absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-lg flex items-center gap-1 ${badge.clases}`}>
                        <BadgeIcono className="w-3 h-3" />
                        <span className="text-[12px] font-bold">{badge.label}</span>
                    </div>
                </div>

                {/* Línea separadora */}
                <div className="w-1 shrink-0 self-stretch" style={{ background: 'linear-gradient(to bottom, #10b981, #000000)' }} />

                {/* Info derecha */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0 overflow-hidden text-left">
                    <div>
                        <h4 className="text-xl font-extrabold text-slate-800 truncate leading-tight">{formatearTipoValor(cupon.tipo, cupon.valor)}</h4>
                        <p className="text-sm font-semibold text-slate-600 truncate">{cupon.titulo}</p>
                    </div>

                    {/* Metadata vertical */}
                    <div className="flex flex-col gap-0.5">
                        {cupon.fechaFin && (
                            <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-slate-600">
                                <Calendar className="w-4 h-4 shrink-0" />
                                {new Date(cupon.fechaFin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                        {cupon.motivo && (
                            <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-slate-600">
                                <Gift className="w-4 h-4 shrink-0" />
                                {cupon.motivo}
                            </span>
                        )}
                        {cupon.limiteUsosPorUsuario && cupon.limiteUsosPorUsuario > 1 && (
                            <span className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-blue-700">
                                <CheckCircle className="w-4 h-4 shrink-0" />
                                {cupon.usosRealizados} de {cupon.limiteUsosPorUsuario} usos
                            </span>
                        )}
                    </div>

                    {esActivo && (
                        <button
                            data-testid={`btn-ver-cupon-${cupon.cuponId}`}
                            onClick={() => onVerDetalle(cupon)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm cursor-pointer hover:text-white"
                            style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)', color: '#a7f3d0', backgroundSize: '100% 100%' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #022c22, #064e3b)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #064e3b, #065f46)'; }}>
                            Ver cupón
                        </button>
                    )}
                </div>
            </div>

            {/* ── DESKTOP ── */}
            <div
                data-testid={`cupon-desktop-${cupon.cuponId}`}
                onClick={!esActivo ? () => onVerDetalle(cupon) : undefined}
                className={`hidden lg:flex group bg-white rounded-2xl overflow-hidden flex-col ${opacityClass} ${!esActivo ? 'cursor-pointer' : ''}`}
                style={{ border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
            >
                {/* Imagen + negocio overlay */}
                <div className="w-full h-32 2xl:h-40 relative overflow-hidden">
                    {imagenCupon}
                    <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
                    {badgeEstadoEl}
                    {/* Negocio overlay */}
                    <div className="absolute bottom-2.5 left-3.5 right-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {cupon.negocioLogo ? (
                                <img src={cupon.negocioLogo} alt={cupon.negocioNombre} className="w-11 h-11 2xl:w-12 2xl:h-12 rounded-full object-cover shrink-0 border-2 border-white" style={{ boxShadow: '0 0 25px rgba(255,255,255,1), 0 0 10px rgba(255,255,255,0.9), 0 0 4px rgba(255,255,255,0.7)' }} />
                            ) : (
                                <div className="w-11 h-11 2xl:w-12 2xl:h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                                    <Store className="w-5 h-5 2xl:w-6 2xl:h-6 text-white" strokeWidth={2.5} />
                                </div>
                            )}
                            <p className="text-lg lg:text-base 2xl:text-lg font-extrabold text-white truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{cupon.negocioNombre}</p>
                        </div>
                    </div>
                </div>

                {/* Línea separadora gradiente */}
                <div className="h-1.5 w-full shrink-0" style={{ background: 'linear-gradient(to right, #10b981, #000000)' }} />

                {/* Info */}
                <div className="p-3.5 2xl:p-4 flex flex-col gap-2 2xl:gap-2.5 flex-1 text-left">
                    <div>
                        <h4 className="text-lg lg:text-base 2xl:text-lg font-extrabold text-slate-800 truncate">{formatearTipoValor(cupon.tipo, cupon.valor)}</h4>
                        <p className="text-sm lg:text-[13px] 2xl:text-sm font-semibold text-slate-600 truncate">{cupon.titulo}</p>
                    </div>

                    {/* Metadata vertical */}
                    <div className="flex flex-col gap-1 mt-auto">
                        {cupon.fechaFin && (
                            <span className="inline-flex items-center gap-1.5 text-sm lg:text-[13px] 2xl:text-sm font-semibold text-slate-600">
                                <Calendar className="w-4 h-4 shrink-0" />
                                Vence {new Date(cupon.fechaFin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                        {cupon.motivo && (
                            <span className="inline-flex items-center gap-1.5 text-sm lg:text-[13px] 2xl:text-sm font-semibold text-slate-600">
                                <Gift className="w-4 h-4 shrink-0" />
                                {cupon.motivo}
                            </span>
                        )}
                        {cupon.limiteUsosPorUsuario && cupon.limiteUsosPorUsuario > 1 && (
                            <span className="inline-flex items-center gap-1.5 text-sm lg:text-[13px] 2xl:text-sm font-semibold text-blue-700">
                                <CheckCircle className="w-4 h-4 shrink-0" />
                                {cupon.usosRealizados} de {cupon.limiteUsosPorUsuario} usos
                            </span>
                        )}
                    </div>

                    {esActivo && (
                        <button
                            data-testid={`btn-ver-cupon-desktop-${cupon.cuponId}`}
                            onClick={() => onVerDetalle(cupon)}
                            className="w-full flex items-center justify-center gap-1.5 py-2.5 lg:py-2 2xl:py-2.5 rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-sm 2xl:text-base cursor-pointer hover:text-white"
                            style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)', color: '#a7f3d0' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #022c22, #064e3b)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #064e3b, #065f46)'; }}>
                            Ver cupón
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
