/**
 * useDashboardStore.ts
 * =====================
 * Store de Zustand para el Dashboard de Business Studio
 * 
 * UBICACIÓN: apps/web/src/stores/useDashboardStore.ts
 * 
 * FUNCIONALIDAD:
 * - Almacena KPIs, ventas, campañas, interacciones, reseñas, alertas
 * - Maneja el periodo seleccionado
 * - El interceptor en api.ts agrega sucursalId automáticamente
 * - Actualizaciones optimistas para alertas
 */

import { create } from 'zustand';
import * as dashboardService from '../services/dashboardService';
import type {
  Periodo,
  KPIsData,
  VentasData,
  Campana,
  Interaccion,
  Resena,
  AlertasData,
} from '../services/dashboardService';

// =============================================================================
// TIPOS
// =============================================================================

interface DashboardState {
  // Periodo seleccionado
  periodo: Periodo;

  // Datos
  kpis: KPIsData | null;
  ventas: VentasData | null;
  campanas: Campana[];
  interacciones: Interaccion[];
  resenas: Resena[];
  alertas: AlertasData | null;

  // Estados de carga
  cargandoKpis: boolean;
  cargandoVentas: boolean;
  cargandoCampanas: boolean;
  cargandoInteracciones: boolean;
  cargandoResenas: boolean;
  cargandoAlertas: boolean;

  // Errores
  error: string | null;

