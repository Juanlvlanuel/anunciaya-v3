/**
 * ModalDetalleVoucher.tsx
 * ========================
 * Modal que muestra el detalle completo de un voucher del historial.
 * Estilo premium consistente con CardYA.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/ModalDetalleVoucher.tsx
 */

import { useState, useRef, useEffect } from 'react';
import { X, Gift, Store, Clock, Calendar, Ticket, AlertTriangle, XCircle, ArrowLeft, User, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
  const texto = fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return texto
    .replace(/ [a-z]/g, (c) => c.toUpperCase())
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .replace(/ De /g, ' de ')
    .replace(/ de (\d{4})/, ' $1')
    .replace(/a\.m\./gi, 'A.M.')
    .replace(/p\.m\./gi, 'P.M.');
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
  const confirmacionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (confirmando && confirmacionRef.current) {
      confirmacionRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [confirmando]);

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
      className="lg:max-w-xs 2xl:max-w-md"
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
                <h2 className="text-base lg:text-xs 2xl:text-base font-bold text-white truncate">
                  Detalle del voucher
                </h2>
                <span
                  className="text-[11px] lg:text-[9px] 2xl:text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0"
                  style={{ background: config.bg, color: config.color, border: `1px solid ${config.border}` }}
                >
                  {config.label}
                </span>
              </div>
              <p className="text-[13px] lg:text-[10px] 2xl:text-[13px] text-amber-400/80 font-bold truncate">
                {voucher.recompensaNombre}
              </p>
            </div>
          </div>
          <button
            onClick={handleCerrar}
            className="w-10 h-10 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-6 h-6 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="p-3 lg:p-2 2xl:p-3.5 max-h-[70vh] overflow-y-auto">

        {/* Recompensa destacada */}
        <div
          className="flex items-center gap-2.5 lg:gap-2 2xl:gap-3 p-2 lg:p-2 2xl:p-3 rounded-xl lg:rounded-lg 2xl:rounded-xl mb-2.5 lg:mb-1.5 2xl:mb-3"
          style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a' }}
        >
          <div className="w-10 h-10 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-lg overflow-hidden shrink-0">
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
            <h3 className="text-base lg:text-xs 2xl:text-base font-bold text-amber-900 truncate">
              {voucher.recompensaNombre}
            </h3>
            <p className="text-[13px] lg:text-[10px] 2xl:text-[13px] text-amber-700/70 font-semibold">
              {voucher.puntosUsados.toLocaleString()} puntos usados
            </p>
          </div>
        </div>

        {/* Código voucher */}
        <div className="mb-2.5 lg:mb-1.5 2xl:mb-3">
          <SectionLabel label="Código" />

          {/* QR - solo para pendientes */}
          {voucher.estado === 'pendiente' && voucher.qrData && (
            <div className="flex justify-center mb-1.5 lg:mb-1.5 2xl:mb-2">
              <div
                className="rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden bg-white flex items-center justify-center p-1.5"
                style={{ border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
              >
                <QRCodeSVG
                  value={voucher.qrData}
                  size={100}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>
            </div>
          )}

          <div
            className="flex items-center justify-center p-2 lg:p-2 2xl:p-3 rounded-xl lg:rounded-lg 2xl:rounded-xl"
            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
          >
            <span className="text-lg lg:text-sm 2xl:text-lg font-black text-slate-800 tracking-[0.2em] font-mono">
              {voucher.codigo}
            </span>
          </div>
        </div>

        {/* Información general */}
        <div className="mb-2.5 lg:mb-1.5 2xl:mb-3">
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
              multilinea
              borderBottom={!!(voucher.usadoAt || voucher.canjeadoPorNombre)}
            />
            {voucher.usadoAt && (
              <FilaDetalle
                icono={<Clock className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
                label={voucher.estado === 'cancelado' ? 'Cancelado el' : 'Fecha uso'}
                valor={formatearFechaCompleta(voucher.usadoAt)}
                multilinea
                borderBottom={!!voucher.canjeadoPorNombre}
              />
            )}
            {voucher.usadoAt && voucher.canjeadoPorNombre && (
              <FilaDetalle
                icono={<User className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
                label="Canjeado por"
                valor={voucher.canjeadoPorNombre}
              />
            )}
          </div>
        </div>

        {/* Vencimiento destacado - solo pendiente y expirado */}
        {(voucher.estado === 'pendiente' || voucher.estado === 'expirado') && (() => {
          const ahora = new Date();
          const vence = new Date(voucher.expiraAt);
          const diffMs = vence.getTime() - ahora.getTime();
          const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const fechaCorta = vence.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
            .replace(/ [a-z]/g, (c) => c.toUpperCase());

          const esPendiente2 = voucher.estado === 'pendiente';
          const esUrgente = esPendiente2 && diffDias <= 7;

          return (
            <div
              className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 p-2.5 lg:p-2 2xl:p-3 rounded-xl lg:rounded-lg 2xl:rounded-xl mb-2.5 lg:mb-1.5 2xl:mb-3"
              style={{
                background: esUrgente
                  ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
                  : esPendiente2
                    ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
                    : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                border: `1px solid ${esUrgente ? '#fecaca' : esPendiente2 ? '#fde68a' : '#fecaca'}`,
              }}
            >
              <AlertTriangle
                className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0"
                strokeWidth={2}
                style={{ color: esUrgente ? '#dc2626' : esPendiente2 ? '#d97706' : '#dc2626' }}
              />
              <p
                className="text-[13px] lg:text-[11px] 2xl:text-[13px] font-bold"
                style={{ color: esUrgente ? '#dc2626' : esPendiente2 ? '#92400e' : '#991b1b' }}
              >
                {esPendiente2
                  ? diffDias <= 0
                    ? `Vence hoy · ${fechaCorta}`
                    : diffDias === 1
                      ? `Vence mañana · ${fechaCorta}`
                      : `Vence en ${diffDias} días · ${fechaCorta}`
                  : `Venció el ${fechaCorta}`
                }
              </p>
            </div>
          );
        })()}

        {/* Aviso de puntos devueltos */}
        {(voucher.estado === 'expirado' || voucher.estado === 'cancelado') && (
          <div
            className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 p-2.5 lg:p-2 2xl:p-3 rounded-xl lg:rounded-lg 2xl:rounded-xl mb-2.5 lg:mb-1.5 2xl:mb-3"
            style={{
              background: voucher.estado === 'expirado'
                ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)'
                : 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
              border: '1px solid #bbf7d0',
            }}
          >
            <CheckCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-emerald-600 shrink-0" strokeWidth={2} />
            <p className="text-[13px] lg:text-[11px] 2xl:text-[13px] text-emerald-800 font-semibold">
              Se te devolvieron <strong>{voucher.puntosUsados.toLocaleString()} puntos</strong> a tu billetera
            </p>
          </div>
        )}

        {/* Botones de acción */}
        {!confirmando && (
          <div className={`flex gap-2.5 ${esPendiente && onCancelarVoucher ? '' : 'mt-2.5 lg:mt-1.5 2xl:mt-2.5'}`}>
            {esPendiente && onCancelarVoucher && (
              <button
                onClick={() => setConfirmando(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 lg:py-1 2xl:py-2 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-[14px] lg:text-[12px] 2xl:text-[14px] transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98]"
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
            <button
              onClick={handleCerrar}
              className={`${esPendiente && onCancelarVoucher ? 'flex-1' : 'w-full'} py-2 lg:py-1 2xl:py-2 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-[14px] lg:text-[12px] 2xl:text-[14px] transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98]`}
              style={{
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: '#f8fafc',
                border: '1px solid #334155',
              }}
            >
              Cerrar
            </button>
          </div>
        )}
        {confirmando && (
          <div
            ref={confirmacionRef}
            className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-3 lg:p-2 2xl:p-3"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
          >
            <p className="text-sm lg:text-[11px] 2xl:text-sm text-red-800 font-semibold text-center mb-2 lg:mb-1.5 2xl:mb-2">
              ¿Cancelar este voucher? Se te devolverán <strong>{voucher.puntosUsados.toLocaleString()} puntos</strong>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 flex items-center justify-center gap-1 py-2 lg:py-1 2xl:py-2 rounded-lg font-bold text-sm lg:text-[11px] 2xl:text-sm transition-all cursor-pointer active:scale-[0.97]"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                No, volver
              </button>
              <button
                onClick={handleCancelar}
                className="flex-1 flex items-center justify-center gap-1 py-2 lg:py-1 2xl:py-2 rounded-lg font-bold text-sm lg:text-[11px] 2xl:text-sm text-white transition-all cursor-pointer active:scale-[0.97] hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              >
                <XCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                Sí, cancelar
              </button>
            </div>
          </div>
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
    <div className="flex items-center gap-2 mb-1.5 lg:mb-1 2xl:mb-2">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #e2e8f0, transparent)' }} />
      <span className="text-xs lg:text-[9px] 2xl:text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
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
  multilinea,
  borderBottom,
}: {
  icono: React.ReactNode;
  label: string;
  valor: string;
  valorBold?: boolean;
  multilinea?: boolean;
  borderBottom?: boolean;
}) {
  return (
    <div
      className={`flex ${multilinea ? 'items-start' : 'items-center'} justify-between px-3 lg:px-2.5 2xl:px-3.5 py-2 lg:py-1.5 2xl:py-2.5`}
      style={{ borderBottom: borderBottom ? '1px solid #f1f5f9' : 'none' }}
    >
      <div className={`flex items-center gap-2.5 lg:gap-1.5 2xl:gap-2.5 text-slate-400 shrink-0 ${multilinea ? 'mt-0.5' : ''}`}>
        {icono}
        <span className="text-[13px] lg:text-[10px] 2xl:text-[13px] font-semibold text-slate-500">{label}</span>
      </div>
      <span
        className={`text-[14px] lg:text-xs 2xl:text-[14px] text-right max-w-[55%] ${multilinea ? 'leading-snug' : 'truncate'} ${valorBold ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
          }`}
      >
        {valor}
      </span>
    </div>
  );
}