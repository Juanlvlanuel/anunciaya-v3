/**
 * useFiltrosNegociosStore.ts
 * ===========================
 * Store de Zustand para estado de filtros de búsqueda de negocios.
 *
 * ¿Qué hace este archivo?
 * - Guarda el estado de todos los filtros de búsqueda
 * - Controla la vista activa (lista vs mapa)
 * - Calcula cuántos filtros están activos
 * - Proporciona funciones para modificar filtros
 *
 * Ubicación: apps/web/src/stores/useFiltrosNegociosStore.ts
 */

import { create } from 'zustand';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Estado del store
 */
interface FiltrosNegociosState {
  // ---------------------------------------------------------------------------
  // Estado - Filtros de categorización
  // ---------------------------------------------------------------------------
  categoria: number | null;      // ID de categoría seleccionada (null = todas)
  subcategorias: number[];       // Array de IDs de subcategorías seleccionadas

  // ---------------------------------------------------------------------------
  // Estado - Filtros de distancia
  // ---------------------------------------------------------------------------
  distancia: number;             // Radio en kilómetros (default: 5km)

  // ---------------------------------------------------------------------------
  // Estado - Filtros de servicios
  // ---------------------------------------------------------------------------
  metodosPago: string[];         // ['efectivo', 'tarjeta', 'transferencia', etc.]
  soloCardya: boolean;           // true = solo negocios que aceptan CardYA
  conEnvio: boolean;             // true = solo negocios con envío a domicilio

  // ---------------------------------------------------------------------------
  // Estado - Búsqueda por texto
  // ---------------------------------------------------------------------------
  busqueda: string;              // Texto libre para buscar por nombre

  // ---------------------------------------------------------------------------
  // Estado - Vista
  // ---------------------------------------------------------------------------
  vistaActiva: 'split' | 'lista' | 'mapa'; // Vista actual del usuario

  // ---------------------------------------------------------------------------
  // Acciones - Categorización
  // ---------------------------------------------------------------------------
  setCategoria: (id: number | null) => void;
  toggleSubcategoria: (id: number) => void;
  setSubcategorias: (ids: number[]) => void;

  // ---------------------------------------------------------------------------
  // Acciones - Distancia
  // ---------------------------------------------------------------------------
  setDistancia: (km: number) => void;

  // ---------------------------------------------------------------------------
  // Acciones - Servicios
  // ---------------------------------------------------------------------------
  toggleMetodoPago: (metodo: string) => void;
  setSoloCardya: (valor: boolean) => void;
  setConEnvio: (valor: boolean) => void;
  toggleSoloCardya: () => void;
  toggleConEnvio: () => void;

  // ---------------------------------------------------------------------------
  // Acciones - Búsqueda
  // ---------------------------------------------------------------------------
  setBusqueda: (texto: string) => void;

  // ---------------------------------------------------------------------------
  // Acciones - Vista
  // ---------------------------------------------------------------------------
  setVistaActiva: (vista: 'split' | 'lista' | 'mapa') => void;

  // ---------------------------------------------------------------------------
  // Acciones - Limpiar
  // ---------------------------------------------------------------------------
  limpiarFiltros: () => void;

  // ---------------------------------------------------------------------------
  // Computed (valores calculados)
  // ---------------------------------------------------------------------------
  filtrosActivos: () => number;
  tieneFiltros: () => boolean;
  hayFiltrosActivos: () => boolean;
}

// =============================================================================
// VALORES POR DEFECTO
// =============================================================================

const VALORES_INICIALES = {
  categoria: null,
  subcategorias: [],
  distancia: 5,              // 5 kilómetros por defecto
  metodosPago: [],
  soloCardya: false,
  conEnvio: false,
  busqueda: '',
  vistaActiva: 'split' as const,
};

// =============================================================================
// STORE
// =============================================================================

