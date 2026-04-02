/**
 * TarjetaTransaccion.tsx
 * =======================
 * Card compacto para historial de ScanYA. Tema dark.
 * Info mínima — el detalle completo va en un modal.
 *
 * VENTA: avatar + nombre + badge nivel | monto + puntos + fecha
 * CUPÓN GRATIS: ícono ticket + "Cupón canjeado" + concepto | badge + fecha
 *
 * Ubicación: apps/web/src/components/scanya/TarjetaTransaccion.tsx
 */

import {
  User,
  Clock,
  Ticket,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import type { TransaccionScanYA } from '@/types/scanya';

// =============================================================================
// TIPOS
// =============================================================================

interface TarjetaTransaccionProps {
  transaccion: TransaccionScanYA;
  onClick?: () => void;
  nivelesActivos?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatearMoneda = (valor: number): string =>
  valor.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

const formatearFecha = (fechaStr: string): string => {
  const fecha = new Date(fechaStr);
  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const ayer = new Date(hoy.getTime() - 86400000);
  const fechaSinHora = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const hora = fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });

  if (fechaSinHora.getTime() === hoy.getTime()) return `Hoy, ${hora}`;
  if (fechaSinHora.getTime() === ayer.getTime()) return `Ayer, ${hora}`;
  return `${fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}, ${hora}`;
};

const getNivel = (nivel: string) => {
  switch (nivel.toLowerCase()) {
    case 'oro': return { bg: 'rgba(245,158,11,0.2)', text: '#F59E0B', emoji: '🥇' };
    case 'plata': return { bg: 'rgba(148,163,184,0.2)', text: '#94A3B8', emoji: '🥈' };
    default: return { bg: 'rgba(205,127,50,0.2)', text: '#CD7F32', emoji: '🥉' };
  }
};

const obtenerIniciales = (nombre: string): string => {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length >= 2) return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
};

// =============================================================================
// COLORES
// =============================================================================

const C = {
  cardBg: 'rgba(255,255,255,0.06)',
  cardHover: 'rgba(255,255,255,0.10)',
  border: 'rgba(255,255,255,0.12)',
  borderRevocada: 'rgba(239,68,68,0.3)',
  text: '#F1F5F9',
  muted: '#94A3B8',
  dim: '#64748B',
  blue: '#60A5FA',
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function TarjetaTransaccion({ transaccion, onClick, nivelesActivos = true }: TarjetaTransaccionProps) {
  const esRevocada = transaccion.estado === 'cancelado';
  const esCuponGratis = transaccion.montoTotal === 0 && !!transaccion.cuponCodigo;
  const nivel = getNivel(transaccion.clienteNivel);

  // =========================================================================
  // CUPÓN GRATIS
  // =========================================================================
  if (esCuponGratis && !esRevocada) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid={`tarjeta-cupon-${transaccion.id}`}
        className="w-full text-left rounded-xl lg:rounded-lg 2xl:rounded-xl cursor-pointer px-4 py-3 lg:px-3 lg:py-2.5 2xl:px-4 2xl:py-3 flex items-center gap-3 lg:gap-2.5 2xl:gap-3"
        style={{ background: C.cardBg, border: `2px solid ${C.border}` }}
        onMouseEnter={(e) => { e.currentTarget.style.background = C.cardHover; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = C.cardBg; }}
      >
        {/* Ícono ticket */}
        <div
          className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(96,165,250,0.15)' }}
        >
          <Ticket className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" style={{ color: C.blue }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-base lg:text-sm 2xl:text-base font-bold truncate" style={{ color: C.text }}>
            {transaccion.clienteNombre}
          </p>
          <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium truncate" style={{ color: C.muted }}>
            {transaccion.concepto || 'Cupón canjeado'}
          </p>
        </div>

        {/* Derecha: Badge + Fecha */}
        <div className="flex flex-col items-end shrink-0 gap-1">
          <span className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: C.blue }}>Gratis</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" style={{ color: C.dim }} />
            <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: C.dim }}>
              {formatearFecha(transaccion.createdAt)}
            </span>
          </div>
        </div>

        <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0" style={{ color: C.dim }} />
      </button>
    );
  }

  // =========================================================================
  // VENTA
  // =========================================================================
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`tarjeta-venta-${transaccion.id}`}
      className={`w-full text-left rounded-xl lg:rounded-lg 2xl:rounded-xl cursor-pointer px-4 py-3 lg:px-3 lg:py-2.5 2xl:px-4 2xl:py-3 flex items-center gap-3 lg:gap-2.5 2xl:gap-3 ${esRevocada ? 'opacity-60' : ''}`}
      style={{ background: C.cardBg, border: `2px solid ${esRevocada ? C.borderRevocada : C.border}` }}
      onMouseEnter={(e) => { if (!esRevocada) e.currentTarget.style.background = C.cardHover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = C.cardBg; }}
    >
      {/* Avatar */}
      {transaccion.clienteAvatarUrl ? (
        <img
          src={transaccion.clienteAvatarUrl}
          alt={transaccion.clienteNombre}
          className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(96,165,250,0.2)' }}
        >
          <span className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: C.blue }}>
            {obtenerIniciales(transaccion.clienteNombre)}
          </span>
        </div>
      )}

      {/* Nombre + Nivel + Concepto */}
      <div className="flex-1 min-w-0">
        <p className={`text-base lg:text-sm 2xl:text-base font-bold truncate ${esRevocada ? 'line-through' : ''}`} style={{ color: esRevocada ? C.dim : C.text }}>
          {transaccion.clienteNombre}
        </p>
        <div className="flex items-center gap-1.5">
          {!esRevocada ? (
            nivelesActivos ? (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ background: nivel.bg }}>
                <span className="text-sm lg:text-[11px] 2xl:text-sm">{nivel.emoji}</span>
                <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold capitalize" style={{ color: nivel.text }}>{transaccion.clienteNivel}</span>
              </div>
            ) : null
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.2)' }}>
              <XCircle className="w-3 h-3 text-red-400" />
              <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-red-400">Revocada</span>
            </div>
          )}
        </div>
      </div>

      {/* Monto + Concepto + Fecha */}
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        <span className={`text-xl lg:text-lg 2xl:text-xl font-bold ${esRevocada ? 'line-through' : ''}`} style={{ color: esRevocada ? C.dim : C.text }}>
          {formatearMoneda(transaccion.montoTotal)}
        </span>
        {transaccion.concepto && (
          <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium truncate max-w-32 lg:max-w-28 2xl:max-w-36" style={{ color: C.muted }}>
            {transaccion.concepto}
          </p>
        )}
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" style={{ color: C.dim }} />
          <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: C.dim }}>
            {formatearFecha(transaccion.createdAt)}
          </span>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0" style={{ color: C.dim }} />
    </button>
  );
}

export default TarjetaTransaccion;
