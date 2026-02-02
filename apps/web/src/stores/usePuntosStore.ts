/**
 * usePuntosStore.ts
 * =================
 * Store de Zustand para el módulo Puntos de Business Studio.
 *
 * UBICACIÓN: apps/web/src/stores/usePuntosStore.ts
 *
 * RESPONSABILIDADES:
 *   - Configuración del sistema de puntos (global por negocio)
 *   - CRUD de recompensas (globales por negocio)
 *   - Estadísticas KPIs (filtradas por sucursal automáticamente)
 *
 * SUCURSALES:
 *   - Configuración y Recompensas son GLOBALES → NO se recargan al cambiar sucursal
 *   - Estadísticas SÍ se filtran por sucursal → el interceptor lo maneja
 *   - setPeriodo solo recarga Estadísticas
 *
 * OPTIMISTIC UI:
 *   - actualizarConfiguracion: aplica cambio inmediatamente, rollback si falla
 *   - CRUD recompensas: mutar array en memoria, rollback si falla
 */

import { create } from 'zustand';
import * as puntosService from '../services/puntosService';
import type {
  ConfigPuntosCompleta,
  ActualizarConfigPuntosInput,
  Recompensa,
  CrearRecompensaInput,
  ActualizarRecompensaInput,
  EstadisticasPuntos,
  PeriodoEstadisticas,
} from '../types/puntos';

// =============================================================================
// TIPOS
// =============================================================================

interface PuntosState {
  // Periodo (afecta solo Estadísticas)
  periodo: PeriodoEstadisticas;

  // Datos
  configuracion: ConfigPuntosCompleta | null;
  recompensas: Recompensa[];
  estadisticas: EstadisticasPuntos | null;

  // Estados de carga
  cargandoConfiguracion: boolean;
  cargandoRecompensas: boolean;
  cargandoEstadisticas: boolean;
  guardandoConfiguracion: boolean;

  // Error global
  error: string | null;

  // Acciones - Periodo
  setPeriodo: (periodo: PeriodoEstadisticas) => void;

  // Acciones - Configuración
  cargarConfiguracion: () => Promise<void>;
  actualizarConfiguracion: (datos: ActualizarConfigPuntosInput) => Promise<void>;

  // Acciones - Recompensas
  cargarRecompensas: (soloActivas?: boolean) => Promise<void>;
  crearRecompensa: (datos: CrearRecompensaInput) => Promise<Recompensa | null>;
  actualizarRecompensa: (id: string, datos: ActualizarRecompensaInput) => Promise<boolean>;
  eliminarRecompensa: (id: string) => Promise<boolean>;

  // Acciones - Estadísticas
  cargarEstadisticas: () => Promise<void>;

  // Carga inicial
  cargarTodo: () => Promise<void>;

