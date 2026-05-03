/**
 * useCarruselRotativo.ts
 * =======================
 * Hook que rota un array de items con un intervalo. Pausa al hover.
 * Soporta swipe horizontal con efecto de drag-en-vivo (la oferta
 * actual se desplaza con el dedo y la siguiente/anterior asoma desde
 * el lado opuesto), igual al patrón del visor de imágenes de ChatYA.
 *
 * Devuelve:
 *  - `actual`, `anteriorItem`, `siguienteItem`: los 3 items relevantes
 *    para renderizar el efecto de transición. Los vecinos hacen wrap
 *    (último ↔ primero) si la lista tiene >=2 items.
 *  - `index`, `total`: para indicadores tipo dots.
 *  - `offsetPx`: desplazamiento horizontal en píxeles del item actual
 *    durante el drag. 0 cuando no se está arrastrando.
 *  - `enTransicion`: true durante la animación de snap (después de soltar
 *    el dedo). El consumer debe aplicar `transition: transform 200ms`
 *    solo cuando es true, para que el drag en vivo NO tenga lag.
 *  - `setWrapperRef`: callback ref que el consumer pega al contenedor
 *    para que el hook mida su ancho y sepa cuánto desplazar al snap.
 *  - `pausarHover`: handlers para `onMouseEnter`/`onMouseLeave`.
 *  - `swipeHandlers`: handlers para `onTouchStart/Move/End`.
 *  - `siguiente()` / `anterior()`: avance manual programático.
 *
 * Si la lista tiene 0 o 1 items, no hay rotación ni swipe activo.
 *
 * Respeta `prefers-reduced-motion` para el autoplay (no para el swipe
 * manual, que es input directo del usuario).
 *
 * Ubicación: apps/web/src/hooks/useCarruselRotativo.ts
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

interface RetornoCarruselRotativo<T> {
  actual: T | null;
  anteriorItem: T | null;
  siguienteItem: T | null;
  index: number;
  total: number;
  offsetPx: number;
  enTransicion: boolean;
  setWrapperRef: (el: HTMLElement | null) => void;
  pausarHover: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  siguiente: () => void;
  anterior: () => void;
  swipeHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

const SWIPE_UMBRAL_PX = 60;
const DURACION_SNAP_MS = 220;

export function useCarruselRotativo<T>(
  items: T[],
  intervaloMs: number = 7000,
): RetornoCarruselRotativo<T> {
  const [index, setIndex] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [offsetPx, setOffsetPx] = useState(0);
  const [enTransicion, setEnTransicion] = useState(false);

  const wrapperRef = useRef<HTMLElement | null>(null);
  const animandoRef = useRef(false);

  const setWrapperRef = useCallback((el: HTMLElement | null) => {
    wrapperRef.current = el;
  }, []);

  // Si la lista cambia de tamaño y el índice queda fuera, vuelve a 0.
  useEffect(() => {
    if (index >= items.length && items.length > 0) {
      setIndex(0);
    }
  }, [items.length, index]);

  // Autoplay
  useEffect(() => {
    if (items.length <= 1 || pausado || animandoRef.current) return;
    if (typeof window !== 'undefined') {
      const prefiereReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefiereReduce) return;
    }
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, intervaloMs);
    return () => clearInterval(id);
  }, [items.length, intervaloMs, pausado]);

  const siguiente = useCallback(() => {
    if (items.length <= 1) return;
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const anterior = useCallback(() => {
    if (items.length <= 1) return;
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  // ── Swipe / drag-en-vivo ──────────────────────────────────────────
  // Patrón del visor de ChatYA: en touchstart guarda posición, en
  // touchmove detecta dirección (horizontal vs vertical) tras 8px y si
  // es horizontal aplica el delta como offsetPx en vivo. En touchend
  // anima al snap (siguiente/anterior si delta > umbral, sino vuelve a 0).
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const swipeDireccion = useRef<'none' | 'horizontal' | 'vertical'>('none');
  const swiping = useRef(false);
  // rAF batching: en lugar de un setState por cada touchmove (~60/s, lo
  // que fuerza re-render del árbol completo y se siente "duro"), guardamos
  // el offset pendiente en un ref y solo aplicamos al siguiente frame.
  const rafIdRef = useRef<number | null>(null);
  const offsetPendienteRef = useRef(0);

  const flushOffset = useCallback(() => {
    rafIdRef.current = null;
    setOffsetPx(offsetPendienteRef.current);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (animandoRef.current) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    swipeDireccion.current = 'none';
    swiping.current = true;
    setPausado(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping.current || animandoRef.current) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Detectar dirección dominante tras 8px de movimiento
    if (swipeDireccion.current === 'none') {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        swipeDireccion.current = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal';
      } else {
        return;
      }
    }

    if (swipeDireccion.current === 'horizontal') {
      // Si solo hay 1 item, agrega resistencia (no debería poder arrastrarse mucho)
      const nuevoOffset = items.length <= 1 ? dx * 0.2 : dx;
      offsetPendienteRef.current = nuevoOffset;
      // Solo programa un setState al próximo frame si no hay ya uno pendiente.
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(flushOffset);
      }
    }
    // Vertical: no hacemos nada (dejamos que el scroll de la página actúe)
  }, [items.length, flushOffset]);

  const onTouchEnd = useCallback(() => {
    // Cancela cualquier rAF pendiente y aplica el último offset sincrónico
    // antes de calcular la dirección del snap.
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (!swiping.current || animandoRef.current) {
      setPausado(false);
      return;
    }
    swiping.current = false;
    const dir = swipeDireccion.current;
    swipeDireccion.current = 'none';

    if (dir !== 'horizontal' || items.length <= 1) {
      setOffsetPx(0);
      setPausado(false);
      return;
    }

    // Usa el offset pendiente más reciente (más fresco que el state).
    const delta = offsetPendienteRef.current;
    const cw = wrapperRef.current?.clientWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 320);

    if (delta < -SWIPE_UMBRAL_PX) {
      // Swipe izquierda → siguiente. Animar offsetPx a -cw, luego saltar
      // a 0 + cambiar índice (sin transición para que no se vea el salto).
      animandoRef.current = true;
      setEnTransicion(true);
      setOffsetPx(-cw);
      setTimeout(() => {
        setEnTransicion(false);
        setOffsetPx(0);
        setIndex((i) => (i + 1) % items.length);
        animandoRef.current = false;
        setPausado(false);
      }, DURACION_SNAP_MS);
    } else if (delta > SWIPE_UMBRAL_PX) {
      // Swipe derecha → anterior
      animandoRef.current = true;
      setEnTransicion(true);
      setOffsetPx(cw);
      setTimeout(() => {
        setEnTransicion(false);
        setOffsetPx(0);
        setIndex((i) => (i - 1 + items.length) % items.length);
        animandoRef.current = false;
        setPausado(false);
      }, DURACION_SNAP_MS);
    } else {
      // Snap back al centro (delta insuficiente)
      setEnTransicion(true);
      setOffsetPx(0);
      setTimeout(() => {
        setEnTransicion(false);
        setPausado(false);
      }, DURACION_SNAP_MS);
    }
  }, [items.length]);

  // Cleanup del rAF al desmontar el hook
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // Cálculo de vecinos con wrap (último ↔ primero)
  const total = items.length;
  const actual = total > 0 ? items[index % total] : null;
  const anteriorItem = total > 1 ? items[(index - 1 + total) % total] : null;
  const siguienteItem = total > 1 ? items[(index + 1) % total] : null;

  return {
    actual,
    anteriorItem,
    siguienteItem,
    index: total > 0 ? index % total : 0,
    total,
    offsetPx,
    enTransicion,
    setWrapperRef,
    pausarHover: {
      onMouseEnter: () => setPausado(true),
      onMouseLeave: () => setPausado(false),
    },
    siguiente,
    anterior,
    swipeHandlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}

export default useCarruselRotativo;
