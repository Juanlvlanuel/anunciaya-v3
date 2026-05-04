/**
 * PaginaMarketplace.tsx
 * ======================
 * Feed visual del MarketPlace — punto de entrada de la sección.
 *
 * Estructura:
 *  - Header dark sticky con identidad teal (replica patrón PaginaCardYA pero
 *    con acento #14b8a6 en lugar de amber).
 *  - Sección "Recién publicado" — carrusel horizontal con drag-to-scroll.
 *  - Sección "Cerca de ti" — grid 2 cols móvil, 4 cols lg, 6 cols 2xl.
 *  - FAB "+ Publicar" (móvil) / CTA en header (desktop).
 *  - OverlayBuscador placeholder (buscador real en Sprint 6).
 *
 * Estados:
 *  - Sin GPS o sin ciudad → mensaje accionable invitando a activar ubicación.
 *  - Loading → spinner centrado.
 *  - Error → bloque informativo.
 *  - Vacío → mensaje amistoso.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P1 Feed)
 * Sprint:      docs/prompts Marketplace/Sprint-2-Feed-Frontend.md
 *
 * Ubicación: apps/web/src/pages/private/marketplace/PaginaMarketplace.tsx
 */

import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, MapPin, AlertCircle } from 'lucide-react';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useDragScroll } from '../../../hooks/useDragScroll';
import { useMarketplaceFeed, useTrendingMarketplace } from '../../../hooks/queries/useMarketplace';
import { CardArticulo } from '../../../components/marketplace/CardArticulo';
import { OverlayBuscadorMarketplace } from '../../../components/marketplace/OverlayBuscadorMarketplace';
import { Spinner } from '../../../components/ui/Spinner';
import { notificar } from '../../../utils/notificaciones';
import type { ArticuloFeed } from '../../../types/marketplace';

