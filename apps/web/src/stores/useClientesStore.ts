/**
 * useClientesStore.ts
 * ===================
 * Store de Zustand para el módulo Clientes de Business Studio.
 *
 * UBICACIÓN: apps/web/src/stores/useClientesStore.ts
 *
 * RESPONSABILIDADES:
 *   - Top clientes por puntos disponibles (Dashboard)
 *   - KPIs de la página Clientes
 *   - Lista de clientes con filtros y paginación
 *   - Detalle de un cliente (modal)
 *   - Historial de transacciones de un cliente (modal)
 *
 * SUCURSALES:
 *   - Filtrado automáticamente por sucursal (interceptor)
 *   - Dueños: ven clientes de todas las sucursales (o filtran por la seleccionada)
 *   - Gerentes: solo ven clientes de su sucursal (forzado en backend)
 *
 * PAGINACIÓN:
 *   - Offset-based con limit fijo (20)
 *   - hayMas se detecta si la respuesta tiene exactamente limit elementos
 *   - cargarMas() appenda al array existente
 *
 * CACHÉ:
 *   - Primera visita → carga desde backend
 *   - Volver a página → muestra store instantáneamente
 *   - Cambio de sucursal → recarga desde cero (manejado externamente)
 */

import { create } from 'zustand';
import * as clientesService from '../services/clientesService';
import type { ClienteConPuntos, TransaccionPuntos } from '../types/puntos';
import type { KPIsClientes, ClienteCompleto, ClienteDetalle, NivelCardYA } from '../types/clientes';

// =============================================================================
// CONSTANTES
// =============================================================================

const LIMIT_PAGINA = 20;

// =============================================================================
// TIPOS
// =============================================================================

interface ClientesState {
  // Top clientes (Dashboard)
  topClientes: ClienteConPuntos[];
  cargandoTop: boolean;

  // KPIs
  kpis: KPIsClientes | null;
  cargandoKpis: boolean;

  // Lista de clientes (tabla)
  clientes: ClienteCompleto[];
  cargandoClientes: boolean;
  cargandoMas: boolean;
  offset: number;
  hayMas: boolean;

  // Filtros
  busqueda: string;
  nivelFiltro: NivelCardYA | null;

  // Detalle (modal)
  clienteDetalle: ClienteDetalle | null;
  cargandoDetalle: boolean;

  // Historial del cliente (modal)
  historialCliente: TransaccionPuntos[];
  cargandoHistorial: boolean;
  offsetHistorial: number;
  hayMasHistorial: boolean;

  // Carga inicial (solo la primera vez)
  cargaInicialCompleta: boolean;

  // Error
  error: string | null;

  // Acciones - Top
  cargarTopClientes: (limit?: number) => Promise<void>;

  // Acciones - KPIs
  cargarKPIs: () => Promise<void>;

  // Acciones - Lista
  cargarClientes: () => Promise<void>;
  cargarMas: () => Promise<void>;
  setBusqueda: (busqueda: string) => void;
  setNivelFiltro: (nivel: NivelCardYA | null) => void;

  // Acciones - Detalle
  cargarDetalleCliente: (id: string) => Promise<void>;
  cargarHistorialCliente: (id: string) => Promise<void>;
  cargarMasHistorial: (id: string) => Promise<void>;
  limpiarDetalle: () => void;

