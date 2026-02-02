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
} from 'lucide-react';
import { useScanYAStore } from '@/stores/useScanYAStore';
import scanyaService, { type PeriodoHistorial } from '@/services/scanyaService';
import type { TransaccionScanYA } from '@/types/scanya';
import { TarjetaTransaccion } from './TarjetaTransaccion';

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
          className={`w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#94A3B8] shrink-0 ml-2 transition-transform ${
            abierto ? 'rotate-180' : ''
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
  // Estado para ver foto
  // ---------------------------------------------------------------------------
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

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
        return 'Historial de Ventas';
      case 'gerente':
        return 'Historial de Ventas';
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
    prevFiltroSucursal.current = filtroSucursalId;
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
      if (filtroSucursalId !== prevFiltroSucursal.current || filtroEmpleadoId !== prevFiltroEmpleado.current) {
        setPagina(1);
        setTransacciones([]);
        cargarHistorial(1, false);
      }
    }
    prevFiltroSucursal.current = filtroSucursalId;
    prevFiltroEmpleado.current = filtroEmpleadoId;
  }, [filtroSucursalId, filtroEmpleadoId, abierto, yaCargo]);

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
                  onVerFoto={handleVerFoto}
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