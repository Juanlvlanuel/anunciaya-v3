/**
 * useBreakpoint.ts
 * =================
 * Hook para detectar el breakpoint actual de la pantalla.
 *
 * ¿Qué hace?
 * - Detecta si estamos en móvil, laptop o desktop
 * - Usa los mismos breakpoints de Tailwind CSS
 * - Se actualiza automáticamente al cambiar el tamaño de ventana
 *
 * Breakpoints (consistentes con Tailwind):
 * - Móvil: < 1024px (base)
 * - Laptop: >= 1024px (lg:)
 * - Desktop: >= 1536px (2xl:)
 *
 * Uso:
 *   const { esMobile, esLaptop, esDesktop } = useBreakpoint();
 *
 *   if (esMobile) {
 *     return <ModalBottom ... />;
 *   } else {
 *     return <Modal ... />;
 *   }
 *
 * Ubicación: apps/web/src/hooks/useBreakpoint.ts
 */

import { useState, useEffect } from 'react';

// =============================================================================
// CONSTANTES - Breakpoints de Tailwind
// =============================================================================

const BREAKPOINTS = {
  lg: 1024,  // Laptop
  '2xl': 1536, // Desktop
} as const;

// =============================================================================
// TIPOS
// =============================================================================

interface BreakpointInfo {
  /** Ancho actual de la ventana */
  ancho: number;
  /** ¿Es móvil? (< 1024px) */
  esMobile: boolean;
  /** ¿Es laptop? (>= 1024px y < 1536px) */
  esLaptop: boolean;
  /** ¿Es desktop? (>= 1536px) */
  esDesktop: boolean;
  /** ¿Es laptop O desktop? (>= 1024px) - útil para "no móvil" */
  esEscritorio: boolean;
  /** Breakpoint actual: 'mobile' | 'laptop' | 'desktop' */
  breakpoint: 'mobile' | 'laptop' | 'desktop';
}

// =============================================================================
// HELPER - Calcular breakpoint
// =============================================================================

const calcularBreakpoint = (ancho: number): BreakpointInfo => {
  const esMobile = ancho < BREAKPOINTS.lg;
  const esLaptop = ancho >= BREAKPOINTS.lg && ancho < BREAKPOINTS['2xl'];
  const esDesktop = ancho >= BREAKPOINTS['2xl'];
  const esEscritorio = ancho >= BREAKPOINTS.lg;

  let breakpoint: 'mobile' | 'laptop' | 'desktop' = 'mobile';
  if (esDesktop) breakpoint = 'desktop';
  else if (esLaptop) breakpoint = 'laptop';

  return {
    ancho,
    esMobile,
    esLaptop,
    esDesktop,
    esEscritorio,
    breakpoint,
  };
};

// =============================================================================
// HOOK
// =============================================================================

export function useBreakpoint(): BreakpointInfo {
  // Estado inicial - usar 0 para SSR, se actualiza en useEffect
  const [info, setInfo] = useState<BreakpointInfo>(() => {
    // Si estamos en el navegador, usar el ancho real
    if (typeof window !== 'undefined') {
      return calcularBreakpoint(window.innerWidth);
    }
    // SSR fallback - asumir móvil
    return calcularBreakpoint(0);
  });

  useEffect(() => {
    // Función para actualizar el estado
    const handleResize = () => {
      setInfo(calcularBreakpoint(window.innerWidth));
    };

    // Actualizar inmediatamente (por si el estado inicial fue SSR)
    handleResize();

    // Escuchar cambios de tamaño
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return info;
}

export default useBreakpoint;