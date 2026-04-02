/**
 * ModalDetalleVoucher.tsx
 * ========================
 * Modal que muestra el detalle completo de un voucher del historial.
 * Estilo premium consistente con CardYA.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/ModalDetalleVoucher.tsx
 */

import { useState, useRef, useEffect } from 'react';
import { Gift, Store, Clock, Calendar, Ticket, AlertTriangle, XCircle, ArrowLeft, User, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import type { Voucher, EstadoVoucher } from '../../../../types/cardya';

// =============================================================================
// CONFIG ESTADOS
// =============================================================================

const ESTADO_CONFIG: Record<
  EstadoVoucher,
  { label: string; badgeClases: string; gradiente: string; colorHandle: string }
> = {
  pendiente: {
    label: 'Pendiente',
    badgeClases: 'bg-amber-100 text-amber-700',
    gradiente: 'linear-gradient(135deg, #92400e, #b45309)',
    colorHandle: 'rgba(255,255,255,0.45)',
  },
  usado: {
    label: 'Usado',
    badgeClases: 'bg-green-100 text-green-700',
    gradiente: 'linear-gradient(135deg, #064e3b, #065f46)',
    colorHandle: 'rgba(255,255,255,0.45)',
  },
  cancelado: {
    label: 'Cancelado',
    badgeClases: 'bg-red-100 text-red-700',
    gradiente: 'linear-gradient(135deg, #881337, #9f1239)',
    colorHandle: 'rgba(255,255,255,0.45)',
  },
  expirado: {
    label: 'Expirado',
    badgeClases: 'bg-slate-200 text-slate-600',
    gradiente: 'linear-gradient(135deg, #374151, #4b5563)',
    colorHandle: 'rgba(255,255,255,0.45)',
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
      sinScrollInterno
      alturaMaxima="xl"
      colorHandle={config.colorHandle}
      headerOscuro
      className="max-w-xs lg:max-w-md 2xl:max-w-lg"
    >
      <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh] 2xl:max-h-[75vh]">

      {/* ── Header con estado ── */}
      <div
        className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3.5 2xl:py-4 shrink-0 lg:rounded-t-2xl"
        style={{ background: config.gradiente }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5">
          <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
            <Ticket className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
              <h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                Detalle del voucher
              </h2>
              <span
                className={`text-sm lg:text-[11px] 2xl:text-sm font-bold px-2 py-0.5 rounded-full shrink-0 ${config.badgeClases}`}
              >
                {config.label}
              </span>
            </div>
            <p className="text-sm lg:text-[11px] 2xl:text-sm text-amber-400/80 font-bold truncate">
              {voucher.recompensaNombre}
            </p>
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto p-3 lg:p-2 2xl:p-3.5">

        {/* Recompensa destacada */}
        <div
          className="flex items-center gap-2.5 lg:gap-2 2xl:gap-3 p-2 lg:p-2 2xl:p-3 rounded-xl lg:rounded-lg 2xl:rounded-xl mb-2.5 lg:mb-1.5 2xl:mb-3"
          style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '2px solid #fde68a' }}
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
            <p className="text-[13px] lg:text-[11px] 2xl:text-sm text-amber-700/70 font-semibold">
              {voucher.puntosUsados > 0 ? `${voucher.puntosUsados.toLocaleString()} puntos usados` : `🎯 Gratis · ${voucher.recompensaNombre}`}
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
                style={{ border: '2px solid #cbd5e1', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
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
            style={{ background: '#e2e8f0', border: '2px solid #cbd5e1' }}
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
            style={{ border: '2px solid #cbd5e1' }}
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
                border: `2px solid ${esUrgente ? '#fecaca' : esPendiente2 ? '#fde68a' : '#fecaca'}`,
              }}
            >
              <AlertTriangle
                className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0"
                strokeWidth={2}
                style={{ color: esUrgente ? '#dc2626' : esPendiente2 ? '#d97706' : '#dc2626' }}
              />
              <p
                className="text-[13px] lg:text-[11px] 2xl:text-sm font-bold"
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
              border: '2px solid #bbf7d0',
            }}
          >
            <CheckCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-emerald-600 shrink-0" strokeWidth={2} />
            <p className="text-[13px] lg:text-[11px] 2xl:text-sm text-emerald-800 font-semibold">
              {voucher.puntosUsados > 0
                ? <>Se te devolvieron <strong>{voucher.puntosUsados.toLocaleString()} puntos</strong> a tu billetera</>
                : 'Este voucher fue cancelado'
              }
            </p>
          </div>
        )}

        {/* Botones de acción */}
        {!confirmando && (
          <div className={`flex gap-2.5 ${esPendiente && onCancelarVoucher ? '' : 'mt-2.5 lg:mt-1.5 2xl:mt-2.5'}`}>
            {esPendiente && onCancelarVoucher && (
              <button
                onClick={() => setConfirmando(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98]"
                style={{
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '2px solid #fecaca',
                }}
              >
                <XCircle className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />
                <span>Cancelar voucher</span>
              </button>
            )}
            <button
              onClick={handleCerrar}
              className={`${esPendiente && onCancelarVoucher ? 'flex-1' : 'w-full'} py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98]`}
              style={{
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: '#f8fafc',
                border: '2px solid #334155',
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
            style={{ background: '#fef2f2', border: '2px solid #fecaca' }}
          >
            <p className="text-sm lg:text-[11px] 2xl:text-sm text-red-800 font-semibold text-center mb-2 lg:mb-1.5 2xl:mb-2">
              {voucher.puntosUsados > 0
                ? <>¿Cancelar este voucher? Se te devolverán <strong>{voucher.puntosUsados.toLocaleString()} puntos</strong></>
                : '¿Cancelar este voucher?'
              }
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm transition-all cursor-pointer active:scale-[0.97]"
                style={{ background: '#e2e8f0', border: '2px solid #cbd5e1', color: '#475569' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.5} />
                No, volver
              </button>
              <button
                onClick={handleCancelar}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm text-white transition-all cursor-pointer active:scale-[0.97] hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
              >
                <XCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                Sí, cancelar
              </button>
            </div>
          </div>
        )}

      </div>
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
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #cbd5e1, transparent)' }} />
      <span className="text-xs lg:text-[11px] 2xl:text-sm font-extrabold text-slate-600 uppercase tracking-widest">
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, #cbd5e1, transparent)' }} />
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
      style={{ borderBottom: borderBottom ? '1px solid #cbd5e1' : 'none' }}
    >
      <div className={`flex items-center gap-2.5 lg:gap-1.5 2xl:gap-2.5 text-slate-600 shrink-0 ${multilinea ? 'mt-0.5' : ''}`}>
        {icono}
        <span className="text-[13px] lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">{label}</span>
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