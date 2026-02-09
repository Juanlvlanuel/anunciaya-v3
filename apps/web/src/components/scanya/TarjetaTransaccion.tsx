/**
 * TarjetaTransaccion.tsx
 * =======================
 * Card individual para mostrar una transacción en el historial.
 * Se adapta según el tipo de usuario (dueño, gerente, empleado).
 *
 * Ubicación: apps/web/src/components/scanya/TarjetaTransaccion.tsx
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
  Ticket,
  Award,
  Shield,
  ShieldCheck,
  Users,
  MessageCircle,
  ShoppingBag,
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

/**
 * Formatea un número como moneda MXN
 */
const formatearMoneda = (valor: number): string => {
  return valor.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  });
};

/**
 * Formatea un teléfono con separación: +52 644 123 4567
 */
const formatearTelefono = (telefono: string): string => {
  // Eliminar espacios y caracteres especiales
  const limpio = telefono.replace(/\D/g, '');
  
  // Si tiene 10 dígitos (sin lada)
  if (limpio.length === 10) {
    return `+52 ${limpio.slice(0, 3)} ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
  }
  
  // Si tiene 12 dígitos (con 52)
  if (limpio.length === 12 && limpio.startsWith('52')) {
    return `+${limpio.slice(0, 2)} ${limpio.slice(2, 5)} ${limpio.slice(5, 8)} ${limpio.slice(8)}`;
  }
  
  // Si no coincide con el formato esperado, devolver como está
  return telefono;
};

/**
 * Formatea la fecha de forma amigable
 */
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
    const dia = fecha.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
    return `${dia}, ${hora}`;
  }
};

/**
 * Obtiene el color según el nivel del cliente
 */
const getColorNivel = (nivel: string): string => {
  switch (nivel.toLowerCase()) {
    case 'oro':
      return '#F59E0B';
    case 'plata':
      return '#94A3B8';
    default:
      return '#CD7F32'; // Bronce
  }
};

/**
 * Obtiene el emoji del nivel
 */
const getEmojiNivel = (nivel: string): string => {
  switch (nivel.toLowerCase()) {
    case 'oro':
      return '🥇';
    case 'plata':
      return '🥈';
    default:
      return '🥉';
  }
};

/**
 * Construye el texto del método de pago
 */
const getMetodoPagoTexto = (t: TransaccionScanYA): { texto: string; tipo: 'simple' | 'mixto' } => {
  const partes: string[] = [];

  if (t.montoEfectivo > 0) partes.push(`${formatearMoneda(t.montoEfectivo)} efectivo`);
  if (t.montoTarjeta > 0) partes.push(`${formatearMoneda(t.montoTarjeta)} tarjeta`);
  if (t.montoTransferencia > 0) partes.push(`${formatearMoneda(t.montoTransferencia)} transf.`);

  if (partes.length === 0) {
    return { texto: 'Sin especificar', tipo: 'simple' };
  }

  if (partes.length === 1) {
    // Extraer solo el método
    if (t.montoEfectivo > 0) return { texto: 'Efectivo', tipo: 'simple' };
    if (t.montoTarjeta > 0) return { texto: 'Tarjeta', tipo: 'simple' };
    return { texto: 'Transferencia', tipo: 'simple' };
  }

  return { texto: partes.join(' + '), tipo: 'mixto' };
};


/**
 * Acorta un nombre completo a solo 1 nombre + 1 apellido
 * Ejemplo: "Juan Manuel Valenzuela Pérez" → "Juan Valenzuela"
 */
const acortarNombre = (nombreCompleto: string): string => {
  const partes = nombreCompleto.trim().split(/\s+/);
  
  if (partes.length === 0) return '';
  if (partes.length === 1) return partes[0]; // Solo un nombre
  if (partes.length === 2) return nombreCompleto; // Nombre + Apellido (ya está correcto)
  
  // Si tiene 3+ partes: tomar primer nombre + penúltimo (primer apellido)
  const primerNombre = partes[0];
  const primerApellido = partes[partes.length - 2];
  
  return `${primerNombre} ${primerApellido}`;
};
/**
 * Obtiene el icono del método de pago
 */
const IconoMetodoPago = ({ transaccion }: { transaccion: TransaccionScanYA }) => {
  const tieneEfectivo = transaccion.montoEfectivo > 0;
  const tieneTarjeta = transaccion.montoTarjeta > 0;
  const tieneTransferencia = transaccion.montoTransferencia > 0;
  const metodos = [tieneEfectivo, tieneTarjeta, tieneTransferencia].filter(Boolean).length;

  if (metodos > 1) {
    // Mixto - mostrar íconos pequeños
    return (
      <div className="flex items-center gap-0.5">
        {tieneEfectivo && <Banknote className="w-3 h-3 text-[#10B981]" />}
        {tieneTarjeta && <CreditCard className="w-3 h-3 text-[#3B82F6]" />}
        {tieneTransferencia && <Smartphone className="w-3 h-3 text-[#8B5CF6]" />}
      </div>
    );
  }

  if (tieneEfectivo) return <Banknote className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#10B981]" />;
  if (tieneTarjeta) return <CreditCard className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />;
  if (tieneTransferencia) return <Smartphone className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#8B5CF6]" />;

  return <Banknote className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#94A3B8]" />;
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function TarjetaTransaccion({
  transaccion,
  onVerFoto,
  onContactarCliente,
}: TarjetaTransaccionProps) {
  const [modalAvatarAbierto, setModalAvatarAbierto] = useState(false);
  const metodoPago = getMetodoPagoTexto(transaccion);
  const colorNivel = getColorNivel(transaccion.clienteNivel);

  // -------------------------------------------------------------------------
  // Siempre mostrar quién registró la transacción
  // -------------------------------------------------------------------------
  const mostrarRegistradoPor = true;

  return (
    <div
      className="rounded-xl lg:rounded-md 2xl:rounded-xl p-4 lg:p-2.5 2xl:p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      {/* ================================================================== */}
      {/* FILA 1: Cliente + Nivel */}
      {/* ================================================================== */}
      <div className="flex items-start justify-between gap-3 lg:gap-2 2xl:gap-3 mb-3 lg:mb-2 2xl:mb-3">
        <div className="flex items-center gap-2 lg:gap-1 2xl:gap-2 min-w-0 flex-1">
          {transaccion.clienteAvatarUrl ? (
            <img 
              src={transaccion.clienteAvatarUrl} 
              alt={transaccion.clienteNombre}
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
            <p className="text-white font-medium truncate text-base lg:text-sm 2xl:text-base">
              {transaccion.clienteNombre}
            </p>
            {transaccion.clienteTelefono && (
              <div className="flex items-center gap-2 lg:gap-0.5 2xl:gap-1.5">
                <p className="text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm flex items-center gap-1 lg:gap-0.5 2xl:gap-1">
                  <Phone className="w-3 h-3" />
                  {formatearTelefono(transaccion.clienteTelefono)}
                </p>
                <Tooltip text="Contactar por ChatYA" position="top">
                  <button
                    onClick={() => onContactarCliente?.(transaccion.clienteTelefono!, transaccion.clienteNombre)}
                    className="flex items-center justify-center w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 rounded-full transition-all cursor-pointer hover:scale-110"
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: '#3B82F6',
                    }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        {/* Badge nivel */}
        <div
          className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1 px-2 lg:px-1.5 2xl:px-2 py-1 rounded-full shrink-0"
          style={{
            background: `${colorNivel}20`,
            border: `1px solid ${colorNivel}40`,
          }}
        >
          <span className="text-sm lg:text-xs 2xl:text-sm">{getEmojiNivel(transaccion.clienteNivel)}</span>
          <span
            className="text-xs font-medium capitalize"
            style={{ color: colorNivel }}
          >
            {transaccion.clienteNivel}
          </span>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SEPARADOR */}
      {/* ================================================================== */}
      <div className="border-t border-white/10 my-3 lg:my-2 2xl:my-3" />

      {/* ================================================================== */}
      {/* FILA 2: Monto + Método Pago + Puntos (una sola línea) */}
      {/* ================================================================== */}
      <div className="flex items-center justify-between mb-1 lg:mb-0.5 2xl:mb-1">
        <div className="flex items-center gap-2 lg:gap-1 2xl:gap-2">
          <Coins className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#F59E0B]" />
          <span className="text-white text-lg lg:text-[15px] 2xl:text-lg font-bold">
            {formatearMoneda(transaccion.montoTotal)}
          </span>
          <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1 text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm">
            <IconoMetodoPago transaccion={transaccion} />
            <span>{metodoPago.texto}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1">
          <span className="text-[#10B981] font-bold text-base lg:text-sm 2xl:text-base">
            +{transaccion.puntosOtorgados.toLocaleString()}
          </span>
          <span className="text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm">pts</span>
          {transaccion.multiplicadorAplicado > 1 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded ml-1"
              style={{
                background: 'rgba(245, 158, 11, 0.2)',
                color: '#F59E0B',
              }}
            >
              x{transaccion.multiplicadorAplicado}
            </span>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* FILA 2.5: Concepto (si existe) */}
      {/* ================================================================== */}
      {transaccion.concepto && (
        <div className="flex items-center gap-2 lg:gap-1 2xl:gap-1.5 mb-2 lg:mb-1.5 2xl:mb-2 ml-7 lg:ml-5 2xl:ml-7">
          <ShoppingBag className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-[#60A5FA] shrink-0" />
          <span className="text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm truncate">{transaccion.concepto}</span>
        </div>
      )}

      {/* ================================================================== */}
      {/* FILA 4: Cupón (si existe) */}
      {/* ================================================================== */}
      {transaccion.cuponCodigo && (
        <div
          className="flex items-center gap-2 lg:gap-0.5 2xl:gap-1.5 px-3 lg:px-1.5 2xl:px-2 py-2 lg:py-1.5 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg mb-3 lg:mb-2 2xl:mb-1.5"
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

      {/* ================================================================== */}
      {/* SEPARADOR */}
      {/* ================================================================== */}
      <div className="border-t border-white/10 my-3 lg:my-2 2xl:my-3" />

      {/* ================================================================== */}
      {/* FILA 5: Metadata (registrado por, sucursal, fecha) */}
      {/* ================================================================== */}
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 text-sm lg:text-[11px] 2xl:text-sm">
        {/* Registrado por - Ahora siempre visible */}
        {mostrarRegistradoPor && (
          <div className="space-y-1 lg:space-y-0.5 2xl:space-y-1">
            {/* Línea 1: Nombre + Badge de rol */}
            <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1.5 text-[#94A3B8]">
              {transaccion.registradoPorTipo === 'empleado' && (
                <>
                  <Users className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />
                  <span>{acortarNombre(transaccion.registradoPor)}</span>
                  <span
                    className="text-xs lg:text-[10px] 2xl:text-xs px-1.5 lg:px-1 2xl:px-1.5 py-0.5 rounded font-medium"
                    style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' }}
                  >
                    Empleado
                  </span>
                </>
              )}
              {transaccion.registradoPorTipo === 'gerente' && (
                <>
                  <ShieldCheck className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#8B5CF6]" />
                  <span>{acortarNombre(transaccion.registradoPor)}</span>
                  <span
                    className="text-xs lg:text-[10px] 2xl:text-xs px-1.5 lg:px-1 2xl:px-1.5 py-0.5 rounded font-medium"
                    style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#8B5CF6' }}
                  >
                    Gerente
                  </span>
                </>
              )}
              {transaccion.registradoPorTipo === 'dueno' && (
                <>
                  <Shield className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#F59E0B]" />
                  <span>{acortarNombre(transaccion.registradoPor)}</span>
                  <span
                    className="text-xs lg:text-[10px] 2xl:text-xs px-1.5 lg:px-1 2xl:px-1.5 py-0.5 rounded font-medium"
                    style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#F59E0B' }}
                  >
                    Dueño
                  </span>
                </>
              )}
            </div>

            {/* Línea 2: Sucursal (Empleado/Gerente) o Negocio (Dueño) */}
            {(transaccion.registradoPorTipo === 'empleado' || transaccion.registradoPorTipo === 'gerente') && (
              <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1.5 text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[180px]">Suc: {transaccion.sucursalNombre}</span>
              </div>
            )}
            {transaccion.registradoPorTipo === 'dueno' && (
              <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1.5 text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[180px]">{transaccion.negocioNombre}</span>
              </div>
            )}
          </div>
        )}

        {/* Fecha siempre visible */}
        <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1.5 text-[#94A3B8] ml-auto">
          <Clock className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
          <span>{formatearFecha(transaccion.createdAt)}</span>
        </div>
      </div>

      {/* ================================================================== */}
      {/* FILA 6: Extras (foto, número orden) */}
      {/* ================================================================== */}
      {(transaccion.fotoTicketUrl || transaccion.numeroOrden) && (
        <>
          <div className="border-t border-white/10 my-3 lg:my-2 2xl:my-3" />
          <div className="flex items-center gap-3 lg:gap-1.5 2xl:gap-1.5">
            {/* Foto de ticket */}
            {transaccion.fotoTicketUrl && (
              <button
                onClick={() => onVerFoto?.(transaccion.fotoTicketUrl!)}
                className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1.5 px-3 lg:px-1.5 2xl:px-2 py-1.5 rounded-lg lg:rounded-md 2xl:rounded-lg text-sm lg:text-[11px] 2xl:text-sm"
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#3B82F6',
                }}
              >
                <Camera className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                <span>Ver ticket</span>
              </button>
            )}

            {/* Número de orden */}
            {transaccion.numeroOrden && (
              <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1.5 text-[#94A3B8] text-sm lg:text-[11px] 2xl:text-sm">
                <Award className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                <span>#{transaccion.numeroOrden}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ================================================================== */}
      {/* MODAL DE AVATAR */}
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