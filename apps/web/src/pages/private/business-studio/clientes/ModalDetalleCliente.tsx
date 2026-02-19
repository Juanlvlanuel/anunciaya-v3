/**
 * ModalDetalleCliente.tsx
 * ========================
 * Modal de detalle de un cliente para Business Studio.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/clientes/ModalDetalleCliente.tsx
 *
 * SECCIONES:
 *   - Header: Avatar, nombre, teléfono, correo, badge nivel, botón ChatYA
 *   - Puntos: Disponibles, acumulados, canjeados + barra progreso
 *   - Estadísticas: Total gastado, promedio, visitas, vouchers
 *   - Últimas transacciones: 5 más recientes + botón "Ver historial completo"
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  Crown,
  Medal,
  Shield,
  Coins,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  BarChart3,
  Ticket,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { useClientesStore } from '../../../../stores/useClientesStore';

// =============================================================================
// HELPERS
// =============================================================================

const formatearMoneda = (valor: number) =>
  valor.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

const formatearTelefono = (tel: string): string => {
  const limpio = tel.replace(/\s+/g, '');
  if (limpio.startsWith('+52') && limpio.length === 13) {
    return `+52 ${limpio.slice(3, 6)} ${limpio.slice(6, 9)} ${limpio.slice(9)}`;
  }
  return tel;
};

const formatearFechaCorta = (fechaISO: string | null) => {
  if (!fechaISO) return '—';
  const fecha = new Date(fechaISO);
  return fecha.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatearFechaTransaccion = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Ayer';
  if (diffDias < 7) return `Hace ${diffDias}d`;
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

// =============================================================================
// COMPONENTES AUXILIARES
// =============================================================================

/** Badge de nivel con icono y color */
function BadgeNivel({ nivel }: { nivel: string }) {
  const config: Record<string, { icono: React.ReactNode; color: string; bg: string }> = {
    oro: { icono: <Crown className="w-4 h-4" />, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
    plata: { icono: <Medal className="w-4 h-4" />, color: 'text-slate-500', bg: 'bg-slate-100 border-slate-300' },
    bronce: { icono: <Shield className="w-4 h-4" />, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  };
  const { icono, color, bg } = config[nivel?.toLowerCase()] || config.bronce;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${bg} ${color}`}>
      {icono}
      <span className="capitalize">{nivel}</span>
    </span>
  );
}

/** Card de estadística individual */
function CardEstadistica({
  icono,
  etiqueta,
  valor,
  colorIcono,
}: {
  icono: React.ReactNode;
  etiqueta: string;
  valor: string | number;
  colorIcono: string;
}) {
  return (
    <div className="flex items-center gap-2.5 p-3 lg:p-2 2xl:p-3 rounded-lg bg-slate-50 border border-slate-100">
      <div className={`w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg flex items-center justify-center shrink-0 ${colorIcono}`}>
        {icono}
      </div>
      <div className="min-w-0">
        <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-500 font-medium uppercase tracking-wide">{etiqueta}</p>
        <p className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800 truncate">{valor}</p>
      </div>
    </div>
  );
}

/** Fila de transacción mini */
function FilaTransaccion({
  monto,
  puntos,
  concepto,
  fecha,
}: {
  monto: number;
  puntos: number;
  concepto: string | null;
  fecha: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2 lg:py-1.5 2xl:py-2 border-b border-slate-100 last:border-0">
      <div className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
        <ShoppingBag className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-emerald-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800">
            {formatearMoneda(monto)}
          </span>
          <span className="text-xs lg:text-[11px] 2xl:text-xs font-bold text-emerald-600">
            +{puntos.toLocaleString()} pts
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs lg:text-[11px] 2xl:text-xs text-slate-500 truncate">
            {concepto || 'Compra'}
          </span>
          <span className="text-xs lg:text-[11px] 2xl:text-xs text-slate-400 shrink-0">
            {formatearFechaTransaccion(fecha)}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function ModalDetalleCliente({
  abierto,
  onCerrar,
  clienteId,
}: {
  abierto: boolean;
  onCerrar: () => void;
  clienteId: string | null;
}) {
  const navigate = useNavigate();
  const {
    clienteDetalle,
    historialCliente,
    cargandoDetalle,
    cargandoHistorial,
    cargarDetalleCliente,
    cargarHistorialCliente,
    limpiarDetalle,
  } = useClientesStore();

  // Cargar datos al abrir
  useEffect(() => {
    if (abierto && clienteId) {
      cargarDetalleCliente(clienteId);
      cargarHistorialCliente(clienteId);
    }
  }, [abierto, clienteId]);

  // Limpiar al cerrar
  const handleCerrar = () => {
    limpiarDetalle();
    onCerrar();
  };

  // Navegar a transacciones filtradas
  const handleVerHistorial = () => {
    if (clienteDetalle?.nombre) {
      handleCerrar();
      navigate(`/business-studio/transacciones?busqueda=${encodeURIComponent(clienteDetalle.nombre)}`);
    }
  };

  // Abrir ChatYA (placeholder)
  const handleContactar = () => {
    // TODO: Implementar apertura de ChatYA con este cliente
    console.log('Contactar cliente:', clienteDetalle?.telefono);
  };

  if (!abierto) return null;

  const cliente = clienteDetalle;
  const cargando = cargandoDetalle || !cliente;

  // Calcular progreso al siguiente nivel usando configuración real del negocio
  const calcularProgreso = () => {
    if (!cliente) return { porcentaje: 0, siguienteNivel: '', puntosFaltantes: 0 };

    const total = cliente.puntosAcumuladosTotal;
    const nivel = cliente.nivelActual?.toLowerCase();
    const config = cliente.configNiveles;

    // Sin configuración: no mostrar barra de progreso
    if (!config) return { porcentaje: 100, siguienteNivel: '', puntosFaltantes: 0 };

    if (nivel === 'bronce') {
      const max = config.bronceMax;
      const porcentaje = Math.min((total / max) * 100, 100);
      return { 
        porcentaje, 
        siguienteNivel: 'Plata', 
        puntosFaltantes: Math.max(config.plataMin - total, 0) 
      };
    }
    if (nivel === 'plata') {
      const min = config.plataMin;
      const max = config.plataMax;
      const rango = max - min;
      const progreso = total - min;
      const porcentaje = Math.min((progreso / rango) * 100, 100);
      return { 
        porcentaje, 
        siguienteNivel: 'Oro', 
        puntosFaltantes: Math.max(config.oroMin - total, 0) 
      };
    }
    // Oro: nivel máximo
    return { porcentaje: 100, siguienteNivel: '', puntosFaltantes: 0 };
  };

  const progreso = calcularProgreso();

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={handleCerrar}
      ancho="md"
      mostrarHeader={false}
      paddingContenido="none"
      className="lg:max-w-md 2xl:max-w-lg"
    >
      {/* ================================================================== */}
      {/* LOADING                                                           */}
      {/* ================================================================== */}
      {cargando && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* ================================================================== */}
      {/* CONTENIDO                                                         */}
      {/* ================================================================== */}
      {!cargando && cliente && (
        <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh]">
          {/* ── Header con gradiente (FIJO) ── */}
          <div
            className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4 shrink-0"
            style={{
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
            }}
          >
            {/* Círculos decorativos */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />

            <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
              {/* Avatar */}
              <div className="w-14 h-14 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0 overflow-hidden">
                {cliente.avatarUrl ? (
                  <img src={cliente.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-white/80" />
                )}
              </div>

              {/* Info cliente */}
              <div className="flex-1 min-w-0">
                {/* Línea 1: Nombre + Badge */}
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg lg:text-base 2xl:text-lg font-bold text-white truncate">
                    {cliente.nombre}
                  </h3>
                  <BadgeNivel nivel={cliente.nivelActual} />
                </div>

                {/* Línea 2: Teléfono + ChatYA */}
                {cliente.telefono && (
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="w-3.5 h-3.5 text-white/60 shrink-0" />
                    <span className="text-sm lg:text-xs 2xl:text-sm text-white font-medium">
                      {formatearTelefono(cliente.telefono)}
                    </span>
                    <button
                      onClick={handleContactar}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="h-6 lg:h-5 2xl:h-6" />
                    </button>
                  </div>
                )}

                {/* Línea 3: Correo + Desde */}
                <div className="flex items-center gap-2 mt-0.5 text-sm lg:text-xs 2xl:text-sm text-white/80">
                  {cliente.correo && (
                    <>
                      <Mail className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      <span className="truncate">{cliente.correo}</span>
                    </>
                  )}
                  {cliente.correo && cliente.clienteDesde && (
                    <span className="text-white/40">•</span>
                  )}
                  {cliente.clienteDesde && (
                    <span className="shrink-0">Desde {formatearFechaCorta(cliente.clienteDesde)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Contenido con scroll ── */}
          <div className="flex-1 overflow-y-auto">
            {/* ── Sección Puntos ── */}
            <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-2.5 lg:mb-2 2xl:mb-2.5">
                <Coins className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700">Puntos</h4>
              </div>

              {/* 3 Cards de puntos */}
              <div className="grid grid-cols-3 gap-2 lg:gap-1.5 2xl:gap-2">
                <div className="text-center p-2.5 lg:p-2 2xl:p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-lg lg:text-base 2xl:text-lg font-bold text-emerald-600">
                    {cliente.puntosDisponibles.toLocaleString()}
                  </p>
                  <p className="text-xs lg:text-[11px] 2xl:text-xs text-emerald-600/70 font-medium">Disponibles</p>
                </div>
                <div className="text-center p-2.5 lg:p-2 2xl:p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-lg lg:text-base 2xl:text-lg font-bold text-blue-600">
                    {cliente.puntosAcumuladosTotal.toLocaleString()}
                  </p>
                  <p className="text-xs lg:text-[11px] 2xl:text-xs text-blue-600/70 font-medium">Acumulados</p>
                </div>
                <div className="text-center p-2.5 lg:p-2 2xl:p-2.5 rounded-lg bg-violet-50 border border-violet-100">
                  <p className="text-lg lg:text-base 2xl:text-lg font-bold text-violet-600">
                    {cliente.puntosCanjeadosTotal.toLocaleString()}
                  </p>
                  <p className="text-xs lg:text-[11px] 2xl:text-xs text-violet-600/70 font-medium">Canjeados</p>
                </div>
              </div>

              {/* Barra de progreso */}
              {progreso.siguienteNivel ? (
                <div className="mt-2.5 lg:mt-2 2xl:mt-2.5">
                  <div className="flex items-center justify-between text-sm lg:text-xs 2xl:text-sm mb-1">
                    <span className="text-slate-500">Progreso a {progreso.siguienteNivel}</span>
                    <span className="font-semibold text-slate-700">{progreso.porcentaje.toFixed(2)}%</span>
                  </div>
                  <div className="h-2 lg:h-1.5 2xl:h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        cliente.nivelActual?.toLowerCase() === 'plata'
                          ? 'bg-gradient-to-r from-slate-500 to-slate-400'
                          : 'bg-gradient-to-r from-amber-600 to-amber-500'
                      }`}
                      style={{ width: `${progreso.porcentaje}%` }}
                    />
                  </div>
                  <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-400 mt-1">
                    Faltan {progreso.puntosFaltantes.toLocaleString()} pts para {progreso.siguienteNivel}
                  </p>
                </div>
              ) : (
                <div className="mt-2.5 lg:mt-2 2xl:mt-2.5">
                  <div className="flex items-center justify-between text-sm lg:text-xs 2xl:text-sm mb-1">
                    <span className="text-yellow-600 font-medium">¡Nivel máximo alcanzado!</span>
                    <span className="font-semibold text-yellow-600">100%</span>
                  </div>
                  <div className="h-2 lg:h-1.5 2xl:h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Sección Estadísticas ── */}
            <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-2.5 lg:mb-2 2xl:mb-2.5">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <h4 className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700">Estadísticas</h4>
              </div>

              <div className="grid grid-cols-2 gap-2 lg:gap-1.5 2xl:gap-2">
                <CardEstadistica
                  icono={<DollarSign className="w-4 h-4 text-emerald-500" />}
                  etiqueta="Total gastado"
                  valor={formatearMoneda(cliente.totalGastado)}
                  colorIcono="bg-emerald-100"
                />
                <CardEstadistica
                  icono={<TrendingUp className="w-4 h-4 text-blue-500" />}
                  etiqueta="Promedio"
                  valor={formatearMoneda(cliente.promedioCompra)}
                  colorIcono="bg-blue-100"
                />
                <CardEstadistica
                  icono={<ShoppingBag className="w-4 h-4 text-violet-500" />}
                  etiqueta="Visitas"
                  valor={cliente.totalVisitas}
                  colorIcono="bg-violet-100"
                />
                <CardEstadistica
                  icono={<Ticket className="w-4 h-4 text-amber-500" />}
                  etiqueta="Vouchers"
                  valor={`${cliente.vouchersUsados}/${cliente.totalVouchers} usados`}
                  colorIcono="bg-amber-100"
                />
              </div>
            </div>

            {/* ── Sección Últimas Transacciones ── */}
            <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-3">
              <div className="flex items-center justify-between mb-2.5 lg:mb-2 2xl:mb-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h4 className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700">Últimas transacciones</h4>
                </div>
                {historialCliente.length > 0 && (
                  <span className="text-xs lg:text-[11px] 2xl:text-xs text-slate-400">
                    {historialCliente.length} recientes
                  </span>
                )}
              </div>

              {/* Loading historial */}
              {cargandoHistorial && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                </div>
              )}

              {/* Sin transacciones */}
              {!cargandoHistorial && historialCliente.length === 0 && (
                <div className="text-center py-4">
                  <ShoppingBag className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-sm text-slate-400">Sin transacciones recientes</p>
                </div>
              )}

              {/* Lista de transacciones (máx 5) */}
              {!cargandoHistorial && historialCliente.length > 0 && (
                <div className="space-y-0">
                  {historialCliente.slice(0, 5).map((tx) => (
                    <FilaTransaccion
                      key={tx.id}
                      monto={tx.montoCompra}
                      puntos={tx.puntosOtorgados}
                      concepto={tx.concepto}
                      fecha={tx.createdAt || ''}
                    />
                  ))}
                </div>
              )}

              {/* Botón ver historial completo */}
              {historialCliente.length > 0 && (
                <button
                  onClick={handleVerHistorial}
                  className="w-full mt-3 lg:mt-2 2xl:mt-3 py-2.5 lg:py-2 2xl:py-2.5 rounded-lg border border-slate-200 text-sm lg:text-xs 2xl:text-sm text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  Ver historial completo
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ModalAdaptativo>
  );
}