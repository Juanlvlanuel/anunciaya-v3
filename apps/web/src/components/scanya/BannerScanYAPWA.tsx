import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';

/**
 * BannerScanYAPWA (OPCIONAL)
 * ===========================
 * Banner helper que aparece en /inicio si detectamos que PUEDE ser PWA
 * pero el flag no está seteado. Ayuda al usuario a setear el flag manualmente.
 * 
 * Uso: Agregar en PaginaInicio.tsx o MainLayout.tsx
 * 
 * Ubicación: apps/web/src/components/scanya/BannerScanYAPWA.tsx
 */
export function BannerScanYAPWA() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    // Solo mostrar en /inicio
    if (location.pathname !== '/inicio') {
      setMostrar(false);
      return;
    }

    // Verificar si ya tiene el flag
    const flagPWA = localStorage.getItem('scanya_is_pwa') === 'true';
    if (flagPWA) {
      setMostrar(false);
      return;
    }

    // Verificar si PUEDE ser PWA (métodos de detección)
    const esStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const esIosStandalone = (navigator as any).standalone;
    const tieneReferrerVacio = document.referrer === '';
    
    // Si parece PWA pero no tiene flag, mostrar banner
    const puedeSerPWA = esStandalone || esIosStandalone || tieneReferrerVacio;
    
    if (puedeSerPWA) {
      setMostrar(true);
    }
  }, [location.pathname]);

  const handleIrAScanYA = () => {
    // Setear flag y navegar
    localStorage.setItem('scanya_is_pwa', 'true');
    navigate('/scanya/login?source=manual');
    setMostrar(false);
  };

  const handleCerrar = () => {
    // Guardar que el usuario cerró el banner (no mostrar de nuevo)
    localStorage.setItem('scanya_banner_closed', 'true');
    setMostrar(false);
  };

  // No mostrar si el usuario ya cerró el banner antes
  const bannerCerrado = localStorage.getItem('scanya_banner_closed') === 'true';
  if (!mostrar || bannerCerrado) {
    return null;
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-linear-to-r from-orange-500 to-orange-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="/logo-scanya-blanco.webp" 
            alt="ScanYA" 
            className="h-8 w-auto"
          />
          <div>
            <p className="font-semibold text-sm">
              ¿Instalaste ScanYA?
            </p>
            <p className="text-xs text-orange-100">
              Parece que estás usando la app instalada. Click aquí para ir a ScanYA.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleIrAScanYA}
            className="px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold text-sm hover:bg-orange-50 transition-colors"
          >
            Ir a ScanYA
          </button>
          <button
            onClick={handleCerrar}
            className="p-2 hover:bg-orange-700 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default BannerScanYAPWA;