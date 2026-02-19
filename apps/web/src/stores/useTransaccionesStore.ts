/**
 * useTransaccionesStore.ts
 * ========================
 * Store de Zustand para el módulo Transacciones de Business Studio.
 *
 * UBICACIÓN: apps/web/src/stores/useTransaccionesStore.ts
 *
 * RESPONSABILIDADES:
 *   - KPIs de la página Transacciones
 *   - Historial de transacciones con paginación
 *   - Revocar transacciones con motivo obligatorio
 *
 * SUCURSALES:
 *   - Todo el historial se filtra por sucursal automáticamente (interceptor)
 *   - Gerentes solo ven su sucursal (forzado en backend)
 *
 * PAGINACIÓN:
 *   - Offset-based con limit fijo (20)
 *   - hayMas se detecta si la respuesta tiene exactamente limit elementos
 *   - cargarMas() appenda al array existente
 *   - Cambiar periodo resetea offset a 0 y reemplaza el array
 *
 * OPTIMISTIC UI:
 *   - revocarTransaccion: cambia estado a 'cancelado' inmediatamente, rollback si falla
 *
 * CACHÉ:
 *   - Primera visita → carga desde backend
 *   - Volver a página → muestra store instantáneamente
 *   - Cambio de sucursal → recarga desde cero (manejado externamente)
 */

import { create } from 'zustand';
import * as transaccionesService from '../services/transaccionesService';
import type {
  TransaccionPuntos,
  PeriodoEstadisticas,
} from '../types/puntos';
import type { KPIsTransacciones, KPIsCanjes, VoucherCanje } from '../types/transacciones';

// =============================================================================
// CONSTANTES
// =============================================================================

const LIMIT_PAGINA = 20;

// =============================================================================
// TIPOS
// =============================================================================

interface TransaccionesState {
  // Tab activo
  tabActivo: 'ventas' | 'canjes';

  // KPIs Ventas
  kpis: KPIsTransacciones | null;
  cargandoKpis: boolean;

  // KPIs Canjes
  kpisCanjes: KPIsCanjes | null;
  cargandoKpisCanjes: boolean;

  // Periodo y paginación
  periodo: PeriodoEstadisticas;
  offset: number;
  hayMas: boolean;

  // Datos
  historial: TransaccionPuntos[];
  totalResultados: number;

  // Datos Canjes
  historialCanjes: VoucherCanje[];
  totalResultadosCanjes: number;
  offsetCanjes: number;
  hayMasCanjes: boolean;

  // Estados de carga
  cargandoHistorial: boolean;
  cargandoMas: boolean;
  cargandoHistorialCanjes: boolean;
  cargandoMasCanjes: boolean;

  // Búsqueda
  busqueda: string;

  // Filtro operador
  operadorId: string;
  operadores: { id: string; nombre: string; tipo: string }[];

  // Filtro estado
  estadoFiltro: string;

  // Filtro estado canjes
  estadoFiltroCanjes: string;
  busquedaCanjes: string;

  // Carga inicial (solo la primera vez)
  cargaInicialCompleta: boolean;
  cargaInicialCanjesCompleta: boolean;

  // Error
  error: string | null;

  // Acciones - KPIs
  cargarKPIs: () => Promise<void>;
  cargarKPIsCanjes: () => Promise<void>;

  // Acciones - Tab
  setTabActivo: (tab: 'ventas' | 'canjes') => void;

  // Acciones - Historial
  setPeriodo: (periodo: PeriodoEstadisticas) => void;
  setBusqueda: (busqueda: string) => void;
  setOperadorId: (operadorId: string) => void;
  setEstadoFiltro: (estado: string) => void;
  cargarOperadores: () => Promise<void>;
  cargarHistorial: () => Promise<void>;
  cargarMas: () => Promise<void>;
  revocarTransaccion: (id: string, motivo: string) => Promise<boolean>;

  // Acciones - Historial Canjes
  setEstadoFiltroCanjes: (estado: string) => void;
  setBusquedaCanjes: (busqueda: string) => void;
  cargarHistorialCanjes: () => Promise<void>;
  cargarMasCanjes: () => Promise<void>;

