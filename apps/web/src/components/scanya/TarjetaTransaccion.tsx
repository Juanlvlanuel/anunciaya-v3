/**
 * TarjetaTransaccion.tsx
 * =======================
 * Card individual para mostrar una transacción en el historial de ScanYA.
 * Se adapta según el tipo de usuario (dueño, gerente, empleado).
 *
 * Ubicación: apps/web/src/components/scanya/TarjetaTransaccion.tsx
 *
 * ESTRUCTURA:
 *   HEADER  → Cliente (avatar, nombre, teléfono) + Badge nivel/revocada
 *   BODY    → Monto, puntos, métodos de pago, concepto, cupón
 *   FOOTER  → Metadata (registrado por, sucursal, fecha, ticket, orden)
 *
 * REVOCADAS:
 *   - Badge rojo "Revocada" reemplaza badge de nivel
 *   - Opacidad 60% en todo el card
 *   - Monto y puntos tachados en gris
 *   - Oculta desglose de pagos y cupón
 */

import { useState } from 'react';
import {
  User,
  Phone,
  Coins,
  Banknote,
  CreditCard,
  Smartphone,
  Clock,
  MapPin,
  Camera,
  Award,
  Shield,
  ShieldCheck,
  Users,

  ShoppingBag,
  Ticket,
  XCircle,
} from 'lucide-react';
import type { TransaccionScanYA } from '@/types/scanya';
import Tooltip from '@/components/ui/Tooltip';
import { ModalImagenes } from '@/components/ui/ModalImagenes';

// =============================================================================
// TIPOS
// =============================================================================

interface TarjetaTransaccionProps {
  transaccion: TransaccionScanYA;
  onVerFoto?: (url: string) => void;
  onContactarCliente?: (clienteTelefono: string, clienteNombre: string) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

const formatearMoneda = (valor: number): string => {
  return valor.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  });
};

