/**
 * useTituloDinamico.ts
 * =====================
 * Hook para cambiar el título de la página según la ruta actual.
 * 
 * Ubicación: apps/web/src/hooks/useTituloDinamico.ts
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook que cambia el título del documento según la ruta actual
 */
export function useTituloDinamico() {
  const location = useLocation();

  useEffect(() => {
    // Detectar si estamos en rutas de ScanYA
    const esScanYA = location.pathname.startsWith('/scanya');

    // Cambiar título según la ruta
    if (esScanYA) {
      document.title = 'ScanYA';
    } else {
      document.title = 'AnunciaYA - Tus compras ahora valen más';
    }
  }, [location.pathname]);
}