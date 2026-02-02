/**
 * useClientesStore.ts
 * ===================
 * Store de Zustand para el módulo Clientes de Business Studio.
 *
 * UBICACIÓN: apps/web/src/stores/useClientesStore.ts
 *
 * RESPONSABILIDADES:
 *   - Top clientes por puntos disponibles
 *
 * SUCURSALES:
 *   - Filtrado automáticamente por sucursal (interceptor)
 *   - Dueños: ven clientes de todas las sucursales (o filtran por la seleccionada)
 *   - Gerentes: solo ven clientes de su sucursal (forzado en backend)
 */

import { create } from 'zustand';
import * as clientesService from '../services/clientesService';
import type { ClienteConPuntos } from '../types/puntos';

// =============================================================================
// TIPOS
// =============================================================================

interface ClientesState {
  // Datos
  clientes: ClienteConPuntos[];

  // Estado de carga
  cargandoClientes: boolean;

  // Error
  error: string | null;

  // Acciones
  cargarClientes: (limit?: number) => Promise<void>;

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
  clientes: [],
  cargandoClientes: false,
  error: null,

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar top clientes
  // ---------------------------------------------------------------------------
  cargarClientes: async (limit?: number) => {
    const { clientes } = get();
    const esCargaInicial = clientes.length === 0;

    set({ cargandoClientes: esCargaInicial, error: null });

    try {
      const respuesta = await clientesService.getTopClientes(limit);
      if (respuesta.success && respuesta.data) {
        set({ clientes: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando top clientes:', error);
      set({ error: 'Error al cargar clientes' });
    } finally {
      set({ cargandoClientes: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Reset
  // ---------------------------------------------------------------------------
  limpiar: () => {
    set({
      clientes: [],
      cargandoClientes: false,
      error: null,
    });
  },
}));

// =============================================================================
// SELECTORES
// =============================================================================

export const selectClientes = (state: ClientesState) => state.clientes;
export const selectCargandoClientes = (state: ClientesState) => state.cargandoClientes;