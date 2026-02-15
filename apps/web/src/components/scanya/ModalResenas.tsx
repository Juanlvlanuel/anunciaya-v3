/**
 * ModalResenas.tsx
 * =================
 * Modal para ver y responder reseñas del negocio.
 * Se adapta según el tipo de usuario (dueño, gerente, empleado).
 *
 * Comportamiento por vista:
 * - PC (lg:): Drawer lateral derecho (~450px)
 * - Móvil: ModalBottom (85% altura), slide-up
 *
 * Filtros:
 * - Estado: Todas | Pendientes
 * - Sucursal: Solo visible para dueños
 *
 * Ubicación: apps/web/src/components/scanya/ModalResenas.tsx
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ArrowLeft,
  Star,
  Loader2,
  AlertCircle,
  RefreshCw,
  Send,
  MessageSquare,
  ChevronDown,
  Check,
  Pencil,
} from 'lucide-react';
import { useScanYAStore } from '@/stores/useScanYAStore';
import scanyaService from '@/services/scanyaService';
import type { ResenaNegocio } from '@/types/scanya';
import { notificar } from '@/utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalResenasProps {
  abierto: boolean;
  onClose: () => void;
  onResenaRespondida?: () => void;
}

// =============================================================================
// COMPONENTE: DROPDOWN FILTRO SUCURSAL (reutilizable)
// =============================================================================

interface DropdownOption {
  id: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  disabled?: boolean;
}

function DropdownFiltro({ options, value, onChange, placeholder, disabled }: DropdownProps) {
  const [abierto, setAbierto] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    if (abierto) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [abierto]);

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div ref={dropdownRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => !disabled && setAbierto(!abierto)}
        disabled={disabled}
        className="
          w-full flex items-center justify-between
          py-2 px-3 rounded-lg lg:rounded-md 2xl:rounded-lg
          text-sm lg:text-xs 2xl:text-sm
          cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all
        "
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: abierto ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
          color: value ? '#3B82F6' : '#94A3B8',
        }}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#94A3B8] shrink-0 ml-2 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg lg:rounded-md 2xl:rounded-lg overflow-hidden shadow-xl"
          style={{
            background: 'linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => { onChange(undefined); setAbierto(false); }}
            className="w-full flex items-center justify-between px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm text-left cursor-pointer transition-colors"
            style={{
              background: !value ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              color: !value ? '#3B82F6' : '#94A3B8',
            }}
          >
            <span>{placeholder}</span>
            {!value && <Check className="w-4 h-4 text-[#3B82F6]" />}
          </button>
          <div className="h-px bg-white/10" />
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => { onChange(option.id); setAbierto(false); }}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm lg:text-xs 2xl:text-sm text-left cursor-pointer transition-colors"
              style={{
                background: value === option.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: value === option.id ? '#3B82F6' : '#94A3B8',
              }}
              onMouseEnter={(e) => { if (value !== option.id) { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.color = '#FFFFFF'; } }}
              onMouseLeave={(e) => { if (value !== option.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8'; } }}
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
// COMPONENTE: TARJETA DE RESEÑA
// =============================================================================

interface TarjetaResenaProps {
  resena: ResenaNegocio;
  onResponder: (resenaId: string, texto: string) => Promise<boolean>;
}

function TarjetaResena({ resena, onResponder }: TarjetaResenaProps) {
  const [textoRespuesta, setTextoRespuesta] = useState('');
  const [mostrarCampo, setMostrarCampo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const handleEnviar = async () => {
    if (!textoRespuesta.trim() || enviando) return;
    setEnviando(true);
    const exito = await onResponder(resena.id, textoRespuesta.trim());
    if (exito) {
      setTextoRespuesta('');
      setMostrarCampo(false);
    }
    setEnviando(false);
  };

  // Formatear fecha relativa
  const formatearFecha = (fecha: string | null): string => {
    if (!fecha) return '';
    const ahora = new Date();
    const fechaResena = new Date(fecha);
    const diffMs = ahora.getTime() - fechaResena.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `hace ${diffMin}m`;
    if (diffHoras < 24) return `hace ${diffHoras}h`;
    if (diffDias < 7) return `hace ${diffDias}d`;
    return fechaResena.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-4 lg:p-3 2xl:p-4"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Header: Avatar + Nombre + Estrellas + Fecha */}
      <div className="flex items-start gap-3 lg:gap-2 2xl:gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 rounded-full shrink-0 flex items-center justify-center text-white font-semibold text-sm lg:text-xs 2xl:text-sm"
          style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' }}
        >
          {resena.autor.avatarUrl ? (
            <img src={resena.autor.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            resena.autor.nombre.charAt(0).toUpperCase()
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-white font-medium text-sm lg:text-xs 2xl:text-sm truncate">
              {resena.autor.nombre}
            </span>
            <span className="text-[#64748B] text-xs lg:text-[10px] 2xl:text-xs shrink-0">
              {formatearFecha(resena.createdAt)}
            </span>
          </div>

          {/* Estrellas */}
          {resena.rating && (
            <div className="flex items-center gap-0.5 mt-0.5">
              {[1, 2, 3, 4, 5].map((estrella) => (
                <Star
                  key={estrella}
                  className={`w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 ${
                    estrella <= resena.rating! ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-[#374151]'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Nombre de sucursal (solo si dueño tiene múltiples) */}
          {resena.sucursalNombre && (
            <span className="text-[#64748B] text-xs lg:text-[10px] 2xl:text-xs">
              {resena.sucursalNombre}
            </span>
          )}
        </div>
      </div>

      {/* Texto de la reseña */}
      {resena.texto && (
        <p className="text-[#CBD5E1] text-sm lg:text-xs 2xl:text-sm mt-2 lg:mt-1.5 2xl:mt-2 leading-relaxed">
          {resena.texto}
        </p>
      )}

      {/* Respuesta del negocio (si existe y NO estamos editando) */}
      {resena.respuesta && !mostrarCampo && (
        <div
          className="mt-3 lg:mt-2 2xl:mt-3 p-3 lg:p-2 2xl:p-3 rounded-lg lg:rounded-md 2xl:rounded-lg"
          style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.15)',
          }}
        >
          {/* Header: Editar Respuesta + fecha */}
          <div className="flex items-center gap-1.5 mb-1">
            <button
              onClick={() => {
                setTextoRespuesta(resena.respuesta!.texto || '');
                setMostrarCampo(true);
              }}
              className="flex items-center gap-1 text-[#3B82F6] text-xs font-medium cursor-pointer hover:text-[#60A5FA] transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Editar Respuesta
            </button>
            <span className="text-[#64748B] text-xs lg:text-[10px] 2xl:text-xs ml-auto">
              {formatearFecha(resena.respuesta.createdAt)}
            </span>
          </div>
          <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm leading-relaxed">
            {resena.respuesta.texto}
          </p>
        </div>
      )}

      {/* Botón para responder (si no hay respuesta y no estamos editando) */}
      {!resena.respuesta && !mostrarCampo && (
        <button
          onClick={() => setMostrarCampo(true)}
          className="
            mt-3 lg:mt-2 2xl:mt-3
            flex items-center gap-1.5
            text-[#3B82F6] text-sm lg:text-xs 2xl:text-sm
            cursor-pointer hover:text-[#60A5FA] transition-colors
          "
        >
          <MessageSquare className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
          Responder Mensaje
        </button>
      )}

      {/* Campo de respuesta/edición inline */}
      {mostrarCampo && (
        <div className="mt-3 lg:mt-2 2xl:mt-3">
          <div
            className="flex items-end gap-2 rounded-lg lg:rounded-md 2xl:rounded-lg p-2"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
          >
            <textarea
              value={textoRespuesta}
              onChange={(e) => setTextoRespuesta(e.target.value.slice(0, 500))}
              placeholder="Escribe tu respuesta..."
              rows={2}
              className="
                flex-1 bg-transparent text-white text-sm lg:text-xs 2xl:text-sm
                placeholder-[#64748B] resize-none outline-none
              "
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEnviar();
                }
              }}
            />
            <div className="flex flex-col items-center gap-1">
              <button
                onClick={handleEnviar}
                disabled={!textoRespuesta.trim() || enviando}
                className="
                  p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg
                  cursor-pointer disabled:cursor-not-allowed disabled:opacity-40
                  transition-all
                "
                style={{
                  background: textoRespuesta.trim() ? 'rgba(59, 130, 246, 0.3)' : 'transparent',
                }}
              >
                {enviando ? (
                  <Loader2 className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6] animate-spin" />
                ) : (
                  <Send className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-[#3B82F6]" />
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <button
              onClick={() => { setMostrarCampo(false); setTextoRespuesta(''); }}
              className="text-[#64748B] text-xs cursor-pointer hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <span className="text-[#64748B] text-xs">
              {textoRespuesta.length}/500
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function ModalResenas({ abierto, onClose, onResenaRespondida }: ModalResenasProps) {
  // ---------------------------------------------------------------------------
  // Store
  // ---------------------------------------------------------------------------
  const { usuario } = useScanYAStore();
  const tipoUsuario = usuario?.tipo || 'empleado';

  // ---------------------------------------------------------------------------
  // Estado - Filtros
  // ---------------------------------------------------------------------------
  const [filtro, setFiltro] = useState<'todas' | 'pendientes'>('todas');
  const [filtroSucursalId, setFiltroSucursalId] = useState<string | undefined>(undefined);

  // ---------------------------------------------------------------------------
  // Estado - Listas para dropdown
  // ---------------------------------------------------------------------------
  const [sucursales, setSucursales] = useState<Array<{ id: string; nombre: string }>>([]);
  const [cargandoListas, setCargandoListas] = useState(false);

  // ---------------------------------------------------------------------------
  // Estado - Reseñas
  // ---------------------------------------------------------------------------
  const [resenas, setResenas] = useState<ResenaNegocio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yaCargo, setYaCargo] = useState(false);
  const [contadores, setContadores] = useState({ total: 0, pendientes: 0 });
  const prevFiltro = useRef(filtro);
  const prevSucursal = useRef(filtroSucursalId);

  // ---------------------------------------------------------------------------
  // Permisos
  // ---------------------------------------------------------------------------
  const puedeVerFiltroSucursal = tipoUsuario === 'dueno';

  // ---------------------------------------------------------------------------
  // Cargar listas (sucursales)
  // ---------------------------------------------------------------------------
  const cargarListas = useCallback(async () => {
    if (tipoUsuario !== 'dueno') return;
    setCargandoListas(true);
    try {
      const res = await scanyaService.obtenerSucursalesLista();
      if (res.success && res.data) setSucursales(res.data);
    } catch (err) {
      console.error('Error cargando sucursales:', err);
    } finally {
      setCargandoListas(false);
    }
  }, [tipoUsuario]);

  // ---------------------------------------------------------------------------
  // Cargar reseñas
  // ---------------------------------------------------------------------------
  const cargarResenas = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      // Siempre cargar TODAS para tener contadores reales
      const respTodas = await scanyaService.obtenerResenasNegocio(filtroSucursalId, false);

      if (respTodas.success && respTodas.data) {
        const todas = respTodas.data;
        const pendientesCount = todas.filter(r => !r.respuesta).length;
        setContadores({ total: todas.length, pendientes: pendientesCount });

        // Mostrar según filtro activo
        if (filtro === 'pendientes') {
          setResenas(todas.filter(r => !r.respuesta));
        } else {
          setResenas(todas);
        }
      } else {
        setError(respTodas.message || 'Error al cargar reseñas');
      }
    } catch (err) {
      console.error('Error cargando reseñas:', err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [filtro, filtroSucursalId]);

  // ---------------------------------------------------------------------------
  // Efectos
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (abierto && !yaCargo) {
      cargarListas();
      cargarResenas();
      setYaCargo(true);
    }
  }, [abierto, yaCargo]);

  // Recargar cuando cambian filtros
  useEffect(() => {
    if (abierto && yaCargo) {
      if (filtro !== prevFiltro.current || filtroSucursalId !== prevSucursal.current) {
        cargarResenas();
      }
    }
    prevFiltro.current = filtro;
    prevSucursal.current = filtroSucursalId;
  }, [filtro, filtroSucursalId, abierto, yaCargo]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleRefresh = () => {
    setYaCargo(false);
    cargarResenas();
  };

  const handleResponder = async (resenaId: string, texto: string): Promise<boolean> => {
    try {
      const resp = await scanyaService.responderResena(resenaId, texto);
      if (resp.success) {
        notificar.exito('Respuesta publicada');
        // Actualización optimista: agregar respuesta localmente
        setResenas(prev => prev.map(r =>
          r.id === resenaId
            ? { ...r, respuesta: { id: resp.data?.id || '', texto, createdAt: new Date().toISOString() } }
            : r
        ));
        // Actualizar contadores
        setContadores(prev => ({ ...prev, pendientes: Math.max(0, prev.pendientes - 1) }));
        onResenaRespondida?.();
        return true;
      } else {
        notificar.error(resp.message || 'Error al responder');
        return false;
      }
    } catch {
      notificar.error('Error de conexión');
      return false;
    }
  };

  // Contadores (del estado, no del array filtrado)
  const totalResenas = contadores.total;
  const pendientes = contadores.pendientes;

  // ---------------------------------------------------------------------------
  // Si no está abierto, no renderizar
  // ---------------------------------------------------------------------------
  if (!abierto) return null;

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <>
      {/* ================================================================== */}
      {/* OVERLAY - Solo móvil */}
      {/* ================================================================== */}
      <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" />

      {/* ================================================================== */}
      {/* CONTENEDOR PRINCIPAL */}
      {/* - Móvil: ModalBottom 85% altura */}
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
            <h1 className="text-white font-semibold">Reseñas</h1>
            <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">
              {pendientes > 0 ? `${pendientes} pendiente${pendientes !== 1 ? 's' : ''} de respuesta` : 'Todas respondidas'}
            </p>
          </div>

          {/* Botón Refresh */}
          <button
            onClick={handleRefresh}
            disabled={cargando}
            className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-[#3B82F6] ${cargando ? 'animate-spin' : ''}`} />
          </button>

          <button onClick={onClose} className="p-2 lg:p-1.5 2xl:p-2 rounded-lg lg:rounded-md 2xl:rounded-lg hover:bg-white/10 -mr-2 cursor-pointer">
            <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </button>
        </header>

        {/* ============================================================== */}
        {/* FILTROS: Todas | Pendientes */}
        {/* ============================================================== */}
        <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 border-b border-white/10">
          <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
            {(['todas', 'pendientes'] as const).map((opcion) => (
              <button
                key={opcion}
                onClick={() => setFiltro(opcion)}
                className="flex-1 py-2 px-3 rounded-lg lg:rounded-md 2xl:rounded-lg text-sm lg:text-xs 2xl:text-sm font-medium transition-colors cursor-pointer"
                style={{
                  background: filtro === opcion ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                  color: filtro === opcion ? '#3B82F6' : '#94A3B8',
                  border: filtro === opcion ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                {opcion === 'todas' ? `Todas (${totalResenas})` : `Pendientes (${pendientes})`}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* FILTRO SUCURSAL (solo dueño) */}
        {/* ============================================================== */}
        {puedeVerFiltroSucursal && sucursales.length > 1 && (
          <div className="px-4 lg:px-3 2xl:px-4 py-3 lg:py-2 2xl:py-3 border-b border-white/10">
            <DropdownFiltro
              options={sucursales.map(s => ({ id: s.id, label: s.nombre }))}
              value={filtroSucursalId}
              onChange={setFiltroSucursalId}
              placeholder="Todas las sucursales"
              disabled={cargandoListas}
            />
          </div>
        )}

        {/* ============================================================== */}
        {/* CONTENIDO CON SCROLL */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-y-auto">
          {/* Estado: Cargando */}
          {cargando && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 lg:gap-2 2xl:gap-3">
              <Loader2 className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-[#F59E0B] animate-spin" />
              <p className="text-[#94A3B8]">Cargando reseñas...</p>
            </div>
          )}

          {/* Estado: Error */}
          {!cargando && error && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 lg:gap-3 2xl:gap-4 px-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                <AlertCircle className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-[#EF4444]" />
              </div>
              <p className="text-[#94A3B8] text-center">{error}</p>
              <button
                onClick={() => cargarResenas()}
                className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 px-4 py-2 rounded-lg lg:rounded-md 2xl:rounded-lg cursor-pointer"
                style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6' }}
              >
                <RefreshCw className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
                Reintentar
              </button>
            </div>
          )}

          {/* Estado: Sin reseñas */}
          {!cargando && !error && resenas.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 lg:gap-3 2xl:gap-4 px-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.2)' }}>
                <Star className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 text-[#F59E0B]" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium mb-1">
                  {filtro === 'pendientes' ? 'Sin reseñas pendientes' : 'Sin reseñas'}
                </p>
                <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">
                  {filtro === 'pendientes'
                    ? '¡Todas las reseñas han sido respondidas!'
                    : 'Aún no hay reseñas de clientes'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Lista de reseñas */}
          {!cargando && !error && resenas.length > 0 && (
            <div className="px-4 lg:px-3 2xl:px-4 py-4 lg:py-3 2xl:py-4 space-y-3 lg:space-y-2 2xl:space-y-3">
              <p className="text-[#94A3B8] text-sm lg:text-xs 2xl:text-sm">
                {totalResenas} reseña{totalResenas !== 1 ? 's' : ''}
              </p>

              {resenas.map((resena) => (
                <TarjetaResena
                  key={resena.id}
                  resena={resena}
                  onResponder={handleResponder}
                />
              ))}

              {/* Espacio inferior */}
              <div className="h-8" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ModalResenas;