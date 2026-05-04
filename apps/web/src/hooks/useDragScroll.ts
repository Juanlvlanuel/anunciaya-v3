/**
 * useDragScroll.ts
 * =================
 * Hook que habilita "click-and-drag" para scrollear horizontalmente un contenedor.
 *
 * ¿Para qué sirve?
 * - En desktop (con mouse), los scroll containers horizontales (carousels, listas)
 *   a menudo no son obvios como scrolleables. Este hook los convierte en arrastrables:
 *   clic y arrastrar desliza el contenido, como en Netflix/Spotify/Apple TV.
 * - En mobile (touch), no hace nada — el scroll nativo touch sigue funcionando igual.
 *
 * Uso:
 *   const refCarrusel = useRef<HTMLDivElement>(null);
 *   useDragScroll(refCarrusel);
 *
 *   <div ref={refCarrusel} className="flex overflow-x-auto cursor-grab active:cursor-grabbing select-none">
 *     {items...}
 *   </div>
 *
 * Ubicación: apps/web/src/hooks/useDragScroll.ts
 */

import { useEffect, type RefObject } from 'react';

export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let sePresiono = false;
    let estaArrastrando = false;
    let inicioX = 0;
    let scrollInicial = 0;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      sePresiono = true;
      estaArrastrando = false;
      inicioX = e.pageX;
      scrollInicial = el.scrollLeft;
      el.style.userSelect = 'none';
    };

    // mousemove en document para que funcione aunque el mouse salga del elemento
    const onMouseMove = (e: MouseEvent) => {
      if (!sePresiono) return;
      const desplazamiento = e.pageX - inicioX;
      if (!estaArrastrando && Math.abs(desplazamiento) < 3) return;
      if (!estaArrastrando) {
        estaArrastrando = true;
        document.body.style.cursor = 'grabbing';
      }
      e.preventDefault();
      el.scrollLeft = scrollInicial - desplazamiento * 1.2;
    };

    // mouseup en document para capturar el release fuera del elemento
    const onMouseUp = () => {
      if (!sePresiono) return;
      sePresiono = false;
      el.style.userSelect = '';
      document.body.style.cursor = '';
      if (estaArrastrando) {
        // Cancelar el click que sigue al drag para no abrir el artículo accidentalmente
        const cancelarClick = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        el.addEventListener('click', cancelarClick, { capture: true, once: true });
      }
      estaArrastrando = false;
    };

    // Previene arrastrar imágenes nativamente (velo fantasma del browser)
    const onDragStart = (e: DragEvent) => e.preventDefault();

    el.addEventListener('mousedown', onMouseDown);
    // passive: false es necesario para poder llamar preventDefault() en Chrome
    document.addEventListener('mousemove', onMouseMove, { passive: false });
    document.addEventListener('mouseup', onMouseUp);
    el.addEventListener('dragstart', onDragStart);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('dragstart', onDragStart);
      el.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [ref]);
}

export default useDragScroll;