const formatearTelefono = (telefono: string): string => {
  const limpio = telefono.replace(/\D/g, '');
  if (limpio.length === 10) {
    return `+52 ${limpio.slice(0, 3)} ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
  }
  if (limpio.length === 12 && limpio.startsWith('52')) {
    return `+${limpio.slice(0, 2)} ${limpio.slice(2, 5)} ${limpio.slice(5, 8)} ${limpio.slice(8)}`;
  }
  return telefono;
};

const formatearFecha = (fechaStr: string): string => {
  const fecha = new Date(fechaStr);
  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const ayer = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);
  const fechaSinHora = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

  const hora = fecha.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  if (fechaSinHora.getTime() === hoy.getTime()) {
    return `Hoy, ${hora}`;
  } else if (fechaSinHora.getTime() === ayer.getTime()) {
    return `Ayer, ${hora}`;
  } else {
    const dia = fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    return `${dia}, ${hora}`;
  }
};

const getColorNivel = (nivel: string): string => {
  switch (nivel.toLowerCase()) {
    case 'oro': return '#F59E0B';
    case 'plata': return '#94A3B8';
    default: return '#CD7F32';
  }
};

const getEmojiNivel = (nivel: string): string => {
  switch (nivel.toLowerCase()) {
    case 'oro': return '🥇';
    case 'plata': return '🥈';
    default: return '🥉';
  }
};

const acortarNombre = (nombreCompleto: string): string => {
  const partes = nombreCompleto.trim().split(/\s+/);
  if (partes.length <= 2) return nombreCompleto;
  return `${partes[0]} ${partes[partes.length - 2]}`;
};

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

/** Badge de nivel (Bronce/Plata/Oro) */
function BadgeNivel({ nivel }: { nivel: string }) {
  const color = getColorNivel(nivel);
  return (
    <div
      className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1 px-2 lg:px-1.5 2xl:px-2 py-1 rounded-full shrink-0"
      style={{ background: `${color}20`, border: `1px solid ${color}40` }}
    >
      <span className="text-sm lg:text-xs 2xl:text-sm">{getEmojiNivel(nivel)}</span>
      <span className="text-xs font-medium capitalize" style={{ color }}>{nivel}</span>
    </div>
  );
}

/** Badge de transacción revocada */
function BadgeRevocada() {
  return (
    <div className="flex items-center gap-1 px-2 lg:px-1.5 2xl:px-2 py-1 rounded-full shrink-0 bg-red-500/20 border border-red-500/40">
      <XCircle className="w-3 h-3 text-red-400" />
      <span className="text-xs font-semibold text-red-400">Revocada</span>
    </div>
  );
}

/** Desglose de métodos de pago */
function DesglosePagos({ transaccion }: { transaccion: TransaccionScanYA }) {
  const { montoEfectivo, montoTarjeta, montoTransferencia } = transaccion;
  const metodos: { icono: React.ReactNode; texto: string; color: string }[] = [];

  if (montoEfectivo > 0) {
    metodos.push({
      icono: <Banknote className="w-3.5 h-3.5" />,
      texto: formatearMoneda(montoEfectivo),
      color: '#10B981',
    });
  }
  if (montoTarjeta > 0) {
    metodos.push({
      icono: <CreditCard className="w-3.5 h-3.5" />,
      texto: formatearMoneda(montoTarjeta),
      color: '#3B82F6',
    });
  }
  if (montoTransferencia > 0) {
    metodos.push({
      icono: <Smartphone className="w-3.5 h-3.5" />,
      texto: formatearMoneda(montoTransferencia),
      color: '#8B5CF6',
    });
  }

  if (metodos.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 lg:gap-1.5 2xl:gap-2 text-sm lg:text-[11px] 2xl:text-sm">
      {metodos.map((m, i) => (
        <div key={i} className="flex items-center gap-1" style={{ color: m.color }}>
          {m.icono}
          <span>{m.texto}</span>
          {i < metodos.length - 1 && <span className="text-[#475569] mx-0.5">+</span>}
        </div>
      ))}
    </div>
  );
}

/** Info de quien registró la transacción */
function RegistradoPor({ transaccion }: { transaccion: TransaccionScanYA }) {
  const { registradoPor, registradoPorTipo, sucursalNombre, negocioNombre } = transaccion;

  const config = {
    empleado: { icono: Users, color: '#3B82F6', label: 'Empleado' },
    gerente: { icono: ShieldCheck, color: '#8B5CF6', label: 'Gerente' },
    dueno: { icono: Shield, color: '#F59E0B', label: 'Dueño' },
  }[registradoPorTipo] || { icono: Users, color: '#94A3B8', label: '' };

  const Icono = config.icono;
  const ubicacion = registradoPorTipo === 'dueno' ? negocioNombre : `Suc: ${sucursalNombre}`;

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5 text-[#94A3B8]">
        <Icono className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" style={{ color: config.color }} />
        <span className="text-sm lg:text-[11px] 2xl:text-sm">{acortarNombre(registradoPor)}</span>
        <span
          className="text-[10px] lg:text-[9px] 2xl:text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ background: `${config.color}20`, color: config.color }}
        >
          {config.label}
        </span>
      </div>
      <div className="flex items-center gap-1 text-[#64748B] text-xs lg:text-[10px] 2xl:text-xs">
        <MapPin className="w-3 h-3" />
        <span className="truncate max-w-40">{ubicacion}</span>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function TarjetaTransaccion({
  transaccion,
  onVerFoto,
  onContactarCliente,
}: TarjetaTransaccionProps) {
  const [modalAvatarAbierto, setModalAvatarAbierto] = useState(false);

  const esRevocada = transaccion.estado === 'cancelado';

  return (
    <div
      className={`rounded-xl lg:rounded-lg 2xl:rounded-xl p-4 lg:p-3 2xl:p-4 ${esRevocada ? 'opacity-60' : ''}`}
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: esRevocada ? '2px solid rgba(239, 68, 68, 0.3)' : '2px solid rgba(255, 255, 255, 0.15)',
      }}
    >
      {/* ================================================================== */}
      {/* HEADER: Cliente + Badge                                           */}
      {/* ================================================================== */}
      <div className="flex items-start justify-between gap-3 lg:gap-2 2xl:gap-3">
        {/* Avatar + Info cliente */}
        <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 min-w-0 flex-1">
          {transaccion.clienteAvatarUrl ? (
            <img
              src={transaccion.clienteAvatarUrl}
              alt={transaccion.clienteNombre}
              onClick={() => setModalAvatarAbierto(true)}
              className="w-11 h-11 lg:w-8 lg:h-8 2xl:w-11 2xl:h-11 rounded-full object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
            />
          ) : (
            <div
              className="w-11 h-11 lg:w-8 lg:h-8 2xl:w-11 2xl:h-11 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(59, 130, 246, 0.2)' }}
            >
              <User className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#3B82F6]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-white font-semibold truncate text-base lg:text-sm 2xl:text-base ${esRevocada ? 'line-through text-[#94A3B8]' : ''}`}>
              {transaccion.clienteNombre}
            </p>
            {transaccion.clienteTelefono && (
              <div className="flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5">
                <Phone className="w-3 h-3 text-[#64748B]" />
                <span className="text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm">
                  {formatearTelefono(transaccion.clienteTelefono)}
                </span>
                {!esRevocada && (
                  <Tooltip text="Contactar por ChatYA" position="top">
                    <button
                      onClick={() => onContactarCliente?.(transaccion.clienteTelefono!, transaccion.clienteNombre)}
                      className="cursor-pointer hover:scale-110 transition-transform"
                    >
                      <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="w-auto h-6 lg:w-auto lg:h-4 2xl:w-auto 2xl:h-7" />
                    </button>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Badge: Nivel o Revocada */}
        {esRevocada ? (
          <BadgeRevocada />
        ) : (
          <BadgeNivel nivel={transaccion.clienteNivel} />
        )}
      </div>

      {/* ================================================================== */}
      {/* BODY: Monto, Puntos, Pagos, Concepto, Cupón                       */}
      {/* ================================================================== */}
      <div className="mt-3 lg:mt-2.5 2xl:mt-3 pt-3 lg:pt-2.5 2xl:pt-3 border-t border-white/10">
        {/* Fila principal: Monto + Puntos */}
        <div className="flex items-center justify-between mb-2 lg:mb-1.5 2xl:mb-2">
          <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
            <Coins className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#F59E0B]" />
            <span className={`text-xl lg:text-lg 2xl:text-xl font-bold ${esRevocada ? 'line-through text-[#64748B]' : 'text-white'}`}>
              {formatearMoneda(transaccion.montoTotal)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5">
            <span className={`font-bold text-lg lg:text-base 2xl:text-lg ${esRevocada ? 'line-through text-[#64748B]' : 'text-[#10B981]'}`}>
              +{transaccion.puntosOtorgados.toLocaleString()}
            </span>
            <span className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">pts</span>
            {!esRevocada && transaccion.multiplicadorAplicado > 1 && (
              <span
                className="text-xs lg:text-[10px] 2xl:text-xs px-1.5 py-0.5 rounded font-medium ml-0.5"
                style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' }}
              >
                x{transaccion.multiplicadorAplicado}
              </span>
            )}
          </div>
        </div>

        {/* Desglose métodos de pago (oculto si revocada) */}
        {!esRevocada && <DesglosePagos transaccion={transaccion} />}

        {/* Concepto (si existe y no revocada) */}
        {!esRevocada && transaccion.concepto && (
          <div className="flex items-center gap-1.5 mt-2 lg:mt-1.5 2xl:mt-2 text-[#94A3B8]">
            <ShoppingBag className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-[#60A5FA] shrink-0" />
            <span className="text-sm lg:text-[11px] 2xl:text-sm truncate">{transaccion.concepto}</span>
          </div>
        )}

        {/* Cupón (si existe y no revocada) */}
        {!esRevocada && transaccion.cuponCodigo && (
          <div
            className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 px-2.5 lg:px-2 2xl:px-2.5 py-1.5 rounded-lg mt-2 lg:mt-1.5 2xl:mt-2"
            style={{ background: 'rgba(139, 92, 246, 0.15)' }}
          >
            <Ticket className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#8B5CF6]" />
            <span className="text-[#8B5CF6] text-sm lg:text-[11px] 2xl:text-sm font-medium">
              {transaccion.cuponCodigo}
            </span>
            {transaccion.cuponDescuento && (
              <span className="text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm ml-auto">
                -{formatearMoneda(transaccion.cuponDescuento)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* FOOTER: Metadata                                                  */}
      {/* ================================================================== */}
      <div className="mt-3 lg:mt-2.5 2xl:mt-3 pt-3 lg:pt-2.5 2xl:pt-3 border-t border-white/10">
        {/* Fila 1: Registrado por + Fecha */}
        <div className="flex items-start justify-between gap-3">
          <RegistradoPor transaccion={transaccion} />
          <div className="flex items-center gap-1 text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm shrink-0">
            <Clock className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
            <span>{formatearFecha(transaccion.createdAt)}</span>
          </div>
        </div>

        {/* Fila 2: Foto ticket + Número orden (si existen) */}
        {(transaccion.fotoTicketUrl || transaccion.numeroOrden) && (
          <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3 mt-2.5 lg:mt-2 2xl:mt-2.5">
            {transaccion.fotoTicketUrl && (
              <button
                onClick={() => onVerFoto?.(transaccion.fotoTicketUrl!)}
                className="flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5 px-2.5 lg:px-2 2xl:px-2.5 py-1.5 lg:py-1 2xl:py-1.5 rounded-lg text-sm lg:text-[11px] 2xl:text-sm cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6' }}
              >
                <Camera className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                <span>Ver ticket</span>
              </button>
            )}
            {transaccion.numeroOrden && (
              <div className="flex items-center gap-1 text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm">
                <Award className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                <span>#{transaccion.numeroOrden}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* MODAL AVATAR                                                      */}
      {/* ================================================================== */}
      {transaccion.clienteAvatarUrl && (
        <ModalImagenes
          images={[transaccion.clienteAvatarUrl]}
          initialIndex={0}
          isOpen={modalAvatarAbierto}
          onClose={() => setModalAvatarAbierto(false)}
        />
      )}
    </div>
  );
}

export default TarjetaTransaccion;