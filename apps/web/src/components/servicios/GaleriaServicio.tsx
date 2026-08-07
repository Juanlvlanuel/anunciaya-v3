/**
 * GaleriaServicio.tsx
 * =====================
 * Galería del detalle del servicio.
 *
 * Proporciones uniformes para los 3 tipos (`vacante-empresa`,
 * `servicio-persona`, `solicito`):
 *   - Móvil: `aspect-[4/3]`, full-bleed (mismo criterio que Producto/
 *     Ofertas/MarketPlace/Dinámicas — sin margen ni bordes redondeados).
 *   - Desktop: `lg:aspect-auto lg:h-64 2xl:h-72` (alto fijo 256/288px).
 *
 * Para `tipo='vacante-empresa'`: una sola imagen como hero (logo + identidad
 * de marca del negocio). Sin lightbox porque hay solo una.
 *
 * Para `tipo='servicio-persona'` o `'solicito'`: hasta 12 fotos con swipe
 * nativo (móvil) o flechas (desktop) + tira de thumbnails debajo (solo
 * cuando hay más de 1 foto) — mismo patrón que `GaleriaArticulo.tsx`
 * (MarketPlace)/Negocios. Click abre lightbox fullscreen con
 * `ModalImagenes`. Patrón replicado del módulo MarketPlace (scroll-snap
 * CSS puro + listener `scroll` pasivo).
 *
 * Sin fotos: placeholder con rayas slate (mismo `bg-stripe` del handoff)
 * con la misma proporción que las galerías con foto.
 *
 * Ubicación: apps/web/src/components/servicios/GaleriaServicio.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import type { PublicacionDetalle } from '../../types/servicios';
import { ModalImagenes } from '../ui/ModalImagenes';
import { fuenteThumbnail } from '../../utils/servicios';

interface GaleriaServicioProps {
    publicacion: PublicacionDetalle;
    /** Solo aplica a `vacante-empresa`: en vez del alto fijo (256/288px)
     *  estira la portada a `h-full` para igualar el alto del sidebar
     *  derecho con el que se parea en el detalle. */
    alturaCompleta?: boolean;
}

