/**
 * ModalHistorial.tsx
 * ===================
 * Modal para ver el historial de transacciones.
 * Se adapta según el tipo de usuario (dueño, gerente, empleado).
 *
 * Comportamiento por vista:
 * - PC (lg:): Drawer lateral derecho (~450px)
 * - Móvil: ModalBottom (85% altura), slide-up
 *
 * Filtros:
 * - Periodo: Hoy, Semana, Mes, 3M, Año
 * - Sucursal: Solo visible para dueños
 * - Empleado: Visible para dueños y gerentes (si hay empleados)
 *
 * Ubicación: apps/web/src/components/scanya/ModalHistorial.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ArrowLeft,
  History,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Check,
  User,
  Phone,
  Coins,
  Banknote,
  CreditCard,
  Smartphone,
  Clock,
  Ticket,
  Camera,
  MapPin,
  Shield,
  ShieldCheck,
  Users,
  Award,
  MessageCircle,
} from 'lucide-react';
import { useScanYAStore } from '@/stores/useScanYAStore';
import scanyaService, { type PeriodoHistorial } from '@/services/scanyaService';
import type { TransaccionScanYA } from '@/types/scanya';
import { TarjetaTransaccion } from './TarjetaTransaccion';
import { useChatYAStore } from '@/stores/useChatYAStore';
import { useUiStore } from '@/stores/useUiStore';
import { ModalImagenes } from '@/components/ui/ModalImagenes';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalHistorialProps {
  abierto: boolean;
  onClose: () => void;
  cambiosHistorial?: number;
}

interface SucursalLista {
  id: string;
  nombre: string;
}

interface OperadorLista {
  id: string;
  nombre: string;
  tipo: 'empleado' | 'gerente' | 'dueno';
  sucursalId: string | null;
  sucursalNombre: string | null;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const FILTROS_PERIODO: { id: PeriodoHistorial; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: '3meses', label: '3M' },
  { id: 'ano', label: 'Año' },
];

const LIMITE_POR_PAGINA = 10;

// =============================================================================
// COMPONENTE: DROPDOWN PERSONALIZADO
// =============================================================================

interface DropdownOption {
  id: string;
  label: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  disabled?: boolean;
}

function CustomDropdown({ options, value, onChange, placeholder, disabled }: CustomDropdownProps) {
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };

    if (abierto) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [abierto]);

  const selectedOption = options.find(opt => opt.id === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <div ref={dropdownRef} className="relative flex-1">
      {/* Botón del dropdown */}
      <button
        type="button"
        onClick={() => !disabled && setAbierto(!abierto)}
        disabled={disabled}
        className="
          w-full flex items-center justify-between
          py-2 px-3
          rounded-lg lg:rounded-md 2xl:rounded-lg
          text-sm lg:text-xs 2xl:text-sm
          cursor-pointer disabled:cursor-not-allowed disabled:opacity-50
          transition-all
        "
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: abierto
            ? '1px solid rgba(59, 130, 246, 0.5)'
            : '1px solid rgba(255, 255, 255, 0.1)',
          color: value ? '#3B82F6' : '#94A3B8',
        }}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          className={`w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#94A3B8] shrink-0 ml-2 transition-transform ${abierto ? 'rotate-180' : ''
            }`}
        />
      </button>

      {/* Lista de opciones */}
      {abierto && (
        <div
          className="
            absolute z-50 w-full mt-1
            rounded-lg lg:rounded-md 2xl:rounded-lg
            overflow-hidden
            shadow-xl
          "
          style={{
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {/* Opción "Todos" */}
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setAbierto(false);
            }}
            className="
              w-full flex items-center justify-between
              px-3 py-2.5
              text-sm lg:text-xs 2xl:text-sm text-left
              cursor-pointer
              transition-colors
            "
            style={{
              background: !value ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: !value ? '#3B82F6' : '#94A3B8',
            }}
            onMouseEnter={(e) => {
              if (value) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.color = '#FFFFFF';
              }
            }}
            onMouseLeave={(e) => {
              if (value) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#94A3B8';
              }
            }}
          >
            <span>{placeholder}</span>
            {!value && <Check className="w-4 h-4 text-[#3B82F6]" />}
          </button>

          {/* Separador */}
          <div className="h-px bg-white/10" />

          {/* Opciones */}
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id);
                setAbierto(false);
              }}
              className="
                w-full flex items-center justify-between
                px-3 py-2.5
                text-sm lg:text-xs 2xl:text-sm text-left
                cursor-pointer
                transition-colors
              "
              style={{
                background: value === option.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: value === option.id ? '#3B82F6' : '#94A3B8',
              }}
              onMouseEnter={(e) => {
                if (value !== option.id) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                if (value !== option.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#94A3B8';
                }
              }}
            >
              <span className="truncate">{option.label}</span>
              {value === option.id && <Check className="w-4 h-4 text-[#3B82F6] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalHistorial({ abierto, onClose, cambiosHistorial }: ModalHistorialProps) {
  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------
  const { usuario } = useScanYAStore();
  const tipoUsuario = usuario?.tipo || 'empleado';

  // ---------------------------------------------------------------------------
  // Estado - Filtros
  // ---------------------------------------------------------------------------
  const [periodo, setPeriodo] = useState<PeriodoHistorial>('mes');
  const [filtroSucursalId, setFiltroSucursalId] = useState<string | undefined>(undefined);
  const [filtroEmpleadoId, setFiltroEmpleadoId] = useState<string | undefined>(undefined);

  // ---------------------------------------------------------------------------
  // Estado - Listas para dropdowns
  // ---------------------------------------------------------------------------
  const [sucursales, setSucursales] = useState<SucursalLista[]>([]);
  const [operadores, setOperadores] = useState<OperadorLista[]>([]);
  const [cargandoListas, setCargandoListas] = useState(false);

  // ---------------------------------------------------------------------------
  // Estado - Transacciones
  // ---------------------------------------------------------------------------
  const [transacciones, setTransacciones] = useState<TransaccionScanYA[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yaCargo, setYaCargo] = useState(false);
  const prevPeriodo = useRef(periodo);
  const prevFiltroSucursal = useRef(filtroSucursalId);
  const prevFiltroEmpleado = useRef(filtroEmpleadoId);

  // ---------------------------------------------------------------------------
  // Estado para ver foto y detalle de transacción
  // ---------------------------------------------------------------------------
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [transaccionDetalle, setTransaccionDetalle] = useState<TransaccionScanYA | null>(null);

  // ---------------------------------------------------------------------------
  // Permisos de filtros según rol
  // ---------------------------------------------------------------------------
  const puedeVerFiltroSucursal = tipoUsuario === 'dueno';
  const puedeVerFiltroOperador = (tipoUsuario === 'dueno' || tipoUsuario === 'gerente') && operadores.length > 0;

  // ---------------------------------------------------------------------------
  // Títulos según rol
  // ---------------------------------------------------------------------------
  const getTitulo = (): string => {
    switch (tipoUsuario) {
      case 'dueno':
        return 'Historial de Transacciones';
      case 'gerente':
        return 'Historial de Transacciones';
      case 'empleado':
        return 'Mi Historial';
      default:
        return 'Historial';
    }
  };

  const getSubtitulo = (): string => {
    // Si hay filtro de sucursal, mostrar el nombre
    if (filtroSucursalId) {
      const sucursal = sucursales.find(s => s.id === filtroSucursalId);
      return sucursal?.nombre || 'Sucursal seleccionada';
    }

    switch (tipoUsuario) {
      case 'dueno':
        return 'Todas las sucursales';
      case 'gerente':
        return usuario?.nombreSucursal || 'Tu sucursal';
      case 'empleado':
        return 'Mis ventas registradas';
      default:
        return '';
    }
  };

  // ---------------------------------------------------------------------------
  // Cargar listas para dropdowns
  // ---------------------------------------------------------------------------
  const cargarListas = useCallback(async () => {
    if (tipoUsuario === 'empleado') return;

    setCargandoListas(true);
    try {
      // Cargar sucursales (solo si es dueño)
      if (tipoUsuario === 'dueno') {
        const resSucursales = await scanyaService.obtenerSucursalesLista();
        if (resSucursales.success && resSucursales.data) {
          setSucursales(resSucursales.data);
        }
      }

      // Cargar empleados (dueño y gerente)
      const resOperadores = await scanyaService.obtenerOperadoresLista(filtroSucursalId);
      if (resOperadores.success && resOperadores.data) {
        setOperadores(resOperadores.data);
      }
    } catch (err) {
      console.error('Error cargando listas:', err);
    } finally {
      setCargandoListas(false);
    }
  }, [tipoUsuario, filtroSucursalId]);

  // ---------------------------------------------------------------------------
  // Cargar historial
  // ---------------------------------------------------------------------------
  const cargarHistorial = useCallback(async (nuevaPagina: number = 1, append: boolean = false) => {
    if (nuevaPagina === 1) {
      setCargando(true);
    } else {
      setCargandoMas(true);
    }
    setError(null);

    try {
      const respuesta = await scanyaService.obtenerHistorial(
        periodo,
        nuevaPagina,
        LIMITE_POR_PAGINA,
        filtroSucursalId,
        filtroEmpleadoId
      );

      if (respuesta.success && respuesta.data) {
        if (append) {
          setTransacciones(prev => [...prev, ...respuesta.data!.transacciones]);
        } else {
          setTransacciones(respuesta.data.transacciones);
        }
        setTotal(respuesta.data.total);
        setPagina(respuesta.data.pagina);
        setTotalPaginas(respuesta.data.totalPaginas);
      } else {
        setError(respuesta.message || 'Error al cargar historial');
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
      setCargandoMas(false);
    }
  }, [periodo, filtroSucursalId, filtroEmpleadoId]);

  // ---------------------------------------------------------------------------
  // Efectos
  // ---------------------------------------------------------------------------
  // Cargar listas y datos la primera vez que se abre
  useEffect(() => {
    if (abierto && !yaCargo) {
      cargarListas();
      setPagina(1);
      cargarHistorial(1, false);
      setYaCargo(true);
    }
  }, [abierto, yaCargo]);

  // Recargar empleados cuando cambia la sucursal (solo para dueño)
  useEffect(() => {
    if (abierto && tipoUsuario === 'dueno' && filtroSucursalId !== prevFiltroSucursal.current) {
      // Limpiar filtro de empleado al cambiar sucursal
      setFiltroEmpleadoId(undefined);
      // Recargar lista de empleados de esa sucursal
      scanyaService.obtenerOperadoresLista(filtroSucursalId).then(res => {
        if (res.success && res.data) {
          setOperadores(res.data);
        }
      });
    }
  }, [filtroSucursalId, abierto, tipoUsuario]);

  // Recargar cuando cambia el periodo
  useEffect(() => {
    if (abierto && periodo !== prevPeriodo.current) {
      setPagina(1);
      cargarHistorial(1, false);
    }
    prevPeriodo.current = periodo;
  }, [periodo, abierto]);

  // Recargar cuando cambian los filtros de sucursal o empleado
  useEffect(() => {
    if (abierto && yaCargo) {
      const cambioSucursal = filtroSucursalId !== prevFiltroSucursal.current;
      const cambioEmpleado = filtroEmpleadoId !== prevFiltroEmpleado.current;

      if (cambioSucursal || cambioEmpleado) {
        prevFiltroSucursal.current = filtroSucursalId;
        prevFiltroEmpleado.current = filtroEmpleadoId;
        setPagina(1);
        setTransacciones([]);
        cargarHistorial(1, false);
      }
    }
  }, [filtroSucursalId, filtroEmpleadoId, abierto, yaCargo, cargarHistorial]);

  // Recargar cuando hay nuevas ventas registradas
  useEffect(() => {
    if (cambiosHistorial && cambiosHistorial > 0 && yaCargo) {
      setPagina(1);
      cargarHistorial(1, false);
    }
  }, [cambiosHistorial]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleCambiarPeriodo = (nuevoPeriodo: PeriodoHistorial) => {
    if (nuevoPeriodo !== periodo) {
      setPeriodo(nuevoPeriodo);
      setPagina(1);
      setTransacciones([]);
    }
  };

  const handleCargarMas = () => {
    if (pagina < totalPaginas && !cargandoMas) {
      cargarHistorial(pagina + 1, true);
    }
  };

  const handleVerFoto = (url: string) => {
    setFotoUrl(url);
  };

  const handleCerrarFoto = () => {
    setFotoUrl(null);
  };

  const handleRefresh = () => {
    setYaCargo(false); // Permitir recarga manual
    setPagina(1);
    cargarHistorial(1, false);
  };

  // ---------------------------------------------------------------------------
  // Si no está abierto, no renderizar
  // ---------------------------------------------------------------------------
  if (!abierto) return null;

  // ---------------------------------------------------------------------------
  // RENDER: Detalle de transacción
  // ---------------------------------------------------------------------------
  if (transaccionDetalle) {
    const t = transaccionDetalle;
    const esCuponGratis = t.montoTotal === 0 && !!t.cuponCodigo;
    const tieneCupon = !!t.cuponCodigo;
    const esRevocada = t.estado === 'cancelado';

    const formatMonto = (v: number) => v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
    const formatTel = (tel: string) => {
      const l = tel.replace(/\D/g, '');
      if (l.length === 10) return `+52 ${l.slice(0, 3)} ${l.slice(3, 6)} ${l.slice(6)}`;
      return tel;
    };
    const formatFechaLarga = (f: string) => {
      const d = new Date(f);
      return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
        ', ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const nivelConfig = (() => {
      switch (t.clienteNivel.toLowerCase()) {
        case 'oro': return { bg: 'rgba(245,158,11,0.2)', text: '#F59E0B', emoji: '🥇' };
        case 'plata': return { bg: 'rgba(148,163,184,0.2)', text: '#94A3B8', emoji: '🥈' };
        default: return { bg: 'rgba(205,127,50,0.2)', text: '#CD7F32', emoji: '🥉' };
      }
    })();

    const iniciales = (() => {
      const p = t.clienteNombre.trim().split(/\s+/);
      return p.length >= 2 ? `${p[0][0]}${p[p.length - 1][0]}`.toUpperCase() : t.clienteNombre.slice(0, 2).toUpperCase();
    })();

    const registradorConfig = {
      empleado: { icono: Users, label: 'Empleado' },
      gerente: { icono: ShieldCheck, label: 'Gerente' },
      dueno: { icono: Shield, label: 'Dueño' },
    }[t.registradoPorTipo] || { icono: Users, label: '' };
    const RegistradorIcono = registradorConfig.icono;

    const abrirChatTemporal = useChatYAStore.getState().abrirChatTemporal;
    const abrirChatYA = useUiStore.getState().abrirChatYA;

    const handleContactar = () => {
      if (!t.clienteId) return;
      abrirChatTemporal({
        id: `temp_${Date.now()}`,
        otroParticipante: { id: t.clienteId, nombre: t.clienteNombre, apellidos: '', avatarUrl: t.clienteAvatarUrl ?? null },
        datosCreacion: { participante2Id: t.clienteId, participante2Modo: 'personal', contextoTipo: 'directo' },
      });
      abrirChatYA();
      setTransaccionDetalle(null);
      onClose();
    };

    // Estilos reutilizables
    const ROW = 'flex items-center justify-between py-2.5 lg:py-2 2xl:py-2.5';
    const LABEL = 'text-sm lg:text-[11px] 2xl:text-sm font-medium';
    const VALUE = 'text-sm lg:text-[11px] 2xl:text-sm font-bold';

    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setTransaccionDetalle(null)} />
        <div
          className="fixed z-50 inset-x-0 bottom-0 h-[85vh] lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:w-[350px] 2xl:w-[450px] flex flex-col rounded-t-3xl lg:rounded-none overflow-hidden"
          style={{ background: 'linear-gradient(180deg, #0A0A0A 0%, #001020 100%)', boxShadow: '-4px 0 30px rgba(0,0,0,0.5)' }}
        >
          {/* Header */}
          <header className="flex items-center gap-3 lg:gap-2 2xl:gap-3 px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 border-b border-white/10 shrink-0">
            <button
              onClick={() => setTransaccionDetalle(null)}
              className="p-1.5 lg:p-1 2xl:p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
            </button>
            <h2 className="text-base lg:text-sm 2xl:text-base font-bold text-white flex-1">
              {esCuponGratis ? 'Detalle de cupón' : 'Detalle de venta'}
            </h2>
            <button
              onClick={() => setTransaccionDetalle(null)}
              className="p-1.5 lg:p-1 2xl:p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
            </button>
          </header>

          {/* Contenido scrollable */}
          <div className="flex-1 overflow-y-auto px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4">

            {/* ── CLIENTE ── */}
            <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
              {t.clienteAvatarUrl ? (
                <img src={t.clienteAvatarUrl} alt="" className="w-14 h-14 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(96,165,250,0.2)' }}>
                  <span className="text-xl lg:text-base 2xl:text-xl font-bold" style={{ color: '#60A5FA' }}>{iniciales}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-lg lg:text-base 2xl:text-lg font-bold truncate ${esRevocada ? 'line-through' : ''}`} style={{ color: esRevocada ? '#64748B' : '#F1F5F9' }}>
                  {t.clienteNombre}
                </p>
                {t.clienteTelefono && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" style={{ color: '#64748B' }} />
                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#94A3B8' }}>{formatTel(t.clienteTelefono)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ background: nivelConfig.bg }}>
                    <span className="text-sm lg:text-[11px] 2xl:text-sm">{nivelConfig.emoji}</span>
                    <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold capitalize" style={{ color: nivelConfig.text }}>{t.clienteNivel}</span>
                  </div>
                  {esRevocada && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.2)' }}>
                      <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-red-400">Revocada</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Logo ChatYA */}
              {!esRevocada && t.clienteId && (
                <button onClick={handleContactar} className="shrink-0 cursor-pointer hover:opacity-80">
                  <img src="/logo-ChatYA-blanco.webp" alt="ChatYA" className="w-auto h-14 lg:h-11 2xl:h-14" />
                </button>
              )}
            </div>

            {/* ── MONTO / CUPÓN ── */}
            <div className="mt-4 lg:mt-3 2xl:mt-4 rounded-xl lg:rounded-lg 2xl:rounded-xl p-3 lg:p-2.5 2xl:p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {esCuponGratis ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Ticket className="w-5 h-5" style={{ color: '#60A5FA' }} />
                    <span className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: '#60A5FA' }}>Cupón canjeado — Gratis</span>
                  </div>
                  {/* Imagen + Nombre del cupón */}
                  <div className="flex items-center gap-3 lg:gap-2 2xl:gap-3">
                    {t.cuponImagen && (
                      <img
                        src={t.cuponImagen}
                        alt=""
                        className="w-16 h-16 lg:w-12 lg:h-12 2xl:w-16 2xl:h-16 rounded-lg object-cover shrink-0"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      {t.cuponCodigo && (
                        <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#94A3B8' }}>{t.cuponCodigo}</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Cupón info (si aplica) */}
                  {tieneCupon && (
                    <>
                      <div className="rounded-lg overflow-hidden mb-3" style={{ border: '1px solid rgba(96,165,250,0.25)' }}>
                        {/* Header con fondo */}
                        <div className="flex items-center gap-2.5 lg:gap-2 2xl:gap-2.5 px-3 py-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2.5" style={{ background: 'rgba(59,130,246,0.12)' }}>
                          <div className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(96,165,250,0.2)' }}>
                            <Ticket className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" style={{ color: '#60A5FA' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base lg:text-sm 2xl:text-base font-bold" style={{ color: '#60A5FA' }}>
                              {t.cuponTipo === 'porcentaje' ? `${t.cuponValor}% de descuento`
                                : t.cuponTipo === 'monto_fijo' ? `$${t.cuponValor} de descuento`
                                : t.cuponTipo === '2x1' ? '2×1'
                                : t.cuponTipo === '3x2' ? '3×2'
                                : t.cuponTipo === 'envio_gratis' ? 'Envío gratis'
                                : t.cuponTipo === 'otro' ? (t.cuponValor || 'Otro')
                                : 'Cupón'}
                            </p>
                            <p className="text-sm lg:text-xs 2xl:text-sm font-medium truncate" style={{ color: '#94A3B8' }}>{t.cuponCodigo || 'Cupón'}</p>
                          </div>
                          {t.cuponImagen && (
                            <img
                              src={t.cuponImagen}
                              alt=""
                              className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-lg object-cover shrink-0"
                              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                            />
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Subtotal (solo si hay cupón) */}
                  {tieneCupon && t.cuponDescuento && (
                    <div className={ROW}>
                      <span className={LABEL} style={{ color: '#94A3B8' }}>Subtotal</span>
                      <span className={VALUE} style={{ color: '#94A3B8' }}>{formatMonto(t.montoTotal + (t.cuponDescuento || 0))}</span>
                    </div>
                  )}
                  {tieneCupon && t.cuponDescuento && (
                    <div className={ROW} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-1.5">
                        <Ticket className="w-4 h-4" style={{ color: '#60A5FA' }} />
                        <span className={LABEL} style={{ color: '#60A5FA' }}>Descuento cupón</span>
                      </div>
                      <span className={VALUE} style={{ color: '#60A5FA' }}>-{formatMonto(t.cuponDescuento)}</span>
                    </div>
                  )}

                  {/* Total cobrado */}
                  <div className={ROW} style={tieneCupon && t.cuponDescuento && t.cuponDescuento > 0 ? { borderTop: '1px solid rgba(255,255,255,0.06)' } : undefined}>
                    <span className={LABEL} style={{ color: '#94A3B8' }}>{tieneCupon && t.cuponDescuento && t.cuponDescuento > 0 ? 'Total cobrado' : 'Monto total'}</span>
                    <span className={`text-xl lg:text-lg 2xl:text-xl font-bold ${esRevocada ? 'line-through' : ''}`} style={{ color: esRevocada ? '#64748B' : '#F1F5F9' }}>
                      {formatMonto(t.montoTotal)}
                    </span>
                  </div>

                  {/* Método de pago */}
                  {t.montoEfectivo > 0 && (
                    <div className={ROW} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-1.5">
                        <Banknote className="w-4 h-4" style={{ color: '#64748B' }} />
                        <span className={LABEL} style={{ color: '#94A3B8' }}>Efectivo</span>
                      </div>
                      <span className={VALUE} style={{ color: '#F1F5F9' }}>{formatMonto(t.montoEfectivo)}</span>
                    </div>
                  )}
                  {t.montoTarjeta > 0 && (
                    <div className={ROW} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4" style={{ color: '#64748B' }} />
                        <span className={LABEL} style={{ color: '#94A3B8' }}>Tarjeta</span>
                      </div>
                      <span className={VALUE} style={{ color: '#F1F5F9' }}>{formatMonto(t.montoTarjeta)}</span>
                    </div>
                  )}
                  {t.montoTransferencia > 0 && (
                    <div className={ROW} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4" style={{ color: '#64748B' }} />
                        <span className={LABEL} style={{ color: '#94A3B8' }}>Transferencia</span>
                      </div>
                      <span className={VALUE} style={{ color: '#F1F5F9' }}>{formatMonto(t.montoTransferencia)}</span>
                    </div>
                  )}

                  {/* Puntos */}
                  <div className={ROW} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-4 h-4" style={{ color: '#60A5FA' }} />
                      <span className={LABEL} style={{ color: '#94A3B8' }}>Puntos otorgados</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`${VALUE} ${esRevocada ? 'line-through' : ''}`} style={{ color: esRevocada ? '#64748B' : '#34D399' }}>
                        +{t.puntosOtorgados.toLocaleString()}
                      </span>
                      {!esRevocada && t.multiplicadorAplicado > 1 && (
                        <span className="text-sm lg:text-[11px] 2xl:text-sm px-1 rounded font-bold" style={{ background: 'rgba(96,165,250,0.15)', color: '#60A5FA' }}>
                          x{t.multiplicadorAplicado}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── EXTRAS ── */}
            <div className="mt-3 lg:mt-2 2xl:mt-3 space-y-2 lg:space-y-1.5 2xl:space-y-2">

              {/* Concepto (solo ventas) */}
              {!esCuponGratis && t.concepto && (
                <div className={ROW}>
                  <span className={LABEL} style={{ color: '#94A3B8' }}>Concepto</span>
                  <span className={VALUE} style={{ color: '#F1F5F9' }}>{t.concepto}</span>
                </div>
              )}

              {/* Número de orden */}
              {t.numeroOrden && (
                <div className={ROW}>
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4" style={{ color: '#64748B' }} />
                    <span className={LABEL} style={{ color: '#94A3B8' }}>Nº orden</span>
                  </div>
                  <span className={VALUE} style={{ color: '#F1F5F9' }}>#{t.numeroOrden}</span>
                </div>
              )}

              {/* Foto ticket */}
              {t.fotoTicketUrl && (
                <button
                  onClick={() => { setFotoUrl(t.fotoTicketUrl!); setTransaccionDetalle(null); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-semibold text-sm lg:text-[11px] 2xl:text-sm cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#60A5FA', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <Camera className="w-4 h-4" />
                  Ver foto del ticket
                </button>
              )}
            </div>

            {/* ── METADATA ── */}
            <div className="mt-4 lg:mt-3 2xl:mt-4 pt-3 lg:pt-2 2xl:pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Atendido por */}
              <div className="mb-2 lg:mb-1.5 2xl:mb-2">
                <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#64748B' }}>Atendido por:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <RegistradorIcono className="w-4 h-4" style={{ color: '#94A3B8' }} />
                  <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold" style={{ color: '#F1F5F9' }}>
                    {t.registradoPor}
                  </span>
                  <span className="text-sm lg:text-[11px] 2xl:text-sm px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: '#94A3B8' }}>
                    {registradorConfig.label}
                  </span>
                </div>
              </div>

              {/* Sucursal */}
              <div className="flex items-center gap-2 mb-2 lg:mb-1.5 2xl:mb-2">
                <MapPin className="w-4 h-4" style={{ color: '#64748B' }} />
                <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium" style={{ color: '#94A3B8' }}>
                  {t.registradoPorTipo === 'dueno' ? t.negocioNombre : t.sucursalNombre}
                </span>
              </div>

              {/* Fecha completa */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: '#64748B' }} />
                <span className="text-sm lg:text-[11px] 2xl:text-sm font-medium capitalize" style={{ color: '#94A3B8' }}>
                  {formatFechaLarga(t.createdAt)}
                </span>
              </div>
            </div>

          </div>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Modal de foto
  // ---------------------------------------------------------------------------
  if (fotoUrl) {
    return (
      <>
        {/* Overlay */}
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 lg:p-3 2xl:p-4 cursor-pointer"
          onClick={handleCerrarFoto}
        >
          {/* Botón cerrar */}
          <button
            onClick={handleCerrarFoto}
            className="absolute top-4 right-4 p-2 lg:p-1.5 2xl:p-2 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
          >
            <X className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-white" />
          </button>

          {/* Imagen */}
          <img
            src={fotoUrl}
            alt="Foto del ticket"
            className="max-w-full max-h-full object-contain rounded-lg lg:rounded-md 2xl:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER PRINCIPAL
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* ================================================================== */}
      {/* OVERLAY - Solo móvil (oscurece el fondo) */}
      {/* ================================================================== */}
      <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" />

      {/* ================================================================== */}
      {/* CONTENEDOR PRINCIPAL */}
      {/* - Móvil: ModalBottom 85% altura, desde abajo */}
      {/* - PC: Drawer lateral derecho 450px */}
      {/* ================================================================== */}
      <div
        className="
          fixed z-50
          inset-x-0 bottom-0 h-[85vh]
          lg:inset-y-0 lg:right-0 lg:left-auto lg:h-full lg:w-[350px] 2xl:w-[450px]
          flex flex-col
          rounded-t-3xl lg:rounded-none
          overflow-hidden
        "
        style={{
          background: 'linear-gradient(180deg, #0A0A0A 0%, #001020 100%)',
          boxShadow: '-4px 0 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* ============================================================== */}
        {/* HEADER */}
        {/* ============================================================== */}
        <header
          className="
            relative
            flex items-center gap-3 lg:gap-2 2xl:gap-3
            px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3
            border-b border-white/10
          "
          style={{ background: 'rgba(0, 0, 0, 0.3)' }}
        >
          {/* Handle visual solo móvil */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full lg:hidden" />

          <button onClick={onClose} className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/10 -ml-2 cursor-pointer">
            <ArrowLeft className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </button>

          <div className="flex-1">
            <h1 className="text-white font-semibold">{getTitulo()}</h1>
            <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">{getSubtitulo()}</p>
          </div>

          {/* Botón Refresh */}
          <button
            onClick={handleRefresh}
            disabled={cargando}
            className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#3B82F6] ${cargando ? 'animate-spin' : ''}`}
            />
          </button>

          <button onClick={onClose} className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/10 -mr-2 cursor-pointer">
            <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </button>
        </header>

        {/* ============================================================== */}
        {/* FILTROS DE PERIODO */}
        {/* ============================================================== */}
        <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 border-b border-white/10">
          <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
            {FILTROS_PERIODO.map((filtro) => (
              <button
                key={filtro.id}
                onClick={() => handleCambiarPeriodo(filtro.id)}
                className={`
                  flex-1 py-2 px-3 rounded-lg lg:rounded-md 2xl:rounded-lg text-sm lg:text-xs 2xl:text-sm font-medium
                  transition-colors cursor-pointer
                `}
                style={{
                  background: periodo === filtro.id
                    ? 'rgba(37, 99, 235, 0.3)'
                    : 'rgba(255, 255, 255, 0.05)',
                  color: periodo === filtro.id ? '#3B82F6' : '#94A3B8',
                  border: periodo === filtro.id
                    ? '1px solid rgba(59, 130, 246, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {filtro.label}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* FILTROS ADICIONALES (Sucursal / Empleado) */}
        {/* ============================================================== */}
        {(puedeVerFiltroSucursal || puedeVerFiltroOperador) && (
          <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 border-b border-white/10">
            <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
              {/* Dropdown Sucursal - Solo dueño */}
              {puedeVerFiltroSucursal && (
                <CustomDropdown
                  options={sucursales.map(s => ({ id: s.id, label: s.nombre }))}
                  value={filtroSucursalId}
                  onChange={setFiltroSucursalId}
                  placeholder="Todas las sucursales"
                  disabled={cargandoListas}
                />
              )}

              {/* Dropdown Operador - Dueño y gerente (si hay operadores) */}
              {puedeVerFiltroOperador && (
                <CustomDropdown
                  options={operadores.map(op => ({ id: op.id, label: op.nombre }))}
                  value={filtroEmpleadoId}
                  onChange={setFiltroEmpleadoId}
                  placeholder="Todos"
                  disabled={cargandoListas}
                />
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CONTENIDO CON SCROLL */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto">
          {/* ------------------------------------------------------------ */}
          {/* Estado: Cargando */}
          {/* ------------------------------------------------------------ */}
          {cargando && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 lg:gap-2 2xl:gap-3">
              <Loader2 className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-[#3B82F6] animate-spin" />
              <p className="text-[#94A3B8]">Cargando historial...</p>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* Estado: Error */}
          {/* ------------------------------------------------------------ */}
          {!cargando && error && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 lg:gap-3 2xl:gap-4 px-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239, 68, 68, 0.2)' }}
              >
                <AlertCircle className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-[#EF4444]" />
              </div>
              <p className="text-[#94A3B8] text-center">{error}</p>
              <button
                onClick={() => cargarHistorial(1, false)}
                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 px-4 py-2 rounded-lg lg:rounded-md 2xl:rounded-lg cursor-pointer"
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#3B82F6',
                }}
              >
                <RefreshCw className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                Reintentar
              </button>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* Estado: Sin transacciones */}
          {/* ------------------------------------------------------------ */}
          {!cargando && !error && transacciones.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 lg:gap-3 2xl:gap-4 px-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(148, 163, 184, 0.2)' }}
              >
                <History className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-[#94A3B8]" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium mb-1">Sin transacciones</p>
                <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">
                  No hay ventas registradas en este periodo
                </p>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------ */}
          {/* Lista de transacciones */}
          {/* ------------------------------------------------------------ */}
          {!cargando && !error && transacciones.length > 0 && (
            <div className="px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4 space-y-3 lg:space-y-2 2xl:space-y-3">
              {/* Contador */}
              <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">
                {total} {total === 1 ? 'transacción' : 'transacciones'}
              </p>

              {/* Tarjetas */}
              {transacciones.map((transaccion) => (
                <TarjetaTransaccion
                  key={transaccion.id}
                  transaccion={transaccion}
                  onClick={() => setTransaccionDetalle(transaccion)}
                />
              ))}

              {/* Botón cargar más */}
              {pagina < totalPaginas && (
                <button
                  onClick={handleCargarMas}
                  disabled={cargandoMas}
                  className="w-full py-3 rounded-xl lg:rounded-md 2xl:rounded-xl font-medium flex items-center justify-center gap-2 lg:gap-1.5 2xl:gap-2 cursor-pointer disabled:cursor-not-allowed"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94A3B8',
                  }}
                >
                  {cargandoMas ? (
                    <>
                      <Loader2 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      Cargar más ({total - transacciones.length} restantes)
                    </>
                  )}
                </button>
              )}

              {/* Espacio inferior para scroll */}
              <div className="h-8" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ModalHistorial;