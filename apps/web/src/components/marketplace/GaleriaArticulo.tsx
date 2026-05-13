/**
 * GaleriaArticulo.tsx
 * ====================
 * Galería de fotos del detalle de MarketPlace (P2).
 *
 * Layout único responsive:
 *  - Foto principal arriba (con swipe en móvil + click para lightbox).
 *  - Tira de thumbnails horizontales debajo con scroll + flechas de
 *    navegación en desktop. La thumbnail activa lleva borde teal.
 *
 * Comportamiento:
 *  - Móvil: swipe horizontal en la foto principal actualiza `indiceActual`
 *    y la thumbnail activa. La tira de thumbnails también es scrollable
 *    con swipe nativo (sin flechas, por espacio).
 *  - Desktop: click en una thumbnail cambia la foto principal sin abrir
 *    el lightbox. Click en la foto principal → abre `ModalImagenes`.
 *    Las flechas a los lados de la tira hacen scroll programático cuando
 *    hay más thumbnails de las que caben (típicamente más de 5-6).
 *
 * Reusa `ModalImagenes` (apps/web/src/components/ui/ModalImagenes.tsx).
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P2 Galería)
 *
 * Ubicación: apps/web/src/components/marketplace/GaleriaArticulo.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
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
    const carruselMovilRef = useRef<HTMLDivElement>(null);
    const thumbnailsRef = useRef<HTMLDivElement>(null);

    // ─── Móvil: actualizar indicador "X/N" al hacer swipe ──────────────────────
    useEffect(() => {
        const el = carruselMovilRef.current;
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

    // Al cambiar la foto activa, scrollear la tira de thumbnails para que la
    // activa quede visible (centrarla cuando sea posible).
    useEffect(() => {
        const tira = thumbnailsRef.current;
        if (!tira) return;
        const thumb = tira.children[indiceActual] as HTMLElement | undefined;
        if (!thumb) return;
        const offsetCentrado =
            thumb.offsetLeft - tira.clientWidth / 2 + thumb.clientWidth / 2;
        tira.scrollTo({ left: offsetCentrado, behavior: 'smooth' });
    }, [indiceActual]);

    const seleccionarThumbnail = useCallback(
        (idx: number) => {
            setIndiceActual(idx);
            // En móvil, sincronizar el carrusel de la foto principal.
            const carrusel = carruselMovilRef.current;
            if (carrusel) {
                const ancho = carrusel.clientWidth;
                carrusel.scrollTo({ left: ancho * idx, behavior: 'smooth' });
            }
        },
        []
    );

    // Navegación prev/next con flechas overlay sobre la imagen principal
    // (desktop). Loop infinito: al final vuelve a la primera, al inicio
    // vuelve a la última. En móvil se navega con swipe.
    const irAnterior = useCallback(() => {
        setIndiceActual((idx) => (idx === 0 ? total - 1 : idx - 1));
    }, [total]);

    const irSiguiente = useCallback(() => {
        setIndiceActual((idx) => (idx === total - 1 ? 0 : idx + 1));
    }, [total]);

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
                MÓVIL — Carrusel horizontal con swipe en la foto principal
            ═══════════════════════════════════════════════════════════════ */}
            <div className="relative lg:hidden">
                <div
                    ref={carruselMovilRef}
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
                DESKTOP — Foto principal con flechas overlay para navegar
                entre fotos (prev/next). Las flechas son siblings del
                `<button>` de la imagen (no hijos), así su click no
                propaga al wrapper que abre el lightbox.
            ═══════════════════════════════════════════════════════════════ */}
            <div className="relative hidden lg:block">
                <button
                    data-testid="img-principal"
                    onClick={() => abrirLightbox(indiceActual)}
                    aria-label="Ver imagen ampliada"
                    className="group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-slate-100"
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

                {/* Flechas de navegación — solo si hay más de 1 foto. */}
                {total > 1 && (
                    <>
                        <button
                            type="button"
                            data-testid="btn-foto-anterior"
                            onClick={irAnterior}
                            aria-label="Foto anterior"
                            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:scale-110 active:scale-95"
                        >
                            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
                        </button>
                        <button
                            type="button"
                            data-testid="btn-foto-siguiente"
                            onClick={irSiguiente}
                            aria-label="Foto siguiente"
                            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:scale-110 active:scale-95"
                        >
                            <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
                        </button>
                    </>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                TIRA DE THUMBNAILS HORIZONTAL — móvil + desktop.
                Sin flechas: en desktop suelen caber todas, y el swipe nativo
                cubre el caso móvil. La thumbnail activa lleva `border-teal-500`
                y se centra automáticamente con `scrollTo` al cambiar
                `indiceActual` (útil cuando el usuario navega con las flechas
                overlay de la foto principal).
            ═══════════════════════════════════════════════════════════════ */}
            {total > 1 && (
                <div
                    data-testid="tira-thumbnails"
                    ref={thumbnailsRef}
                    className="mt-3 flex gap-2 overflow-x-auto scroll-smooth px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:px-0"
                >
                    {fotosOrdenadas.map((foto, idx) => {
                        const esActiva = indiceActual === idx;
                        return (
                            <button
                                key={`thumb-${foto}-${idx}`}
                                data-testid={`thumb-${idx}`}
                                type="button"
                                onClick={() => seleccionarThumbnail(idx)}
                                aria-label={`Ver foto ${idx + 1}`}
                                aria-pressed={esActiva}
                                className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-all lg:h-20 lg:w-20 ${
                                    esActiva
                                        ? 'border-teal-500 ring-2 ring-teal-300'
                                        : 'border-slate-200 opacity-70 hover:border-slate-400 hover:opacity-100'
                                }`}
                            >
                                <img
                                    src={foto}
                                    alt={`Miniatura ${idx + 1}`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                            </button>
                        );
                    })}
                </div>
            )}

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
