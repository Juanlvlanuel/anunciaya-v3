/**
 * useCarruselRotativo.ts
 * =======================
 * Hook de carrusel rotativo construido sobre **Embla Carousel**.
 *
 * **Por qué Embla y no un drag-handler propio:**
 *
 *  El gesto "swipe" en móvil tiene un enemigo invisible: el browser corre
 *  su propia detección de scroll-vs-drag durante los primeros ~10–15 px de
 *  cada touch. Mientras decide, los `touchmove` llegan con
 *  `cancelable:false` y `preventDefault()` deja de servir. Esa es la
 *  "rigidez" perceptible — hay que mover el dedo con fuerza para que el
 *  browser ceda el gesto al JS.
 *
 *  Resolverlo a mano implica un engine que separe pointer input del
 *  rendering, mantenga velocity entre frames, y use el snap como objetivo
 *  asintótico (no como condición binaria con umbral). Embla ya lo hace,
 *  está mantenido y pesa ~3 KB gz.
 *
 * **Lo que aporta este wrapper sobre `useEmblaCarousel`:**
 *
 *  1. Mantiene el mismo nombre del hook — la página de Ofertas no
 *     necesita aprender una API distinta.
 *  2. Expone `actual`, `index`, `total`, `siguiente`, `anterior`,
 *     `pausarHover` — los datos que el consumidor ya usa.
 *  3. Conecta el plugin Autoplay (oficial) con el intervalo configurable.
 *  4. `pausarHover` para que el caller pueda pausar también al hover de
 *     la **sección** que envuelve al carrusel (el plugin solo pausa al
 *     entrar al viewport interno, no a la card padre).
 *  5. Respeta `prefers-reduced-motion` deteniendo el autoplay.
 *
 * **Estructura HTML que debe usar el consumer (patrón Embla nativo):**
 *
 *     <div ref={emblaRef} className="overflow-hidden">      // viewport
 *       <div className="flex">                              // container
 *         {items.map(item => (
 *           <div key={item.id} className="min-w-0 shrink-0 grow-0 basis-full">
 *             <Card ... />
 *           </div>
 *         ))}
 *       </div>
 *     </div>
 *
 * Ubicación: apps/web/src/hooks/useCarruselRotativo.ts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface RetornoCarruselRotativo<T> {
  items: T[];
  actual: T | null;
  index: number;
  total: number;
  /**
   * Ref que debe ir en el **viewport** (el div con `overflow-hidden` que
   * envuelve al container flex). Embla lo usa para medir y atrapar
   * eventos de pointer/touch.
   */
  emblaRef: ReturnType<typeof useEmblaCarousel>[0];
  /**
   * Instancia interna de Embla. Expuesta para que componentes
   * "satélite" (como los dots indicadores) puedan suscribirse a sus
   * eventos directamente y mantener su propio state local — evitando
   * pasar por el `setIndex` del hook que re-renderiza al consumidor
   * pesado del carrusel.
   */
  emblaApi: ReturnType<typeof useEmblaCarousel>[1];
  /**
   * Handlers para pausar el autoplay cuando el mouse entra a la sección
   * que envuelve al carrusel. El plugin Autoplay solo pausa con hover
   * sobre el viewport interno; estos lo extienden a la sección padre.
   */
  pausarHover: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  siguiente: () => void;
  anterior: () => void;
}

/**
 * Duración de la animación de snap (cuando el dedo suelta y la card
 * "engancha" al slide más cercano). Embla usa una unidad interna
 * proporcional a ms: 30 ≈ 300 ms. Subimos del 220 ms del patrón anterior
 * porque a 220 ms el snap se siente "instantáneo" — el ojo no alcanza
 * a percibir la transición y el cambio luce abrupto, como si la card
 * nueva apareciera de golpe en lugar de deslizarse.
 */
const DURACION_SNAP_EMBLA = 30;

/**
 * Píxeles mínimos de movimiento antes de que Embla considere que el
 * touch es un drag horizontal. Default de Embla es 10, lo bajamos a 4
 * para que un toque suave del dedo arranque la transición casi al
 * instante (responde antes que el browser piense en interpretar
 * scroll vertical).
 */
const UMBRAL_DRAG_PX = 4;

