/**
 * useScrollDirection.ts
 * =====================
 * Hook personalizado para detectar la dirección del scroll.
 *
 * Uso:
 *   const { scrollDirection, isAtTop } = useScrollDirection();
 *
 * Retorna:
 *   - scrollDirection: 'up' | 'down' | 'idle'
 *   - isAtTop: boolean (true si está en top de la página)
 *
 * Ubicación: apps/web/src/hooks/useScrollDirection.ts
 */

import { useState, useEffect } from 'react';

export type ScrollDirection = 'up' | 'down' | 'idle';

interface UseScrollDirectionReturn {
  scrollDirection: ScrollDirection;
  isAtTop: boolean;
  scrollY: number;
}

/**
 * Hook que detecta la dirección del scroll y la posición
 * 
 * @param threshold - Píxeles mínimos de scroll para cambiar dirección (default: 10)
 */
export function useScrollDirection(threshold: number = 10): UseScrollDirectionReturn {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('idle');
  const [scrollY, setScrollY] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      // Si está en el top, siempre idle
      if (currentScrollY < 10) {
        setScrollDirection('idle');
        setLastScrollY(currentScrollY);
        ticking = false;
        return;
      }

      // Calcular diferencia
      const diff = currentScrollY - lastScrollY;

      // Solo actualizar si supera el threshold
      if (Math.abs(diff) < threshold) {
        ticking = false;
        return;
      }

      // Determinar dirección
      if (diff > 0) {
        // Scrolleando hacia abajo
        setScrollDirection('down');
      } else {
        // Scrolleando hacia arriba
        setScrollDirection('up');
      }

      setLastScrollY(currentScrollY);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [lastScrollY, threshold]);

  return {
    scrollDirection,
    isAtTop: scrollY < 10,
    scrollY,
  };
}

export default useScrollDirection;