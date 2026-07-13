/**
 * useHideOnScroll.ts
 * ==================
 * Hook para ocultar/mostrar elementos fijos (BottomNav, headers)
 * según la dirección del scroll.
 *
 * USA EL MISMO SISTEMA de delta acumulado que useCollapsibleBanner
 * para garantizar sincronización entre ambos.
 *
 * COMPORTAMIENTO:
 * - Scroll down (60px acumulados) → oculto
 * - Scroll up (60px acumulados)  → visible
 * - En el top → siempre visible
 * - Solo activo en mobile (< lg). En desktop siempre visible.
 *
 * USO:
 *   const { shouldShow, hideStyle } = useHideOnScroll({ direction: 'down' });
 *   <nav style={hideStyle}>...</nav>
 *
 * UBICACIÓN: apps/web/src/hooks/useHideOnScroll.ts
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// =============================================================================
// TIPOS
// =============================================================================

interface UseHideOnScrollOptions {
  /** 'down' para BottomNav, 'up' para headers */
  direction?: 'up' | 'down';
  /** Breakpoint desktop en px (default: 1024) */
  desktopBreakpoint?: number;
  /** Duración transición en ms (default: 300) */
  transitionDuration?: number;
  /** Px de scroll acumulado para disparar cambio (default: 60) */
  scrollDelta?: number;
  /** Desactivar (ej: modal abierto) */
  disabled?: boolean;
}

interface UseHideOnScrollReturn {
  shouldShow: boolean;
  hideStyle: React.CSSProperties;
  forzarMostrar: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useHideOnScroll({
  direction = 'down',
  desktopBreakpoint = 1024,
  transitionDuration = 300,
  scrollDelta = 60,
  disabled = false,
}: UseHideOnScrollOptions = {}): UseHideOnScrollReturn {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < desktopBreakpoint : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < desktopBreakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [desktopBreakpoint]);

  const [shouldShow, setShouldShow] = useState(true);

  // Refs para tracking interno
  const lastScrollTopRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);
  const lockUntilRef = useRef(0);
  const rafRef = useRef(0);

  const handleScroll = useCallback((scrollTop: number) => {
    const now = Date.now();

    // En top → siempre visible
    if (scrollTop < 10) {
      setShouldShow(true);
      accumulatedDeltaRef.current = 0;
      lastScrollTopRef.current = scrollTop;
      return;
    }

    // Si estamos en lock, solo trackear posición
    if (now < lockUntilRef.current) {
      lastScrollTopRef.current = scrollTop;
      return;
    }

    const delta = scrollTop - lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;

    if (Math.abs(delta) < 2) return;

    // Acumular en misma dirección; reset si cambia
    if (
      (delta > 0 && accumulatedDeltaRef.current < 0) ||
      (delta < 0 && accumulatedDeltaRef.current > 0)
    ) {
      accumulatedDeltaRef.current = delta;
    } else {
      accumulatedDeltaRef.current += delta;
    }

    // Scroll down acumulado → ocultar
    if (accumulatedDeltaRef.current > scrollDelta) {
      setShouldShow((prev) => {
        if (!prev) return prev;
        lockUntilRef.current = now + transitionDuration + 200;
        return false;
      });
      accumulatedDeltaRef.current = 0;
    }
    // Scroll up acumulado → mostrar
    else if (accumulatedDeltaRef.current < -scrollDelta) {
      setShouldShow((prev) => {
        if (prev) return prev;
        lockUntilRef.current = now + transitionDuration + 200;
        return true;
      });
      accumulatedDeltaRef.current = 0;
    }
  }, [scrollDelta, transitionDuration]);

  useEffect(() => {
    if (!isMobile || disabled) {
      setShouldShow(true);
      return;
    }

    // Los eventos `scroll` NO burbujean, pero SÍ se propagan en fase de
    // captura. Escuchamos en `document` con `capture: true` para enterarnos
    // del scroll de CUALQUIER contenedor (el <main> del layout, el contenedor
    // interno de una página app-shell, o el documento), sin depender de
    // acertar cuál es el scroller real de cada página.
    const leerScrollTop = (target: EventTarget | null): number | null => {
      if (!target || target === document || target === window ||
          target === document.documentElement || target === document.body) {
        return window.scrollY || document.documentElement.scrollTop || 0;
      }
      if (target instanceof HTMLElement) {
        // Ignorar scrollers puramente horizontales (carruseles nativos):
        // no aportan dirección vertical para ocultar/mostrar el navbar.
        if (target.scrollHeight <= target.clientHeight) return null;
        return target.scrollTop;
      }
      return null;
    };

    const onScroll = (e: Event) => {
      const scrollTop = leerScrollTop(e.target);
      if (scrollTop === null) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => handleScroll(scrollTop));
    };

    document.addEventListener('scroll', onScroll, { passive: true, capture: true });

    return () => {
      document.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile, disabled, handleScroll]);

  // Transform
  const getTransform = (): string => {
    if (shouldShow) return 'translateY(0)';
    return direction === 'down' ? 'translateY(calc(100% + 23px))' : 'translateY(-100%)';
  };

  const hideStyle: React.CSSProperties = {
    transform: getTransform(),
    transition: `transform ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    willChange: 'transform',
  };

  const forzarMostrar = useCallback(() => {
    setShouldShow(true);
  }, []);

  return { shouldShow, hideStyle, forzarMostrar };
}

export default useHideOnScroll;