  // Reset
  limpiar: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useClientesStore = create<ClientesState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------
  topClientes: [],
  cargandoTop: false,
  kpis: null,
  cargandoKpis: false,
  clientes: [],
  cargandoClientes: false,
  cargandoMas: false,
  offset: 0,
  hayMas: false,
  busqueda: '',
  nivelFiltro: null,
  clienteDetalle: null,
  cargandoDetalle: false,
  historialCliente: [],
  cargandoHistorial: false,
  offsetHistorial: 0,
  hayMasHistorial: false,
  cargaInicialCompleta: false,
  error: null,

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar top clientes (Dashboard)
  // ---------------------------------------------------------------------------
  cargarTopClientes: async (limit?: number) => {
    const { topClientes } = get();
    const esCargaInicial = topClientes.length === 0;

    set({ cargandoTop: esCargaInicial, error: null });

    try {
      const respuesta = await clientesService.getTopClientes(limit);
      if (respuesta.success && respuesta.data) {
        set({ topClientes: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando top clientes:', error);
      set({ error: 'Error al cargar clientes' });
    } finally {
      set({ cargandoTop: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar KPIs
  // ---------------------------------------------------------------------------
  cargarKPIs: async () => {
    const { kpis } = get();
    const esCargaInicial = kpis === null;

    set({ cargandoKpis: esCargaInicial, error: null });

    try {
      const respuesta = await clientesService.getKPIsClientes();
      if (respuesta.success && respuesta.data) {
        set({ kpis: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando KPIs clientes:', error);
    } finally {
      set({ cargandoKpis: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar lista de clientes (primera página)
  // ---------------------------------------------------------------------------
  cargarClientes: async () => {
    const { busqueda, nivelFiltro, cargaInicialCompleta } = get();
    const esCargaInicial = !cargaInicialCompleta;

    set({ cargandoClientes: esCargaInicial, error: null });

    try {
      const respuesta = await clientesService.getClientes(
        busqueda || undefined,
        nivelFiltro || undefined,
        LIMIT_PAGINA,
        0
      );
      if (respuesta.success && respuesta.data) {
        set({
          clientes: respuesta.data,
          offset: respuesta.data.length,
          hayMas: respuesta.data.length === LIMIT_PAGINA,
          cargaInicialCompleta: true,
        });
      }
    } catch (error) {
      console.error('Error cargando clientes:', error);
      set({ error: 'Error al cargar clientes' });
    } finally {
      set({ cargandoClientes: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar más clientes (paginación)
  // ---------------------------------------------------------------------------
  cargarMas: async () => {
    const { offset, hayMas, cargandoMas, busqueda, nivelFiltro } = get();

    if (!hayMas || cargandoMas) return;

    set({ cargandoMas: true });

    try {
      const respuesta = await clientesService.getClientes(
        busqueda || undefined,
        nivelFiltro || undefined,
        LIMIT_PAGINA,
        offset
      );
      if (respuesta.success && respuesta.data) {
        set((state) => ({
          clientes: [...state.clientes, ...respuesta.data!],
          offset: state.offset + respuesta.data!.length,
          hayMas: respuesta.data!.length === LIMIT_PAGINA,
        }));
      }
    } catch (error) {
      console.error('Error cargando más clientes:', error);
    } finally {
      set({ cargandoMas: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar búsqueda (resetea paginación y recarga)
  // ---------------------------------------------------------------------------
  setBusqueda: (busqueda: string) => {
    set({ busqueda, offset: 0, hayMas: false });
    get().cargarClientes();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar filtro de nivel (resetea paginación y recarga)
  // ---------------------------------------------------------------------------
  setNivelFiltro: (nivel: NivelCardYA | null) => {
    set({ nivelFiltro: nivel, offset: 0, hayMas: false });
    get().cargarClientes();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar detalle de un cliente (modal)
  // ---------------------------------------------------------------------------
  cargarDetalleCliente: async (id: string) => {
    set({ cargandoDetalle: true, clienteDetalle: null });

    try {
      const respuesta = await clientesService.getDetalleCliente(id);
      if (respuesta.success && respuesta.data) {
        set({ clienteDetalle: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando detalle cliente:', error);
    } finally {
      set({ cargandoDetalle: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar historial de un cliente (modal, primera página)
  // ---------------------------------------------------------------------------
  cargarHistorialCliente: async (id: string) => {
    set({ cargandoHistorial: true, historialCliente: [], offsetHistorial: 0 });

    try {
      const respuesta = await clientesService.getHistorialCliente(id, LIMIT_PAGINA, 0);
      if (respuesta.success && respuesta.data) {
        set({
          historialCliente: respuesta.data,
          offsetHistorial: respuesta.data.length,
          hayMasHistorial: respuesta.data.length === LIMIT_PAGINA,
        });
      }
    } catch (error) {
      console.error('Error cargando historial cliente:', error);
    } finally {
      set({ cargandoHistorial: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar más historial del cliente (paginación en modal)
  // ---------------------------------------------------------------------------
  cargarMasHistorial: async (id: string) => {
    const { offsetHistorial, hayMasHistorial, cargandoHistorial } = get();

    if (!hayMasHistorial || cargandoHistorial) return;

    set({ cargandoHistorial: true });

    try {
      const respuesta = await clientesService.getHistorialCliente(id, LIMIT_PAGINA, offsetHistorial);
      if (respuesta.success && respuesta.data) {
        set((state) => ({
          historialCliente: [...state.historialCliente, ...respuesta.data!],
          offsetHistorial: state.offsetHistorial + respuesta.data!.length,
          hayMasHistorial: respuesta.data!.length === LIMIT_PAGINA,
        }));
      }
    } catch (error) {
      console.error('Error cargando más historial:', error);
    } finally {
      set({ cargandoHistorial: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Limpiar detalle (al cerrar modal)
  // ---------------------------------------------------------------------------
  limpiarDetalle: () => {
    set({
      clienteDetalle: null,
      cargandoDetalle: false,
      historialCliente: [],
      cargandoHistorial: false,
      offsetHistorial: 0,
      hayMasHistorial: false,
    });
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Reset completo
  // ---------------------------------------------------------------------------
  limpiar: () => {
    set({
      topClientes: [],
      cargandoTop: false,
      kpis: null,
      cargandoKpis: false,
      clientes: [],
      cargandoClientes: false,
      cargandoMas: false,
      offset: 0,
      hayMas: false,
      busqueda: '',
      nivelFiltro: null,
      clienteDetalle: null,
      cargandoDetalle: false,
      historialCliente: [],
      cargandoHistorial: false,
      offsetHistorial: 0,
      hayMasHistorial: false,
      cargaInicialCompleta: false,
      error: null,
    });
  },
}));

// =============================================================================
// SELECTORES
// =============================================================================

export const selectTopClientes = (state: ClientesState) => state.topClientes;
export const selectCargandoTop = (state: ClientesState) => state.cargandoTop;
export const selectClientes = (state: ClientesState) => state.clientes;
export const selectCargandoClientes = (state: ClientesState) => state.cargandoClientes;
export const selectKPIsClientes = (state: ClientesState) => state.kpis;