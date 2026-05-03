/**
 * TickerOfertas.tsx
 * ==================
 * Franja "premium" tipo wall of brands. Muestra los negocios que tienen
 * ofertas activas hoy con su logo circular y nombre. Da identidad
 * editorial al feed sin saturar (descuentos y categorías ya viven en las
 * cards de los carruseles y la lista densa).
 *
 * Estilo coherente con el resto de la sección Ofertas:
 *  - Fondo blanco con borde superior/inferior beige (`#e8e6e0`).
 *  - Logo circular con ring ámbar (mismo patrón que `CardOfertaHero`).
 *  - Nombre del negocio bold, color `#1a1a1a`.
 *  - Edge-fade en ambos lados (gradiente de blanco) para que los items
 *    aparezcan/desaparezcan suavemente, sin corte abrupto.
 *
 * Velocidad 35s por vuelta (premium, más calmado que los carruseles).
 * Items duplicados para loop infinito sin corte. Pausa al hover/touch.
 *
 * Si lista vacía o cargando → no renderiza (solo aire, no skeleton).
 *
 * Respeta `prefers-reduced-motion`.
 *
 * Ubicación: apps/web/src/components/ofertas/TickerOfertas.tsx
 */

import { useEffect, useMemo } from 'react';
import { Store } from 'lucide-react';
import type { OfertaFeed } from '@/types/ofertas';

interface TickerOfertasProps {
  ofertas: OfertaFeed[];
  cargando: boolean;
}

// =============================================================================
// ESTILOS GLOBALES
// =============================================================================

const STYLES_ID = 'ticker-ofertas-styles';
const STYLES_CSS = `
@keyframes ticker-scroll {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

.ticker-ofertas-track {
  display: flex;
  gap: 36px;
  width: max-content;
  animation: ticker-scroll 38s linear infinite;
  will-change: transform;
}

.ticker-ofertas-viewport:hover .ticker-ofertas-track,
.ticker-ofertas-viewport:active .ticker-ofertas-track {
  animation-play-state: paused;
}

@media (prefers-reduced-motion: reduce) {
  .ticker-ofertas-track {
    animation: none !important;
    width: auto;
  }
  .ticker-ofertas-viewport {
    overflow-x: auto;
  }
}
`;

// =============================================================================
// COMPONENTE
// =============================================================================

interface NegocioItem {
  negocioId: string;
  nombre: string;
  logoUrl: string | null;
}

export default function TickerOfertas({ ofertas, cargando }: TickerOfertasProps) {
  // Inyectar estilos CSS una sola vez
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLES_ID)) return;
    const style = document.createElement('style');
    style.id = STYLES_ID;
    style.textContent = STYLES_CSS;
    document.head.appendChild(style);
  }, []);

  // Deduplicar por negocio: una misma cadena puede aparecer en varias
  // ofertas; aquí solo queremos mostrar el negocio una vez.
  const negocios = useMemo<NegocioItem[]>(() => {
    const vistos = new Set<string>();
    const items: NegocioItem[] = [];
    for (const o of ofertas) {
      if (vistos.has(o.negocioId)) continue;
      vistos.add(o.negocioId);
      items.push({
        negocioId: o.negocioId,
        nombre: o.negocioNombre,
        logoUrl: o.logoUrl,
      });
    }
    return items;
  }, [ofertas]);

  // El loop infinito duplica el track con translateX(-50%). Si solo hay
  // 2-3 negocios únicos, los originales + duplicados se ven a la vez en
  // viewports anchos (se siente como "logos repetidos"). Solución: padear
  // la lista repitiéndola hasta tener al menos MIN_ITEMS, así el segundo
  // bloque queda fuera de pantalla. La cantidad debe ser PAR para que
  // ambas mitades del track sean idénticas y el loop quede seamless.
  const MIN_ITEMS = 10;
  const negociosPadded = useMemo<NegocioItem[]>(() => {
    if (negocios.length === 0) return [];
    if (negocios.length >= MIN_ITEMS) return negocios;
    const repeticiones = Math.ceil(MIN_ITEMS / negocios.length);
    const padded: NegocioItem[] = [];
    for (let i = 0; i < repeticiones; i++) padded.push(...negocios);
    return padded;
  }, [negocios]);

  // Si está cargando o no hay datos → no renderizar (solo aire)
  if (cargando || negocios.length === 0) return null;

  return (
    <div
      data-testid="ticker-ofertas"
      className="ticker-ofertas-viewport relative w-full overflow-x-hidden py-2 lg:py-3"
    >
      <div className="ticker-ofertas-track">
        {/* Originales + duplicado para loop continuo (usa lista padeada) */}
        {[...negociosPadded, ...negociosPadded].map((n, idx) => (
          <span
            key={`${n.negocioId}-${idx}`}
            className="inline-flex items-center gap-2.5 lg:gap-3 whitespace-nowrap"
          >
            {/* Logo circular con ring ámbar (mismo patrón que las cards) */}
            <div className="shrink-0 w-10 h-10 lg:w-11 lg:h-11 rounded-full overflow-hidden bg-[#f5f3ef] ring-2 ring-amber-400/40 flex items-center justify-center shadow-sm">
              {n.logoUrl ? (
                <img
                  src={n.logoUrl}
                  alt={n.nombre}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="w-4 h-4 text-[#888]" strokeWidth={2} />
              )}
            </div>
            {/* Nombre del negocio */}
            <span className="font-bold text-[#1a1a1a] text-[15px] lg:text-base tracking-tight">
              {n.nombre}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
