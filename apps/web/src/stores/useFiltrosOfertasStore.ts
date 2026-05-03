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
 * - 'todas'        → sin filtro extra (default)
 * - 'hoy'          → creadas últimas 24h
 * - 'esta_semana'  → creadas últimas 168h (7 días)
 * - 'cerca'        → ordena por distancia (requiere GPS)
 * - 'cardya'       → solo negocios que participan en CardYA
 * - 'nuevas'       → ordena por created_at DESC
 * - 'mas_vistas'   → ordena por populares (vistas últimos 7 días)
 */
export type ChipSituacional =
  | 'todas'
  | 'hoy'
  | 'esta_semana'
  | 'cerca'
  | 'cardya'
  | 'nuevas'
  | 'mas_vistas';

interface FiltrosOfertasState {
  chipActivo: ChipSituacional;
  busqueda: string;
  /**
   * Vista expandida del catálogo (grid 2 columnas, sin feed editorial).
   * Solo aplica cuando `chipActivo === 'todas'`. Cualquier otro chip la
   * resetea a `false` automáticamente.
   *
   * Se controla desde el chip "Todas" del header (click sobre el chip
   * cuando ya está activo alterna el modo).
   */
  vistaExpandida: boolean;
  setChipActivo: (chip: ChipSituacional) => void;
  setBusqueda: (busqueda: string) => void;
  toggleVistaExpandida: () => void;
  resetear: () => void;
}

// =============================================================================
// VALORES INICIALES
// =============================================================================

const VALORES_INICIALES = {
  chipActivo: 'todas' as ChipSituacional,
  busqueda: '',
  vistaExpandida: false,
};

// =============================================================================
// STORE
// =============================================================================

export const useFiltrosOfertasStore = create<FiltrosOfertasState>((set, get) => ({
  ...VALORES_INICIALES,

  setChipActivo: (chip) => {
    if (get().chipActivo === chip) return;
    // Al cambiar a un chip ≠ 'todas', siempre apaga la vista expandida.
    set({ chipActivo: chip, vistaExpandida: false });
  },

  setBusqueda: (busqueda) => {
    if (get().busqueda === busqueda) return;
    set({ busqueda });
  },

  toggleVistaExpandida: () => {
    set({ chipActivo: 'todas', vistaExpandida: !get().vistaExpandida });
  },

  resetear: () => set(VALORES_INICIALES),
}));

export default useFiltrosOfertasStore;
