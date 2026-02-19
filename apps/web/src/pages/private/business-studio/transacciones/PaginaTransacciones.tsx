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
} from 'lucide-react';
import { useTransaccionesStore } from '../../../../stores/useTransaccionesStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import { descargarCSV } from '../../../../services/transaccionesService';
import ModalDetalleTransaccionBS from './ModalDetalleTransaccionBS';
import ModalDetalleCanjeBS from './ModalDetalleCanjeBS';
import type { TransaccionPuntos, PeriodoEstadisticas } from '../../../../types/puntos';
import type { VoucherCanje } from '../../../../types/transacciones';

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
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: 'semana', etiqueta: 'Semana' },
  { id: 'mes', etiqueta: 'Mes' },
  { id: '3meses', etiqueta: '3 Meses' },
  { id: 'anio', etiqueta: 'Año' },
  { id: 'todo', etiqueta: 'Todo' },
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
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
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
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

/** Color del badge de expiración según urgencia */
const colorExpiracion = (fechaISO: string | null): string => {
  if (!fechaISO) return 'text-slate-400';
  const diffDias = Math.ceil((new Date(fechaISO).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 'text-red-500';
  if (diffDias <= 3) return 'text-red-500 font-bold';
  if (diffDias <= 7) return 'text-amber-500';
  return 'text-slate-500';
};

/** Badge de estado para vouchers de canje */
const BadgeEstadoCanje = ({ estado }: { estado: VoucherCanje['estado'] }) => {
  const config = {
    pendiente: { texto: 'Pendiente', icono: Hourglass, border: 'border-amber-200', bg: 'bg-amber-50', color: 'text-amber-600' },
    usado: { texto: 'Usado', icono: CheckCircle, border: 'border-green-200', bg: 'bg-green-50', color: 'text-green-600' },
    expirado: { texto: 'Vencido', icono: AlertCircle, border: 'border-red-200', bg: 'bg-red-50', color: 'text-red-600' },
  }[estado];
  const Icono = config.icono;
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-[10px] lg:text-[9px] 2xl:text-[13px] font-bold border ${config.border} ${config.bg} ${config.color}`}>
      <Icono className="w-2.5 h-2.5 2xl:w-3 2xl:h-3" />
      {config.texto}
    </span>
  );
};

// =============================================================================
// HOOK: Detectar móvil
// =============================================================================

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
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
        <ArrowUpDown className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-slate-400 group-hover:text-amber-300" />
      )}
      {activa && direccion === 'desc' && (
        <ChevronDown className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-400" />
      )}
      {activa && direccion === 'asc' && (
        <ChevronUp className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-amber-400" />
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
}: {
  transaccion: TransaccionPuntos;
  onVerDetalle: (tx: TransaccionPuntos) => void;
}) {
  const esRevocada = transaccion.estado === 'cancelado';

  return (
    <button
      onClick={() => onVerDetalle(transaccion)}
      className={`w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer text-left ${esRevocada ? 'opacity-60' : ''
        }`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
        {transaccion.clienteAvatarUrl ? (
          <img src={transaccion.clienteAvatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-slate-500">
            {obtenerIniciales(transaccion.clienteNombre)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold text-slate-800 truncate ${esRevocada ? 'line-through' : ''}`}>
            {transaccion.clienteNombre}
          </p>
          {/* Badge estado */}
          {esRevocada ? (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-red-200 bg-red-50 text-red-600">
              <XCircle className="w-2.5 h-2.5" />
              Revocada
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-green-200 bg-green-50 text-green-600">
              ✓
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
          <span className={`font-bold ${esRevocada ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>
            {formatearMonto(transaccion.montoCompra)}
          </span>
          <span className={esRevocada ? 'line-through' : 'text-amber-600 font-medium'}>
            +{transaccion.puntosOtorgados} pts
          </span>
          <span>{formatearFechaCorta(transaccion.createdAt)}</span>
        </div>
      </div>

      <Eye className="w-4 h-4 text-slate-300 shrink-0" />
    </button>
  );
}

// =============================================================================
// COMPONENTE: Card de canje (móvil)
// =============================================================================

function FilaMovilCanje({
  canje,
  onVerDetalle,
}: {
  canje: VoucherCanje;
  onVerDetalle: (c: VoucherCanje) => void;
}) {
  return (
    <button
      onClick={() => onVerDetalle(canje)}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer text-left"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
        {canje.clienteAvatarUrl ? (
          <img src={canje.clienteAvatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-bold text-slate-500">
            {obtenerIniciales(canje.clienteNombre)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 truncate">
            {canje.clienteNombre}
          </p>
          <BadgeEstadoCanje estado={canje.estado} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
          <span className="font-medium text-purple-600 truncate max-w-[140px]">
            {canje.recompensaNombre}
          </span>
          <span className="text-amber-600 font-medium">
            -{canje.puntosUsados} pts
          </span>
          {canje.estado === 'pendiente' && canje.expiraAt && (
            <span className={colorExpiracion(canje.expiraAt)}>
              {formatearExpiracion(canje.expiraAt)}
            </span>
          )}
        </div>
      </div>

      <Eye className="w-4 h-4 text-slate-300 shrink-0" />
    </button>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaTransacciones() {
  // Leer parámetro de búsqueda de la URL
  const [searchParams, setSearchParams] = useSearchParams();
  const busquedaInicial = searchParams.get('busqueda') || '';

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
    operadores,
    cargarOperadores,
    estadoFiltro,
    setEstadoFiltro,
    cargarKPIs,
    cargarHistorial,
    cargarMas,
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

  // Estado local
  const [orden, setOrden] = useState<EstadoOrden | null>(null);
  const [textoBusqueda, setTextoBusqueda] = useState(busquedaInicial);
  const [txSeleccionada, setTxSeleccionada] = useState<TransaccionPuntos | null>(null);
  const [canjeSeleccionado, setCanjeSeleccionado] = useState<VoucherCanje | null>(null);
  const [textoBusquedaCanjes, setTextoBusquedaCanjes] = useState('');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();
  const sentinelaRef = useRef<HTMLDivElement | null>(null);
  const sentinelaCanjesRef = useRef<HTMLDivElement | null>(null);

  // ——— Carga inicial + recarga al cambiar sucursal ———
  useEffect(() => {
    cargarKPIs();
    cargarHistorial();
    cargarOperadores();
  }, [sucursalActiva]);

  // ——— Aplicar búsqueda de URL al montar ———
  useEffect(() => {
    if (busquedaInicial) {
      setBusqueda(busquedaInicial);
      // Limpiar parámetro de URL después de aplicarlo
      setSearchParams({}, { replace: true });
    }
  }, []); // Solo al montar

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
      await descargarCSV(periodo, textoBusqueda || undefined, operadorId || undefined, estadoFiltro || undefined);
    } catch (error) {
      console.error('Error al exportar CSV:', error);
    }
  }, [periodo, textoBusqueda, operadorId, estadoFiltro]);

  // ——— Abrir/cerrar modal detalle ———
  const handleVerDetalle = useCallback((tx: TransaccionPuntos) => {
    setTxSeleccionada(tx);
  }, []);

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
          <div className="flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
            <div
              className="flex items-center justify-center shrink-0"
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
            <div>
              <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                Transacciones
              </h1>
              {/* Toggle móvil */}
              <div className="lg:hidden mt-1">
                <div className="flex items-center bg-slate-200/80 rounded-lg p-0.5 border border-slate-300/60 w-fit">
                  <button
                    onClick={() => setTabActivo('ventas')}
                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all cursor-pointer ${tabActivo === 'ventas'
                        ? 'text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                    style={tabActivo === 'ventas' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                  >
                    Ventas
                  </button>
                  <button
                    onClick={() => setTabActivo('canjes')}
                    className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all cursor-pointer ${tabActivo === 'canjes'
                        ? 'text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                    style={tabActivo === 'canjes' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                  >
                    Canjes
                  </button>
                </div>
              </div>
              <p className="hidden lg:block text-sm lg:text-sm 2xl:text-base text-slate-500 mt-0.5 font-medium">
                {tabActivo === 'ventas' ? 'Historial de ventas y puntos' : 'Vouchers de recompensas'}
              </p>
            </div>

            {/* Toggle Ventas/Canjes - Desktop (centrado respecto a título+subtítulo) */}
            <div className="hidden lg:flex items-center bg-slate-200/80 rounded-lg p-0.5 border border-slate-300/60">
              <button
                onClick={() => setTabActivo('ventas')}
                className={`px-4 2xl:px-5 py-1.5 2xl:py-2 text-xs 2xl:text-sm font-bold rounded-md transition-all cursor-pointer ${tabActivo === 'ventas'
                    ? 'text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }`}
                style={tabActivo === 'ventas' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
              >
                Ventas
              </button>
              <button
                onClick={() => setTabActivo('canjes')}
                className={`px-4 2xl:px-5 py-1.5 2xl:py-2 text-xs 2xl:text-sm font-bold rounded-md transition-all cursor-pointer ${tabActivo === 'canjes'
                    ? 'text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }`}
                style={tabActivo === 'canjes' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
              >
                Canjes
              </button>
            </div>
          </div>

          {/* KPIs COMPACTOS - Carousel en móvil, fila en desktop */}
          <div className="overflow-x-auto lg:overflow-visible lg:flex-1 tx-carousel">
            <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0">

              {/* ============ KPIs TAB VENTAS ============ */}
              {tabActivo === 'ventas' && (
                <>
                  {/* Total Ventas */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
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
                      <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Ventas</div>
                    </div>
                  </div>

                  {/* # Transacciones */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
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
                      <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Transacciones</div>
                    </div>
                  </div>

                  {/* Ticket Promedio */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
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
                      <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Ticket Prom.</div>
                    </div>
                  </div>

                  {/* Revocadas */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
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
                      <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Revocadas</div>
                    </div>
                  </div>
                </>
              )}

              {/* ============ KPIs TAB CANJES ============ */}
              {tabActivo === 'canjes' && (
                <>
                  {/* Pendientes */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
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
                      <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Pendientes</div>
                    </div>
                  </div>

                  {/* Usados */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
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
                      <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Usados</div>
                    </div>
                  </div>

                  {/* Vencidos */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
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
                      <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Vencidos</div>
                    </div>
                  </div>

                  {/* Total Canjes */}
                  <div
                    className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px]"
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
                      <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Total</div>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* FILTROS: Tabs Periodo + Búsqueda + Exportar CSV                   */}
        {/* ================================================================= */}

        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border border-slate-200 p-4 lg:p-3 2xl:p-4 mt-2 lg:mt-7 2xl:mt-14">
          {/* ============ FILTROS TAB VENTAS ============ */}
          {tabActivo === 'ventas' && (
            <>
              <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 2xl:gap-4">
                {/* Tabs periodo - scroll horizontal */}
                <div className="flex gap-1.5 overflow-x-auto tx-carousel shrink-0 py-1 pr-1">
                  {PERIODOS_CONFIG.map((p) => {
                    const activo = periodo === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => handlePeriodo(p.id)}
                        className={`px-4 lg:px-3 2xl:px-4 py-2 lg:py-1.5 2xl:py-2 rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold border transition-all shrink-0 cursor-pointer ${activo
                            ? 'text-white border-slate-700 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                          }`}
                        style={activo ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                      >
                        {p.etiqueta}
                      </button>
                    );
                  })}
                </div>

                {/* Búsqueda - Filtrado en backend con debounce */}
                <div className="flex-1 lg:max-w-sm 2xl:max-w-md relative">
                  <Input
                    placeholder="Nombre o Celular..."
                    value={textoBusqueda}
                    onChange={(e) => handleBusqueda(e.target.value)}
                    className="h-10 lg:h-9 2xl:h-10 text-sm lg:text-xs 2xl:text-sm pr-8"
                    icono={<Search className="w-4 h-4 text-slate-400" />}
                  />
                  {textoBusqueda && (
                    <button
                      onClick={() => { if (debounceRef.current) clearTimeout(debounceRef.current); setTextoBusqueda(''); setBusqueda(''); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Filtro operador + Exportar (móvil: misma fila) */}
                <div className="flex items-center gap-2 lg:contents">
                  {operadores.length > 0 && (
                    <div className="shrink-0 relative" ref={dropdownRef}>
                      <button
                        onClick={() => setDropdownAbierto(!dropdownAbierto)}
                        className={`flex items-center gap-2 h-10 lg:h-9 2xl:h-10 pl-3 lg:pl-2.5 2xl:pl-3 pr-2.5 lg:pr-2 2xl:pr-2.5 rounded-lg border text-sm lg:text-xs 2xl:text-sm font-medium cursor-pointer transition-colors ${operadorId
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                      >
                        <Users className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 shrink-0 opacity-60" />
                        <span className="max-w-[120px] lg:max-w-[100px] 2xl:max-w-[120px] truncate">
                          {operadorId
                            ? operadores.find((o) => o.id === operadorId)?.nombre || 'Todos'
                            : 'Operador'}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-50 transition-transform ${dropdownAbierto ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Panel desplegable */}
                      {dropdownAbierto && (
                        <div className="absolute top-full left-0 lg:left-auto lg:right-0 mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-lg shadow-slate-200/50 z-50 py-1 overflow-hidden">
                          {/* Opción "Todos" */}
                          <button
                            onClick={() => { setOperadorId(''); setDropdownAbierto(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm lg:text-xs 2xl:text-sm text-left cursor-pointer transition-colors ${!operadorId ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${!operadorId ? 'bg-indigo-500' : 'bg-slate-100'
                              }`}>
                              {!operadorId && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span>Todos los operadores</span>
                          </button>

                          {/* Separador */}
                          <div className="h-px bg-slate-100 my-1" />

                          {/* Lista de operadores */}
                          <div className="max-h-48 overflow-y-auto">
                            {operadores.map((op) => {
                              const seleccionado = operadorId === op.id;
                              return (
                                <button
                                  key={op.id}
                                  onClick={() => { setOperadorId(op.id); setDropdownAbierto(false); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm lg:text-xs 2xl:text-sm text-left cursor-pointer transition-colors ${seleccionado ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${seleccionado ? 'bg-indigo-500' : 'bg-slate-100'
                                    }`}>
                                    {seleccionado && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className="truncate">{op.nombre}</span>
                                  <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${op.tipo === 'empleado'
                                      ? 'bg-blue-50 text-blue-500'
                                      : op.tipo === 'gerente'
                                        ? 'bg-purple-50 text-purple-500'
                                        : 'bg-amber-50 text-amber-600'
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

                  {/* Exportar CSV (móvil: junto a Operador) */}
                  <button
                    onClick={handleExportar}
                    className="shrink-0 flex items-center gap-1.5 h-10 lg:h-9 2xl:h-10 px-3 lg:px-2.5 2xl:px-3 rounded-lg text-sm lg:text-xs 2xl:text-sm font-bold text-slate-600 cursor-pointer lg:order-last"
                    style={{
                      background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                      border: '1.5px solid #cbd5e1',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    <Download className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                    Reporte
                  </button>
                </div>

                {/* Filtro estado */}
                <div className="shrink-0 flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5">
                  {[
                    { id: '', etiqueta: 'Todas' },
                    { id: 'confirmado', etiqueta: 'Válidas' },
                    { id: 'cancelado', etiqueta: 'Revocadas' },
                  ].map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEstadoFiltro(e.id)}
                      className={`px-3.5 lg:px-2.5 2xl:px-3.5 py-2 lg:py-1.5 2xl:py-2.5 rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold cursor-pointer transition-colors ${estadoFiltro === e.id
                          ? 'text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      style={estadoFiltro === e.id ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                    >
                      {e.etiqueta}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ============ FILTROS TAB CANJES ============ */}
          {tabActivo === 'canjes' && (
            <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 2xl:gap-4">
              {/* Tabs periodo - scroll horizontal */}
              <div className="flex gap-1.5 overflow-x-auto tx-carousel shrink-0 py-1 pr-1">
                {PERIODOS_CONFIG.map((p) => {
                  const activo = periodo === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePeriodo(p.id)}
                      className={`px-4 lg:px-3 2xl:px-4 py-2 lg:py-1.5 2xl:py-2 rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold border transition-all shrink-0 cursor-pointer ${activo
                          ? 'text-white border-slate-700 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      style={activo ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                    >
                      {p.etiqueta}
                    </button>
                  );
                })}
              </div>

              {/* Búsqueda canjes */}
              <div className="flex-1 lg:max-w-sm 2xl:max-w-md relative">
                <Input
                  placeholder="Buscar cliente..."
                  value={textoBusquedaCanjes}
                  onChange={(e) => handleBusquedaCanjes(e.target.value)}
                  className="h-10 lg:h-9 2xl:h-10 text-sm lg:text-xs 2xl:text-sm pr-8"
                  icono={<Search className="w-4 h-4 text-slate-400" />}
                />
                {textoBusquedaCanjes && (
                  <button
                    onClick={() => { if (debounceCanjesRef.current) clearTimeout(debounceCanjesRef.current); setTextoBusquedaCanjes(''); setBusquedaCanjes(''); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Filtro estado canjes */}
              <div className="shrink-0 flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5">
                {[
                  { id: '', etiqueta: 'Todos' },
                  { id: 'pendiente', etiqueta: 'Pendientes' },
                  { id: 'usado', etiqueta: 'Usados' },
                  { id: 'expirado', etiqueta: 'Vencidos' },
                ].map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setEstadoFiltroCanjes(e.id)}
                    className={`px-3.5 lg:px-2.5 2xl:px-3.5 py-2 lg:py-1.5 2xl:py-2.5 rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold cursor-pointer transition-colors ${estadoFiltroCanjes === e.id
                        ? 'text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    style={estadoFiltroCanjes === e.id ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                  >
                    {e.etiqueta}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contador de resultados */}
        <div className="flex items-center justify-between px-1 mt-3 lg:mt-2 2xl:mt-3 mb-1">
          <span className="text-xs lg:text-[11px] 2xl:text-xs text-slate-400 font-medium">
            {tabActivo === 'ventas' ? (
              historial.length < totalResultados
                ? `${historial.length} de ${totalResultados} resultados`
                : `${totalResultados} resultados`
            ) : (
              historialCanjes.length < totalResultadosCanjes
                ? `${historialCanjes.length} de ${totalResultadosCanjes} canjes`
                : `${totalResultadosCanjes} canjes`
            )}
          </span>
        </div>

        {/* ================================================================= */}
        {/* TABLA DESKTOP (≥lg)                                               */}
        {/* ================================================================= */}

        {!isMobile && tabActivo === 'ventas' && (
          <div
            className="rounded-xl overflow-hidden border border-slate-200 transition-opacity duration-150"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {/* Header dark */}
            <div
              className="grid grid-cols-[1.6fr_1.6fr_0.7fr_0.6fr_0.6fr_0.8fr] 2xl:grid-cols-[1fr_280px_110px_120px_250px_100px] gap-0 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-3 text-[11px] lg:text-[11px] 2xl:text-[13px] font-semibold text-white/80 uppercase tracking-wider"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
            >
              <span>Cliente</span>
              <span className="flex justify-center mr-53">Concepto</span>
              <span className="flex justify-center ml-17 overflow-visible z-10">
                <HeaderOrdenable etiqueta="MONTO" columna="monto" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
              <span className="flex justify-center ml-22 overflow-visible z-10">
                <HeaderOrdenable etiqueta="PUNTOS" columna="puntos" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
              <span className="flex justify-center mr-13">Estado</span>
              <span className="flex justify-end mr-2 overflow-visible z-10">
                <HeaderOrdenable etiqueta="FECHA" columna="fecha" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
            </div>

            {/* Body scrolleable */}
            <div
              className="max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-330px)] 2xl:max-h-[calc(100vh-390px)] overflow-y-auto bg-white"
            >
              {transaccionesOrdenadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
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
                      className={`grid grid-cols-[1.6fr_1.6fr_0.7fr_0.6fr_0.6fr_0.8fr] 2xl:grid-cols-[1fr_280px_110px_120px_210px_130px] gap-0 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-3 text-sm lg:text-xs 2xl:text-sm border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer w-full text-left ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        } ${esRevocada ? 'opacity-60' : ''}`}
                    >
                      {/* Cliente */}
                      <div className="flex items-center gap-2.5 2xl:gap-3 min-w-0">
                        <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {tx.clienteAvatarUrl ? (
                            <img src={tx.clienteAvatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] lg:text-[9px] 2xl:text-xs font-bold text-slate-500">
                              {obtenerIniciales(tx.clienteNombre)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`font-semibold text-slate-800 truncate 2xl:text-[15px] ${esRevocada ? 'line-through' : ''}`}>
                            {tx.clienteNombre}
                          </p>
                          {tx.clienteTelefono && (
                            <p className="text-[11px] lg:text-[10px] 2xl:text-xs text-slate-400">
                              {formatearTelefono(tx.clienteTelefono)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Concepto */}
                      <div className="flex items-center font-bold min-w-0">
                        <span className="text-slate-600 truncate leading-tight">
                          {tx.concepto || '—'}
                        </span>
                      </div>

                      {/* Monto */}
                      <div className="flex items-center justify-end">
                        <span className={`font-bold 2xl:text-[15px] ${esRevocada ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>
                          {formatearMonto(tx.montoCompra)}
                        </span>
                      </div>

                      {/* Puntos */}
                      <div className="flex items-center justify-end">
                        <span className={`font-bold 2xl:text-[15px] ${esRevocada ? 'text-slate-400 line-through' : 'text-amber-600'}`}>
                          +{tx.puntosOtorgados}
                        </span>
                      </div>

                      {/* Estado */}
                      <div className="flex items-center justify-center">
                        {esRevocada ? (
                          <span className="inline-flex items-center gap-0.5 px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-[10px] lg:text-[9px] 2xl:text-[13px] font-bold border border-red-200 bg-red-50 text-red-600">
                            <XCircle className="w-2.5 h-2.5 2xl:w-3 2xl:h-3" />
                            Revocada
                          </span>
                        ) : tx.estado === 'pendiente' ? (
                          <span className="inline-flex items-center gap-0.5 px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-[10px] lg:text-[9px] 2xl:text-[13px] font-bold border border-amber-200 bg-amber-50 text-amber-600">
                            Pendiente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-[10px] lg:text-[9px] 2xl:text-[13px] font-bold border border-green-200 bg-green-50 text-green-600">
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
                  className="w-full py-3 text-sm text-blue-600 font-semibold hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cargandoMas ? 'Cargando...' : 'Cargar más transacciones'}
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
            className="rounded-xl overflow-hidden border border-slate-200 transition-opacity duration-150"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {/* Header dark - Canjes (6 columnas) */}
            <div
              className="grid grid-cols-[1.4fr_1.4fr_0.6fr_0.6fr_0.7fr_0.7fr] 2xl:grid-cols-[1fr_240px_90px_120px_110px_110px] gap-0 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-3 text-[11px] lg:text-[11px] 2xl:text-[13px] font-semibold text-white/80 uppercase tracking-wider"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
            >
              <span>Cliente</span>
              <span className="flex justify-center">Recompensa</span>
              <span className="flex justify-center overflow-visible z-10">
                <HeaderOrdenable etiqueta="PUNTOS" columna="puntos" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
              <span className="flex justify-center">Estado</span>
              <span className="flex justify-center overflow-visible z-10">
                <HeaderOrdenable etiqueta="EXPIRA" columna="fecha" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
              <span className="flex justify-end mr-2">Canjeado</span>
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
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Inbox className="w-10 h-10 mb-2" />
                  <p className="text-sm font-medium">No se encontraron canjes</p>
                </div>
              ) : (
                canjesOrdenados.map((canje, i) => (
                  <button
                    key={canje.id}
                    onClick={() => handleVerDetalleCanje(canje)}
                    className={`grid grid-cols-[1.4fr_1.4fr_0.6fr_0.6fr_0.7fr_0.7fr] 2xl:grid-cols-[1fr_240px_90px_120px_110px_110px] gap-0 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-3 text-sm lg:text-xs 2xl:text-sm border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer w-full text-left ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                  >
                    {/* Cliente */}
                    <div className="flex items-center gap-2.5 2xl:gap-3 min-w-0">
                      <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {canje.clienteAvatarUrl ? (
                          <img src={canje.clienteAvatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] lg:text-[9px] 2xl:text-xs font-bold text-slate-500">
                            {obtenerIniciales(canje.clienteNombre)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate 2xl:text-[15px]">
                          {canje.clienteNombre}
                        </p>
                        {canje.clienteTelefono && (
                          <p className="text-[11px] lg:text-[10px] 2xl:text-xs text-slate-400">
                            {formatearTelefono(canje.clienteTelefono)}
                          </p>
                        )}
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
                    <div className="flex items-center justify-center">
                      <span className="font-bold 2xl:text-[15px] text-amber-600">
                        -{canje.puntosUsados}
                      </span>
                    </div>

                    {/* Estado */}
                    <div className="flex items-center justify-center">
                      <BadgeEstadoCanje estado={canje.estado} />
                    </div>

                    {/* Expira (siempre muestra expiración) */}
                    <div className="flex items-center justify-center">
                      <span className={`flex items-center gap-1 font-bold 2xl:text-[15px] ${colorExpiracion(canje.expiraAt)}`}>
                        <Clock className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3.5 2xl:h-3.5" />
                        {formatearExpiracion(canje.expiraAt)}
                      </span>
                    </div>

                    {/* Canjeado (fecha de uso, solo si fue usado) */}
                    <div className="flex items-center justify-end">
                      {canje.usadoAt ? (
                        <span className="flex items-center gap-1 font-bold 2xl:text-[15px] text-emerald-600">
                          <CheckCircle className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3.5 2xl:h-3.5" />
                          {formatearFechaCorta(canje.usadoAt)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </div>
                  </button>
                ))
              )}

              {/* Cargar más canjes en desktop */}
              {hayMasCanjes && (
                <button
                  onClick={cargarMasCanjes}
                  disabled={cargandoMasCanjes}
                  className="w-full py-3 text-sm text-blue-600 font-semibold hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {cargandoMasCanjes ? 'Cargando...' : 'Cargar más canjes'}
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
            <div className="flex gap-2 overflow-x-auto tx-carousel pb-1">
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
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-all shrink-0 cursor-pointer ${activa
                        ? 'text-white border-slate-700'
                        : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    style={activa ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                  >
                    {etiqueta}
                    {activa && orden?.direccion === 'desc' && <ChevronDown className="w-4 h-4 text-slate-400" />}
                    {activa && orden?.direccion === 'asc' && <ChevronUp className="w-4 h-4 text-slate-400" />}
                    {!activa && <ArrowUpDown className="w-4 h-4 text-slate-400" />}
                  </button>
                );
              })}
            </div>

            {/* Cards */}
            {transaccionesOrdenadas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Inbox className="w-10 h-10 mb-2" />
                <p className="text-sm font-medium">No se encontraron transacciones</p>
              </div>
            ) : (
              transaccionesOrdenadas.map((tx) => (
                <FilaMovil key={tx.id} transaccion={tx} onVerDetalle={handleVerDetalle} />
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
        {/* LISTA MOBILE CANJES (<lg)                                         */}
        {/* ================================================================= */}

        {isMobile && tabActivo === 'canjes' && (
          <div className="space-y-2">
            {/* Chips de orden (móvil canjes) */}
            <div className="flex gap-2 overflow-x-auto tx-carousel pb-1">
              {([
                { col: 'puntos' as ColumnaOrden, etiqueta: 'Puntos' },
                { col: 'fecha' as ColumnaOrden, etiqueta: 'Expira' },
              ]).map(({ col, etiqueta }) => {
                const activa = orden?.columna === col;
                return (
                  <button
                    key={col}
                    onClick={() => alternarOrden(col)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-all shrink-0 cursor-pointer ${activa
                        ? 'text-white border-slate-700'
                        : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    style={activa ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
                  >
                    {etiqueta}
                    {activa && orden?.direccion === 'desc' && <ChevronDown className="w-4 h-4 text-slate-400" />}
                    {activa && orden?.direccion === 'asc' && <ChevronUp className="w-4 h-4 text-slate-400" />}
                    {!activa && <ArrowUpDown className="w-4 h-4 text-slate-400" />}
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
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Inbox className="w-10 h-10 mb-2" />
                <p className="text-sm font-medium">No se encontraron canjes</p>
              </div>
            ) : (
              canjesOrdenados.map((canje) => (
                <FilaMovilCanje key={canje.id} canje={canje} onVerDetalle={handleVerDetalleCanje} />
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
    </div>
  );
}