export function useCarruselRotativo<T>(
  items: T[],
  intervaloMs: number = 7000,
): RetornoCarruselRotativo<T> {
  const total = items.length;

  // Plugin Autoplay creado una sola vez por intervalo. Las opciones:
  //  - delay: tiempo entre slides
  //  - stopOnMouseEnter: pausa al hover sobre el viewport (desktop)
  //  - stopOnInteraction: false → tras un drag/click no se queda detenido,
  //    se reanuda automáticamente.
  //  - stopOnFocusIn: false → focus en hijos no detiene el ciclo.
  const autoplayPlugin = useMemo(
    () =>
      Autoplay({
        delay: intervaloMs,
        stopOnMouseEnter: true,
        stopOnInteraction: false,
        stopOnFocusIn: false,
      }),
    [intervaloMs],
  );

  // ⚠️ CRÍTICO: las opciones y plugins van memoizados.
  //
  // `useEmblaCarousel` reinicializa el carrusel cuando detecta que el
  // objeto de opciones o el array de plugins cambió por referencia. Si
  // los pasamos inline (`useEmblaCarousel({ ... }, [plugin])`), cada
  // render del componente que use este hook crea referencias nuevas y
  // dispara un reInit. Síntoma visible: al soltar el dedo a medio
  // camino de un swipe, el snap ya animándose se cancela por el reInit
  // y la card "salta" al slide final sin transición — lo que el usuario
  // percibe como "se queda pegada un momento y luego cambia de golpe".
  const emblaOptions = useMemo(
    () => ({
      loop: total > 1,
      duration: DURACION_SNAP_EMBLA,
      // align:'start' alinea cada slide al borde izquierdo del viewport.
      // Con slides de basis-full (100% del ancho) es indistinguible de
      // 'center', pero evita cálculos de offset internos que con
      // 'center' a veces causan que el primer slide no se posicione
      // exacto al inicializar.
      align: 'start' as const,
      // dragThreshold bajo = el dedo arranca la transición casi al
      // instante, sin esperar a moverse 10 px (default).
      dragThreshold: UMBRAL_DRAG_PX,
    }),
    [total],
  );

  const emblaPlugins = useMemo(() => [autoplayPlugin], [autoplayPlugin]);

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions, emblaPlugins);

  const [index, setIndex] = useState(0);

  // Sincronizamos el índice local cuando el snap **termina de animar**
  // (`settle`), no cuando empieza (`select`).
  //
  // Por qué: `setIndex` re-renderiza al consumidor del hook (la página
  // entera, que tiene varios carruseles auto, mapas, etc.). Un re-render
  // pesado mid-animación bloquea el thread principal y el rAF interno
  // de Embla pierde frames — el snap se siente "trabado": la card se
  // queda quieta un momento y luego brinca al final.
  //
  // Con `settle` el state se actualiza cuando ya no hay nada visible
  // que interrumpir.
  //
  // Trade-off: `index` queda rezagado ~300 ms respecto al slide
  // visible. Para los **dots indicadores** eso se nota como
  // desincronización. Por eso exponemos también `emblaApi` — el
  // componente de dots se suscribe a `select` con su propio state
  // local, así su re-render queda contenido en los dots sin tocar el
  // árbol del carrusel.
  useEffect(() => {
    if (!emblaApi) return;
    const sincronizarIndex = () => setIndex(emblaApi.selectedScrollSnap());
    sincronizarIndex();
    emblaApi.on('settle', sincronizarIndex);
    emblaApi.on('reInit', sincronizarIndex);
    return () => {
      emblaApi.off('settle', sincronizarIndex);
      emblaApi.off('reInit', sincronizarIndex);
    };
  }, [emblaApi]);

  // Respetar prefers-reduced-motion: si el usuario prefiere menos
  // movimiento, detenemos el autoplay. El swipe manual sigue activo.
  useEffect(() => {
    if (!emblaApi || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const aplicar = () => {
      const plugin = emblaApi.plugins().autoplay;
      if (!plugin) return;
      if (mq.matches) plugin.stop();
      else plugin.play();
    };
    aplicar();
    mq.addEventListener('change', aplicar);
    return () => mq.removeEventListener('change', aplicar);
  }, [emblaApi]);

  const siguiente = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const anterior = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  // pausarHover: extensión del stop/play del plugin a la sección que
  // envuelve al carrusel. Usamos refs porque emblaApi puede ser null en
  // el primer render y los handlers se capturan en JSX.
  const emblaApiRef = useRef(emblaApi);
  emblaApiRef.current = emblaApi;
  const pausarHover = useMemo(
    () => ({
      onMouseEnter: () => {
        emblaApiRef.current?.plugins().autoplay?.stop();
      },
      onMouseLeave: () => {
        emblaApiRef.current?.plugins().autoplay?.play();
      },
    }),
    [],
  );

  const safeIndex = total > 0 ? index % total : 0;
  const actual = total > 0 ? items[safeIndex] ?? null : null;

  return {
    items,
    actual,
    index: safeIndex,
    total,
    emblaRef,
    emblaApi,
    pausarHover,
    siguiente,
    anterior,
  };
}

export default useCarruselRotativo;