export function PaginaMarketplace() {
    // ─── Stores ────────────────────────────────────────────────────────────────
    // CRÍTICO: la ciudad debe leerse del MISMO store que el Navbar global
    // (useGpsStore.ciudad → CiudadSeleccionada.nombre). El campo
    // useAuthStore.usuario.ciudad es la ciudad guardada en el perfil del
    // usuario y suele estar null — desincroniza el feed del Navbar.
    const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? null);
    const latitud = useGpsStore((s) => s.latitud);
    const longitud = useGpsStore((s) => s.longitud);
    const obtenerUbicacion = useGpsStore((s) => s.obtenerUbicacion);
    const cargandoGps = useGpsStore((s) => s.cargando);

    // ─── React Query ───────────────────────────────────────────────────────────
    const { data, isLoading, isError, refetch } = useMarketplaceFeed({
        ciudad,
        lat: latitud,
        lng: longitud,
    });

    const recientes = data?.recientes ?? [];
    const cercanos = data?.cercanos ?? [];

    const idsRecientes = useMemo(() => recientes.map((a) => a.id), [recientes]);

    const { data: trending = [] } = useTrendingMarketplace({
        ciudad,
        excluirIds: idsRecientes,
    });

    // ─── Handlers ──────────────────────────────────────────────────────────────
    const navigate = useNavigate();
    const handlePublicar = () => {
        navigate('/marketplace/publicar');
    };

    const handleActivarUbicacion = async () => {
        try {
            await obtenerUbicacion();
        } catch {
            notificar.error('No pudimos obtener tu ubicación');
        }
    };

    // Re-fetch al recuperar foco (después de que el usuario activó GPS por
    // ejemplo, o volvió de otra pestaña).
    useEffect(() => {
        const handler = () => {
            if (ciudad && latitud && longitud) refetch();
        };
        window.addEventListener('focus', handler);
        return () => window.removeEventListener('focus', handler);
    }, [ciudad, latitud, longitud, refetch]);

    // ─── Render ────────────────────────────────────────────────────────────────

    const sinGps = !latitud || !longitud;

    // Cercanos deduplicados: excluye los ya mostrados en recientes y trending.
    const cercanosDeduplicados = useMemo(() => {
        const excluir = new Set([...idsRecientes, ...trending.map((a) => a.id)]);
        return cercanos.filter((a) => !excluir.has(a.id));
    }, [cercanos, idsRecientes, trending]);

    // Total deduplicado para el KPI del header.
    const totalArticulos = useMemo(() => {
        if (!data) return 0;
        const ids = new Set([
            ...recientes.map((a) => a.id),
            ...cercanos.map((a) => a.id),
        ]);
        return ids.size;
    }, [data, recientes, cercanos]);

    return (
        <div className="min-h-full bg-transparent">
            {/* ════════════════════════════════════════════════════════════════
                HEADER DARK STICKY — Identidad teal del MarketPlace
            ════════════════════════════════════════════════════════════════ */}
            <div className="sticky top-0 z-20">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div
                        className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                        style={{ background: '#000000' }}
                    >
                        {/* Glow sutil teal arriba-derecha */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background:
                                    'radial-gradient(ellipse at 85% 20%, rgba(20,184,166,0.07) 0%, transparent 50%)',
                            }}
                        />
                        {/* Grid pattern sutil */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                opacity: 0.08,
                                backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                                  repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                            }}
                        />

                        <div className="relative z-10">
                            {/* ═══ MOBILE HEADER (<lg) ═══
                                Solo logo + subtítulo. La búsqueda la aporta
                                el Navbar global (useSearchStore + placeholder
                                'Buscar en Marketplace...'). */}
                            <div className="lg:hidden">
                                <div className="flex items-center justify-center gap-2 px-3 pt-4 pb-2">
                                    <div
                                        className="flex h-9 w-9 items-center justify-center rounded-lg"
                                        style={{
                                            background:
                                                'linear-gradient(135deg, #2dd4bf, #0d9488)',
                                        }}
                                    >
                                        <ShoppingCart
                                            className="h-4.5 w-4.5 text-black"
                                            strokeWidth={2.5}
                                        />
                                    </div>
                                    <span className="text-2xl font-extrabold tracking-tight text-white">
                                        Market<span className="text-teal-400">Place</span>
                                    </span>
                                </div>
                                {/* Subtítulo decorativo — ciudad + total al estilo Ofertas */}
                                <div className="flex items-center justify-center gap-2.5 pb-3">
                                    <div
                                        className="h-0.5 w-14 rounded-full"
                                        style={{
                                            background:
                                                'linear-gradient(90deg, transparent, rgba(20,184,166,0.7))',
                                        }}
                                    />
                                    <span className="text-sm font-light text-white/70 tracking-wide whitespace-nowrap">
                                        {ciudad ? (
                                            <>
                                                En{' '}
                                                <span className="font-bold text-white">
                                                    {ciudad}
                                                </span>
                                                {data && (
                                                    <> · {totalArticulos} artículos</>
                                                )}
                                            </>
                                        ) : (
                                            <span className="font-bold uppercase tracking-widest text-white/60 text-[11px]">
                                                Compra-Venta Local
                                            </span>
                                        )}
                                    </span>
                                    <div
                                        className="h-0.5 w-14 rounded-full"
                                        style={{
                                            background:
                                                'linear-gradient(90deg, rgba(20,184,166,0.7), transparent)',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* ═══ DESKTOP HEADER (>=lg) ═══ */}
                            <div className="hidden lg:block">
                                <div className="flex items-center justify-between gap-6 px-6 py-4 2xl:px-8 2xl:py-5">
                                    {/* Logo */}
                                    <div className="flex shrink-0 items-center gap-3">
                                        <div
                                            className="flex h-11 w-11 items-center justify-center rounded-lg 2xl:h-12 2xl:w-12"
                                            style={{
                                                background:
                                                    'linear-gradient(135deg, #2dd4bf, #0d9488)',
                                            }}
                                        >
                                            <ShoppingCart
                                                className="h-6 w-6 text-black 2xl:h-6.5 2xl:w-6.5"
                                                strokeWidth={2.5}
                                            />
                                        </div>
                                        <span className="text-2xl font-extrabold tracking-tight text-white 2xl:text-3xl">
                                            Market
                                            <span className="text-teal-400">Place</span>
                                        </span>
                                    </div>

                                    {/* Centro: "Compra y vende en Ciudad" + subtítulo */}
                                    <div className="min-w-0 flex-1 text-center">
                                        <h1 className="truncate text-3xl font-light leading-tight text-white/70 2xl:text-[34px]">
                                            Compra y vende en{' '}
                                            <span className="font-bold text-white">
                                                {ciudad || 'tu ciudad'}
                                            </span>
                                        </h1>
                                        <div className="mt-1.5 flex items-center justify-center gap-3">
                                            <div
                                                className="h-0.5 w-20 rounded-full 2xl:w-24"
                                                style={{
                                                    background:
                                                        'linear-gradient(90deg, transparent, rgba(20,184,166,0.7))',
                                                }}
                                            />
                                            <span className="text-sm font-semibold uppercase tracking-[3px] text-teal-400/80 2xl:text-base">
                                                artículos cerca de ti
                                            </span>
                                            <div
                                                className="h-0.5 w-20 rounded-full 2xl:w-24"
                                                style={{
                                                    background:
                                                        'linear-gradient(90deg, rgba(20,184,166,0.7), transparent)',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Derecha: solo KPI */}
                                    {data && (
                                        <div className="flex shrink-0 flex-col items-end">
                                            <span
                                                data-testid="kpi-total-articulos"
                                                className="text-3xl font-extrabold leading-none tabular-nums text-white 2xl:text-[40px]"
                                            >
                                                {totalArticulos}
                                            </span>
                                            <span className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-teal-400/80 2xl:text-sm">
                                                Artículos
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                CONTENIDO
            ════════════════════════════════════════════════════════════════ */}
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                {/* Botón Publicar — solo desktop, debajo del header */}
                <div className="hidden lg:flex justify-end pt-4 pb-1">
                    <button
                        data-testid="btn-publicar-desktop"
                        onClick={handlePublicar}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-2 text-sm font-bold text-white shadow-md hover:scale-[1.02] transition-transform"
                    >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                        Publicar artículo
                    </button>
                </div>

                {/* Estado: sin ciudad seleccionada en el Navbar global */}
                {!ciudad && (
                    <div className="mx-3 mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 lg:mx-0">
                        <div className="flex items-start gap-2.5">
                            <AlertCircle
                                className="h-5 w-5 shrink-0 text-amber-600"
                                strokeWidth={2}
                            />
                            <div>
                                <strong className="font-semibold">
                                    Selecciona tu ciudad
                                </strong>
                                <p className="mt-0.5">
                                    Usa el selector de ubicación arriba para elegir tu
                                    ciudad y ver artículos cerca de ti.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Estado: con ciudad pero sin GPS ─ mensaje accionable */}
                {ciudad && sinGps && (
                    <div className="mx-3 mt-6 rounded-xl border-2 border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 lg:mx-0">
                        <div className="flex items-start gap-3">
                            <MapPin
                                className="h-5 w-5 shrink-0 text-teal-600"
                                strokeWidth={2}
                            />
                            <div className="flex-1">
                                <strong className="font-semibold">
                                    Activa tu ubicación
                                </strong>
                                <p className="mt-0.5">
                                    Para ver artículos cerca de ti necesitamos tu ubicación.
                                    Mientras tanto te mostramos lo recién publicado en{' '}
                                    {ciudad}.
                                </p>
                                <button
                                    data-testid="btn-activar-ubicacion"
                                    onClick={handleActivarUbicacion}
                                    disabled={cargandoGps}
                                    className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:opacity-60"
                                >
                                    {cargandoGps ? 'Obteniendo...' : 'Activar ubicación'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Estado: loading inicial */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Spinner tamanio="lg" />
                    </div>
                )}

                {/* Estado: error */}
                {isError && !isLoading && (
                    <div className="mx-3 mt-6 rounded-xl border-2 border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 lg:mx-0">
                        <div className="flex items-start gap-2.5">
                            <AlertCircle
                                className="h-5 w-5 shrink-0 text-rose-600"
                                strokeWidth={2}
                            />
                            <div>
                                <strong className="font-semibold">
                                    No pudimos cargar el feed
                                </strong>
                                <p className="mt-0.5">
                                    Revisa tu conexión e intenta de nuevo.
                                </p>
                                <button
                                    data-testid="btn-reintentar-feed"
                                    onClick={() => refetch()}
                                    className="mt-2.5 inline-flex cursor-pointer items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                                >
                                    Reintentar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Sección "Recién publicado" ────────────────────────── */}
                {!isLoading && !isError && data && recientes.length > 0 && (
                    <SeccionRecientes articulos={recientes} />
                )}

                {/* ─── Sección "Lo más visto hoy" (trending) ─────────────── */}
                {!isLoading && !isError && trending.length >= 3 && (
                    <SeccionTrending articulos={trending} />
                )}

                {/* ─── Sección "Cerca de ti" (solo si hay GPS, deduplicada) ─ */}
                {!isLoading && !isError && data && !sinGps && cercanosDeduplicados.length >= 4 && (
                    <SeccionCercanos articulos={cercanosDeduplicados} />
                )}

                {/* Estado: vacío total */}
                {!isLoading &&
                    !isError &&
                    data &&
                    recientes.length === 0 &&
                    cercanos.length === 0 && (
                        <div className="mx-3 mb-12 mt-10 rounded-xl border-2 border-slate-200 bg-white p-8 text-center lg:mx-0">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                                <ShoppingCart
                                    className="h-8 w-8 text-slate-400"
                                    strokeWidth={1.5}
                                />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-slate-900">
                                Aún no hay artículos en tu ciudad
                            </h3>
                            <p className="text-sm text-slate-600">
                                ¡Sé el primero en publicar algo en {ciudad ?? 'tu zona'}!
                            </p>
                        </div>
                    )}

                <div className="h-24 lg:h-12" />
            </div>

            {/* ════════════════════════════════════════════════════════════════
                FAB "+ Publicar" — solo móvil, sobre BottomNav
            ════════════════════════════════════════════════════════════════ */}
            <button
                data-testid="fab-publicar-mobile"
                onClick={handlePublicar}
                aria-label="Publicar artículo"
                className="fixed bottom-20 right-4 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-linear-to-br from-slate-800 to-slate-950 text-white shadow-lg transition-transform hover:scale-105 lg:hidden"
            >
                <Plus className="h-6 w-6" strokeWidth={2.5} />
            </button>

            {/* Overlay del buscador (anclado al useSearchStore global) */}
            <OverlayBuscadorMarketplace />
        </div>
    );
}

// =============================================================================
// SECCIÓN: RECIÉN PUBLICADO (carrusel horizontal)
// =============================================================================

function SeccionRecientes({ articulos }: { articulos: ArticuloFeed[] }) {
    const carruselRef = useRef<HTMLDivElement>(null);
    useDragScroll(carruselRef);

    return (
        <section className="mt-6 lg:mt-8">
            <div className="flex items-baseline gap-3 px-3 lg:px-0">
                <h2 className="text-lg font-bold text-slate-900 lg:text-xl 2xl:text-2xl">
                    Recién publicado
                </h2>
                <span className="text-base font-semibold text-teal-500 lg:text-lg 2xl:text-xl">
                    {articulos.length}
                </span>
            </div>
            {/* Wrapper relativo para la sombra fade derecha */}
            <div className="relative">
                <div
                    ref={carruselRef}
                    className="mt-3 flex cursor-grab select-none gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_article]:cursor-grab! active:[&_article]:cursor-grabbing! lg:gap-4 lg:px-0"
                    data-testid="carrusel-recientes"
                >
                    {articulos.map((articulo) => (
                        <div
                            key={articulo.id}
                            className="w-44 shrink-0 lg:w-56 2xl:w-60"
                        >
                            <CardArticulo articulo={articulo} />
                        </div>
                    ))}
                </div>
                {/* Sombra fade derecha — indica más contenido */}
                <div
                    className="pointer-events-none absolute inset-y-0 right-0 w-16 lg:w-20"
                    style={{
                        background: 'linear-gradient(to left, rgba(0,0,0,0.22) 0%, transparent 100%)',
                    }}
                />
            </div>
        </section>
    );
}

// =============================================================================
// SECCIÓN: LO MÁS VISTO HOY (carrusel horizontal, igual patrón que recientes)
// =============================================================================

function SeccionTrending({ articulos }: { articulos: ArticuloFeed[] }) {
    const carruselRef = useRef<HTMLDivElement>(null);
    useDragScroll(carruselRef);

    return (
        <section className="mt-8 lg:mt-10">
            <div className="flex items-baseline gap-3 px-3 lg:px-0">
                <h2 className="text-lg font-bold text-slate-900 lg:text-xl 2xl:text-2xl">
                    Lo más visto hoy
                </h2>
                <span className="text-base font-semibold text-teal-500 lg:text-lg 2xl:text-xl">
                    {articulos.length}
                </span>
            </div>
            <div className="relative">
                <div
                    ref={carruselRef}
                    className="mt-3 flex cursor-grab select-none gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_article]:cursor-grab! active:[&_article]:cursor-grabbing! lg:gap-4 lg:px-0"
                    data-testid="carrusel-trending"
                >
                    {articulos.map((articulo) => (
                        <div key={articulo.id} className="w-44 shrink-0 lg:w-56 2xl:w-60">
                            <CardArticulo articulo={articulo} />
                        </div>
                    ))}
                </div>
                <div
                    className="pointer-events-none absolute inset-y-0 right-0 w-16 lg:w-20"
                    style={{
                        background: 'linear-gradient(to left, rgba(0,0,0,0.22) 0%, transparent 100%)',
                    }}
                />
            </div>
        </section>
    );
}

// =============================================================================
// SECCIÓN: CERCA DE TI (grid)
// =============================================================================

interface SeccionCercanosProps {
    articulos: ArticuloFeed[];
}

function SeccionCercanos({ articulos }: SeccionCercanosProps) {
    if (articulos.length === 0) return null;

    return (
        <section className="mt-8 lg:mt-10">
            <div className="flex items-baseline gap-3 px-3 lg:px-0">
                <h2 className="text-lg font-bold text-slate-900 lg:text-xl 2xl:text-2xl">
                    Cerca de ti
                </h2>
            </div>
            <div
                data-testid="grid-cercanos"
                className="mt-3 grid grid-cols-2 gap-3 px-3 lg:grid-cols-4 lg:gap-4 lg:px-0 2xl:grid-cols-6"
            >
                {articulos.map((articulo) => (
                    <CardArticulo key={articulo.id} articulo={articulo} />
                ))}
            </div>
        </section>
    );
}

export default PaginaMarketplace;
