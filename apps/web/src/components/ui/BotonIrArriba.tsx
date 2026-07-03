/**
 * BotonIrArriba.tsx
 * =================
 * FAB flotante "ir arriba" reutilizable en cualquier sección bajo MainLayout.
 *
 * Nace del Home (Pregúntale a Peñasco) y se extrae aquí para reusarlo en las
 * secciones con feed largo (MarketPlace, Servicios, Negocios, etc.).
 *
 * Cómo funciona:
 *   - Aparece al bajar más de `umbral` px (default 300) y sube al top con
 *     scroll suave.
 *   - Lee el scroll del `<main>` vía `useMainScrollStore`; si no hay ref
 *     (páginas con scroll en `window` en móvil) cae a `window`. Cubre ambos.
 *   - Móvil: se acomoda hacia arriba cuando el BottomNav está visible
 *     (`conBottomNav`). Escritorio: posición fija abajo-derecha (sin BottomNav).
 *   - Se auto-portalea al `body`, así que da igual dónde se monte en el árbol.
 *
 * Apilamiento: si la página ya tiene otro FAB en la esquina (ej. "Publicar"),
 * usar `apilarMovil` / `apilarEscritorio` (en rem) para subir la flecha por
 * encima de ese FAB y que no se encimen.
 *
 * Casos especiales (Negocios modo mapa):
 *   - `scrollRef` — vigila/sube un contenedor interno (la lista de cards),
 *     no el `<main>`.
 *   - `anclarDerechaRef` — pega la flecha al borde derecho de una columna
 *     centrada (medido en vivo), donde un `right` fijo no alcanza.
 *
 * Ubicación: apps/web/src/components/ui/BotonIrArriba.tsx
 */

import { useEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUp } from 'lucide-react';
import { useMainScrollStore } from '../../stores/useMainScrollStore';
import { useScrollDirection } from '../../hooks/useScrollDirection';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface BotonIrArribaProps {
  /** Px de scroll para que aparezca (default: 300). */
  umbral?: number;
  /** Móvil: subir la flecha cuando el BottomNav está visible (default: true). */
  conBottomNav?: boolean;
  /** Rem extra desde abajo en móvil, para apilar sobre otro FAB (default: 0). */
  apilarMovil?: number;
  /** Rem extra desde abajo en escritorio, para apilar sobre otro FAB (default: 0). */
  apilarEscritorio?: number;
  /**
   * Clase(s) Tailwind de posición horizontal. El default cae en el canal
   * entre el feed y la columna derecha global (mismo eje que el FAB "Publicar"
   * de MarketPlace/Servicios). En móvil, esquina derecha (`right-4`).
   */
  right?: string;
  /** data-testid del botón (default: 'boton-ir-arriba'). */
  testId?: string;
  /**
   * Contenedor scrolleable a vigilar y al que se hace scroll-to-top. Por
   * defecto usa el `<main>` global (o `window`). Pásalo cuando el scroll
   * viva en un contenedor interno (ej. la lista de cards del modo mapa).
   */
  scrollRef?: RefObject<HTMLElement | null>;
  /**
   * Ancla la flecha al borde derecho de este elemento (medido en vivo), en
   * vez de a la clase `right`. Úsalo con columnas centradas cuya posición
   * varía con el ancho de ventana (ej. lista de cards en modo mapa).
   */
  anclarDerechaRef?: RefObject<HTMLElement | null>;
  /**
   * Desplazamiento horizontal (px) respecto al borde derecho medido, sólo
   * cuando se usa `anclarDerechaRef`. Mayor = más a la IZQUIERDA (hacia la
   * columna). Default: 24 (centra el botón de 48px sobre el borde).
   */
  anclaOffsetX?: number;
  /**
   * Mostrar solo en móvil (< lg). Útil cuando en desktop el contenedor ya
   * tiene su propio scroll interno (ej. una tabla) y la flecha global no
   * aplica. Default: false.
   */
  soloMovil?: boolean;
  /**
   * Mostrar solo en escritorio (≥ lg). Complemento de `soloMovil`: para vistas
   * donde el scroll útil en PC vive en un contenedor interno (tabla, vía
   * `scrollRef`) y en móvil ya hay otra flecha sobre el scroll de página.
   * Default: false.
   */
  soloEscritorio?: boolean;
}

