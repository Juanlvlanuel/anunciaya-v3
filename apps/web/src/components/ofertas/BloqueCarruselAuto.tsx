/**
 * BloqueCarruselAuto.tsx
 * =======================
 * Carrusel horizontal con autoplay (loop infinito sin corte) que se pausa
 * al hover (desktop) o touch (móvil). Reemplaza al `BloqueCarrusel` viejo.
 *
 * Implementación CSS: track con `display: flex` y `animation: scroll-x 25s
 * linear infinite`. Cards renderizadas DOS VECES (originales + duplicado)
 * para que al llegar al final el track esté en la misma posición visual
 * que al principio — loop sin corte.
 *
 * Respeta `prefers-reduced-motion`: si el usuario tiene activada la
 * preferencia del sistema, la animación se detiene y queda como scroll
 * manual horizontal.
 *
 * Lista vacía → no renderiza nada (silencio total, ni el título).
 *
 * Ubicación: apps/web/src/components/ofertas/BloqueCarruselAuto.tsx
 */

import { useEffect, useMemo, useRef, type ComponentType } from 'react';
import { ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import CardOfertaCarrusel from './CardOfertaCarrusel';
import TituloDeBloque from './TituloDeBloque';
import type { OfertaFeed } from '@/types/ofertas';

/** Tipo que admite tanto LucideIcon (forwardRef) como wrappers locales Iconify. */
type IconLike =
  | LucideIcon
  | ComponentType<{ className?: string; strokeWidth?: number; fill?: string; width?: number | string; height?: number | string }>;

interface BloqueCarruselAutoProps {
  eyebrow: string;
  titulo: string;
  /** Ícono opcional para el cuadrado negro junto al título. Acepta LucideIcon o wrappers Iconify. */
  iconoLucide?: IconLike;
  ofertas: OfertaFeed[];
  cargando: boolean;
  onClickOferta: (oferta: OfertaFeed) => void;
  /** Microseñal opcional por ofertaId. Se pasa a `CardOfertaCarrusel`. */
  microsenales?: Record<string, 'vence_pronto' | 'nueva' | 'popular'>;
  /** Override de la línea ámbar del título (ver `TituloDeBloque`). */
  anchoUnderline?: 'corto' | 'normal';
}

// =============================================================================
// ESTILOS GLOBALES (inyectados una sola vez al montar)
// =============================================================================

const STYLES_ID = 'bloque-carrusel-auto-styles';
const STYLES_CSS = `
@keyframes carrusel-auto-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.carrusel-auto-track {
  display: flex;
  gap: 10px;
  width: max-content;
  animation: carrusel-auto-scroll 40s linear infinite;
  will-change: transform;
}

/* Pausa al hover (desktop) o press (móvil/touch) — el hover vive en el
   wrapper exterior (incluye las flechas) para que pasar el mouse sobre
   ellas también pause, y se reanude apenas el mouse sale del bloque. */
.carrusel-auto-wrapper:hover .carrusel-auto-track,
.carrusel-auto-viewport:active .carrusel-auto-track {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  .carrusel-auto-track {
    animation: none !important;
    width: auto;
  }
  .carrusel-auto-viewport {
    overflow-x: auto;
  }
}
`;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function BloqueCarruselAuto({
  eyebrow,
  titulo,
  iconoLucide,
  ofertas,
  cargando,
  onClickOferta,
  microsenales,
  anchoUnderline,
}: BloqueCarruselAutoProps) {
  // Inyectar estilos CSS una sola vez
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLES_ID)) return;
    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = STYLES_CSS;
    document.head.appendChild(style);
  }, []);

  const slug = useMemo(() => slugify(eyebrow), [eyebrow]);

  // Flechas manuales: desplazan el viewport (overflow-x-hidden permite
  // `scrollBy` aunque no muestre scrollbar). No pausan nada de forma
  // permanente — el propio `:hover` del wrapper ya pausa el autoplay
  // mientras el mouse está encima (incluye las flechas) y lo reanuda al
  // salir, así que no hace falta estado propio.
  const viewportRef = useRef<HTMLDivElement>(null);
  const desplazar = (direccion: 1 | -1) => {
    viewportRef.current?.scrollBy({ left: direccion * 240, behavior: 'smooth' });
  };

  // Lista vacía después de cargar → bloque silencio (ni título)
  if (!cargando && ofertas.length === 0) return null;

  return (
    <section
      data-testid={`carrusel-auto-${slug}`}
      className="mb-7 lg:mb-9 2xl:mb-11"
    >
      <TituloDeBloque
        eyebrow={eyebrow}
        titulo={titulo}
        iconoLucide={iconoLucide}
        anchoUnderline={anchoUnderline}
      />

      {cargando && ofertas.length === 0 ? (
        // Skeletons estáticos (no animar — queda raro con el carrusel)
        <div className="flex gap-2.5 overflow-hidden -mx-4 px-4 lg:mx-0 lg:px-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="shrink-0 w-[200px] lg:w-[220px] 2xl:w-[240px]"
            >
              <div className="w-full aspect-square rounded-lg bg-[#e8e6e0]" />
              <div className="pt-2 space-y-1">
                <div className="h-2 w-2/3 rounded bg-[#e8e6e0]" />
                <div className="h-3 w-full rounded bg-[#e8e6e0]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Wrapper exterior FIJO (no scrollea): ancla las flechas y controla
        // el hover-pausa. El viewport interior es el único que se scrollea
        // (scrollBy de las flechas), así los botones no se arrastran con
        // las imágenes.
        <div className="carrusel-auto-wrapper group/carrusel relative -mx-4 lg:mx-0">
          <div
            ref={viewportRef}
            className="carrusel-auto-viewport overflow-x-hidden"
          >
            <div className="carrusel-auto-track">
              {/* Originales + duplicado para loop sin corte */}
              {[...ofertas, ...ofertas].map((oferta, idx) => (
                <CardOfertaCarrusel
                  key={`${oferta.ofertaId}-${idx}`}
                  oferta={oferta}
                  microsenal={microsenales?.[oferta.ofertaId] ?? null}
                  onClick={() => onClickOferta(oferta)}
                />
              ))}
            </div>
          </div>

          {/* Flechas manuales — mismo estilo dark que MarketPlace/Servicios.
              Solo desktop (lg+); en móvil el usuario desliza directo. */}
          {ofertas.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={() => desplazar(-1)}
                className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-200 group-hover/carrusel:opacity-100 cursor-pointer"
              >
                <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                aria-label="Siguiente"
                onClick={() => desplazar(1)}
                className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-200 group-hover/carrusel:opacity-100 cursor-pointer"
              >
                <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
