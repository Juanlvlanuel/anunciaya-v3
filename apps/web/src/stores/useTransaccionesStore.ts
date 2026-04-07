/**
 * useTransaccionesStore.ts
 * ========================
 * Store de Zustand para estado UI del módulo Transacciones.
 * Los datos del servidor (KPIs, historial, etc.) ahora viven
 * en React Query — ver hooks/queries/useTransacciones.ts
 *
 * UBICACIÓN: apps/web/src/stores/useTransaccionesStore.ts
 */

import { create } from 'zustand';
import type { PeriodoEstadisticas } from '../types/puntos';

// =============================================================================
// TIPOS
// =============================================================================

interface TransaccionesUIState {
  tabActivo: 'ventas' | 'cupones' | 'canjes';
  periodo: PeriodoEstadisticas;
  busqueda: string;
  operadorId: string;
  operadorIdCupones: string;
  operadorIdCanjes: string;
  estadoFiltro: string;
  estadoFiltroCanjes: string;
  busquedaCanjes: string;

  setTabActivo: (tab: 'ventas' | 'cupones' | 'canjes') => void;
  setPeriodo: (periodo: PeriodoEstadisticas) => void;
  setBusqueda: (busqueda: string) => void;
  // setOperadorId es tab-aware: enruta al campo correcto según tabActivo
  setOperadorId: (operadorId: string) => void;
  setEstadoFiltro: (estadoFiltro: string) => void;
  setEstadoFiltroCanjes: (estadoFiltroCanjes: string) => void;
  setBusquedaCanjes: (busquedaCanjes: string) => void;
  limpiar: () => void;
}

// =============================================================================
// ESTADO INICIAL
// =============================================================================

const ESTADO_INICIAL = {
  tabActivo: 'ventas' as const,
  periodo: 'todo' as PeriodoEstadisticas,
  busqueda: '',
  operadorId: '',
  operadorIdCupones: '',
  operadorIdCanjes: '',
  estadoFiltro: '',
  estadoFiltroCanjes: '',
  busquedaCanjes: '',
};

// =============================================================================
// STORE
// =============================================================================

export const useTransaccionesStore = create<TransaccionesUIState>((set, get) => ({
  ...ESTADO_INICIAL,

  setTabActivo: (tab) => set({ tabActivo: tab }),

  setPeriodo: (periodo) => set({ periodo }),

  setBusqueda: (busqueda) => set({ busqueda }),

  // Enruta al campo correcto según el tab activo
  setOperadorId: (operadorId) => {
    const { tabActivo } = get();
    if (tabActivo === 'ventas') set({ operadorId });
    else if (tabActivo === 'cupones') set({ operadorIdCupones: operadorId });
    else set({ operadorIdCanjes: operadorId });
  },

  setEstadoFiltro: (estadoFiltro) => set({ estadoFiltro }),

  setEstadoFiltroCanjes: (estadoFiltroCanjes) => set({ estadoFiltroCanjes }),

  setBusquedaCanjes: (busquedaCanjes) => set({ busquedaCanjes }),

  limpiar: () => set(ESTADO_INICIAL),
}));

// =============================================================================
// SELECTORES
// =============================================================================

export const selectTabActivo = (state: TransaccionesUIState) => state.tabActivo;
export const selectPeriodoTransacciones = (state: TransaccionesUIState) => state.periodo;
