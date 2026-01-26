/**
 * TarjetaVoucher.tsx
 * ===================
 * Card individual para mostrar un voucher (pendiente, usado, vencido, etc).
 * 
 * Versión flexible que soporta:
 * - VoucherPendiente (flujo de canje)
 * - VoucherCompleto (gestión administrativa)
 * 
 * Ubicación: apps/web/src/components/scanya/TarjetaVoucher.tsx
 */

import { useState } from 'react';
import {
  User,
  Phone,
  Gift,
  Coins,
  Calendar,
  CheckCircle,
  MessageCircle,
  MapPin,
} from 'lucide-react';
import type { VoucherPendiente, VoucherCompleto } from '@/types/scanya';
import Tooltip from '@/components/ui/Tooltip';
import { ModalImagenes } from '@/components/ui/ModalImagenes';

// =============================================================================
// TIPOS
// =============================================================================

type VoucherData = VoucherPendiente | VoucherCompleto;

interface TarjetaVoucherProps {
  voucher: VoucherData;
  
  // Acciones opcionales
  onValidar?: (voucher: VoucherData) => void;
  onContactar?: (telefono: string) => void;
  
  // Configuración visual
  mostrarBotonValidar?: boolean;
  mostrarSucursal?: boolean;
  mostrarEstado?: boolean;
  mostrarEmpleadoQueCanjeo?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Verifica si es VoucherCompleto
 */
const esVoucherCompleto = (voucher: VoucherData): voucher is VoucherCompleto => {
  return 'usuarioNombre' in voucher;
};

/**
 * Obtiene el nombre del cliente
 */
const obtenerNombreCliente = (voucher: VoucherData): string => {
  if (esVoucherCompleto(voucher)) {
    return voucher.usuarioNombre;
  }
  return voucher.clienteNombre;
};

/**
 * Obtiene el teléfono del cliente
 */
const obtenerTelefono = (voucher: VoucherData): string => {
  if (esVoucherCompleto(voucher)) {
    return voucher.usuarioTelefono;
  }
  return voucher.clienteTelefono;
};

/**
 * Obtiene el avatar del cliente
 */
const obtenerAvatarUrl = (voucher: VoucherData): string | null => {
  if (esVoucherCompleto(voucher)) {
    return voucher.usuarioAvatarUrl || null;
  }
  return voucher.clienteAvatarUrl || null;
};

/**
 * Formatea la fecha de vencimiento
 */
const formatearFechaVencimiento = (
  fechaStr: string
): { texto: string; esCercano: boolean; esVencido: boolean } => {
  const fecha = new Date(fechaStr);
  const ahora = new Date();
  const diffMs = fecha.getTime() - ahora.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return { texto: 'Vencido', esCercano: false, esVencido: true };
  }

  if (diffDias === 0) {
    return { texto: 'Vence hoy', esCercano: true, esVencido: false };
  }

  if (diffDias === 1) {
    return { texto: 'Vence mañana', esCercano: true, esVencido: false };
  }

  if (diffDias <= 7) {
    return { texto: `Vence en ${diffDias} días`, esCercano: true, esVencido: false };
  }

  const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return {
    texto: `Válido hasta ${fecha.toLocaleDateString('es-MX', opciones)}`,
    esCercano: false,
    esVencido: false,
  };
};

/**
 * Formatea fecha simple: 2024-12-31 → 31 Dic
 */
const formatearFechaSimple = (fechaStr: string): string => {
  const fecha = new Date(fechaStr);
  const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return fecha.toLocaleDateString('es-MX', opciones);
};

/**
 * Formatea el teléfono: +526441234567 → +52 644 123 4567
 */
const formatearTelefono = (telefono: string): string => {
  if (telefono.startsWith('+52') && telefono.length === 13) {
    return `+52 ${telefono.slice(3, 6)} ${telefono.slice(6, 9)} ${telefono.slice(9)}`;
  }
  return telefono;
};

/**
 * Obtiene el color del badge según estado
 */
