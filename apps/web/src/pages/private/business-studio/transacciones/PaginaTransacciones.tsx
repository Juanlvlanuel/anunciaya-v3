/**
 * PaginaTransacciones.tsx
 * ========================
 * Página del módulo Transacciones en Business Studio.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/transacciones/PaginaTransacciones.tsx
 *
 * LAYOUT:
 *   Header + KPIs (patrón Ofertas/Catálogo/Puntos/Clientes)
 *   Tabs periodo + Búsqueda + Exportar CSV
 *   Mobile (<lg): Lista tipo cards, infinite scroll
 *   Desktop (≥lg): Tabla con header dark, scroll interno, columnas ordenables
 *
 * COLUMNAS DESKTOP: CLIENTE | CONCEPTO | MONTO ↕ | PUNTOS ↕ | ESTADO | FECHA ↕
 *
 * ORDENAMIENTO:
 *   Click en header → desc → asc → null (default: fecha desc)
 *   Estilo CardYA (flechas amber en header dark)
 *
 * PERMISOS:
 *   Dueños  → todo + exportar CSV
 *   Gerentes → solo su sucursal + exportar CSV
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Receipt,
  DollarSign,
  Hash,
  BarChart3,
  XCircle,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Inbox,
  Clock,
  Eye,
  Users,
  Check,
  X,
  Gift,
  Hourglass,
  CheckCircle,
  AlertCircle,
  Calendar,
  LayoutList,
  Ticket,
} from 'lucide-react';
import { useTransaccionesStore } from '../../../../stores/useTransaccionesStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useChatYAStore } from '../../../../stores/useChatYAStore';
import { useUiStore } from '../../../../stores/useUiStore';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { ModalImagenes } from '../../../../components/ui/ModalImagenes';
import Tooltip from '../../../../components/ui/Tooltip';
import { CarouselKPI } from '../../../../components/ui/CarouselKPI';
import { descargarCSV } from '../../../../services/transaccionesService';
import ModalDetalleTransaccionBS from './ModalDetalleTransaccionBS';
import ModalDetalleCanjeBS from './ModalDetalleCanjeBS';
import type { TransaccionPuntos, PeriodoEstadisticas } from '../../../../types/puntos';
import type { VoucherCanje } from '../../../../types/transacciones';
import { notificar } from '../../../../utils/notificaciones';

// =============================================================================
// CSS — Animación del icono del header
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes transacciones-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .transacciones-icon-bounce {
    animation: transacciones-icon-bounce 2s ease-in-out infinite;
  }
`;

const ESTILO_SCROLL_OCULTO = `
  .tx-carousel::-webkit-scrollbar { display: none; }
  .tx-carousel { -ms-overflow-style: none; scrollbar-width: none; }
`;

// =============================================================================
// TIPOS LOCALES
// =============================================================================

type ColumnaOrden = 'monto' | 'puntos' | 'fecha';
type DireccionOrden = 'asc' | 'desc';

interface EstadoOrden {
  columna: ColumnaOrden;
  direccion: DireccionOrden;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const PERIODOS_CONFIG: { id: PeriodoEstadisticas; etiqueta: string }[] = [
  { id: 'todo', etiqueta: 'Todo' },
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: 'semana', etiqueta: 'Semana' },
  { id: 'mes', etiqueta: 'Mes' },
  { id: '3meses', etiqueta: '3 Meses' },
  { id: 'anio', etiqueta: 'Año' },
];

// =============================================================================
// HELPERS
// =============================================================================

/** Formatea número como moneda MXN sin centavos si es entero */
const formatearMonto = (monto: number) =>
  monto % 1 === 0
    ? `$${monto.toLocaleString('es-MX')}`
    : `$${monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Formatea fecha relativa: "Hace 2h", "Ayer 3:20 PM", "12 Feb" */
const formatearFechaCorta = (fechaISO: string | null) => {
  if (!fechaISO) return '—';
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 60) return `Hace ${diffMin}min`;
  if (diffHoras < 24) return `Hace ${diffHoras}h`;
  if (diffDias === 1) {
    return `Ayer ${fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
  }
  if (diffDias < 7) return `Hace ${diffDias}d`;
  if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)}sem`;
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Iniciales del nombre para avatar fallback */
const obtenerIniciales = (nombre: string) => {
  const partes = nombre.trim().split(' ');
  if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  return nombre.substring(0, 2).toUpperCase();
};

/** Formatea teléfono: +526441234567 → +52 644 1234567 */
const formatearTelefono = (tel: string): string => {
  const limpio = tel.replace(/\s+/g, '');
  if (limpio.startsWith('+52') && limpio.length === 13) {
    return `+52 ${limpio.slice(3, 6)} ${limpio.slice(6)}`;
  }
  // Fallback: insertar espacio cada 3 dígitos después del código de país
  if (limpio.startsWith('+') && limpio.length > 4) {
    const codigo = limpio.slice(0, 3); // +XX
    const resto = limpio.slice(3);
    return `${codigo} ${resto.slice(0, 3)} ${resto.slice(3)}`;
  }
  return tel;
};

/** Formatea fecha de expiración con indicador de urgencia */
const formatearExpiracion = (fechaISO: string | null) => {
  if (!fechaISO) return '—';
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diffMs = fecha.getTime() - ahora.getTime();
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return 'Vencido';
  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Mañana';
  if (diffDias <= 7) return `${diffDias} días`;
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Color del badge de expiración según urgencia */
const colorExpiracion = (fechaISO: string | null): string => {
  if (!fechaISO) return 'text-slate-600 font-medium';
  const diffDias = Math.ceil((new Date(fechaISO).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 'text-red-600 font-medium';
  if (diffDias <= 3) return 'text-red-600 font-bold';
  if (diffDias <= 7) return 'text-amber-600 font-medium';
  return 'text-slate-600 font-medium';
};

/** Badge de estado para vouchers de canje */
const BadgeEstadoCanje = ({ estado }: { estado: VoucherCanje['estado'] }) => {
  const config = {
    pendiente: { texto: 'Pendiente', icono: Hourglass, bg: 'bg-amber-100', color: 'text-amber-700' },
    usado: { texto: 'Usado', icono: CheckCircle, bg: 'bg-green-100', color: 'text-green-700' },
    expirado: { texto: 'Vencido', icono: AlertCircle, bg: 'bg-red-100', color: 'text-red-700' },
  }[estado];
  const Icono = config.icono;
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold ${config.bg} ${config.color}`}>
      <Icono className="w-2.5 h-2.5 2xl:w-3 2xl:h-3" />
      {config.texto}
    </span>
  );
};

// =============================================================================
// HOOK: Detectar móvil
// =============================================================================

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// =============================================================================
// COMPONENTE: Header de columna ordenable
// =============================================================================

function HeaderOrdenable({
  etiqueta,
  columna,
  ordenActual,
  onOrdenar,
}: {
  etiqueta: string;
  columna: ColumnaOrden;
  ordenActual: EstadoOrden | null;
  onOrdenar: (columna: ColumnaOrden) => void;
}) {
  const activa = ordenActual?.columna === columna;
  const direccion = activa ? ordenActual.direccion : null;

  return (
    <button
      onClick={() => onOrdenar(columna)}
      className="flex items-center gap-1 cursor-pointer hover:text-amber-300 transition-colors group"
    >
      <span>{etiqueta}</span>
      {!activa && (
        <ArrowUpDown className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-white/80 group-hover:text-amber-300" />
      )}
      {activa && direccion === 'desc' && (
        <ChevronDown className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-400" />
      )}
      {activa && direccion === 'asc' && (
        <ChevronUp className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-400" />
      )}
    </button>
  );
}

// =============================================================================
// COMPONENTE: Card de transacción (móvil)
// =============================================================================