  // Reset
  limpiar: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useTransaccionesStore = create<TransaccionesState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------
  tabActivo: 'ventas',
  kpis: null,
  cargandoKpis: false,
  kpisCanjes: null,
  cargandoKpisCanjes: false,
  periodo: 'todo',
  offset: 0,
  hayMas: false,
  historial: [],
  totalResultados: 0,
  historialCanjes: [],
  totalResultadosCanjes: 0,
  offsetCanjes: 0,
  hayMasCanjes: false,
  cargandoHistorial: false,
  cargandoMas: false,
  cargandoHistorialCanjes: false,
  cargandoMasCanjes: false,
  cargaInicialCompleta: false,
  cargaInicialCanjesCompleta: false,
  busqueda: '',
  operadorId: '',
  operadores: [],
  estadoFiltro: '',
  estadoFiltroCanjes: '',
  busquedaCanjes: '',
  error: null,

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar KPIs
  // ---------------------------------------------------------------------------
  cargarKPIs: async () => {
    const { periodo, kpis } = get();
    const esCargaInicial = kpis === null;

    set({ cargandoKpis: esCargaInicial, error: null });

    try {
      const respuesta = await transaccionesService.getKPIsTransacciones(periodo);
      if (respuesta.success && respuesta.data) {
        set({ kpis: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando KPIs transacciones:', error);
    } finally {
      set({ cargandoKpis: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCION: Cargar KPIs Canjes
  // ---------------------------------------------------------------------------
  cargarKPIsCanjes: async () => {
    const { periodo, kpisCanjes } = get();
    const esCargaInicial = kpisCanjes === null;

    set({ cargandoKpisCanjes: esCargaInicial, error: null });

    try {
      const respuesta = await transaccionesService.getKPIsCanjes(periodo);
      if (respuesta.success && respuesta.data) {
        set({ kpisCanjes: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando KPIs canjes:', error);
    } finally {
      set({ cargandoKpisCanjes: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCION: Cambiar tab activo
  // ---------------------------------------------------------------------------
  setTabActivo: (tab: 'ventas' | 'canjes') => {
    set({ tabActivo: tab });
    // Cargar datos del tab si es la primera vez
    if (tab === 'canjes') {
      const { cargaInicialCanjesCompleta } = get();
      if (!cargaInicialCanjesCompleta) {
        get().cargarHistorialCanjes();
        get().cargarKPIsCanjes();
      }
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar periodo (resetea paginación y recarga todo)
  // ---------------------------------------------------------------------------
  setPeriodo: (periodo: PeriodoEstadisticas) => {
    const { tabActivo } = get();
    // NO vaciar historial aquí para evitar "temblor" en la UI
    set({ periodo, offset: 0, hayMas: false, offsetCanjes: 0, hayMasCanjes: false });
    
    if (tabActivo === 'ventas') {
      get().cargarHistorial();
      get().cargarKPIs();
    } else {
      get().cargarHistorialCanjes();
      get().cargarKPIsCanjes();
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar búsqueda (resetea paginación y recarga)
  // ---------------------------------------------------------------------------
  setBusqueda: (busqueda: string) => {
    // NO vaciar historial aquí para evitar "temblor" en la UI
    // El historial se reemplaza cuando llegan los nuevos datos
    set({ busqueda, offset: 0, hayMas: false });
    get().cargarHistorial();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar operador (resetea paginación y recarga)
  // ---------------------------------------------------------------------------
  setOperadorId: (operadorId: string) => {
    set({ operadorId, offset: 0, hayMas: false });
    get().cargarHistorial();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar estado filtro (resetea paginación y recarga)
  // ---------------------------------------------------------------------------
  setEstadoFiltro: (estadoFiltro: string) => {
    set({ estadoFiltro, offset: 0, hayMas: false });
    get().cargarHistorial();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar lista de operadores (para dropdown)
  // ---------------------------------------------------------------------------
  cargarOperadores: async () => {
    try {
      const respuesta = await transaccionesService.getOperadores();
      if (respuesta.success && respuesta.data) {
        set({ operadores: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando operadores:', error);
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar historial (primera página o recarga completa)
  // ---------------------------------------------------------------------------
  cargarHistorial: async () => {
    const { periodo, busqueda, operadorId, estadoFiltro, cargandoHistorial, cargaInicialCompleta } = get();
    
    // Evitar peticiones duplicadas
    if (cargandoHistorial) return;
    
    // Solo mostrar spinner en la primera carga absoluta (antes de tener datos por primera vez)
    const esCargaInicial = !cargaInicialCompleta;

    set({ cargandoHistorial: esCargaInicial, error: null });

    try {
      const respuesta = await transaccionesService.getHistorial(periodo, LIMIT_PAGINA, 0, busqueda || undefined, operadorId || undefined, estadoFiltro || undefined);
      if (respuesta.success && respuesta.data) {
        const { historial: datos, total } = respuesta.data;
        set({
          historial: datos,
          totalResultados: total,
          offset: datos.length,
          hayMas: datos.length === LIMIT_PAGINA,
          cargaInicialCompleta: true,
        });
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      set({ error: 'Error al cargar historial' });
    } finally {
      set({ cargandoHistorial: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar más (siguiente página, append al array)
  // ---------------------------------------------------------------------------
  cargarMas: async () => {
    const { periodo, busqueda, operadorId, estadoFiltro, offset, hayMas, cargandoMas } = get();

    // Evitar peticiones duplicadas o si no hay más datos
    if (!hayMas || cargandoMas) return;

    set({ cargandoMas: true });

    try {
      const respuesta = await transaccionesService.getHistorial(periodo, LIMIT_PAGINA, offset, busqueda || undefined, operadorId || undefined, estadoFiltro || undefined);
      if (respuesta.success && respuesta.data) {
        const { historial: datos } = respuesta.data;
        set((state) => ({
          historial: [...state.historial, ...datos],
          offset: state.offset + datos.length,
          hayMas: datos.length === LIMIT_PAGINA,
        }));
      }
    } catch (error) {
      console.error('Error cargando más transacciones:', error);
    } finally {
      set({ cargandoMas: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Revocar transacción (optimista, con motivo obligatorio)
  // ---------------------------------------------------------------------------
  revocarTransaccion: async (id: string, motivo: string) => {
    const { historial } = get();

    // Guardar array anterior para rollback
    const historialAnterior = [...historial];

    // Actualización optimista: cambiar estado a 'cancelado'
    set({
      historial: historial.map((t) =>
        t.id === id ? { ...t, estado: 'cancelado' as const } : t
      ),
    });

    try {
      const respuesta = await transaccionesService.revocarTransaccion(id, motivo);
      if (respuesta.success) {
        // Recargar KPIs para reflejar la revocación
        get().cargarKPIs();
        return true;
      } else {
        // Rollback
        set({ historial: historialAnterior });
        return false;
      }
    } catch (error) {
      console.error('Error revocando transacción:', error);
      // Rollback
      set({ historial: historialAnterior });
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // ACCION: Cambiar estado filtro canjes (resetea paginacion y recarga)
  // ---------------------------------------------------------------------------
  setEstadoFiltroCanjes: (estadoFiltroCanjes: string) => {
    set({ estadoFiltroCanjes, offsetCanjes: 0, hayMasCanjes: false });
    get().cargarHistorialCanjes();
  },

  // ---------------------------------------------------------------------------
  // ACCION: Cambiar busqueda canjes (resetea paginacion y recarga)
  // ---------------------------------------------------------------------------
  setBusquedaCanjes: (busquedaCanjes: string) => {
    set({ busquedaCanjes, offsetCanjes: 0, hayMasCanjes: false });
    get().cargarHistorialCanjes();
  },

  // ---------------------------------------------------------------------------
  // ACCION: Cargar historial canjes (primera pagina o recarga completa)
  // ---------------------------------------------------------------------------
  cargarHistorialCanjes: async () => {
    const { periodo, estadoFiltroCanjes, busquedaCanjes, cargandoHistorialCanjes, cargaInicialCanjesCompleta } = get();
    
    // Evitar peticiones duplicadas
    if (cargandoHistorialCanjes) return;
    
    // Solo mostrar spinner en la primera carga absoluta
    const esCargaInicial = !cargaInicialCanjesCompleta;

    set({ cargandoHistorialCanjes: esCargaInicial, error: null });

    try {
      const respuesta = await transaccionesService.getHistorialCanjes(
        periodo,
        LIMIT_PAGINA,
        0,
        estadoFiltroCanjes || undefined,
        busquedaCanjes || undefined
      );
      if (respuesta.success && respuesta.data) {
        const { canjes, total } = respuesta.data;
        set({
          historialCanjes: canjes,
          totalResultadosCanjes: total,
          offsetCanjes: canjes.length,
          hayMasCanjes: canjes.length === LIMIT_PAGINA,
          cargaInicialCanjesCompleta: true,
        });
      }
    } catch (error) {
      console.error('Error cargando historial canjes:', error);
      set({ error: 'Error al cargar historial de canjes' });
    } finally {
      set({ cargandoHistorialCanjes: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCION: Cargar mas canjes (siguiente pagina, append al array)
  // ---------------------------------------------------------------------------
  cargarMasCanjes: async () => {
    const { periodo, estadoFiltroCanjes, busquedaCanjes, offsetCanjes, hayMasCanjes, cargandoMasCanjes } = get();

    // Evitar peticiones duplicadas o si no hay mas datos
    if (!hayMasCanjes || cargandoMasCanjes) return;

    set({ cargandoMasCanjes: true });

    try {
      const respuesta = await transaccionesService.getHistorialCanjes(
        periodo,
        LIMIT_PAGINA,
        offsetCanjes,
        estadoFiltroCanjes || undefined,
        busquedaCanjes || undefined
      );
      if (respuesta.success && respuesta.data) {
        const { canjes } = respuesta.data;
        set((state) => ({
          historialCanjes: [...state.historialCanjes, ...canjes],
          offsetCanjes: state.offsetCanjes + canjes.length,
          hayMasCanjes: canjes.length === LIMIT_PAGINA,
        }));
      }
    } catch (error) {
      console.error('Error cargando mas canjes:', error);
    } finally {
      set({ cargandoMasCanjes: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Reset
  // ---------------------------------------------------------------------------
  limpiar: () => {
    set({
      tabActivo: 'ventas',
      kpis: null,
      cargandoKpis: false,
      kpisCanjes: null,
      cargandoKpisCanjes: false,
      periodo: 'todo',
      offset: 0,
      hayMas: false,
      historial: [],
      totalResultados: 0,
      historialCanjes: [],
      totalResultadosCanjes: 0,
      offsetCanjes: 0,
      hayMasCanjes: false,
      cargandoHistorial: false,
      cargandoMas: false,
      cargandoHistorialCanjes: false,
      cargandoMasCanjes: false,
      cargaInicialCompleta: false,
      cargaInicialCanjesCompleta: false,
      busqueda: '',
      operadorId: '',
      estadoFiltro: '',
      estadoFiltroCanjes: '',
      busquedaCanjes: '',
      error: null,
    });
  },
}));

// =============================================================================
// SELECTORES
// =============================================================================

export const selectHistorial = (state: TransaccionesState) => state.historial;
export const selectHayMas = (state: TransaccionesState) => state.hayMas;
export const selectPeriodoTransacciones = (state: TransaccionesState) => state.periodo;
export const selectKPIsTransacciones = (state: TransaccionesState) => state.kpis;
export const selectCargandoTransacciones = (state: TransaccionesState) =>
  state.cargandoHistorial || state.cargandoMas;

// Selectores Canjes
export const selectTabActivo = (state: TransaccionesState) => state.tabActivo;
export const selectHistorialCanjes = (state: TransaccionesState) => state.historialCanjes;
export const selectHayMasCanjes = (state: TransaccionesState) => state.hayMasCanjes;
export const selectKPIsCanjes = (state: TransaccionesState) => state.kpisCanjes;
export const selectCargandoCanjes = (state: TransaccionesState) =>
  state.cargandoHistorialCanjes || state.cargandoMasCanjes;