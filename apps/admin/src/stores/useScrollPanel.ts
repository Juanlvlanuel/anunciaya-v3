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
  /** ¿El header móvil está visible? Lo usa Territorios para el "modo mapa" (mapa a pantalla casi
   *  completa): se oculta header + nav mientras miras el mapa y vuelven al gestionar. */
  headerVisible: boolean;
  /** La sección registra/limpia su contenedor scrolleable. Al (re)registrar, las barras vuelven a verse. */
  setScrollEl: (el: HTMLElement | null) => void;
  setNavVisible: (v: boolean) => void;
  setHeaderVisible: (v: boolean) => void;
}

export const useScrollPanel = create<ScrollPanelState>((set) => ({
  scrollEl: null,
  navVisible: true,
  headerVisible: true,
  setScrollEl: (el) => set({ scrollEl: el, navVisible: true, headerVisible: true }),
  setNavVisible: (v) => set({ navVisible: v }),
  setHeaderVisible: (v) => set({ headerVisible: v }),
}));
