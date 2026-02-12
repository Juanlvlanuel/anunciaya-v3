/**
 * useSearchStore.ts
 * ==================
 * Store global de búsqueda para filtrar contenido según la sección activa.
 *
 * COMPORTAMIENTO:
 * - El MobileHeader escribe el `query` cuando el usuario teclea
 * - Cada página (PaginaNegocios, PaginaOfertas, etc.) lee el `query` y filtra
 * - La sección activa se detecta automáticamente según la ruta
 * - Al cerrar el buscador, se limpia el query
 *
 * UBICACIÓN: apps/web/src/stores/useSearchStore.ts
 */

import { create } from 'zustand';

// =============================================================================
// TIPOS
// =============================================================================

export type SeccionBusqueda = 'negocios' | 'marketplace' | 'ofertas' | 'dinamicas' | 'empleos' | 'general';

interface SearchState {
  /** Texto de búsqueda actual */
  query: string;
  /** Si el buscador inline está abierto en el header */
  buscadorAbierto: boolean;

  /** Actualizar el texto de búsqueda */
  setQuery: (query: string) => void;
  /** Abrir el buscador inline */
  abrirBuscador: () => void;
  /** Cerrar el buscador y limpiar query */
  cerrarBuscador: () => void;
}

// =============================================================================
// HELPER: Detectar sección según pathname
// =============================================================================

export function detectarSeccion(pathname: string): SeccionBusqueda {
  if (pathname.startsWith('/negocios')) return 'negocios';
  if (pathname.startsWith('/marketplace')) return 'marketplace';
  if (pathname.startsWith('/ofertas')) return 'ofertas';
  if (pathname.startsWith('/dinamicas')) return 'dinamicas';
  if (pathname.startsWith('/empleos')) return 'empleos';
  return 'general';
}

/** Placeholder dinámico según la sección */
export function placeholderSeccion(seccion: SeccionBusqueda): string {
  switch (seccion) {
    case 'negocios': return 'Buscar negocios...';
    case 'marketplace': return 'Buscar en MarketPlace...';
    case 'ofertas': return 'Buscar ofertas...';
    case 'dinamicas': return 'Buscar dinámicas...';
    case 'empleos': return 'Buscar empleos...';
    default: return 'Buscar...';
  }
}

// =============================================================================
// STORE
// =============================================================================

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  buscadorAbierto: false,

  setQuery: (query) => set({ query }),

  abrirBuscador: () => set({ buscadorAbierto: true }),

  cerrarBuscador: () => set({ buscadorAbierto: false, query: '' }),
}));

export default useSearchStore;