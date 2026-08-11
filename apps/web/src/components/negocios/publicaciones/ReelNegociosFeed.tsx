/**
 * ReelNegociosFeed.tsx
 * ======================
 * Reel horizontal COMPACTO de negocios (NO de publicaciones) — usado en el
 * layout móvil del tab Feed de Negocios: reel de negocios arriba + feed de
 * publicaciones debajo, en un solo scroll vertical.
 *
 * Motor: Embla (`useCarruselRotativo`) — mismo tratamiento que
 * `ReelMarketplace.tsx`/`ReelServicios.tsx`, ver el porqué en
 * `hooks/useCarruselRotativo.ts`.
 *  - Auto-scroll cada `intervaloMs`, pausa al hover/drag (Embla + Autoplay).
 *  - Drag/swipe manual siempre permitido (mouse y touch, nativo de Embla).
 *  - Loop infinito.
 *  - Flechas manuales solo desktop (aparecen al hover).
 *
 * Usa `CardNegocioReel` (mismo ancho que `CardArticuloReel` de MarketPlace,
 * contenido mínimo) — distinta de `CardNegocioCompacto`, que se usa en Mis
 * Guardados con más badges (horario/rating/distancia).
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/ReelNegociosFeed.tsx
 */

import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCarruselRotativo } from '../../../hooks/useCarruselRotativo';
import { CardNegocioReel } from './CardNegocioReel';
import type { NegocioResumen } from '../../../types/negocios';

interface ReelNegociosFeedProps {
    negocios: NegocioResumen[];
    /** Intervalo de auto-scroll en ms. Default 4000 (4s). */
    intervaloMs?: number;
}

export function ReelNegociosFeed({ negocios, intervaloMs = 4000 }: ReelNegociosFeedProps) {
    const navigate = useNavigate();
    const { emblaRef, pausarHover, siguiente, anterior } = useCarruselRotativo(negocios, intervaloMs, { loop: false });

    if (negocios.length === 0) return null;

    return (
        <div data-testid="reel-negocios-feed-wrapper" className="group/reel relative mb-4" {...pausarHover}>
            {/* `touch-pan-y`: Embla maneja el drag horizontal por JS, el
                gesto vertical (scroll de la página / pull-to-refresh) se le
                deja libre al navegador. */}
            <div ref={emblaRef} className="touch-pan-y overflow-hidden -mx-1 px-1">
                <div data-testid="reel-negocios-feed" className="flex gap-3 cursor-grab pb-1 active:cursor-grabbing">
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
            </div>

            {/* Flechas — solo desktop, aparecen al hover sobre el reel */}
            <button
                type="button"
                data-testid="reel-negocios-flecha-izq"
                onClick={anterior}
                aria-label="Anterior"
                className="absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg ring-1 ring-slate-300 opacity-0 transition-all group-hover/reel:opacity-100 hover:scale-110 lg:flex lg:cursor-pointer"
            >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button
                type="button"
                data-testid="reel-negocios-flecha-der"
                onClick={siguiente}
                aria-label="Siguiente"
                className="absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg ring-1 ring-slate-300 opacity-0 transition-all group-hover/reel:opacity-100 hover:scale-110 lg:flex lg:cursor-pointer"
            >
                <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
            </button>
        </div>
    );
}

export default ReelNegociosFeed;
