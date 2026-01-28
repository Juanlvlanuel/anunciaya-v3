/**
 * useTituloPagina.ts
 * ========================================================================
 * Hook personalizado para cambiar el título de la página dinámicamente
 * 
 * Ubicación: apps/web/src/hooks/useTituloPagina.ts
 */

import { useEffect } from 'react';

export function useTituloPagina(titulo: string) {
  useEffect(() => {
    const tituloOriginal = document.title;
    document.title = titulo;

    return () => {
      document.title = tituloOriginal;
    };
  }, [titulo]);
}