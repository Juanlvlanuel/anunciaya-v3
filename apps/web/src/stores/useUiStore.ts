/**
 * useUiStore.ts
 * ==============
 * Store de Zustand para estado de la interfaz de usuario.
 *
 * ¿Qué hace este archivo?
 * - Controla el estado del sidebar (abierto/cerrado)
 * - Controla el modal de login y sus vistas
 * - Controla el modal de ubicación
 * - Controla el menu drawer (móvil)
 * - Controla el overlay de ChatYA (abierto/cerrado/minimizado)
 *
 * Ubicación: apps/web/src/stores/useUiStore.ts
 */

import { create } from 'zustand';

// =============================================================================
// TIPOS
// =============================================================================

/** Vistas disponibles en el modal de login */
export type VistaModalLogin = 'login' | '2fa' | 'recuperar';

/** Datos para la vista 2FA */
export interface Datos2FA {
  tokenTemporal: string;
  email: string;
}

/**
 * Estado del store
 */
interface UiState {
  // Estado - Sidebar (desktop)
  sidebarAbierto: boolean;

  // Estado - Modal Login
  modalLoginAbierto: boolean;
  vistaModalLogin: VistaModalLogin;
  datos2FA: Datos2FA | null;

  // Estado - Modal Ubicación
  modalUbicacionAbierto: boolean;

  // Estado - Menu Drawer (móvil)
  menuDrawerAbierto: boolean;

  // Estado - ChatYA Overlay
  chatYAAbierto: boolean;
  chatYAMinimizado: boolean;

  // Estado - Preview Negocio (Business Studio)
  previewNegocioAbierto: boolean;
  sucursalActivaId: string | null;

  // Acciones - Sidebar
  toggleSidebar: () => void;
  setSidebar: (abierto: boolean) => void;
  abrirSidebar: () => void;
  cerrarSidebar: () => void;

  // Acciones - Modal Login
  abrirModalLogin: () => void;
  cerrarModalLogin: () => void;
  abrirModal2FA: (tokenTemporal: string, email: string) => void;
  setVistaModalLogin: (vista: VistaModalLogin) => void;

  // Acciones - Modal Ubicación
  abrirModalUbicacion: () => void;
  cerrarModalUbicacion: () => void;
  toggleModalUbicacion: () => void;

  // Acciones - Menu Drawer
  abrirMenuDrawer: () => void;
  cerrarMenuDrawer: () => void;
  toggleMenuDrawer: () => void;

  // Acciones - ChatYA
  abrirChatYA: () => void;
  cerrarChatYA: () => void;
  toggleChatYA: () => void;
  minimizarChatYA: () => void;

  // Acciones - Preview Negocio
  abrirPreviewNegocio: () => void;
  cerrarPreviewNegocio: () => void;
  togglePreviewNegocio: () => void;
  setSucursalActiva: (sucursalId: string | null) => void;

  // Acción - Cerrar todos los modales/overlays
  cerrarTodo: () => void;
}

// =============================================================================
// STORE
// =============================================================================

