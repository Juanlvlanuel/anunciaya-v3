/**
 * CardArticuloReel.tsx
 * =====================
 * Card compacta del reel (carrusel automático superior del feed v1.2).
 *
 * Diseño definido:
 *  - Foto portada grande (aspect 4:5 — vertical para que quepan más en el reel).
 *  - Overlay arriba: avatar circular + nombre del vendedor (texto blanco con
 *    drop-shadow para legibilidad sobre cualquier foto).
 *  - Overlay abajo: precio destacado.
 *  - Click en la card → detalle del artículo.
 *
 * Mismo ancho aproximado que las cards de "Recién publicado" del diseño actual
 * (~180px en móvil, ~220px en desktop).
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md
 * Ubicación: apps/web/src/components/marketplace/CardArticuloReel.tsx
 */

import { useNavigate } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
import {
    formatearPrecio,
    obtenerFotoPortada,
} from '../../utils/marketplace';
import type { ArticuloFeedInfinito } from '../../types/marketplace';

interface CardArticuloReelProps {
    articulo: ArticuloFeedInfinito;
}

function obtenerIniciales(nombre: string, apellidos: string): string {
    const n = (nombre ?? '').trim().charAt(0).toUpperCase();
    const a = (apellidos ?? '').trim().charAt(0).toUpperCase();
    return `${n}${a}` || '?';
}

export function CardArticuloReel({ articulo }: CardArticuloReelProps) {
    const navigate = useNavigate();
    const fotoPortada = obtenerFotoPortada(articulo.fotos, articulo.fotoPortadaIndex);
    const nombreCorto = articulo.vendedor.nombre.split(' ')[0];
    const iniciales = obtenerIniciales(
        articulo.vendedor.nombre,
        articulo.vendedor.apellidos
    );

    return (
        <button
            type="button"
            data-testid={`card-reel-${articulo.id}`}
            onClick={() => navigate(`/marketplace/articulo/${articulo.id}`)}
            className="group relative block aspect-[4/5] w-44 shrink-0 overflow-hidden rounded-xl bg-slate-200 shadow-sm transition-transform hover:scale-[1.02] lg:w-52 lg:cursor-pointer"
        >
            {/* Foto portada */}
            {fotoPortada ? (
                <img
                    src={fotoPortada}
                    alt={articulo.titulo}
                    className="h-full w-full object-cover"
                    loading="lazy"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <ImageOff className="h-10 w-10" strokeWidth={1.5} />
                </div>
            )}

            {/* Gradiente arriba (para legibilidad del avatar+nombre) */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black/65 to-transparent" />

            {/* Overlay arriba: avatar + nombre */}
            <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-2.5">
                {articulo.vendedor.avatarUrl ? (
                    <img
                        src={articulo.vendedor.avatarUrl}
                        alt={articulo.vendedor.nombre}
                        className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-white/60"
                    />
                ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal-500 to-teal-700 text-xs font-bold text-white ring-2 ring-white/60">
                        {iniciales}
                    </div>
                )}
                <span className="truncate text-sm font-bold text-white drop-shadow-md">
                    {nombreCorto}
                </span>
            </div>

            {/* Gradiente abajo (para legibilidad del precio + título) */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/80 to-transparent" />

            {/* Overlay abajo: precio + título corto */}
            <div className="absolute inset-x-0 bottom-0 p-2.5">
                <div className="text-base font-extrabold text-white drop-shadow-md">
                    {formatearPrecio(articulo.precio)}
                </div>
                <div className="line-clamp-1 text-[11px] font-medium text-white/90 drop-shadow-md">
                    {articulo.titulo}
                </div>
            </div>
        </button>
    );
}

export default CardArticuloReel;
