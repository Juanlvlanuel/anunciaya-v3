import { useEffect, useState } from 'react';

// Tipos para Window Controls Overlay API
interface WindowControlsOverlay extends EventTarget {
  visible: boolean;
  getTitlebarAreaRect(): DOMRect;
}

interface NavigatorWithWCO extends Navigator {
  windowControlsOverlay?: WindowControlsOverlay;
}

export default function HeaderScanYACustom() {
  const [isWCO, setIsWCO] = useState(false);

  useEffect(() => {
    const nav = navigator as NavigatorWithWCO;
    
    // Detectar si Window Controls Overlay está activo
    if (nav.windowControlsOverlay) {
      const wco = nav.windowControlsOverlay;
      setIsWCO(wco.visible);

      // Escuchar cambios en la geometría
      const handleGeometryChange = () => {
        setIsWCO(wco.visible);
      };

      wco.addEventListener('geometrychange', handleGeometryChange);

      return () => {
        wco.removeEventListener('geometrychange', handleGeometryChange);
      };
    }
  }, []);

  // Si WCO no está activo, no renderizar nada (usa la barra por defecto)
  if (!isWCO) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-[70px] bg-slate-900 flex items-center justify-between px-6 z-50"
      style={{
        // @ts-expect-error - appRegion es específico de PWA
        appRegion: 'drag',
        WebkitAppRegion: 'drag'
      }}
    >
      {/* Logo ScanYA Grande */}
      <div className="flex items-center gap-3">
        <img 
          src="/icons/scanya-192.png" 
          alt="ScanYA" 
          className="h-12 w-12"
        />
        <div className="flex items-center gap-1">
          <span className="text-3xl font-bold text-blue-500">Scan</span>
          <span className="text-3xl font-bold text-red-500">YA</span>
        </div>
      </div>
    </div>
  );
}