  // Acciones
  setPeriodo: (periodo: Periodo) => void;
  cargarKPIs: () => Promise<void>;
  cargarVentas: () => Promise<void>;
  cargarCampanas: () => Promise<void>;
  cargarInteracciones: () => Promise<void>;
  cargarResenas: () => Promise<void>;
  cargarAlertas: () => Promise<void>;
  cargarTodo: () => Promise<void>;
  marcarAlertaLeida: (alertaId: string) => Promise<void>;
  marcarTodasAlertasLeidas: () => Promise<void>;
  limpiar: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useDashboardStore = create<DashboardState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------
  periodo: 'semana',
  kpis: null,
  ventas: null,
  campanas: [],
  interacciones: [],
  resenas: [],
  alertas: null,
  cargandoKpis: false,
  cargandoVentas: false,
  cargandoCampanas: false,
  cargandoInteracciones: false,
  cargandoResenas: false,
  cargandoAlertas: false,
  error: null,

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar periodo
  // ---------------------------------------------------------------------------
  setPeriodo: (periodo: Periodo) => {
    set({ periodo });
    // Recargar datos con nuevo periodo
    get().cargarKPIs();
    get().cargarVentas();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar KPIs
  // ---------------------------------------------------------------------------
  cargarKPIs: async () => {
    const { periodo, kpis } = get();
    // ✅ OPTIMIZACIÓN: Solo mostrar skeleton si NO hay datos previos
    const esCargaInicial = kpis === null;

    set({ cargandoKpis: esCargaInicial, error: null });

    try {
      const respuesta = await dashboardService.obtenerKPIs(periodo);
      if (respuesta.success && respuesta.data) {
        set({ kpis: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando KPIs:', error);
      set({ error: 'Error al cargar métricas' });
    } finally {
      set({ cargandoKpis: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar ventas diarias
  // ---------------------------------------------------------------------------
  cargarVentas: async () => {
    const { periodo } = get();

    set({ cargandoVentas: true });

    try {
      const respuesta = await dashboardService.obtenerVentas(periodo);
      if (respuesta.success && respuesta.data) {
        set({ ventas: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      set({ cargandoVentas: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar campañas activas
  // ---------------------------------------------------------------------------
  cargarCampanas: async () => {
    set({ cargandoCampanas: true });

    try {
      const respuesta = await dashboardService.obtenerCampanas(5);
      if (respuesta.success && respuesta.data) {
        set({ campanas: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando campañas:', error);
    } finally {
      set({ cargandoCampanas: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar interacciones recientes
  // ---------------------------------------------------------------------------
  cargarInteracciones: async () => {
    set({ cargandoInteracciones: true });

    try {
      const respuesta = await dashboardService.obtenerInteracciones(10);
      if (respuesta.success && respuesta.data) {
        set({ interacciones: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando interacciones:', error);
    } finally {
      set({ cargandoInteracciones: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar reseñas recientes
  // ---------------------------------------------------------------------------
  cargarResenas: async () => {
    set({ cargandoResenas: true });

    try {
      const respuesta = await dashboardService.obtenerResenas(5);
      if (respuesta.success && respuesta.data) {
        set({ resenas: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando reseñas:', error);
    } finally {
      set({ cargandoResenas: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar alertas
  // ---------------------------------------------------------------------------
  cargarAlertas: async () => {
    set({ cargandoAlertas: true });

    try {
      const respuesta = await dashboardService.obtenerAlertas(5);
      if (respuesta.success && respuesta.data) {
        set({ alertas: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando alertas:', error);
    } finally {
      set({ cargandoAlertas: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar todo (inicial)
  // ---------------------------------------------------------------------------
  cargarTodo: async () => {
    const state = get();

    // Cargar todo en paralelo
    await Promise.all([
      state.cargarKPIs(),
      state.cargarVentas(),
      state.cargarCampanas(),
      state.cargarInteracciones(),
      state.cargarResenas(),
      state.cargarAlertas(),
    ]);
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Marcar alerta como leída (optimista)
  // ---------------------------------------------------------------------------
  marcarAlertaLeida: async (alertaId: string) => {
    const { alertas } = get();
    if (!alertas) return;

    // Guardar estado anterior para rollback
    const alertasAnterior = { ...alertas };

    // Actualización optimista
    const alertasActualizadas = alertas.alertas.map((a) =>
      a.id === alertaId ? { ...a, leida: true } : a
    );
    const noLeidas = alertasActualizadas.filter((a) => !a.leida).length;

    set({
      alertas: {
        alertas: alertasActualizadas,
        noLeidas,
      },
    });

    try {
      await dashboardService.marcarAlertaLeida(alertaId);
    } catch (error) {
      console.error('Error marcando alerta:', error);
      // Rollback
      set({ alertas: alertasAnterior });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Marcar todas las alertas como leídas (optimista)
  // ---------------------------------------------------------------------------
  marcarTodasAlertasLeidas: async () => {
    const { alertas } = get();
    if (!alertas || alertas.alertas.length === 0) return;

    // Guardar estado anterior para rollback
    const alertasAnterior = { ...alertas };

    // Actualización optimista - marcar todas como leídas
    const alertasActualizadas = alertas.alertas.map((a) => ({
      ...a,
      leida: true,
    }));

    set({
      alertas: {
        alertas: alertasActualizadas,
        noLeidas: 0,
      },
    });

    try {
      // Llamar al servicio para marcar todas (en paralelo)
      await Promise.all(
        alertas.alertas
          .filter((a) => !a.leida)
          .map((a) => dashboardService.marcarAlertaLeida(a.id))
      );
    } catch (error) {
      console.error('Error marcando todas las alertas:', error);
      // Rollback
      set({ alertas: alertasAnterior });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Limpiar store
  // ---------------------------------------------------------------------------
  limpiar: () => {
    set({
      periodo: 'semana',
      kpis: null,
      ventas: null,
      campanas: [],
      interacciones: [],
      resenas: [],
      alertas: null,
      cargandoKpis: false,
      cargandoVentas: false,
      cargandoCampanas: false,
      cargandoInteracciones: false,
      cargandoResenas: false,
      cargandoAlertas: false,
      error: null,
    });
  },
}));

// =============================================================================
// SELECTORES (para mejor performance)
// =============================================================================

export const selectKPIs = (state: DashboardState) => state.kpis;
export const selectVentas = (state: DashboardState) => state.ventas;
export const selectCampanas = (state: DashboardState) => state.campanas;
export const selectInteracciones = (state: DashboardState) => state.interacciones;
export const selectResenas = (state: DashboardState) => state.resenas;
export const selectAlertas = (state: DashboardState) => state.alertas;
export const selectPeriodo = (state: DashboardState) => state.periodo;
export const selectCargando = (state: DashboardState) =>
  state.cargandoKpis || state.cargandoVentas;