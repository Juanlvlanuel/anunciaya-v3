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

import { Ticket, Store, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import type { CuponCliente } from '../../../../services/misCuponesService';

// =============================================================================
// HELPERS
// =============================================================================

function getBadgeEstado(estado: string): { label: string; bg: string; border: string; text: string; icono: React.ComponentType<{ className?: string }> } {
    switch (estado) {
        case 'activo':
            return { label: 'Activo', bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', icono: CheckCircle };
        case 'usado':
            return { label: 'Usado', bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-600', icono: CheckCircle };
        case 'expirado':
            return { label: 'Expirado', bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', icono: Clock };
        case 'revocado':
            return { label: 'Revocado', bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', icono: XCircle };
        default:
            return { label: estado, bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-600', icono: AlertTriangle };
    }
}

function formatearTipoValor(tipo: string, valor: string | null): string {
    switch (tipo) {
        case 'porcentaje': return `${valor}% desc.`;
        case 'monto_fijo': return `$${valor} desc.`;
        case '2x1': return '2×1';
        case '3x2': return '3×2';
        case 'envio_gratis': return 'Envío gratis';
        default: return valor || 'Promoción';
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
        <div className={`absolute top-2 right-2 lg:top-3 lg:right-3 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-lg flex items-center gap-1 lg:gap-1.5 ${badge.bg} border ${badge.border}`}>
            <BadgeIcono className={`w-3 h-3 lg:w-3.5 lg:h-3.5 ${badge.text}`} />
            <span className={`text-[10px] lg:text-[11px] font-bold ${badge.text}`}>{badge.label}</span>
        </div>
    );

    // Badge tipo
    const badgeTipo = (
        <div className="flex items-center gap-1 px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '1px solid #a7f3d0' }}>
            <Ticket className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-emerald-600" strokeWidth={2.5} />
            <span className="text-xs lg:text-xs 2xl:text-[13px] font-bold text-emerald-800">
                {formatearTipoValor(cupon.tipo, cupon.valor)}
            </span>
        </div>
    );

    return (
        <>
            {/* ── MOBILE ── */}
            <button
                data-testid={`cupon-${cupon.cuponId}`}
                onClick={() => onVerDetalle(cupon)}
                className={`lg:hidden group bg-white rounded-2xl overflow-hidden flex flex-row cursor-pointer ${opacityClass} ${destacado ? 'animate-[glow_1.5s_ease-in-out_2]' : ''}`}
                style={{
                    border: destacado ? '2px solid #10b981' : '1px solid #e2e8f0',
                    height: '185px',
                    boxShadow: destacado ? '0 0 20px rgba(16,185,129,0.4)' : '0 4px 16px rgba(0,0,0,0.06)',
                }}
            >
                {/* Imagen izquierda */}
                <div className="w-36 shrink-0 relative overflow-hidden">
                    {imagenCupon}
                    <div className="absolute inset-y-0 right-0 w-8 pointer-events-none" style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.3), transparent)' }} />
                    {badgeEstadoEl}
                </div>

                {/* Línea separadora */}
                <div className="w-1 shrink-0 self-stretch" style={{ background: 'linear-gradient(to bottom, #10b981, #000000)' }} />

                {/* Info derecha */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0 overflow-hidden text-left">
                    <div className="min-w-0">
                        <h4 className="text-lg font-bold text-slate-800 truncate leading-tight">{cupon.titulo}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            {cupon.negocioLogo ? (
                                <img src={cupon.negocioLogo} alt={cupon.negocioNombre} className="w-6 h-6 rounded-full object-cover shrink-0 border border-slate-200" />
                            ) : (
                                <Store className="w-5 h-5 text-emerald-600 shrink-0" strokeWidth={2.5} />
                            )}
                            <p className="text-sm text-slate-700 font-bold truncate">{cupon.negocioNombre}</p>
                        </div>
                        {cupon.descripcion && (
                            <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-snug">{cupon.descripcion}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        {badgeTipo}
                        {cupon.fechaFin && (
                            <span className="text-[11px] font-semibold text-slate-600">
                                Vence {new Date(cupon.fechaFin).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            </span>
                        )}
                    </div>

                    {esActivo && (
                        <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)', color: '#a7f3d0' }}>
                            Ver cupón
                        </div>
                    )}
                </div>
            </button>

            {/* ── DESKTOP ── */}
            <button
                data-testid={`cupon-desktop-${cupon.cuponId}`}
                onClick={() => onVerDetalle(cupon)}
                className={`hidden lg:flex group bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl overflow-hidden flex-col cursor-pointer hover:shadow-lg ${opacityClass}`}
                style={{ border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
            >
                {/* Imagen */}
                <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    {imagenCupon}
                    {badgeEstadoEl}
                </div>

                {/* Info */}
                <div className="p-3 lg:p-2.5 2xl:p-3 flex flex-col gap-2 lg:gap-1.5 2xl:gap-2 flex-1">
                    <h4 className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-800 truncate">{cupon.titulo}</h4>
                    <div className="flex items-center gap-1.5">
                        {cupon.negocioLogo ? (
                            <img src={cupon.negocioLogo} alt={cupon.negocioNombre} className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 rounded-full object-cover shrink-0 border border-slate-200" />
                        ) : (
                            <Store className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
                        )}
                        <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-700 font-semibold truncate">{cupon.negocioNombre}</p>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                        {badgeTipo}
                    </div>
                    {esActivo && (
                        <div className="w-full flex items-center justify-center gap-1.5 py-2 lg:py-1.5 2xl:py-2 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-xs lg:text-[11px] 2xl:text-xs cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #064e3b, #065f46)', color: '#a7f3d0' }}>
                            Ver cupón
                        </div>
                    )}
                </div>
            </button>
        </>
    );
}