export const useUiStore = create<UiState>((set) => ({
  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------
  sidebarAbierto: true,
  modalLoginAbierto: false,
  vistaModalLogin: 'login',
  datos2FA: null,
  modalUbicacionAbierto: false,
  menuDrawerAbierto: false,
  chatYAAbierto: false,
  chatYAMinimizado: false,
  // Preview Negocio
  previewNegocioAbierto: false,
  sucursalActivaId: null,

  // ---------------------------------------------------------------------------
  // ACCIONES: Sidebar
  // ---------------------------------------------------------------------------

  toggleSidebar: () => {
    set((state) => ({ sidebarAbierto: !state.sidebarAbierto }));
  },

  setSidebar: (abierto: boolean) => {
    set({ sidebarAbierto: abierto });
  },

  abrirSidebar: () => {
    set({ sidebarAbierto: true });
  },

  cerrarSidebar: () => {
    set({ sidebarAbierto: false });
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Modal Login
  // ---------------------------------------------------------------------------

  abrirModalLogin: () => {
    set({ modalLoginAbierto: true, vistaModalLogin: 'login', datos2FA: null });
  },

  cerrarModalLogin: () => {
    set({ modalLoginAbierto: false, vistaModalLogin: 'login', datos2FA: null });
  },

  /**
   * Abre el modal directamente en la vista 2FA
   * Se usa cuando el login (normal o Google) requiere verificación 2FA
   */
  abrirModal2FA: (tokenTemporal: string, email: string) => {
    set({
      modalLoginAbierto: true,
      vistaModalLogin: '2fa',
      datos2FA: { tokenTemporal, email },
    });
  },

  setVistaModalLogin: (vista: VistaModalLogin) => {
    set({ vistaModalLogin: vista });
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Modal Ubicación
  // ---------------------------------------------------------------------------

  abrirModalUbicacion: () => {
    set({ modalUbicacionAbierto: true });
  },

  cerrarModalUbicacion: () => {
    set({ modalUbicacionAbierto: false });
  },

  toggleModalUbicacion: () => {
    set((state) => ({ modalUbicacionAbierto: !state.modalUbicacionAbierto }));
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Menu Drawer (móvil)
  // ---------------------------------------------------------------------------

  abrirMenuDrawer: () => {
    set({ menuDrawerAbierto: true });
  },

  cerrarMenuDrawer: () => {
    set({ menuDrawerAbierto: false });
  },

  toggleMenuDrawer: () => {
    set((state) => ({ menuDrawerAbierto: !state.menuDrawerAbierto }));
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: ChatYA Overlay
  // ---------------------------------------------------------------------------

  /**
   * Abre el chat y lo pone en estado maximizado
   */
  abrirChatYA: () => {
    set({ chatYAAbierto: true, chatYAMinimizado: false });
  },

  /**
   * Cierra completamente el chat
   */
  cerrarChatYA: () => {
    set({ chatYAAbierto: false, chatYAMinimizado: false });
  },

  /**
   * Alterna entre abierto/cerrado (siempre maximizado al abrir)
   */
  toggleChatYA: () => {
    set((state) => ({
      chatYAAbierto: !state.chatYAAbierto,
      chatYAMinimizado: false // Al abrir con toggle, siempre maximizado
    }));
  },

  /**
   * Minimiza el chat (solo header visible)
   * El chat sigue abierto pero minimizado
   */
  minimizarChatYA: () => {
    set({ chatYAMinimizado: true });
  },

  // ---------------------------------------------------------------------------
  // ACCIONES: Search Panel (móvil)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // ACCIONES: Preview Negocio (Business Studio)
  // ---------------------------------------------------------------------------

  /**
   * Abre el panel de preview del negocio
   */
  abrirPreviewNegocio: () => {
    set({ previewNegocioAbierto: true });
  },

  /**
   * Cierra el panel de preview
   */
  cerrarPreviewNegocio: () => {
    set({ previewNegocioAbierto: false });
  },

  /**
   * Alterna el panel de preview
   */
  togglePreviewNegocio: () => {
    set((state) => ({ previewNegocioAbierto: !state.previewNegocioAbierto }));
  },

  /**
   * Establece la sucursal activa (para multi-sucursal futuro)
   */
  setSucursalActiva: (sucursalId: string | null) => {
    set({ sucursalActivaId: sucursalId });
  },

  // ---------------------------------------------------------------------------
  // ACCIÓN: Cerrar todo
  // ---------------------------------------------------------------------------

  cerrarTodo: () => {
    set({
      modalLoginAbierto: false,
      modalUbicacionAbierto: false,
      menuDrawerAbierto: false,
      chatYAAbierto: false,
      chatYAMinimizado: false,
      vistaModalLogin: 'login',
      datos2FA: null,
      previewNegocioAbierto: false,
    });
  },
}));

export default useUiStore;