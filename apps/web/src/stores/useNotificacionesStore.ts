/**
 * useNotificacionesStore.ts
 * ==========================
 * Store de Zustand para manejo de notificaciones en tiempo real.
 *
 * ¿Qué hace este archivo?
 * - Carga notificaciones desde la API al iniciar sesión
 * - Escucha nuevas notificaciones vía Socket.io
 * - Controla el panel de notificaciones (abierto/cerrado)
 * - Marca notificaciones como leídas (individual y masivo)
 * - Filtra por modo activo (personal/comercial)
 * - Paginación con "Cargar más"
 *
 * Ubicación: apps/web/src/stores/useNotificacionesStore.ts
 */

import { create } from 'zustand';
import { escucharEvento } from '../services/socketService';
import {
  getNotificaciones,
  getConteoNoLeidas,
  marcarLeida as marcarLeidaAPI,
  marcarTodasLeidas as marcarTodasLeidasAPI,
  eliminarNotificacion as eliminarNotificacionAPI,
  obtenerSucursalIdParaFiltro,
} from '../services/notificacionesService';
import type {
  Notificacion,
  ModoNotificacion,
} from '../types/notificaciones';

// =============================================================================
// CONSTANTES
// =============================================================================

const NOTIFICACIONES_POR_PAGINA = 15;

// =============================================================================
// TIPOS DEL STORE
// =============================================================================

interface NotificacionesState {
  // Estado
  notificaciones: Notificacion[];
  totalNoLeidas: number;
  panelAbierto: boolean;
  cargando: boolean;
  cargandoMas: boolean;
  hayMas: boolean;
  modoActual: ModoNotificacion;

  // Acciones - Carga
  cargarNotificaciones: (modo: ModoNotificacion) => Promise<void>;
  cargarMas: () => Promise<void>;
  cargarConteoNoLeidas: (modo: ModoNotificacion) => Promise<void>;

  // Acciones - Panel
  abrirPanel: () => void;
  cerrarPanel: () => void;
  togglePanel: () => void;

  // Acciones - Notificaciones
  agregarNotificacion: (notificacion: Notificacion) => void;
  marcarLeidaPorId: (id: string) => void;
  marcarTodasLeidas: () => void;
  eliminarPorId: (id: string) => void;
  eliminarVariasPorIds: (ids: string[]) => void;

