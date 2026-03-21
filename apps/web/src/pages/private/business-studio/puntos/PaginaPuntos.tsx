/**
 * PaginaPuntos.tsx
 * =================
 * Página principal del módulo Puntos en Business Studio.
 * Compone Configuración Base, SistemaNiveles y Recompensas.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/puntos/PaginaPuntos.tsx
 *
 * COMPONENTES EXTRAÍDOS:
 *   SistemaNiveles  → card completa del sistema de niveles (cards verticales)
 *   CardRecompensa  → card vertical individual de recompensa
 *   ModalRecompensa → modal crear / editar recompensa con upload Cloudinary
 *
 * LAYOUT:
 *   Mobile (default) → 3 tabs (Configuración | Niveles | Recompensas)
 *   Laptop (lg:)     → Fila superior 2 cols (Config + Niveles) + Recompensas abajo
 *   Desktop (2xl:)   → Igual que laptop pero con más espacio
 *
 * HEADER UNIFICADO:
 *   Icono gradiente con efecto coin-bounce + título + 4 KPIs inline
 *
 * FAB: Guardar configuración (solo dueños)
 *
 * PERMISOS:
 *   Dueños  → todo editable + FAB guardar
 *   Gerentes → solo lectura + banner informativo, sin FAB
 */

import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Star, Ticket, Clock, Users, Settings, Lock, Save,
  Gift, Plus, Award, CircleDollarSign,
} from 'lucide-react';
import { useAuthStore } from '../../../../stores/useAuthStore';
import { useUiStore } from '../../../../stores/useUiStore';
import { usePuntosStore } from '../../../../stores/usePuntosStore';
import { Spinner } from '../../../../components/ui';
import Tooltip from '../../../../components/ui/Tooltip';
import { notificar } from '../../../../utils/notificaciones';
import { CarouselKPI } from '../../../../components/ui/CarouselKPI';
import type { ActualizarConfigPuntosInput, Recompensa } from '../../../../types/puntos';

import SistemaNiveles, { type NivelLocal } from './componentes/SistemaNiveles';
import CardRecompensa from './componentes/CardRecompensa';
import ModalRecompensa, { type DatosModalRecompensa } from './componentes/ModalRecompensa';

// =============================================================================
// HELPERS - Optimizados para performance
// =============================================================================

// Lookup table para ratios comunes (cubre ~95% de casos reales)
const RATIOS_CACHE: Record<number, { pesosPor: number; puntosGanados: number }> = {
  // Ratios >= 1 (1 peso = N puntos)
  1: { pesosPor: 1, puntosGanados: 1 },
  2: { pesosPor: 1, puntosGanados: 2 },
  3: { pesosPor: 1, puntosGanados: 3 },
  5: { pesosPor: 1, puntosGanados: 5 },
  10: { pesosPor: 1, puntosGanados: 10 },
  15: { pesosPor: 1, puntosGanados: 15 },
  20: { pesosPor: 1, puntosGanados: 20 },
  25: { pesosPor: 1, puntosGanados: 25 },
  30: { pesosPor: 1, puntosGanados: 30 },
  35: { pesosPor: 1, puntosGanados: 35 },
  40: { pesosPor: 1, puntosGanados: 40 },
  50: { pesosPor: 1, puntosGanados: 50 },
  100: { pesosPor: 1, puntosGanados: 100 },
  
  // Ratios < 1 (N pesos = 1 punto)
  0.5: { pesosPor: 2, puntosGanados: 1 },
  0.333: { pesosPor: 3, puntosGanados: 1 },
  0.25: { pesosPor: 4, puntosGanados: 1 },
  0.2: { pesosPor: 5, puntosGanados: 1 },
  0.1: { pesosPor: 10, puntosGanados: 1 },
  0.05: { pesosPor: 20, puntosGanados: 1 },
  0.02: { pesosPor: 50, puntosGanados: 1 },
  0.01: { pesosPor: 100, puntosGanados: 1 },
  
  // Ratios decimales comunes >= 1
  1.5: { pesosPor: 2, puntosGanados: 3 },
  2.5: { pesosPor: 2, puntosGanados: 5 },
};

/**
 * Calcula pesosPor y puntosGanados desde un ratio de puntos por peso.
 * Optimizado con lookup table para casos comunes (~95% hit rate).
 * Performance: <1ms para casos comunes, <5ms para casos raros.
 */
function calcularDesdeRatio(ratio: number): { pesosPor: number; puntosGanados: number } {
  // 1. Intentar lookup directo (O(1) - instantáneo)
  const cached = RATIOS_CACHE[ratio];
  if (cached) return cached;
  
  // 2. Intentar lookup con redondeo a 3 decimales (para floats)
  const ratioRedondeado = Math.round(ratio * 1000) / 1000;
  const cachedRedondeado = RATIOS_CACHE[ratioRedondeado];
  if (cachedRedondeado) return cachedRedondeado;
  
  // 3. Fallback: cálculo dinámico (solo para casos raros ~5%)
  if (ratio >= 1) {
    // Caso: 1 peso = N puntos
    if (Number.isInteger(ratio)) {
      return { pesosPor: 1, puntosGanados: ratio };
    } else {
      // Ratio decimal >= 1 (ej: 1.5 → $2 gana 3pts)
      const pesos = 10;
      const puntos = Math.round(ratio * pesos);
      return { pesosPor: pesos, puntosGanados: puntos };
    }
  } else {
    // Caso: N pesos = M puntos (ratio < 1)
    // Buscar la mejor representación que preserve la relación original
    let mejorPesos = Math.round(1 / ratio);
    let mejorPuntos = 1;
    let mejorError = Math.abs(mejorPuntos / mejorPesos - ratio);
    
    // Probar diferentes escalas para encontrar la representación más exacta
    for (const escala of [1, 10, 100, 1000]) {
      const puntos = Math.round(ratio * escala);
      if (puntos > 0) {
        const error = Math.abs(puntos / escala - ratio);
        if (error < mejorError) {
          mejorPesos = escala;
          mejorPuntos = puntos;
          mejorError = error;
          
          // Si encontramos representación casi perfecta, terminar
          if (error < 0.0001) break;
        }
      }
    }
    
    return { pesosPor: mejorPesos, puntosGanados: mejorPuntos };
  }
}


