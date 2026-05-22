/**
 * GaleriaServicio.tsx
 * =====================
 * Galería del detalle del servicio.
 *
 * Proporciones uniformes para los 3 tipos (`vacante-empresa`,
 * `servicio-persona`, `solicito`):
 *   - Móvil: `aspect-[16/9]` (banda horizontal compacta).
 *   - Desktop: `lg:aspect-auto lg:h-64 2xl:h-72` (alto fijo 256/288px).
 *
 * Para `tipo='vacante-empresa'`: una sola imagen como hero (logo + identidad
 * de marca del negocio). Sin lightbox porque hay solo una.
 *
 * Para `tipo='servicio-persona'` o `'solicito'`: hasta 6 fotos con swipe
 * nativo (móvil) o flechas (desktop). Click abre lightbox fullscreen con
 * `ModalImagenes`. Patrón replicado del módulo MarketPlace (scroll-snap
 * CSS puro + listener `scroll` pasivo).
 *
 * Sin fotos: placeholder con rayas slate (mismo `bg-stripe` del handoff)
 * con la misma proporción que las galerías con foto.
 *
 * Ubicación: apps/web/src/components/servicios/GaleriaServicio.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
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
    // Layout estilo "hero": portada del local (sucursal) como fondo +
    // barra inferior con gradiente oscuro que contiene logo full-rounded del
    // negocio + nombre del negocio + sufijo de sucursal (cuando aplica).
    // Sin portada → fallback al gradient azul original.
    if (publicacion.tipo === 'vacante-empresa') {
        const { oferente } = publicacion;
        const nombreNegocio = oferente.negocioNombre
            ?? `${oferente.nombre} ${oferente.apellidos}`.trim();
        const portada = oferente.sucursalPortada;
        const logoEmpresa = oferente.negocioLogo
            ?? oferente.sucursalFotoPerfil
            ?? oferente.avatarUrl;
        const sufijoSucursal = (oferente.totalSucursales ?? 0) > 1
            ? (oferente.sucursalEsPrincipal ? 'Matriz' : oferente.sucursalNombre)
            : null;
        const iniciales = obtenerInicialesEmpresa(nombreNegocio, '');
        return (
            <div className="aspect-[16/9] lg:aspect-auto lg:h-64 2xl:h-72 relative overflow-hidden">
                {/* Fondo: portada del local con fallback al gradient sky. */}
                {portada ? (
                    <img
                        src={portada}
                        alt={nombreNegocio}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 bg-linear-to-br from-sky-100 to-sky-200" />
                )}

                {/* Overlay oscuro inferior para legibilidad del texto. */}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-black/75 via-black/40 to-transparent pointer-events-none" />

                {/* Sello "Empresa verificada" — premium dorado, sin texto.
                    Sprint 9.3: movido de top-right a top-LEFT para
                    intercambiar con el botón Bookmark (que ahora vive
                    top-right en PaginaServicio.tsx). Tooltip nativo
                    `title` describe el significado a quien no asocie el
                    icono. */}
                <div
                    className="absolute top-3 left-3 z-10 w-10 h-10 rounded-full grid place-items-center shadow-lg ring-2 ring-white/80"
                    style={{
                        background:
                            'linear-gradient(135deg, #fde047 0%, #fbbf24 45%, #d97706 100%)',
                    }}
                    title="Empresa verificada"
                    aria-label="Empresa verificada"
                >
                    <ShieldCheck
                        className="w-5 h-5 text-amber-950"
                        strokeWidth={2.75}
                    />
                </div>

                {/* Barra de identidad inferior: logo + nombre + sucursal. */}
                <div className="absolute inset-x-0 bottom-0 p-3 lg:p-4 flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white grid place-items-center text-sky-700 text-base lg:text-lg font-extrabold shadow-md ring-2 ring-white/70 overflow-hidden shrink-0">
                        {logoEmpresa ? (
                            <img
                                src={logoEmpresa}
                                alt={nombreNegocio}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            iniciales
                        )}
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base lg:text-lg font-bold text-white leading-tight truncate drop-shadow-sm">
                            {nombreNegocio}
                        </span>
                        {sufijoSucursal && (
                            <>
                                <span className="h-4 w-px shrink-0 bg-white/50" />
                                <span className="text-sm font-medium text-white/85 truncate drop-shadow-sm">
                                    {sufijoSucursal}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ─── Sin fotos: placeholder ────────────────────────────────────────────
    // Misma proporción que vacante-empresa para coherencia visual entre
    // los 3 tipos (servicio-persona / solicito / vacante): banda horizontal
    // compacta en desktop (256px alto / 288px en 2xl) y 16:9 en móvil.
    if (fotos.length === 0) {
        return (
            <div className="aspect-[16/9] lg:aspect-auto lg:h-64 2xl:h-72 relative bg-stripe">
                <div className="absolute inset-0 grid place-items-center">
                    <span className="text-slate-500/70 text-[10px] tracking-widest uppercase font-mono">
                        sin foto
                    </span>
                </div>
            </div>
        );
    }

    // ─── Servicio-persona / solicito: galería swipe + lightbox ─────────────
    // Misma proporción que la vacante (banda horizontal compacta en desktop)
    // para que los 3 tipos se vean alineados visualmente. Antes era `aspect-[4/3]`
    // que producía una imagen demasiado alta comparada con la vacante.
    return (
        <>
            <div className="aspect-[16/9] lg:aspect-auto lg:h-64 2xl:h-72 relative bg-stripe overflow-hidden">
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
