/**
 * usePWAInstallPanelStore.ts
 * ==========================
 * Estado global de instalación de la PWA del Panel Admin.
 *
 * El evento `beforeinstallprompt` se dispara una sola vez poco después de
 * cargar la página, así que el listener se registra una única vez y muy
 * temprano vía `inicializarPWAInstallPanel()` (desde main.tsx), y el evento
 * diferido se guarda aquí para que el banner pueda ofrecer la instalación.
 *
 * En iPhone/iPad (Safari) `beforeinstallprompt` NO existe: la instalación es
 * manual (Compartir → "Agregar a pantalla de inicio"). Para iOS exponemos
 * `esIOS` para mostrar instrucciones en vez del botón nativo.
 *
 * El descarte del banner NO se persiste: al refrescar/reabrir vuelve a salir
 * mientras el Panel no esté instalado.
 *
 * Ubicación: apps/admin/src/stores/usePWAInstallPanelStore.ts
 */

import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

interface PWAInstallPanelState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  puedeInstalar: boolean;
  instalada: boolean;
  esIOS: boolean;
  bannerVisible: boolean;
  instalar: () => Promise<boolean>;
  descartarBanner: () => void;
  _recalcularBanner: () => void;
}

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
  const esIpadOS = ua.includes('Macintosh') && typeof document !== 'undefined' && 'ontouchend' in document;
  return esIphone || esIpadOS;
}

export const usePWAInstallPanelStore = create<PWAInstallPanelState>((set, get) => ({
  deferredPrompt: null,
  puedeInstalar: false,
  instalada: esStandaloneAhora(),
  esIOS: detectarIOS(),
  bannerVisible: false,

  instalar: async () => {
    const { deferredPrompt } = get();
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
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
    // Solo se oculta en la sesión actual: al refrescar/reabrir vuelve a salir.
    set({ bannerVisible: false });
  },

  _recalcularBanner: () => {
    const { instalada, puedeInstalar, esIOS } = get();
    set({ bannerVisible: !instalada && (puedeInstalar || esIOS) });
  },
}));

let inicializado = false;

export function inicializarPWAInstallPanel(): void {
  if (inicializado || typeof window === 'undefined') return;
  inicializado = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    usePWAInstallPanelStore.setState({
      deferredPrompt: e as BeforeInstallPromptEvent,
      puedeInstalar: true,
    });
    usePWAInstallPanelStore.getState()._recalcularBanner();
  });

  window.addEventListener('appinstalled', () => {
    usePWAInstallPanelStore.setState({
      deferredPrompt: null,
      puedeInstalar: false,
      instalada: true,
      bannerVisible: false,
    });
  });

  // iOS no dispara beforeinstallprompt: evaluar el banner una vez al arranque.
  usePWAInstallPanelStore.getState()._recalcularBanner();
}