function FilaMovil({
  transaccion,
  onVerDetalle,
  onChatear,
}: {
  transaccion: TransaccionPuntos;
  onVerDetalle: (tx: TransaccionPuntos) => void;
  onChatear: (id: string) => void;
}) {
  const esRevocada = transaccion.estado === 'cancelado';
  const [verAvatar, setVerAvatar] = useState(false);

  return (
    <div
      className={`w-full flex items-center gap-3 p-3 h-28 rounded-xl bg-white border-2 border-slate-300 text-left overflow-hidden ${esRevocada ? 'opacity-60' : ''
        }`}
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Avatar */}
      <div
        onClick={() => transaccion.clienteAvatarUrl && setVerAvatar(true)}
        className={`w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden ${transaccion.clienteAvatarUrl ? 'cursor-pointer' : ''}`}
      >
        {transaccion.clienteAvatarUrl ? (
          <img src={transaccion.clienteAvatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-indigo-700">
            {obtenerIniciales(transaccion.clienteNombre)}
          </span>
        )}
      </div>
      {transaccion.clienteAvatarUrl && (
        <ModalImagenes images={[transaccion.clienteAvatarUrl]} isOpen={verAvatar} onClose={() => setVerAvatar(false)} />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between h-20">
        {/* Nombre + Badge */}
        <div className="flex items-center justify-between gap-2">
          <p className={`text-base font-bold text-slate-800 truncate ${esRevocada ? 'line-through' : ''}`}>
            {transaccion.clienteNombre}
          </p>
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm font-bold shrink-0 ${esRevocada ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {esRevocada ? 'Revocada' : 'Activa'}
          </span>
        </div>
        {/* Monto + Puntos */}
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className={`font-bold ${esRevocada ? 'text-slate-600 line-through' : 'text-amber-600'}`}>
            {formatearMonto(transaccion.montoCompra)}
          </span>
          <span className={`font-semibold ${esRevocada ? 'line-through text-slate-600' : 'text-slate-600'}`}>
            +{transaccion.puntosOtorgados} pts
          </span>
        </div>
        {/* Fecha + Acciones */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-500">{transaccion.createdAt ? new Date(transaccion.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={() => onChatear(transaccion.clienteId)} className="cursor-pointer">
              <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="w-9 h-10" />
            </button>
            <button onClick={() => onVerDetalle(transaccion)} className="cursor-pointer text-slate-700">
              <Eye className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE: Card de canje (móvil)
// =============================================================================

function FilaMovilCanje({
  canje,
  onVerDetalle,
  onChatear,
}: {
  canje: VoucherCanje;
  onVerDetalle: (c: VoucherCanje) => void;
  onChatear: (id: string) => void;
}) {
  const [verAvatar, setVerAvatar] = useState(false);

  return (
    <div
      className="w-full flex items-center gap-3 p-3 h-28 rounded-xl bg-white border-2 border-slate-300 text-left overflow-hidden"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Avatar */}
      <div
        onClick={() => canje.clienteAvatarUrl && setVerAvatar(true)}
        className={`w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 overflow-hidden ${canje.clienteAvatarUrl ? 'cursor-pointer' : ''}`}
      >
        {canje.clienteAvatarUrl ? (
          <img src={canje.clienteAvatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-indigo-700">
            {obtenerIniciales(canje.clienteNombre)}
          </span>
        )}
      </div>
      {canje.clienteAvatarUrl && (
        <ModalImagenes images={[canje.clienteAvatarUrl]} isOpen={verAvatar} onClose={() => setVerAvatar(false)} />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between h-20">
        {/* Nombre + Badge */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-bold text-slate-800 truncate">
            {canje.clienteNombre}
          </p>
          <BadgeEstadoCanje estado={canje.estado} />
        </div>
        {/* Recompensa + Puntos */}
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="font-bold text-amber-600 truncate">
            {canje.recompensaNombre}
          </span>
          <span className="font-semibold text-slate-600 shrink-0">
            -{canje.puntosUsados} pts
          </span>
        </div>
        {/* Fecha/Expiración + Acciones */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-500">
            {canje.estado === 'pendiente' && canje.expiraAt ? (
              <span className={colorExpiracion(canje.expiraAt)}>
                {formatearExpiracion(canje.expiraAt)}
              </span>
            ) : canje.usadoAt ? (
              new Date(canje.usadoAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
            ) : '—'}
          </p>
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={() => onChatear(canje.clienteId)} className="cursor-pointer">
              <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="w-9 h-10" />
            </button>
            <button onClick={() => onVerDetalle(canje)} className="cursor-pointer text-slate-700">
              <Eye className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaTransacciones() {
  // Leer parámetro de búsqueda de la URL
  const [searchParams, setSearchParams] = useSearchParams();
  const busquedaInicial = searchParams.get('busqueda') || '';
  const tabInicial = searchParams.get('tab') || '';

  // Guardar IDs de deep link en state para que sobrevivan al limpiar searchParams
  const [transaccionIdPendiente, setTransaccionIdPendiente] = useState(() => searchParams.get('transaccionId') || '');
  const [canjeIdPendiente, setCanjeIdPendiente] = useState(() => searchParams.get('canjeId') || '');

  // Detectar nuevos deep links cuando ya estamos en la página
  useEffect(() => {
    const nuevoTxId = searchParams.get('transaccionId');
    const nuevoCanjeId = searchParams.get('canjeId');
    if (nuevoTxId) setTransaccionIdPendiente(nuevoTxId);
    if (nuevoCanjeId) setCanjeIdPendiente(nuevoCanjeId);
  }, [searchParams]);

  // Store
  const {
    // Tab
    tabActivo,
    setTabActivo,
    // Ventas
    kpis,
    cargandoKpis,
    periodo,
    historial,
    cargandoHistorial,
    cargandoMas,
    hayMas,
    cargaInicialCompleta,
    totalResultados,
    setPeriodo,
    setBusqueda,
    setOperadorId,
    operadorId,
    operadorIdCupones,
    operadorIdCanjes,
    operadores,
    cargarOperadores,
    estadoFiltro,
    setEstadoFiltro,
    cargarKPIs,
    cargarHistorial,
    cargarMas,
    // Cupones
    kpisCupones,
    cargandoKpisCupones,
    historialCupones,
    cargandoHistorialCupones,
    cargandoMasCupones,
    hayMasCupones,
    totalResultadosCupones,
    cargarMasCupones,
    // Canjes
    kpisCanjes,
    cargandoKpisCanjes,
    historialCanjes,
    cargandoHistorialCanjes,
    cargandoMasCanjes,
    hayMasCanjes,
    totalResultadosCanjes,
    estadoFiltroCanjes,
    setEstadoFiltroCanjes,
    setBusquedaCanjes,
    cargarMasCanjes,
  } = useTransaccionesStore();

  // Sucursal activa (para recargar al cambiar)
  const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);

  // Operador activo según tab (cada tab tiene su propio filtro)
  const operadorIdActivo = tabActivo === 'cupones' ? operadorIdCupones : tabActivo === 'canjes' ? operadorIdCanjes : operadorId;

  // Estado local
  const [orden, setOrden] = useState<EstadoOrden | null>(null);
  const [textoBusqueda, setTextoBusqueda] = useState(busquedaInicial);
  const [txSeleccionada, setTxSeleccionada] = useState<TransaccionPuntos | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [canjeSeleccionado, setCanjeSeleccionado] = useState<VoucherCanje | null>(null);
  const [textoBusquedaCanjes, setTextoBusquedaCanjes] = useState('');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [dropdownOperadorCanjesAbierto, setDropdownOperadorCanjesAbierto] = useState(false);
  const dropdownOperadorCanjesRef = useRef<HTMLDivElement | null>(null);
  const dropdownOperadorCanjesMovilRef = useRef<HTMLDivElement | null>(null);
  const [periodoDropdownAbierto, setPeriodoDropdownAbierto] = useState(false);
  const periodoDropdownRef = useRef<HTMLDivElement | null>(null);
  const [estadoDropdownAbierto, setEstadoDropdownAbierto] = useState(false);
  const estadoDropdownRef = useRef<HTMLDivElement | null>(null);
  const [estadoCanjesDropdownAbierto, setEstadoCanjesDropdownAbierto] = useState(false);
  const estadoCanjesDropdownRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();
  const sentinelaRef = useRef<HTMLDivElement | null>(null);
  const sentinelaCanjesRef = useRef<HTMLDivElement | null>(null);

  // ——— Carga inicial + recarga al cambiar sucursal ———
  // Si hay búsqueda inicial (desde URL), setBusqueda llama cargarHistorial internamente.
  // Así evitamos dos cargas paralelas que causan condición de carrera.
  useEffect(() => {
    if (tabInicial === 'canjes') {
      setTabActivo('canjes');
    }
    cargarKPIs();
    cargarOperadores();
    // Precargar datos de cupones y vouchers en paralelo para evitar parpadeo de imágenes
    useTransaccionesStore.getState().cargarHistorialCupones();
    useTransaccionesStore.getState().cargarKPIsCupones();
    useTransaccionesStore.getState().cargarHistorialCanjes();
    useTransaccionesStore.getState().cargarKPIsCanjes();
    if (busquedaInicial) {
      if (tabInicial === 'canjes') {
        // Búsqueda en tab canjes
        setTextoBusquedaCanjes(busquedaInicial);
        setBusquedaCanjes(busquedaInicial);
      } else {
        // Búsqueda en tab ventas
        const busquedaEnStore = useTransaccionesStore.getState().busqueda;
        if (busquedaEnStore !== busquedaInicial) {
          useTransaccionesStore.setState({ historial: [], totalResultados: 0 });
          setBusqueda(busquedaInicial);
        }
      }
      setSearchParams({}, { replace: true });
    } else {
      cargarHistorial();
    }
  }, [sucursalActiva]);

  // ——— Abrir transacción/canje desde URL (notificaciones) ———
  useEffect(() => {
    if (!transaccionIdPendiente || historial.length === 0) return;
    const tx = historial.find((t) => t.id === transaccionIdPendiente);
    if (tx) {
      setTxSeleccionada(tx);
    } else {
      notificar.info('Esta transacción ya no está disponible');
    }
    setTransaccionIdPendiente('');
  }, [transaccionIdPendiente, historial]);

  useEffect(() => {
    if (!canjeIdPendiente || historialCanjes.length === 0) return;
    const canje = historialCanjes.find((c) => c.id === canjeIdPendiente);
    if (canje) {
      setCanjeSeleccionado(canje);
    } else {
      notificar.info('Este canje ya no está disponible');
    }
    setCanjeIdPendiente('');
  }, [canjeIdPendiente, historialCanjes]);

  // ——— Limpiar filtros al salir (sin disparar cargarHistorial) ———
  useEffect(() => {
    return () => {
      const state = useTransaccionesStore.getState();
      const hayFiltrosSucios = state.operadorId || state.operadorIdCupones || state.operadorIdCanjes || state.estadoFiltro || state.estadoFiltroCanjes || state.busqueda || state.busquedaCanjes || state.periodo !== 'todo';

      useTransaccionesStore.setState({
        busqueda: '',
        offset: 0,
        operadorId: '',
        operadorIdCupones: '',
        operadorIdCanjes: '',
        estadoFiltro: '',
        estadoFiltroCanjes: '',
        busquedaCanjes: '',
        offsetCupones: 0,
        offsetCanjes: 0,
        tabActivo: 'ventas',
        periodo: 'todo',
      });

      // Si había filtros activos, recargar datos sin filtros para que la próxima visita muestre datos limpios
      if (hayFiltrosSucios) {
        useTransaccionesStore.getState().cargarHistorial();
        // Cupones y canjes se recargan lazy al cambiar de tab
        useTransaccionesStore.setState({ cargaInicialCuponesCompleta: false, cargaInicialCanjesCompleta: false });
      }
    };
  }, []);

  // ——— Debounce: enviar búsqueda al backend después de 400ms sin escribir ———
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBusqueda = useCallback((valor: string) => {
    setTextoBusqueda(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setBusqueda(valor.trim());
    }, 400);
  }, [setBusqueda]);

  // ——— Infinite scroll mobile ———
  useEffect(() => {
    if (!isMobile || !sentinelaRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hayMas && !cargandoMas) {
          cargarMas();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(sentinelaRef.current);
    return () => observer.disconnect();
  }, [isMobile, hayMas, cargandoMas, cargarMas]);

  // ——— Debounce: busqueda canjes ———
  const debounceCanjesRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleBusquedaCanjes = useCallback((valor: string) => {
    setTextoBusquedaCanjes(valor);
    if (debounceCanjesRef.current) clearTimeout(debounceCanjesRef.current);
    debounceCanjesRef.current = setTimeout(() => {
      setBusquedaCanjes(valor.trim());
    }, 400);
  }, [setBusquedaCanjes]);

  // ——— Precargar imágenes de canjes y cupones para evitar parpadeo al cambiar tabs ———
  useEffect(() => {
    historialCanjes.forEach((c) => {
      if (c.recompensaImagenUrl) { const img = new Image(); img.src = c.recompensaImagenUrl; }
    });
    historialCupones.forEach((c) => {
      if (c.cuponImagen) { const img = new Image(); img.src = c.cuponImagen; }
    });
  }, [historialCanjes, historialCupones]);

  // ——— Infinite scroll mobile canjes ———
  useEffect(() => {
    if (!isMobile || !sentinelaCanjesRef.current || tabActivo !== 'canjes') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hayMasCanjes && !cargandoMasCanjes) {
          cargarMasCanjes();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(sentinelaCanjesRef.current);
    return () => observer.disconnect();
  }, [isMobile, hayMasCanjes, cargandoMasCanjes, cargarMasCanjes, tabActivo]);

  // ——— Cerrar dropdown operador al hacer click fuera ———
  useEffect(() => {
    if (!dropdownAbierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [dropdownAbierto]);

  // ——— Cerrar dropdown operador canjes al hacer click fuera ———
  useEffect(() => {
    if (!dropdownOperadorCanjesAbierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      const target = e.target as Node;
      const dentroPC = dropdownOperadorCanjesRef.current?.contains(target);
      const dentroMovil = dropdownOperadorCanjesMovilRef.current?.contains(target);
      if (!dentroPC && !dentroMovil) {
        setDropdownOperadorCanjesAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [dropdownOperadorCanjesAbierto]);

  // ——— Cerrar dropdown período al hacer click fuera ———
  useEffect(() => {
    if (!periodoDropdownAbierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      if (periodoDropdownRef.current && !periodoDropdownRef.current.contains(e.target as Node)) {
        setPeriodoDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [periodoDropdownAbierto]);

  // ——— Cerrar dropdown estado ventas al hacer click fuera ———
  useEffect(() => {
    if (!estadoDropdownAbierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      if (estadoDropdownRef.current && !estadoDropdownRef.current.contains(e.target as Node)) {
        setEstadoDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [estadoDropdownAbierto]);

  // ——— Cerrar dropdown estado canjes al hacer click fuera ———
  useEffect(() => {
    if (!estadoCanjesDropdownAbierto) return;
    const handleClickFuera = (e: MouseEvent) => {
      if (estadoCanjesDropdownRef.current && !estadoCanjesDropdownRef.current.contains(e.target as Node)) {
        setEstadoCanjesDropdownAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, [estadoCanjesDropdownAbierto]);

  // ——— Alternar orden ———
  const alternarOrden = useCallback((columna: ColumnaOrden) => {
    setOrden((prev) => {
      if (!prev || prev.columna !== columna) return { columna, direccion: 'desc' };
      if (prev.direccion === 'desc') return { columna, direccion: 'asc' };
      return null; // 3er click → quitar orden
    });
  }, []);

  // ——— Ordenar datos localmente ———
  const transaccionesOrdenadas = useMemo(() => {
    if (!orden) return historial;

    const copia = [...historial];
    const mult = orden.direccion === 'asc' ? 1 : -1;

    copia.sort((a, b) => {
      switch (orden.columna) {
        case 'monto':
          return (a.montoCompra - b.montoCompra) * mult;
        case 'puntos':
          return (a.puntosOtorgados - b.puntosOtorgados) * mult;
        case 'fecha': {
          const fa = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const fb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return (fa - fb) * mult;
        }
        default:
          return 0;
      }
    });

    return copia;
  }, [historial, orden]);

  // ——— Ordenar canjes localmente ———
  const canjesOrdenados = useMemo(() => {
    if (!orden) return historialCanjes;

    const copia = [...historialCanjes];
    const mult = orden.direccion === 'asc' ? 1 : -1;

    copia.sort((a, b) => {
      switch (orden.columna) {
        case 'puntos':
          return (a.puntosUsados - b.puntosUsados) * mult;
        case 'fecha': {
          const fa = a.expiraAt ? new Date(a.expiraAt).getTime() : 0;
          const fb = b.expiraAt ? new Date(b.expiraAt).getTime() : 0;
          return (fa - fb) * mult;
        }
        default:
          return 0;
      }
    });

    return copia;
  }, [historialCanjes, orden]);

  // ——— Cambiar periodo ———
  const handlePeriodo = useCallback((nuevoperiodo: PeriodoEstadisticas) => {
    setPeriodo(nuevoperiodo);
    setOrden(null); // Reset orden al cambiar periodo
    setTextoBusqueda(''); // Limpiar búsqueda al cambiar periodo
  }, [setPeriodo]);

  // ——— Exportar CSV ———
  const handleExportar = useCallback(async () => {
    try {
      await descargarCSV(periodo, textoBusqueda || undefined, operadorIdActivo || undefined, estadoFiltro || undefined);
    } catch (error) {
      console.error('Error al exportar CSV:', error);
    }
  }, [periodo, textoBusqueda, operadorIdActivo, estadoFiltro]);

  // ——— Abrir/cerrar modal detalle ———
  const handleVerDetalle = useCallback((tx: TransaccionPuntos) => {
    setTxSeleccionada(tx);
  }, []);

  // ——— Abrir ChatYA con cliente ———
  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const abrirChatYA = useUiStore((s) => s.abrirChatYA);

  const handleChatear = useCallback((clienteId: string) => {
    const tx = historial.find((t) => t.clienteId === clienteId);
    if (!tx) return;
    abrirChatTemporal({
      id: `temp_${Date.now()}`,
      otroParticipante: {
        id: tx.clienteId,
        nombre: tx.clienteNombre || 'Cliente',
        apellidos: '',
        avatarUrl: tx.clienteAvatarUrl ?? null,
      },
      datosCreacion: {
        participante2Id: tx.clienteId,
        participante2Modo: 'personal',
        contextoTipo: 'directo',
      },
    });
    abrirChatYA();
  }, [historial, abrirChatTemporal, abrirChatYA]);

  const handleCerrarModal = useCallback(() => {
    setTxSeleccionada(null);
  }, []);

  // ——— Abrir/cerrar modal detalle canje ———
  const handleVerDetalleCanje = useCallback((canje: VoucherCanje) => {
    setCanjeSeleccionado(canje);
  }, []);

  const handleCerrarModalCanje = useCallback(() => {
    setCanjeSeleccionado(null);
  }, []);

  // ——— Formato para KPIs ———
  const fmt = (n: number) => n.toLocaleString('es-MX');

  // ——— Loading inicial (solo la primera vez que se abre la página) ———
  if (!cargaInicialCompleta && cargandoHistorial) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="p-3 lg:p-1.5 2xl:p-3">
      <style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER + ESTILO_SCROLL_OCULTO }} />

      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

        {/* ================================================================= */}
        {/* HEADER + KPIs                                                     */}
        {/* ================================================================= */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-3 2xl:gap-4">
          {/* Header con icono animado */}
          <div className="hidden lg:flex items-center gap-4 w-full lg:w-auto shrink-0 mb-3 lg:mb-0">
            <div
              className="hidden lg:flex items-center justify-center shrink-0"
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #6366f1, #818cf8, #a5b4fc)',
                boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
              }}
            >
              <div className="transacciones-icon-bounce">
                <Receipt className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div className="flex-1 flex items-center justify-between lg:block">
              {/* Textos título + subtítulo — solo desktop */}
              <div className="hidden lg:block">
                <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Transacciones
                </h1>
                <p className="lg:hidden text-base lg:text-xs 2xl:text-sm text-slate-600 -mt-1 font-medium">
                  Ventas, Cupones y Vouchers
                </p>
                <p className="hidden lg:block text-sm lg:text-sm 2xl:text-base text-slate-600 mt-0.5 font-medium">
                  {tabActivo === 'ventas' ? 'Historial de ventas' : tabActivo === 'cupones' ? 'Cupones canjeados' : 'Vouchers de recompensas'}
                </p>
              </div>
              {/* Toggle móvil — header */}
              <div className="lg:hidden flex items-center bg-slate-200 rounded-lg p-0.5 border-2 border-slate-300 shrink-0">
                <Tooltip text="Ventas" position="bottom">
                  <button
                    onClick={() => setTabActivo('ventas')}
                    className={`h-10 w-10 flex items-center justify-center rounded-md cursor-pointer ${tabActivo === 'ventas' ? 'text-white shadow-md' : 'text-slate-700 hover:bg-slate-300'}`}
                    style={tabActivo === 'ventas' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                  >
                    <DollarSign className="w-5 h-5" />
                  </button>
                </Tooltip>
                <Tooltip text="Cupones" position="bottom">
                  <button
                    onClick={() => setTabActivo('cupones')}
                    className={`h-10 w-10 flex items-center justify-center rounded-md cursor-pointer ${tabActivo === 'cupones' ? 'text-white shadow-md' : 'text-slate-700 hover:bg-slate-300'}`}
                    style={tabActivo === 'cupones' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                  >
                    <Ticket className="w-5 h-5" />
                  </button>
                </Tooltip>
                <Tooltip text="Vouchers" position="bottom">
                  <button
                    onClick={() => setTabActivo('canjes')}
                    className={`h-10 w-10 flex items-center justify-center rounded-md cursor-pointer ${tabActivo === 'canjes' ? 'text-white shadow-md' : 'text-slate-700 hover:bg-slate-300'}`}
                    style={tabActivo === 'canjes' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                  >
                    <Gift className="w-5 h-5" />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Toggle Ventas/Cupones/Vouchers - Desktop */}
            <div className="hidden lg:flex items-center bg-slate-200 rounded-lg p-0.5 border-2 border-slate-300 shrink-0">
              <Tooltip text="Ventas" position="bottom">
                <button
                  onClick={() => setTabActivo('ventas')}
                  className={`h-9 2xl:h-10 w-9 2xl:w-10 flex items-center justify-center rounded-md cursor-pointer ${tabActivo === 'ventas' ? 'text-white shadow-md' : 'text-slate-700 hover:bg-slate-300'}`}
                  style={tabActivo === 'ventas' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                >
                  <DollarSign className="w-4 h-4 2xl:w-5 2xl:h-5" />
                </button>
              </Tooltip>
              <Tooltip text="Cupones" position="bottom">
                <button
                  onClick={() => setTabActivo('cupones')}
                  className={`h-9 2xl:h-10 w-9 2xl:w-10 flex items-center justify-center rounded-md cursor-pointer ${tabActivo === 'cupones' ? 'text-white shadow-md' : 'text-slate-700 hover:bg-slate-300'}`}
                  style={tabActivo === 'cupones' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                >
                  <Ticket className="w-4 h-4 2xl:w-5 2xl:h-5" />
                </button>
              </Tooltip>
              <Tooltip text="Vouchers" position="bottom">
                <button
                  onClick={() => setTabActivo('canjes')}
                  className={`h-9 2xl:h-10 w-9 2xl:w-10 flex items-center justify-center rounded-md cursor-pointer ${tabActivo === 'canjes' ? 'text-white shadow-md' : 'text-slate-700 hover:bg-slate-300'}`}
                  style={tabActivo === 'canjes' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                >
                  <Gift className="w-4 h-4 2xl:w-5 2xl:h-5" />
                </button>
              </Tooltip>
            </div>
          </div>

          {/* KPIs COMPACTOS - Carousel en móvil, fila en desktop */}
          <CarouselKPI className="mt-5 lg:mt-0 lg:flex-1">
            <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0">

              {/* ============ KPIs TAB VENTAS ============ */}
              {tabActivo === 'ventas' && (
                <>
                  {/* Total Ventas */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1 2xl:py-2 shrink-0 h-13 lg:h-auto 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[90px] 2xl:min-w-[140px]"
                    style={{
                      background: 'linear-gradient(135deg, #eff6ff, #fff)',
                      border: '2px solid #93c5fd',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #bfdbfe, #93c5fd)', boxShadow: '0 3px 8px rgba(37,99,235,0.25)' }}
                    >
                      <DollarSign className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-blue-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-blue-700">
                        {cargandoKpis ? '...' : formatearMonto(kpis?.totalVentas ?? 0)}
                      </div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Ventas</div>
                    </div>
                  </div>

                  {/* # Transacciones */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1 2xl:py-2 shrink-0 h-13 lg:h-auto 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[90px] 2xl:min-w-[140px]"
                    style={{
                      background: 'linear-gradient(135deg, #f0fdf4, #fff)',
                      border: '2px solid #86efac',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #bbf7d0, #86efac)', boxShadow: '0 3px 8px rgba(22,163,74,0.25)' }}
                    >
                      <Hash className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-green-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-green-700">
                        {cargandoKpis ? '...' : fmt(kpis?.totalTransacciones ?? 0)}
                      </div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Transacciones</div>
                    </div>
                  </div>

                  {/* Ticket Promedio */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1 2xl:py-2 shrink-0 h-13 lg:h-auto 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[90px] 2xl:min-w-[140px]"
                    style={{
                      background: 'linear-gradient(135deg, #fffbeb, #fff)',
                      border: '2px solid #fcd34d',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #fde68a, #fcd34d)', boxShadow: '0 3px 8px rgba(202,138,4,0.25)' }}
                    >
                      <BarChart3 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-amber-700">
                        {cargandoKpis ? '...' : formatearMonto(kpis?.ticketPromedio ?? 0)}
                      </div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Ticket Prom.</div>
                    </div>
                  </div>

                  {/* Revocadas */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1 2xl:py-2 shrink-0 h-13 lg:h-auto 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[90px] 2xl:min-w-[140px]"
                    style={{
                      background: 'linear-gradient(135deg, #fef2f2, #fff)',
                      border: '2px solid #fca5a5',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}
                    >
                      <XCircle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-red-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-red-700">
                        {cargandoKpis ? '...' : fmt(kpis?.totalRevocadas ?? 0)}
                      </div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Revocadas</div>
                    </div>
                  </div>
                </>
              )}

              {/* ============ KPIs TAB CUPONES ============ */}
              {tabActivo === 'cupones' && (
                <>
                  {/* Total Cupones */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                    style={{ background: 'linear-gradient(135deg, #eff6ff, #fff)', border: '2px solid #93c5fd', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
                  >
                    <div className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #bfdbfe, #93c5fd)', boxShadow: '0 3px 8px rgba(37,99,235,0.25)' }}>
                      <Ticket className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-blue-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-blue-700">{kpisCupones?.totalCupones ?? 0}</div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Total</div>
                    </div>
                  </div>

                  {/* Gratis */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                    style={{ background: 'linear-gradient(135deg, #f0fdf4, #fff)', border: '2px solid #86efac', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
                  >
                    <div className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #bbf7d0, #86efac)', boxShadow: '0 3px 8px rgba(22,163,74,0.25)' }}>
                      <Gift className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-green-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-green-700">{kpisCupones?.cuponesGratis ?? 0}</div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Gratis</div>
                    </div>
                  </div>

                  {/* Con Compra */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                    style={{ background: 'linear-gradient(135deg, #fffbeb, #fff)', border: '2px solid #fcd34d', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
                  >
                    <div className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #fde68a, #fcd34d)', boxShadow: '0 3px 8px rgba(217,119,6,0.25)' }}>
                      <DollarSign className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-amber-700">{kpisCupones?.cuponesConCompra ?? 0}</div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Con compra</div>
                    </div>
                  </div>

                  {/* Total Descuentos */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
                    style={{ background: 'linear-gradient(135deg, #fef2f2, #fff)', border: '2px solid #fca5a5', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}
                  >
                    <div className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}>
                      <Receipt className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-red-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-red-700">${(kpisCupones?.totalDescuentos ?? 0).toLocaleString()}</div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Descuentos</div>
                    </div>
                  </div>
                </>
              )}

              {/* ============ KPIs TAB CANJES ============ */}
              {tabActivo === 'canjes' && (
                <>
                  {/* Pendientes */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1 2xl:py-2 shrink-0 h-13 lg:h-auto 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[90px] 2xl:min-w-[140px]"
                    style={{
                      background: 'linear-gradient(135deg, #fffbeb, #fff)',
                      border: '2px solid #fcd34d',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #fde68a, #fcd34d)', boxShadow: '0 3px 8px rgba(202,138,4,0.25)' }}
                    >
                      <Hourglass className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-amber-700">
                        {cargandoKpisCanjes ? '...' : fmt(kpisCanjes?.pendientes ?? 0)}
                      </div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Pendientes</div>
                    </div>
                  </div>

                  {/* Usados */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1 2xl:py-2 shrink-0 h-13 lg:h-auto 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[90px] 2xl:min-w-[140px]"
                    style={{
                      background: 'linear-gradient(135deg, #f0fdf4, #fff)',
                      border: '2px solid #86efac',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #bbf7d0, #86efac)', boxShadow: '0 3px 8px rgba(22,163,74,0.25)' }}
                    >
                      <CheckCircle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-green-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-green-700">
                        {cargandoKpisCanjes ? '...' : fmt(kpisCanjes?.usados ?? 0)}
                      </div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Usados</div>
                    </div>
                  </div>

                  {/* Vencidos */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1 2xl:py-2 shrink-0 h-13 lg:h-auto 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[90px] 2xl:min-w-[140px]"
                    style={{
                      background: 'linear-gradient(135deg, #fef2f2, #fff)',
                      border: '2px solid #fca5a5',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}
                    >
                      <AlertCircle className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-red-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-red-700">
                        {cargandoKpisCanjes ? '...' : fmt(kpisCanjes?.vencidos ?? 0)}
                      </div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Vencidos</div>
                    </div>
                  </div>

                  {/* Total Canjes */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1 2xl:py-2 shrink-0 h-13 lg:h-auto 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[90px] 2xl:min-w-[140px]"
                    style={{
                      background: 'linear-gradient(135deg, #fdf4ff, #fff)',
                      border: '2px solid #e879f9',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #f5d0fe, #e879f9)', boxShadow: '0 3px 8px rgba(168,85,247,0.25)' }}
                    >
                      <Gift className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-purple-700" />
                    </div>
                    <div className="text-left">
                      <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-purple-700">
                        {cargandoKpisCanjes ? '...' : fmt(kpisCanjes?.totalCanjes ?? 0)}
                      </div>
                      <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5">Total</div>
                    </div>
                  </div>
                </>
              )}

            </div>
          </CarouselKPI>
        </div>

        {/* ================================================================= */}
        {/* TOGGLE Ventas/Cupones/Vouchers — solo móvil                      */}
        {/* ================================================================= */}

        <div className="lg:hidden flex w-full bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5">
          <button
            onClick={() => setTabActivo('ventas')}
            className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold cursor-pointer ${tabActivo === 'ventas' ? 'text-white shadow-md' : 'text-slate-700'}`}
            style={tabActivo === 'ventas' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
          >
            <DollarSign className="w-4 h-4" />
            Ventas
          </button>
          <button
            onClick={() => setTabActivo('cupones')}
            className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold cursor-pointer ${tabActivo === 'cupones' ? 'text-white shadow-md' : 'text-slate-700'}`}
            style={tabActivo === 'cupones' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
          >
            <Ticket className="w-4 h-4" />
            Cupones
          </button>
          <button
            onClick={() => setTabActivo('canjes')}
            className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold cursor-pointer ${tabActivo === 'canjes' ? 'text-white shadow-md' : 'text-slate-700'}`}
            style={tabActivo === 'canjes' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
          >
            <Gift className="w-4 h-4" />
            Vouchers
          </button>
        </div>

        {/* ================================================================= */}
        {/* FILTROS: Tabs Periodo + Búsqueda + Exportar CSV                   */}
        {/* ================================================================= */}

        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border-2 border-slate-300 p-2.5 lg:p-3 2xl:p-4 lg:mt-7 2xl:mt-14">
          {/* ============ FILTROS TAB VENTAS Y CUPONES ============ */}
          {(tabActivo === 'ventas' || tabActivo === 'cupones') && (
            <>
              <div className="flex flex-col gap-2 2xl:gap-3">
                {/* Fila 1: Todos los filtros */}
                <div className="flex items-center gap-1.5 lg:gap-2 2xl:gap-3">

                  {/* Dropdown Período */}
                  <div className="shrink-0 relative w-36 lg:w-40" ref={periodoDropdownRef}>
                    <button
                      onClick={() => setPeriodoDropdownAbierto(!periodoDropdownAbierto)}
                      className={`w-full flex items-center gap-1.5 h-11 lg:h-10 2xl:h-11 pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg border-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${periodo !== 'todo' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'}`}
                    >
                      <Calendar className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                      <span className="flex-1 truncate text-left">{PERIODOS_CONFIG.find(p => p.id === periodo)?.etiqueta ?? 'Período'}</span>
                      <ChevronDown className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0 ml-auto transition-transform ${periodoDropdownAbierto ? 'rotate-180' : ''}`} />
                    </button>
                    {periodoDropdownAbierto && (
                      <div className="absolute top-full left-0 mt-1.5 w-36 lg:w-40 bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-50 py-1 overflow-hidden">
                        {PERIODOS_CONFIG.map((p) => {
                          const activo = periodo === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => { handlePeriodo(p.id); setPeriodoDropdownAbierto(false); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold text-left cursor-pointer ${activo ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${activo ? 'bg-blue-500' : 'bg-slate-200'}`}>
                                {activo && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span>{p.etiqueta}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Chips estado — solo laptop, solo ventas */}
                  {tabActivo === 'ventas' && <div className="hidden lg:flex shrink-0 items-center gap-1 2xl:gap-1.5">
                    {[
                      { id: '', etiqueta: 'Todas' },
                      { id: 'confirmado', etiqueta: 'Válidas' },
                      { id: 'cancelado', etiqueta: 'Revocadas' },
                    ].map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setEstadoFiltro(e.id)}
                        className={`px-3 2xl:px-4 h-10 2xl:h-11 flex items-center rounded-lg text-sm 2xl:text-base font-semibold border-2 cursor-pointer ${estadoFiltro === e.id
                            ? 'text-white border-slate-700 shadow-sm'
                            : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                          }`}
                        style={estadoFiltro === e.id ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                      >
                        {e.etiqueta}
                      </button>
                    ))}
                  </div>}

                  {/* Estado dropdown — oculto en móvil, visible en laptop via chips */}
                  <div className="hidden shrink-0 relative" ref={estadoDropdownRef}>
                    <button
                      onClick={() => setEstadoDropdownAbierto(!estadoDropdownAbierto)}
                      className={`flex items-center gap-1.5 h-11 lg:h-10 2xl:h-11 pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg border-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${estadoFiltro
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                        }`}
                    >
                      <span className="truncate">{[{ id: '', etiqueta: 'Todas' }, { id: 'confirmado', etiqueta: 'Válidas' }, { id: 'cancelado', etiqueta: 'Revocadas' }].find(e => e.id === estadoFiltro)?.etiqueta ?? 'Todas'}</span>
                      <ChevronDown className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0 transition-transform ${estadoDropdownAbierto ? 'rotate-180' : ''}`} />
                    </button>
                    {estadoDropdownAbierto && (
                      <div className="absolute top-full left-0 mt-1.5 w-36 bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-50 py-1 overflow-hidden">
                        {[
                          { id: '', etiqueta: 'Todas' },
                          { id: 'confirmado', etiqueta: 'Válidas' },
                          { id: 'cancelado', etiqueta: 'Revocadas' },
                        ].map((e) => {
                          const activo = estadoFiltro === e.id;
                          return (
                            <button
                              key={e.id}
                              onClick={() => { setEstadoFiltro(e.id); setEstadoDropdownAbierto(false); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold text-left cursor-pointer ${activo ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                            >
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${activo ? 'bg-blue-500' : 'bg-slate-200'}`}>
                                {activo && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span>{e.etiqueta}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Operador */}
                  {operadores.length > 0 && (
                    <div className="flex-1 min-w-0 lg:flex-none lg:w-64 relative" ref={dropdownRef}>
                      <button
                        onClick={() => setDropdownAbierto(!dropdownAbierto)}
                        className={`w-full flex items-center gap-1.5 h-11 lg:h-10 2xl:h-11 pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg border-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${operadorIdActivo
                            ? 'bg-blue-100 border-blue-300 text-blue-700'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                          }`}
                      >
                        <Users className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                        <span className="flex-1 min-w-0 truncate text-left">
                          {operadorIdActivo
                            ? operadores.find((o) => o.id === operadorIdActivo)?.nombre || 'Todos'
                            : 'Operador'}
                        </span>
                        <ChevronDown className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0 transition-transform ${dropdownAbierto ? 'rotate-180' : ''}`} />
                      </button>
                      {dropdownAbierto && (
                        <div className="absolute top-full right-0 mt-1.5 w-64 bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-50 py-1 overflow-hidden">
                          <button
                            onClick={() => { setOperadorId(''); setDropdownAbierto(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold text-left cursor-pointer ${!operadorIdActivo ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                          >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${!operadorIdActivo ? 'bg-blue-500' : 'bg-slate-200'}`}>
                              {!operadorIdActivo && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>Todos los operadores</span>
                          </button>
                          <div className="h-px bg-slate-200 my-1" />
                          <div className="max-h-48 overflow-y-auto">
                            {operadores.map((op) => {
                              const seleccionado = operadorIdActivo === op.id;
                              return (
                                <button
                                  key={op.id}
                                  onClick={() => { setOperadorId(op.id); setDropdownAbierto(false); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold text-left cursor-pointer ${seleccionado ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-blue-50'}`}
                                >
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${seleccionado ? 'bg-blue-500' : 'bg-slate-200'}`}>
                                    {seleccionado && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className="truncate">{op.nombre}</span>
                                  <span className={`ml-auto text-sm px-1.5 py-0.5 rounded-full shrink-0 ${op.tipo === 'empleado'
                                      ? 'bg-blue-100 text-blue-600'
                                      : op.tipo === 'gerente'
                                        ? 'bg-purple-100 text-purple-600'
                                        : 'bg-amber-100 text-amber-600'
                                    }`}>
                                    {op.tipo === 'empleado' ? 'Empleado' : op.tipo === 'gerente' ? 'Gerente' : 'Dueño'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reporte: solo laptop */}
                  <div className="hidden lg:flex ml-auto shrink-0">
                    <Tooltip text="Descargar CSV con los filtros activos" position="bottom">
                      <button
                        onClick={handleExportar}
                        className="flex items-center gap-1.5 h-10 2xl:h-11 px-2.5 2xl:px-3 rounded-lg text-sm 2xl:text-base font-bold text-slate-600 border-2 border-slate-300 cursor-pointer"
                        style={{
                          background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                        }}
                      >
                        <Download className="w-3 h-3 2xl:w-4 2xl:h-4" />
                        Reporte
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Fila 2: Búsqueda + Reporte (móvil) */}
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1 min-w-0 relative">
                    <Input
                      id="buscar-transaccion"
                      name="buscarTransaccion"
                      placeholder="Nombre o Celular..."
                      value={textoBusqueda}
                      onChange={(e) => handleBusqueda(e.target.value)}
                      className="h-11 lg:h-10 2xl:h-11 rounded-lg! text-base lg:text-sm 2xl:text-base pr-8"
                      icono={<Search className="w-4 h-4 text-slate-600" />}
                    />
                    {textoBusqueda && (
                      <button
                        onClick={() => { if (debounceRef.current) clearTimeout(debounceRef.current); setTextoBusqueda(''); setBusqueda(''); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-600 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Reporte: solo móvil — icon only */}
                  <button
                    onClick={handleExportar}
                    className="lg:hidden shrink-0 flex items-center justify-center h-11 w-11 rounded-lg text-slate-600 border-2 border-slate-300 cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ============ FILTROS TAB CANJES ============ */}
          {tabActivo === 'canjes' && (
            <div className="flex flex-col gap-2 2xl:gap-3">
              {/* Fila 1: Todos los filtros */}
              <div className="flex items-center gap-1.5 lg:gap-2 2xl:gap-3">

                {/* Dropdown Período */}
                <div className="flex-1 lg:flex-none lg:w-40 lg:shrink-0 relative" ref={periodoDropdownRef}>
                  <button
                    onClick={() => setPeriodoDropdownAbierto(!periodoDropdownAbierto)}
                    className={`w-full flex items-center gap-1.5 h-11 lg:h-10 2xl:h-11 pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg border-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${periodo !== 'todo' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'}`}
                  >
                    <Calendar className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                    <span className="truncate">{PERIODOS_CONFIG.find(p => p.id === periodo)?.etiqueta ?? 'Período'}</span>
                    <ChevronDown className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0 ml-auto transition-transform ${periodoDropdownAbierto ? 'rotate-180' : ''}`} />
                  </button>
                  {periodoDropdownAbierto && (
                    <div className="absolute top-full left-0 mt-1.5 w-full lg:w-40 bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-50 py-1 overflow-hidden">
                      {PERIODOS_CONFIG.map((p) => {
                        const activo = periodo === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => { handlePeriodo(p.id); setPeriodoDropdownAbierto(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold text-left cursor-pointer ${activo ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                          >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${activo ? 'bg-blue-500' : 'bg-slate-200'}`}>
                              {activo && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>{p.etiqueta}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Chips estado — solo laptop */}
                <div className="hidden lg:flex shrink-0 items-center gap-1 2xl:gap-1.5">
                  {[
                    { id: '', etiqueta: 'Todos' },
                    { id: 'pendiente', etiqueta: 'Pendientes' },
                    { id: 'usado', etiqueta: 'Usados' },
                    { id: 'expirado', etiqueta: 'Vencidos' },
                  ].map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEstadoFiltroCanjes(e.id)}
                      className={`px-3 2xl:px-4 h-10 2xl:h-11 flex items-center rounded-lg lg:text-sm 2xl:text-base font-semibold border-2 cursor-pointer ${estadoFiltroCanjes === e.id
                          ? 'text-white border-slate-700 shadow-sm'
                          : 'bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-300'
                        }`}
                      style={estadoFiltroCanjes === e.id ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                    >
                      {e.etiqueta}
                    </button>
                  ))}
                </div>

                {/* Operador — solo PC, en fila 1 */}
                {operadores.length > 0 && (
                  <div className="hidden lg:block flex-none w-52 2xl:w-64 relative" ref={dropdownOperadorCanjesRef}>
                    <button
                      onClick={() => setDropdownOperadorCanjesAbierto(!dropdownOperadorCanjesAbierto)}
                      className={`w-full flex items-center gap-1.5 h-10 2xl:h-11 pl-2.5 2xl:pl-3 pr-2 2xl:pr-2.5 rounded-lg border-2 text-sm 2xl:text-base font-semibold cursor-pointer ${operadorIdActivo ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'}`}
                    >
                      <Users className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-left">{operadorIdActivo ? operadores.find((o) => o.id === operadorIdActivo)?.nombre || 'Todos' : 'Operador'}</span>
                      <ChevronDown className={`w-4 h-4 2xl:w-5 2xl:h-5 shrink-0 ${dropdownOperadorCanjesAbierto ? 'rotate-180' : ''}`} />
                    </button>
                    {dropdownOperadorCanjesAbierto && (
                      <div className="absolute top-full right-0 mt-1.5 w-64 bg-white rounded-xl border-2 border-slate-300 shadow-lg z-50 py-1 overflow-hidden">
                        <button onClick={() => { setOperadorId(''); setDropdownOperadorCanjesAbierto(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm 2xl:text-base font-semibold text-left cursor-pointer ${!operadorIdActivo ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${!operadorIdActivo ? 'bg-blue-500' : 'bg-slate-200'}`}>{!operadorIdActivo && <Check className="w-3 h-3 text-white" />}</div>
                          Todos los operadores
                        </button>
                        <div className="h-px bg-slate-200 my-1" />
                        <div className="max-h-48 overflow-y-auto">
                          {operadores.map((op) => (
                            <button key={op.id} onClick={() => { setOperadorId(op.id); setDropdownOperadorCanjesAbierto(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm 2xl:text-base font-semibold text-left cursor-pointer ${operadorIdActivo === op.id ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-blue-50'}`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${operadorIdActivo === op.id ? 'bg-blue-500' : 'bg-slate-200'}`}>{operadorIdActivo === op.id && <Check className="w-3 h-3 text-white" />}</div>
                              <span className="truncate">{op.nombre}</span>
                              <span className={`ml-auto text-sm px-1.5 py-0.5 rounded-full shrink-0 ${op.tipo === 'empleado' ? 'bg-blue-100 text-blue-600' : op.tipo === 'gerente' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-600'}`}>{op.tipo === 'empleado' ? 'Empleado' : op.tipo === 'gerente' ? 'Gerente' : 'Dueño'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Estado dropdown — solo móvil */}
                <div className="lg:hidden flex-1 relative" ref={estadoCanjesDropdownRef}>
                  {(() => {
                    const ESTADOS_CANJE = [
                      { id: '', etiqueta: 'Todos', Icono: LayoutList, color: 'text-slate-500' },
                      { id: 'pendiente', etiqueta: 'Pendientes', Icono: Hourglass, color: 'text-amber-600' },
                      { id: 'usado', etiqueta: 'Usados', Icono: CheckCircle, color: 'text-green-600' },
                      { id: 'expirado', etiqueta: 'Vencidos', Icono: AlertCircle, color: 'text-red-500' },
                    ];
                    const seleccionado = ESTADOS_CANJE.find(e => e.id === estadoFiltroCanjes) ?? ESTADOS_CANJE[0];
                    return (
                      <>
                        <button
                          onClick={() => setEstadoCanjesDropdownAbierto(!estadoCanjesDropdownAbierto)}
                          className={`w-full flex items-center gap-1.5 h-11 lg:h-10 2xl:h-11 pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg border-2 text-base lg:text-sm 2xl:text-base font-semibold cursor-pointer ${estadoFiltroCanjes
                              ? 'bg-blue-100 border-blue-300 text-blue-700'
                              : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                            }`}
                        >
                          <seleccionado.Icono className={`w-4 h-4 shrink-0 ${estadoFiltroCanjes ? 'text-indigo-500' : seleccionado.color}`} />
                          <span className="truncate flex-1">{seleccionado.etiqueta}</span>
                          <ChevronDown className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 shrink-0 transition-transform ${estadoCanjesDropdownAbierto ? 'rotate-180' : ''}`} />
                        </button>
                        {estadoCanjesDropdownAbierto && (
                          <div className="absolute top-full left-0 mt-1.5 w-full bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-50 py-1 overflow-hidden">
                            {ESTADOS_CANJE.map((e) => {
                              const activo = estadoFiltroCanjes === e.id;
                              return (
                                <button
                                  key={e.id}
                                  onClick={() => { setEstadoFiltroCanjes(e.id); setEstadoCanjesDropdownAbierto(false); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-base lg:text-sm 2xl:text-base font-semibold text-left cursor-pointer ${activo ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                                >
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${activo ? 'bg-blue-500' : 'bg-slate-200'}`}>
                                    {activo ? <Check className="w-3 h-3 text-white" /> : <e.Icono className={`w-3 h-3 ${e.color}`} />}
                                  </div>
                                  <span>{e.etiqueta}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Fila 2: Operador (móvil) + Búsqueda */}
              <div className="flex items-center gap-1.5 lg:gap-2 2xl:gap-3">
                {/* Operador — solo móvil */}
                {operadores.length > 0 && (
                  <div className="flex-1 min-w-0 lg:hidden relative" ref={dropdownOperadorCanjesMovilRef}>
                    <button
                      onClick={() => setDropdownOperadorCanjesAbierto(!dropdownOperadorCanjesAbierto)}
                      className={`w-full flex items-center gap-1.5 h-11 pl-3 pr-2.5 rounded-lg border-2 text-base font-semibold cursor-pointer ${operadorIdActivo ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'}`}
                    >
                      <Users className="w-4 h-4 shrink-0" />
                      <span className="flex-1 min-w-0 truncate text-left">{operadorIdActivo ? operadores.find((o) => o.id === operadorIdActivo)?.nombre || 'Todos' : 'Operador'}</span>
                      <ChevronDown className={`w-5 h-5 shrink-0 ${dropdownOperadorCanjesAbierto ? 'rotate-180' : ''}`} />
                    </button>
                    {dropdownOperadorCanjesAbierto && (
                      <div className="absolute top-full right-0 mt-1.5 w-64 bg-white rounded-xl border-2 border-slate-300 shadow-lg z-50 py-1 overflow-hidden">
                        <button onClick={() => { setOperadorId(''); setDropdownOperadorCanjesAbierto(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-base font-semibold text-left cursor-pointer ${!operadorIdActivo ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${!operadorIdActivo ? 'bg-blue-500' : 'bg-slate-200'}`}>{!operadorIdActivo && <Check className="w-3 h-3 text-white" />}</div>
                          Todos
                        </button>
                        <div className="h-px bg-slate-200 my-1" />
                        <div className="max-h-48 overflow-y-auto">
                          {operadores.map((op) => (
                            <button key={op.id} onClick={() => { setOperadorId(op.id); setDropdownOperadorCanjesAbierto(false); }} className={`w-full flex items-center gap-2.5 px-3 py-2 text-base font-semibold text-left cursor-pointer ${operadorIdActivo === op.id ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-blue-50'}`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${operadorIdActivo === op.id ? 'bg-blue-500' : 'bg-slate-200'}`}>{operadorIdActivo === op.id && <Check className="w-3 h-3 text-white" />}</div>
                              <span className="truncate">{op.nombre}</span>
                              <span className={`ml-auto text-sm px-1.5 py-0.5 rounded-full shrink-0 ${op.tipo === 'empleado' ? 'bg-blue-100 text-blue-600' : op.tipo === 'gerente' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-600'}`}>{op.tipo === 'empleado' ? 'Empleado' : op.tipo === 'gerente' ? 'Gerente' : 'Dueño'}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Búsqueda */}
                <div className="relative flex-1 min-w-0">
                <Input
                  id="buscar-canje"
                  name="buscarCanje"
                  placeholder="Nombre o Celular..."
                  value={textoBusquedaCanjes}
                  onChange={(e) => handleBusquedaCanjes(e.target.value)}
                  className="h-11 lg:h-10 2xl:h-11 rounded-lg! text-base lg:text-sm 2xl:text-base pr-8"
                  icono={<Search className="w-4 h-4 text-slate-600" />}
                />
                {textoBusquedaCanjes && (
                  <button
                    onClick={() => { if (debounceCanjesRef.current) clearTimeout(debounceCanjesRef.current); setTextoBusquedaCanjes(''); setBusquedaCanjes(''); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-600 hover:text-slate-800 hover:bg-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contador de resultados */}
        <div className="flex items-center justify-between px-1 mt-3 lg:mt-2 2xl:mt-3 mb-1">
          <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
            {tabActivo === 'ventas' ? (
              historial.length < totalResultados
                ? `${historial.length} de ${totalResultados} ventas`
                : `${totalResultados} ventas`
            ) : tabActivo === 'cupones' ? (
              historialCupones.length < totalResultadosCupones
                ? `${historialCupones.length} de ${totalResultadosCupones} cupones`
                : `${totalResultadosCupones} cupones`
            ) : (
              historialCanjes.length < totalResultadosCanjes
                ? `${historialCanjes.length} de ${totalResultadosCanjes} vouchers`
                : `${totalResultadosCanjes} vouchers`
            )}
          </span>
        </div>

        {/* ================================================================= */}
        {/* TABLA DESKTOP (≥lg)                                               */}
        {/* ================================================================= */}

        {!isMobile && tabActivo === 'ventas' && (
          <div
            className="rounded-xl overflow-hidden border-2 border-slate-300 transition-opacity duration-150"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {/* Header dark */}
            <div
              className="grid grid-cols-[1.6fr_1.6fr_0.7fr_0.6fr_0.6fr_0.8fr] 2xl:grid-cols-[1fr_280px_110px_120px_120px_150px] gap-0 px-4 lg:px-3 2xl:px-5 py-2 lg:py-2 2xl:py-2 h-12 items-center text-[11px] lg:text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
            >
              <span>Cliente</span>
              <span className="-ml-[15px]">Concepto</span>
              <span className="-ml-[15px] flex justify-center overflow-visible z-10">
                <HeaderOrdenable etiqueta="MONTO" columna="monto" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
              <span className="-ml-[15px] flex justify-center overflow-visible z-10">
                <HeaderOrdenable etiqueta="PUNTOS" columna="puntos" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
              <span className="-ml-[15px] flex justify-center">Estado</span>
              <span className="flex justify-end overflow-visible z-10">
                <HeaderOrdenable etiqueta="VENDIDO" columna="fecha" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
            </div>

            {/* Body scrolleable */}
            <div
              className="max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-330px)] 2xl:max-h-[calc(100vh-455px)] overflow-y-auto bg-white"
            >
              {transaccionesOrdenadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <Inbox className="w-10 h-10 mb-2" />
                  <p className="text-sm font-medium">No se encontraron transacciones</p>
                </div>
              ) : (
                transaccionesOrdenadas.map((tx, i) => {
                  const esRevocada = tx.estado === 'cancelado';
                  return (
                    <button
                      key={tx.id}
                      onClick={() => handleVerDetalle(tx)}
                      className={`grid grid-cols-[1.6fr_1.6fr_0.7fr_0.6fr_0.6fr_0.8fr] 2xl:grid-cols-[1fr_280px_110px_120px_120px_150px] gap-0 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2 text-sm lg:text-xs 2xl:text-sm border-b border-slate-300 hover:bg-slate-200 cursor-pointer w-full text-left ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                        } ${esRevocada ? 'opacity-60' : ''}`}
                    >
                      {/* Cliente */}
                      <div className="flex items-center gap-2.5 2xl:gap-3 min-w-0">
                        <div
                          onClick={(e) => { if (tx.clienteAvatarUrl) { e.stopPropagation(); setAvatarUrl(tx.clienteAvatarUrl); } }}
                          className={`w-8 h-8 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden ${tx.clienteAvatarUrl ? 'cursor-pointer' : ''}`}
                        >
                          {tx.clienteAvatarUrl ? (
                            <img src={tx.clienteAvatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-blue-700">
                              {obtenerIniciales(tx.clienteNombre)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-bold text-slate-800 truncate 2xl:text-[15px] ${esRevocada ? 'line-through' : ''}`}>
                            {tx.clienteNombre}
                          </p>
                        </div>
                      </div>

                      {/* Concepto */}
                      <div className="flex items-center font-bold min-w-0">
                        <span className="text-slate-600 truncate leading-tight">
                          {tx.concepto || '—'}
                        </span>
                      </div>

                      {/* Monto */}
                      <div className="flex items-center justify-center">
                        <span className={`font-bold 2xl:text-[15px] ${esRevocada ? 'text-slate-600 line-through' : 'text-indigo-600'}`}>
                          {formatearMonto(tx.montoCompra)}
                        </span>
                      </div>

                      {/* Puntos */}
                      <div className="flex items-center justify-center">
                        <span className={`font-bold 2xl:text-[15px] ${esRevocada ? 'text-slate-600 line-through' : 'text-amber-600'}`}>
                          +{tx.puntosOtorgados}
                        </span>
                      </div>

                      {/* Estado */}
                      <div className="flex items-center justify-center">
                        {esRevocada ? (
                          <span className="inline-flex items-center gap-0.5 px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold bg-red-100 text-red-700">
                            <XCircle className="w-2.5 h-2.5 2xl:w-3 2xl:h-3" />
                            Revocada
                          </span>
                        ) : tx.estado === 'pendiente' ? (
                          <span className="inline-flex items-center gap-0.5 px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold bg-amber-100 text-amber-700">
                            Pendiente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold bg-green-100 text-green-700">
                            ✓ Válida
                          </span>
                        )}
                      </div>

                      {/* Fecha */}
                      <div className="flex items-center justify-end text-slate-600 font-bold 2xl:text-[15px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3.5 2xl:h-3.5" />
                          {formatearFechaCorta(tx.createdAt)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}

              {/* Cargar más en desktop */}
              {hayMas && (
                <button
                  onClick={cargarMas}
                  disabled={cargandoMas}
                  className="w-full py-3 text-sm text-blue-600 font-semibold hover:bg-blue-200 cursor-pointer disabled:opacity-50"
                >
                  {cargandoMas ? 'Cargando...' : 'Cargar más transacciones'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TABLA DESKTOP CUPONES (≥lg)                                       */}
        {/* ================================================================= */}

        {!isMobile && tabActivo === 'cupones' && (
          <div
            className="rounded-xl overflow-hidden border-2 border-slate-300"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {/* Header dark */}
            <div
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_100px_100px_130px] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_120px_120px_150px] gap-2 lg:gap-3 2xl:gap-4 px-4 lg:px-3 2xl:px-5 py-2 h-12 items-center text-[11px] lg:text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
            >
              <span>Cliente</span>
              <span>Cupón</span>
              <span className="pl-2 2xl:pl-2.5">Tipo</span>
              <span className="flex overflow-visible z-10">
                <HeaderOrdenable etiqueta="MONTO" columna="monto" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
              <span>Descuento</span>
              <span className="flex justify-end overflow-visible z-10">
                <HeaderOrdenable etiqueta="CANJEADO" columna="fecha" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
            </div>

            {/* Body */}
            <div className="max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-330px)] 2xl:max-h-[calc(100vh-390px)] overflow-y-auto bg-white">
              {cargandoHistorialCupones ? (
                <div className="flex items-center justify-center py-16"><Spinner /></div>
              ) : historialCupones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <Inbox className="w-10 h-10 mb-2" />
                  <p className="text-sm font-medium">No se encontraron cupones canjeados</p>
                </div>
              ) : (
                historialCupones.map((tx, i) => {
                  const esCuponGratis = tx.montoCompra === 0;
                  return (
                    <button
                      key={tx.id}
                      onClick={() => setTxSeleccionada(tx)}
                      className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_100px_100px_130px] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_120px_120px_150px] gap-2 lg:gap-3 2xl:gap-4 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2 text-sm lg:text-xs 2xl:text-sm border-b border-slate-300 hover:bg-slate-200 cursor-pointer w-full text-left ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'}`}
                    >
                      {/* Cliente */}
                      <div className="flex items-center gap-2.5 2xl:gap-3 min-w-0">
                        {tx.clienteAvatarUrl ? (
                          <img src={tx.clienteAvatarUrl} alt="" className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-blue-700">
                              {tx.clienteNombre?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate 2xl:text-[15px]">{tx.clienteNombre}</p>
                        </div>
                      </div>

                      {/* Cupón título */}
                      <div className="flex items-center gap-2 min-w-0">
                        {tx.cuponImagen && (
                          <img src={tx.cuponImagen} alt="" className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-md object-cover shrink-0" />
                        )}
                        <span className="font-bold text-slate-600 truncate">{tx.cuponTitulo || 'Cupón'}</span>
                      </div>

                      {/* Tipo */}
                      <div className="flex items-center">
                        <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full truncate">
                          {esCuponGratis ? 'Gratis' : tx.cuponTipo === 'porcentaje' ? `${tx.cuponValor}%` : tx.cuponTipo === 'monto_fijo' ? `$${tx.cuponValor}` : tx.cuponTipo === '2x1' ? '2×1' : tx.cuponTipo === '3x2' ? '3×2' : tx.cuponTipo || 'Cupón'}
                        </span>
                      </div>

                      {/* Monto */}
                      <div className="flex items-center">
                        <span className={`font-bold 2xl:text-[15px] ${esCuponGratis ? 'text-slate-600' : 'text-slate-800'}`}>
                          {esCuponGratis ? 'Gratis' : `$${tx.montoCompra.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                        </span>
                      </div>

                      {/* Descuento */}
                      <div className="flex items-center">
                        <span className="font-bold 2xl:text-[15px] text-blue-700">
                          {tx.cuponDescuento ? `-$${tx.cuponDescuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                        </span>
                      </div>

                      {/* Canjeado */}
                      <div className="flex items-center justify-end text-slate-600 font-bold 2xl:text-[15px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3.5 2xl:h-3.5" />
                          {formatearFechaCorta(tx.createdAt)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}

              {/* Cargar más */}
              {hayMasCupones && (
                <button
                  onClick={cargarMasCupones}
                  disabled={cargandoMasCupones}
                  className="w-full py-3 text-sm text-blue-600 font-semibold hover:bg-blue-100 cursor-pointer disabled:opacity-50"
                >
                  {cargandoMasCupones ? 'Cargando...' : 'Cargar más cupones'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TABLA DESKTOP CANJES (≥lg)                                        */}
        {/* ================================================================= */}

        {!isMobile && tabActivo === 'canjes' && (
          <div
            className="rounded-xl overflow-hidden border-2 border-slate-300 transition-opacity duration-150"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {/* Header dark - Canjes (6 columnas) */}
            <div
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_85px_105px_100px_130px] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_120px_115px_150px] gap-2 lg:gap-3 2xl:gap-4 px-4 lg:px-3 2xl:px-5 py-2 lg:py-2 2xl:py-2 h-12 items-center text-[11px] lg:text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
            >
              <span>Cliente</span>
              <span>Recompensa</span>
              <span className="flex overflow-visible z-10">
                <HeaderOrdenable etiqueta="PUNTOS" columna="puntos" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
              <span className="pl-2 2xl:pl-2.5">Estado</span>
              <span className="flex overflow-visible z-10">
                <HeaderOrdenable etiqueta="EXPIRA" columna="fecha" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
              <span className="flex justify-end overflow-visible z-10">CANJEADO</span>
            </div>

            {/* Body scrolleable - Canjes */}
            <div
              className="max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-330px)] 2xl:max-h-[calc(100vh-390px)] overflow-y-auto bg-white"
            >
              {cargandoHistorialCanjes ? (
                <div className="flex items-center justify-center py-16">
                  <Spinner />
                </div>
              ) : canjesOrdenados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                  <Inbox className="w-10 h-10 mb-2" />
                  <p className="text-sm font-medium">No se encontraron vouchers</p>
                </div>
              ) : (
                canjesOrdenados.map((canje, i) => (
                  <button
                    key={canje.id}
                    onClick={() => handleVerDetalleCanje(canje)}
                    className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_85px_105px_100px_130px] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_120px_115px_150px] gap-2 lg:gap-3 2xl:gap-4 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2 text-sm lg:text-xs 2xl:text-sm border-b border-slate-300 hover:bg-slate-200 cursor-pointer w-full text-left ${i % 2 === 0 ? 'bg-white' : 'bg-slate-100'
                      }`}
                  >
                    {/* Cliente */}
                    <div className="flex items-center gap-2.5 2xl:gap-3 min-w-0">
                      <div
                        onClick={(e) => { if (canje.clienteAvatarUrl) { e.stopPropagation(); setAvatarUrl(canje.clienteAvatarUrl); } }}
                        className={`w-8 h-8 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden ${canje.clienteAvatarUrl ? 'cursor-pointer' : ''}`}
                      >
                        {canje.clienteAvatarUrl ? (
                          <img src={canje.clienteAvatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-blue-700">
                            {obtenerIniciales(canje.clienteNombre)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate 2xl:text-[15px]">
                          {canje.clienteNombre}
                        </p>
                      </div>
                    </div>

                    {/* Recompensa */}
                    <div className="flex items-center gap-2 min-w-0">
                      {canje.recompensaImagenUrl && (
                        <img
                          src={canje.recompensaImagenUrl}
                          alt=""
                          className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-md object-cover shrink-0"
                        />
                      )}
                      <span className="font-bold text-slate-600 truncate leading-tight">
                        {canje.recompensaNombre}
                      </span>
                    </div>

                    {/* Puntos */}
                    <div className="flex items-center">
                      <span className="font-bold 2xl:text-[15px] text-amber-600">
                        -{canje.puntosUsados}
                      </span>
                    </div>

                    {/* Estado */}
                    <div className="flex items-center">
                      <BadgeEstadoCanje estado={canje.estado} />
                    </div>

                    {/* Expira (siempre muestra expiración) */}
                    <div className="flex items-center">
                      <span className={`flex items-center gap-1 font-bold 2xl:text-[15px] ${colorExpiracion(canje.expiraAt)}`}>
                        <Clock className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3.5 2xl:h-3.5" />
                        {formatearExpiracion(canje.expiraAt)}
                      </span>
                    </div>

                    {/* Canjeado (fecha de uso, solo si fue usado) */}
                    <div className="flex items-center justify-end">
                      {canje.usadoAt ? (
                        <span className="flex items-center gap-1 font-bold 2xl:text-[15px] text-slate-600">
                          <Clock className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3.5 2xl:h-3.5" />
                          {formatearFechaCorta(canje.usadoAt)}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-sm">—</span>
                      )}
                    </div>
                  </button>
                ))
              )}

              {/* Cargar más vouchers en desktop */}
              {hayMasCanjes && (
                <button
                  onClick={cargarMasCanjes}
                  disabled={cargandoMasCanjes}
                  className="w-full py-3 text-sm text-blue-600 font-semibold hover:bg-blue-200 cursor-pointer disabled:opacity-50"
                >
                  {cargandoMasCanjes ? 'Cargando...' : 'Cargar más vouchers'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* LISTA MOBILE VENTAS (<lg)                                        */}
        {/* ================================================================= */}

        {isMobile && tabActivo === 'ventas' && (
          <div className="space-y-2">
            {/* Chips de orden (móvil) */}
            <div className="flex items-center bg-slate-800 rounded-xl border-2 border-slate-700 p-0.5 shadow-md">
              {([
                { col: 'monto' as ColumnaOrden, etiqueta: 'Monto' },
                { col: 'puntos' as ColumnaOrden, etiqueta: 'Puntos' },
                { col: 'fecha' as ColumnaOrden, etiqueta: 'Fecha' },
              ]).map(({ col, etiqueta }) => {
                const activa = orden?.columna === col;
                return (
                  <button
                    key={col}
                    onClick={() => alternarOrden(col)}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold cursor-pointer ${activa
                        ? 'bg-slate-400 text-slate-900 shadow-md'
                        : 'text-white hover:bg-white/10'
                      }`}
                  >
                    {etiqueta}
                    {activa && orden?.direccion === 'desc' && <ChevronDown className="w-4 h-4 text-slate-900" strokeWidth={2.5} />}
                    {activa && orden?.direccion === 'asc' && <ChevronUp className="w-4 h-4 text-slate-900" strokeWidth={2.5} />}
                    {!activa && <ArrowUpDown className="w-4 h-4 text-white" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>

            {/* Cards */}
            {transaccionesOrdenadas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                <Inbox className="w-10 h-10 mb-2" />
                <p className="text-sm font-medium">No se encontraron transacciones</p>
              </div>
            ) : (
              transaccionesOrdenadas.map((tx) => (
                <FilaMovil key={tx.id} transaccion={tx} onVerDetalle={handleVerDetalle} onChatear={handleChatear} />
              ))
            )}

            {/* Sentinela infinite scroll */}
            <div ref={sentinelaRef} className="h-1" />

            {cargandoMas && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* LISTA MOBILE CUPONES (<lg)                                        */}
        {/* ================================================================= */}

        {isMobile && tabActivo === 'cupones' && (
          <div className="space-y-2">
            {cargandoHistorialCupones ? (
              <div className="flex items-center justify-center py-16"><Spinner /></div>
            ) : historialCupones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                <Inbox className="w-10 h-10 mb-2" />
                <p className="text-sm font-medium">No se encontraron cupones canjeados</p>
              </div>
            ) : (
              historialCupones.map((tx) => {
                const esCuponGratis = tx.montoCompra === 0;
                return (
                  <button
                    key={tx.id}
                    onClick={() => setTxSeleccionada(tx)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border-2 border-slate-300 text-left cursor-pointer"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  >
                    {/* Avatar */}
                    {tx.clienteAvatarUrl ? (
                      <img src={tx.clienteAvatarUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-blue-700">
                          {tx.clienteNombre?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-800 truncate">{tx.clienteNombre}</p>
                      <div className="flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="text-sm font-medium text-slate-600 truncate">{tx.cuponTitulo || 'Cupón'}</span>
                      </div>
                    </div>
                    {/* Derecha */}
                    <div className="flex flex-col items-end shrink-0 gap-0.5">
                      <span className={`text-base font-bold ${esCuponGratis ? 'text-blue-700' : 'text-slate-800'}`}>
                        {esCuponGratis ? 'Gratis' : `$${tx.montoCompra.toFixed(2)}`}
                      </span>
                      <span className="text-sm font-medium text-slate-600">
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : ''}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
            {/* Cargar más */}
            {hayMasCupones && (
              <button
                onClick={cargarMasCupones}
                disabled={cargandoMasCupones}
                className="w-full py-3 text-sm text-blue-600 font-semibold cursor-pointer disabled:opacity-50"
              >
                {cargandoMasCupones ? 'Cargando...' : 'Cargar más cupones'}
              </button>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* LISTA MOBILE CANJES (<lg)                                         */}
        {/* ================================================================= */}

        {isMobile && tabActivo === 'canjes' && (
          <div className="space-y-2">
            {/* Chips de orden (móvil canjes) */}
            <div className="flex items-center bg-slate-800 rounded-xl border-2 border-slate-700 p-0.5 shadow-md">
              {([
                { col: 'puntos' as ColumnaOrden, etiqueta: 'Puntos' },
                { col: 'fecha' as ColumnaOrden, etiqueta: 'Expira' },
              ]).map(({ col, etiqueta }) => {
                const activa = orden?.columna === col;
                return (
                  <button
                    key={col}
                    onClick={() => alternarOrden(col)}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-10 rounded-lg text-sm font-semibold cursor-pointer ${activa
                        ? 'bg-slate-400 text-slate-900 shadow-md'
                        : 'text-white hover:bg-white/10'
                      }`}
                  >
                    {etiqueta}
                    {activa && orden?.direccion === 'desc' && <ChevronDown className="w-4 h-4 text-slate-900" strokeWidth={2.5} />}
                    {activa && orden?.direccion === 'asc' && <ChevronUp className="w-4 h-4 text-slate-900" strokeWidth={2.5} />}
                    {!activa && <ArrowUpDown className="w-4 h-4 text-white" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>

            {/* Cards canjes */}
            {cargandoHistorialCanjes ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : canjesOrdenados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600">
                <Inbox className="w-10 h-10 mb-2" />
                <p className="text-sm font-medium">No se encontraron vouchers</p>
              </div>
            ) : (
              canjesOrdenados.map((canje) => (
                <FilaMovilCanje key={canje.id} canje={canje} onVerDetalle={handleVerDetalleCanje} onChatear={handleChatear} />
              ))
            )}

            {/* Sentinela infinite scroll canjes */}
            <div ref={sentinelaCanjesRef} className="h-1" />

            {cargandoMasCanjes && (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            )}
          </div>
        )}

      </div>

      {/* ================================================================= */}
      {/* MODAL DETALLE TRANSACCIÓN                                         */}
      {/* ================================================================= */}

      <ModalDetalleTransaccionBS
        abierto={txSeleccionada !== null}
        onCerrar={handleCerrarModal}
        transaccion={txSeleccionada}
      />

      <ModalDetalleCanjeBS
        abierto={canjeSeleccionado !== null}
        onCerrar={handleCerrarModalCanje}
        canje={canjeSeleccionado}
      />
      {avatarUrl && (
        <ModalImagenes images={[avatarUrl]} isOpen={!!avatarUrl} onClose={() => setAvatarUrl(null)} />
      )}
    </div>
  );
}