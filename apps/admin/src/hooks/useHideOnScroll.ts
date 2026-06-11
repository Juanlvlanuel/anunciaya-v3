/**
 * useHideOnScroll.ts
 * ===================
 * Detecta la dirección del scroll del contenedor registrado en `useScrollPanel` y actualiza
 * `navVisible` (oculta al bajar, muestra al subir). Calcado del mecanismo de la app pública (AY):
 *   - Acumula el delta de scroll y solo cambia al superar un umbral (anti-parpadeo).
 *   - Siempre visible cerca del tope (scrollTop < 10).
 *   - SOLO móvil: en escritorio la barra inferior no existe → no hace nada.
 *
 * Se llama UNA vez en `LayoutMovil`; la sección activa registra su contenedor con `setScrollEl`.
 *
 * Ubicación: apps/admin/src/hooks/useHideOnScroll.ts
 */

import { useEffect, useRef } from 'react';
import { useScrollPanel } from '../stores/useScrollPanel';
import { useEsEscritorio } from './useEsEscritorio';

/** Scroll acumulado (px) que hay que recorrer en una dirección para ocultar/mostrar la barra. */
const UMBRAL = 60;

export function useHideOnScroll(): void {
  const esEscritorio = useEsEscritorio();
  const scrollEl = useScrollPanel((s) => s.scrollEl);
  const setNavVisible = useScrollPanel((s) => s.setNavVisible);
  const ultimoTop = useRef(0);
  const acumulado = useRef(0);

  useEffect(() => {
    // En escritorio no hay barra inferior; sin contenedor no hay nada que escuchar.
    if (esEscritorio || !scrollEl) {
      setNavVisible(true);
      return;
    }

    ultimoTop.current = scrollEl.scrollTop;
    acumulado.current = 0;

    const alScroll = () => {
      const top = scrollEl.scrollTop;
      // Cerca del tope: siempre visible.
      if (top < 10) {
        setNavVisible(true);
        acumulado.current = 0;
        ultimoTop.current = top;
        return;
      }
      const delta = top - ultimoTop.current;
      ultimoTop.current = top;
      if (Math.abs(delta) < 2) return;
      // Si cambia de dirección, reinicia el acumulado; si la mantiene, suma.
      if ((delta > 0 && acumulado.current < 0) || (delta < 0 && acumulado.current > 0)) {
        acumulado.current = delta;
      } else {
        acumulado.current += delta;
      }
      if (acumulado.current > UMBRAL) {
        setNavVisible(false);
        acumulado.current = 0;
      } else if (acumulado.current < -UMBRAL) {
        setNavVisible(true);
        acumulado.current = 0;
      }
    };

    scrollEl.addEventListener('scroll', alScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', alScroll);
  }, [esEscritorio, scrollEl, setNavVisible]);
}
