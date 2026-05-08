/**
 * GaleriaArticulo.tsx
 * ====================
 * Galería de fotos del detalle de MarketPlace.
 *
 * Móvil (<lg):
 *  - Carrusel horizontal con scroll-snap-x mandatory.
 *  - Indicador "X/N" floating bottom-right que se actualiza dinámicamente
 *    al hacer swipe (calculado por scrollLeft / clientWidth).
 *  - Tap en cualquier slide → abre ModalImagenes (lightbox fullscreen).
 *
 * Desktop (>=lg):
 *  - Layout split: thumbnails verticales 88px a la izquierda + foto principal
 *    grande a la derecha.
 *  - Click en thumbnail cambia la foto principal sin abrir lightbox.
 *  - Click en foto principal → lightbox.
 *
 * Reusa `ModalImagenes` (apps/web/src/components/ui/ModalImagenes.tsx).
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P2 Galería)
 * Sprint:      docs/prompts Marketplace/Sprint-3-Detalle-Articulo.md
 *
 * Ubicación: apps/web/src/components/marketplace/GaleriaArticulo.tsx
 */

import { useEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { ModalImagenes } from '../ui/ModalImagenes';

interface GaleriaArticuloProps {
    fotos: string[];
    titulo: string;
    /** Índice de portada (foto que se muestra primero) */
    fotoPortadaIndex?: number;
}

export function GaleriaArticulo({
    fotos,
    titulo,
    fotoPortadaIndex = 0,
}: GaleriaArticuloProps) {
    // Reordenar para que la portada sea la primera
    const fotosOrdenadas = (() => {
        if (fotos.length === 0) return [];
        if (fotoPortadaIndex <= 0 || fotoPortadaIndex >= fotos.length) return fotos;
        const portada = fotos[fotoPortadaIndex];
        const resto = fotos.filter((_, i) => i !== fotoPortadaIndex);
        return [portada, ...resto];
    })();

    const total = fotosOrdenadas.length;
    const [indiceActual, setIndiceActual] = useState(0);
    const [lightboxAbierto, setLightboxAbierto] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const carruselRef = useRef<HTMLDivElement>(null);

    // ─── Móvil: actualizar indicador "X/N" al hacer swipe ──────────────────────
    useEffect(() => {
        const el = carruselRef.current;
        if (!el) return;
        const handler = () => {
            const ancho = el.clientWidth;
            if (ancho === 0) return;
            const idx = Math.round(el.scrollLeft / ancho);
            setIndiceActual(idx);
        };
        el.addEventListener('scroll', handler, { passive: true });
        return () => el.removeEventListener('scroll', handler);
    }, [total]);

    const abrirLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setLightboxAbierto(true);
    };

    // ─── Estado vacío ──────────────────────────────────────────────────────────
    if (total === 0) {
        return (
            <div
                data-testid="galeria-marketplace-vacia"
                className="flex aspect-square w-full items-center justify-center bg-slate-100 lg:aspect-[4/3] lg:rounded-xl"
            >
                <ImageOff className="h-16 w-16 text-slate-400" strokeWidth={1.5} />
            </div>
        );
    }

    return (
        <div data-testid="galeria-marketplace">
            {/* ═══════════════════════════════════════════════════════════════
                MÓVIL — Carrusel horizontal con swipe
            ═══════════════════════════════════════════════════════════════ */}
            <div className="relative lg:hidden">
                <div
                    ref={carruselRef}
                    className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto bg-slate-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {fotosOrdenadas.map((foto, idx) => (
                        <button
                            key={`${foto}-${idx}`}
                            data-testid={`slide-${idx}`}
                            onClick={() => abrirLightbox(idx)}
                            className="aspect-square w-full shrink-0 snap-center cursor-pointer"
                        >
                            <img
                                src={foto}
                                alt={`${titulo} — foto ${idx + 1}`}
                                className="h-full w-full object-cover"
                                loading={idx === 0 ? 'eager' : 'lazy'}
                            />
                        </button>
                    ))}
                </div>

                {/* Indicador X/N — solo si hay más de 1 foto */}
                {total > 1 && (
                    <div
                        data-testid="indicador-galeria"
                        className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm"
                    >
                        {indiceActual + 1}/{total}
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                DESKTOP — Thumbnails verticales + foto principal
            ═══════════════════════════════════════════════════════════════ */}
            <div className="hidden lg:flex lg:gap-3">
                {/* Thumbnails verticales */}
                {total > 1 && (
                    <div
                        data-testid="thumbnails-galeria"
                        className="flex max-h-[480px] flex-col gap-2 overflow-y-auto pr-1 [scrollbar-width:thin] 2xl:max-h-[560px]"
                    >
                        {fotosOrdenadas.map((foto, idx) => (
                            <button
                                key={`thumb-${foto}-${idx}`}
                                data-testid={`thumb-${idx}`}
                                onClick={() => setIndiceActual(idx)}
                                aria-label={`Ver foto ${idx + 1}`}
                                aria-pressed={indiceActual === idx}
                                className={`h-20 w-20 cursor-pointer shrink-0 overflow-hidden rounded-lg border-2 transition-colors 2xl:h-24 2xl:w-24 ${
                                    indiceActual === idx
                                        ? 'border-teal-500'
                                        : 'border-slate-200 hover:border-slate-400'
                                }`}
                            >
                                <img
                                    src={foto}
                                    alt={`Miniatura ${idx + 1}`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                )}

                {/* Foto principal */}
                <button
                    data-testid="img-principal"
                    onClick={() => abrirLightbox(indiceActual)}
                    aria-label="Ver imagen ampliada"
                    className="group relative flex flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-slate-100"
                >
                    <img
                        src={fotosOrdenadas[indiceActual]}
                        alt={`${titulo} — foto ${indiceActual + 1}`}
                        className="h-full max-h-[480px] w-full object-contain transition-transform group-hover:scale-[1.02] 2xl:max-h-[560px]"
                    />
                    {total > 1 && (
                        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm">
                            {indiceActual + 1}/{total}
                        </span>
                    )}
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                LIGHTBOX (compartido móvil + desktop)
            ═══════════════════════════════════════════════════════════════ */}
            <ModalImagenes
                images={fotosOrdenadas}
                initialIndex={lightboxIndex}
                isOpen={lightboxAbierto}
                onClose={() => setLightboxAbierto(false)}
            />
        </div>
    );
}

export default GaleriaArticulo;
