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
import { useMainScrollStore } from '../stores/useMainScrollStore';

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

  const mainScrollRef = useMainScrollStore((s) => s.mainScrollRef);

  const [shouldShow, setShouldShow] = useState(true);

  // Refs para tracking interno
  const lastScrollTopRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);
  const lockUntilRef = useRef(0);
  const rafRef = useRef(0);

  const handleScroll = useCallback(() => {
    const el = mainScrollRef?.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
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
  }, [mainScrollRef, scrollDelta, transitionDuration]);

  useEffect(() => {
    if (!isMobile || disabled) {
      setShouldShow(true);
      return;
    }

    const el = mainScrollRef?.current;
    if (!el) return;

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(handleScroll);
    };

    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [isMobile, disabled, mainScrollRef, handleScroll]);

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

  return { shouldShow, hideStyle };
}

export default useHideOnScroll;