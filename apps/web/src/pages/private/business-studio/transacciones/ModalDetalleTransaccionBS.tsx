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

import { useState, useRef, useEffect } from 'react';
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
  Ticket,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { notificar } from '../../../../utils/notificaciones';
import { useRevocarTransaccion } from '../../../../hooks/queries/useTransacciones';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { usePuntosConfiguracion } from '../../../../hooks/queries/usePuntos';
import { useChatYAStore } from '../../../../stores/useChatYAStore';
import { useUiStore } from '../../../../stores/useUiStore';
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


const GRADIENTES_ESTADO = {
  confirmado: { bg: 'linear-gradient(135deg, #064e3b, #065f46)', shadow: 'rgba(5,150,105,0.4)' },
  pendiente: { bg: 'linear-gradient(135deg, #78350f, #92400e)', shadow: 'rgba(217,119,6,0.4)' },
  cancelado: { bg: 'linear-gradient(135deg, #7f1d1d, #991b1b)', shadow: 'rgba(220,38,38,0.4)' },
};

const ICONOS_ESTADO = {
  confirmado: <CheckCircle className="w-3.5 h-3.5" />,
  pendiente: <Clock className="w-3.5 h-3.5" />,
  cancelado: <XCircle className="w-3.5 h-3.5" />,
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
  colorFondo = 'bg-slate-200',
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string | React.ReactNode;
  valorColor?: string;
  colorFondo?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300 last:border-0">
      <div className={`w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg ${colorFondo} flex items-center justify-center shrink-0`}>
        {icono}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium">{etiqueta}</p>
        <p className={`text-base lg:text-sm 2xl:text-base font-semibold truncate ${valorColor || 'text-slate-800'}`}>
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
  const revocarRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al expandir sección de revocación (móvil)
  useEffect(() => {
    if (mostrarRevocar && revocarRef.current) {
      requestAnimationFrame(() => {
        revocarRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      });
    }
  }, [mostrarRevocar]);
  const { mutateAsync: revocarTransaccion } = useRevocarTransaccion();
  const totalSucursales = useAuthStore((s) => s.totalSucursales);
  const { data: configPuntos } = usePuntosConfiguracion();
  const nivelesActivos = configPuntos?.nivelesActivos ?? true;
  const tieneSucursales = totalSucursales > 1;
  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const abrirChatYA = useUiStore((s) => s.abrirChatYA);

  // ─── Handler ChatYA ───
  const handleContactarCliente = () => {
    if (!tx.clienteId) return;

    // Guardar datos antes de cerrar (el modal puede desmontarse)
    const datos = {
      id: tx.clienteId,
      nombre: tx.clienteNombre || 'Cliente',
      avatarUrl: tx.clienteAvatarUrl ?? null,
    };

    // Limpiar la entrada _modalBottom del historial antes de abrir ChatYA.
    if (history.state?._modalBottom) {
      const estado = { ...history.state };
      delete estado._modalBottom;
      history.replaceState(estado, '');
    }

    handleCerrar();
    setTimeout(() => {
      abrirChatTemporal({
        id: `temp_${Date.now()}`,
        otroParticipante: {
          id: datos.id,
          nombre: datos.nombre,
          apellidos: '',
          avatarUrl: datos.avatarUrl,
        },
        datosCreacion: {
          participante2Id: datos.id,
          participante2Modo: 'personal',
          contextoTipo: 'directo',
        },
      });
      abrirChatYA();
    }, 300);
  };

  if (!abierto || !transaccion) return null;

  const tx = transaccion;
  const estado = tx.estado || 'confirmado';
  const esCupon = !!tx.cuponTitulo;
  // Cupones: header slate oscuro, Ventas: según estado
  const gradiente = esCupon && estado === 'confirmado'
    ? { bg: 'linear-gradient(135deg, #1e293b, #334155)', shadow: 'rgba(30,41,59,0.4)' }
    : GRADIENTES_ESTADO[estado] || GRADIENTES_ESTADO.confirmado;
  const puedeRevocar = estado === 'confirmado' && !esCupon;

  // ─── Handler revocar ───
  const handleRevocar = async () => {
    if (!motivo.trim()) {
      notificar.error('Escribe un motivo para revocar');
      return;
    }

    setRevocando(true);
    try {
      await revocarTransaccion({ id: tx.id, motivo: motivo.trim() });
      notificar.exito('Transacción revocada');
      setMotivo('');
      setMostrarRevocar(false);
      onCerrar();
    } catch {
      notificar.error('No se pudo revocar la transacción');
    } finally {
      setRevocando(false);
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
      sinScrollInterno
      className={`lg:max-w-sm 2xl:max-w-md max-lg:[background:linear-gradient(180deg,${estado === 'confirmado' ? '#064e3b' : estado === 'cancelado' ? '#7f1d1d' : '#78350f'}_2.5rem,rgb(248,250,252)_2.5rem)]`}
    >
      <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh]">
      {/* ── Header dark con estado ── */}
      <div
        className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl 2xl:rounded-t-2xl"
        style={{ background: gradiente.bg, boxShadow: `0 4px 16px ${gradiente.shadow}` }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-2">
          {/* Textos */}
          <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-white shrink-0" />
              <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                {tx.clienteNombre || 'Sin nombre'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-white shrink-0" />
              <span className="text-base lg:text-sm 2xl:text-base text-white font-semibold">
                {formatearMoneda(tx.montoCompra)}
              </span>
            </div>
          </div>
          {/* ChatYA — centrado verticalmente entre las 2 líneas */}
          {tx.clienteId && (
            <button
              onClick={(e) => { e.stopPropagation(); handleContactarCliente(); }}
              className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity p-2 -m-2"
            >
              <img src="/ChatYA.webp" alt="ChatYA" className="w-auto h-10 lg:h-8 2xl:h-10" />
            </button>
          )}
        </div>
      </div>

      {/* ── Cuerpo con scroll ── */}
      <div className="flex-1 overflow-y-auto">
      <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-2">

        {/* Cupón aplicado (si tiene) */}
        {tx.cuponTitulo && (
          <div className="py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300">
            <div className="rounded-lg overflow-hidden border-2 border-blue-200">
              <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-3 py-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2.5 bg-blue-50">
                <div className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Ticket className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base lg:text-sm 2xl:text-base font-bold text-blue-800">
                    {tx.montoCompra === 0 ? 'Gratis' : tx.cuponTipo === 'porcentaje' ? `${tx.cuponValor}% de descuento` : tx.cuponTipo === 'monto_fijo' ? `$${tx.cuponValor} de descuento` : tx.cuponTipo === '2x1' ? '2×1' : tx.cuponTipo === '3x2' ? '3×2' : tx.cuponTipo === 'envio_gratis' ? 'Envío gratis' : tx.cuponTipo === 'otro' ? (tx.cuponValor || 'Otro') : 'Cupón'}
                  </p>
                  <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium truncate">{tx.cuponTitulo}</p>
                </div>
                {tx.cuponImagen && (
                  <img src={tx.cuponImagen} alt="" className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-lg object-cover shrink-0 border border-blue-200" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Desglose de montos */}
        <div className="py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300">
          {/* Subtotal (solo si hay cupón con descuento) */}
          {esCupon && Number(tx.cuponDescuento) > 0 && (
            <div className="flex items-center justify-between py-1">
              <span className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-700">Subtotal</span>
              <span className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-700">{formatearMoneda(tx.montoCompra + Number(tx.cuponDescuento))}</span>
            </div>
          )}
          {esCupon && Number(tx.cuponDescuento) > 0 && (
            <div className="flex items-center justify-between py-1">
              <span className="text-base lg:text-sm 2xl:text-base font-semibold text-blue-600">Descuento cupón</span>
              <div className="flex items-center gap-1">
                <Ticket className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
                <span className="text-base lg:text-sm 2xl:text-base font-bold text-blue-600">-{formatearMoneda(Number(tx.cuponDescuento))}</span>
              </div>
            </div>
          )}
          {/* Total cobrado / Monto total */}
          <div className="flex items-center justify-between py-1">
            <span className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-700">
              {esCupon && Number(tx.cuponDescuento) > 0 ? 'Total cobrado' : 'Monto total'}
            </span>
            <span className={`text-xl lg:text-lg 2xl:text-xl font-bold ${estado === 'cancelado' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {formatearMoneda(tx.montoCompra)}
            </span>
          </div>
        </div>

        {/* Método de pago */}
        {(tx.montoEfectivo > 0 || tx.montoTarjeta > 0 || tx.montoTransferencia > 0) && (
          <div className="py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300">
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-slate-600" />
              </div>
              <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium">Método de pago</p>
            </div>
            <div className="flex flex-wrap gap-2 ml-11 lg:ml-10 2xl:ml-11">
              {tx.montoEfectivo > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-base lg:text-sm 2xl:text-base font-semibold text-emerald-700">{formatearMoneda(tx.montoEfectivo)}</span>
                </span>
              )}
              {tx.montoTarjeta > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100">
                  <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-base lg:text-sm 2xl:text-base font-semibold text-blue-700">{formatearMoneda(tx.montoTarjeta)}</span>
                </span>
              )}
              {tx.montoTransferencia > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-100">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-violet-600" />
                  <span className="text-base lg:text-sm 2xl:text-base font-semibold text-violet-700">{formatearMoneda(tx.montoTransferencia)}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Puntos + multiplicador + badge estado */}
        <div className="flex items-center gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300">
          <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Star className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium">Puntos otorgados</p>
            <div className="flex items-center gap-2">
              <span className="text-base lg:text-sm 2xl:text-base font-bold text-amber-600">
                +{tx.puntosOtorgados.toLocaleString()} pts
              </span>
              {nivelesActivos && tx.multiplicadorAplicado > 1 && (
                <span className="text-base lg:text-sm 2xl:text-base px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                  ×{tx.multiplicadorAplicado}
                </span>
              )}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-base lg:text-sm 2xl:text-base font-semibold shrink-0 ${
            estado === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
            estado === 'cancelado' ? 'bg-red-100 text-red-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {ICONOS_ESTADO[estado]}
            {ETIQUETAS_ESTADO[estado]}
          </span>
        </div>

        {/* Concepto */}
        {tx.concepto && (
          <FilaDetalle
            icono={<DollarSign className="w-4 h-4 text-slate-600" />}
            etiqueta="Concepto"
            valor={tx.concepto}
          />
        )}

        {/* Operador + Sucursal */}
        {(tx.empleadoNombre || (tieneSucursales && tx.sucursalNombre)) && (
          <div className="flex items-start gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300">
            <div className={`flex-1 min-w-0 ${tieneSucursales && tx.sucursalNombre ? 'grid grid-cols-2 gap-x-3' : ''}`}>
              {tx.empleadoNombre && (
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium">Atendido por</p>
                    <p className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-800 truncate">{tx.empleadoNombre}</p>
                  </div>
                </div>
              )}
              {tieneSucursales && tx.sucursalNombre && (
                <div className="flex items-start gap-2 min-w-0">
                  <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium">Sucursal</p>
                    <p className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-800 truncate">{tx.sucursalNombre}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fecha */}
        {tx.createdAt && (
          <FilaDetalle
            icono={<Clock className="w-4 h-4 text-slate-600" />}
            etiqueta="Fecha y hora"
            valor={formatearFechaCompleta(tx.createdAt)}
          />
        )}

        {/* Nota + Nº orden */}
        {(tx.nota || tx.numeroOrden) && (
          <div className="flex items-start gap-3 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300">
            <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <StickyNote className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              {tx.nota && (
                <div>
                  <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium">Nota</p>
                  <p className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-800">{tx.nota}</p>
                </div>
              )}
              {tx.numeroOrden && (
                <div className={tx.nota ? 'mt-1' : ''}>
                  <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium">Nº orden</p>
                  <p className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-800">{tx.numeroOrden}</p>
                </div>
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
                className="w-full py-2 rounded-lg border-2 border-dashed border-slate-300 text-base lg:text-sm 2xl:text-base text-slate-600 font-medium hover:bg-slate-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Image className="w-4 h-4" />
                Ver foto del ticket
              </button>
            ) : (
              <img
                src={tx.fotoTicketUrl}
                alt="Ticket"
                className="w-full max-h-52 object-contain rounded-lg border-2 border-slate-300 cursor-pointer"
                onClick={() => window.open(tx.fotoTicketUrl!, '_blank')}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Sección revocar (solo confirmado) ── */}
      {puedeRevocar && (
        <div ref={revocarRef} className="px-4 lg:px-3 2xl:px-4 pb-4 lg:pb-3 2xl:pb-4">
          {!mostrarRevocar ? (
            <button
              onClick={() => setMostrarRevocar(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 lg:py-2 2xl:py-2.5 rounded-lg border-2 border-dashed border-red-300 text-red-600 text-base lg:text-sm 2xl:text-base font-semibold hover:bg-red-200 transition-colors cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              Revocar transacción
            </button>
          ) : (
            <div className="space-y-2.5 bg-red-100 rounded-xl p-3 lg:p-2.5 2xl:p-3 border-2 border-red-300">
              <p className="text-base lg:text-sm 2xl:text-base text-red-600 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Esta acción no se puede deshacer
              </p>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo de revocación (obligatorio)..."
                rows={2}
                className="w-full rounded-lg border-2 border-red-300 bg-white px-3 py-2 text-base lg:text-sm 2xl:text-base text-slate-800 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setMostrarRevocar(false);
                    setMotivo('');
                  }}
                  className="flex-1 py-2 rounded-lg border-2 border-red-300 text-red-600 text-base lg:text-sm 2xl:text-base font-medium hover:bg-red-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRevocar}
                  disabled={revocando || !motivo.trim()}
                  className="flex-1 py-2 rounded-lg bg-red-500 text-white text-base lg:text-sm 2xl:text-base font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
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
          <div className="rounded-lg bg-red-100 border-2 border-red-300 p-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-base lg:text-sm 2xl:text-base text-red-600 font-semibold">Transacción revocada</p>
            </div>
            {tx.motivoRevocacion && (
              <p className="text-base lg:text-sm 2xl:text-base text-red-600 font-medium mt-1.5 ml-6">
                Motivo: {tx.motivoRevocacion}
              </p>
            )}
            <p className="text-base lg:text-sm 2xl:text-base text-red-600 font-medium mt-1 ml-6">
              Se descontaron {tx.puntosOtorgados.toLocaleString()} pts del saldo del cliente.
            </p>
          </div>
        </div>
      )}
      </div>{/* cierre overflow-y-auto */}
      </div>{/* cierre flex-col */}
    </ModalAdaptativo>
  );
}