/**
 * useEsEscritorio.ts
 * ===================
 * Indica si el viewport es de escritorio (>= 1024px = breakpoint lg de Tailwind).
 * El shell del Panel usa esto para elegir la vista escritorio o la vista móvil
 * (no por rol, sino por tamaño de pantalla — la móvil debe verse de primera, no
 * un escritorio aplastado).
 *
 * Ubicación: apps/admin/src/hooks/useEsEscritorio.ts
 */

import { useEffect, useState } from 'react';

const CONSULTA = '(min-width: 1024px)';

export function useEsEscritorio(): boolean {
  const [esEscritorio, setEsEscritorio] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia(CONSULTA).matches : true,
  );

  useEffect(() => {
    const mql = window.matchMedia(CONSULTA);
    const alCambiar = (e: MediaQueryListEvent) => setEsEscritorio(e.matches);
    mql.addEventListener('change', alCambiar);
    setEsEscritorio(mql.matches);
    return () => mql.removeEventListener('change', alCambiar);
  }, []);

  return esEscritorio;
}
