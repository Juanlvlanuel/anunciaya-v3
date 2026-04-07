/**
 * usePuntosStore.ts
 * =================
 * Store de Zustand para estado UI del módulo Puntos de Business Studio.
 *
 * SOLO estado de UI — los datos del servidor (configuración, recompensas,
 * estadísticas) son manejados por React Query en hooks/queries/usePuntos.ts.
 *
 * Ubicación: apps/web/src/stores/usePuntosStore.ts
 */

import { create } from 'zustand';
import type { PeriodoEstadisticas } from '../types/puntos';

// =============================================================================
// TIPOS
// =============================================================================

interface PuntosUIState {
  periodo: PeriodoEstadisticas;

  setPeriodo: (periodo: PeriodoEstadisticas) => void;
  limpiar: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const usePuntosStore = create<PuntosUIState>((set) => ({
  periodo: 'todo',

  setPeriodo: (periodo) => set({ periodo }),
  limpiar: () => set({ periodo: 'todo' }),
}));
