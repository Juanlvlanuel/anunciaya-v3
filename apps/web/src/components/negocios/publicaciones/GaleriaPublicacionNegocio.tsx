/**
 * GaleriaPublicacionNegocio.tsx
 * ================================
 * Galería de fotos del detalle de una publicación de negocio. Calca
 * `GaleriaArticulo.tsx` de MarketPlace (mismo comportamiento, acento azul
 * en vez de teal — marca de Negocios).
 *
 * Layout único responsive:
 *  - Foto principal grande arriba (swipe en móvil + click para lightbox).
 *  - Tira de thumbnails horizontales debajo — la activa lleva borde azul.
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/GaleriaPublicacionNegocio.tsx
 */

import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { ModalImagenes } from '../../ui/ModalImagenes';

interface GaleriaPublicacionNegocioProps {
    fotos: string[];
    /** Índice de portada (foto que se muestra primero). */
    fotoPortadaIndex?: number;
}

export function GaleriaPublicacionNegocio({
    fotos,
    fotoPortadaIndex = 0,
}: GaleriaPublicacionNegocioProps) {
    // Reordenar para que la portada sea la primera.
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
    const thumbnailsRef = useRef<HTMLDivElement>(null);

    // ── Swipe táctil móvil (mismo patrón que CardPublicacionNegocioFeed):
    // arrastra en vivo con translateX, un swipe avanza SOLO una foto — a
    // diferencia del scroll nativo con snap, que con un flick rápido podía
    // saltar varias de golpe. ──
    const tieneMultiples = total > 1;
    const galeriaWidthRef = useRef(0);
    const touchStartXRef = useRef(0);
    const touchDeltaXRef = useRef(0);
    const swipeOcurrioRef = useRef(false);
    const [offsetPx, setOffsetPx] = useState(0);
    const [enTransicion, setEnTransicion] = useState(false);

    const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
        if (!tieneMultiples) return;
        touchStartXRef.current = e.touches[0].clientX;
        touchDeltaXRef.current = 0;
        swipeOcurrioRef.current = false;
        setEnTransicion(false);
        galeriaWidthRef.current = e.currentTarget.getBoundingClientRect().width;
    }, [tieneMultiples]);

    const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
        if (!tieneMultiples) return;
        const dx = e.touches[0].clientX - touchStartXRef.current;
        touchDeltaXRef.current = dx;
        setOffsetPx(dx);
    }, [tieneMultiples]);

    const handleTouchEnd = useCallback(() => {
        if (!tieneMultiples) return;
        const delta = touchDeltaXRef.current;
        const UMBRAL = 60;
        const ancho = galeriaWidthRef.current || window.innerWidth;
        touchDeltaXRef.current = 0;

        if (Math.abs(delta) < UMBRAL) {
            setEnTransicion(true);
            setOffsetPx(0);
            setTimeout(() => setEnTransicion(false), 220);
            return;
        }

        swipeOcurrioRef.current = true;
        setEnTransicion(true);

        if (delta < 0) {
            setOffsetPx(-ancho);
            setTimeout(() => {
                setEnTransicion(false);
                setIndiceActual((i) => (i === total - 1 ? 0 : i + 1));
                setOffsetPx(0);
            }, 220);
        } else {
            setOffsetPx(ancho);
            setTimeout(() => {
                setEnTransicion(false);
                setIndiceActual((i) => (i === 0 ? total - 1 : i - 1));
                setOffsetPx(0);
            }, 220);
        }
    }, [tieneMultiples, total]);

    const abrirLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setLightboxAbierto(true);
    };

    /** Tap en la foto móvil — ignora el click fantasma que sigue a un swipe. */
    const handleTapFotoMovil = useCallback(() => {
        if (swipeOcurrioRef.current) {
            swipeOcurrioRef.current = false;
            return;
        }
        abrirLightbox(indiceActual);
    }, [indiceActual]);

    useEffect(() => {
        const tira = thumbnailsRef.current;
        if (!tira) return;
        const thumb = tira.children[indiceActual] as HTMLElement | undefined;
        if (!thumb) return;
        const offsetCentrado =
            thumb.offsetLeft - tira.clientWidth / 2 + thumb.clientWidth / 2;
        tira.scrollTo({ left: offsetCentrado, behavior: 'smooth' });
    }, [indiceActual]);

    const seleccionarThumbnail = useCallback((idx: number) => {
        setIndiceActual(idx);
    }, []);

    const irAnterior = useCallback(() => {
        setIndiceActual((idx) => (idx === 0 ? total - 1 : idx - 1));
    }, [total]);

    const irSiguiente = useCallback(() => {
        setIndiceActual((idx) => (idx === total - 1 ? 0 : idx + 1));
    }, [total]);

    if (total === 0) {
        return (
            <div
                data-testid="galeria-negocio-publicacion-vacia"
                className="flex aspect-square w-full items-center justify-center rounded-xl bg-slate-100"
            >
                <ImageOff className="h-16 w-16 text-slate-400" strokeWidth={1.5} />
            </div>
        );
    }

    return (
        <div data-testid="galeria-negocio-publicacion">
            {/* MÓVIL — swipe con translateX en vivo: un arrastre avanza SOLO
                una foto, con la adyacente asomando en el borde (mismo
                patrón que CardPublicacionNegocioFeed). */}
            <div className="relative lg:hidden">
                <div
                    data-testid="carrusel-negocio-movil"
                    className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 touch-pan-y"
                    onClick={handleTapFotoMovil}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    {fotosOrdenadas.map((foto, idx) => {
                        if (!tieneMultiples && idx !== indiceActual) return null;

                        const distAtras = (indiceActual - idx + total) % total;
                        const distAdelante = (idx - indiceActual + total) % total;

                        let rol: 'prev' | 'curr' | 'next' | null = null;
                        if (idx === indiceActual) rol = 'curr';
                        else if (distAtras === 1) rol = 'prev';
                        else if (distAdelante === 1) rol = 'next';

                        if (!rol) return null;

                        const baseTransform = rol === 'prev' ? '-100%' : rol === 'next' ? '100%' : '0%';
                        const esCurr = rol === 'curr';

                        return (
                            <img
                                key={`${foto}-${idx}`}
                                data-testid={`slide-negocio-${idx}`}
                                src={foto}
                                alt={esCurr ? `Foto ${idx + 1}` : ''}
                                aria-hidden={esCurr ? undefined : true}
                                draggable={false}
                                decoding="async"
                                loading={idx === 0 ? 'eager' : 'lazy'}
                                className={`absolute inset-0 h-full w-full select-none object-cover ${esCurr ? '' : 'pointer-events-none'}`}
                                style={{
                                    transform: `translateX(calc(${baseTransform} + ${offsetPx}px))`,
                                    transition: enTransicion ? 'transform 220ms ease-out' : 'none',
                                    willChange: 'transform',
                                }}
                            />
                        );
                    })}
                </div>

                {total > 1 && (
                    <div
                        data-testid="indicador-galeria-negocio"
                        className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm"
                    >
                        {indiceActual + 1}/{total}
                    </div>
                )}
            </div>

            {/* DESKTOP — foto principal + flechas overlay */}
            <div className="relative hidden lg:block">
                <button
                    data-testid="img-principal-negocio"
                    onClick={() => abrirLightbox(indiceActual)}
                    aria-label="Ver imagen ampliada"
                    className="group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-slate-100"
                >
                    <img
                        src={fotosOrdenadas[indiceActual]}
                        alt={`Foto ${indiceActual + 1}`}
                        className="h-full max-h-[480px] w-full object-contain transition-transform group-hover:scale-[1.02] 2xl:max-h-[560px]"
                    />
                    {total > 1 && (
                        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm">
                            {indiceActual + 1}/{total}
                        </span>
                    )}
                </button>

                {total > 1 && (
                    <>
                        <button
                            type="button"
                            data-testid="btn-foto-anterior-negocio"
                            onClick={irAnterior}
                            aria-label="Foto anterior"
                            className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:scale-110 active:scale-95"
                        >
                            <ChevronLeft className="h-6 w-6" strokeWidth={2.5} />
                        </button>
                        <button
                            type="button"
                            data-testid="btn-foto-siguiente-negocio"
                            onClick={irSiguiente}
                            aria-label="Foto siguiente"
                            className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:scale-110 active:scale-95"
                        >
                            <ChevronRight className="h-6 w-6" strokeWidth={2.5} />
                        </button>
                    </>
                )}
            </div>

            {/* Tira de thumbnails — móvil + desktop */}
            {total > 1 && (
                <div
                    data-testid="tira-thumbnails-negocio"
                    ref={thumbnailsRef}
                    className="mt-3 flex gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {fotosOrdenadas.map((foto, idx) => {
                        const esActiva = indiceActual === idx;
                        return (
                            <button
                                key={`thumb-negocio-${foto}-${idx}`}
                                data-testid={`thumb-negocio-${idx}`}
                                type="button"
                                onClick={() => seleccionarThumbnail(idx)}
                                aria-label={`Ver foto ${idx + 1}`}
                                aria-pressed={esActiva}
                                className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-all lg:h-20 lg:w-20 ${
                                    esActiva
                                        ? 'border-blue-500 ring-2 ring-blue-300'
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

            <ModalImagenes
                images={fotosOrdenadas}
                initialIndex={lightboxIndex}
                isOpen={lightboxAbierto}
                onClose={() => setLightboxAbierto(false)}
            />
        </div>
    );
}

export default GaleriaPublicacionNegocio;
