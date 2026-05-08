/**
 * ReelMarketplace.tsx
 * ====================
 * Carrusel horizontal con auto-scroll para el "reel" superior del feed v1.2.
 *
 * Comportamiento (decisiones del rediseño):
 *  - **Auto-scroll** cada 4 segundos avanza una card a la izquierda.
 *  - **Pausa al hover** (desktop) y al touch (móvil) — el usuario puede leer
 *    cómodamente.
 *  - **Drag/swipe manual** — siempre permitido. Al soltar, vuelve a fluir.
 *  - **Loop infinito visual** — al llegar al final, vuelve al principio con un
 *    salto suave (sin clonado de items).
 *  - Si el reel desaparece (filtros activos), el componente padre simplemente
 *    no lo renderiza.
 *
 * Recibe los artículos a mostrar (típicamente 10-20) — el reel NO pagina.
 * El feed grande de abajo es el responsable del scroll infinito.
 *
 * Ubicación: apps/web/src/components/marketplace/ReelMarketplace.tsx
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CardArticuloReel } from './CardArticuloReel';
import type { ArticuloFeedInfinito } from '../../types/marketplace';

interface ReelMarketplaceProps {
    articulos: ArticuloFeedInfinito[];
    /** Intervalo de auto-scroll en ms. Default 4000 (4s). */
    intervaloMs?: number;
    /** Pixels que avanza por tick. Default ~ancho de una card. */
    pasoPx?: number;
}

export function ReelMarketplace({
    articulos,
    intervaloMs = 4000,
    pasoPx = 220,
}: ReelMarketplaceProps) {
    const contenedorRef = useRef<HTMLDivElement>(null);
    const [pausado, setPausado] = useState(false);

    // Pausa programable (drag manual también pausa unos segundos al soltar).
    const reanudarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pausarTemporalmente = useCallback((ms: number) => {
        setPausado(true);
        if (reanudarTimeoutRef.current) clearTimeout(reanudarTimeoutRef.current);
        reanudarTimeoutRef.current = setTimeout(() => setPausado(false), ms);
    }, []);

    // ─── Auto-scroll ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (pausado || articulos.length === 0) return;

        const intervalo = setInterval(() => {
            const el = contenedorRef.current;
            if (!el) return;

            const { scrollLeft, scrollWidth, clientWidth } = el;
            const limite = scrollWidth - clientWidth;

            // Si llegó al final, vuelve al principio con scroll suave.
            if (scrollLeft + pasoPx >= limite - 4) {
                el.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                el.scrollBy({ left: pasoPx, behavior: 'smooth' });
            }
        }, intervaloMs);

        return () => clearInterval(intervalo);
    }, [pausado, articulos.length, intervaloMs, pasoPx]);

    // ─── Drag con mouse (desktop) ────────────────────────────────────────────
    const dragRef = useRef<{
        activo: boolean;
        startX: number;
        scrollLeftInicial: number;
    }>({ activo: false, startX: 0, scrollLeftInicial: 0 });

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        const el = contenedorRef.current;
        if (!el) return;
        dragRef.current = {
            activo: true,
            startX: e.pageX - el.offsetLeft,
            scrollLeftInicial: el.scrollLeft,
        };
        setPausado(true);
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragRef.current.activo) return;
        const el = contenedorRef.current;
        if (!el) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const distancia = (x - dragRef.current.startX) * 1.2;
        el.scrollLeft = dragRef.current.scrollLeftInicial - distancia;
    }, []);

    const finalizarDrag = useCallback(() => {
        if (dragRef.current.activo) {
            dragRef.current.activo = false;
            // Pausa adicional 2s después de soltar para que el usuario lea.
            pausarTemporalmente(2000);
        }
    }, [pausarTemporalmente]);

    // ─── Touch (móvil) ───────────────────────────────────────────────────────
    const onTouchStart = useCallback(() => setPausado(true), []);
    const onTouchEnd = useCallback(() => pausarTemporalmente(2000), [pausarTemporalmente]);

    // ─── Hover (desktop) ─────────────────────────────────────────────────────
    const onMouseEnter = useCallback(() => setPausado(true), []);
    const onMouseLeave = useCallback(() => {
        finalizarDrag();
        setPausado(false);
    }, [finalizarDrag]);

    // ─── Navegación manual con flechas ──────────────────────────────────────
    const navegarManual = useCallback(
        (direccion: 'izquierda' | 'derecha') => {
            const el = contenedorRef.current;
            if (!el) return;
            const delta = direccion === 'derecha' ? pasoPx : -pasoPx;
            el.scrollBy({ left: delta, behavior: 'smooth' });
            // Pausa 3s después de un click manual para que el usuario lea sin
            // que el auto-scroll lo corra inmediatamente.
            pausarTemporalmente(3000);
        },
        [pasoPx, pausarTemporalmente]
    );

    if (articulos.length === 0) return null;

    return (
        <div
            data-testid="reel-marketplace-wrapper"
            className="group/reel relative"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div
                ref={contenedorRef}
                data-testid="reel-marketplace"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={finalizarDrag}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory px-4 py-2 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
                style={{
                    cursor: dragRef.current.activo ? 'grabbing' : 'grab',
                }}
            >
                {articulos.map((articulo) => (
                    <CardArticuloReel key={articulo.id} articulo={articulo} />
                ))}
            </div>

            {/* Flecha izquierda — solo desktop, aparece al hover sobre el reel */}
            <button
                type="button"
                data-testid="reel-flecha-izq"
                onClick={() => navegarManual('izquierda')}
                aria-label="Anterior"
                className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg ring-1 ring-slate-300 opacity-0 transition-all group-hover/reel:opacity-100 hover:scale-110 lg:flex lg:cursor-pointer"
            >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>

            {/* Flecha derecha — solo desktop, aparece al hover sobre el reel */}
            <button
                type="button"
                data-testid="reel-flecha-der"
                onClick={() => navegarManual('derecha')}
                aria-label="Siguiente"
                className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg ring-1 ring-slate-300 opacity-0 transition-all group-hover/reel:opacity-100 hover:scale-110 lg:flex lg:cursor-pointer"
            >
                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
        </div>
    );
}

export default ReelMarketplace;
