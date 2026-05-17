/**
 * GaleriaServicio.tsx
 * =====================
 * Galería del detalle del servicio.
 *
 * Para `tipo='vacante-empresa'`: una sola imagen aspect 16:9 (logo + identidad
 * de marca del negocio). Sin lightbox porque hay solo una.
 *
 * Para `tipo='servicio-persona'` o `'solicito'`: hasta 6 fotos aspect 4:3
 * con swipe nativo (móvil) o flechas (desktop). Click abre lightbox
 * fullscreen con `ModalImagenes`. Patrón replicado del módulo MarketPlace
 * (scroll-snap CSS puro + listener `scroll` pasivo).
 *
 * Sin fotos: placeholder con rayas slate (mismo `bg-stripe` del handoff).
 *
 * Ubicación: apps/web/src/components/servicios/GaleriaServicio.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PublicacionDetalle } from '../../types/servicios';
import { ModalImagenes } from '../ui/ModalImagenes';

interface GaleriaServicioProps {
    publicacion: PublicacionDetalle;
}

export function GaleriaServicio({ publicacion }: GaleriaServicioProps) {
    const fotos = publicacion.fotos ?? [];
    const portadaIdx = Math.max(
        0,
        Math.min(publicacion.fotoPortadaIndex ?? 0, fotos.length - 1),
    );
    const [indiceActivo, setIndiceActivo] = useState(portadaIdx);
    const [lightboxAbierto, setLightboxAbierto] = useState(false);
    const carruselRef = useRef<HTMLDivElement>(null);

    // ─── Sync swipe móvil ↔ índice activo ────────────────────────────────
    // Escucha el scroll del carrusel y calcula el índice por `scrollLeft /
    // anchoSlide`. El listener es pasivo (no bloquea el render del browser).
    useEffect(() => {
        const el = carruselRef.current;
        if (!el || fotos.length <= 1) return;
        const handler = () => {
            const ancho = el.clientWidth;
            if (ancho === 0) return;
            const nuevo = Math.round(el.scrollLeft / ancho);
            if (nuevo !== indiceActivo) setIndiceActivo(nuevo);
        };
        el.addEventListener('scroll', handler, { passive: true });
        return () => el.removeEventListener('scroll', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fotos.length]);

    // ─── Flechas desktop: scroll programático ──────────────────────────────
    const irA = useCallback(
        (idx: number) => {
            const el = carruselRef.current;
            if (!el) {
                setIndiceActivo(idx);
                return;
            }
            const ancho = el.clientWidth;
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

    // ─── Vacante-empresa: identidad de marca, sin galería ─────────────────
    if (publicacion.tipo === 'vacante-empresa') {
        const iniciales = obtenerInicialesEmpresa(
            publicacion.oferente.nombre,
            publicacion.oferente.apellidos,
        );
        return (
            <div className="aspect-[16/9] relative bg-linear-to-br from-sky-100 to-sky-200 grid place-items-center">
                <div className="text-center px-6">
                    <div className="mx-auto w-20 h-20 rounded-2xl bg-white grid place-items-center text-sky-700 text-2xl font-extrabold shadow-md overflow-hidden">
                        {publicacion.oferente.avatarUrl ? (
                            <img
                                src={publicacion.oferente.avatarUrl}
                                alt={publicacion.oferente.nombre}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            iniciales
                        )}
                    </div>
                    <div className="mt-3 text-sm font-bold text-slate-900">
                        {publicacion.oferente.nombre}{' '}
                        {publicacion.oferente.apellidos}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Sin fotos: placeholder ────────────────────────────────────────────
    if (fotos.length === 0) {
        return (
            <div className="aspect-[4/3] relative bg-stripe">
                <div className="absolute inset-0 grid place-items-center">
                    <span className="text-slate-500/70 text-[10px] tracking-widest uppercase font-mono">
                        sin foto
                    </span>
                </div>
            </div>
        );
    }

    // ─── Servicio-persona / solicito: galería swipe + lightbox ─────────────
    return (
        <>
            <div className="aspect-[4/3] relative bg-stripe overflow-hidden">
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
                            key={`${foto}-${idx}`}
                            type="button"
                            data-testid={`galeria-foto-${idx}`}
                            onClick={() => {
                                setIndiceActivo(idx);
                                setLightboxAbierto(true);
                            }}
                            className="snap-center w-full h-full shrink-0 relative lg:cursor-zoom-in"
                            aria-label={`Ver foto ${idx + 1} de ${fotos.length}`}
                        >
                            <img
                                src={foto}
                                alt={`${publicacion.titulo} — foto ${idx + 1}`}
                                className="absolute inset-0 w-full h-full object-cover"
                                loading={idx === 0 ? 'eager' : 'lazy'}
                                draggable={false}
                            />
                        </button>
                    ))}
                </div>

                {fotos.length > 1 && (
                    <>
                        {/* Badge contador */}
                        <div className="pointer-events-none absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-black/60 text-white text-[11px] font-bold backdrop-blur-sm tabular-nums">
                            {indiceActivo + 1} / {fotos.length}
                        </div>

                        {/* Dots de paginación (móvil) — solo si hay ≤6 fotos */}
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

function obtenerInicialesEmpresa(nombre: string, apellidos: string): string {
    const partes = `${nombre} ${apellidos}`.trim().split(/\s+/).filter(Boolean);
    return (
        partes
            .slice(0, 2)
            .map((p) => p.charAt(0).toUpperCase())
            .join('') || '··'
    );
}

export default GaleriaServicio;
