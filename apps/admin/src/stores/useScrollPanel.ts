/**
 * useScrollPanel.ts
 * =================
 * Estado compartido para el auto-ocultamiento de la barra inferior (móvil) al hacer scroll.
 * La sección activa REGISTRA su contenedor scrolleable (`scrollEl`); el hook `useHideOnScroll`
 * lo escucha y actualiza `navVisible`; `LayoutMovil` colapsa la `BarraInferior` cuando es false.
 *
 * Mecanismo calcado del `useHideOnScroll` de la app pública (AY): un solo lugar para el ref del
 * scroll + el estado de visibilidad, para que cualquier sección lo reuse sin cablear nada extra.
 *
 * Ubicación: apps/admin/src/stores/useScrollPanel.ts
 */

import { create } from 'zustand';

interface ScrollPanelState {
  /** Contenedor que scrollea en la sección activa (móvil). Null = sin sección registrada. */
  scrollEl: HTMLElement | null;
  /** ¿La barra inferior está visible? (se oculta al scrollear hacia abajo). */
  navVisible: boolean;
  /** La sección registra/limpia su contenedor scrolleable. Al (re)registrar, la barra vuelve a verse. */
  setScrollEl: (el: HTMLElement | null) => void;
  setNavVisible: (v: boolean) => void;
}

export const useScrollPanel = create<ScrollPanelState>((set) => ({
  scrollEl: null,
  navVisible: true,
  setScrollEl: (el) => set({ scrollEl: el, navVisible: true }),
  setNavVisible: (v) => set({ navVisible: v }),
}));