  // Reset
  limpiar: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const usePuntosStore = create<PuntosState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------
  periodo: 'todo',
  configuracion: null,
  recompensas: [],
  estadisticas: null,
  cargandoConfiguracion: false,
  cargandoRecompensas: false,
  cargandoEstadisticas: false,
  guardandoConfiguracion: false,
  error: null,

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar periodo (solo recarga Estadísticas)
  // ---------------------------------------------------------------------------
  setPeriodo: (periodo: PeriodoEstadisticas) => {
    set({ periodo });
    get().cargarEstadisticas();
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar configuración
  // ---------------------------------------------------------------------------
  cargarConfiguracion: async () => {
    const { configuracion } = get();
    const esCargaInicial = configuracion === null;

    set({ cargandoConfiguracion: esCargaInicial, error: null });

    try {
      const respuesta = await puntosService.getConfiguracion();
      if (respuesta.success && respuesta.data) {
        set({ configuracion: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando configuración de puntos:', error);
      set({ error: 'Error al cargar configuración' });
    } finally {
      set({ cargandoConfiguracion: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Actualizar configuración (optimista)
  // ---------------------------------------------------------------------------
  actualizarConfiguracion: async (datos: ActualizarConfigPuntosInput) => {
    const { configuracion } = get();
    if (!configuracion) return;

    // Guardar estado anterior para rollback
    const configuracionAnterior = { ...configuracion };

    // Actualización optimista: aplicar cambios flat sobre la estructura anidada
    const configuracionOptimista: ConfigPuntosCompleta = {
      ...configuracion,
      puntosPorPeso: datos.puntosPorPeso ?? configuracion.puntosPorPeso,
      diasExpiracionPuntos: datos.diasExpiracionPuntos !== undefined
        ? datos.diasExpiracionPuntos
        : configuracion.diasExpiracionPuntos,
      diasExpiracionVoucher: datos.diasExpiracionVoucher ?? configuracion.diasExpiracionVoucher,
      nivelesActivos: datos.nivelesActivos ?? configuracion.nivelesActivos,
      nivelBronce: {
        ...configuracion.nivelBronce,
        ...(datos.nivelBronceMin !== undefined && { min: datos.nivelBronceMin }),
        ...(datos.nivelBronceMax !== undefined && { max: datos.nivelBronceMax }),
        ...(datos.nivelBronceMultiplicador !== undefined && { multiplicador: datos.nivelBronceMultiplicador }),
      },
      nivelPlata: {
        ...configuracion.nivelPlata,
        ...(datos.nivelPlataMin !== undefined && { min: datos.nivelPlataMin }),
        ...(datos.nivelPlataMax !== undefined && { max: datos.nivelPlataMax }),
        ...(datos.nivelPlataMultiplicador !== undefined && { multiplicador: datos.nivelPlataMultiplicador }),
      },
      nivelOro: {
        ...configuracion.nivelOro,
        ...(datos.nivelOroMin !== undefined && { min: datos.nivelOroMin }),
        ...(datos.nivelOroMultiplicador !== undefined && { multiplicador: datos.nivelOroMultiplicador }),
      },
    };

    set({ configuracion: configuracionOptimista, guardandoConfiguracion: true });

    try {
      const respuesta = await puntosService.updateConfiguracion(datos);
      if (respuesta.success && respuesta.data) {
        // Usar respuesta del backend como source of truth
        set({ configuracion: respuesta.data });
      } else {
        // Backend retornó error con formato estándar → rollback
        set({ configuracion: configuracionAnterior });
      }
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      // Rollback
      set({ configuracion: configuracionAnterior });
    } finally {
      set({ guardandoConfiguracion: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar recompensas
  // ---------------------------------------------------------------------------
  cargarRecompensas: async (soloActivas?: boolean) => {
    const { recompensas } = get();
    const esCargaInicial = recompensas.length === 0;

    set({ cargandoRecompensas: esCargaInicial });

    try {
      const respuesta = await puntosService.getRecompensas(soloActivas);
      if (respuesta.success && respuesta.data) {
        set({ recompensas: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando recompensas:', error);
    } finally {
      set({ cargandoRecompensas: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Crear recompensa (optimista)
  // Retorna la recompensa creada para que el componente pueda cerrar el modal
  // ---------------------------------------------------------------------------
  crearRecompensa: async (datos: CrearRecompensaInput) => {
    const { recompensas } = get();

    // Crear item optimista con ID temporal
    const recompensaOptimista: Recompensa = {
      id: `temp_${Date.now()}`,
      negocioId: '',
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? null,
      imagenUrl: datos.imagenUrl ?? null,
      puntosRequeridos: datos.puntosRequeridos,
      stock: datos.stock ?? null,
      requiereAprobacion: datos.requiereAprobacion ?? false,
      activa: true,
      orden: recompensas.length,
      createdAt: null,
      updatedAt: null,
    };

    // Agregar al final del array inmediatamente
    set({ recompensas: [...recompensas, recompensaOptimista] });

    try {
      const respuesta = await puntosService.createRecompensa(datos);
      if (respuesta.success && respuesta.data) {
        // Reemplazar item temporal con dato real del backend
        set((state) => ({
          recompensas: state.recompensas.map((r) =>
            r.id === recompensaOptimista.id ? respuesta.data! : r
          ),
        }));
        return respuesta.data;
      } else {
        // Rollback: remover item temporal
        set({ recompensas });
        return null;
      }
    } catch (error) {
      console.error('Error creando recompensa:', error);
      // Rollback
      set({ recompensas });
      return null;
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Actualizar recompensa (optimista)
  // ---------------------------------------------------------------------------
  actualizarRecompensa: async (id: string, datos: ActualizarRecompensaInput) => {
    const { recompensas } = get();

    // Guardar array anterior para rollback
    const recompensasAnterior = [...recompensas];

    // Actualización optimista: mutar el item en el array
    set({
      recompensas: recompensas.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          ...(datos.nombre !== undefined && { nombre: datos.nombre }),
          ...(datos.descripcion !== undefined && { descripcion: datos.descripcion }),
          ...(datos.imagenUrl !== undefined && { imagenUrl: datos.imagenUrl }),
          ...(datos.eliminarImagen && { imagenUrl: null }),
          ...(datos.puntosRequeridos !== undefined && { puntosRequeridos: datos.puntosRequeridos }),
          ...(datos.stock !== undefined && { stock: datos.stock }),
          ...(datos.requiereAprobacion !== undefined && { requiereAprobacion: datos.requiereAprobacion }),
          ...(datos.activa !== undefined && { activa: datos.activa }),
        };
      }),
    });

    try {
      const respuesta = await puntosService.updateRecompensa(id, datos);
      if (respuesta.success && respuesta.data) {
        // Reemplazar con dato real del backend
        set((state) => ({
          recompensas: state.recompensas.map((r) =>
            r.id === id ? respuesta.data! : r
          ),
        }));
        return true;
      } else {
        // Rollback
        set({ recompensas: recompensasAnterior });
        return false;
      }
    } catch (error) {
      console.error('Error actualizando recompensa:', error);
      // Rollback
      set({ recompensas: recompensasAnterior });
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Eliminar recompensa (optimista)
  // ---------------------------------------------------------------------------
  eliminarRecompensa: async (id: string) => {
    const { recompensas } = get();

    // Guardar array anterior para rollback
    const recompensasAnterior = [...recompensas];

    // Eliminar inmediatamente del array
    set({
      recompensas: recompensas.filter((r) => r.id !== id),
    });

    try {
      const respuesta = await puntosService.deleteRecompensa(id);
      if (respuesta.success) {
        return true;
      } else {
        // Rollback
        set({ recompensas: recompensasAnterior });
        return false;
      }
    } catch (error) {
      console.error('Error eliminando recompensa:', error);
      // Rollback
      set({ recompensas: recompensasAnterior });
      return false;
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar estadísticas
  // ---------------------------------------------------------------------------
  cargarEstadisticas: async () => {
    const { periodo, estadisticas } = get();
    const esCargaInicial = estadisticas === null;

    set({ cargandoEstadisticas: esCargaInicial });

    try {
      const respuesta = await puntosService.getEstadisticas(periodo);
      if (respuesta.success && respuesta.data) {
        set({ estadisticas: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      set({ cargandoEstadisticas: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Carga inicial (paralelo)
  // ---------------------------------------------------------------------------
  cargarTodo: async () => {
    await Promise.all([
      get().cargarConfiguracion(),
      get().cargarRecompensas(),
      get().cargarEstadisticas(),
    ]);
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Reset
  // ---------------------------------------------------------------------------
  limpiar: () => {
    set({
      periodo: 'todo',
      configuracion: null,
      recompensas: [],
      estadisticas: null,
      cargandoConfiguracion: false,
      cargandoRecompensas: false,
      cargandoEstadisticas: false,
      guardandoConfiguracion: false,
      error: null,
    });
  },
}));

// =============================================================================
// SELECTORES
// =============================================================================

export const selectConfiguracion = (state: PuntosState) => state.configuracion;
export const selectRecompensas = (state: PuntosState) => state.recompensas;
export const selectEstadisticas = (state: PuntosState) => state.estadisticas;
export const selectPeriodoPuntos = (state: PuntosState) => state.periodo;
export const selectCargandoPuntos = (state: PuntosState) =>
  state.cargandoConfiguracion || state.cargandoRecompensas || state.cargandoEstadisticas;