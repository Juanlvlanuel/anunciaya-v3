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
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useScrollAppShell } from '../../../hooks/useScrollAppShell';
import { useMainScrollStore } from '../../../stores/useMainScrollStore';
import { ShoppingCart, Plus, AlertCircle, ChevronLeft, ChevronDown, Search, Tag, Menu, X, CornerRightDown, Loader2 } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Sparkles = (p: IconoWrapperProps) => <Icon icon={ICONOS.premium} {...p} />;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;
import { useGpsStore } from '../../../stores/useGpsStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useSearchStore } from '../../../stores/useSearchStore';
import { useUiStore } from '../../../stores/useUiStore';
import { useMarketplaceFeed, useFeedInfinitoMarketplace, useCategoriasMarketplace } from '../../../hooks/queries/useMarketplace';
import { CardArticuloFeed } from '../../../components/marketplace/CardArticuloFeed';
import { ReelMarketplace } from '../../../components/marketplace/ReelMarketplace';
import { ChipsFiltrosFeed } from '../../../components/marketplace/ChipsFiltrosFeed';
import { ModalArticuloDetalle } from '../../../components/marketplace/ModalArticuloDetalle';
import { ComposerSection } from '../../../components/marketplace/composer/ComposerSection';
import { Spinner } from '../../../components/ui/Spinner';
import { notificar } from '../../../utils/notificaciones';
import type { OrdenFeedInfinito, CategoriaMarketplace } from '../../../types/marketplace';
import { BotonIrArriba } from '../../../components/ui/BotonIrArriba';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
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

    // Modo activo (personal vs comercial). El composer inline solo aparece
    // en modo personal — en comercial los negocios no publican artículos
    // P2P (publican promociones, no productos individuales).
    const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
    const esModoPersonal = modoActivo !== 'comercial';

    // FAB "Publicar": en ESCRITORIO se ancla arriba (bajo el header, medido en
    // `topPublicar`) para dejar libre la esquina inferior; en MÓVIL vive abajo a
    // la derecha (la flecha "ir arriba" va abajo a la izquierda). El BottomNav
    // hace que el FAB móvil suba/baje. Medimos el borde inferior del header
    // sticky (cambia de alto con el buscador móvil).
    const { esEscritorio } = useBreakpoint();
    const { shouldShow: bottomNavVisible } = useHideOnScroll({ direction: 'down' });
    const headerRef = useRef<HTMLDivElement>(null);
    const [topPublicar, setTopPublicar] = useState(96);
    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;
        const medir = () => setTopPublicar(el.getBoundingClientRect().bottom + 8);
        medir();
        const observador = new ResizeObserver(medir);
        observador.observe(el);
        window.addEventListener('resize', medir);
        return () => {
            observador.disconnect();
            window.removeEventListener('resize', medir);
        };
    }, []);

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

    // Doble sentido: 'vendo' (ventas) | 'busco' (demandas). Feed por defecto =
    // ventas. Declarado arriba porque alimenta tanto el feed legacy (KPI) como
    // el feed infinito.
    const [modoFeed, setModoFeed] = useState<'vendo' | 'busco'>('vendo');
    // Filtro por categoría (null = todas). Reemplaza el chip "Cerca de ti".
    const [categoriaFeed, setCategoriaFeed] = useState<number | null>(null);
    const { data: categoriasMP = [] } = useCategoriasMarketplace();

    // Feed v1.1 (legacy) — mantenido para el caso de fallback y la sección
    // antigua "Cercanos" mientras dura la migración. El feed nuevo (v1.2,
    // estilo Facebook) usa `useFeedInfinitoMarketplace` abajo.
    const { data, isLoading: isLoadingLegacy, isError: isErrorLegacy, refetch } = useMarketplaceFeed({
        ciudad,
        lat: latitud,
        lng: longitud,
        modo: modoFeed,
        categoriaId: categoriaFeed ?? undefined,
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
        modo: modoFeed,
        categoriaId: categoriaFeed ?? undefined,
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
        () =>
            modoFeed === 'vendo' && orden === 'recientes'
                ? articulosFeed.slice(0, 12)
                : [],
        [modoFeed, orden, articulosFeed]
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
    const buscadorAbierto = useSearchStore((s) => s.buscadorAbierto);
    const query = useSearchStore((s) => s.query);
    const setQuery = useSearchStore((s) => s.setQuery);
    const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
    const abrirModalUbicacion = useUiStore((s) => s.abrirModalUbicacion);

    // Buscador móvil inline (mismo patrón que Negocios). Al abrir el input,
    // también abrimos el overlay del store para que se vean sugerencias/
    // populares/recientes mientras el usuario escribe.
    const [buscadorMovilAbierto, setBuscadorMovilAbierto] = useState(false);
    const inputBusquedaMovilRef = useRef<HTMLInputElement>(null);

    // Sincronización con el store del buscador para que el input móvil
    // flotante no quede "huérfano" cuando algo externo cierra el overlay
    // (back nativo del celular, Escape, click backdrop del scrim).
    //
    // Cuando el usuario empieza a escribir, marcamos el store como
    // abierto. Después, cuando algo externo dispara `cerrarBuscador()`
    // (que resetea `buscadorAbierto: false, query: ''`), detectamos la
    // transición true → false y cerramos también el input flotante.
    //
    // Sin esto, el back nativo del celular cierra el overlay con
    // sugerencias pero deja el input flotante (portal z-[60]) visible
    // colgando sobre el header — UI inconsistente.
    useEffect(() => {
        if (query.length >= 1 && !buscadorAbierto) {
            abrirBuscador();
        }
    }, [query, buscadorAbierto, abrirBuscador]);

    const buscadorAbiertoPrevRef = useRef(buscadorAbierto);
    useEffect(() => {
        if (buscadorAbiertoPrevRef.current && !buscadorAbierto) {
            setBuscadorMovilAbierto(false);
        }
        buscadorAbiertoPrevRef.current = buscadorAbierto;
    }, [buscadorAbierto]);

    const cuerpoRef = useScrollAppShell();
    const mainScrollRef = useMainScrollStore((s) => s.mainScrollRef);
    const handlePublicar = () => {
        // Composer inline: scroll arriba + expandir vía query param, pasando el
        // modo del feed activo (`vendo`/`busco`) para preseleccionar el toggle
        // Vendo/Busco del composer. El orquestador <ComposerSection> lo detecta.
        // El FAB se oculta en modo comercial — los negocios no publican P2P.
        // App-shell propio: el scroll vive en el contenedor interno (móvil) o en el
        // <main> del layout (desktop), no en window. Usa el ref registrado.
        (mainScrollRef?.current ?? window).scrollTo({ top: 0, behavior: 'smooth' });
        navigate(`/marketplace?crear=${modoFeed}`, { replace: true });
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
        // Solo cierra el overlay y el input expandido — no hay página de
        // resultados dedicada. El feed ya está filtrado por `query`.
        cerrarBuscador();
        setBuscadorMovilAbierto(false);
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
        <div className="flex flex-col h-full bg-transparent lg:block lg:h-auto lg:min-h-full">
            {/* ════════════════════════════════════════════════════════════════
                HEADER — móvil: bloque fijo (shrink-0) FUERA del scroll; desktop: sticky
            ════════════════════════════════════════════════════════════════ */}
            <div ref={headerRef} className="shrink-0 z-20 lg:sticky lg:top-0">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div
                        className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
                        style={{ background: '#000000' }}
                    >
                        {/* Glow teal arriba-derecha */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                                background:
                                    'radial-gradient(ellipse at 85% 20%, rgba(20,184,166,0.10) 0%, transparent 55%)',
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
                        {/* Línea de acento superior (teal) */}
                        <div
                            className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] z-20"
                            style={{ background: 'linear-gradient(90deg, transparent, #14b8a6 40%, #2dd4bf 60%, transparent)' }}
                        />
                        {/* Línea de acento inferior (teal) */}
                        <div
                            className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] z-20"
                            style={{ background: 'linear-gradient(90deg, transparent, #14b8a6 40%, #2dd4bf 60%, transparent)' }}
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
                                    <div className="flex items-center justify-between gap-1 px-2 pt-4 pb-5">
                                        <div className="flex min-w-0 flex-1 items-center gap-1">
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
                                                    className="h-4.5 w-4.5 text-white"
                                                    strokeWidth={2.5}
                                                />
                                            </div>
                                            {/* Alto fijo (= alto del título de 2 líneas de los otros) + centrado, para
                                                igualar el alto del header y que "MarketPlace" quede centrado con el icono. */}
                                            <span className="flex flex-col justify-center min-h-9 leading-none min-w-0 ml-1.5">
                                                <span className="truncate text-2xl font-extrabold tracking-tight text-white">Market<span className="text-teal-400">Place</span></span>
                                                {/* Segunda línea invisible: iguala el alto del header a los que sí llevan "Locales" debajo. */}
                                                <span aria-hidden="true" className="text-xs font-bold uppercase tracking-[0.16em] text-transparent select-none hidden">{' '}</span>
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-0 -mr-1">
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
                                    // Buscador activo — el input vive en un PORTAL FLOTANTE
                                    // arriba (z-[60]) para quedar por encima del overlay del
                                    // buscador (z-50). Aquí dentro del header sticky solo
                                    // conservamos el subtítulo, que queda oscurecido detrás
                                    // del overlay. Ver bloque `createPortal` más abajo.
                                    null
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
                                                        <> · {totalArticulos} publicaciones</>
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
                                        <ToggleModoFeedMP valor={modoFeed} onCambio={setModoFeed} />
                                        {/* Chips de orden (Recientes/Más vistos) ocultos en
                                            móvil por espacio; el orden queda en "recientes".
                                            En desktop siguen visibles. */}
                                        <DropdownCategoriaFeed
                                            categorias={categoriasMP}
                                            valor={categoriaFeed}
                                            onCambio={setCategoriaFeed}
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
                                                className="h-6 w-6 text-white 2xl:h-6.5 2xl:w-6.5"
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
                                        <ToggleModoFeedMP valor={modoFeed} onCambio={setModoFeed} />
                                        <div className="min-w-0">
                                            <ChipsFiltrosFeed
                                                valor={orden}
                                                onCambio={setOrden}
                                                gpsDisponible={!sinGps}
                                                variant="dark"
                                            />
                                        </div>
                                        <DropdownCategoriaFeed
                                            categorias={categoriasMP}
                                            valor={categoriaFeed}
                                            onCambio={setCategoriaFeed}
                                        />
                                        {data && (
                                            <div className="flex flex-col items-end shrink-0">
                                                <span
                                                    data-testid="kpi-total-articulos"
                                                    className="text-3xl 2xl:text-[40px] font-extrabold text-white leading-none tabular-nums"
                                                >
                                                    {totalArticulos}
                                                </span>
                                                <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-teal-400/80 uppercase tracking-wider mt-1">
                                                    Publicaciones
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

                TODO el contenido se acota a `lg:max-w-[920px]` (mismo ancho
                que el feed de cards estilo Facebook + el composer + el reel).
                Solo el header sticky negro de arriba mantiene `max-w-7xl`.
                Reels, composer y feed heredan este ancho del padre — los
                wrappers internos `max-w-[920px]` se eliminaron por redundantes.
            ════════════════════════════════════════════════════════════════ */}
            <div ref={cuerpoRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-24 lg:flex-none lg:overflow-visible lg:pb-0 lg:mx-auto lg:max-w-[920px] lg:px-4">
                {/* La barra de filtros + Publicar (desktop) ahora vive dentro
                    del header dark como segunda fila — así se mueve sticky con
                    el resto del header sin sentirse desconectada. Ver bloque
                    DESKTOP HEADER arriba. */}

                {/* ── Composer inline ─────────────────────────────────────
                    Réplica del patrón de Servicios. Solo en modo personal —
                    en modo comercial los negocios no publican artículos P2P.
                    El atajo a "Mis publicaciones" vive como chip dentro del
                    propio composer (header de la pill colapsada), por eso
                    no hay widget lateral. */}
                {esModoPersonal && (
                    <div className="px-3 lg:px-0 pt-3 lg:pt-4">
                        <ComposerSection />
                    </div>
                )}

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
                            en el "home" del marketplace. Hereda el ancho del
                            container padre (920px) — sin wrapper extra. */}
                        {orden === 'recientes' && articulosReel.length > 0 && (
                            <div className="mt-2 lg:mt-4">
                                <ReelMarketplace articulos={articulosReel} />
                            </div>
                        )}

                        {/* Feed infinito: cards grandes estilo Facebook.
                            Móvil → full-width sin gap, separador inferior por card.
                            Desktop → hereda ancho del container padre (920px). */}
                        <div className="space-y-2 lg:space-y-4 lg:py-2">
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

                {/* Indicador animado apuntando al FAB (abajo-derecha en móvil)
                    — solo móvil cuando el feed está vacío. */}
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
                FAB "+ Publicar" — visible solo en modo personal (los negocios
                no publican artículos P2P en MarketPlace). ESCRITORIO: anclado
                arriba bajo el header (`topPublicar`). MÓVIL: abajo a la derecha
                (sube a bottom-20 con el BottomNav, baja a bottom-4 al ocultarse).
                Color teal de la marca MP, icono con animación rotate-pulse 2.4s.
            ════════════════════════════════════════════════════════════════ */}
            {esModoPersonal && (
            <button
                data-testid="fab-publicar"
                onClick={handlePublicar}
                aria-label="Publicar artículo"
                style={{
                    ...(esEscritorio ? { top: `${topPublicar}px` } : {}),
                    transition: 'top 300ms cubic-bezier(0.4, 0, 0.2, 1), bottom 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out',
                }}
                className={`fixed right-4 z-30 flex cursor-pointer flex-col items-center gap-1 lg:right-[330px] 2xl:right-[394px] ${
                    esEscritorio ? '' : bottomNavVisible ? 'bottom-20' : 'bottom-4'
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
            )}

            {/* Flecha "ir arriba" — en móvil va a la IZQUIERDA (`left-4`) para no
                empalmarse con el FAB Publicar (abajo-derecha); en PC vuelve al
                canal derecho, alineada al eje del Publicar que vive arriba. */}
            <BotonIrArriba
                testId="marketplace-ir-arriba"
                right="left-4 lg:left-auto lg:right-[330px] 2xl:right-[394px]"
            />

            {/* Overlay del buscador: ahora se monta GLOBALMENTE en `MainLayout`
                cuando la sección activa es `/marketplace/*`. Antes vivía aquí
                y entonces no funcionaba en sub-rutas como articulo/usuario. */}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* INPUT MÓVIL FLOTANTE — solo cuando el buscador móvil está abierto. */}
            {/* Va por portal con z-[60] para quedar ENCIMA del overlay del      */}
            {/* buscador (z-50). El resto del header sticky (z-20) queda detrás   */}
            {/* del overlay y se ve oscurecido — solo el input queda visible.    */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {buscadorMovilAbierto && createPortal(
                <div className="fixed top-0 left-0 right-0 z-[60] bg-black px-3 pt-4 pb-2.5 lg:hidden">
                    <div className="flex items-center gap-2.5">
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
                </div>,
                document.body
            )}

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

// =============================================================================
// TOGGLE MODO FEED (En venta / Se busca) — doble sentido MarketPlace
// =============================================================================

function ToggleModoFeedMP({
    valor,
    onCambio,
}: {
    valor: 'vendo' | 'busco';
    onCambio: (m: 'vendo' | 'busco') => void;
}) {
    // Mismo estilo que los ChipsFiltrosFeed (variante dark): pills
    // rounded-full con borde, activo teal, inactivo oscuro translúcido.
    const opciones = [
        { id: 'vendo' as const, etiqueta: 'En venta', Icono: Tag },
        { id: 'busco' as const, etiqueta: 'Se busca', Icono: Search },
    ];
    return (
        <div className="flex shrink-0 gap-2">
            {opciones.map(({ id, etiqueta, Icono }) => {
                const activo = valor === id;
                return (
                    <button
                        key={id}
                        type="button"
                        data-testid={`mp-feed-modo-${id}`}
                        onClick={() => onCambio(id)}
                        aria-pressed={activo}
                        className={
                            'flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold lg:cursor-pointer ' +
                            (activo
                                ? 'border-teal-400 bg-teal-500 text-white shadow-md shadow-teal-500/20'
                                : 'border-white/15 bg-white/5 text-slate-200 lg:hover:border-teal-400/60 lg:hover:bg-white/10 lg:hover:text-white')
                        }
                    >
                        <Icono className="h-4 w-4" strokeWidth={2.5} />
                        <span>{etiqueta}</span>
                    </button>
                );
            })}
        </div>
    );
}

// =============================================================================
// DROPDOWN DE CATEGORÍA (filtro del feed) — ocupa el hueco de "Cerca de ti"
// =============================================================================

function DropdownCategoriaFeed({
    categorias,
    valor,
    onCambio,
}: {
    categorias: CategoriaMarketplace[];
    valor: number | null;
    onCambio: (id: number | null) => void;
}) {
    const [abierto, setAbierto] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // El panel se renderiza en un PORTAL con posición fija: si viviera dentro
    // del header (que tiene overflow), quedaría recortado ("atrapado").
    useEffect(() => {
        if (!abierto) return;
        // `pointerdown` unifica mouse y touch: al tocar/clicar FUERA del botón y
        // del panel, se cierra. Al deslizar DENTRO del panel (su propia barra),
        // el pointerdown cae dentro del panel → no cierra. No escuchamos
        // `scroll` (en móvil, deslizar dentro del panel disparaba scroll y lo
        // cerraba de forma indebida).
        const cerrar = (e: Event) => {
            const t = e.target as Node;
            if (
                !btnRef.current?.contains(t) &&
                !panelRef.current?.contains(t)
            ) {
                setAbierto(false);
            }
        };
        const cerrarResize = () => setAbierto(false);
        document.addEventListener('pointerdown', cerrar);
        window.addEventListener('resize', cerrarResize);
        return () => {
            document.removeEventListener('pointerdown', cerrar);
            window.removeEventListener('resize', cerrarResize);
        };
    }, [abierto]);

    const alternar = () => {
        const rect = btnRef.current?.getBoundingClientRect();
        if (rect) {
            // Alinea a la derecha del botón para no salirse por la izquierda.
            setPos({ top: rect.bottom + 4, left: rect.right - 208 });
        }
        setAbierto((o) => !o);
    };

    const seleccionada = categorias.find((c) => c.id === valor) ?? null;

    return (
        <div className="shrink-0">
            <button
                ref={btnRef}
                type="button"
                data-testid="mp-feed-categoria"
                onClick={alternar}
                aria-expanded={abierto}
                className={
                    'flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 py-1.5 text-sm font-semibold lg:cursor-pointer ' +
                    (valor !== null
                        ? 'border-teal-400 bg-teal-500 text-white shadow-md shadow-teal-500/20'
                        : 'border-white/15 bg-white/5 text-slate-200 lg:hover:border-teal-400/60 lg:hover:bg-white/10 lg:hover:text-white')
                }
            >
                <Tag className="h-4 w-4" strokeWidth={2.5} />
                <span className="whitespace-nowrap">
                    {seleccionada ? seleccionada.nombre : 'Categoría'}
                </span>
                <ChevronDown
                    className={'h-4 w-4 transition-transform ' + (abierto ? 'rotate-180' : '')}
                    strokeWidth={2.5}
                />
            </button>
            {abierto &&
                pos &&
                createPortal(
                    <div
                        ref={panelRef}
                        style={{
                            position: 'fixed',
                            top: pos.top,
                            left: Math.max(8, pos.left),
                            zIndex: 60,
                        }}
                        className="max-h-72 w-52 overflow-y-auto rounded-xl border-2 border-slate-200 bg-white p-1 shadow-xl"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                onCambio(null);
                                setAbierto(false);
                            }}
                            className={
                                'block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold lg:cursor-pointer ' +
                                (valor === null
                                    ? 'bg-teal-50 text-teal-700'
                                    : 'text-slate-700 hover:bg-slate-100')
                            }
                        >
                            Todas
                        </button>
                        {categorias.map((c) => (
                            <button
                                key={c.id}
                                type="button"
                                data-testid={`mp-feed-categoria-${c.id}`}
                                onClick={() => {
                                    onCambio(c.id);
                                    setAbierto(false);
                                }}
                                className={
                                    'block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold lg:cursor-pointer ' +
                                    (valor === c.id
                                        ? 'bg-teal-50 text-teal-700'
                                        : 'text-slate-700 hover:bg-slate-100')
                                }
                            >
                                {c.nombre}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    );
}

export default PaginaMarketplace;