// =============================================================================
// CSS — efecto coin-bounce del header + ocultar scrollbar del carousel
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes pp-coin-bounce {
    0%, 100% { transform: translateY(0); }
    40%      { transform: translateY(-5px); }
    60%      { transform: translateY(-2px); }
  }
  .pp-coin-bounce {
    animation: pp-coin-bounce 2s ease-in-out infinite;
  }
  .pp-carousel::-webkit-scrollbar { display: none; }
  .pp-carousel { -ms-overflow-style: none; scrollbar-width: none; }
  @keyframes guardar-tornado {
    0%   { transform: scale(1) translate(0, 0) rotate(0deg); }
    45%  { transform: scale(1.6) translate(var(--dx), var(--dy)) rotate(180deg); }
    55%  { transform: scale(1.6) translate(var(--dx), var(--dy)) rotate(220deg); }
    100% { transform: scale(1) translate(0, 0) rotate(360deg); }
  }
  .anim-guardar-tornado {
    animation: guardar-tornado 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    z-index: 9999;
  }
`;

// =============================================================================
// TABS — configuración para mobile
// =============================================================================

type TabPuntos = 'configuracion' | 'niveles' | 'recompensas';

const TABS_CONFIG: { id: TabPuntos; label: string; Icono: typeof Settings }[] = [
  { id: 'configuracion', label: 'Config', Icono: Settings },
  { id: 'niveles', label: 'Niveles', Icono: Award },
  { id: 'recompensas', label: 'Recompensas', Icono: Gift },
];

// =============================================================================
// KPI — componente individual de métrica en el header
// =============================================================================

const KPI_CONFIG = {
  otorgados: {
    Icono: Star,
    color: '#4338ca',
    border: '#a5b4fc',
    bg: 'linear-gradient(135deg, #eef2ff, #fff)',
    iconBg: 'linear-gradient(135deg, #c7d2fe, #a5b4fc)',
    iconShadow: '0 3px 8px rgba(79,70,229,0.25)',
    label: 'Otorgados',
  },
  canjeados: {
    Icono: Ticket,
    color: '#be185d',
    border: '#f9a8d4',
    bg: 'linear-gradient(135deg, #fdf2f8, #fff)',
    iconBg: 'linear-gradient(135deg, #fbcfe8, #f9a8d4)',
    iconShadow: '0 3px 8px rgba(219,39,119,0.25)',
    label: 'Canjeados',
  },
  activos: {
    Icono: Clock,
    color: '#15803d',
    border: '#86efac',
    bg: 'linear-gradient(135deg, #f0fdf4, #fff)',
    iconBg: 'linear-gradient(135deg, #bbf7d0, #86efac)',
    iconShadow: '0 3px 8px rgba(22,163,74,0.25)',
    label: 'Disponibles',
  },
  clientes: {
    Icono: Users,
    color: '#1d4ed8',
    border: '#93c5fd',
    bg: 'linear-gradient(135deg, #eff6ff, #fff)',
    iconBg: 'linear-gradient(135deg, #bfdbfe, #93c5fd)',
    iconShadow: '0 3px 8px rgba(37,99,235,0.25)',
    label: 'Clientes',
  },
} as const;

function KPI({ tipo, valor }: { tipo: keyof typeof KPI_CONFIG; valor: string }) {
  const { Icono, color, border, bg, iconBg, iconShadow, label } = KPI_CONFIG[tipo];

  return (
    <div
      className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2.5 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(33.33%-6px)] lg:min-w-[110px] 2xl:min-w-[140px]"
      style={{
        background: bg,
        border: `2px solid ${border}`,
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      }}
    >
      <div
        className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-md lg:rounded-lg flex items-center justify-center shrink-0"
        style={{ background: iconBg, boxShadow: iconShadow }}
      >
        <Icono className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" style={{ color }} />
      </div>
      <div>
        <div className="text-[16px] lg:text-sm 2xl:text-base font-bold leading-tight" style={{ color }}>{valor}</div>
        <div className="text-sm lg:text-sm 2xl:text-sm text-slate-600 font-semibold mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL — PaginaPuntos
// =============================================================================

export default function PaginaPuntos() {
  // ─── Stores ─────────────────────────────────────────────────────────────
  const cargarConfiguracion     = usePuntosStore((s) => s.cargarConfiguracion);
  const cargarRecompensas       = usePuntosStore((s) => s.cargarRecompensas);
  const cargarEstadisticas      = usePuntosStore((s) => s.cargarEstadisticas);
  const configuracion           = usePuntosStore((s) => s.configuracion);
  const estadisticas            = usePuntosStore((s) => s.estadisticas);
  const recompensas             = usePuntosStore((s) => s.recompensas);
  const actualizarConfiguracion = usePuntosStore((s) => s.actualizarConfiguracion);
  const crearRecompensa         = usePuntosStore((s) => s.crearRecompensa);
  const actualizarRecompensa    = usePuntosStore((s) => s.actualizarRecompensa);
  const eliminarRecompensa      = usePuntosStore((s) => s.eliminarRecompensa);

  const usuario        = useAuthStore((s) => s.usuario);
  const sucursalActiva = useAuthStore((s) => s.usuario?.sucursalActiva);
  const esGerente      = !!usuario?.sucursalAsignada; // Gerente tiene sucursalAsignada, dueño tiene null
  const previewNegocioAbierto = useUiStore((s) => s.previewNegocioAbierto);
  const { setGuardarBsFn, setGuardandoBs, setBsPuedeGuardar } = useUiStore();

  // ─── Estado: Tab mobile ────────────────────────────────────────────────
  const [tabActiva, setTabActiva] = useState<TabPuntos>('configuracion');
  const [tabDesktop, setTabDesktop] = useState<'puntos' | 'recompensas'>('puntos');

  // ─── Estado: Configuración ────────────────────────────────────────────
  // Inicializar con valores del store si existen (evita "salto" visual)
  const configInicial = configuracion ?? null;
  
  // PRIORIZAR valores originales si existen, sino calcular desde ratio
  const valoresIniciales = configInicial 
    ? (configInicial.pesosOriginales && configInicial.puntosOriginales
        ? { pesosPor: configInicial.pesosOriginales, puntosGanados: configInicial.puntosOriginales }
        : calcularDesdeRatio(configInicial.puntosPorPeso))
    : { pesosPor: 10, puntosGanados: 1 };
  
  const [pesosPor, setPesosPor]                               = useState<number>(valoresIniciales.pesosPor);
  const [puntosGanados, setPuntosGanados]                     = useState<number>(valoresIniciales.puntosGanados);
  const [textoPesosPor, setTextoPesosPor]                     = useState<string>(String(valoresIniciales.pesosPor));
  const [textoPuntosGanados, setTextoPuntosGanados]           = useState<string>(String(valoresIniciales.puntosGanados));
  const [diasExpiracionPuntos, setDiasExpiracionPuntos]       = useState<number>(() => configInicial?.diasExpiracionPuntos ?? 30);
  const [noExpiran, setNoExpiran]                             = useState(() => configInicial?.diasExpiracionPuntos === null);
  const [diasExpiracionVoucher, setDiasExpiracionVoucher]     = useState<number>(() => configInicial?.diasExpiracionVoucher ?? 7);
  const [nivelesActivos, setNivelesActivos]                   = useState(() => configInicial?.nivelesActivos ?? true);
  const [niveles, setNiveles] = useState<{ bronce: NivelLocal; plata: NivelLocal; oro: NivelLocal }>(() => {
    if (!configInicial) {
      return {
        bronce: { min: 0,    max: 999,  multiplicador: 1.0 },
        plata:  { min: 1000, max: 2999, multiplicador: 1.5 },
        oro:    { min: 3000, max: null,  multiplicador: 2.0 },
      };
    }
    return {
      bronce: { min: configInicial.nivelBronce.min, max: configInicial.nivelBronce.max, multiplicador: configInicial.nivelBronce.multiplicador },
      plata:  { min: configInicial.nivelPlata.min,  max: configInicial.nivelPlata.max,  multiplicador: configInicial.nivelPlata.multiplicador },
      oro:    { min: configInicial.nivelOro.min,    max: null,                          multiplicador: configInicial.nivelOro.multiplicador },
    };
  });
  const [guardando, setGuardando] = useState(false);
  const [animandoGuardarDesktop, setAnimandoGuardarDesktop] = useState(false);
  const btnGuardarDesktopRef = useRef<HTMLButtonElement>(null);

  // ─── URL params ────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const [recompensaIdPendiente, setRecompensaIdPendiente] = useState(() => searchParams.get('recompensaId') || '');

  // Detectar nuevos deep links cuando ya estamos en la página
  useEffect(() => {
    const nuevoId = searchParams.get('recompensaId');
    if (nuevoId) {
      setRecompensaIdPendiente(nuevoId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  // ─── Estado: Modal recompensas ────────────────────────────────────────
  const [modalAbierto, setModalAbierto]             = useState(false);
  const [modalKey, setModalKey]                     = useState(0);
  const [recompensaEditando, setRecompensaEditando] = useState<Recompensa | null>(null);

  // ─── Carga inicial ──────────────────────────────────────────────────────
  useEffect(() => {
    // Solo cargar si no hay datos (carga inteligente)
    if (!configuracion) cargarConfiguracion();
    if (recompensas.length === 0) cargarRecompensas();
    // No limpiar al desmontar - los datos persisten en el store
  }, []);

  // ─── Abrir recompensa desde URL (notificaciones) ─────────────────────
  useEffect(() => {
    if (!recompensaIdPendiente || recompensas.length === 0) return;
    const recompensa = recompensas.find((r) => r.id === recompensaIdPendiente);
    if (recompensa) {
      setTabActiva('recompensas');
      setTabDesktop('recompensas');
      setRecompensaEditando(recompensa);
      setModalKey((k) => k + 1);
      setModalAbierto(true);
    } else {
      setTabActiva('recompensas');
      setTabDesktop('recompensas');
      notificar.info('Esta recompensa ya no está disponible');
    }
    setRecompensaIdPendiente('');
  }, [recompensaIdPendiente, recompensas]);

  // ─── Estadísticas: se recargan cuando cambia sucursal ──────────────────
  const recargarEstadisticas = useCallback(() => {
    if (usuario?.modoActivo === 'comercial' && !sucursalActiva) return;
    cargarEstadisticas();
  }, [sucursalActiva, usuario?.modoActivo, cargarEstadisticas]);

  useEffect(() => {
    recargarEstadisticas();
  }, [recargarEstadisticas]);

  // ─── Tracking de última sincronización (evita loops) ────────────────────
  const ultimaSincronizacion = useRef<{ pesos: number; puntos: number } | null>(null);

  // ─── Sincronizar estado local ← configuración del store ────────────────
  // useLayoutEffect se ejecuta ANTES del paint, evita "salto visual"
  useLayoutEffect(() => {
    if (!configuracion) return;
    
    // PRIORIDAD 1: Usar valores originales si existen (guardados desde backend)
    if (configuracion.pesosOriginales && configuracion.puntosOriginales) {
      // Solo actualizar si los valores del backend cambiaron desde la última sincronización
      const cambioEnBackend = 
        !ultimaSincronizacion.current ||
        ultimaSincronizacion.current.pesos !== configuracion.pesosOriginales ||
        ultimaSincronizacion.current.puntos !== configuracion.puntosOriginales;
      
      if (cambioEnBackend) {
        setPesosPor(configuracion.pesosOriginales);
        setPuntosGanados(configuracion.puntosOriginales);
        setTextoPesosPor(String(configuracion.pesosOriginales));
        setTextoPuntosGanados(String(configuracion.puntosOriginales));
        ultimaSincronizacion.current = {
          pesos: configuracion.pesosOriginales,
          puntos: configuracion.puntosOriginales
        };
      }
    } else {
      // PRIORIDAD 2: Reconstruir desde ratio (backward compatibility con datos legacy)
      const ratio = configuracion.puntosPorPeso;
      
      if (ratio >= 1) {
        // Caso: 1 peso = N puntos (ej: ratio=35 → $1 gana 35pts)
        if (Number.isInteger(ratio)) {
          setPesosPor(1);
          setPuntosGanados(ratio);
          setTextoPesosPor('1');
          setTextoPuntosGanados(String(ratio));
        } else {
          // Ratio decimal >= 1 (ej: 1.5 → $2 gana 3pts)
          const pesos = 10;
          const puntos = Math.round(ratio * pesos);
          setPesosPor(pesos);
          setPuntosGanados(puntos);
          setTextoPesosPor(String(pesos));
          setTextoPuntosGanados(String(puntos));
        }
      } else {
        // Caso: N pesos = 1 punto o N pesos = M puntos
        // Intentar reconstruir con denominadores comunes
        let mejorPesos = Math.round(1 / ratio);
        let mejorPuntos = 1;
        let mejorError = Math.abs(mejorPuntos / mejorPesos - ratio);
        
        // Probar escalas para encontrar la representación más exacta
        for (const escala of [1, 10, 100, 1000]) {
          const puntos = Math.round(ratio * escala);
          if (puntos > 0) {
            const error = Math.abs(puntos / escala - ratio);
            if (error < mejorError) {
              mejorPesos = escala;
              mejorPuntos = puntos;
              mejorError = error;
              
              // Si encontramos representación casi perfecta, terminar
              if (error < 0.0001) break;
            }
          }
        }
        
        setPesosPor(mejorPesos);
        setPuntosGanados(mejorPuntos);
        setTextoPesosPor(String(mejorPesos));
        setTextoPuntosGanados(String(mejorPuntos));
      }
    }
    
    setNoExpiran(configuracion.diasExpiracionPuntos === null);
    setDiasExpiracionPuntos(configuracion.diasExpiracionPuntos ?? 30);
    setDiasExpiracionVoucher(configuracion.diasExpiracionVoucher);
    setNivelesActivos(configuracion.nivelesActivos);
    setNiveles({
      bronce: { min: configuracion.nivelBronce.min, max: configuracion.nivelBronce.max, multiplicador: configuracion.nivelBronce.multiplicador },
      plata:  { min: configuracion.nivelPlata.min,  max: configuracion.nivelPlata.max,  multiplicador: configuracion.nivelPlata.multiplicador },
      oro:    { min: configuracion.nivelOro.min,    max: null,                          multiplicador: configuracion.nivelOro.multiplicador },
    });
  }, [configuracion]); // Solo depende de configuracion, no de estados locales

  // ─── KPIs ─────────────────────────────────────────────────────────────
  const kpis = {
    otorgados: estadisticas?.puntosOtorgados ?? 0,
    canjeados: estadisticas?.puntosCanjeados ?? 0,
    activos:   estadisticas?.puntosActivos  ?? 0,
    clientes:  estadisticas?.clientesConPuntos ?? 0,
  };
  const fmt = (n: number) => n.toLocaleString('es-MX');

  // ─── Guardar configuración ──────────────────────────────────────────────
  const handleGuardarConfig = async () => {
    setGuardando(true);
    const datos: ActualizarConfigPuntosInput = {
      pesosPor,                 // Enviar valor original directamente
      puntosGanados,            // Enviar valor original directamente
      diasExpiracionPuntos: noExpiran ? null : diasExpiracionPuntos,
      diasExpiracionVoucher,
      nivelesActivos,
      nivelBronceMin:            niveles.bronce.min,
      nivelBronceMax:            niveles.bronce.max!,
      nivelBronceMultiplicador:  niveles.bronce.multiplicador,
      nivelPlataMin:             niveles.plata.min,
      nivelPlataMax:             niveles.plata.max!,
      nivelPlataMultiplicador:   niveles.plata.multiplicador,
      nivelOroMin:               niveles.oro.min,
      nivelOroMultiplicador:     niveles.oro.multiplicador,
    };
    try {
      await actualizarConfiguracion(datos);
      notificar.exito('Configuración guardada correctamente');
      // NO necesitamos actualizar estados locales - ya están correctos
    } catch (err: unknown) {
      notificar.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  // ─── Actualizar campo de nivel (callback para SistemaNiveles) ───────────
  // Auto-calcula mínimos: Plata min = Bronce max + 1, Oro min = Plata max + 1
  const actualizarNivel = (
    nivel: 'bronce' | 'plata' | 'oro',
    campo: 'min' | 'max' | 'multiplicador',
    valor: number,
  ) => {
    setNiveles((prev) => {
      const nuevo = { ...prev, [nivel]: { ...prev[nivel], [campo]: valor } };

      // Auto-recalcular mínimos al cambiar máximos
      if (nivel === 'bronce' && campo === 'max') {
        nuevo.plata = { ...nuevo.plata, min: valor + 1 };
      }
      if (nivel === 'plata' && campo === 'max') {
        nuevo.oro = { ...nuevo.oro, min: valor + 1 };
      }

      // Bronce min siempre es 0
      nuevo.bronce = { ...nuevo.bronce, min: 0 };

      return nuevo;
    });
  };

  // ─── Errores de validación de niveles (tiempo real) ─────────────────
  const erroresNiveles = (() => {
    if (!nivelesActivos) return {};
    const e: Record<string, string> = {};
    const { bronce, plata, oro } = niveles;

    // Máximo de Bronce debe ser al menos 1
    if (bronce.max !== null && bronce.max < 1) {
      e.bronceMax = 'Debe ser al menos 1';
    }
    // Máximo de Plata debe ser mayor que su mínimo
    if (plata.max !== null && plata.min >= plata.max) {
      e.plataMax = `Debe ser mayor que ${plata.min}`;
    }
    // Multiplicadores ≥ 1.0
    if (bronce.multiplicador < 1) e.bronceMult = 'Mínimo 1.0';
    if (plata.multiplicador < 1) e.plataMult = 'Mínimo 1.0';
    if (oro.multiplicador < 1) e.oroMult = 'Mínimo 1.0';
    // Multiplicadores ascendentes
    if (plata.multiplicador <= bronce.multiplicador) {
      e.plataMult = `Debe ser mayor que ${bronce.multiplicador} (Bronce)`;
    }
    if (oro.multiplicador <= plata.multiplicador) {
      e.oroMult = `Debe ser mayor que ${plata.multiplicador} (Plata)`;
    }
    return e;
  })();

  const tieneErroresNiveles = Object.keys(erroresNiveles).length > 0;

  // ─── Errores de validación de configuración base (tiempo real) ─────
  const erroresConfigBase = (() => {
    const e: Record<string, string> = {};
    if (pesosPor < 1) e.pesosPor = 'Mínimo $1';
    if (puntosGanados < 1) e.puntosGanados = 'Mínimo 1 punto';
    if (!noExpiran) {
      if (diasExpiracionPuntos < 1) e.diasExpPuntos = 'Mínimo 1 día';
      if (diasExpiracionPuntos > 365) e.diasExpPuntos = 'Máximo 365 días';
    }
    if (diasExpiracionVoucher < 1) e.diasExpVoucher = 'Mínimo 1 día';
    if (diasExpiracionVoucher > 365) e.diasExpVoucher = 'Máximo 365 días';
    return e;
  })();

  const tieneErroresConfig = Object.keys(erroresConfigBase).length > 0;

  // ─── Detectar cambios pendientes ──────────────────────────────────────
  const hayCambiosPuntos = useMemo(() => {
    if (!configInicial) return false;
    const vi = valoresIniciales;
    if (pesosPor !== vi.pesosPor || puntosGanados !== vi.puntosGanados) return true;
    const expOriginal = configInicial.diasExpiracionPuntos;
    if (noExpiran !== (expOriginal === null)) return true;
    if (!noExpiran && diasExpiracionPuntos !== (expOriginal ?? 30)) return true;
    if (diasExpiracionVoucher !== (configInicial.diasExpiracionVoucher ?? 7)) return true;
    if (nivelesActivos !== (configInicial.nivelesActivos ?? true)) return true;
    if (niveles.bronce.max !== configInicial.nivelBronce.max || niveles.bronce.multiplicador !== configInicial.nivelBronce.multiplicador) return true;
    if (niveles.plata.min !== configInicial.nivelPlata.min || niveles.plata.max !== configInicial.nivelPlata.max || niveles.plata.multiplicador !== configInicial.nivelPlata.multiplicador) return true;
    if (niveles.oro.min !== configInicial.nivelOro.min || niveles.oro.multiplicador !== configInicial.nivelOro.multiplicador) return true;
    return false;
  }, [pesosPor, puntosGanados, noExpiran, diasExpiracionPuntos, diasExpiracionVoucher, nivelesActivos, niveles, configInicial]);

  // ─── Registrar guardado en MobileHeader (solo dueños, solo si hay cambios) ───
  const guardarRef = useRef(handleGuardarConfig);
  guardarRef.current = handleGuardarConfig;

  useEffect(() => {
    if (esGerente) return;
    if (hayCambiosPuntos) {
      setGuardarBsFn(() => guardarRef.current());
    } else {
      setGuardarBsFn(null);
    }
    return () => setGuardarBsFn(null);
  }, [hayCambiosPuntos]);

  useEffect(() => {
    if (esGerente) return;
    setGuardandoBs(guardando);
  }, [guardando]);

  useEffect(() => {
    if (esGerente) return;
    setBsPuedeGuardar(!tieneErroresNiveles && !tieneErroresConfig);
  }, [tieneErroresNiveles, tieneErroresConfig]);

  // ─── Handlers: recompensas ──────────────────────────────────────────────
  const handleCrear = useCallback(() => {
    setRecompensaEditando(null);
    setModalKey((k) => k + 1);
    setModalAbierto(true);
  }, []);

  const handleEditar = useCallback((r: Recompensa) => {
    setRecompensaEditando(r);
    setModalKey((k) => k + 1);
    setModalAbierto(true);
  }, []);

  const handleGuardarRecompensa = async (datos: DatosModalRecompensa) => {
    if (recompensaEditando) {
      const exito = await actualizarRecompensa(recompensaEditando.id, datos);
      if (exito) { notificar.exito('Recompensa actualizada'); setModalAbierto(false); }
      else        { notificar.error('No se pudo actualizar la recompensa'); }
    } else {
      const nueva = await crearRecompensa(datos);
      if (nueva) { notificar.exito('Recompensa creada'); setModalAbierto(false); }
      else       { notificar.error('No se pudo crear la recompensa'); }
    }
  };

  const handleEliminar = async (id: string) => {
    const confirmado = await notificar.confirmar('¿Eliminar esta recompensa?', 'Esta acción no se puede deshacer.');
    if (!confirmado) return;
    const exito = await eliminarRecompensa(id);
    if (exito) notificar.exito('Recompensa eliminada');
    else       notificar.error('No se pudo eliminar la recompensa');
  };

  const handleToggleActiva = async (r: Recompensa) => {
    const exito = await actualizarRecompensa(r.id, { activa: !r.activa });
    if (!exito) notificar.error('No se pudo actualizar el estado');
  };

  // =============================================================================
  // SECCIONES REUTILIZABLES (mobile tabs + desktop inline)
  // =============================================================================

  /** Sección Configuración — solo móvil (3 cards) */
  const seccionConfiguracion = (
    <>
      {/* MÓVIL: cards separados por sección */}
      <div className="lg:hidden space-y-3">
        {/* Card: Puntos por Compra */}
        <div className="bg-white rounded-xl border-2 border-slate-300"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="px-3 py-2 flex items-center gap-2 rounded-t-[10px]"
            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
              <Settings className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Puntos por Compra</span>
          </div>
          <div className="p-4">
          {configuracion ? (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-600 shrink-0">Gasta</span>
                  <div className="flex items-center h-11 bg-slate-100 rounded-lg px-2 flex-1 min-w-0 border-2 border-slate-300"
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                    <span className="text-sm font-bold text-slate-600 mr-0.5">$</span>
                    <input id="pp-pesosPor-m" type="number" min={1} value={textoPesosPor}
                      onChange={(e) => { const raw = e.target.value; setTextoPesosPor(raw); const v = Number(raw); if (v > 0) setPesosPor(v); }}
                      onBlur={() => { if (!textoPesosPor || Number(textoPesosPor) <= 0) { setPesosPor(10); setTextoPesosPor('10'); } }}
                      onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                      disabled={esGerente}
                      className="flex-1 bg-transparent outline-none text-[15px] font-medium text-slate-800 w-full disabled:opacity-50 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    />
                    <span className="text-[11px] font-bold text-indigo-700 px-1.5 py-0.5 rounded shrink-0 ml-1"
                      style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', border: '1px solid #c7d2fe' }}>MXN</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-600 shrink-0">Gana</span>
                  <div className="flex items-center h-11 bg-slate-100 rounded-lg px-2 flex-1 min-w-0 border-2 border-slate-300"
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                    <input id="pp-puntosGanados-m" type="number" min={1} value={textoPuntosGanados}
                      onChange={(e) => { const raw = e.target.value; setTextoPuntosGanados(raw); const v = Number(raw); if (v > 0) setPuntosGanados(v); }}
                      onBlur={() => { if (!textoPuntosGanados || Number(textoPuntosGanados) <= 0) { setPuntosGanados(1); setTextoPuntosGanados('1'); } }}
                      onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                      disabled={esGerente}
                      className="flex-1 bg-transparent outline-none text-[15px] font-medium text-slate-800 w-full disabled:opacity-50 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    />
                    <span className="text-[11px] font-bold text-amber-700 px-1.5 py-0.5 rounded shrink-0 ml-1"
                      style={{ background: 'linear-gradient(135deg, #fef9c3, #fde68a)', border: '1px solid #fde68a' }}>PUNTOS</span>
                  </div>
                </div>
              </div>
              {(erroresConfigBase.pesosPor || erroresConfigBase.puntosGanados) && (
                <span className="text-sm font-semibold text-red-600 mt-1 block">{erroresConfigBase.pesosPor || erroresConfigBase.puntosGanados}</span>
              )}
            </>
          ) : <Spinner />}
          </div>
        </div>

        {/* Card: Expiración */}
        <div className="bg-white rounded-xl border-2 border-slate-300"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="px-3 py-2 flex items-center gap-2 rounded-t-[10px]"
            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
              <Clock className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Expiración de Puntos</span>
          </div>
          <div className="p-4">
          {configuracion ? (
            <div>
              <div className="flex items-center h-11 bg-slate-100 rounded-lg px-3 border-2 border-slate-300"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                <input type="number" min={1} max={365} value={noExpiran ? '' : diasExpiracionPuntos}
                  onChange={(e) => setDiasExpiracionPuntos(Number(e.target.value))}
                  onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                  disabled={esGerente || noExpiran} placeholder={noExpiran ? '∞' : undefined}
                  className="flex-1 bg-transparent outline-none text-base font-medium text-slate-800 w-16 placeholder:text-slate-500 disabled:opacity-50 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                />
                <span className="text-[11px] font-bold text-indigo-700 px-2 py-0.5 rounded"
                  style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', border: '1px solid #c7d2fe' }}>DÍAS</span>
              </div>
              <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                <input type="checkbox" checked={noExpiran} onChange={(e) => setNoExpiran(e.target.checked)}
                  disabled={esGerente} className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer disabled:opacity-50" />
                <span className="text-sm text-slate-600 font-semibold">No expiran</span>
              </label>
              {erroresConfigBase.diasExpPuntos && <span className="text-sm font-semibold text-red-600 mt-0.5 block">{erroresConfigBase.diasExpPuntos}</span>}
              <p className="text-sm text-slate-500 mt-1 leading-snug font-semibold">Los puntos expiran si el cliente no realiza compras en este periodo.</p>
            </div>
          ) : <Spinner />}
          </div>
        </div>

        {/* Card: Expiración de Vouchers */}
        <div className="bg-white rounded-xl border-2 border-slate-300"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="px-3 py-2 flex items-center gap-2 rounded-t-[10px]"
            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
              <Ticket className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Expiración de Vouchers</span>
          </div>
          <div className="p-4">
            {configuracion ? (
              <div>
                <div className="flex items-center h-11 bg-slate-100 rounded-lg px-3 border-2 border-slate-300"
                  style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                  <input type="number" min={1} max={365} value={diasExpiracionVoucher}
                    onChange={(e) => setDiasExpiracionVoucher(Number(e.target.value))}
                    onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                    disabled={esGerente}
                    className="flex-1 bg-transparent outline-none text-base font-medium text-slate-800 w-16 disabled:opacity-50 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  />
                  <span className="text-[11px] font-bold text-indigo-700 px-2 py-0.5 rounded"
                    style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', border: '1px solid #c7d2fe' }}>DÍAS</span>
                </div>
                {erroresConfigBase.diasExpVoucher && <span className="text-sm font-semibold text-red-600 mt-0.5 block">{erroresConfigBase.diasExpVoucher}</span>}
                <p className="text-sm text-slate-500 mt-1 leading-snug font-semibold">Tiempo límite para recoger la recompensa.</p>
              </div>
            ) : <Spinner />}
          </div>
        </div>
      </div>
    </>
  );

  /** Sección: Sistema de Niveles */
  const seccionNiveles = (
    <SistemaNiveles
      niveles={niveles}
      nivelesActivos={nivelesActivos}
      onToggleNiveles={() => { if (!esGerente) setNivelesActivos(!nivelesActivos); }}
      onCambioNivel={actualizarNivel}
      errores={erroresNiveles}
      esGerente={esGerente}
    />
  );

  /** Sección: Recompensas */
  const seccionRecompensas = (
    <div className="space-y-3">
      {/* Móvil: Botón Nueva — solo dueños */}
      {!esGerente && (
        <button
          onClick={handleCrear}
          className="lg:hidden w-full flex items-center justify-center gap-1.5 h-11 rounded-xl text-base font-semibold text-white cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #1e293b, #334155)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.25)',
          }}
        >
          <Plus className="w-4 h-4" /> Nueva Recompensa
        </button>
      )}

      {/* Desktop: Card con header oscuro + grid */}
      <div
        className="hidden lg:flex bg-white rounded-xl overflow-hidden flex-col border-2 border-slate-300"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
            >
              <Gift className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
            </div>
            <h2 className="text-sm 2xl:text-base font-bold text-white">Recompensas</h2>
          </div>
          {!esGerente && (
            <Tooltip text="Nueva Recompensa" position="bottom">
              <button
                onClick={handleCrear}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
              >
                <Plus className="w-5 h-5" />
              </button>
            </Tooltip>
          )}
        </div>

        {/* Contenido */}
        <div className="p-4">
          {recompensas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center mb-4">
                <Gift className="w-7 h-7 text-indigo-500" />
              </div>
              <h3 className="text-base font-bold text-slate-700 mb-1">Sin recompensas aún</h3>
              <p className="text-sm text-slate-600 font-medium max-w-xs">
                {esGerente
                  ? 'El dueño puede crear recompensas desde aquí.'
                  : 'Crea recompensas para que tus clientes las canjeen con sus puntos.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 2xl:grid-cols-4 gap-3">
              {recompensas.map((r) => (
                <CardRecompensa
                  key={r.id}
                  recompensa={r}
                  onEditar={handleEditar}
                  onEliminar={handleEliminar}
                  onToggleActiva={handleToggleActiva}
                  esGerente={esGerente}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Móvil: Grid sin card contenedor */}
      <div className="lg:hidden">
        {recompensas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center mb-3">
              <Gift className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 mb-1">Sin recompensas aún</h3>
            <p className="text-sm text-slate-600 font-medium max-w-xs">
              {esGerente
                ? 'El dueño puede crear recompensas desde aquí.'
                : 'Crea recompensas para que tus clientes las canjeen con sus puntos.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recompensas.map((r) => (
              <CardRecompensa
                key={r.id}
                recompensa={r}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
                onToggleActiva={handleToggleActiva}
                esGerente={esGerente}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-full p-3 lg:p-1.5 2xl:p-3">
      {/* Estilos del header */}
      <style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />

      <div className="w-full max-w-7xl lg:max-w-4xl 2xl:max-w-7xl mx-auto space-y-3 lg:space-y-2 2xl:space-y-3">

        {/* ═══════════════════════════════════════════════════════════════════
            HEADER UNIFICADO: icono gradiente + título + 4 KPIs
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-4 lg:mb-5 2xl:mb-6">

          {/* Icono + Título — solo desktop */}
          <div className="hidden lg:flex items-center gap-4 shrink-0 mb-3 lg:mb-0">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #4f46e5, #6366f1, #818cf8)',
                boxShadow: '0 6px 20px rgba(79,70,229,0.4)',
              }}
            >
              {/* Moneda animada */}
              <div
                className="pp-coin-bounce flex items-center justify-center w-7 h-7 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #fde68a 0%, #fbbf24 35%, #f59e0b 70%, #d97706 100%)',
                  border: '1.5px solid #b45309',
                  boxShadow: 'inset 0 0 0 1.5px rgba(146,64,14,0.25)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: '#92400e', lineHeight: 1 }}>$</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                Sistema de Puntos
              </h1>
              <p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium">
                Configuración y Recompensas
              </p>
            </div>
          </div>

          {/* Toggle Puntos/Recompensas — Desktop, icon-only con tooltip */}
          <div className="hidden lg:flex items-center bg-slate-200 rounded-lg p-0.5 border-2 border-slate-300 shrink-0">
            <Tooltip text="Configuración de puntos" position="bottom">
              <button
                onClick={() => setTabDesktop('puntos')}
                className={`h-9 2xl:h-10 w-9 2xl:w-10 flex items-center justify-center rounded-md transition-all cursor-pointer ${tabDesktop === 'puntos'
                    ? 'text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-300 hover:text-slate-800'
                  }`}
                style={tabDesktop === 'puntos' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
              >
                <CircleDollarSign className="w-4 h-4 2xl:w-5 2xl:h-5" />
              </button>
            </Tooltip>
            <Tooltip text="Recompensas" position="bottom">
              <button
                onClick={() => setTabDesktop('recompensas')}
                className={`h-9 2xl:h-10 w-9 2xl:w-10 flex items-center justify-center rounded-md transition-all cursor-pointer ${tabDesktop === 'recompensas'
                    ? 'text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-300 hover:text-slate-800'
                  }`}
                style={tabDesktop === 'recompensas' ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
              >
                <Gift className="w-4 h-4 2xl:w-5 2xl:h-5" />
              </button>
            </Tooltip>
          </div>

          {/* 4 KPIs — carousel en mobile, right-aligned en desktop */}
          <CarouselKPI className="mt-5 lg:mt-0 lg:ml-auto">
            <div className="flex gap-1.5 lg:gap-1.5 2xl:gap-2 pb-1 lg:pb-0">
              <KPI tipo="clientes"  valor={fmt(kpis.clientes)} />
              <KPI tipo="otorgados" valor={fmt(kpis.otorgados)} />
              <KPI tipo="canjeados" valor={fmt(kpis.canjeados)} />
              <KPI tipo="activos"   valor={fmt(kpis.activos)} />
            </div>
          </CarouselKPI>
        </div>

        {/* Banner solo lectura — solo gerentes */}
        {esGerente && (
          <div className="flex items-center gap-3 bg-blue-100 border border-blue-300 rounded-xl p-3 lg:p-3.5 mt-3 lg:mt-14 2xl:mt-14 mb-3 lg:mb-5">
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm lg:text-sm font-semibold text-blue-700">Modo solo lectura</p>
              <p className="text-sm lg:text-sm 2xl:text-sm font-medium text-blue-600">Solo el dueño puede modificar la configuración de puntos.</p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MOBILE: 3 Tabs → solo se muestra la sección activa
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="lg:hidden mt-2">
          {/* Tab bar */}
          <div className="flex items-center bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5 shadow-md mb-3">
            {TABS_CONFIG.map(({ id, label, Icono }) => (
              <button
                key={id}
                onClick={() => setTabActiva(id)}
                className={`flex-1 flex items-center justify-center gap-1 lg:gap-1 2xl:gap-1.5 px-3 lg:px-3 2xl:px-4 h-10 lg:h-9 2xl:h-10 rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  tabActiva === id
                    ? 'text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-300'
                }`}
                style={tabActiva === id ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
              >
                <Icono className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Contenido del tab activo */}
          {tabActiva === 'configuracion' && seccionConfiguracion}
          {tabActiva === 'niveles' && seccionNiveles}
          {tabActiva === 'recompensas' && seccionRecompensas}
        </div>

        {/* Contenido desktop: Puntos */}
        <div className={`hidden ${tabDesktop === 'puntos' ? 'lg:block' : ''} ${!esGerente ? 'mt-4 lg:mt-14 2xl:mt-14' : ''}`}>
          {/* Fila superior: 3 cards de config + Niveles */}
          <div className="grid grid-cols-3 gap-3 2xl:gap-4 mb-3 2xl:mb-4">
            {/* Card: Puntos por Compra */}
            <div className="bg-white rounded-xl border-2 border-slate-300"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="px-4 py-2 flex items-center gap-2.5 rounded-t-[10px]"
                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                  <Settings className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                </div>
                <span className="text-sm 2xl:text-base font-bold text-white">Puntos por Compra</span>
              </div>
              <div className="p-3.5 2xl:p-4">
                {configuracion ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-600 shrink-0">Gasta</span>
                      <div className="flex items-center lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-2 flex-1 min-w-0 border-2 border-slate-300"
                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                        <span className="text-sm font-bold text-slate-600 mr-0.5">$</span>
                        <input type="number" min={1} value={textoPesosPor}
                          onChange={(e) => { const raw = e.target.value; setTextoPesosPor(raw); const v = Number(raw); if (v > 0) setPesosPor(v); }}
                          onBlur={() => { if (!textoPesosPor || Number(textoPesosPor) <= 0) { setPesosPor(10); setTextoPesosPor('10'); } }}
                          onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                          disabled={esGerente}
                          className="flex-1 bg-transparent outline-none lg:text-sm 2xl:text-[15px] font-medium text-slate-800 w-full disabled:opacity-50 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        />
                        <span className="text-[11px] font-bold text-indigo-700 px-1.5 py-0.5 rounded shrink-0 ml-1"
                          style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', border: '1px solid #c7d2fe' }}>MXN</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-600 shrink-0">Gana</span>
                      <div className="flex items-center lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-2 flex-1 min-w-0 border-2 border-slate-300"
                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                        <input type="number" min={1} value={textoPuntosGanados}
                          onChange={(e) => { const raw = e.target.value; setTextoPuntosGanados(raw); const v = Number(raw); if (v > 0) setPuntosGanados(v); }}
                          onBlur={() => { if (!textoPuntosGanados || Number(textoPuntosGanados) <= 0) { setPuntosGanados(1); setTextoPuntosGanados('1'); } }}
                          onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                          disabled={esGerente}
                          className="flex-1 bg-transparent outline-none lg:text-sm 2xl:text-[15px] font-medium text-slate-800 w-full disabled:opacity-50 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        />
                        <span className="text-[11px] font-bold text-amber-700 px-1.5 py-0.5 rounded shrink-0 ml-1"
                          style={{ background: 'linear-gradient(135deg, #fef9c3, #fde68a)', border: '1px solid #fde68a' }}>PUNTOS</span>
                      </div>
                    </div>
                    {(erroresConfigBase.pesosPor || erroresConfigBase.puntosGanados) && (
                      <span className="text-sm font-semibold text-red-600 mt-1 block">{erroresConfigBase.pesosPor || erroresConfigBase.puntosGanados}</span>
                    )}
                  </div>
                ) : <Spinner />}
              </div>
            </div>

            {/* Card: Expiración de Puntos */}
            <div className="bg-white rounded-xl border-2 border-slate-300"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="px-4 py-2 flex items-center gap-2.5 rounded-t-[10px]"
                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                  <Clock className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                </div>
                <span className="text-sm 2xl:text-base font-bold text-white">Expiración de Puntos</span>
              </div>
              <div className="p-3.5 2xl:p-4">
                {configuracion ? (
                  <div>
                    <div className="flex items-center lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-3 border-2 border-slate-300"
                      style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                      <input type="number" min={1} max={365} value={noExpiran ? '' : diasExpiracionPuntos}
                        onChange={(e) => setDiasExpiracionPuntos(Number(e.target.value))}
                        onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                        disabled={esGerente || noExpiran} placeholder={noExpiran ? '∞' : undefined}
                        className="flex-1 bg-transparent outline-none lg:text-sm 2xl:text-base font-medium text-slate-800 w-16 placeholder:text-slate-500 disabled:opacity-50 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                      />
                      <span className="text-[11px] font-bold text-indigo-700 px-2 py-0.5 rounded"
                        style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', border: '1px solid #c7d2fe' }}>DÍAS</span>
                    </div>
                    <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                      <input type="checkbox" checked={noExpiran} onChange={(e) => setNoExpiran(e.target.checked)}
                        disabled={esGerente} className="w-3 h-3 accent-indigo-600 cursor-pointer disabled:opacity-50" />
                      <span className="text-sm text-slate-600 font-semibold">No expiran</span>
                    </label>
                    {erroresConfigBase.diasExpPuntos && <span className="text-sm font-semibold text-red-600 mt-0.5 block">{erroresConfigBase.diasExpPuntos}</span>}
                    <p className="text-sm 2xl:text-sm text-slate-500 mt-1.5 leading-snug font-semibold">Los puntos expiran si el cliente no realiza compras en este periodo.</p>
                  </div>
                ) : <Spinner />}
              </div>
            </div>

            {/* Card: Expiración de Vouchers */}
            <div className="bg-white rounded-xl border-2 border-slate-300"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div className="px-4 py-2 flex items-center gap-2.5 rounded-t-[10px]"
                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                  <Ticket className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                </div>
                <span className="text-sm 2xl:text-base font-bold text-white">Expiración de Vouchers</span>
              </div>
              <div className="p-3.5 2xl:p-4">
                {configuracion ? (
                  <div>
                    <div className="flex items-center lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-3 border-2 border-slate-300"
                      style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                      <input type="number" min={1} max={365} value={diasExpiracionVoucher}
                        onChange={(e) => setDiasExpiracionVoucher(Number(e.target.value))}
                        onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                        disabled={esGerente}
                        className="flex-1 bg-transparent outline-none lg:text-sm 2xl:text-base font-medium text-slate-800 w-16 disabled:opacity-50 [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                      />
                      <span className="text-[11px] font-bold text-indigo-700 px-2 py-0.5 rounded"
                        style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', border: '1px solid #c7d2fe' }}>DÍAS</span>
                    </div>
                    {erroresConfigBase.diasExpVoucher && <span className="text-sm font-semibold text-red-600 mt-0.5 block">{erroresConfigBase.diasExpVoucher}</span>}
                    <p className="text-sm 2xl:text-sm text-slate-500 mt-1.5 leading-snug font-semibold">Tiempo límite para recoger la recompensa.</p>
                  </div>
                ) : <Spinner />}
              </div>
            </div>
          </div>

          {/* Fila media: Niveles */}
          <div className="mb-3 2xl:mb-4">
            {seccionNiveles}
          </div>

        </div>

        {/* Contenido desktop: Recompensas */}
        <div className={`hidden ${tabDesktop === 'recompensas' ? 'lg:block' : ''} ${!esGerente ? 'mt-4 lg:mt-14 2xl:mt-14' : ''}`}>
          {seccionRecompensas}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FAB GUARDAR — solo dueños, posición fija inferior derecho
      ═══════════════════════════════════════════════════════════════════ */}
      {!esGerente && hayCambiosPuntos && createPortal(
        <div className={`hidden lg:block fixed lg:bottom-6 lg:right-6 2xl:right-1/2 2xl:bottom-8 z-49 transition-transform duration-75 ${
          previewNegocioAbierto
            ? 'lg:right-[375px] 2xl:translate-x-[510px]'
            : 'lg:right-[45px] 2xl:translate-x-[895px]'
        }`}>
          <button
            ref={btnGuardarDesktopRef}
            onClick={() => {
              if (animandoGuardarDesktop || guardando) return;
              const btn = btnGuardarDesktopRef.current;
              if (btn) {
                const rect = btn.getBoundingClientRect();
                const dx = (window.innerWidth / 2) - (rect.left + rect.width / 2);
                const dy = (window.innerHeight / 2) - (rect.top + rect.height / 2);
                btn.style.setProperty('--dx', `${dx}px`);
                btn.style.setProperty('--dy', `${dy}px`);
              }
              setAnimandoGuardarDesktop(true);
              setTimeout(() => {
                setAnimandoGuardarDesktop(false);
                handleGuardarConfig();
              }, 850);
            }}
            disabled={guardando || tieneErroresNiveles || tieneErroresConfig}
            className={`w-14 h-14 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16 disabled:bg-slate-400 text-white rounded-full shadow-2xl hover:shadow-blue-500/50 disabled:cursor-not-allowed flex items-center justify-center group cursor-pointer ${animandoGuardarDesktop ? 'anim-guardar-tornado' : ''}`}
            style={{ background: guardando ? undefined : 'linear-gradient(135deg, #1e40af, #3b82f6)', border: '3px solid rgba(255,255,255,0.5)' }}
            title={guardando ? 'Guardando...' : 'Guardar Cambios'}
          >
            {guardando ? (
              <div className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-7 2xl:h-7 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-7 2xl:h-7 group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL crear / editar recompensa
          modalKey se incrementa cada apertura → remount limpio del estado
      ═══════════════════════════════════════════════════════════════════ */}
      <ModalRecompensa
        key={modalKey}
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        recompensa={recompensaEditando}
        onGuardar={handleGuardarRecompensa}
      />
    </div>
  );
}