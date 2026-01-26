/**
 * TarjetaRecordatorio.tsx
 * ========================
 * Card individual para mostrar un recordatorio pendiente.
 * Se adapta segÃºn el tipo de usuario (dueÃ±o, gerente, empleado).
 *
 * CaracterÃ­sticas:
 * - Muestra telÃ©fono/alias, monto, mÃ©todo de pago
 * - Nota opcional truncada
 * - Info del empleado que creÃ³ el recordatorio
 * - Tiempo relativo (hace X horas/dÃ­as)
 * - Botones Procesar y Descartar
 * - AdaptaciÃ³n por rol (dueÃ±o ve sucursal)
 *
 * UbicaciÃ³n: apps/web/src/components/scanya/TarjetaRecordatorio.tsx
 */

import {
  Phone,
  Coins,
  Banknote,
  CreditCard,
  Smartphone,
  Clock,
  MapPin,
  User,
  FileText,
  CheckCircle,
  Trash2,
  Shuffle,
  Pencil,
} from 'lucide-react';
import type { RecordatorioScanYA } from '@/types/scanya';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

// =============================================================================
// TIPOS
// =============================================================================

interface TarjetaRecordatorioProps {
  recordatorio: RecordatorioScanYA;
  tipoUsuario: 'dueno' | 'gerente' | 'empleado';
  nombreEmpleado: string; // Viene del backend en el listado
  nombreSucursal?: string; // Solo para dueÃ±os
  onProcesar: (recordatorio: RecordatorioScanYA) => void;
  onEditar: (recordatorio: RecordatorioScanYA) => void;
  onDescartar: (recordatorio: RecordatorioScanYA) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Formatea un nÃºmero como moneda MXN
 */
const formatearMoneda = (valor: number): string => {
  return valor.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  });
};

/**
 * Formatea el tiempo relativo desde que se creÃ³ el recordatorio
 */
