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
  TrendingUp,
  Gift,
  Store,
  MapPin,
  Clock,
  User,
  Receipt,
  Ticket,
  Tag,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import type { Transaccion } from '../../../../types/cardya';

// =============================================================================
// HELPERS
// =============================================================================

const formatearTipoCupon = (tipo: string): string => {
  switch (tipo) {
    case 'porcentaje': return 'Descuento %';
    case 'monto_fijo': return 'Descuento fijo';
    case '2x1': return '2×1';
    case '3x2': return '3×2';
    case 'envio_gratis': return 'Envío gratis';
    case 'gratis': return 'Gratis';
    default: return 'Cupón';
  }
};

const formatearValorCupon = (tipo: string, valor: number | null): string => {
  if (!valor) return '—';
  switch (tipo) {
    case 'porcentaje': return `${valor}%`;
    case 'monto_fijo': return `$${valor.toFixed(2)} MXN`;
    default: return String(valor);
  }
};

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
      sinScrollInterno
      alturaMaxima="xl"
      colorHandle="rgba(255,255,255,0.4)"
      headerOscuro
      className="max-w-xs lg:max-w-md 2xl:max-w-lg"
    >
      <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh] 2xl:max-h-[75vh]">

      {/* ── Header dark ── */}
      <div
        className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3.5 2xl:py-4 shrink-0 lg:rounded-t-2xl"
        style={{
          background: esGanado
            ? 'linear-gradient(135deg, #064e3b, #065f46)'
            : 'linear-gradient(135deg, #881337, #9f1239)',
        }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
          <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
            {esGanado ? (
              <TrendingUp className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" strokeWidth={2.5} />
            ) : (
              <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" strokeWidth={2.5} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
              <h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                {esGanado ? 'Puntos ganados' : 'Puntos canjeados'}
              </h2>
              <span className={`text-xl lg:text-base 2xl:text-xl font-black shrink-0 ${esGanado ? 'text-emerald-300' : 'text-rose-300'}`}>
                {esGanado ? '+' : ''}{tx.puntos.toLocaleString()}
                <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold opacity-60 ml-0.5">pts</span>
              </span>
            </div>
            <p className="text-sm lg:text-[11px] 2xl:text-sm text-amber-400/80 font-bold truncate">
              {tx.negocioNombre}
            </p>
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto p-3 lg:p-2 2xl:p-3.5">

        {/* ── 1. Información general ── */}
        <div className="mb-2.5 lg:mb-1.5 2xl:mb-2.5">
          <SectionLabel label="Información general" />
          <div
            className="rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden"
            style={{ border: '2px solid #cbd5e1' }}
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
              icono={<Receipt className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
              label="Concepto"
              valor={tx.descripcion}
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
              icono={<Clock className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
              label="Fecha y hora"
              valor={formatearFechaCompleta(tx.fecha)}
              multilinea
            />
          </div>
        </div>

        {/* ── 2. Cupón aplicado (card separado verde) ── */}
        {esGanado && tx.cuponTipo && (() => {
          const tieneValorCupon = tx.cuponValor !== undefined && tx.cuponValor !== null && tx.cuponValor > 0;
          return (
            <div className="mb-2.5 lg:mb-1.5 2xl:mb-2.5">
              <SectionLabel label="Cupón aplicado" />
              <div
                className="rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '2px solid #a7f3d0' }}
              >
                {tx.cuponTitulo && (
                  <FilaDetalle
                    icono={<Ticket className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-emerald-600" strokeWidth={2} />}
                    label="Cupón"
                    valor={tx.cuponTitulo}
                    valorBold
                    valorColor="#047857"
                    borderBottom
                  />
                )}
                <FilaDetalle
                  icono={<Tag className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-emerald-600" strokeWidth={2} />}
                  label="Descuento"
                  valorCustom={
                    <span className="text-base lg:text-sm 2xl:text-base font-black text-emerald-700">
                      {tx.cuponTipo === 'otro' && tx.cuponValorTexto
                        ? tx.cuponValorTexto
                        : tieneValorCupon
                          ? formatearValorCupon(tx.cuponTipo!, tx.cuponValor!)
                          : formatearTipoCupon(tx.cuponTipo!)}
                    </span>
                  }
                />
              </div>
            </div>
          );
        })()}

        {/* ── 3. Detalle de compra (montos + multiplicador) — ocultar si monto y puntos son 0 ── */}
        {esGanado && tx.montoCompra !== undefined && (tx.montoCompra > 0 || tx.puntos > 0) && (() => {
          const tieneAhorro = tx.descuentoAplicado !== undefined && tx.descuentoAplicado !== null && tx.descuentoAplicado > 0;
          const montoOriginal = tieneAhorro ? tx.montoCompra + tx.descuentoAplicado! : tx.montoCompra;

          return (
            <div className="mb-2.5 lg:mb-1.5 2xl:mb-2.5">
              <SectionLabel label="Detalle de compra" />
              <div
                className="rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden"
                style={{ border: '2px solid #cbd5e1' }}
              >
                <FilaDetalle
                  icono={<Receipt className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
                  label={tieneAhorro ? 'Subtotal' : 'Monto de compra'}
                  valor={`$${montoOriginal.toFixed(2)} MXN`}
                  valorBold
                  borderBottom={tieneAhorro || (tx.multiplicador !== undefined && tx.multiplicador > 1)}
                />
                {tieneAhorro && (
                  <>
                    <FilaDetalle
                      icono={<Receipt className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-emerald-600" strokeWidth={2} />}
                      label="Ahorro"
                      valorCustom={
                        <span className="text-base lg:text-sm 2xl:text-base font-black text-emerald-700">
                          -${tx.descuentoAplicado!.toFixed(2)}
                        </span>
                      }
                      borderBottom
                    />
                    <FilaDetalle
                      icono={<Receipt className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2} />}
                      label="Total pagado"
                      valorCustom={
                        <span className="text-base lg:text-sm 2xl:text-base font-black text-slate-900">
                          ${tx.montoCompra.toFixed(2)}
                        </span>
                      }
                      borderBottom={tx.multiplicador !== undefined && tx.multiplicador > 1}
                    />
                  </>
                )}
                <FilaDetalle
                  icono={<Gift className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-emerald-600" strokeWidth={2} />}
                  label="Puntos ganados"
                  valorCustom={
                    <span className="text-base lg:text-sm 2xl:text-base font-black text-emerald-700">
                      +{tx.puntos.toLocaleString()}
                    </span>
                  }
                />
              </div>
            </div>
          );
        })()}

        {/* ── Botón cerrar ── */}
        <button
          onClick={onCerrar}
          className="w-full mt-2 lg:mt-1.5 2xl:mt-2 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm transition-all duration-200 cursor-pointer hover:shadow-lg active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            color: '#f8fafc',
            border: '2px solid #334155',
          }}
        >
          Cerrar
        </button>
      </div>
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
    <div className="flex items-center gap-2 mb-1.5 lg:mb-1 2xl:mb-1.5">
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, #cbd5e1, transparent)' }} />
      <span className="text-xs lg:text-[11px] 2xl:text-sm font-extrabold text-slate-600 uppercase tracking-widest">
        {label}
      </span>
      <div className="h-px flex-1" style={{ background: 'linear-gradient(to left, #cbd5e1, transparent)' }} />
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
      className="flex items-center justify-between px-3 lg:px-2.5 2xl:px-3 py-2 lg:py-1.5 2xl:py-2"
      style={{ borderBottom: borderBottom ? '1px solid #cbd5e1' : 'none' }}
    >
      <div className="flex items-center gap-2.5 lg:gap-1.5 2xl:gap-2.5 text-slate-600 shrink-0">
        {icono}
        <span className="text-[13px] lg:text-[11px] 2xl:text-sm font-semibold text-slate-600">{label}</span>
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