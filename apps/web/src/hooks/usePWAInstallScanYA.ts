/**
 * usePWAInstallScanYA.ts
 * =======================
 * Hook para manejar la instalación de la PWA de ScanYA.
 * 
 * Funcionalidad:
 * - Inyecta el manifest dinámicamente SOLO en rutas /scanya/*
 * - Captura el evento beforeinstallprompt
 * - Expone función instalar() para el botón verde
 * - Detecta si ya está instalada usando localStorage
 * 
 * Ubicación: apps/web/src/hooks/usePWAInstallScanYA.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// =============================================================================
// TIPOS
// =============================================================================

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

/** Estado de instalación guardado en localStorage */
type EstadoInstalacion = 'nunca' | 'intento' | 'instalada';

interface UsePWAInstallScanYAReturn {
  /** Si se puede mostrar el botón de instalar */
  puedeInstalar: boolean;
  /** Estado de instalación: nunca, intento, instalada */
  estadoInstalacion: EstadoInstalacion;
  /** Si estamos en modo standalone (dentro de la PWA) */
  esStandalone: boolean;
  /** Si estamos en proceso de instalación */
  instalando: boolean;
  /** Función para disparar la instalación */
  instalar: () => Promise<boolean>;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const MANIFEST_ID = 'scanya-manifest';
const MANIFEST_URL = '/manifest.scanya.json';
const STORAGE_KEY = 'scanya-pwa-estado';

// =============================================================================
// HELPERS
// =============================================================================

function getEstadoGuardado(): EstadoInstalacion {
  const valor = localStorage.getItem(STORAGE_KEY);
  if (valor === 'intento' || valor === 'instalada') return valor;
  return 'nunca';
}

function setEstadoGuardado(estado: EstadoInstalacion): void {
  localStorage.setItem(STORAGE_KEY, estado);
}

// =============================================================================
// HOOK
// =============================================================================

export function usePWAInstallScanYA(): UsePWAInstallScanYAReturn {
  const location = useLocation();

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [estadoInstalacion, setEstadoInstalacion] = useState<EstadoInstalacion>(getEstadoGuardado);
  const [instalando, setInstalando] = useState(false);
  const [esStandalone, setEsStandalone] = useState(false);

  // Verificar si estamos en ruta de ScanYA
  const esRutaScanYA = location.pathname.startsWith('/scanya');

  // ---------------------------------------------------------------------------
  // Efecto: Inyectar/quitar manifest según la ruta
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (esRutaScanYA) {
      // Inyectar manifest si no existe
      // let manifestLink = document.getElementById(MANIFEST_ID) as HTMLLinkElement | null;

      // if (!manifestLink) {
      //   manifestLink = document.createElement('link');
      //   manifestLink.id = MANIFEST_ID;
      //   manifestLink.rel = 'manifest';
      //   manifestLink.href = MANIFEST_URL;
      //   document.head.appendChild(manifestLink);
      //   console.log('[PWA ScanYA] Manifest inyectado');
      // }

      // Deshabilitar pinch-to-zoom para que se sienta como app nativa
      const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
      if (viewport) {
        viewport.setAttribute('data-original-content', viewport.content);
        viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        console.log('[PWA ScanYA] Pinch-to-zoom deshabilitado');
      }

      // Deshabilitar pull-to-refresh (overscroll) para que se sienta como app nativa
      document.body.style.overscrollBehavior = 'none';
      document.documentElement.style.overscrollBehavior = 'none';
      console.log('[PWA ScanYA] Pull-to-refresh deshabilitado');
    } else {
      // Quitar manifest si existe y no estamos en ScanYA
      const manifestLink = document.getElementById(MANIFEST_ID);
      if (manifestLink) {
        manifestLink.remove();
        console.log('[PWA ScanYA] Manifest removido');
      }

      // Restaurar viewport original (habilitar pinch-to-zoom)
      const viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
      if (viewport) {
        const originalContent = viewport.getAttribute('data-original-content');
        if (originalContent) {
          viewport.content = originalContent;
          console.log('[PWA ScanYA] Viewport restaurado (pinch-to-zoom habilitado)');
        }
      }

      // Restaurar overscroll-behavior (habilitar pull-to-refresh)
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overscrollBehavior = '';
      console.log('[PWA ScanYA] Pull-to-refresh habilitado');
    }

    // Cleanup al desmontar
    return () => {
      // No removemos en cleanup porque otro componente ScanYA podría necesitarlo
    };
  }, [esRutaScanYA]);

  // ---------------------------------------------------------------------------
  // Efecto: Detectar si estamos en modo standalone (dentro de la PWA)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = (navigator as NavigatorStandalone).standalone;

    if (standalone || iosStandalone) {
      setEsStandalone(true);
      setEstadoGuardado('instalada');
      setEstadoInstalacion('instalada');
      console.log('[PWA ScanYA] Ejecutando en modo standalone (PWA)');
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Efecto: Capturar evento beforeinstallprompt
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!esRutaScanYA) return;

    const handleBeforeInstall = (e: Event) => {
      // Prevenir que Chrome muestre su mini-infobar
      e.preventDefault();

      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      console.log('[PWA ScanYA] ✅ beforeinstallprompt capturado');
    };

    const handleAppInstalled = () => {
      console.log('[PWA ScanYA] ✅ App instalada exitosamente');
      setEstadoGuardado('instalada');
      setEstadoInstalacion('instalada');
      setDeferredPrompt(null);
    };

    // Escuchar eventos
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [esRutaScanYA]);

  // ---------------------------------------------------------------------------
  // Función: Instalar PWA
  // ---------------------------------------------------------------------------
  const instalar = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.log('[PWA ScanYA] No hay prompt disponible');
      return false;
    }

    setInstalando(true);

    // Guardar que el usuario intentó instalar
    setEstadoGuardado('intento');
    setEstadoInstalacion('intento');

    // Flag para saber si ya se resolvió
    let resuelto = false;

    // Listener para detectar cambio de pestaña
    const handleVisibilityChange = () => {
      if (document.hidden && !resuelto) {
        console.log('[PWA ScanYA] Usuario cambió de pestaña - cancelando instalación');
        resuelto = true;
        setInstalando(false);
        setDeferredPrompt(null); // El prompt ya no sirve
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    try {
      // Mostrar el prompt nativo del navegador
      await deferredPrompt.prompt();

      // Esperar la decisión del usuario
      const choiceResult = await deferredPrompt.userChoice;
      resuelto = true;

      // Limpiar el prompt usado (solo se puede usar una vez)
      setDeferredPrompt(null);

      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA ScanYA] ✅ Usuario aceptó instalar');
        setEstadoGuardado('instalada');
        setEstadoInstalacion('instalada');
        return true;
      } else {
        console.log('[PWA ScanYA] ❌ Usuario rechazó instalar');
        // Chrome disparará un nuevo beforeinstallprompt automáticamente
        return false;
      }
    } catch (error) {
      console.error('[PWA ScanYA] Error al instalar:', error);
      resuelto = true;
      return false;
    } finally {
      // Limpiar listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Resetear estado si no se había resuelto antes
      if (!resuelto) {
        setInstalando(false);
      }
      setInstalando(false);
      console.log('[PWA ScanYA] Estado instalando reseteado');
    }
  }, [deferredPrompt]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    puedeInstalar: !!deferredPrompt,
    estadoInstalacion,
    esStandalone,
    instalando,
    instalar,
  };
}

export default usePWAInstallScanYA;