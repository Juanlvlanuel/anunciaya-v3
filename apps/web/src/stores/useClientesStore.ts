/**
 * useClientesStore.ts
 * ====================
 * Store de Zustand para el módulo Clientes de Business Studio.
 *
 * SOLO estado de UI — los datos del servidor (KPIs, lista, detalle, historial)
 * son manejados por React Query en hooks/queries/useClientes.ts.
 *
 * Ubicación: apps/web/src/stores/useClientesStore.ts
 */

import { create } from 'zustand';
import type { NivelCardYA } from '../types/clientes';

// =============================================================================
// TIPOS
// =============================================================================

interface ClientesUIState {
  // Filtros
  busqueda: string;
  nivelFiltro: NivelCardYA | null;

  // Setters
  setBusqueda: (busqueda: string) => void;
  setNivelFiltro: (nivel: NivelCardYA | null) => void;

  // Reset al salir de la página
  limpiar: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useClientesStore = create<ClientesUIState>((set) => ({
  busqueda: '',
  nivelFiltro: null,

  setBusqueda: (busqueda) => set({ busqueda }),
  setNivelFiltro: (nivelFiltro) => set({ nivelFiltro }),

  limpiar: () => set({ busqueda: '', nivelFiltro: null }),
}));