export function BotonIrArriba({
  umbral = 300,
  conBottomNav = true,
  apilarMovil = 0,
  apilarEscritorio = 0,
  right = 'right-4 lg:right-[265px] 2xl:right-[335px]',
  testId = 'boton-ir-arriba',
  scrollRef,
  anclarDerechaRef,
  anclaOffsetX = 24,
  soloMovil = false,
  soloEscritorio = false,
}: BotonIrArribaProps) {
  const mainScrollRef = useMainScrollStore((s) => s.mainScrollRef);
  // Contenedor de scroll efectivo: el explícito (ej. lista de cards) o el
  // <main> global. Si su `.current` es null, useScrollDirection cae a window.
  const scrollRefUsado = scrollRef ?? mainScrollRef ?? undefined;
  const { scrollY } = useScrollDirection({ scrollRef: scrollRefUsado });
  const { shouldShow: bottomNavVisible } = useHideOnScroll({ direction: 'down' });
  const { esEscritorio } = useBreakpoint();

  const mostrar = scrollY > umbral;

  const irArriba = () => {
    const el = scrollRefUsado?.current;
    if (el) el.scrollTo({ top: 0, behavior: 'smooth' });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Anclaje horizontal medido: cuando la flecha debe pegarse al borde derecho
  // de una columna centrada (ej. lista de cards en modo mapa), calculamos el
  // `left` en vivo — un `right` fijo no sirve porque la columna se recentra
  // con el ancho de ventana. Se recalcula al montar, en resize y si la
  // columna cambia de tamaño.
  const [leftAncla, setLeftAncla] = useState<number | null>(null);
  useEffect(() => {
    if (!anclarDerechaRef) {
      setLeftAncla(null);
      return;
    }
    const recalcular = () => {
      const nodo = anclarDerechaRef.current;
      if (!nodo) return;
      // `anclaOffsetX` (default 24) centra el botón de 48px sobre el borde.
      setLeftAncla(nodo.getBoundingClientRect().right - anclaOffsetX);
    };
    recalcular();
    // La columna cambia de tamaño al filtrar; el RO lo capta. El scroll interno
    // NO mueve su rect (contenedor fijo), así que no escuchamos scroll.
    const observador = new ResizeObserver(recalcular);
    if (anclarDerechaRef.current) observador.observe(anclarDerechaRef.current);
    window.addEventListener('resize', recalcular);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', recalcular);
    };
  }, [anclarDerechaRef, anclaOffsetX]);

  // Posición vertical: escritorio = fijo 1.5rem (bottom-6); móvil = sube a 5rem
  // cuando el BottomNav asoma para no quedar tapada.
  const bottomRem = esEscritorio
    ? 1.5 + apilarEscritorio
    : (conBottomNav && bottomNavVisible ? 5 : 1) + apilarMovil;

  // Visibilidad por breakpoint (display = flex salvo que se acote a un lado).
  const displayClass = soloMovil ? 'flex lg:hidden' : soloEscritorio ? 'hidden lg:flex' : 'flex';

  if (typeof document === 'undefined') return null;

  return createPortal(
    <button
      type="button"
      onClick={irArriba}
      aria-label="Ir arriba"
      data-testid={testId}
      style={{
        bottom: `${bottomRem}rem`,
        ...(leftAncla !== null ? { left: `${leftAncla}px` } : {}),
        transition: 'bottom 300ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease-out',
      }}
      className={`${displayClass} fixed ${leftAncla === null ? right : ''} z-30 h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-slate-800 to-slate-950 text-white shadow-lg active:scale-95 lg:cursor-pointer lg:hover:scale-105 ${
        mostrar ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <ArrowUp className="h-6 w-6" strokeWidth={2.5} />
    </button>,
    document.body,
  );
}

export default BotonIrArriba;
