/**
 * ModalDetalleTransaccion.tsx
 * ============================
 * Modal de detalle completo de una transacción (compra o canje).
 * Usa ModalAdaptativo (bottom-sheet en móvil, centrado en desktop).
 * Estilo premium consistente con ModalDetalleBilletera y ModalVoucherGenerado.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/ModalDetalleTransaccion.tsx
 */

import {
  X,
  TrendingUp,
  Gift,
  Store,
  MapPin,
  Clock,
  User,
  Receipt,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import type { Transaccion } from '../../../../types/cardya';

// =============================================================================
// HELPERS
// =============================================================================

const formatearFechaCompleta = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  const texto = fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
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

export default function ModalDetalleTransaccion({
  abierto,
  onCerrar,
  transaccion,
}: {
  abierto: boolean;
  onCerrar: () => void;
  transaccion: Transaccion | null;
}) {
  if (!abierto || !transaccion) return null;

  const tx = transaccion;
  const esGanado = tx.tipo === 'compra';

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="md"
      mostrarHeader={false}
      paddingContenido="none"
      className="lg:max-w-xs 2xl:max-w-md"
    >
      {/* ── Header dark ── */}
      <div
        className="relative overflow-hidden px-4 lg:px-2.5 2xl:px-3.5 py-3 lg:py-2 2xl:py-3"
        style={{
          background: esGanado
            ? 'linear-gradient(135deg, #064e3b, #065f46)'
            : 'linear-gradient(135deg, #881337, #9f1239)',
        }}
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
        {/* Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: esGanado
              ? 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.1) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at 50% 0%, rgba(244,63,94,0.1) 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          {/* Ícono + Info + Puntos */}
          <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 flex-1 min-w-0">
            <div
              className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            >
              {esGanado ? (
                <TrendingUp className="w-[18px] h-[18px] lg:w-4 lg:h-4 2xl:w-[18px] 2xl:h-[18px] text-white" strokeWidth={2.5} />
              ) : (
                <Gift className="w-[18px] h-[18px] lg:w-4 lg:h-4 2xl:w-[18px] 2xl:h-[18px] text-white" strokeWidth={2.5} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                <h2 className="text-sm lg:text-xs 2xl:text-sm font-bold text-white truncate">
                  {esGanado ? 'Puntos ganados' : 'Puntos canjeados'}
                </h2>
                <span className={`text-lg lg:text-sm 2xl:text-lg font-black shrink-0 ${esGanado ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {esGanado ? '+' : ''}{tx.puntos.toLocaleString()}
                  <span className="text-[10px] lg:text-[9px] 2xl:text-[10px] font-bold opacity-60 ml-0.5">pts</span>
                </span>
              </div>
              <p className="text-[13px] lg:text-[10px] 2xl:text-[13px] text-amber-400/80 font-bold truncate">
                {tx.negocioNombre}
              </p>
            </div>
          </div>
          {/* Botón cerrar */}
          <button
            onClick={onCerrar}
            className="w-10 h-10 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-6 h-6 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="p-3.5 lg:p-2 2xl:p-3.5 max-h-[70vh] overflow-y-auto">

        {/* ── Datos de compra (acumulación) ── */}
        {esGanado && (
          <div className="mb-3 lg:mb-1.5 2xl:mb-3">
            <SectionLabel label="Detalle de compra" />
            <div
              className="rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden"
              style={{ border: '1px solid #e2e8f0' }}
            >
              {tx.montoCompra !== undefined && (
                <FilaDetalle
                  icono={<Receipt className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
                  label="Monto de compra"
                  valor={`$${tx.montoCompra.toFixed(2)} MXN`}
                  valorBold
                  borderBottom
                />
              )}
              {tx.multiplicador !== undefined && tx.multiplicador > 1 && (
                <FilaDetalle
                  icono={<TrendingUp className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
                  label="Multiplicador"
                  valorCustom={
                    <span className="text-lg lg:text-sm 2xl:text-lg font-black text-amber-600">
                      ×{tx.multiplicador}
                    </span>
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* ── Información general ── */}
        <div className="mb-3 lg:mb-1.5 2xl:mb-3">
          <SectionLabel label="Información general" />
          <div
            className="rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden"
            style={{ border: '1px solid #e2e8f0' }}
          >
            <FilaDetalle
              icono={<Store className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
              label="Negocio"
              valor={tx.negocioNombre}
              borderBottom
            />
            {tx.sucursalNombre && (
              <FilaDetalle
                icono={<MapPin className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
                label="Sucursal"
                valor={tx.sucursalNombre}
                borderBottom
              />
            )}
            <FilaDetalle
              icono={<Clock className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
              label="Fecha y hora"
              valor={formatearFechaCompleta(tx.fecha)}
              multilinea
              borderBottom
            />
            {tx.empleadoNombre && (
              <FilaDetalle
                icono={<User className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
                label="Atendido por"
                valor={tx.empleadoNombre}
                borderBottom
              />
            )}
            <FilaDetalle
              icono={<Receipt className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
              label="Concepto"
              valor={tx.descripcion}
            />
          </div>
        </div>

        {/* ── Botón cerrar ── */}
        <button
          onClick={onCerrar}
          className="w-full mt-2.5 lg:mt-1.5 2xl:mt-2.5 py-2 lg:py-1 2xl:py-2 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-[13px] lg:text-[12px] 2xl:text-[13px] transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#f8fafc',
            border: '1px solid #334155',
          }}
        >
          Cerrar
        </button>
      </div>
    </ModalAdaptativo>
  );
}

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

/** Label de sección con líneas decorativas */
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 lg:mb-1 2xl:mb-2">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #e2e8f0, transparent)' }} />
      <span className="text-xs lg:text-[9px] 2xl:text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, #e2e8f0, transparent)' }} />
    </div>
  );
}

/** Fila de detalle dentro de card con borde */
function FilaDetalle({
  icono,
  label,
  valor,
  valorBold,
  valorColor,
  valorCustom,
  borderBottom,
  multilinea,
}: {
  icono: React.ReactNode;
  label: string;
  valor?: string;
  valorBold?: boolean;
  valorColor?: string;
  valorCustom?: React.ReactNode;
  borderBottom?: boolean;
  multilinea?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between px-3.5 lg:px-2.5 2xl:px-3.5 py-2.5 lg:py-1.5 2xl:py-2.5"
      style={{ borderBottom: borderBottom ? '1px solid #f1f5f9' : 'none' }}
    >
      <div className="flex items-center gap-2.5 lg:gap-1.5 2xl:gap-2.5 text-slate-400 shrink-0">
        {icono}
        <span className="text-[13px] lg:text-[10px] 2xl:text-[13px] font-semibold text-slate-500">{label}</span>
      </div>
      {valorCustom || (
        <span
          className={`text-[14px] lg:text-xs 2xl:text-[14px] text-right max-w-[55%] ${multilinea ? 'leading-snug' : 'truncate'} ${valorBold ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
            }`}
          style={valorColor ? { color: valorColor } : undefined}
        >
          {valor}
        </span>
      )}
    </div>
  );
}