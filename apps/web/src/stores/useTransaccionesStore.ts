/**
 * useTransaccionesStore.ts
 * ========================
 * Store de Zustand para el módulo Transacciones de Business Studio.
 *
 * UBICACIÓN: apps/web/src/stores/useTransaccionesStore.ts
 *
 * RESPONSABILIDADES:
 *   - Historial de transacciones con paginación infinita
 *   - Revocar transacciones (devuelve puntos al cliente)
 *
 * SUCURSALES:
 *   - Todo el historial se filtra por sucursal automáticamente (interceptor)
 *   - Gerentes solo ven su sucursal (forzado en backend)
 *
 * PAGINACIÓN:
 *   - Offset-based con limit fijo (50)
 *   - hayMas se detecta si la respuesta tiene exactamente limit elementos
 *   - cargarMas() appenda al array existente
 *   - Cambiar periodo resetea offset a 0 y reemplaza el array
 *
 * OPTIMISTIC UI:
 *   - revocarTransaccion: cambia estado a 'cancelada' inmediatamente, rollback si falla
 */

import { create } from 'zustand';
import * as transaccionesService from '../services/transaccionesService';
import type {
  TransaccionPuntos,
  PeriodoEstadisticas,
} from '../types/puntos';

// =============================================================================
// CONSTANTES
// =============================================================================

const LIMIT_PAGINA = 50;

// =============================================================================
// TIPOS
// =============================================================================

interface TransaccionesState {
  // Periodo y paginación
  periodo: PeriodoEstadisticas;
  offset: number;
  hayMas: boolean;

  // Datos
  historial: TransaccionPuntos[];

  // Estados de carga
  cargandoHistorial: boolean;
  cargandoMas: boolean;

  // Error
  error: string | null;

  // Acciones
  setPeriodo: (periodo: PeriodoEstadisticas) => void;
  cargarHistorial: () => Promise<void>;
  cargarMas: () => Promise<void>;
  revocarTransaccion: (id: string) => Promise<boolean>;

  // Reset
  limpiar: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useTransaccionesStore = create<TransaccionesState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------
  periodo: 'todo',
  offset: 0,
  hayMas: false,
  historial: [],
  cargandoHistorial: false,
  cargandoMas: false,
  error: null,

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar periodo (resetea paginación y recarga desde el inicio)
  // ---------------------------------------------------------------------------
  setPeriodo: (periodo: PeriodoEstadisticas) => {
    set({ periodo, offset: 0, hayMas: false });
    get().cargarHistorial();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar historial (primera página o recarga completa)
  // ---------------------------------------------------------------------------
  cargarHistorial: async () => {
    const { periodo, historial } = get();
    const esCargaInicial = historial.length === 0;

    set({ cargandoHistorial: esCargaInicial, error: null });

    try {
      const respuesta = await transaccionesService.getHistorial(periodo, LIMIT_PAGINA, 0);
      if (respuesta.success && respuesta.data) {
        set({
          historial: respuesta.data,
          offset: respuesta.data.length,
          hayMas: respuesta.data.length === LIMIT_PAGINA,
        });
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      set({ error: 'Error al cargar historial' });
    } finally {
      set({ cargandoHistorial: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar más (siguiente página, append al array)
  // ---------------------------------------------------------------------------
  cargarMas: async () => {
    const { periodo, offset, hayMas, cargandoMas } = get();

    // Evitar peticiones duplicadas o si no hay más datos
    if (!hayMas || cargandoMas) return;

    set({ cargandoMas: true });

    try {
      const respuesta = await transaccionesService.getHistorial(periodo, LIMIT_PAGINA, offset);
      if (respuesta.success && respuesta.data) {
        set((state) => ({
          historial: [...state.historial, ...respuesta.data!],
          offset: state.offset + respuesta.data!.length,
          hayMas: respuesta.data!.length === LIMIT_PAGINA,
        }));
      }
    } catch (error) {
      console.error('Error cargando más transacciones:', error);
    } finally {
      set({ cargandoMas: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Revocar transacción (optimista)
  // ---------------------------------------------------------------------------
  revocarTransaccion: async (id: string) => {
    const { historial } = get();

    // Guardar array anterior para rollback
    const historialAnterior = [...historial];

    // Actualización optimista: cambiar estado a 'cancelada'
    set({
      historial: historial.map((t) =>
        t.id === id ? { ...t, estado: 'cancelado' as const } : t
      ),
    });

    try {
      const respuesta = await transaccionesService.revocarTransaccion(id);
      if (respuesta.success) {
        return true;
      } else {
        // Rollback
        set({ historial: historialAnterior });
        return false;
      }
    } catch (error) {
      console.error('Error revocando transacción:', error);
      // Rollback
      set({ historial: historialAnterior });
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Reset
  // ---------------------------------------------------------------------------
  limpiar: () => {
    set({
      periodo: 'todo',
      offset: 0,
      hayMas: false,
      historial: [],
      cargandoHistorial: false,
      cargandoMas: false,
      error: null,
    });
  },
}));

// =============================================================================
// SELECTORES
// =============================================================================

export const selectHistorial = (state: TransaccionesState) => state.historial;
export const selectHayMas = (state: TransaccionesState) => state.hayMas;
export const selectPeriodoTransacciones = (state: TransaccionesState) => state.periodo;
export const selectCargandoTransacciones = (state: TransaccionesState) =>
  state.cargandoHistorial || state.cargandoMas;