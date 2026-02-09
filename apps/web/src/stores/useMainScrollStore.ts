/**
 * useMainScrollStore.ts
 * =====================
 * Store global (Zustand) para compartir la ref del contenedor
 * principal de scroll entre MainLayout y cualquier componente
 * que necesite escuchar o controlar el scroll.
 *
 * ¿POR QUÉ UN STORE?
 * En móvil, el scroll NO ocurre en `window` sino dentro del <main>
 * que tiene `overflow-y-auto`. Los hooks como useScrollDirection,
 * useCollapsibleBanner, etc. necesitan acceso a ese elemento para
 * funcionar correctamente.
 *
 * USO:
 *   // En MainLayout.tsx → registrar la ref
 *   const setMainScrollRef = useMainScrollStore(s => s.setMainScrollRef);
 *   const mainRef = useRef<HTMLElement>(null);
 *   useEffect(() => { setMainScrollRef(mainRef); }, []);
 *
 *   // En cualquier componente → consumir la ref
 *   const mainScrollRef = useMainScrollStore(s => s.mainScrollRef);
 *   const { scrollDirection } = useScrollDirection({ scrollRef: mainScrollRef });
 *
 * UBICACIÓN: apps/web/src/stores/useMainScrollStore.ts
 */

import { create } from 'zustand';
import type { RefObject } from 'react';

interface MainScrollState {
  /** Ref al <main> que hace scroll (null hasta que MainLayout lo registre) */
  mainScrollRef: RefObject<HTMLElement | null> | null;
  /** Registrar la ref del main (llamado por MainLayout) */
  setMainScrollRef: (ref: RefObject<HTMLElement | null>) => void;
}

export const useMainScrollStore = create<MainScrollState>((set) => ({
  mainScrollRef: null,
  setMainScrollRef: (ref) => set({ mainScrollRef: ref }),
}));

export default useMainScrollStore;