  // Acciones - Modo
  cambiarModo: (modo: ModoNotificacion) => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useNotificacionesStore = create<NotificacionesState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------
  notificaciones: [],
  totalNoLeidas: 0,
  panelAbierto: false,
  cargando: false,
  cargandoMas: false,
  hayMas: false,
  modoActual: 'personal',

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar notificaciones desde la API (primera página)
  // ---------------------------------------------------------------------------
  cargarNotificaciones: async (modo: ModoNotificacion) => {
    set({ cargando: true, modoActual: modo });

    try {
      const respuesta = await getNotificaciones(modo, NOTIFICACIONES_POR_PAGINA, 0);

      if (respuesta.success && respuesta.data) {
        set({
          notificaciones: respuesta.data.notificaciones,
          totalNoLeidas: respuesta.data.totalNoLeidas,
          hayMas: respuesta.data.notificaciones.length >= NOTIFICACIONES_POR_PAGINA,
          cargando: false,
        });
      } else {
        set({ cargando: false });
      }
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
      set({ cargando: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar más notificaciones (siguiente página)
  // ---------------------------------------------------------------------------
  cargarMas: async () => {
    const { modoActual, notificaciones, cargandoMas, hayMas } = get();

    if (cargandoMas || !hayMas) return;

    set({ cargandoMas: true });

    try {
      const offset = notificaciones.length;
      const respuesta = await getNotificaciones(modoActual, NOTIFICACIONES_POR_PAGINA, offset);

      if (respuesta.success && respuesta.data) {
        const nuevas = respuesta.data.notificaciones;
        set({
          notificaciones: [...notificaciones, ...nuevas],
          hayMas: nuevas.length >= NOTIFICACIONES_POR_PAGINA,
          cargandoMas: false,
        });
      } else {
        set({ cargandoMas: false });
      }
    } catch (error) {
      console.error('Error cargando más notificaciones:', error);
      set({ cargandoMas: false });
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar solo el conteo de no leídas (para badge)
  // ---------------------------------------------------------------------------
  cargarConteoNoLeidas: async (modo: ModoNotificacion) => {
    try {
      const respuesta = await getConteoNoLeidas(modo);

      if (respuesta.success && respuesta.data !== undefined) {
        set({ totalNoLeidas: respuesta.data });
      }
    } catch (error) {
      console.error('Error cargando conteo no leídas:', error);
    }
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Panel
  // ---------------------------------------------------------------------------
  abrirPanel: () => set({ panelAbierto: true }),
  cerrarPanel: () => set({ panelAbierto: false }),
  togglePanel: () => set((state) => ({ panelAbierto: !state.panelAbierto })),

  // ---------------------------------------------------------------------------
  // ACCIÓN: Agregar notificación en tiempo real (desde Socket.io)
  // ---------------------------------------------------------------------------
  agregarNotificacion: (notificacion: Notificacion) => {
    const { modoActual } = get();

    // Solo agregar si coincide con el modo activo
    if (notificacion.modo !== modoActual) return;

    // En modo comercial, filtrar por la sucursal del contexto actual:
    // - Si el dueño está en BS con Sucursal Norte activa, no debe ver notificaciones de Matriz
    // - Si está fuera de BS, solo notificaciones de Matriz
    // - Las notificaciones con sucursal_id IS NULL (generales del negocio) siempre pasan
    if (modoActual === 'comercial') {
      const sucursalIdContexto = obtenerSucursalIdParaFiltro();
      const sucursalIdNotif = notificacion.sucursalId;
      // sucursalId IS NULL del backend → notificación general del negocio, pasa siempre
      if (sucursalIdNotif && sucursalIdContexto && sucursalIdNotif !== sucursalIdContexto) {
        return;
      }
    }

    set((state) => ({
      notificaciones: [notificacion, ...state.notificaciones],
      totalNoLeidas: state.totalNoLeidas + 1,
    }));
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Marcar una notificación como leída
  // ---------------------------------------------------------------------------
  marcarLeidaPorId: (id: string) => {
    // Optimista: actualizar UI inmediatamente
    set((state) => {
      const notificacion = state.notificaciones.find((n) => n.id === id);
      const eraNoLeida = notificacion && !notificacion.leida;

      return {
        notificaciones: state.notificaciones.map((n) =>
          n.id === id ? { ...n, leida: true, leidaAt: new Date().toISOString() } : n
        ),
        totalNoLeidas: eraNoLeida
          ? Math.max(0, state.totalNoLeidas - 1)
          : state.totalNoLeidas,
      };
    });

    // Sincronizar con backend (sin esperar)
    marcarLeidaAPI(id).catch((error) => {
      console.error('Error marcando notificación como leída:', error);
    });
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Marcar todas como leídas
  // ---------------------------------------------------------------------------
  marcarTodasLeidas: () => {
    const { modoActual } = get();

    // Optimista: actualizar UI inmediatamente
    set((state) => ({
      notificaciones: state.notificaciones.map((n) => ({
        ...n,
        leida: true,
        leidaAt: n.leidaAt || new Date().toISOString(),
      })),
      totalNoLeidas: 0,
    }));

    // Sincronizar con backend (sin esperar)
    marcarTodasLeidasAPI(modoActual).catch((error) => {
      console.error('Error marcando todas como leídas:', error);
    });
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Eliminar una notificación
  // ---------------------------------------------------------------------------
  eliminarPorId: (id: string) => {
    // Optimista: eliminar de UI inmediatamente
    set((state) => {
      const notificacion = state.notificaciones.find((n) => n.id === id);
      const eraNoLeida = notificacion && !notificacion.leida;

      return {
        notificaciones: state.notificaciones.filter((n) => n.id !== id),
        totalNoLeidas: eraNoLeida
          ? Math.max(0, state.totalNoLeidas - 1)
          : state.totalNoLeidas,
      };
    });

    // Sincronizar con backend (sin esperar)
    eliminarNotificacionAPI(id).catch((error) => {
      console.error('Error eliminando notificación:', error);
    });
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Eliminar varias notificaciones en lote (desde socket del backend)
  // ---------------------------------------------------------------------------
  // Se usa cuando el backend cierra un ciclo (voucher entregado, expirado,
  // cancelado) y emite `notificacion:eliminada` con los IDs afectados. Permite
  // actualizar el panel sin recargar y sin fetch.
  eliminarVariasPorIds: (ids: string[]) => {
    if (ids.length === 0) return;
    const idsSet = new Set(ids);
    set((state) => {
      const noLeidasEliminadas = state.notificaciones.filter(
        (n) => idsSet.has(n.id) && !n.leida
      ).length;
      return {
        notificaciones: state.notificaciones.filter((n) => !idsSet.has(n.id)),
        totalNoLeidas: Math.max(0, state.totalNoLeidas - noLeidasEliminadas),
      };
    });
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cambiar modo (recarga notificaciones)
  // ---------------------------------------------------------------------------
  cambiarModo: (modo: ModoNotificacion) => {
    set({ modoActual: modo });
    get().cargarNotificaciones(modo);
  },
}));

// =============================================================================
// LISTENER: Notificaciones en tiempo real vía Socket.io
// =============================================================================

let listenerRegistrado = false;

export function registrarListenerNotificaciones(): void {
  if (listenerRegistrado) return;
  listenerRegistrado = true;

  escucharEvento<Notificacion>(
    'notificacion:nueva',
    (notificacion) => {
      useNotificacionesStore.getState().agregarNotificacion(notificacion);
    }
  );

  escucharEvento('notificacion:recargar', () => {
    useNotificacionesStore.getState().cargarNotificaciones('personal');
  });

  // Backend emite este evento cuando borra notificaciones (voucher entregado,
  // voucher expirado, voucher cancelado). El panel las filtra localmente sin
  // necesidad de recargar.
  escucharEvento<{ ids: string[] }>('notificacion:eliminada', (payload) => {
    if (!payload?.ids?.length) return;
    useNotificacionesStore.getState().eliminarVariasPorIds(payload.ids);
  });
}

export default useNotificacionesStore;
