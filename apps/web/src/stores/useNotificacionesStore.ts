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
 *
 * ¿Para qué se usa?
 * - Badge de notificaciones en Navbar (desktop)
 * - Badge de notificaciones en MobileHeader (móvil)
 * - Panel de notificaciones (dropdown/overlay)
 * - Página dedicada de notificaciones (/notificaciones)
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
} from '../services/notificacionesService';
import type {
  Notificacion,
  ModoNotificacion,
} from '../types/notificaciones';

// =============================================================================
// TIPOS DEL STORE
// =============================================================================

interface NotificacionesState {
  // Estado
  notificaciones: Notificacion[];
  totalNoLeidas: number;
  panelAbierto: boolean;
  cargando: boolean;
  modoActual: ModoNotificacion;

  // Acciones - Carga
  cargarNotificaciones: (modo: ModoNotificacion) => Promise<void>;
  cargarConteoNoLeidas: (modo: ModoNotificacion) => Promise<void>;

  // Acciones - Panel
  abrirPanel: () => void;
  cerrarPanel: () => void;
  togglePanel: () => void;

  // Acciones - Notificaciones
  agregarNotificacion: (notificacion: Notificacion) => void;
  marcarLeidaPorId: (id: string) => void;
  marcarTodasLeidas: () => void;

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
  modoActual: 'personal',

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cargar notificaciones desde la API
  // ---------------------------------------------------------------------------
  cargarNotificaciones: async (modo: ModoNotificacion) => {
    set({ cargando: true, modoActual: modo });

    try {
      const respuesta = await getNotificaciones(modo, 10);

      if (respuesta.success && respuesta.data) {
        set({
          notificaciones: respuesta.data.notificaciones,
          totalNoLeidas: respuesta.data.totalNoLeidas,
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
}

export default useNotificacionesStore;