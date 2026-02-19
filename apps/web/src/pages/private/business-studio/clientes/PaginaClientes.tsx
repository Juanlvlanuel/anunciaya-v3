/**
 * PaginaClientes.tsx
 * ====================
 * Página del módulo Clientes en Business Studio.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/clientes/PaginaClientes.tsx
 *
 * LAYOUT:
 *   Header + KPIs (patrón Ofertas/Catálogo/Puntos/Transacciones)
 *   Filtro nivel (chips) + Búsqueda
 *   Mobile (<lg): Lista tipo cards, infinite scroll
 *   Desktop (≥lg): Tabla con header dark, scroll interno, columnas ordenables
 *
 * COLUMNAS DESKTOP: CLIENTE | NIVEL | PUNTOS ↕ | VISITAS ↕ | ÚLT. ACTIVIDAD ↕
 *
 * ORDENAMIENTO:
 *   Click en header → desc → asc → null (default: puntos desc)
 *   Estilo CardYA (flechas amber en header dark)
 *
 * PERMISOS:
 *   Dueños  → todos los clientes (o filtrado por sucursal seleccionada)
 *   Gerentes → solo clientes de su sucursal
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  UserPlus,
  UserMinus,
  Crown,
  Medal,
  Award,
  Shield,
  Inbox,
  Clock,
  Phone,
  Eye,
} from 'lucide-react';
import { useClientesStore } from '../../../../stores/useClientesStore';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { Input } from '../../../../components/ui/Input';
import { Spinner } from '../../../../components/ui/Spinner';
import type { ClienteCompleto } from '../../../../types/clientes';
import type { NivelCardYA } from '../../../../types/clientes';
import ModalDetalleCliente from './ModalDetalleCliente';

// =============================================================================
// CSS — Animación del icono del header
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes clientes-icon-bounce {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    40%      { transform: translateY(-4px) rotate(-3deg); }
    60%      { transform: translateY(-2px) rotate(2deg); }
  }
  .clientes-icon-bounce {
    animation: clientes-icon-bounce 2s ease-in-out infinite;
  }
`;

const ESTILO_SCROLL_OCULTO = `
  .cl-carousel::-webkit-scrollbar { display: none; }
  .cl-carousel { -ms-overflow-style: none; scrollbar-width: none; }
`;

// =============================================================================
// TIPOS LOCALES
// =============================================================================

type ColumnaOrden = 'puntos' | 'visitas' | 'actividad';
type DireccionOrden = 'asc' | 'desc';

interface EstadoOrden {
  columna: ColumnaOrden;
  direccion: DireccionOrden;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const NIVELES: { valor: NivelCardYA; etiqueta: string; icono: React.ReactNode; color: string; bg: string }[] = [
  { valor: 'bronce', etiqueta: 'Bronce', icono: <Shield className="w-3.5 h-3.5" />, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  { valor: 'plata', etiqueta: 'Plata', icono: <Medal className="w-3.5 h-3.5" />, color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200' },
  { valor: 'oro', etiqueta: 'Oro', icono: <Crown className="w-3.5 h-3.5" />, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
];

// =============================================================================
// HELPERS
// =============================================================================

const formatearFechaCorta = (fechaISO: string | null) => {
  if (!fechaISO) return '—';
  const fecha = new Date(fechaISO);
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Ayer';
  if (diffDias < 7) return `Hace ${diffDias}d`;
  if (diffDias < 30) return `Hace ${Math.floor(diffDias / 7)}sem`;
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

const obtenerColorNivel = (nivel: string) => {
  switch (nivel?.toLowerCase()) {
    case 'oro': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'plata': return 'text-slate-600 bg-slate-100 border-slate-300';
    case 'bronce': return 'text-amber-700 bg-amber-50 border-amber-200';
    default: return 'text-slate-500 bg-slate-50 border-slate-200';
  }
};

const obtenerIconoNivel = (nivel: string) => {
  switch (nivel?.toLowerCase()) {
    case 'oro': return <Crown className="w-3 h-3" />;
    case 'plata': return <Medal className="w-3 h-3" />;
    case 'bronce': return <Shield className="w-3 h-3" />;
    default: return <Award className="w-3 h-3" />;
  }
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
// COMPONENTE: Card de cliente (móvil)
// =============================================================================

function FilaMovil({
  cliente,
  onVerDetalle,
}: {
  cliente: ClienteCompleto;
  onVerDetalle: (id: string) => void;
}) {
  const colorNivel = obtenerColorNivel(cliente.nivelActual);
  const iconoNivel = obtenerIconoNivel(cliente.nivelActual);

  return (
    <button
      onClick={() => onVerDetalle(cliente.id)}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all cursor-pointer text-left"
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
        {cliente.avatarUrl ? (
          <img src={cliente.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <Users className="w-5 h-5 text-slate-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 truncate">{cliente.nombre}</p>
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${colorNivel}`}>
            {iconoNivel}
            {cliente.nivelActual}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
          <span className="font-medium text-amber-600">{cliente.puntosDisponibles.toLocaleString()} pts</span>
          <span>{cliente.totalVisitas} visitas</span>
          <span>{formatearFechaCorta(cliente.ultimaActividad)}</span>
        </div>
      </div>

      <Eye className="w-4 h-4 text-slate-300 shrink-0" />
    </button>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PaginaClientes() {
  // Store
  const {
    kpis,
    clientes,
    cargandoClientes,
    cargandoMas,
    hayMas,
    busqueda,
    nivelFiltro,
    cargaInicialCompleta,
    cargarKPIs,
    cargarClientes,
    cargarMas,
    setBusqueda,
    setNivelFiltro,
  } = useClientesStore();

  // Sucursal activa (para recargar al cambiar)
  const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);

  // Estado local
  const [orden, setOrden] = useState<EstadoOrden | null>(null);
  const [textoBusqueda, setTextoBusqueda] = useState(busqueda);
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();
  const sentinelaRef = useRef<HTMLDivElement | null>(null);

  // ─── Carga inicial + recarga al cambiar sucursal ───
  useEffect(() => {
    cargarKPIs();
    cargarClientes();
  }, [sucursalActiva]);

  // ─── Debounce búsqueda (300ms) ───
  const handleBusquedaChange = useCallback((valor: string) => {
    setTextoBusqueda(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setBusqueda(valor);
    }, 300);
  }, [setBusqueda]);

  // ─── Infinite scroll mobile ───
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

  // ─── Alternar orden ───
  const alternarOrden = useCallback((columna: ColumnaOrden) => {
    setOrden((prev) => {
      if (!prev || prev.columna !== columna) return { columna, direccion: 'desc' };
      if (prev.direccion === 'desc') return { columna, direccion: 'asc' };
      return null; // 3er click → quitar orden
    });
  }, []);

  // ─── Ordenar datos localmente ───
  const clientesOrdenados = useMemo(() => {
    if (!orden) return clientes;

    const copia = [...clientes];
    const mult = orden.direccion === 'asc' ? 1 : -1;

    copia.sort((a, b) => {
      switch (orden.columna) {
        case 'puntos':
          return (a.puntosDisponibles - b.puntosDisponibles) * mult;
        case 'visitas':
          return (a.totalVisitas - b.totalVisitas) * mult;
        case 'actividad': {
          const fa = a.ultimaActividad ? new Date(a.ultimaActividad).getTime() : 0;
          const fb = b.ultimaActividad ? new Date(b.ultimaActividad).getTime() : 0;
          return (fa - fb) * mult;
        }
        default:
          return 0;
      }
    });

    return copia;
  }, [clientes, orden]);

  // ─── Handler abrir detalle ───
  const handleVerDetalle = useCallback((id: string) => {
    setClienteSeleccionadoId(id);
  }, []);

  // ─── Handler cerrar modal ───
  const handleCerrarModal = useCallback(() => {
    setClienteSeleccionadoId(null);
  }, []);

  // ─── Loading inicial (solo la primera vez que se abre la página) ───
  if (!cargaInicialCompleta && cargandoClientes) {
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
                background: 'linear-gradient(135deg, #3b82f6, #60a5fa, #93c5fd)',
                boxShadow: '0 6px 20px rgba(59,130,246,0.4)',
              }}
            >
              <div className="clientes-icon-bounce">
                <Users className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                Clientes
              </h1>
              <p className="text-sm lg:text-sm 2xl:text-base text-slate-500 mt-0.5 font-medium">
                Registro de clientes 
              </p>
            </div>
          </div>

          {/* KPIs COMPACTOS - Carousel en móvil, fila en desktop */}
          <div className="overflow-x-auto lg:overflow-visible lg:flex-1 cl-carousel">
            <div className="flex lg:justify-end gap-2 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0">
              {/* Total Clientes */}
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
                  <Users className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-blue-700" />
                </div>
                <div className="text-left">
                  <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-blue-700">
                    {kpis?.totalClientes ?? '—'}
                  </div>
                  <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Total</div>
                </div>
              </div>

              {/* Nuevos este mes */}
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
                  <UserPlus className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-green-700" />
                </div>
                <div className="text-left">
                  <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-green-700">
                    {kpis?.nuevosEsteMes ?? '—'}
                  </div>
                  <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Nuevos</div>
                </div>
              </div>

              {/* Inactivos 30d */}
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
                  <UserMinus className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-red-700" />
                </div>
                <div className="text-left">
                  <div className="text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight text-red-700">
                    {kpis?.inactivos30Dias ?? '—'}
                  </div>
                  <div className="text-[12px] lg:text-[10px] 2xl:text-[14px] text-slate-500 font-semibold mt-0.5">Inactivos</div>
                </div>
              </div>

              {/* Distribución nivel - solo desktop */}
              {kpis?.distribucionNivel && !isMobile && (
                <div
                  className="hidden lg:flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-lg lg:rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[110px] 2xl:min-w-[180px]"
                  style={{
                    background: 'linear-gradient(135deg, #fefce8, #fff)',
                    border: '2px solid #fde047',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    className="w-6 lg:w-6 2xl:w-7 h-6 lg:h-6 2xl:h-7 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, #fef08a, #fde047)', boxShadow: '0 3px 8px rgba(202,138,4,0.25)' }}
                  >
                    <Crown className="w-3 lg:w-3 2xl:w-3.5 h-3 lg:h-3 2xl:h-3.5 text-yellow-700" />
                  </div>
                  <div className="text-left flex items-center gap-2 2xl:gap-3">
                    <div>
                      <div className="text-sm 2xl:text-base font-extrabold leading-tight text-amber-700">{kpis.distribucionNivel.bronce}</div>
                      <div className="text-[10px] 2xl:text-[12px] text-slate-500 font-semibold">Bron</div>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div>
                      <div className="text-sm 2xl:text-base font-extrabold leading-tight text-slate-600">{kpis.distribucionNivel.plata}</div>
                      <div className="text-[10px] 2xl:text-[12px] text-slate-500 font-semibold">Plata</div>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div>
                      <div className="text-sm 2xl:text-base font-extrabold leading-tight text-yellow-600">{kpis.distribucionNivel.oro}</div>
                      <div className="text-[10px] 2xl:text-[12px] text-slate-500 font-semibold">Oro</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* FILTROS: Nivel (chips) + Búsqueda                                 */}
        {/* ================================================================= */}

        <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-md border border-slate-200 p-4 lg:p-3 2xl:p-4 mt-2 lg:mt-7 2xl:mt-14">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-3 2xl:gap-4">
            {/* Chips de nivel */}
            <div className="flex gap-1.5 overflow-x-auto cl-carousel shrink-0 py-1 pr-1">
              <button
                onClick={() => setNivelFiltro(null)}
                className={`px-4 lg:px-3 2xl:px-4 py-2 lg:py-1.5 2xl:py-2 rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold border transition-all shrink-0 cursor-pointer ${!nivelFiltro
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
              >
                Todos
              </button>
              {NIVELES.map((n) => (
                <button
                  key={n.valor}
                  onClick={() => setNivelFiltro(nivelFiltro === n.valor ? null : n.valor)}
                  className={`flex items-center gap-1 px-4 lg:px-3 2xl:px-4 py-2 lg:py-1.5 2xl:py-2 rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold border transition-all shrink-0 cursor-pointer ${nivelFiltro === n.valor
                    ? `${n.bg} ${n.color} ring-2 ring-offset-1 ring-current`
                    : `bg-white text-slate-600 border-slate-200 hover:border-slate-300`
                    }`}
                >
                  {n.icono}
                  {n.etiqueta}
                </button>
              ))}
            </div>

            {/* Búsqueda */}
            <div className="flex-1 lg:max-w-sm 2xl:max-w-md">
              <Input
                placeholder="Busca por Nombre o Celular del cliente..."
                value={textoBusqueda}
                onChange={(e) => handleBusquedaChange(e.target.value)}
                className="h-10 lg:h-9 2xl:h-10 text-sm lg:text-xs 2xl:text-sm"
                icono={<Search className="w-4 h-4 text-slate-400" />}
              />
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TABLA DESKTOP (≥lg)                                               */}
        {/* ================================================================= */}

        {!isMobile && (
          <div
            className="rounded-xl overflow-hidden border border-slate-200"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {/* Header dark */}
            <div
              className="grid grid-cols-[1fr_100px_100px_100px_120px] 2xl:grid-cols-[1fr_120px_120px_140px_200px] gap-0 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-3 text-[11px] lg:text-[11px] 2xl:text-[13px] font-semibold text-white/80 uppercase tracking-wider"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
            >
              <span>Cliente</span>
              <span className="flex justify-center">Nivel</span>
              <span className="flex justify-end">
                <HeaderOrdenable etiqueta="PUNTOS" columna="puntos" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
              <span className="flex justify-end">
                <HeaderOrdenable etiqueta="VISITAS" columna="visitas" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
              <span className="flex justify-end">
                <HeaderOrdenable etiqueta="ULT. ACTIVIDAD" columna="actividad" ordenActual={orden} onOrdenar={alternarOrden} />
              </span>
            </div>

            {/* Body scrolleable */}
            <div className="max-h-[calc(100vh-390px)] lg:max-h-[calc(100vh-330px)] 2xl:max-h-[calc(100vh-390px)] overflow-y-auto bg-white">
              {clientesOrdenados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Inbox className="w-10 h-10 mb-2" />
                  <p className="text-sm font-medium">No se encontraron clientes</p>
                </div>
              ) : (
                clientesOrdenados.map((c, i) => {
                  const colorNivel = obtenerColorNivel(c.nivelActual);
                  const iconoNivel = obtenerIconoNivel(c.nivelActual);
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleVerDetalle(c.id)}
                      className={`grid grid-cols-[1fr_100px_100px_100px_120px] 2xl:grid-cols-[1fr_120px_106px_125px_230px] gap-0 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-3 text-sm lg:text-xs 2xl:text-sm border-b border-slate-50 hover:bg-slate-50/80 transition-colors cursor-pointer w-full text-left ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                        }`}
                    >
                      {/* Cliente */}
                      <div className="flex items-center gap-2.5 2xl:gap-3 min-w-0">
                        <div className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                          {c.avatarUrl ? (
                            <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4.5 2xl:h-4.5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate 2xl:text-[15px]">{c.nombre}</p>
                          {c.telefono && (
                            <p className="text-[11px] lg:text-[10px] 2xl:text-xs text-slate-400 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5 2xl:w-3 2xl:h-3" />
                              {c.telefono}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Nivel */}
                      <div className="flex items-center justify-center">
                        <span className={`inline-flex items-center gap-1 px-2 2xl:px-2.5 py-0.5 2xl:py-1 rounded-full text-[10px] lg:text-[9px] 2xl:text-[13px] font-bold border ${colorNivel}`}>
                          {iconoNivel}
                          {c.nivelActual}
                        </span>
                      </div>

                      {/* Puntos */}
                      <div className="flex items-center justify-end">
                        <span className="font-bold text-amber-600 2xl:text-[15px]">
                          {c.puntosDisponibles.toLocaleString()}
                        </span>
                      </div>

                      {/* Visitas */}
                      <div className="flex items-center justify-end text-slate-600 font-bold 2xl:text-[15px]">
                        {c.totalVisitas}
                      </div>

                      {/* Última actividad */}
                      <div className="flex items-center justify-end text-slate-600 font-bold 2xl:text-[15px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3.5 2xl:h-3.5" />
                          {formatearFechaCorta(c.ultimaActividad)}
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
                  {cargandoMas ? 'Cargando...' : 'Cargar más clientes'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* LISTA MOBILE (<lg)                                                */}
        {/* ================================================================= */}

        {isMobile && (
          <div className="space-y-2">
            {/* Chips de orden (móvil) */}
            <div className="flex gap-1.5 overflow-x-auto cl-carousel pb-1">
              {([
                { col: 'puntos' as ColumnaOrden, etiqueta: 'Puntos' },
                { col: 'visitas' as ColumnaOrden, etiqueta: 'Visitas' },
                { col: 'actividad' as ColumnaOrden, etiqueta: 'Actividad' },
              ]).map(({ col, etiqueta }) => {
                const activa = orden?.columna === col;
                return (
                  <button
                    key={col}
                    onClick={() => alternarOrden(col)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all shrink-0 cursor-pointer ${activa
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-200'
                      }`}
                  >
                    {etiqueta}
                    {activa && orden?.direccion === 'desc' && <ChevronDown className="w-3 h-3 text-amber-400" />}
                    {activa && orden?.direccion === 'asc' && <ChevronUp className="w-3 h-3 text-amber-400" />}
                    {!activa && <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                  </button>
                );
              })}
            </div>

            {/* Cards */}
            {clientesOrdenados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Inbox className="w-10 h-10 mb-2" />
                <p className="text-sm font-medium">No se encontraron clientes</p>
              </div>
            ) : (
              clientesOrdenados.map((c) => (
                <FilaMovil key={c.id} cliente={c} onVerDetalle={handleVerDetalle} />
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

      </div>

      {/* Modal detalle cliente */}
      <ModalDetalleCliente
        abierto={clienteSeleccionadoId !== null}
        onCerrar={handleCerrarModal}
        clienteId={clienteSeleccionadoId}
      />
    </div>
  );
}