/**
 * usePWAInstallStore.ts
 * =====================
 * Estado global de instalación de la PWA de AnunciaYA (app principal).
 *
 * ¿Por qué un store global y no un hook por componente?
 * El evento `beforeinstallprompt` se dispara UNA sola vez poco después de
 * cargar la página. Si cada componente (banner, ítem del menú) montara su
 * propio listener, el que monte tarde se perdería el evento. Por eso el
 * listener se registra una única vez y muy temprano vía `inicializarPWAInstall()`
 * (llamado desde main.tsx), y el evento diferido se guarda aquí para que
 * cualquier componente pueda ofrecer la instalación.
 *
 * En iPhone/Safari `beforeinstallprompt` NO existe: la instalación es manual
 * (Compartir → "Agregar a pantalla de inicio"). Para iOS exponemos `esIOS`
 * para que la UI muestre instrucciones en lugar del botón nativo.
 *
 * Ubicación: apps/web/src/stores/usePWAInstallStore.ts
 */

import { create } from 'zustand';

// =============================================================================
// TIPOS
// =============================================================================

/** Evento no estándar de Chromium (no está en lib.dom por defecto). */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

interface PWAInstallState {
  /** Evento nativo capturado (Android/Chrome). null si no está disponible. */
  deferredPrompt: BeforeInstallPromptEvent | null;
  /** Hay prompt nativo disponible → se puede disparar la instalación directa. */
  puedeInstalar: boolean;
  /** La app ya corre instalada (modo standalone) o se acaba de instalar. */
  instalada: boolean;
  /** El dispositivo es iOS/iPadOS (requiere instalación manual con instructivo). */
  esIOS: boolean;
  /** El banner descartable debe mostrarse ahora. */
  bannerVisible: boolean;
  /** El instructivo de instalación en iOS está abierto. */
  instruccionesIOSVisible: boolean;
  /** Dispara el prompt nativo de instalación. Devuelve true si se instaló. */
  instalar: () => Promise<boolean>;
  /** Cierra el banner y lo silencia por unos días. */
  descartarBanner: () => void;
  /** Abre/cierra el instructivo de iOS (usado por banner y menú). */
  abrirInstruccionesIOS: () => void;
  cerrarInstruccionesIOS: () => void;
  /** Recalcula si el banner debe mostrarse (uso interno). */
  _recalcularBanner: () => void;
}

// =============================================================================
// CONSTANTES / HELPERS
// =============================================================================

function esStandaloneAhora(): boolean {
  if (typeof window === 'undefined') return false;
  const porMedia = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const porIOS = (navigator as NavigatorStandalone).standalone === true;
  return porMedia || porIOS;
}

function detectarIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const esIphone = /iphone|ipod|ipad/i.test(ua);
  // iPadOS 13+ se presenta como "Macintosh" pero tiene touch.
  const esIpadOS = ua.includes('Macintosh') && typeof document !== 'undefined' && 'ontouchend' in document;
  return esIphone || esIpadOS;
}

// =============================================================================
// STORE
// =============================================================================

export const usePWAInstallStore = create<PWAInstallState>((set, get) => ({
  deferredPrompt: null,
  puedeInstalar: false,
  instalada: esStandaloneAhora(),
  esIOS: detectarIOS(),
  bannerVisible: false,
  instruccionesIOSVisible: false,

  instalar: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      // El prompt nativo solo puede usarse una vez.
      set({ deferredPrompt: null, puedeInstalar: false, bannerVisible: false });
      if (outcome === 'accepted') {
        set({ instalada: true });
        return true;
      }
      return false;
    } catch {
      set({ deferredPrompt: null, puedeInstalar: false });
      return false;
    }
  },

  descartarBanner: () => {
    // Solo se oculta en la sesión actual (en memoria). Al refrescar o reabrir
    // el navegador el store se reinicia y el banner vuelve a salir mientras la
    // app no esté instalada. Por eso NO se persiste nada.
    set({ bannerVisible: false });
  },

  abrirInstruccionesIOS: () => set({ instruccionesIOSVisible: true }),
  cerrarInstruccionesIOS: () => set({ instruccionesIOSVisible: false }),

  _recalcularBanner: () => {
    const { instalada, puedeInstalar, esIOS } = get();
    const debe = !instalada && (puedeInstalar || esIOS);
    set({ bannerVisible: debe });
  },
}));

// =============================================================================
// INICIALIZACIÓN (una sola vez, lo antes posible — desde main.tsx)
// =============================================================================

let inicializado = false;

export function inicializarPWAInstall(): void {
  if (inicializado || typeof window === 'undefined') return;
  inicializado = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Evita que Chrome muestre su mini-infobar: la app ofrece su propia UI.
    e.preventDefault();
    usePWAInstallStore.setState({
      deferredPrompt: e as BeforeInstallPromptEvent,
      puedeInstalar: true,
    });
    usePWAInstallStore.getState()._recalcularBanner();
  });

  window.addEventListener('appinstalled', () => {
    usePWAInstallStore.setState({
      deferredPrompt: null,
      puedeInstalar: false,
      instalada: true,
      bannerVisible: false,
    });
  });

  // iOS no dispara beforeinstallprompt: evaluar el banner una vez al arranque.
  usePWAInstallStore.getState()._recalcularBanner();
}
