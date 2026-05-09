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

import { useNavegarASeccion } from '../../../../hooks/useNavegarASeccion';
import {
  User,
  Phone,
  Mail,
  Crown,
  Medal,
  Shield,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Ticket,
  Clock,
  Calendar,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import { useClienteDetalle, useClienteHistorial } from '../../../../hooks/queries/useClientes';
import { useChatYAStore } from '../../../../stores/useChatYAStore';
import { useUiStore } from '../../../../stores/useUiStore';
import { usePuntosConfiguracion } from '../../../../hooks/queries/usePuntos';

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
    oro: { icono: <Crown className="w-3.5 h-3.5" />, color: 'text-yellow-700', bg: 'bg-yellow-100' },
    plata: { icono: <Medal className="w-3.5 h-3.5" />, color: 'text-slate-700', bg: 'bg-slate-200' },
    bronce: { icono: <Shield className="w-3.5 h-3.5" />, color: 'text-amber-700', bg: 'bg-amber-100' },
  };
  const { icono, color, bg } = config[nivel?.toLowerCase()] || config.bronce;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-base lg:text-sm 2xl:text-base font-bold ${bg} ${color}`}>
      {icono}
      <span className="capitalize">{nivel}</span>
    </span>
  );
}

/** Celda de estadística compacta */
function CeldaEstadistica({
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
    <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
      <div className={`w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0 ${colorIcono}`}>
        {icono}
      </div>
      <div className="min-w-0">
        <p className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800 truncate">{valor}</p>
        <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium leading-tight">{etiqueta}</p>
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
  estado,
  cuponTitulo,
}: {
  monto: number;
  puntos: number;
  concepto: string | null;
  fecha: string;
  estado: 'confirmado' | 'pendiente' | 'cancelado';
  cuponTitulo?: string | null;
}) {
  const revocada = estado === 'cancelado';
  const esCupon = !!cuponTitulo;
  const iconBg = revocada ? 'bg-slate-200' : esCupon ? 'bg-blue-100' : 'bg-emerald-100';
  const iconColor = revocada ? 'text-slate-400' : esCupon ? 'text-blue-600' : 'text-emerald-600';
  const Icono = esCupon ? Ticket : ShoppingBag;
  return (
    <div className="flex items-center gap-2.5 py-2 lg:py-1.5 2xl:py-2 border-b border-slate-300 last:border-0">
      <div className={`w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icono className={`w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-base lg:text-sm 2xl:text-base font-semibold shrink-0 ${revocada ? 'line-through text-slate-400' : 'text-slate-800'}`}>
              {formatearMoneda(monto)}
            </span>
            {esCupon && !revocada && (
              <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm font-bold bg-blue-100 text-blue-600">
                <Ticket className="w-4 h-4" />
                cupón
              </span>
            )}
          </div>
          <span className={`text-base lg:text-sm 2xl:text-base font-bold shrink-0 ${revocada ? 'line-through text-slate-400' : 'text-emerald-600'}`}>
            +{puntos.toLocaleString()} pts
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            {revocada && (
              <span className="shrink-0 inline-flex items-center px-1.5 py-0 rounded text-[10px] lg:text-[10px] font-bold bg-red-100 text-red-600">
                Revocada
              </span>
            )}
            <span className={`text-base lg:text-sm 2xl:text-base font-medium truncate ${revocada ? 'text-slate-400' : 'text-slate-600'}`}>
              {concepto || cuponTitulo || 'Compra'}
            </span>
          </div>
          <span className={`text-base lg:text-sm 2xl:text-base font-medium shrink-0 ${revocada ? 'text-slate-400' : 'text-slate-600'}`}>
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
  onVerHistorial,
}: {
  abierto: boolean;
  onCerrar: () => void;
  clienteId: string | null;
  onVerHistorial?: (nombre: string) => void;
}) {
  // Para "Ver historial completo" → /business-studio/transacciones:
  // detecta el salto entre módulos hermanos de BS y aplica replace, así
  // el back nativo desde /transacciones regresa a /inicio (no a /clientes).
  const navegarASeccion = useNavegarASeccion();

  // ─── Queries — React Query fetcha automáticamente al cambiar clienteId ────
  const detalleQuery = useClienteDetalle(clienteId);
  const historialQuery = useClienteHistorial(clienteId);

  const clienteDetalle = detalleQuery.data ?? null;
  const historialCliente = historialQuery.data ?? [];
  const cargandoDetalle = detalleQuery.isPending;
  const cargandoHistorial = historialQuery.isPending;

  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const abrirChatYA = useUiStore((s) => s.abrirChatYA);
  const { data: configPuntos } = usePuntosConfiguracion();
  const nivelesActivos = configPuntos?.nivelesActivos ?? true;

  // Cerrar modal (no limpia datos para evitar flash al reabrir mismo cliente)
  const handleCerrar = () => {
    onCerrar();
  };

  // Navegar a transacciones filtradas.
  // `handleCerrar` hace `history.back()` síncrono (limpia la entrada
  // empujada por ModalBottom), y luego `navegarASeccion` detecta el salto
  // entre módulos hermanos de BS (/clientes → /transacciones) y aplica
  // replace. Resultado: stack queda `[/inicio, /transacciones]` y el back
  // nativo del celular regresa a /inicio en lugar de a /clientes.
  const handleVerHistorial = () => {
    if (clienteDetalle?.nombre) {
      if (onVerHistorial) {
        onVerHistorial(clienteDetalle.nombre);
      } else {
        handleCerrar();
        navegarASeccion(`/business-studio/transacciones?busqueda=${encodeURIComponent(clienteDetalle.nombre)}`);
      }
    }
  };

  // Abrir ChatYA con este cliente
  const handleContactar = () => {
    if (!clienteDetalle?.id) return;

    // Guardar datos antes de cerrar (el modal puede desmontarse)
    const datos = {
      id: clienteDetalle.id,
      nombre: clienteDetalle.nombre,
      avatarUrl: clienteDetalle.avatarUrl ?? null,
    };

    // Limpiar entrada huérfana de ModalBottom en el historial
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
      sinScrollInterno
      alturaMaxima="xl"
      className="lg:max-w-md 2xl:max-w-lg"
      headerOscuro
    >
      {/* ================================================================== */}
      {/* LOADING                                                           */}
      {/* ================================================================== */}
      {cargando && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      )}

      {/* ================================================================== */}
      {/* CONTENIDO                                                         */}
      {/* ================================================================== */}
      {!cargando && cliente && (
        <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh]">
          {/* ── Header con gradiente (FIJO) ── */}
          <div
            className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl 2xl:rounded-t-2xl"
            style={{
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
            }}
          >
            {/* Círculos decorativos */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />

            <div className="relative flex items-center gap-2">
              {/* Textos */}
              <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-white shrink-0" />
                  <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">
                    {cliente.nombre}
                  </h3>
                </div>
                {cliente.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-white shrink-0" />
                    <span className="text-base lg:text-sm 2xl:text-base text-white font-semibold">
                      {formatearTelefono(cliente.telefono)}
                    </span>
                  </div>
                )}
              </div>
              {/* ChatYA — centrado verticalmente */}
              <button
                onClick={(e) => { e.stopPropagation(); handleContactar(); }}
                className="shrink-0 cursor-pointer hover:opacity-80 transition-opacity p-2 -m-2"
              >
                <img src="/ChatYA.webp" alt="ChatYA" className="w-auto h-10 lg:h-8 2xl:h-10" />
              </button>
            </div>
          </div>

          {/* ── Contenido con scroll ── */}
          <div className="flex-1 overflow-y-auto">
            {/* ── Correo + Miembro Desde ── */}
            {(cliente.correo || cliente.clienteDesde) && (
              <div className="px-4 lg:px-3 2xl:px-4 py-2.5 lg:py-2 2xl:py-2.5 border-b border-slate-300 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1 lg:gap-2">
                {cliente.correo && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-5 h-5 lg:w-4 lg:h-4 text-slate-500 shrink-0" />
                    <span className="text-base lg:text-sm font-medium text-slate-600 truncate">{cliente.correo}</span>
                  </div>
                )}
                {cliente.clienteDesde && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Calendar className="w-5 h-5 lg:w-4 lg:h-4 text-slate-500 shrink-0" />
                    <span className="text-base lg:text-sm font-medium text-slate-600">
                      Miembro desde {formatearFechaCorta(cliente.clienteDesde)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* ── Sección Puntos ── */}
            <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-2 border-b border-slate-300">
              {/* 3 puntos en fila compacta */}
              <div className="grid grid-cols-3 text-center">
                <div>
                  <p className="text-base lg:text-sm 2xl:text-base font-bold text-emerald-600">
                    {cliente.puntosDisponibles.toLocaleString()}
                  </p>
                  <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium">Disponibles</p>
                </div>
                <div className="border-x border-slate-300">
                  <p className="text-base lg:text-sm 2xl:text-base font-bold text-blue-600">
                    {cliente.puntosAcumuladosTotal.toLocaleString()}
                  </p>
                  <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium">Acumulados</p>
                </div>
                <div>
                  <p className="text-base lg:text-sm 2xl:text-base font-bold text-violet-600">
                    {cliente.puntosCanjeadosTotal.toLocaleString()}
                  </p>
                  <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium">Canjeados</p>
                </div>
              </div>

              {/* Barra de progreso + Badges nivel */}
              {nivelesActivos && (progreso.siguienteNivel ? (
                <div className="mt-2.5 lg:mt-2 2xl:mt-2.5">
                  <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                    <BadgeNivel nivel={cliente.nivelActual} />
                    <div className="flex-1 min-w-0">
                      <div className="h-2.5 lg:h-2 2xl:h-2.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            cliente.nivelActual?.toLowerCase() === 'plata'
                              ? 'bg-linear-to-r from-slate-500 to-slate-400'
                              : 'bg-linear-to-r from-amber-600 to-amber-500'
                          }`}
                          style={{ width: `${progreso.porcentaje}%` }}
                        />
                      </div>
                    </div>
                    <BadgeNivel nivel={progreso.siguienteNivel} />
                  </div>
                  <p className="text-base lg:text-sm 2xl:text-base font-medium text-slate-600 mt-1 text-center">
                    {progreso.porcentaje.toFixed(0)}% — Faltan {progreso.puntosFaltantes.toLocaleString()} pts para {progreso.siguienteNivel}
                  </p>
                </div>
              ) : (
                <div className="mt-2.5 lg:mt-2 2xl:mt-2.5">
                  <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
                    <BadgeNivel nivel={cliente.nivelActual} />
                    <div className="flex-1 min-w-0">
                      <div className="h-2.5 lg:h-2 2xl:h-2.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-yellow-500 to-yellow-400"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                    <span className="text-base lg:text-sm 2xl:text-base font-semibold text-yellow-600">100%</span>
                  </div>
                  <p className="text-base lg:text-sm 2xl:text-base font-medium text-yellow-600 mt-1 text-center">
                    ¡Nivel máximo alcanzado!
                  </p>
                </div>
              ))}
            </div>

            {/* ── Sección Estadísticas ── */}
            <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-2 border-b border-slate-300">
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 lg:gap-y-2.5 lg:gap-x-3 2xl:gap-y-3 2xl:gap-x-4">
                <CeldaEstadistica
                  icono={<DollarSign className="w-3.5 h-3.5 text-emerald-600" />}
                  etiqueta="Total gastado"
                  valor={formatearMoneda(cliente.totalGastado)}
                  colorIcono="bg-emerald-100"
                />
                <CeldaEstadistica
                  icono={<TrendingUp className="w-3.5 h-3.5 text-blue-600" />}
                  etiqueta="Promedio compra"
                  valor={formatearMoneda(cliente.promedioCompra)}
                  colorIcono="bg-blue-100"
                />
                <CeldaEstadistica
                  icono={<ShoppingBag className="w-3.5 h-3.5 text-violet-600" />}
                  etiqueta="Visitas"
                  valor={cliente.totalVisitas}
                  colorIcono="bg-violet-100"
                />
                <CeldaEstadistica
                  icono={<Ticket className="w-3.5 h-3.5 text-amber-600" />}
                  etiqueta="Vouchers"
                  valor={`${cliente.vouchersUsados}/${cliente.totalVouchers} usados`}
                  colorIcono="bg-amber-100"
                />
              </div>
            </div>

            {/* ── Sección Últimas Transacciones ── */}
            <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2.5 2xl:py-2">
              <div className="flex items-center justify-between mb-2.5 lg:mb-2 2xl:mb-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <h4 className="text-base lg:text-sm 2xl:text-base font-bold text-slate-700">Últimas transacciones</h4>
                </div>
                {historialCliente.length > 0 && (
                  <span className="text-base lg:text-sm 2xl:text-base font-medium text-slate-600">
                    {historialCliente.length} recientes
                  </span>
                )}
              </div>

              {/* Loading historial */}
              {cargandoHistorial && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
                </div>
              )}

              {/* Sin transacciones */}
              {!cargandoHistorial && historialCliente.length === 0 && (
                <div className="text-center py-4">
                  <ShoppingBag className="w-6 h-6 text-slate-600 mx-auto mb-1" />
                  <p className="text-base lg:text-sm 2xl:text-base font-medium text-slate-600">Sin transacciones recientes</p>
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
                      estado={tx.estado}
                      cuponTitulo={tx.cuponTitulo}
                    />
                  ))}
                </div>
              )}

              {/* Botón ver historial completo */}
              {historialCliente.length > 0 && (
                <button
                  onClick={handleVerHistorial}
                  className="w-full mt-3 lg:mt-2 2xl:mt-3 py-2.5 lg:py-2 2xl:py-2.5 rounded-lg border-2 border-slate-300 text-base lg:text-sm 2xl:text-base text-slate-600 font-semibold hover:bg-slate-200 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
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