export const useFiltrosNegociosStore = create<FiltrosNegociosState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------
  ...VALORES_INICIALES,

  // ---------------------------------------------------------------------------
  // ACCIONES: Categorización
  // ---------------------------------------------------------------------------

  /**
   * Cambia la categoría seleccionada
   * Al cambiar categoría, limpia las subcategorías
   */
  setCategoria: (id) => {
    set({
      categoria: id,
      subcategorias: [], // Limpiar subcategorías al cambiar categoría
    });
  },

  /**
   * Agrega o quita una subcategoría del filtro
   * - Si ya estaba seleccionada → la quita
   * - Si no estaba → la agrega
   */
  toggleSubcategoria: (id) => {
    const { subcategorias } = get();

    if (subcategorias.includes(id)) {
      set({ subcategorias: subcategorias.filter((sub) => sub !== id) });
    } else {
      set({ subcategorias: [...subcategorias, id] });
    }
  },

  /**
   * Reemplaza todas las subcategorías seleccionadas
   */
  setSubcategorias: (ids) => {
    set({ subcategorias: ids });
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Distancia
  // ---------------------------------------------------------------------------

  /**
   * Cambia el radio de búsqueda en kilómetros
   */
  setDistancia: (km) => {
    set({ distancia: km });
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Servicios
  // ---------------------------------------------------------------------------

  /**
   * Agrega o quita un método de pago del filtro
   * - Si ya estaba → lo quita
   * - Si no estaba → lo agrega
   */
  toggleMetodoPago: (metodo) => {
    const { metodosPago } = get();

    if (metodosPago.includes(metodo)) {
      // Ya existe → quitarlo
      set({ metodosPago: metodosPago.filter((m) => m !== metodo) });
    } else {
      // No existe → agregarlo
      set({ metodosPago: [...metodosPago, metodo] });
    }
  },

  /**
   * Activa/desactiva el filtro de solo negocios CardYA
   */
  setSoloCardya: (valor) => {
    set({ soloCardya: valor });
  },

  /**
   * Toggle del filtro CardYA (alterna entre true/false)
   */
  toggleSoloCardya: () => {
    set({ soloCardya: !get().soloCardya });
  },

  /**
   * Activa/desactiva el filtro de solo negocios con envío
   */
  setConEnvio: (valor) => {
    set({ conEnvio: valor });
  },

  /**
   * Toggle del filtro envío (alterna entre true/false)
   */
  toggleConEnvio: () => {
    set({ conEnvio: !get().conEnvio });
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Búsqueda
  // ---------------------------------------------------------------------------

  /**
   * Actualiza el texto de búsqueda
   */
  setBusqueda: (texto) => {
    set({ busqueda: texto });
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Vista
  // ---------------------------------------------------------------------------

  /**
   * Cambia entre vista de lista y vista de mapa
   */
  setVistaActiva: (vista) => {
    set({ vistaActiva: vista });
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Limpiar
  // ---------------------------------------------------------------------------

  /**
   * Resetea TODOS los filtros a sus valores por defecto
   */
  limpiarFiltros: () => {
    set(VALORES_INICIALES);
  },

  // ---------------------------------------------------------------------------
  // COMPUTED: Valores calculados
  // ---------------------------------------------------------------------------

  /**
   * Cuenta cuántos filtros están aplicados actualmente
   * Se usa para mostrar un badge tipo "Filtros (3)" en el botón
   */
  filtrosActivos: () => {
    const state = get();
    let count = 0;

    // Categoría
    if (state.categoria !== null) count++;

    // Subcategorías
    count += state.subcategorias.length;

    // Distancia diferente del default (5km)
    if (state.distancia !== 5) count++;

    // Métodos de pago
    count += state.metodosPago.length;

    // Solo CardYA
    if (state.soloCardya) count++;

    // Con envío
    if (state.conEnvio) count++;

    // Búsqueda
    if (state.busqueda.trim() !== '') count++;

    return count;
  },

  /**
   * Indica si hay algún filtro activo
   * Se usa para mostrar/ocultar el botón "Limpiar filtros"
   */
  tieneFiltros: () => {
    return get().filtrosActivos() > 0;
  },

  /**
   * Alias de tieneFiltros() para mejor semántica
   */
  hayFiltrosActivos: () => {
    return get().filtrosActivos() > 0;
  },
}));

export default useFiltrosNegociosStore;