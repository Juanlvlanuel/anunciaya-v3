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
  /**
   * `true` cuando ChatYA fue abierto desde dentro de un modal (botón
   * "ChatYA" en modal de oferta/artículo). En ese caso `abrirChatYA`
   * limpia las marcas de modal del state actual con `replaceState`,
   * dejando una entrada residual en el stack que NO debe quedar visible
   * al usuario al cerrar el chat. ChatOverlay lee este flag para hacer
   * un `history.back()` extra al cerrar y saltar la entrada fantasma.
   */
  chatAbiertoDesdeModal: boolean;
  /**
   * Cantidad de entradas "fantasma" que `abrirChatYA` dejó en el stack
   * cuando cerró todos los modales abiertos para mostrar el chat. Una
   * por cada marca de modal detectada en el state actual. ChatOverlay
   * usa este conteo para `history.go(-(1+count))` y saltar overlay +
   * fantasmas en un solo brinco al cerrar el chat. Sin esto, si había
   * más de 1 modal apilado (ej. bottom-sheet de ofertas + detalle),
   * solo se saltaba 1 fantasma y el usuario quedaba en una pantalla
   * "muerta" del bottom-sheet residual.
   */
  fantasmasModalCount: number;

  // Estado - Preview Negocio (Business Studio)
  previewNegocioAbierto: boolean;
  sucursalActivaId: string | null;

  // Estado - Botón Guardar BS (comunicación páginas BS → MobileHeader)
  guardarBsFn: (() => void) | null;
  guardandoBs: boolean;
  bsPuedeGuardar: boolean;

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

  // Acciones - Guardar BS
  setGuardarBsFn: (fn: (() => void) | null) => void;
  setGuardandoBs: (v: boolean) => void;
  setBsPuedeGuardar: (v: boolean) => void;

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
  chatAbiertoDesdeModal: false,
  fantasmasModalCount: 0,
  // Preview Negocio
  previewNegocioAbierto: false,
  sucursalActivaId: null,
  // Guardar BS
  guardarBsFn: null,
  guardandoBs: false,
  bsPuedeGuardar: true,

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
   * Abre el chat y lo pone en estado maximizado.
   *
   * Limpia las marcas de modales en el state actual del history ANTES de
   * que ChatOverlay pushee su entrada. Caso típico: el botón "ChatYA"
   * dentro de un modal de oferta/artículo. Si dejáramos las marcas:
   *   1. Modal con state `{_modalUI: m1}`.
   *   2. abrirChatYA → ChatOverlay pushea entrada que hereda state →
   *      `{_modalUI: m1, chatyaOverlay: true}`.
   *   3. Padre cierra modal con `onClose()` → cleanup de `useBackNativo`
   *      verifica state.disc === m1 → ejecuta `history.back()`.
   *   4. State pasa a `{_modalUI: m1}` (sin chatyaOverlay) → listener
   *      del overlay no lo reconoce como capa superior y cierra el chat
   *      al instante.
   *
   * `replaceState` borra las marcas sin alterar el stack: cuando el
   * cleanup del modal ejecute, `state.disc !== id` → no hace `back()`.
   * La entrada del modal queda en el stack como "fantasma silencioso"
   * que el usuario consume con un back extra al regresar — trade-off
   * aceptable para mantener la jerarquía intacta.
   */
  abrirChatYA: () => {
    let cuentaMarcas = 0;
    if (typeof window !== 'undefined') {
      const estadoActual = (window.history.state ?? {}) as Record<string, unknown>;
      // Contar marcas de modal presentes en el state actual. Cada marca
      // representa un push hecho por un modal anidado (ej. bottom-sheet
      // de ofertas + modal centrado de detalle). Necesitamos el conteo
      // para que al cerrar el chat saltemos todas las entradas fantasma
      // que quedan tras `replaceState`.
      // Lista centralizada de discriminadores de modales reconocidos.
      // Cada vez que un modal use un discriminador propio (vía la prop
      // `discriminador` de `Modal` o equivalente), agregar su nombre aquí
      // para que `abrirChatYA` lo cuente como fantasma a saltar.
      const llaves = [
        '_modalUI',
        '_modalBottom',
        '_modalImagenes',
        '_dropdownCompartir',
        '_modalOfertaDetalle',
        '_modalDetalleItem',
      ] as const;
      for (const llave of llaves) {
        if (llave in estadoActual) cuentaMarcas++;
      }
      if (cuentaMarcas > 0) {
        const estadoLimpio = { ...estadoActual };
        for (const llave of llaves) {
          delete estadoLimpio[llave];
        }
        window.history.replaceState(estadoLimpio, '');
        // Disparar evento custom para que cualquier modal/bottom-sheet
        // abierto se cierre antes de que el chat se monte encima. Sin
        // esto, modales que NO son los que llamaron `abrirChatYA` (típico:
        // el bottom-sheet padre del modal de detalle) se quedan visibles
        // tapando el chat.
        window.dispatchEvent(new CustomEvent('chatya:cerrar-modales'));
      }
    }
    set({
      chatYAAbierto: true,
      chatYAMinimizado: false,
      chatAbiertoDesdeModal: cuentaMarcas > 0,
      fantasmasModalCount: cuentaMarcas,
    });
  },

  /**
   * Cierra completamente el chat.
   *
   * NO reseteamos `chatAbiertoDesdeModal` aquí: el effect del overlay en
   * `ChatOverlay.tsx` necesita leerlo para decidir entre `history.back()`
   * y `history.go(-2)` (para saltar la entrada fantasma del modal). Si
   * lo reseteáramos aquí, el effect leería siempre `false` y dejaría al
   * usuario en una pantalla "muerta" del fantasma. El reset lo hace el
   * propio effect del overlay después de consumir la entrada, o el
   * siguiente `abrirChatYA` que recalcula el flag desde cero.
   */
  cerrarChatYA: () => {
    set({
      chatYAAbierto: false,
      chatYAMinimizado: false,
    });
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
  // ACCIONES: Guardar BS
  // ---------------------------------------------------------------------------

  setGuardarBsFn: (fn: (() => void) | null) => {
    set({ guardarBsFn: fn });
  },

  setGuardandoBs: (v: boolean) => {
    set({ guardandoBs: v });
  },

  setBsPuedeGuardar: (v: boolean) => {
    set({ bsPuedeGuardar: v });
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
      // No reseteamos `chatAbiertoDesdeModal` aquí — ver comentario en
      // `cerrarChatYA`. El effect del overlay lo limpia tras consumir
      // la entrada fantasma del stack.
      vistaModalLogin: 'login',
      datos2FA: null,
      previewNegocioAbierto: false,
    });
  },
}));

export default useUiStore;