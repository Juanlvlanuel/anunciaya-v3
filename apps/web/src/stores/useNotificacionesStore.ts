/**
 * useNotificacionesStore.ts
 * ==========================
 * Store de Zustand para manejo de notificaciones.
 *
 * ¿Qué hace este archivo?
 * - Controla el panel de notificaciones (abierto/cerrado)
 * - Almacena el listado de notificaciones (mock data por ahora)
 * - Calcula la cantidad de notificaciones no leídas
 * - Marca notificaciones como leídas
 *
 * ¿Para qué se usa?
 * - Badge de notificaciones en Navbar (desktop)
 * - Badge de notificaciones en MobileHeader (móvil)
 * - Panel de notificaciones (dropdown/overlay)
 *
 * Ubicación: apps/web/src/stores/useNotificacionesStore.ts
 */

import { create } from 'zustand';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Tipos de notificaciones disponibles
 */
export type TipoNotificacion = 'punto' | 'cupon' | 'mensaje' | 'sistema';

/**
 * Notificación individual
 */
export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
}

/**
 * Estado del store
 */
interface NotificacionesState {
  // Estado - Notificaciones
  notificaciones: Notificacion[];
  panelAbierto: boolean;

  // Computed - Cantidad de notificaciones no leídas
  cantidadNoLeidas: number;

  // Acciones - Panel
  abrirPanel: () => void;
  cerrarPanel: () => void;
  togglePanel: () => void;

  // Acciones - Notificaciones
  marcarLeidas: () => void;
  marcarLeidaPorId: (id: string) => void;
  agregarNotificacion: (notificacion: Omit<Notificacion, 'id' | 'leida' | 'fecha'>) => void;
}

// =============================================================================
// DATOS MOCK
// =============================================================================

/**
 * Notificaciones de prueba para desarrollo
 * TODO: En producción, estas vendrán del backend vía WebSocket/API
 */
const NOTIFICACIONES_MOCK: Notificacion[] = [
  {
    id: '1',
    tipo: 'punto',
    titulo: '+50 puntos',
    mensaje: 'Compraste en Tacos El Güero',
    fecha: new Date(Date.now() - 2 * 60 * 60 * 1000), // Hace 2 horas
    leida: false,
  },
  {
    id: '2',
    tipo: 'cupon',
    titulo: 'Nuevo cupón disponible',
    mensaje: '20% de descuento en Farmacia San Juan',
    fecha: new Date(Date.now() - 24 * 60 * 60 * 1000), // Hace 1 día
    leida: false,
  },
  {
    id: '3',
    tipo: 'mensaje',
    titulo: 'Nuevo mensaje',
    mensaje: 'Estética María te envió un mensaje',
    fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Hace 3 días
    leida: false,
  },
  {
    id: '4',
    tipo: 'sistema',
    titulo: '¡Bienvenido a AnunciaYA!',
    mensaje: 'Completa tu perfil para obtener mejores recomendaciones',
    fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Hace 7 días
    leida: true,
  },
  {
    id: '5',
    tipo: 'punto',
    titulo: '+100 puntos',
    mensaje: 'Compraste en SuperMercado El Ahorro',
    fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Hace 5 días
    leida: true,
  },
];

// =============================================================================
// STORE
// =============================================================================

export const useNotificacionesStore = create<NotificacionesState>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------
  notificaciones: NOTIFICACIONES_MOCK,
  panelAbierto: false,

  // ---------------------------------------------------------------------------
  // COMPUTED: Cantidad no leídas
  // ---------------------------------------------------------------------------
  get cantidadNoLeidas() {
    const state = get();
    return state.notificaciones.filter((n) => !n.leida).length;
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Panel
  // ---------------------------------------------------------------------------

  /**
   * Abre el panel de notificaciones
   */
  abrirPanel: () => {
    set({ panelAbierto: true });
  },

  /**
   * Cierra el panel de notificaciones
   */
  cerrarPanel: () => {
    set({ panelAbierto: false });
  },

  /**
   * Alterna el estado del panel (abierto/cerrado)
   */
  togglePanel: () => {
    set((state) => ({ panelAbierto: !state.panelAbierto }));
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Notificaciones
  // ---------------------------------------------------------------------------

  /**
   * Marca TODAS las notificaciones como leídas
   */
  marcarLeidas: () => {
    set((state) => ({
      notificaciones: state.notificaciones.map((n) => ({
        ...n,
        leida: true,
      })),
    }));
  },

  /**
   * Marca UNA notificación específica como leída
   */
  marcarLeidaPorId: (id: string) => {
    set((state) => ({
      notificaciones: state.notificaciones.map((n) =>
        n.id === id ? { ...n, leida: true } : n
      ),
    }));
  },

  /**
   * Agrega una nueva notificación al inicio de la lista
   * @param notificacion - Datos de la notificación (sin id, fecha, ni estado leida)
   */
  agregarNotificacion: (notificacion) => {
    const nuevaNotificacion: Notificacion = {
      ...notificacion,
      id: Date.now().toString(), // ID temporal basado en timestamp
      fecha: new Date(),
      leida: false,
    };

    set((state) => ({
      notificaciones: [nuevaNotificacion, ...state.notificaciones],
    }));
  },
}));

export default useNotificacionesStore;