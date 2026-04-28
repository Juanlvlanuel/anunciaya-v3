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
 *   <div ref={refCarrusel} className="flex overflow-x-auto cursor-grab [&:active]:cursor-grabbing">
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

    let estaArrastrando = false;
    let inicioX = 0;
    let scrollInicial = 0;
    let sePresiono = false;

    const onMouseDown = (e: MouseEvent) => {
      // Solo click izquierdo
      if (e.button !== 0) return;
      sePresiono = true;
      estaArrastrando = false;
      inicioX = e.pageX - el.offsetLeft;
      scrollInicial = el.scrollLeft;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!sePresiono) return;
      // Activar arrastre solo cuando hay movimiento real (>3px) para no matar clicks
      const desplazamiento = e.pageX - el.offsetLeft - inicioX;
      if (!estaArrastrando && Math.abs(desplazamiento) < 3) return;
      if (!estaArrastrando) {
        // Primer frame de arrastre real: forzar cursor grabbing globalmente
        // (los descendientes con cursor-pointer anulan el cursor del contenedor)
        document.body.style.cursor = 'grabbing';
      }
      estaArrastrando = true;
      e.preventDefault();
      el.scrollLeft = scrollInicial - desplazamiento * 1.2;
    };

    const onMouseUp = () => {
      sePresiono = false;
      document.body.style.cursor = '';
      // Si hubo arrastre real, cancelar el próximo click para que no dispare acciones
      // (ej: abrir un artículo al arrastrar sobre él)
      if (estaArrastrando) {
        const cancelarClick = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        el.addEventListener('click', cancelarClick, { capture: true, once: true });
      }
      estaArrastrando = false;
    };

    const onMouseLeave = () => {
      sePresiono = false;
      estaArrastrando = false;
      document.body.style.cursor = '';
    };

    // Previene el drag nativo HTML5 de <img> (arrastrar imagen a otra pestaña).
    // Sin esto, el browser muestra un "velo fantasma" y el cursor 🚫, interfiriendo con el drag-to-scroll.
    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('dragstart', onDragStart);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('dragstart', onDragStart);
    };
  }, [ref]);
}

export default useDragScroll;
