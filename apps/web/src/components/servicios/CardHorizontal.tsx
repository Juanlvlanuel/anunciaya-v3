/**
 * CardHorizontal.tsx
 * ====================
 * Variante compacta usada en el carrusel "Recién publicado" del feed de
 * Servicios. Diseñada para que 4 cards quepan EXACTOS sin scroll dentro
 * del container `max-w-[920px] lg:px-4` del feed:
 *   container interior = 920 − 32 (padding) = 888px
 *   4 cards × 213px + 3 gaps × 12px (gap-3) = 852 + 36 = 888px ✓
 *
 * Layout:
 *   - Foto cuadrada (aspect-square) arriba con badge Ofrezco/Solicito.
 *   - Bloque info compacto debajo: título 2 líneas + precio (sky) +
 *     meta (modalidad · tiempo).
 *   - Hover: ligero `-translate-y-0.5`, sombra más profunda, borde sky,
 *     y `scale-105` en la foto.
 *
 * Tonos:
 *   - Ofrezco → sky (mismo que la sección).
 *   - Solicito → amber (igual que el toggle del composer).
 *
 * Ubicación: apps/web/src/components/servicios/CardHorizontal.tsx
 */

import { Image as ImageIcon } from 'lucide-react';
import type { PublicacionServicio } from '../../types/servicios';
import {
    formatearPrecioServicio,
    formatearTiempoRelativo,
    obtenerFotoPortada,
    modalidadLabel,
} from '../../utils/servicios';

interface CardHorizontalProps {
    publicacion: PublicacionServicio;
    onClick?: () => void;
}

export function CardHorizontal({ publicacion, onClick }: CardHorizontalProps) {
    const fotoUrl = obtenerFotoPortada(
        publicacion.fotos,
        publicacion.fotoPortadaIndex,
    );
    const tiempo = formatearTiempoRelativo(publicacion.createdAt);
    const modalidad = modalidadLabel(publicacion.modalidad);
    const esOfrece = publicacion.modo === 'ofrezco';

    return (
        <article
            data-testid={`card-horizontal-${publicacion.id}`}
            onClick={onClick}
            className="group w-[213px] rounded-2xl overflow-hidden bg-white border-2 border-slate-200 shadow-sm shrink-0 cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-sky-300 transition-all duration-200 snap-start"
        >
            {/* ── Foto ──────────────────────────────────────────────── */}
            <div className="aspect-square relative overflow-hidden">
                {fotoUrl ? (
                    <img
                        src={fotoUrl}
                        alt={publicacion.titulo}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="absolute inset-0 grid place-items-center bg-linear-to-br from-sky-50 via-white to-sky-100">
                        <ImageIcon
                            className="w-9 h-9 text-sky-300"
                            strokeWidth={1.5}
                        />
                    </div>
                )}

                {/* Badge modo Ofrezco/Solicito — esquina superior izq */}
                <span
                    aria-hidden
                    className={
                        'absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide backdrop-blur-sm shadow-sm ' +
                        (esOfrece
                            ? 'bg-sky-600/90 text-white'
                            : 'bg-amber-500/90 text-white')
                    }
                >
                    {esOfrece ? 'OFREZCO' : 'SOLICITO'}
                </span>
            </div>

            {/* ── Info ──────────────────────────────────────────────── */}
            <div className="p-2.5">
                <h3 className="text-[13px] font-semibold text-slate-900 leading-tight line-clamp-2 min-h-[34px]">
                    {publicacion.titulo}
                </h3>
                <div className="mt-1.5 text-[13px] font-extrabold text-sky-700 truncate tabular-nums">
                    {formatearPrecioServicio(publicacion.precio)}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 font-medium leading-tight">
                    <span className="truncate">{modalidad}</span>
                    <span aria-hidden className="text-slate-300">
                        ·
                    </span>
                    <span className="shrink-0 tabular-nums">{tiempo}</span>
                </div>
            </div>
        </article>
    );
}

export default CardHorizontal;
