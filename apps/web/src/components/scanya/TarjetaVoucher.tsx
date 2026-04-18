/**
 * TarjetaVoucher.tsx
 * ===================
 * Card compacto para vouchers en ScanYA. Tema dark.
 * Info mínima en el card — detalle completo en modal (futuro).
 *
 * Layout: [Avatar] [Nombre + Recompensa] [Puntos + Estado/Fecha] [>]
 *
 * Ubicación: apps/web/src/components/scanya/TarjetaVoucher.tsx
 */

import {
  User,
  Gift,
  Coins,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  ChevronRight,
} from 'lucide-react';
import type { VoucherPendiente, VoucherCompleto } from '@/types/scanya';
import { obtenerIniciales } from '../../utils/obtenerIniciales';

// =============================================================================
// TIPOS
// =============================================================================

type VoucherData = VoucherPendiente | VoucherCompleto;

interface TarjetaVoucherProps {
  voucher: VoucherData;
  onValidar?: (voucher: VoucherData) => void;
  onClick?: (voucher: VoucherData) => void;
  mostrarBotonValidar?: boolean;
  mostrarEstado?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

const esCompleto = (v: VoucherData): v is VoucherCompleto => 'usuarioNombre' in v;

const getNombre = (v: VoucherData): string => esCompleto(v) ? v.usuarioNombre : v.clienteNombre;
const getAvatar = (v: VoucherData): string | null => esCompleto(v) ? (v.usuarioAvatarUrl || null) : (v.clienteAvatarUrl || null);


const formatearExpiracion = (fechaStr: string): { texto: string; color: string } => {
  const fecha = new Date(fechaStr);
  const ahora = new Date();
  const diffDias = Math.ceil((fecha.getTime() - ahora.getTime()) / 86400000);

  if (diffDias < 0) return { texto: 'Vencido', color: '#EF4444' };
  if (diffDias === 0) return { texto: 'Vence hoy', color: '#F59E0B' };
  if (diffDias === 1) return { texto: 'Vence mañana', color: '#F59E0B' };
  if (diffDias <= 7) return { texto: `${diffDias} días`, color: '#F59E0B' };
  return { texto: fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }), color: '#94A3B8' };
};

const getEstadoConfig = (estado: string) => {
  switch (estado) {
    case 'usado': return { label: 'Canjeado', color: '#34D399', icon: CheckCircle };
    case 'vencido': return { label: 'Vencido', color: '#EF4444', icon: XCircle };
    case 'cancelado': return { label: 'Cancelado', color: '#64748B', icon: Ban };
    default: return { label: 'Pendiente', color: '#F59E0B', icon: Clock };
  }
};

// =============================================================================
// COLORES
// =============================================================================

const C = {
  cardBg: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.12)',
  text: '#F1F5F9',
  muted: '#94A3B8',
  dim: '#64748B',
  blue: '#60A5FA',
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function TarjetaVoucher({
  voucher,
  onValidar,
  onClick,
  mostrarBotonValidar = false,
  mostrarEstado = false,
}: TarjetaVoucherProps) {
  const nombre = getNombre(voucher);
  const avatar = getAvatar(voucher);
  const estado = esCompleto(voucher) ? voucher.estado : 'pendiente';
  const estadoConfig = getEstadoConfig(estado);
  const expiracion = formatearExpiracion(voucher.expiraAt);
  const esVencido = expiracion.texto === 'Vencido';
  const EstadoIcono = estadoConfig.icon;

  return (
    <div
      data-testid={`tarjeta-voucher-${voucher.id}`}
      className="rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden"
      style={{ background: C.cardBg, border: `2px solid ${C.border}` }}
    >
      {/* Card principal */}
      <button
        type="button"
        onClick={() => onClick?.(voucher)}
        className="w-full text-left cursor-pointer px-4 py-3 lg:px-3 lg:py-2.5 2xl:px-4 2xl:py-3 flex items-center gap-3 lg:gap-2.5 2xl:gap-3 hover:bg-white/4"
      >
        {/* Avatar */}
        {avatar ? (
          <img src={avatar} alt={nombre} className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full object-cover shrink-0" />
        ) : (
          <div
            className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(96,165,250,0.2)' }}
          >
            <span className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: C.blue }}>
              {obtenerIniciales(nombre)}
            </span>
          </div>
        )}

        {/* Nombre + Recompensa */}
        <div className="flex-1 min-w-0">
          <p className="text-base lg:text-sm 2xl:text-base font-bold truncate" style={{ color: C.text }}>
            {nombre}
          </p>
          <div className="flex items-center gap-1.5">
            <Gift className="w-3.5 h-3.5 shrink-0" style={{ color: C.dim }} />
            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium truncate" style={{ color: C.muted }}>
              {voucher.recompensaNombre}
            </p>
          </div>
        </div>

        {/* Derecha: Estado/Fecha */}
        <div className="flex flex-col items-end shrink-0">
          {mostrarEstado ? (
            <div className="flex items-center gap-1">
              <EstadoIcono className="w-3.5 h-3.5" style={{ color: estadoConfig.color }} />
              <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold" style={{ color: estadoConfig.color }}>
                {estadoConfig.label}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" style={{ color: expiracion.color }} />
              <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: expiracion.color }}>
                {expiracion.texto}
              </span>
            </div>
          )}
        </div>

        <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0" style={{ color: C.dim }} />
      </button>

      {/* Botón Canjear — dentro del card */}
      {mostrarBotonValidar && onValidar && !esVencido && (
        <button
          onClick={() => onValidar(voucher)}
          data-testid={`btn-canjear-${voucher.id}`}
          className="w-full py-2.5 lg:py-2 2xl:py-2.5 flex items-center justify-center gap-2 font-bold text-sm lg:text-[11px] 2xl:text-sm cursor-pointer hover:bg-white/4"
          style={{ color: C.blue, borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <CheckCircle className="w-4 h-4" />
          Canjear Voucher
        </button>
      )}

      {/* Voucher vencido — dentro del card */}
      {mostrarBotonValidar && esVencido && (
        <div
          className="w-full py-2.5 lg:py-2 2xl:py-2.5 text-center font-bold text-sm lg:text-[11px] 2xl:text-sm"
          style={{ color: '#EF4444', borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          Voucher vencido
        </div>
      )}
    </div>
  );
}

export default TarjetaVoucher;
