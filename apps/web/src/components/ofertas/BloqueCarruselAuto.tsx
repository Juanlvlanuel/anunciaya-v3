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

import { useEffect, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import CardOfertaCarrusel from './CardOfertaCarrusel';
import TituloDeBloque from './TituloDeBloque';
import type { OfertaFeed } from '@/types/ofertas';

interface BloqueCarruselAutoProps {
  eyebrow: string;
  titulo: string;
  /** Ícono Lucide opcional para el cuadrado negro junto al título. */
  iconoLucide?: LucideIcon;
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

/* Pausa al hover (desktop) o press (móvil/touch) */
.carrusel-auto-viewport:hover .carrusel-auto-track,
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
        <div className="flex gap-2.5 overflow-hidden">
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
        // Viewport: oculta el desbordamiento del track infinito
        <div className="carrusel-auto-viewport relative w-full overflow-x-hidden">
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
      )}
    </section>
  );
}
