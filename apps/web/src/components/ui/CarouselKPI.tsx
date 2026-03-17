/**
 * CarouselKPI.tsx
 * ===============
 * Wrapper para carousels horizontales de KPIs con fade dinámico.
 * - Fade derecho: visible cuando hay más items a la derecha
 * - Fade izquierdo: visible cuando hay items a la izquierda (ya scrolleaste)
 * - Ambos desaparecen al llegar al extremo correspondiente
 * - Solo en móvil (< lg)
 *
 * Ubicación: apps/web/src/components/ui/CarouselKPI.tsx
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface CarouselKPIProps {
  children: React.ReactNode;
  className?: string;
}

const FADE_COLOR = 'rgba(15, 23, 42, 0.45)';

export function CarouselKPI({ children, className = '' }: CarouselKPIProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [enInicio, setEnInicio] = useState(true);
  const [enFin, setEnFin] = useState(false);
  const [tieneScroll, setTieneScroll] = useState(false);

  const verificarScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const scrolleable = el.scrollWidth > el.clientWidth + 2;
    setTieneScroll(scrolleable);

    if (!scrolleable) {
      setEnInicio(true);
      setEnFin(true);
      return;
    }

    setEnInicio(el.scrollLeft <= 3);
    setEnFin(el.scrollLeft + el.clientWidth >= el.scrollWidth - 3);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    verificarScroll();

    el.addEventListener('scroll', verificarScroll, { passive: true });

    const ro = new ResizeObserver(verificarScroll);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', verificarScroll);
      ro.disconnect();
    };
  }, [verificarScroll]);

  return (
    <div className={`relative ${className}`}>
      {/* Contenedor scrolleable */}
      <div
        ref={scrollRef}
        className="overflow-x-auto lg:overflow-visible"
        style={{ scrollbarWidth: 'none' }}
      >
        {children}
      </div>

      {/* Fade izquierdo */}
      {tieneScroll && !enInicio && (
        <div
          className="absolute left-0 top-0 bottom-0 w-7 pointer-events-none z-10 lg:hidden"
          style={{ background: `linear-gradient(to right, ${FADE_COLOR}, transparent)` }}
        />
      )}

      {/* Fade derecho */}
      {tieneScroll && !enFin && (
        <div
          className="absolute right-0 top-0 bottom-0 w-7 pointer-events-none z-10 lg:hidden"
          style={{ background: `linear-gradient(to left, ${FADE_COLOR}, transparent)` }}
        />
      )}
    </div>
  );
}