export function GaleriaServicio({ publicacion, alturaCompleta = false }: GaleriaServicioProps) {
    const fotos = publicacion.fotos ?? [];
    const portadaIdx = Math.max(
        0,
        Math.min(publicacion.fotoPortadaIndex ?? 0, fotos.length - 1),
    );
    const [indiceActivo, setIndiceActivo] = useState(portadaIdx);
    const [lightboxAbierto, setLightboxAbierto] = useState(false);
    const carruselRef = useRef<HTMLDivElement>(null);
    const thumbnailsRef = useRef<HTMLDivElement>(null);

    // Marca cuando el scroll del carrusel principal lo disparamos nosotros
    // (flechas o click en thumbnail) — el listener de abajo lo usa para NO
    // sincronizar `indiceActivo` con cada frame intermedio de la animación
    // `smooth`, que si no, dispara el efecto de centrado de thumbnails una
    // vez por cada índice de paso (2→3→4→5→6...) en vez de una sola vez al
    // destino final, y la tira "vibra" en lugar de deslizarse fluida.
    const scrollProgramaticoRef = useRef(false);
    const limpiarProgramaticoRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // ─── Sync swipe móvil ↔ índice activo ────────────────────────────────
    // Escucha el scroll del carrusel y calcula el índice por `scrollLeft /
    // anchoSlide`. El listener es pasivo (no bloquea el render del browser).
    useEffect(() => {
        const el = carruselRef.current;
        if (!el || fotos.length <= 1) return;
        const handler = () => {
            if (scrollProgramaticoRef.current) {
                // Sigue en curso el scroll `smooth` que nosotros iniciamos
                // — reprograma el "fin" cada vez que llega un evento nuevo.
                clearTimeout(limpiarProgramaticoRef.current);
                limpiarProgramaticoRef.current = setTimeout(() => {
                    scrollProgramaticoRef.current = false;
                }, 150);
                return;
            }
            const ancho = el.clientWidth;
            if (ancho === 0) return;
            const nuevo = Math.round(el.scrollLeft / ancho);
            if (nuevo !== indiceActivo) setIndiceActivo(nuevo);
        };
        el.addEventListener('scroll', handler, { passive: true });
        return () => {
            el.removeEventListener('scroll', handler);
            clearTimeout(limpiarProgramaticoRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fotos.length]);

    // ─── Flechas desktop + thumbnails: scroll programático ─────────────────
    const irA = useCallback(
        (idx: number) => {
            const el = carruselRef.current;
            if (!el) {
                setIndiceActivo(idx);
                return;
            }
            const ancho = el.clientWidth;
            scrollProgramaticoRef.current = true;
            el.scrollTo({ left: ancho * idx, behavior: 'smooth' });
            setIndiceActivo(idx);
        },
        [],
    );

    const irAnterior = useCallback(() => {
        irA((indiceActivo - 1 + fotos.length) % fotos.length);
    }, [indiceActivo, fotos.length, irA]);

    const irSiguiente = useCallback(() => {
        irA((indiceActivo + 1) % fotos.length);
    }, [indiceActivo, fotos.length, irA]);

    // Al cambiar la foto activa, scrollear la tira de thumbnails para que
    // la activa quede visible (centrarla cuando sea posible) — mismo
    // patrón que `GaleriaArticulo.tsx`.
    useEffect(() => {
        const tira = thumbnailsRef.current;
        if (!tira) return;
        const thumb = tira.children[indiceActivo] as HTMLElement | undefined;
        if (!thumb) return;
        const offsetCentrado =
            thumb.offsetLeft - tira.clientWidth / 2 + thumb.clientWidth / 2;
        tira.scrollTo({ left: offsetCentrado, behavior: 'smooth' });
    }, [indiceActivo]);

    // ─── Vacante-empresa: solo la foto de portada, limpia ──────────────────
    // Sin overlays (logo/nombre/sello) — la identidad del negocio ya vive
    // en la card "Sobre el negocio" debajo. Click abre el lightbox, mismo
    // patrón que servicio-persona/solicito.
    // Sin portada → fallback al gradient azul original.
    if (publicacion.tipo === 'vacante-empresa') {
        const { oferente } = publicacion;
        const nombreNegocio = oferente.negocioNombre
            ?? `${oferente.nombre} ${oferente.apellidos}`.trim();
        const portada = oferente.sucursalPortada;
        return (
            <div className={`group aspect-[4/3] lg:aspect-auto relative overflow-hidden ${alturaCompleta ? 'lg:h-full' : 'lg:h-64 2xl:h-72'}`}>
                {portada ? (
                    <img
                        src={portada}
                        alt={nombreNegocio}
                        onClick={() => setLightboxAbierto(true)}
                        className="absolute inset-0 h-full w-full cursor-pointer object-cover transition-transform duration-300 lg:group-hover:scale-[1.02]"
                    />
                ) : (
                    <div className="absolute inset-0 bg-linear-to-br from-sky-100 to-sky-200" />
                )}

                {portada && (
                    <ModalImagenes
                        images={[portada]}
                        initialIndex={0}
                        isOpen={lightboxAbierto}
                        onClose={() => setLightboxAbierto(false)}
                    />
                )}
            </div>
        );
    }

    // ─── Sin fotos: placeholder ────────────────────────────────────────────
    // Misma proporción que vacante-empresa para coherencia visual entre
    // los 3 tipos (servicio-persona / solicito / vacante): banda horizontal
    // compacta en desktop (256px alto / 288px en 2xl) y 16:9 en móvil.
    if (fotos.length === 0) {
        return (
            <div className="aspect-[4/3] lg:aspect-auto lg:h-64 2xl:h-72 relative bg-stripe">
                <div className="absolute inset-0 grid place-items-center">
                    <span className="text-slate-500/70 text-[10px] tracking-widest uppercase font-mono">
                        sin foto
                    </span>
                </div>
            </div>
        );
    }

    // ─── Servicio-persona / solicito: galería swipe + lightbox ─────────────
    // Misma proporción que la vacante para que los 3 tipos se vean
    // alineados visualmente — y ahora también con Producto/Ofertas/
    // MarketPlace/Dinámicas en móvil (unificación full-bleed).
    return (
        <>
            <div className="aspect-[4/3] lg:aspect-auto lg:h-64 2xl:h-72 relative bg-stripe overflow-hidden">
                {/* Carrusel: tira horizontal con scroll-snap. Funciona como
                    swipe nativo en móvil y como scroll programático con las
                    flechas en desktop. */}
                <div
                    ref={carruselRef}
                    data-testid="galeria-servicio-carrusel"
                    className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
                    style={{ scrollbarWidth: 'none' }}
                >
                    {fotos.map((foto, idx) => (
                        <button
                            key={`${foto.url}-${idx}`}
                            type="button"
                            data-testid={`galeria-foto-${idx}`}
                            onClick={() => {
                                setIndiceActivo(idx);
                                setLightboxAbierto(true);
                            }}
                            className="group snap-center w-full h-full shrink-0 relative cursor-pointer"
                            aria-label={`Ver foto ${idx + 1} de ${fotos.length}`}
                        >
                            <img
                                src={fuenteThumbnail(foto)}
                                alt={`${publicacion.titulo} — foto ${idx + 1}`}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 lg:group-hover:scale-[1.02]"
                                loading={idx === 0 ? 'eager' : 'lazy'}
                                draggable={false}
                            />
                            {foto.tipo === 'video' && (
                                <Play
                                    className="pointer-events-none absolute inset-0 m-auto h-9 w-9 text-white drop-shadow-md"
                                    fill="white"
                                />
                            )}
                        </button>
                    ))}
                </div>

                {fotos.length > 1 && (
                    <>
                        {/* Badge contador */}
                        <div className="pointer-events-none absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/60 text-white text-[11px] font-bold backdrop-blur-sm tabular-nums">
                            {indiceActivo + 1} / {fotos.length}
                        </div>

                        {/* Dots de paginación (móvil) — un punto por foto */}
                        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 lg:hidden">
                            {fotos.map((_, idx) => (
                                <span
                                    key={idx}
                                    className={
                                        'h-1.5 rounded-full transition-all ' +
                                        (idx === indiceActivo
                                            ? 'w-5 bg-white'
                                            : 'w-1.5 bg-white/50')
                                    }
                                />
                            ))}
                        </div>

                        {/* Flechas — solo desktop */}
                        <button
                            type="button"
                            onClick={irAnterior}
                            aria-label="Foto anterior"
                            className="hidden lg:grid absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60 lg:cursor-pointer"
                        >
                            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                        <button
                            type="button"
                            onClick={irSiguiente}
                            aria-label="Foto siguiente"
                            className="hidden lg:grid absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/60 lg:cursor-pointer"
                        >
                            <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                    </>
                )}
            </div>

            {/* Tira de thumbnails horizontal — móvil + desktop, solo con
                más de 1 foto. Misma tira que `GaleriaArticulo.tsx` (MP),
                con acento sky (marca Servicios). */}
            {fotos.length > 1 && (
                <div
                    data-testid="galeria-servicio-thumbnails"
                    ref={thumbnailsRef}
                    className="mt-3 flex gap-2 overflow-x-auto scroll-smooth px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:px-0"
                >
                    {fotos.map((foto, idx) => {
                        const esActiva = indiceActivo === idx;
                        return (
                            <button
                                key={`thumb-${foto.url}-${idx}`}
                                data-testid={`galeria-servicio-thumb-${idx}`}
                                type="button"
                                onClick={() => irA(idx)}
                                aria-label={`Ver foto ${idx + 1}`}
                                aria-pressed={esActiva}
                                className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-all lg:h-20 lg:w-20 ${
                                    esActiva
                                        ? 'border-sky-500 ring-2 ring-sky-300'
                                        : 'border-slate-200 opacity-70 hover:border-slate-400 hover:opacity-100'
                                }`}
                            >
                                <img
                                    src={fuenteThumbnail(foto)}
                                    alt={`Miniatura ${idx + 1}`}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                />
                                {foto.tipo === 'video' && (
                                    <Play
                                        className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-white drop-shadow"
                                        fill="white"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Lightbox fullscreen con swipe, teclado y descarga */}
            <ModalImagenes
                images={fotos}
                initialIndex={indiceActivo}
                isOpen={lightboxAbierto}
                onClose={() => setLightboxAbierto(false)}
            />
        </>
    );
}

export default GaleriaServicio;