const obtenerColorEstado = (
  estado: string
): { bg: string; text: string; border: string } => {
  switch (estado) {
    case 'usado':
      return {
        bg: 'rgba(16, 185, 129, 0.15)',
        text: '#10B981',
        border: 'rgba(16, 185, 129, 0.3)',
      };
    case 'vencido':
      return {
        bg: 'rgba(239, 68, 68, 0.15)',
        text: '#EF4444',
        border: 'rgba(239, 68, 68, 0.3)',
      };
    case 'cancelado':
      return {
        bg: 'rgba(100, 116, 139, 0.15)',
        text: '#64748B',
        border: 'rgba(100, 116, 139, 0.3)',
      };
    case 'pendiente':
    default:
      return {
        bg: 'rgba(245, 158, 11, 0.15)',
        text: '#F59E0B',
        border: 'rgba(245, 158, 11, 0.3)',
      };
  }
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function TarjetaVoucher({
  voucher,
  onValidar,
  onContactar,
  mostrarBotonValidar = false,
  mostrarSucursal = false,
  mostrarEstado = false,
  mostrarEmpleadoQueCanjeo = false,
}: TarjetaVoucherProps) {
  const [modalAvatarAbierto, setModalAvatarAbierto] = useState(false);
  const nombreCliente = obtenerNombreCliente(voucher);
  const telefono = obtenerTelefono(voucher);
  const avatarUrl = obtenerAvatarUrl(voucher);
  const fechaInfo = formatearFechaVencimiento(voucher.expiraAt);
  const esCompleto = esVoucherCompleto(voucher);
  const estado = esCompleto ? voucher.estado : 'pendiente';
  const colorEstado = obtenerColorEstado(estado);

  return (
    <div
      className="rounded-xl lg:rounded-md 2xl:rounded-lg p-4 lg:p-2.5 2xl:p-4 relative"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: `2px solid ${mostrarEstado ? colorEstado.border : 'rgba(255, 255, 255, 0.2)'}`,
      }}
    >
      {/* ================================================================== */}
      {/* BADGE ESTADO - Esquina superior derecha */}
      {/* ================================================================== */}
      {mostrarEstado && (
        <div
          className="absolute top-4 right-4 px-2 lg:px-1.5 2xl:px-2 py-1 lg:py-0.5 2xl:py-1 rounded-md lg:rounded 2xl:rounded-md text-xs lg:text-[10px] 2xl:text-xs font-medium capitalize"
          style={{
            background: colorEstado.bg,
            color: colorEstado.text,
            border: `1px solid ${colorEstado.border}`,
          }}
        >
          {estado}
        </div>
      )}

      {/* ================================================================== */}
      {/* FILA 1: Cliente + Botón ChatYA */}
      {/* ================================================================== */}
      <div className="flex items-start gap-3 lg:gap-1.5 2xl:gap-3 mb-3 lg:mb-1.5 2xl:mb-3">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={nombreCliente}
            onClick={() => setModalAvatarAbierto(true)}
            className="w-10 h-10 lg:w-7 lg:h-7 2xl:w-10 2xl:h-10 rounded-full object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
          />
        ) : (
          <div
            className="w-10 h-10 lg:w-7 lg:h-7 2xl:w-10 2xl:h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(59, 130, 246, 0.2)' }}
          >
            <User className="w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-5 2xl:h-5 text-[#3B82F6]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-white font-medium truncate text-base lg:text-sm 2xl:text-base">{nombreCliente}</p>
          <div className="flex items-center gap-2 lg:gap-1 2xl:gap-1.5">
            <p className="text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm flex items-center gap-1 lg:gap-0.5 2xl:gap-1">
              <Phone className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3" />
              {formatearTelefono(telefono)}
            </p>
            <Tooltip text="Contactar por ChatYA" position="top">
              <button
                onClick={() => onContactar?.(telefono)}
                className="flex items-center justify-center w-6 h-6 lg:w-4.5 lg:h-4.5 2xl:w-6 2xl:h-6 rounded-full transition-all cursor-pointer hover:scale-110"
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#3B82F6',
                }}
              >
                <MessageCircle className="w-3.5 h-3.5 lg:w-2.5 lg:h-2.5 2xl:w-3.5 2xl:h-3.5" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SEPARADOR */}
      {/* ================================================================== */}
      <div className="border-t border-white/10 my-3 lg:my-1.5 2xl:my-3" />

      {/* ================================================================== */}
      {/* FILA 2: Recompensa */}
      {/* ================================================================== */}
      <div
        className="flex items-start gap-3 lg:gap-1.5 2xl:gap-3 p-3 lg:p-2 2xl:p-3 rounded-lg lg:rounded-md 2xl:rounded-lg mb-3 lg:mb-1.5 2xl:mb-3"
        style={{ background: 'rgba(139, 92, 246, 0.15)' }}
      >
        <div
          className="w-10 h-10 lg:w-7 lg:h-7 2xl:w-10 2xl:h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(139, 92, 246, 0.3)' }}
        >
          <Gift className="w-5 h-5 lg:w-3.5 lg:h-3.5 2xl:w-5 2xl:h-5 text-[#8B5CF6]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white font-medium text-base lg:text-sm 2xl:text-base">{voucher.recompensaNombre}</p>
          {voucher.recompensaDescripcion && (
            <p className="text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm mt-0.5 lg:mt-0 2xl:mt-0.5 line-clamp-2">
              {voucher.recompensaDescripcion}
            </p>
          )}
          <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1 mt-2 lg:mt-1 2xl:mt-2">
            <Coins className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#F59E0B]" />
            <span className="text-[#F59E0B] text-sm lg:text-[11px] 2xl:text-sm font-medium">
              {voucher.puntosUsados.toLocaleString()} pts
            </span>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* INFORMACIÓN ADICIONAL */}
      {/* ================================================================== */}
      <div className="space-y-2 lg:space-y-1 2xl:space-y-2 text-sm lg:text-[11px] 2xl:text-sm mb-4 lg:mb-2 2xl:mb-2">
        {/* Sucursal (opcional - NO para usados) */}
        {mostrarSucursal && esCompleto && estado !== 'usado' && (
          <div className="flex items-center gap-2 lg:gap-1 2xl:gap-1.5 text-[#94A3B8]">
            <MapPin className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
            <span>{voucher.sucursalNombre}</span>
          </div>
        )}

        {/* Fecha de vencimiento (pendientes) */}
        {estado === 'pendiente' && (
          <div
            className={`flex items-center gap-2 lg:gap-1 2xl:gap-1.5 ${
              fechaInfo.esVencido
                ? 'text-[#EF4444]'
                : fechaInfo.esCercano
                ? 'text-[#F59E0B]'
                : 'text-[#94A3B8]'
            }`}
          >
            <Calendar className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
            <span>{fechaInfo.texto}</span>
          </div>
        )}

        {/* Fecha de canje (usados) */}
        {estado === 'usado' && esCompleto && voucher.usadoAt && (
          <>
            {/* Línea 1: Fecha + Persona */}
            <div className="flex items-center gap-2 lg:gap-1 2xl:gap-1.5 text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm">
              <Calendar className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
              <span>
                {new Date(voucher.usadoAt).toLocaleDateString('es-MX', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                }).replace(/\s([a-z])/, (match, letter) => ' ' + letter.toUpperCase())}, {new Date(voucher.usadoAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {mostrarEmpleadoQueCanjeo && voucher.usadoPorEmpleadoNombre && (
                <>
                  <span className="text-[#64748B]">•</span>
                  <User className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                  <span>Canjeó: {voucher.usadoPorEmpleadoNombre}</span>
                </>
              )}
            </div>
            
            {/* Línea 2: Sucursal */}
            <div className="flex items-center gap-2 lg:gap-1 2xl:gap-1.5 text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm">
              <MapPin className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
              <span>Sucursal: {voucher.sucursalNombre}</span>
            </div>
          </>
        )}

        {/* Fecha de expiración (vencidos/cancelados) */}
        {(estado === 'vencido' || estado === 'cancelado') && (
          <div className="flex items-center gap-2 lg:gap-1 2xl:gap-1.5 text-[#94A3B8]">
            <Calendar className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
            <span>Expiró: {formatearFechaSimple(voucher.expiraAt)}</span>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* BOTÓN VALIDAR (solo si está habilitado) */}
      {/* ================================================================== */}
      {mostrarBotonValidar && onValidar && !fechaInfo.esVencido && (
        <button
          onClick={() => onValidar(voucher)}
          className="
            w-full py-3 lg:py-1.5 2xl:py-3 rounded-xl lg:rounded-md 2xl:rounded-xl
            flex items-center justify-center gap-2 lg:gap-0.5 2xl:gap-1.5
            font-medium text-white text-base lg:text-sm 2xl:text-base
            transition-all
            cursor-pointer
          "
          style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #059669, #047857)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #10B981, #059669)';
          }}
        >
          <CheckCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
          Canjear Voucher
        </button>
      )}

      {/* Voucher vencido (solo si se intenta validar) */}
      {mostrarBotonValidar && fechaInfo.esVencido && (
        <div
          className="w-full py-3 lg:py-1.5 2xl:py-3 rounded-xl lg:rounded-md 2xl:rounded-xl text-center font-medium text-base lg:text-sm 2xl:text-base"
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#EF4444',
          }}
        >
          Voucher vencido
        </div>
      )}

      {/* ================================================================== */}
      {/* MODAL DE AVATAR */}
      {/* ================================================================== */}
      {avatarUrl && (
        <ModalImagenes
          images={[avatarUrl]}
          initialIndex={0}
          isOpen={modalAvatarAbierto}
          onClose={() => setModalAvatarAbierto(false)}
        />
      )}
    </div>
  );
}

export default TarjetaVoucher;