/**
 * ModalDetalleTransaccionBS.tsx
 * ==============================
 * Modal de detalle de una transacción para Business Studio.
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/transacciones/ModalDetalleTransaccionBS.tsx
 *
 * DIFERENCIA con CardYA:
 *   - CardYA muestra perspectiva del CLIENTE (sus puntos ganados/canjeados)
 *   - Business Studio muestra perspectiva del NEGOCIO (venta, operador, revocación)
 *
 * FEATURES:
 *   - Header dark con gradiente (verde=confirmado, amber=pendiente, rojo=cancelado)
 *   - Datos completos: cliente, monto, puntos, multiplicador, operador, sucursal, fecha
 *   - Botón revocar con campo de motivo obligatorio (solo estado confirmado)
 *   - Responsive: ModalBottom en móvil, Modal centrado en desktop
 */

import { useState } from 'react';
import {
  User,
  DollarSign,
  Star,
  Clock,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Loader2,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Image,
  StickyNote,
  MapPin,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { notificar } from '../../../../utils/notificaciones';
import { useTransaccionesStore } from '../../../../stores/useTransaccionesStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
import type { TransaccionPuntos } from '../../../../types/puntos';

// =============================================================================
// HELPERS
// =============================================================================

const formatearFechaCompleta = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatearMoneda = (valor: number) =>
  valor.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const formatearTelefono = (tel: string): string => {
  const limpio = tel.replace(/\s+/g, '');
  if (limpio.startsWith('+52') && limpio.length === 13) {
    return `+52 ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
  }
  if (limpio.startsWith('+') && limpio.length > 4) {
    const codigo = limpio.slice(0, 3);
    const resto = limpio.slice(3);
    return `${codigo} ${resto.slice(0, 3)} ${resto.slice(3)}`;
  }
  return tel;
};

const GRADIENTES_ESTADO = {
  confirmado: { bg: 'linear-gradient(135deg, #064e3b, #065f46)', shadow: 'rgba(5,150,105,0.4)' },
  pendiente: { bg: 'linear-gradient(135deg, #78350f, #92400e)', shadow: 'rgba(217,119,6,0.4)' },
  cancelado: { bg: 'linear-gradient(135deg, #7f1d1d, #991b1b)', shadow: 'rgba(220,38,38,0.4)' },
};

const ICONOS_ESTADO = {
  confirmado: <CheckCircle className="w-5 h-5 text-emerald-300" />,
  pendiente: <Clock className="w-5 h-5 text-amber-300" />,
  cancelado: <XCircle className="w-5 h-5 text-red-300" />,
};

const ETIQUETAS_ESTADO = {
  confirmado: 'Confirmada',
  pendiente: 'Pendiente',
  cancelado: 'Revocada',
};

// =============================================================================
// COMPONENTE: Fila de detalle
// =============================================================================

function FilaDetalle({
  icono,
  etiqueta,
  valor,
  valorColor,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string | React.ReactNode;
  valorColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        {icono}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">{etiqueta}</p>
        <p className={`text-sm lg:text-xs 2xl:text-sm font-semibold truncate ${valorColor || 'text-slate-800'}`}>
          {valor}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function ModalDetalleTransaccionBS({
  abierto,
  onCerrar,
  transaccion,
}: {
  abierto: boolean;
  onCerrar: () => void;
  transaccion: TransaccionPuntos | null;
}) {
  const [motivo, setMotivo] = useState('');
  const [mostrarRevocar, setMostrarRevocar] = useState(false);
  const [revocando, setRevocando] = useState(false);
  const [verImagen, setVerImagen] = useState(false);
  const revocarTransaccion = useTransaccionesStore((s) => s.revocarTransaccion);
  const totalSucursales = useAuthStore((s) => s.totalSucursales);
  const tieneSucursales = totalSucursales > 1;

  if (!abierto || !transaccion) return null;

  const tx = transaccion;
  const estado = tx.estado || 'confirmado';
  const gradiente = GRADIENTES_ESTADO[estado] || GRADIENTES_ESTADO.confirmado;
  const puedeRevocar = estado === 'confirmado';

  // ─── Handler revocar ───
  const handleRevocar = async () => {
    if (!motivo.trim()) {
      notificar.error('Escribe un motivo para revocar');
      return;
    }

    setRevocando(true);
    const exito = await revocarTransaccion(tx.id, motivo.trim());
    setRevocando(false);

    if (exito) {
      notificar.exito('Transacción revocada');
      setMotivo('');
      setMostrarRevocar(false);
      onCerrar();
    } else {
      notificar.error('No se pudo revocar la transacción');
    }
  };

  // ─── Cerrar y limpiar ───
  const handleCerrar = () => {
    setMotivo('');
    setMostrarRevocar(false);
    setVerImagen(false);
    onCerrar();
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={handleCerrar}
      ancho="md"
      mostrarHeader={false}
      paddingContenido="none"
      className="lg:max-w-sm 2xl:max-w-md"
    >
      {/* ── Header dark con estado ── */}
      <div
        className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4"
        style={{ background: gradiente.bg, boxShadow: `0 4px 16px ${gradiente.shadow}` }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-xl bg-white/15 flex items-center justify-center">
            <StickyNote className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base lg:text-sm 2xl:text-base">
              Detalle de Transacción
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {ICONOS_ESTADO[estado]}
              <span className="text-white/80 text-sm lg:text-xs 2xl:text-sm font-medium">
                {ETIQUETAS_ESTADO[estado]}
              </span>
            </div>
          </div>
          {/* Monto prominente */}
          <div className="text-right shrink-0">
            <p className="text-white/60 text-xs font-medium">Monto</p>
            <p className="text-white font-extrabold text-lg lg:text-base 2xl:text-lg">
              {formatearMoneda(tx.montoCompra)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Cuerpo con filas de detalle ── */}
      <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3">

        {/* Cliente + teléfono + ChatYA */}
        <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-100">
          <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">
              {tx.clienteNombre || 'Sin nombre'}
            </p>
            {tx.clienteTelefono && (
              <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-400">
                {formatearTelefono(tx.clienteTelefono)}
              </p>
            )}
          </div>
          {tx.clienteTelefono && (
            <button
              onClick={() => {/* TODO: integrar ChatYA cuando esté listo */ }}
              className="shrink-0 cursor-pointer"
              title="Contactar cliente por ChatYA"
            >
              <img src="/ChatYA.webp" alt="ChatYA" className="w-auto h-7 lg:w-auto lg:h-6 2xl:h-7 2xl:w-auto" />
            </button>
          )}
        </div>

        {/* Puntos + multiplicador inline */}
        <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-100">
          <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">Puntos otorgados</p>
            <div className="flex items-center gap-2">
              <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-amber-600">
                +{tx.puntosOtorgados.toLocaleString()} pts
              </span>
              {tx.multiplicadorAplicado > 1 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-semibold border border-emerald-100">
                  ×{tx.multiplicadorAplicado}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Concepto */}
        {tx.concepto && (
          <FilaDetalle
            icono={<DollarSign className="w-4 h-4 text-slate-500" />}
            etiqueta="Concepto"
            valor={tx.concepto}
          />
        )}

        {/* Operador + Sucursal en una fila */}
        {(tx.empleadoNombre || (tieneSucursales && tx.sucursalNombre)) && (
          <div className="flex items-start gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-100">
            <div className={`flex-1 min-w-0 ${tieneSucursales && tx.sucursalNombre ? 'grid grid-cols-2 gap-x-3' : ''}`}>
              {tx.empleadoNombre && (
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">Registró venta</p>
                    <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">{tx.empleadoNombre}</p>
                  </div>
                </div>
              )}
              {tieneSucursales && tx.sucursalNombre && (
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">Sucursal</p>
                    <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">{tx.sucursalNombre}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fecha */}
        {tx.createdAt && (
          <FilaDetalle
            icono={<Clock className="w-4 h-4 text-slate-400" />}
            etiqueta="Fecha y hora"
            valor={formatearFechaCompleta(tx.createdAt)}
          />
        )}

        {/* Nota + Nº orden inline (si existen) */}
        {(tx.nota || tx.numeroOrden) && (
          <div className="flex items-start gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-100">
            <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <StickyNote className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              {tx.nota && (
                <div>
                  <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">Nota</p>
                  <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800">{tx.nota}</p>
                </div>
              )}
              {tx.numeroOrden && (
                <div className={tx.nota ? 'mt-1' : ''}>
                  <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">Nº orden</p>
                  <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800">{tx.numeroOrden}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Desglose de métodos de pago */}
        {(tx.montoEfectivo > 0 || tx.montoTarjeta > 0 || tx.montoTransferencia > 0) && (
          <div className="py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 font-medium">Métodos de pago</p>
            </div>
            <div className="flex flex-wrap gap-2 ml-11 lg:ml-10 2xl:ml-11">
              {tx.montoEfectivo > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
                  <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-700">{formatearMoneda(tx.montoEfectivo)}</span>
                </span>
              )}
              {tx.montoTarjeta > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-100">
                  <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs font-semibold text-blue-700">{formatearMoneda(tx.montoTarjeta)}</span>
                </span>
              )}
              {tx.montoTransferencia > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-100">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-xs font-semibold text-violet-700">{formatearMoneda(tx.montoTransferencia)}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Foto del ticket */}
        {tx.fotoTicketUrl && (
          <div className="py-2.5 lg:py-2 2xl:py-2.5">
            {!verImagen ? (
              <button
                onClick={() => setVerImagen(true)}
                className="w-full py-2 rounded-lg border border-dashed border-slate-200 text-sm lg:text-xs 2xl:text-sm text-slate-500 font-medium hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Image className="w-4 h-4" />
                Ver foto del ticket
              </button>
            ) : (
              <img
                src={tx.fotoTicketUrl}
                alt="Ticket"
                className="w-full max-h-52 object-contain rounded-lg border border-slate-200 cursor-pointer"
                onClick={() => window.open(tx.fotoTicketUrl!, '_blank')}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Sección revocar (solo confirmado) ── */}
      {puedeRevocar && (
        <div className="px-4 lg:px-3 2xl:px-4 pb-4 lg:pb-3 2xl:pb-4">
          {!mostrarRevocar ? (
            <button
              onClick={() => setMostrarRevocar(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 lg:py-2 2xl:py-2.5 rounded-lg border-2 border-dashed border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              Revocar transacción
            </button>
          ) : (
            <div className="space-y-2.5 bg-red-50/50 rounded-xl p-3 lg:p-2.5 2xl:p-3 border border-red-100">
              <p className="text-xs text-red-600 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Esta acción no se puede deshacer
              </p>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo de revocación (obligatorio)..."
                rows={2}
                className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMostrarRevocar(false);
                    setMotivo('');
                  }}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRevocar}
                  disabled={revocando || !motivo.trim()}
                  className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {revocando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {revocando ? 'Revocando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mensaje si ya fue revocada */}
      {estado === 'cancelado' && (
        <div className="px-4 lg:px-3 2xl:px-4 pb-4 lg:pb-3 2xl:pb-4">
          <div className="rounded-lg bg-red-50 border border-red-100 p-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-600 font-semibold">Transacción revocada</p>
            </div>
            {tx.motivoRevocacion && (
              <p className="text-[12px] text-red-500 mt-1.5 ml-6">
                Motivo: {tx.motivoRevocacion}
              </p>
            )}
            <p className="text-[12px] text-red-400 mt-1 ml-6">
              Los puntos fueron devueltos al saldo del cliente.
            </p>
          </div>
        </div>
      )}
    </ModalAdaptativo>
  );
}