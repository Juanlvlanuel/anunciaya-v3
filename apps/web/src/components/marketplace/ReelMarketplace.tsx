/**
 * ReelMarketplace.tsx
 * ====================
 * Carrusel horizontal con auto-scroll para el "reel" superior del feed v1.2.
 *
 * Motor: Embla (`useCarruselRotativo`, el mismo hook del rotativo de
 * Ofertas) en vez del `overflow-x-auto` + drag-a-mano de antes — ese patrón
 * viejo se sentía "rígido" al arrancar el swipe en móvil (el navegador tarda
 * ~10-15px en arbitrar scroll-vs-drag; ver el porqué completo en
 * `hooks/useCarruselRotativo.ts`). Mismo motor que ya usa el carrusel de
 * cartas de lotería de Dinámicas.
 *
 * Comportamiento (Embla + plugin Autoplay se encargan de todo):
 *  - **Auto-scroll** cada `intervaloMs` avanza una card.
 *  - **Pausa al hover** (desktop, vía `pausarHover` — cubre también las
 *    flechas) y al soltar un drag (`stopOnInteraction:false` retoma solo).
 *  - **Drag/swipe manual** — mouse y touch, nativo de Embla. Un drag real
 *    cancela el click del card automáticamente (no navega por accidente).
 *  - **Loop infinito** — Embla lo maneja internamente.
 *  - Si el reel desaparece (filtros activos), el componente padre simplemente
 *    no lo renderiza.
 *
 * Recibe los artículos a mostrar (típicamente 10-20) — el reel NO pagina.
 * El feed grande de abajo es el responsable del scroll infinito.
 *
 * Ubicación: apps/web/src/components/marketplace/ReelMarketplace.tsx
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCarruselRotativo } from '../../hooks/useCarruselRotativo';
import { CardArticuloReel } from './CardArticuloReel';
import type { ArticuloFeedInfinito } from '../../types/marketplace';

interface ReelMarketplaceProps {
    articulos: ArticuloFeedInfinito[];
    /** Intervalo de auto-scroll en ms. Default 4000 (4s). */
    intervaloMs?: number;
}

export function ReelMarketplace({ articulos, intervaloMs = 4000 }: ReelMarketplaceProps) {
    const { emblaRef, pausarHover, siguiente, anterior } = useCarruselRotativo(articulos, intervaloMs, { loop: false });

    if (articulos.length === 0) return null;

    return (
        <div data-testid="reel-marketplace-wrapper" className="group/reel relative mb-4" {...pausarHover}>
            {/* `touch-pan-y`: Embla maneja el drag horizontal por JS: el
                navegador debe seguir libre de interpretar el gesto vertical
                (scroll de la página / pull-to-refresh) sin que compitan. */}
            <div ref={emblaRef} className="touch-pan-y overflow-hidden -mx-1 px-1">
                <div data-testid="reel-marketplace" className="flex gap-3 cursor-grab pb-1 active:cursor-grabbing">
                    {articulos.map((articulo) => (
                        <CardArticuloReel key={articulo.id} articulo={articulo} />
                    ))}
                </div>
            </div>

            {/* Flecha izquierda — solo desktop, aparece al hover sobre el reel */}
            <button
                type="button"
                data-testid="reel-flecha-izq"
                onClick={anterior}
                aria-label="Anterior"
                className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg ring-1 ring-slate-300 opacity-0 transition-all group-hover/reel:opacity-100 hover:scale-110 lg:flex lg:cursor-pointer"
            >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>

            {/* Flecha derecha — solo desktop, aparece al hover sobre el reel */}
            <button
                type="button"
                data-testid="reel-flecha-der"
                onClick={siguiente}
                aria-label="Siguiente"
                className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg ring-1 ring-slate-300 opacity-0 transition-all group-hover/reel:opacity-100 hover:scale-110 lg:flex lg:cursor-pointer"
            >
                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
        </div>
    );
}

export default ReelMarketplace;
