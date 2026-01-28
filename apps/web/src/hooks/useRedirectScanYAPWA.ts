import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * useRedirectScanYAPWA
 * =====================
 * Hook que redirige automáticamente a /scanya/login cuando:
 * 1. Estamos en modo PWA (standalone)
 * 2. La URL actual NO es una ruta de ScanYA (/scanya/*)
 * 
 * Usa múltiples métodos de detección:
 * - Query parameter ?source=pwa
 * - localStorage flag (persiste entre sesiones)
 * - matchMedia display-mode standalone
 * - navigator.standalone (iOS)
 * 
 * Ubicación: apps/web/src/hooks/useRedirectScanYAPWA.ts
 */
export function useRedirectScanYAPWA() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const PWA_FLAG_KEY = 'scanya_is_pwa';
    
    // Método 1: Query parameter
    const searchParams = new URLSearchParams(location.search);
    const esDesdePWA = searchParams.get('source') === 'pwa';
    
    // Método 2: matchMedia display-mode standalone
    const esStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Método 3: navigator.standalone (iOS)
    const esIosStandalone = (navigator as any).standalone;
    
    // Método 4: localStorage flag (persiste entre sesiones)
    const flagPWA = localStorage.getItem(PWA_FLAG_KEY) === 'true';
    
    // Combinar todos los métodos
    const esPWA = esDesdePWA || esStandalone || esIosStandalone || flagPWA;

    // Si detectamos PWA por primera vez, guardar flag en localStorage
    if ((esDesdePWA || esStandalone || esIosStandalone) && !flagPWA) {
      localStorage.setItem(PWA_FLAG_KEY, 'true');
      console.log('[PWA] Primera apertura de PWA detectada. Flag guardado en localStorage.');
    }

    // ✅ DEBUG: Ver qué está detectando
    console.log('[PWA Debug] Verificando condiciones:', {
      pathname: location.pathname,
      search: location.search,
      esDesdePWA,
      esStandalone,
      esIosStandalone,
      flagPWA,
      esPWA,
      esScanYA: location.pathname.startsWith('/scanya'),
      debeRedirigir: esPWA && !location.pathname.startsWith('/scanya')
    });

    // Solo ejecutar si:
    // 1. Estamos en PWA instalada
    // 2. NO estamos ya en rutas de ScanYA
    if (esPWA && !location.pathname.startsWith('/scanya')) {
      console.log('[PWA] Detectado inicio en ruta incorrecta. Redirigiendo a ScanYA...');
      
      // Redirigir a ScanYA login CON el query parameter
      navigate('/scanya/login?source=pwa', { replace: true });
    }
  }, [location.pathname, location.search, navigate]);
}

export default useRedirectScanYAPWA;