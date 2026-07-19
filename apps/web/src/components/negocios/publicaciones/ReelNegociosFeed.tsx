/**
 * ReelNegociosFeed.tsx
 * ======================
 * Reel horizontal COMPACTO de negocios (NO de publicaciones) — usado en el
 * layout móvil del tab Feed de Negocios: reel de negocios arriba + feed de
 * publicaciones debajo, en un solo scroll vertical.
 *
 * Carrusel con auto-scroll — mismo comportamiento que `ReelMarketplace.tsx`:
 *  - Auto-scroll cada 4s, pausa al hover/touch/drag (+2-3s de gracia).
 *  - Drag/swipe manual siempre permitido.
 *  - Loop infinito visual (sin clonar items).
 *  - Flechas manuales solo desktop (aparecen al hover).
 *
 * Usa `CardNegocioReel` (mismo ancho que `CardArticuloReel` de MarketPlace,
 * contenido mínimo) — distinta de `CardNegocioCompacto`, que se usa en Mis
 * Guardados con más badges (horario/rating/distancia).
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/ReelNegociosFeed.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CardNegocioReel } from './CardNegocioReel';
import type { NegocioResumen } from '../../../types/negocios';

interface ReelNegociosFeedProps {
    negocios: NegocioResumen[];
    /** Intervalo de auto-scroll en ms. Default 4000 (4s). */
    intervaloMs?: number;
    /** Pixels que avanza por tick. Default ~ancho de una card. */
    pasoPx?: number;
}

export function ReelNegociosFeed({
    negocios,
    intervaloMs = 4000,
    pasoPx = 190,
}: ReelNegociosFeedProps) {
    const navigate = useNavigate();
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
        if (pausado || negocios.length === 0) return;

        const intervalo = setInterval(() => {
            const el = contenedorRef.current;
            if (!el) return;

            const { scrollLeft, scrollWidth, clientWidth } = el;
            const limite = scrollWidth - clientWidth;

            if (scrollLeft + pasoPx >= limite - 4) {
                el.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                el.scrollBy({ left: pasoPx, behavior: 'smooth' });
            }
        }, intervaloMs);

        return () => clearInterval(intervalo);
    }, [pausado, negocios.length, intervaloMs, pasoPx]);

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
            pausarTemporalmente(3000);
        },
        [pasoPx, pausarTemporalmente]
    );

    if (negocios.length === 0) return null;

    return (
        <div
            data-testid="reel-negocios-feed-wrapper"
            className="group/reel relative mb-4"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div
                ref={contenedorRef}
                data-testid="reel-negocios-feed"
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={finalizarDrag}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
                style={{ cursor: dragRef.current.activo ? 'grabbing' : 'grab' }}
            >
                {negocios.map((negocio) => (
                    <CardNegocioReel
                        key={negocio.sucursalId}
                        negocio={{
                            sucursalId: negocio.sucursalId,
                            usuarioId: negocio.usuarioId,
                            nombre: negocio.negocioNombre,
                            imagenPerfil: negocio.logoUrl ?? undefined,
                            fotoPerfil: negocio.fotoPerfil,
                            sucursalNombre: negocio.sucursalNombre,
                            esPrincipal: negocio.esPrincipal,
                            totalSucursales: negocio.totalSucursales,
                            galeria: negocio.galeria.map((g) => ({ url: g.url, titulo: g.titulo ?? undefined })),
                        }}
                        onClick={() => navigate(`/negocios/${negocio.sucursalId}`)}
                    />
                ))}
            </div>

            {/* Flechas — solo desktop, aparecen al hover sobre el reel */}
            <button
                type="button"
                data-testid="reel-negocios-flecha-izq"
                onClick={() => navegarManual('izquierda')}
                aria-label="Anterior"
                className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg ring-1 ring-slate-300 opacity-0 transition-all group-hover/reel:opacity-100 hover:scale-110 lg:flex lg:cursor-pointer"
            >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button
                type="button"
                data-testid="reel-negocios-flecha-der"
                onClick={() => navegarManual('derecha')}
                aria-label="Siguiente"
                className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg ring-1 ring-slate-300 opacity-0 transition-all group-hover/reel:opacity-100 hover:scale-110 lg:flex lg:cursor-pointer"
            >
                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
        </div>
    );
}

export default ReelNegociosFeed;
