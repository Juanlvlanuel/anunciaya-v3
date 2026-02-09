/**
 * ModalDetalleVoucher.tsx
 * ========================
 * Modal que muestra el detalle completo de un voucher del historial.
 * Estilo premium consistente con CardYA.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/ModalDetalleVoucher.tsx
 */

import { useState } from 'react';
import { X, Gift, Store, Clock, Calendar, Ticket, AlertTriangle, XCircle, ArrowLeft } from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import type { Voucher, EstadoVoucher } from '../../../../types/cardya';

// =============================================================================
// CONFIG ESTADOS
// =============================================================================

const ESTADO_CONFIG: Record<
  EstadoVoucher,
  { label: string; color: string; bg: string; border: string; gradiente: string }
> = {
  pendiente: {
    label: 'Pendiente',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    gradiente: 'linear-gradient(135deg, #92400e, #b45309)',
  },
  usado: {
    label: 'Usado',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    gradiente: 'linear-gradient(135deg, #064e3b, #065f46)',
  },
  cancelado: {
    label: 'Cancelado',
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    gradiente: 'linear-gradient(135deg, #881337, #9f1239)',
  },
  expirado: {
    label: 'Expirado',
    color: '#6b7280',
    bg: '#f9fafb',
    border: '#e5e7eb',
    gradiente: 'linear-gradient(135deg, #374151, #4b5563)',
  },
};

// =============================================================================
// HELPERS
// =============================================================================

const formatearFechaCompleta = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// =============================================================================
// COMPONENTE
// =============================================================================

