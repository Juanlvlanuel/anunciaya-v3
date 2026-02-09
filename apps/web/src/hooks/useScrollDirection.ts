/**
 * useScrollDirection.ts — v2.0
 * ============================
 * Hook para detectar dirección de scroll.
 *
 * CAMBIO CLAVE v2.0:
 * - Acepta `scrollRef` opcional para escuchar scroll de un contenedor
 *   con overflow-y-auto (ej: <main> en móvil) en lugar de `window`.
 * - Usa `useRef` internos en vez de `useState` para lastScrollY,
 *   evitando el loop de re-renders que causaba el bug de v1.
 * - API cambia de positional arg a options object (breaking change).
 *
 * USO:
 *   // Window (desktop o sin ref)
 *   const { scrollDirection, isAtTop } = useScrollDirection();
 *
 *   // Contenedor específico (mobile)
 *   const mainRef = useRef<HTMLElement>(null);
 *   const { scrollDirection } = useScrollDirection({ scrollRef: mainRef });
 *
 * UBICACIÓN: apps/web/src/hooks/useScrollDirection.ts
 */

import { useState, useEffect, useRef, type RefObject } from 'react';

// =============================================================================
// TIPOS
// =============================================================================

export type ScrollDirection = 'up' | 'down' | 'idle';

interface UseScrollDirectionOptions {
  /** Ref al contenedor que hace scroll. Si no se pasa, usa window. */
  scrollRef?: RefObject<HTMLElement | null>;
  /** Píxeles mínimos para considerar cambio de dirección (default: 10) */
  threshold?: number;
  /** Píxeles desde top para considerar "en el top" (default: 10) */
  topOffset?: number;
}

interface UseScrollDirectionReturn {
  scrollDirection: ScrollDirection;
  isAtTop: boolean;
  scrollY: number;
}

// =============================================================================
// HOOK
// =============================================================================

export function useScrollDirection({
  scrollRef,
  threshold = 10,
  topOffset = 10,
}: UseScrollDirectionOptions = {}): UseScrollDirectionReturn {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>('idle');
  const [scrollY, setScrollY] = useState(0);

  // Refs internos para evitar re-renders (fix del bug v1)
  const lastScrollYRef = useRef(0);
  const lastDirectionRef = useRef<ScrollDirection>('idle');
  const tickingRef = useRef(false);

  useEffect(() => {
    const getScrollTop = (): number => {
      if (scrollRef?.current) {
        return scrollRef.current.scrollTop;
      }
      return window.scrollY;
    };

    const updateScrollDirection = () => {
      const currentScrollY = getScrollTop();

      setScrollY(currentScrollY);

      // Si está en el top → idle
      if (currentScrollY < topOffset) {
        if (lastDirectionRef.current !== 'idle') {
          lastDirectionRef.current = 'idle';
          setScrollDirection('idle');
        }
        lastScrollYRef.current = currentScrollY;
        tickingRef.current = false;
        return;
      }

      // Calcular diferencia
      const diff = currentScrollY - lastScrollYRef.current;

      // Solo cambiar si supera threshold
      if (Math.abs(diff) < threshold) {
        tickingRef.current = false;
        return;
      }

      const newDirection: ScrollDirection = diff > 0 ? 'down' : 'up';

      // Solo actualizar estado si realmente cambió
      if (newDirection !== lastDirectionRef.current) {
        lastDirectionRef.current = newDirection;
        setScrollDirection(newDirection);
      }

      lastScrollYRef.current = currentScrollY;
      tickingRef.current = false;
    };

    const onScroll = () => {
      if (!tickingRef.current) {
        window.requestAnimationFrame(updateScrollDirection);
        tickingRef.current = true;
      }
    };

    // Escuchar el contenedor correcto
    const target = scrollRef?.current ?? window;
    target.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      target.removeEventListener('scroll', onScroll);
    };
  }, [scrollRef, threshold, topOffset]);

  return {
    scrollDirection,
    isAtTop: scrollY < topOffset,
    scrollY,
  };
}

export default useScrollDirection;