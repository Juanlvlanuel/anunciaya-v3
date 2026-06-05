/**
 * useClickFuera.ts
 * =================
 * Devuelve un ref; cuando está `activo` y se hace clic fuera del elemento,
 * ejecuta `alCerrar`. Para menús/dropdowns del shell.
 *
 * Ubicación: apps/admin/src/hooks/useClickFuera.ts
 */

import { useEffect, useRef } from 'react';

export function useClickFuera<T extends HTMLElement>(alCerrar: () => void, activo: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!activo) return;
    function manejar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) alCerrar();
    }
    document.addEventListener('mousedown', manejar);
    return () => document.removeEventListener('mousedown', manejar);
  }, [activo, alCerrar]);

  return ref;
}
