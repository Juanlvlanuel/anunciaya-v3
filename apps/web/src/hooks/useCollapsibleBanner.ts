/**
 * useCollapsibleBanner.ts
 * =======================
 * Hook que controla el estado collapsed/expanded de un banner
 * basándose en la dirección del scroll.
 *
 * COMPORTAMIENTO:
 * - Scroll down → collapsed (banner mini)
 * - Scroll up  → expanded (banner completo)
 * - En el top   → siempre expanded
 * - Solo activo en mobile (< lg). En desktop siempre expanded.
 *
 * USO:
 *   const { isCollapsed, isMobile, bannerTransitionStyle } = useCollapsibleBanner();
 *
 *   return (
 *     <div style={bannerTransitionStyle}>
 *       {isCollapsed ? <BannerMini /> : <BannerCompleto />}
 *     </div>
 *   );
 *
 * UBICACIÓN: apps/web/src/hooks/useCollapsibleBanner.ts
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMainScrollStore } from '../stores/useMainScrollStore';

// =============================================================================
// TIPOS
// =============================================================================

interface UseCollapsibleBannerOptions {
  /** Duración de la transición en ms (default: 350) */
  transitionDuration?: number;
  /** Breakpoint para desktop en px (default: 1024 = lg) */
  desktopBreakpoint?: number;
  /** Scroll mínimo en px antes de permitir colapso (default: 100) */
  minScrollToCollapse?: number;
  /** Px de scroll acumulado en una dirección para disparar cambio (default: 60) */
  scrollDelta?: number;
  /** Desactivar colapso (ej: si un modal está abierto) */
  disabled?: boolean;
}

interface UseCollapsibleBannerReturn {
  isCollapsed: boolean;
  isMobile: boolean;
  bannerTransitionStyle: React.CSSProperties;
  scrollDirection: 'up' | 'down' | 'idle';
  isAtTop: boolean;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const DESKTOP_BREAKPOINT = 1024;

// =============================================================================
// HOOK
// =============================================================================

export function useCollapsibleBanner({
  transitionDuration = 350,
  desktopBreakpoint = DESKTOP_BREAKPOINT,
  minScrollToCollapse = 100,
  scrollDelta = 60,
  disabled = false,
}: UseCollapsibleBannerOptions = {}): UseCollapsibleBannerReturn {
  // Detectar mobile
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < desktopBreakpoint : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < desktopBreakpoint);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [desktopBreakpoint]);

  // Obtener scrollRef del store global
  const mainScrollRef = useMainScrollStore((s) => s.mainScrollRef);

  // Estado
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | 'idle'>('idle');
  const [isAtTop, setIsAtTop] = useState(true);

  // Refs para tracking interno (sin re-renders)
  const lastScrollTopRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);
  const lockUntilRef = useRef(0);
  const rafRef = useRef(0);

  const handleScroll = useCallback(() => {
    const el = mainScrollRef?.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const now = Date.now();

    // Actualizar isAtTop
    const atTop = scrollTop < 10;
    setIsAtTop(atTop);

    if (atTop) {
      setScrollDirection('idle');
      setIsCollapsed(false);
      accumulatedDeltaRef.current = 0;
      lastScrollTopRef.current = scrollTop;
      return;
    }

    // Si estamos en lock (transición reciente), solo trackear posición
    if (now < lockUntilRef.current) {
      lastScrollTopRef.current = scrollTop;
      return;
    }

    // Calcular delta desde última lectura
    const delta = scrollTop - lastScrollTopRef.current;
    lastScrollTopRef.current = scrollTop;

    // Ignorar deltas muy pequeños (ruido)
    if (Math.abs(delta) < 2) return;

    // Acumular delta en la misma dirección; resetear si cambia
    if (
      (delta > 0 && accumulatedDeltaRef.current < 0) ||
      (delta < 0 && accumulatedDeltaRef.current > 0)
    ) {
      // Dirección cambió → reset
      accumulatedDeltaRef.current = delta;
    } else {
      accumulatedDeltaRef.current += delta;
    }

    // Solo actuar cuando se acumula suficiente delta
    if (accumulatedDeltaRef.current > scrollDelta && scrollTop >= minScrollToCollapse) {
      // Scroll down acumulado → colapsar
      setScrollDirection('down');
      setIsCollapsed((prev) => {
        if (prev) return prev; // ya colapsado
        lockUntilRef.current = now + transitionDuration + 200;
        return true;
      });
      accumulatedDeltaRef.current = 0;
    } else if (accumulatedDeltaRef.current < -scrollDelta) {
      // Scroll up acumulado → expandir
      setScrollDirection('up');
      setIsCollapsed((prev) => {
        if (!prev) return prev; // ya expandido
        lockUntilRef.current = now + transitionDuration + 200;
        return false;
      });
      accumulatedDeltaRef.current = 0;
    }
  }, [mainScrollRef, scrollDelta, minScrollToCollapse, transitionDuration]);

  // Listener de scroll con rAF
  useEffect(() => {
    if (!isMobile || disabled) {
      setIsCollapsed(false);
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

  // Estilo de transición
  const bannerTransitionStyle: React.CSSProperties = {
    transition: `all ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    overflow: 'hidden',
  };

  return {
    isCollapsed,
    isMobile,
    bannerTransitionStyle,
    scrollDirection,
    isAtTop,
  };
}

export default useCollapsibleBanner;