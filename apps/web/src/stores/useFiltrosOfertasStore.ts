/**
 * useFiltrosOfertasStore.ts
 * ==========================
 * Estado UI de la sección pública de Ofertas.
 *
 * SOLO ESTADO DE UI. Ningún dato del servidor vive aquí — eso va en
 * React Query (`hooks/queries/useOfertasFeed.ts`).
 *
 * Cada chip mapea a un set distinto de query params del backend. La
 * traducción chip → params NO vive aquí; vive en el hook que consume
 * este store. Aquí solo guardamos qué chip está activo y la búsqueda.
 *
 * Ubicación: apps/web/src/stores/useFiltrosOfertasStore.ts
 */

import { create } from 'zustand';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Chips situacionales de la página de Ofertas (header superior).
 *
 * - 'recientes'    → ordena por created_at DESC (default — vista editorial)
 * - 'mas_vistas'   → ordena por populares (vistas últimos 7 días)
 * - 'cerca'        → ordena por distancia (requiere GPS)
 * - 'hoy'          → creadas últimas 24h
 * - 'esta_semana'  → creadas últimas 168h (7 días)
 * - 'cardya'       → solo negocios que participan en CardYA
 *
 * Nota v1.5: el chip 'todas' fue eliminado (su única función era alternar
 * la vista editorial vs grid catálogo). Ahora la vista editorial se muestra
 * cuando `chipActivo === 'recientes'` (default); cualquier otro chip
 * activa la vista grid filtrada.
 */
export type ChipSituacional =
  | 'recientes'
  | 'mas_vistas'
  | 'cerca'
  | 'hoy'
  | 'esta_semana'
  | 'cardya';

interface FiltrosOfertasState {
  chipActivo: ChipSituacional;
  busqueda: string;
  setChipActivo: (chip: ChipSituacional) => void;
  setBusqueda: (busqueda: string) => void;
  resetear: () => void;
}

// =============================================================================
// VALORES INICIALES
// =============================================================================

const VALORES_INICIALES = {
  chipActivo: 'recientes' as ChipSituacional,
  busqueda: '',
};

// =============================================================================
// STORE
// =============================================================================

export const useFiltrosOfertasStore = create<FiltrosOfertasState>((set, get) => ({
  ...VALORES_INICIALES,

  setChipActivo: (chip) => {
    if (get().chipActivo === chip) return;
    set({ chipActivo: chip });
  },

  setBusqueda: (busqueda) => {
    if (get().busqueda === busqueda) return;
    set({ busqueda });
  },

  resetear: () => set(VALORES_INICIALES),
}));

export default useFiltrosOfertasStore;
