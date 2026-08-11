/**
 * ReelServicios.tsx
 * ===================
 * Carrusel horizontal con auto-scroll para el "reel" superior del feed de
 * Servicios (Sprint 9.4) — calcado de `ReelMarketplace.tsx`.
 *
 * Motor: Embla (`useCarruselRotativo`) en vez del `overflow-x-auto` +
 * drag-a-mano de antes — ver el porqué en `hooks/useCarruselRotativo.ts` y
 * en `ReelMarketplace.tsx`.
 *
 * Comportamiento (Embla + plugin Autoplay se encargan de todo):
 *  - **Auto-scroll** cada `intervaloMs` avanza una card.
 *  - **Pausa al hover** (desktop, vía `pausarHover`) y al soltar un drag.
 *  - **Drag/swipe manual** — mouse y touch, nativo de Embla.
 *  - **Loop infinito** — Embla lo maneja internamente.
 *  - Si `publicaciones` está vacío, el componente padre simplemente no lo
 *    renderiza (retorna null aquí también, por si acaso).
 *
 * Recibe las publicaciones a mostrar (típicamente 10-20) — el reel NO
 * pagina, el feed grande de abajo es el responsable del scroll infinito.
 *
 * Ubicación: apps/web/src/components/servicios/ReelServicios.tsx
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCarruselRotativo } from '../../hooks/useCarruselRotativo';
import { CardServicioReel } from './CardServicioReel';
import type { PublicacionFeed } from '../../types/servicios';

interface ReelServiciosProps {
    publicaciones: PublicacionFeed[];
    /** Intervalo de auto-scroll en ms. Default 4000 (4s). */
    intervaloMs?: number;
}

export function ReelServicios({ publicaciones, intervaloMs = 4000 }: ReelServiciosProps) {
    const { emblaRef, pausarHover, siguiente, anterior } = useCarruselRotativo(publicaciones, intervaloMs, { loop: false });

    if (publicaciones.length === 0) return null;

    return (
        <div data-testid="reel-servicios-wrapper" className="group/reel relative mb-4" {...pausarHover}>
            {/* `touch-pan-y`: Embla maneja el drag horizontal por JS, el
                gesto vertical (scroll de la página / pull-to-refresh) se le
                deja libre al navegador. */}
            <div ref={emblaRef} className="touch-pan-y overflow-hidden -mx-1 px-1">
                <div data-testid="reel-servicios" className="flex gap-3 cursor-grab pb-1 active:cursor-grabbing">
                    {publicaciones.map((publicacion) => (
                        <CardServicioReel key={publicacion.id} publicacion={publicacion} />
                    ))}
                </div>
            </div>

            <button
                type="button"
                data-testid="reel-servicios-flecha-izq"
                onClick={anterior}
                aria-label="Anterior"
                className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg ring-1 ring-slate-300 opacity-0 transition-all group-hover/reel:opacity-100 hover:scale-110 lg:flex lg:cursor-pointer"
            >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>

            <button
                type="button"
                data-testid="reel-servicios-flecha-der"
                onClick={siguiente}
                aria-label="Siguiente"
                className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg ring-1 ring-slate-300 opacity-0 transition-all group-hover/reel:opacity-100 hover:scale-110 lg:flex lg:cursor-pointer"
            >
                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
        </div>
    );
}

export default ReelServicios;
