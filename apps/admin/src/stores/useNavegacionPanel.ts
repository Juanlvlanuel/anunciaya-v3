/**
 * useNavegacionPanel.ts
 * ======================
 * Navegación entre secciones del Panel CON filtro inicial (deep-link). El Resumen y la campana de
 * pendientes son "centro de trabajo": al hacer clic en un KPI o un pendiente, llevan a la sección
 * que resuelve la tarea, ya filtrada (ej. Negocios → solo "en gracia").
 *
 * Cómo funciona:
 *   - `navegar(seccion, filtros?)` deja un `destino` pendiente + el filtro inicial de esa sección.
 *   - `PaginaPanel` observa `destino`, cambia de sección y lo limpia (one-shot).
 *   - La sección destino (Negocios / Suscripciones) consume su filtro inicial AL MONTAR (también
 *     one-shot, para no re-aplicarlo en cada render).
 *
 * Ubicación: apps/admin/src/stores/useNavegacionPanel.ts
 */

import { create } from 'zustand';

export interface FiltroNegociosInicial {
  estadoPago?: string;
  /** Deep-link a una fila concreta: la sección Negocios hace scroll y la resalta (si está visible). */
  resaltarId?: string;
}
export interface FiltroSuscripcionesInicial {
  tipo?: string;
}

interface NavegacionPanelState {
  /** Sección a la que se pidió saltar (one-shot). null = sin navegación pendiente. */
  destino: string | null;
  filtroNegocios: FiltroNegociosInicial | null;
  filtroSuscripciones: FiltroSuscripcionesInicial | null;
  navegar: (
    destino: string,
    filtros?: { negocios?: FiltroNegociosInicial; suscripciones?: FiltroSuscripcionesInicial },
  ) => void;
  limpiarDestino: () => void;
  /** Lee y limpia el filtro inicial de Negocios (one-shot). */
  consumirFiltroNegocios: () => FiltroNegociosInicial | null;
  /** Lee y limpia el filtro inicial de Suscripciones (one-shot). */
  consumirFiltroSuscripciones: () => FiltroSuscripcionesInicial | null;
}

export const useNavegacionPanel = create<NavegacionPanelState>((set, get) => ({
  destino: null,
  filtroNegocios: null,
  filtroSuscripciones: null,
  navegar: (destino, filtros) =>
    set({
      destino,
      filtroNegocios: filtros?.negocios ?? null,
      filtroSuscripciones: filtros?.suscripciones ?? null,
    }),
  limpiarDestino: () => set({ destino: null }),
  consumirFiltroNegocios: () => {
    const f = get().filtroNegocios;
    if (f) set({ filtroNegocios: null });
    return f;
  },
  consumirFiltroSuscripciones: () => {
    const f = get().filtroSuscripciones;
    if (f) set({ filtroSuscripciones: null });
    return f;
  },
}));
