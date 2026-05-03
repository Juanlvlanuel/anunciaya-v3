/**
 * useViewTracker.ts
 * ==================
 * Hook que registra una "vista" (impression) cuando un elemento permanece
 * visible en el viewport por encima de un umbral durante un tiempo mínimo.
 *
 * Estándar de la industria (Facebook ads, Google Display): el contenido
 * cuenta como "visto" cuando ≥50% de sus pixeles son visibles durante
 * ≥1 segundo continuo. Esto evita contar scrolls rápidos como vistas
 * infladas y aproxima mejor lo que un humano realmente percibió.
 *
 * Comportamiento:
 *  - Solo dispara `onVisto` UNA vez por montaje del componente. Si el
 *    elemento sale y vuelve a entrar al viewport, NO re-dispara.
 *  - Anti-inflación a nivel red está garantizada por el backend
 *    (índice único `(oferta, usuario, día)`), así que aunque el hook
 *    dispare múltiples veces por error, la BD lo ignora.
 *  - Respeta `prefers-reduced-motion`: el comportamiento no cambia
 *    porque IntersectionObserver no tiene animación.
 *
 * Ubicación: apps/web/src/hooks/useViewTracker.ts
 */

import { useEffect, useRef, type RefObject } from 'react';

interface OpcionesViewTracker {
  /**
   * Callback que se dispara cuando el elemento cumple el criterio de
   * "visto". Se llama UNA sola vez por montaje del componente.
   */
  onVisto: () => void;
  /**
   * Porcentaje de pixeles del elemento que deben ser visibles para que
   * empiece a contar el tiempo. Default 0.5 (50%).
   */
  umbralVisibilidad?: number;
  /**
   * Tiempo continuo en ms que el elemento debe permanecer visible para
   * disparar `onVisto`. Default 1000 (1 segundo).
   */
  tiempoMinimoMs?: number;
  /**
   * Si `false`, el hook no observa nada. Útil cuando no hay datos aún.
   * Default `true`.
   */
  habilitado?: boolean;
}

/**
 * Adjunta el observer al elemento referenciado por `ref`. Cuando cumple
 * el criterio (≥50% visible por ≥1s por default), llama a `onVisto`
 * una sola vez. Después se desconecta automáticamente.
 */
export function useViewTracker<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  opciones: OpcionesViewTracker,
): void {
  const {
    onVisto,
    umbralVisibilidad = 0.5,
    tiempoMinimoMs = 1000,
    habilitado = true,
  } = opciones;

  // Guardamos `onVisto` en un ref para que el effect no re-corra cuando
  // el padre re-renderiza con una función nueva (callbacks inline).
  const onVistoRef = useRef(onVisto);
  useEffect(() => { onVistoRef.current = onVisto; }, [onVisto]);

  useEffect(() => {
    if (!habilitado) return;
    const elemento = ref.current;
    if (!elemento) return;
    if (typeof IntersectionObserver === 'undefined') return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let yaDisparado = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (yaDisparado) return;
        if (entry.isIntersecting && entry.intersectionRatio >= umbralVisibilidad) {
          // Empezar timer si aún no está corriendo
          if (timer === null) {
            timer = setTimeout(() => {
              yaDisparado = true;
              try { onVistoRef.current(); } catch { /* silent */ }
              observer.disconnect();
            }, tiempoMinimoMs);
          }
        } else {
          // Salió del viewport antes de cumplir el tiempo: cancelar timer
          if (timer !== null) {
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      // Threshold debe ser >= umbralVisibilidad para que IO dispare al cruzarlo.
      { threshold: [umbralVisibilidad] },
    );

    observer.observe(elemento);

    return () => {
      if (timer !== null) clearTimeout(timer);
      observer.disconnect();
    };
  }, [ref, habilitado, umbralVisibilidad, tiempoMinimoMs]);
}

export default useViewTracker;
