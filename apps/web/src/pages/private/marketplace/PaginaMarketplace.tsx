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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { ShoppingCart, Plus, MapPin, AlertCircle, ChevronLeft, Search, Menu, X, Sparkles, CornerRightDown, Loader2, Bell } from 'lucide-react';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useSearchStore } from '../../../stores/useSearchStore';
import { useUiStore } from '../../../stores/useUiStore';
import { useMarketplaceFeed, useFeedInfinitoMarketplace } from '../../../hooks/queries/useMarketplace';
import { CardArticuloFeed } from '../../../components/marketplace/CardArticuloFeed';
import { ReelMarketplace } from '../../../components/marketplace/ReelMarketplace';
import { ChipsFiltrosFeed } from '../../../components/marketplace/ChipsFiltrosFeed';
import { ModalArticuloDetalle } from '../../../components/marketplace/ModalArticuloDetalle';
import { Spinner } from '../../../components/ui/Spinner';
import { notificar } from '../../../utils/notificaciones';
import type { OrdenFeedInfinito } from '../../../types/marketplace';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';
import { useNotificacionesStore } from '../../../stores/useNotificacionesStore';
import { IconoMenuMorph } from '../../../components/ui/IconoMenuMorph';

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

    // BottomNav auto-hide tracker — el FAB Publicar baja a `bottom-4` cuando
    // el BottomNav se oculta y vuelve a `bottom-20` cuando reaparece.
    const { shouldShow: bottomNavVisible } = useHideOnScroll({ direction: 'down' });

    // Notificaciones — botón Bell en el header móvil (entre buscar y menú).
    const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
    const togglePanelNotificaciones = useNotificacionesStore((s) => s.togglePanel);

    // Modal de detalle del artículo (overlay tipo Facebook). Se abre al
    // hacer click en "Ver N preguntas más" desde la card del feed. Guardamos
    // SOLO el id (no el snapshot) para que el modal derive el artículo desde
    // el cache de React Query en cada render — así el corazón y el
    // `totalGuardados` se mantienen sincronizados con el feed cuando el
    // usuario hace toggle de guardado en cualquiera de los dos lados.
    const [articuloModalId, setArticuloModalId] = useState<string | null>(null);
    const handleCerrarModal = useCallback(() => setArticuloModalId(null), []);

    // ─── React Query ───────────────────────────────────────────────────────────

    // Feed v1.1 (legacy) — mantenido para el caso de fallback y la sección
    // antigua "Cercanos" mientras dura la migración. El feed nuevo (v1.2,
    // estilo Facebook) usa `useFeedInfinitoMarketplace` abajo.
    const { data, isLoading: isLoadingLegacy, isError: isErrorLegacy, refetch } = useMarketplaceFeed({
        ciudad,
        lat: latitud,
        lng: longitud,
    });

    const recientes = data?.recientes ?? [];
    const cercanos = data?.cercanos ?? [];

    // Feed v1.2 (estilo Facebook) — orden seleccionable + scroll infinito.
    const [orden, setOrden] = useState<OrdenFeedInfinito>('recientes');

    const {
        data: dataFeedInfinito,
        isLoading: isLoadingFeed,
        isError: isErrorFeed,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useFeedInfinitoMarketplace({
        ciudad,
        lat: latitud,
        lng: longitud,
        orden,
        limite: 10,
    });

    const articulosFeed = useMemo(
        () => dataFeedInfinito?.pages.flatMap((p) => p.articulos) ?? [],
        [dataFeedInfinito]
    );

    // Artículo del modal — derivado del cache, no de un snapshot. Esto
    // garantiza que cualquier optimistic update del feed (ej. toggle de
    // guardado desde la card o desde dentro del modal) se refleja al
    // instante en ambos lados.
    const articuloModal = useMemo(
        () =>
            articuloModalId
                ? articulosFeed.find((a) => a.id === articuloModalId) ?? null
                : null,
        [articuloModalId, articulosFeed]
    );

    // Reel: usa los primeros ~12 artículos recientes del feed infinito SOLO
    // cuando el orden activo es "recientes" (decisión: el reel desaparece al
    // filtrar). Si ya tenemos cargados <12, usamos los que haya.
    const articulosReel = useMemo(
        () => (orden === 'recientes' ? articulosFeed.slice(0, 12) : []),
        [orden, articulosFeed]
    );

    // El feed grande muestra TODOS los artículos, incluso los que están en el
    // reel. El reel es un "highlight" rotativo de los más recientes (igual que
    // Stories vs Feed en Instagram); no se considera duplicado — son contextos
    // distintos. Sin esto, la mayoría del catálogo quedaba atrapado en el reel
    // y el feed grande se sentía vacío después de pocas cards.
    const articulosFeedSinReel = articulosFeed;

    // ─── Handlers ──────────────────────────────────────────────────────────────
    const navigate = useNavigate();
    const abrirBuscador = useSearchStore((s) => s.abrirBuscador);
    const cerrarBuscador = useSearchStore((s) => s.cerrarBuscador);
    const query = useSearchStore((s) => s.query);
    const setQuery = useSearchStore((s) => s.setQuery);
    const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
    const abrirModalUbicacion = useUiStore((s) => s.abrirModalUbicacion);

    // Buscador móvil inline (mismo patrón que Negocios). Al abrir el input,
    // también abrimos el overlay del store para que se vean sugerencias/
    // populares/recientes mientras el usuario escribe.
    const [buscadorMovilAbierto, setBuscadorMovilAbierto] = useState(false);
    const inputBusquedaMovilRef = useRef<HTMLInputElement>(null);

    const handlePublicar = () => {
        navigate('/marketplace/publicar');
    };
    // Botón ← respeta historial (flecha nativa móvil) con fallback a /inicio.
    const handleVolver = useVolverAtras('/inicio');
    const handleAbrirBuscadorMovil = () => {
        // No llamar a abrirBuscador() aquí: el overlay del store debe aparecer
        // solo cuando el usuario empiece a escribir (query.length >= 1).
        // Mientras tanto se ve solo el input inline expandido.
        setBuscadorMovilAbierto(true);
        setTimeout(() => inputBusquedaMovilRef.current?.focus(), 100);
    };
    const handleCerrarBuscadorMovil = () => {
        setQuery('');
        cerrarBuscador();
        setBuscadorMovilAbierto(false);
    };
    const handleEnterBusqueda = () => {
        const termino = query.trim();
        if (termino.length < 2) return;
        cerrarBuscador();
        setBuscadorMovilAbierto(false);
        navigate(`/marketplace/buscar?q=${encodeURIComponent(termino)}`);
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

    // ─── Scroll infinito automático con IntersectionObserver ──────────────────
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasNextPage || isFetchingNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entrada] = entries;
                if (entrada?.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: '600px 0px' } // dispara antes de llegar al fondo
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // ─── Render ────────────────────────────────────────────────────────────────

    const sinGps = !latitud || !longitud;

    // Estados unificados: el feed infinito es el principal a partir de v1.2.
    // Mantengo isLoadingLegacy/isErrorLegacy para no romper el bloque legacy si
    // se usa, pero la UI principal escucha al feed infinito.
    const isLoading = isLoadingFeed;
    const isError = isErrorFeed;

    // Total para el KPI del header (basado en el feed v1.1 que tiene los
    // arrays completos de recientes+cercanos por ciudad). Se mantiene.
    const totalArticulos = useMemo(() => {
        if (!data) return 0;
        const ids = new Set([
            ...recientes.map((a) => a.id),
            ...cercanos.map((a) => a.id),
        ]);
        return ids.size;
    }, [data, recientes, cercanos]);

    // Para suprimir el warning de variables no usadas tras la migración v1.2.
    void isLoadingLegacy;
    void isErrorLegacy;

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
                                Patrón inmersivo (sin Navbar global). Dos modos:
                                  - Cerrado: [← volver] [logo] [buscar] [menú]
                                  - Abierto: input expandido + X (mismo patrón
                                    que Negocios). El input escribe a
                                    useSearchStore.query para que el
                                    OverlayBuscadorMarketplace muestre
                                    sugerencias/populares/recientes. */}
                            <div className="lg:hidden">
                                {!buscadorMovilAbierto ? (
                                    <div className="flex items-center justify-between px-3 pt-4 pb-2.5">
                                        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
                                            <button
                                                data-testid="btn-volver-marketplace"
                                                onClick={handleVolver}
                                                aria-label="Volver"
                                                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                            >
                                                <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                            </button>
                                            <div
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
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
                                            <span className="truncate text-2xl font-extrabold tracking-tight text-white ml-1.5">
                                                Market<span className="text-teal-400">Place</span>
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                data-testid="btn-buscar-marketplace"
                                                onClick={handleAbrirBuscadorMovil}
                                                aria-label="Buscar en MarketPlace"
                                                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                            >
                                                <Search className="h-6 w-6 animate-pulse" strokeWidth={2.5} />
                                            </button>
                                            <button
                                                data-testid="btn-notificaciones-marketplace"
                                                onClick={(e) => { e.currentTarget.blur(); togglePanelNotificaciones(); }}
                                                aria-label="Notificaciones"
                                                className="relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                            >
                                                <Bell className="h-6 w-6 animate-bell-ring" strokeWidth={2.5} />
                                                {cantidadNoLeidas > 0 && (
                                                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold ring-2 ring-black px-1 leading-none">
                                                        {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                                                    </span>
                                                )}
                                            </button>
                                            <button
                                                data-testid="btn-menu-marketplace"
                                                onClick={abrirMenuDrawer}
                                                aria-label="Abrir menú"
                                                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                            >
                                                <IconoMenuMorph />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2.5 px-3 pt-4 pb-2.5">
                                        <div className="relative flex-1">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 text-white/40" />
                                            <input
                                                ref={inputBusquedaMovilRef}
                                                id="input-busqueda-navbar"
                                                data-testid="input-buscar-marketplace"
                                                type="text"
                                                value={query}
                                                onChange={(e) => setQuery(e.target.value)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleEnterBusqueda(); }}
                                                placeholder="Buscar en MarketPlace..."
                                                autoComplete="off"
                                                autoCapitalize="off"
                                                spellCheck="false"
                                                className="w-full rounded-full bg-white/15 py-2 pl-10 pr-10 text-lg text-white placeholder-white/40 outline-none"
                                            />
                                            {query.trim() && (
                                                <button
                                                    onClick={() => { setQuery(''); inputBusquedaMovilRef.current?.focus(); }}
                                                    className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/25 transition-colors hover:bg-white/40"
                                                    aria-label="Limpiar búsqueda"
                                                >
                                                    <X className="h-4 w-4 text-white" />
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleCerrarBuscadorMovil}
                                            aria-label="Cerrar buscador"
                                            className="shrink-0 cursor-pointer rounded-full p-0.5 text-white/80 hover:bg-white/20"
                                        >
                                            <X className="h-7 w-7" />
                                        </button>
                                    </div>
                                )}
                                {/* Subtítulo decorativo — ciudad + total al estilo Ofertas */}
                                <div className="pb-2 overflow-hidden">
                                    <div className="flex items-center justify-center gap-2.5">
                                        <div
                                            className="h-0.5 w-14 rounded-full"
                                            style={{
                                                background:
                                                    'linear-gradient(90deg, transparent, rgba(20,184,166,0.7))',
                                            }}
                                        />
                                        <span className="text-base font-light text-white/70 tracking-wide whitespace-nowrap">
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

                                {/* Chips de filtros — dentro del header dark
                                    (mismo patrón que Negocios y Ofertas en
                                    móvil). Scroll horizontal sin scrollbar. */}
                                <div className="px-3 pb-3">
                                    <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                        <ChipsFiltrosFeed
                                            valor={orden}
                                            onCambio={setOrden}
                                            gpsDisponible={!sinGps}
                                            variant="dark"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ═══ DESKTOP HEADER (>=lg) ═══
                                Una sola fila para igualar el alto del header
                                de Ofertas (`py-4 2xl:py-5` con logo h-11/12).
                                Layout: Logo + Título a la izquierda · chips
                                centro · KPI compacto + Publicar derecha. */}
                            <div className="hidden lg:block">
                                <div className="flex items-center justify-between gap-4 px-6 py-4 2xl:px-8 2xl:py-5">
                                    {/* Izquierda: flecha + logo + título (agrupados) */}
                                    <div className="flex shrink-0 items-center gap-3">
                                        {/* Flecha ← regresar al inicio (solo desktop) */}
                                        <button
                                            data-testid="btn-volver-marketplace-desktop"
                                            onClick={handleVolver}
                                            aria-label="Volver al inicio"
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white cursor-pointer"
                                        >
                                            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                        </button>
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
                                        <div className="flex items-baseline">
                                            <span className="text-2xl font-extrabold tracking-tight text-white 2xl:text-3xl">
                                                Market
                                            </span>
                                            <span className="text-2xl font-extrabold tracking-tight text-teal-400 2xl:text-3xl">
                                                Place
                                            </span>
                                        </div>
                                    </div>

                                    {/* Spacer para empujar chips + KPI + Publicar a la derecha */}
                                    <div className="flex-1" />

                                    {/* Derecha: chips de filtros + KPI dos líneas + botón Publicar.
                                        Justificados a la derecha junto al KPI (decisión de Juan
                                        para que las 3 secciones públicas se vean coherentes). */}
                                    <div className="flex shrink-0 items-center gap-4">
                                        <div className="min-w-0">
                                            <ChipsFiltrosFeed
                                                valor={orden}
                                                onCambio={setOrden}
                                                gpsDisponible={!sinGps}
                                                variant="dark"
                                            />
                                        </div>
                                        {data && (
                                            <div className="flex flex-col items-end shrink-0">
                                                <span
                                                    data-testid="kpi-total-articulos"
                                                    className="text-3xl 2xl:text-[40px] font-extrabold text-white leading-none tabular-nums"
                                                >
                                                    {totalArticulos}
                                                </span>
                                                <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-teal-400/80 uppercase tracking-wider mt-1">
                                                    Artículos
                                                </span>
                                            </div>
                                        )}
                                        {/* Botón Publicar movido a FAB flotante — ver bloque al final
                                            del componente. FAB visible en móvil y desktop con animación
                                            rotate-pulse del icono "+" y color teal. */}
                                    </div>
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
                {/* La barra de filtros + Publicar (desktop) ahora vive dentro
                    del header dark como segunda fila — así se mueve sticky con
                    el resto del header sin sentirse desconectada. Ver bloque
                    DESKTOP HEADER arriba. */}

                {/* Estado: sin ciudad seleccionada. En móvil (sin Navbar global)
                    el botón abre el ModalUbicacion para que el usuario pueda
                    elegirla sin depender del selector del Navbar. */}
                {!ciudad && (
                    <div className="mx-3 mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 lg:mx-0">
                        <div className="flex items-start gap-2.5">
                            <AlertCircle
                                className="h-5 w-5 shrink-0 text-amber-600"
                                strokeWidth={2}
                            />
                            <div className="flex-1">
                                <strong className="font-semibold">
                                    Selecciona tu ciudad
                                </strong>
                                <p className="mt-0.5">
                                    Necesitamos tu ciudad para mostrarte artículos cerca de ti.
                                </p>
                                <button
                                    data-testid="btn-seleccionar-ciudad"
                                    onClick={abrirModalUbicacion}
                                    className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm lg:hover:bg-amber-700"
                                >
                                    <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
                                    Elegir ciudad
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Estado: con ciudad pero sin GPS — invitación dinámica al
                    estilo de los demás estados (sin card, halos pulsantes,
                    sparkles). Importante: este bloque NO bloquea el feed,
                    el usuario sigue viendo lo "Recién publicado" debajo. */}
                {ciudad && sinGps && (
                    <div className="relative mt-8 flex flex-col items-center px-6 pb-6 text-center lg:mt-12 lg:pb-8">
                        <Sparkles
                            className="absolute left-8 top-1 h-5 w-5 animate-pulse text-teal-400/70"
                            strokeWidth={2}
                            style={{ animationDuration: '2.5s' }}
                        />
                        <Sparkles
                            className="absolute right-10 top-8 h-4 w-4 animate-pulse text-teal-300/70"
                            strokeWidth={2}
                            style={{ animationDuration: '3.2s', animationDelay: '0.6s' }}
                        />

                        <div className="relative mb-5">
                            <div
                                className="absolute inset-0 -m-5 animate-ping rounded-full bg-teal-300/40"
                                style={{ animationDuration: '2.4s' }}
                            />
                            <div
                                className="absolute inset-0 -m-2 animate-ping rounded-full bg-teal-400/40"
                                style={{ animationDuration: '2.4s', animationDelay: '0.4s' }}
                            />
                            <div
                                className="relative flex h-20 w-20 items-center justify-center rounded-full shadow-xl"
                                style={{
                                    background:
                                        'linear-gradient(135deg, #2dd4bf, #0d9488)',
                                }}
                            >
                                <MapPin className="h-9 w-9 text-white" strokeWidth={2} />
                            </div>
                        </div>

                        <h3 className="mb-2 text-xl font-extrabold tracking-tight text-slate-900 lg:text-2xl">
                            Activa tu ubicación
                        </h3>
                        <p className="mb-5 max-w-sm text-sm text-slate-600 lg:text-base">
                            Para ver artículos cerca de ti necesitamos tu ubicación.
                            Mientras tanto, te mostramos lo recién publicado en{' '}
                            <span className="font-bold text-slate-900">{ciudad}</span>.
                        </p>

                        <button
                            data-testid="btn-activar-ubicacion"
                            onClick={handleActivarUbicacion}
                            disabled={cargandoGps}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-teal-500 to-teal-700 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <MapPin className="h-4 w-4" strokeWidth={2.5} />
                            {cargandoGps ? 'Obteniendo...' : 'Activar ubicación'}
                        </button>
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
                                    className="mt-2.5 inline-flex cursor-pointer items-center rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm lg:hover:bg-rose-700"
                                >
                                    Reintentar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════════════════════
                    FEED v1.2 — REEL + CHIPS + FEED INFINITO ESTILO FACEBOOK
                ════════════════════════════════════════════════════════════════ */}
                {!isLoading && !isError && articulosFeed.length > 0 && (
                    <>
                        {/* Reel: solo se muestra cuando NO hay filtros activos
                            (orden=recientes). Decisión Juan: el reel solo vive
                            en el "home" del marketplace. Acotado al mismo ancho
                            que el feed (max-w-[920px]) para alineación visual. */}
                        {orden === 'recientes' && articulosReel.length > 0 && (
                            <div className="mx-auto mt-2 max-w-[920px] lg:mt-4">
                                <ReelMarketplace articulos={articulosReel} />
                            </div>
                        )}

                        {/* Feed infinito: cards grandes estilo Facebook.
                            Móvil → full-width sin gap, separador inferior por card.
                            Desktop → columna centrada ~920px con gap y bordes. */}
                        <div className="mx-auto max-w-full lg:max-w-[920px] space-y-2 lg:space-y-4 lg:px-4 lg:py-2">
                            {articulosFeedSinReel.map((articulo) => (
                                <CardArticuloFeed
                                    key={articulo.id}
                                    articulo={articulo}
                                    onAbrirDetalle={() => setArticuloModalId(articulo.id)}
                                />
                            ))}

                            {/* Sentinel para IntersectionObserver — dispara
                                fetchNextPage cuando entra en viewport. */}
                            {hasNextPage && (
                                <div
                                    ref={sentinelRef}
                                    className="flex items-center justify-center py-8"
                                >
                                    {isFetchingNextPage ? (
                                        <Loader2
                                            className="h-6 w-6 animate-spin text-slate-500"
                                            strokeWidth={2}
                                        />
                                    ) : (
                                        <div className="h-1 w-1" /> /* spacer */
                                    )}
                                </div>
                            )}

                            {!hasNextPage && articulosFeedSinReel.length > 0 && (
                                <p className="py-6 text-center text-sm font-medium text-slate-600">
                                    No hay más publicaciones
                                </p>
                            )}
                        </div>
                    </>
                )}

                {/* Estado: vacío total — invitación dinámica a publicar (sin card) */}
                {!isLoading &&
                    !isError &&
                    data &&
                    recientes.length === 0 &&
                    cercanos.length === 0 && (
                        <div className="relative mt-12 flex flex-col items-center px-6 text-center lg:mt-20">
                            {/* Sparkles decorativos */}
                            <Sparkles
                                className="absolute left-8 top-2 h-5 w-5 animate-pulse text-teal-400/70"
                                strokeWidth={2}
                                style={{ animationDuration: '2.5s' }}
                            />
                            <Sparkles
                                className="absolute right-10 top-10 h-4 w-4 animate-pulse text-teal-300/70"
                                strokeWidth={2}
                                style={{ animationDuration: '3.2s', animationDelay: '0.6s' }}
                            />

                            {/* Icono central con halos pulsantes */}
                            <div className="relative mb-6">
                                <div
                                    className="absolute inset-0 -m-5 animate-ping rounded-full bg-teal-300/40"
                                    style={{ animationDuration: '2.4s' }}
                                />
                                <div
                                    className="absolute inset-0 -m-2 animate-ping rounded-full bg-teal-400/40"
                                    style={{ animationDuration: '2.4s', animationDelay: '0.4s' }}
                                />
                                <div
                                    className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl"
                                    style={{
                                        background:
                                            'linear-gradient(135deg, #2dd4bf, #0d9488)',
                                    }}
                                >
                                    <ShoppingCart
                                        className="h-11 w-11 text-white"
                                        strokeWidth={2}
                                    />
                                </div>
                            </div>

                            <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                                ¡Sé el primero!
                            </h3>
                            <p className="max-w-sm text-base text-slate-600">
                                Aún no hay artículos en{' '}
                                <span className="font-bold text-slate-900">
                                    {ciudad ?? 'tu zona'}
                                </span>
                                . Publica algo y empieza a vender hoy mismo.
                            </p>

                            {/* CTA inline para desktop (donde no hay FAB visible al hacer scroll) */}
                            <button
                                data-testid="btn-publicar-empty-state"
                                onClick={handlePublicar}
                                className="mt-6 hidden cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-slate-800 to-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] lg:inline-flex"
                            >
                                <Plus className="h-4 w-4" strokeWidth={2.5} />
                                Publicar primer artículo
                            </button>
                        </div>
                    )}

                {/* Indicador animado apuntando al FAB — solo móvil cuando feed vacío */}
                {!isLoading &&
                    !isError &&
                    data &&
                    recientes.length === 0 &&
                    cercanos.length === 0 && (
                        <div
                            data-testid="empty-state-arrow-fab"
                            className="pointer-events-none fixed bottom-36 right-3 z-20 flex flex-col items-end gap-1 lg:hidden"
                            style={{ animation: 'mp-arrow-bounce 1.4s ease-in-out infinite' }}
                        >
                            <span className="rounded-full bg-linear-to-br from-slate-800 to-slate-950 px-3 py-1.5 text-sm font-bold text-white shadow-lg whitespace-nowrap">
                                ¡Publica aquí!
                            </span>
                            <CornerRightDown
                                className="h-8 w-8 text-slate-900 drop-shadow"
                                strokeWidth={3}
                            />
                            <style>{`
                                @keyframes mp-arrow-bounce {
                                    0%, 100% { transform: translate(0, 0); }
                                    50% { transform: translate(6px, 6px); }
                                }
                            `}</style>
                        </div>
                    )}

                <div className="h-24 lg:h-12" />
            </div>

            {/* ════════════════════════════════════════════════════════════════
                FAB "+ Publicar" — visible en móvil y desktop. En móvil baja a
                bottom-4 cuando el BottomNav se oculta, sube a bottom-20 cuando
                reaparece. En desktop queda fijo en bottom-6. Color teal de la
                marca MP, icono con animación rotate-pulse cada 2.4s.
            ════════════════════════════════════════════════════════════════ */}
            <button
                data-testid="fab-publicar"
                onClick={handlePublicar}
                aria-label="Publicar artículo"
                style={{
                    transition: 'bottom 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out',
                }}
                className={`fixed right-4 z-30 flex cursor-pointer flex-col items-center gap-1 lg:bottom-6 lg:right-[330px] 2xl:right-[394px] ${
                    bottomNavVisible ? 'bottom-20' : 'bottom-4'
                }`}
            >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-500/30 ring-2 ring-teal-300/30 transition-transform hover:scale-105">
                    <Plus
                        className="h-6 w-6"
                        strokeWidth={2.75}
                        style={{ animation: 'fab-publicar-pulse 2.4s ease-in-out infinite' }}
                    />
                </span>
                {/* Label "Publicar" — visible en móvil y desktop.
                    Móvil: chip blanco translúcido con sombra para legibilidad
                    sobre fotos del feed (fondos impredecibles).
                    Desktop: texto plano sobre el fondo claro `bg-slate-100`. */}
                <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-sm font-bold text-slate-700 shadow-md backdrop-blur-sm lg:bg-transparent lg:px-0 lg:py-0 lg:text-base lg:shadow-none lg:backdrop-blur-none">
                    Publicar
                </span>
                <style>{`
                    @keyframes fab-publicar-pulse {
                        0%, 100% { transform: rotate(0deg) scale(1); }
                        50% { transform: rotate(90deg) scale(1.15); }
                    }
                `}</style>
            </button>

            {/* Overlay del buscador: ahora se monta GLOBALMENTE en `MainLayout`
                cuando la sección activa es `/marketplace/*`. Antes vivía aquí
                y entonces no funcionaba en sub-rutas como articulo/usuario. */}

            {/* Modal de detalle del artículo (estilo Facebook) — se abre al
                hacer click en "Ver N preguntas más" desde la card del feed. */}
            <ModalArticuloDetalle
                articulo={articuloModal}
                onClose={handleCerrarModal}
            />
        </div>
    );
}

// =============================================================================
// EXPORT
// =============================================================================
// Nota v1.2: las secciones legacy `SeccionRecientes`, `SeccionTrending` y
// `SeccionCercanos` se eliminaron. El feed ahora se renderiza con el reel
// superior (`<ReelMarketplace>`) + columna centrada de cards estilo Facebook
// (`<CardArticuloFeed>`) con scroll infinito.

export default PaginaMarketplace;