const formatearTiempoRelativo = (fechaStr: string): string => {
  const ahora = new Date();
  const fecha = new Date(fechaStr);
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMins / 60);
  const diffDias = Math.floor(diffHoras / 24);

  if (diffMins < 1) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHoras < 24) return `hace ${diffHoras} ${diffHoras === 1 ? 'hora' : 'horas'}`;
  if (diffDias === 1) return 'ayer';
  if (diffDias < 7) return `hace ${diffDias} dÃ­as`;
  
  // MÃ¡s de 7 dÃ­as: mostrar fecha
  return fecha.toLocaleDateString('es-MX', { 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Determina si el valor es un telÃ©fono o un alias
 */
const esTelefono = (valor: string): boolean => {
  const soloNumeros = valor.replace(/\D/g, '');
  return soloNumeros.length === 10;
};

/**
 * Construye el texto del mÃ©todo de pago
 */
const getMetodoPagoTexto = (r: RecordatorioScanYA): { texto: string; tipo: 'simple' | 'mixto' } => {
  const partes: string[] = [];

  if (r.montoEfectivo > 0) partes.push(`${formatearMoneda(r.montoEfectivo)} efectivo`);
  if (r.montoTarjeta > 0) partes.push(`${formatearMoneda(r.montoTarjeta)} tarjeta`);
  if (r.montoTransferencia > 0) partes.push(`${formatearMoneda(r.montoTransferencia)} transf.`);

  if (partes.length === 0) {
    return { texto: formatearMoneda(r.monto), tipo: 'simple' };
  }

  if (partes.length === 1) {
    if (r.montoEfectivo > 0) return { texto: `${formatearMoneda(r.monto)} (Efectivo)`, tipo: 'simple' };
    if (r.montoTarjeta > 0) return { texto: `${formatearMoneda(r.monto)} (Tarjeta)`, tipo: 'simple' };
    return { texto: `${formatearMoneda(r.monto)} (Transferencia)`, tipo: 'simple' };
  }

  return { texto: `${formatearMoneda(r.monto)} (${partes.join(' + ')})`, tipo: 'mixto' };
};

/**
 * Obtiene el icono del mÃ©todo de pago
 */
const IconoMetodoPago = ({ recordatorio }: { recordatorio: RecordatorioScanYA }) => {
  const tieneEfectivo = recordatorio.montoEfectivo > 0;
  const tieneTarjeta = recordatorio.montoTarjeta > 0;
  const tieneTransferencia = recordatorio.montoTransferencia > 0;
  const metodos = [tieneEfectivo, tieneTarjeta, tieneTransferencia].filter(Boolean).length;

  if (metodos > 1) {
    // Mixto - mostrar Ã­cono de mixto
    return <Shuffle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#8B5CF6]" />;
  }

  if (tieneEfectivo) return <Banknote className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#10B981]" />;
  if (tieneTarjeta) return <CreditCard className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />;
  if (tieneTransferencia) return <Smartphone className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#8B5CF6]" />;

  return <Coins className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#F59E0B]" />;
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function TarjetaRecordatorio({
  recordatorio,
  tipoUsuario,
  nombreEmpleado,
  nombreSucursal,
  onProcesar,
  onEditar,
  onDescartar,
}: TarjetaRecordatorioProps) {
  const online = useOnlineStatus();
  const metodoPago = getMetodoPagoTexto(recordatorio);
  const mostrarSucursal = tipoUsuario === 'dueno' && nombreSucursal;
  const esNumeroTelefono = esTelefono(recordatorio.telefonoOAlias);

  return (
    <div
      className="rounded-xl lg:rounded-md 2xl:rounded-xl p-4 lg:p-3 2xl:p-4"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        border: '2px solid rgba(16, 185, 129, 0.3)',
        boxShadow: '0 0 15px rgba(16, 185, 129, 0.1)',
      }}
    >
      {/* ================================================================== */}
      {/* FILA 1: TelÃ©fono o Alias */}
      {/* ================================================================== */}
      <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 mb-3 lg:mb-2 2xl:mb-3">
        <div
          className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(16, 185, 129, 0.2)' }}
        >
          {esNumeroTelefono ? (
            <Phone className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#10B981]" />
          ) : (
            <User className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#10B981]" />
          )}
        </div>
        <p className="text-white font-medium truncate">
          {esNumeroTelefono ? (
            <span className="font-mono">{recordatorio.telefonoOAlias}</span>
          ) : (
            recordatorio.telefonoOAlias
          )}
        </p>
      </div>

      {/* ================================================================== */}
      {/* FILA 2: Monto + MÃ©todo de Pago */}
      {/* ================================================================== */}
      <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 mb-3 lg:mb-2 2xl:mb-3">
        <IconoMetodoPago recordatorio={recordatorio} />
        <span className="text-white text-lg lg:text-base 2xl:text-lg font-bold">
          {metodoPago.texto}
        </span>
      </div>

      {/* ================================================================== */}
      {/* FILA 3: Nota (si existe) */}
      {/* ================================================================== */}
      {recordatorio.nota && (
        <div
          className="flex items-start gap-2 lg:gap-1.5 2xl:gap-2 p-3 lg:p-2 2xl:p-3 rounded-lg lg:rounded-md 2xl:rounded-lg mb-3 lg:mb-2 2xl:mb-3"
          style={{ background: 'rgba(148, 163, 184, 0.1)' }}
        >
          <FileText className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#94A3B8] shrink-0 mt-0.5" />
          <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm line-clamp-2">
            {recordatorio.nota}
          </p>
        </div>
      )}

      {/* ================================================================== */}
      {/* SEPARADOR */}
      {/* ================================================================== */}
      <div className="border-t border-white/10 my-3" />

      {/* ================================================================== */}
      {/* FILA 4: Metadata (empleado, sucursal, tiempo) */}
      {/* ================================================================== */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm lg:text-xs 2xl:text-sm mb-4 lg:mb-3 2xl:mb-4">
        {/* Creado por */}
        <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1 text-[#94A3B8]">
          <User className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
          <span>{nombreEmpleado}</span>
        </div>

        {/* Sucursal - Solo dueÃ±os */}
        {mostrarSucursal && (
          <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1 text-[#94A3B8]">
            <MapPin className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
            <span className="truncate max-w-[120px]">{nombreSucursal}</span>
          </div>
        )}

        {/* Tiempo relativo */}
        <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1 text-[#94A3B8] ml-auto">
          <Clock className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
          <span>{formatearTiempoRelativo(recordatorio.createdAt)}</span>
        </div>
      </div>

      {/* ================================================================== */}
      {/* BOTONES DE ACCIÃ“N */}
      {/* ================================================================== */}
      <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
        {/* BotÃ³n Procesar (online) o Editar (offline) */}
        <button
          onClick={() => online ? onProcesar(recordatorio) : onEditar(recordatorio)}
          className="
            flex-1 py-2 lg:py-1.5 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg
            flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2
            font-medium text-sm lg:text-xs 2xl:text-sm
            transition-all
            cursor-pointer
          "
          style={online ? {
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFFFFF',
            boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
          } : {
            background: 'rgba(59, 130, 246, 0.2)',
            color: '#3B82F6',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}
          onMouseEnter={(e) => {
            if (online) {
              e.currentTarget.style.transform = 'scale(1.02)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #059669, #047857)';
            } else {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
              e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            if (online) {
              e.currentTarget.style.background = 'linear-gradient(135deg, #10B981, #059669)';
            } else {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
              e.currentTarget.style.border = '1px solid rgba(59, 130, 246, 0.3)';
            }
          }}
        >
          {online ? (
            <>
              <CheckCircle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
              Procesar
            </>
          ) : (
            <>
              <Pencil className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
              Editar
            </>
          )}
        </button>

        {/* BotÃ³n Descartar */}
        <button
          onClick={() => onDescartar(recordatorio)}
          className="
            flex-1 py-2 lg:py-1.5 2xl:py-2 rounded-lg lg:rounded-md 2xl:rounded-lg
            flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2
            font-medium text-sm lg:text-xs 2xl:text-sm
            transition-all
            cursor-pointer
          "
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#EF4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
            e.currentTarget.style.border = '1px solid rgba(239, 68, 68, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.border = '1px solid rgba(239, 68, 68, 0.3)';
          }}
        >
          <Trash2 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
          Descartar
        </button>
      </div>
    </div>
  );
}

export default TarjetaRecordatorio;