export default function ModalDetalleVoucher({
  abierto,
  onCerrar,
  voucher,
  onCancelarVoucher,
}: {
  abierto: boolean;
  onCerrar: () => void;
  voucher: Voucher | null;
  onCancelarVoucher?: (voucher: Voucher) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (!abierto || !voucher) return null;

  const config = ESTADO_CONFIG[voucher.estado];
  const esPendiente = voucher.estado === 'pendiente';

  const handleCancelar = () => {
    onCancelarVoucher?.(voucher);
    setConfirmando(false);
    onCerrar();
  };

  const handleCerrar = () => {
    setConfirmando(false);
    onCerrar();
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={handleCerrar}
      ancho="md"
      mostrarHeader={false}
      paddingContenido="none"
      className="lg:max-w-[280px] 2xl:max-w-md"
    >
      {/* ── Header con estado ── */}
      <div
        className="relative overflow-hidden px-4 lg:px-2.5 2xl:px-4 py-3 lg:py-2 2xl:py-3"
        style={{ background: config.gradiente }}
      >
        {/* Grid sutil */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.03,
            backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                             repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 flex-1 min-w-0">
            <div
              className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              <Ticket className="w-[18px] h-[18px] lg:w-4 lg:h-4 2xl:w-[18px] 2xl:h-[18px] text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                <h2 className="text-sm lg:text-xs 2xl:text-sm font-bold text-white truncate">
                  Detalle del voucher
                </h2>
                <span
                  className="text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0"
                  style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}
                >
                  {config.label}
                </span>
              </div>
              <p className="text-[11px] lg:text-[10px] 2xl:text-[11px] text-white/40 font-medium truncate">
                {voucher.recompensaNombre}
              </p>
            </div>
          </div>
          <button
            onClick={handleCerrar}
            className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="p-3.5 lg:p-2 2xl:p-3.5 max-h-[70vh] overflow-y-auto">

        {/* Recompensa destacada */}
        <div
          className="flex items-center gap-3 lg:gap-2 2xl:gap-3 p-3 lg:p-2 2xl:p-3 rounded-xl lg:rounded-lg 2xl:rounded-xl mb-3 lg:mb-1.5 2xl:mb-3"
          style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a' }}
        >
          <div className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-lg overflow-hidden shrink-0">
            {voucher.recompensaImagen ? (
              <img
                src={voucher.recompensaImagen}
                alt={voucher.recompensaNombre}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-amber-100">
                <Gift className="w-5 h-5 text-amber-600" strokeWidth={2} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm lg:text-xs 2xl:text-sm font-bold text-amber-900 truncate">
              {voucher.recompensaNombre}
            </h3>
            <p className="text-[11px] lg:text-[10px] 2xl:text-[11px] text-amber-700/60 font-semibold">
              {voucher.puntosUsados.toLocaleString()} puntos usados
            </p>
          </div>
        </div>

        {/* Código voucher */}
        <div className="mb-3 lg:mb-1.5 2xl:mb-3">
          <SectionLabel label="Código" />
          <div
            className="flex items-center justify-center p-3 lg:p-2 2xl:p-3 rounded-xl lg:rounded-lg 2xl:rounded-xl"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <span className="text-lg lg:text-sm 2xl:text-lg font-black text-slate-800 tracking-[0.2em] font-mono">
              {voucher.codigo}
            </span>
          </div>
        </div>

        {/* Información general */}
        <div className="mb-3 lg:mb-1.5 2xl:mb-3">
          <SectionLabel label="Información" />
          <div
            className="rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden"
            style={{ border: '1px solid #e2e8f0' }}
          >
            <FilaDetalle
              icono={<Store className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
              label="Negocio"
              valor={voucher.negocioNombre}
              borderBottom
            />
            <FilaDetalle
              icono={<Calendar className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
              label="Fecha canje"
              valor={formatearFechaCompleta(voucher.createdAt)}
              borderBottom
            />
            <FilaDetalle
              icono={<AlertTriangle className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
              label="Vencimiento"
              valor={formatearFechaCompleta(voucher.expiraAt)}
              borderBottom={!!voucher.usadoAt}
            />
            {voucher.usadoAt && (
              <FilaDetalle
                icono={<Clock className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
                label="Fecha uso"
                valor={formatearFechaCompleta(voucher.usadoAt)}
              />
            )}
          </div>
        </div>

        {/* Botones de acción */}
        {esPendiente && onCancelarVoucher && !confirmando && (
          <button
            onClick={() => setConfirmando(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 lg:py-1 2xl:py-2 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-[13px] lg:text-[12px] 2xl:text-[13px] transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98]"
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
            }}
          >
            <XCircle className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />
            <span>Cancelar voucher</span>
          </button>
        )}

        {/* Confirmación de cancelación */}
        {confirmando && (
          <div
            className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-3 lg:p-2 2xl:p-3"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
          >
            <p className="text-xs lg:text-[11px] 2xl:text-xs text-red-800 font-semibold text-center mb-2 lg:mb-1.5 2xl:mb-2">
              ¿Cancelar este voucher? Se te devolverán <strong>{voucher.puntosUsados.toLocaleString()} puntos</strong>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 flex items-center justify-center gap-1 py-2 lg:py-1 2xl:py-2 rounded-lg font-bold text-xs lg:text-[11px] 2xl:text-xs transition-all cursor-pointer active:scale-[0.97]"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                No, volver
              </button>
              <button
                onClick={handleCancelar}
                className="flex-1 flex items-center justify-center gap-1 py-2 lg:py-1 2xl:py-2 rounded-lg font-bold text-xs lg:text-[11px] 2xl:text-xs text-white transition-all cursor-pointer active:scale-[0.97] hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              >
                <XCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                Sí, cancelar
              </button>
            </div>
          </div>
        )}

        {/* Botón cerrar */}
        {!confirmando && (
          <button
            onClick={handleCerrar}
            className={`w-full ${esPendiente && onCancelarVoucher ? 'mt-2 lg:mt-1 2xl:mt-2' : 'mt-2.5 lg:mt-1.5 2xl:mt-2.5'} py-2 lg:py-1 2xl:py-2 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-[13px] lg:text-[12px] 2xl:text-[13px] transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98]`}
            style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              color: '#f8fafc',
              border: '1px solid #334155',
            }}
          >
            Cerrar
          </button>
        )}
      </div>
    </ModalAdaptativo>
  );
}

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 lg:mb-1 2xl:mb-2">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #e2e8f0, transparent)' }} />
      <span className="text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, #e2e8f0, transparent)' }} />
    </div>
  );
}

function FilaDetalle({
  icono,
  label,
  valor,
  valorBold,
  borderBottom,
}: {
  icono: React.ReactNode;
  label: string;
  valor: string;
  valorBold?: boolean;
  borderBottom?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-3.5 lg:px-2.5 2xl:px-3.5 py-2.5 lg:py-1.5 2xl:py-2.5"
      style={{ borderBottom: borderBottom ? '1px solid #f1f5f9' : 'none' }}
    >
      <div className="flex items-center gap-2.5 lg:gap-1.5 2xl:gap-2.5 text-slate-400 shrink-0">
        {icono}
        <span className="text-xs lg:text-[10px] 2xl:text-xs font-semibold text-slate-500">{label}</span>
      </div>
      <span
        className={`text-sm lg:text-xs 2xl:text-sm text-right max-w-[55%] truncate ${
          valorBold ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
        }`}
      >
        {valor}
      </span>
    </div>
  );
}