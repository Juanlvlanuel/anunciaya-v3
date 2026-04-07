/**
 * useAlertasStore.ts
 * ====================
 * Store de Zustand para estado UI del módulo Alertas.
 * Los datos del servidor (lista, KPIs, configuración) viven
 * en React Query — ver hooks/queries/useAlertas.ts
 *
 * Ubicación: apps/web/src/stores/useAlertasStore.ts
 */

import { create } from 'zustand';
import type { CategoriaAlerta, SeveridadAlerta, TipoAlerta, AlertaCompleta } from '../types/alertas';

// =============================================================================
// TIPOS
// =============================================================================

export interface FiltrosAlertasUI {
  tipo?: TipoAlerta;
  categoria?: CategoriaAlerta;
  severidad?: SeveridadAlerta;
  leida?: boolean;
  resuelta?: boolean;
  busqueda?: string;
}

interface AlertasUIState {
  // Filtros activos (sin pagina — la maneja React Query internamente)
  filtros: FiltrosAlertasUI;

  // Alerta abierta en el modal de detalle
  alertaSeleccionada: AlertaCompleta | null;

  // Setters
  setFiltro: <K extends keyof FiltrosAlertasUI>(campo: K, valor: FiltrosAlertasUI[K]) => void;
  limpiarFiltros: () => void;
  seleccionarAlerta: (alerta: AlertaCompleta | null) => void;

  // Reset al salir de la página
  limpiar: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useAlertasStore = create<AlertasUIState>((set) => ({
  filtros: {},
  alertaSeleccionada: null,

  setFiltro: (campo, valor) =>
    set((state) => ({
      filtros: { ...state.filtros, [campo]: valor },
    })),

  limpiarFiltros: () => set({ filtros: {} }),

  seleccionarAlerta: (alerta) => set({ alertaSeleccionada: alerta }),

  limpiar: () => set({ filtros: {}, alertaSeleccionada: null }),
}));
