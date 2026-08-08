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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useScrollAppShell } from '../../../hooks/useScrollAppShell';
import { useListoParaAnimar } from '../../../hooks/useListoParaAnimar';
import { useMainScrollStore } from '../../../stores/useMainScrollStore';
import { ShoppingCart, ChevronLeft, ChevronDown, Search, Tag, Ticket, ArrowLeftRight, X } from 'lucide-react';

import { Icon, type IconProps, ICONOS } from '@/config/iconos';
// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;
import { useGpsStore } from '../../../stores/useGpsStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useSearchStore } from '../../../stores/useSearchStore';
import { useUiStore } from '../../../stores/useUiStore';
import { useMarketplaceFeed, useCategoriasMarketplace } from '../../../hooks/queries/useMarketplace';
import { useFeedInfinitoDinamicas } from '../../../hooks/queries/useDinamicas';
import { ChipsFiltrosFeed } from '../../../components/marketplace/ChipsFiltrosFeed';
import { SeccionFeedArticulos } from '../../../components/marketplace/SeccionFeedArticulos';
import { SeccionFeedDinamicas } from '../../../components/dinamicas/SeccionFeedDinamicas';
import { FabPublicar } from '../../../components/ui/FabPublicar';
import { notificar } from '../../../utils/notificaciones';
import type { OrdenFeedInfinito, CategoriaMarketplace } from '../../../types/marketplace';
import { BotonIrArriba } from '../../../components/ui/BotonIrArriba';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';
import { useNotificacionesStore } from '../../../stores/useNotificacionesStore';
import { IconoMenuMorph } from '../../../components/ui/IconoMenuMorph';

// La columna "Recién publicado" usa la canaleta global (ver index.css) —
// ya no hace falta redefinirla aquí.

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
    // Borde inferior real del header (getBoundingClientRect, no solo su alto)
    // — mismo criterio que PaginaNegocios.tsx para la columna de cards fija.
    const [headerBottom, setHeaderBottom] = useState(150);
    useEffect(() => {
        const el = headerRef.current;
        if (!el) return;
        const medir = () => {
            const rect = el.getBoundingClientRect();
            setTopPublicar(rect.bottom + 8);
            setHeaderBottom(rect.bottom);
        };
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

    // ─── React Query ───────────────────────────────────────────────────────────

    // Switch de contexto Artículos↔Dinámicas (Fase 3/5) — cambia qué composer
    // y qué feed se muestran debajo del header. Dinámicas vive como
    // sub-sección de MarketPlace (ver Contexto_Dinamicas.md), no una ruta
    // aparte. Query param `?dinamicas=1` para poder llegar directo con link.
    const [contextoActivo, setContextoActivo] = useState<'articulos' | 'dinamicas'>(() =>
        typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dinamicas') === '1'
            ? 'dinamicas'
            : 'articulos',
    );
    // Montaje perezoso: Dinámicas solo se agrega al árbol la primera vez que
    // se activa (evita pagar su query/DOM si el usuario nunca la toca) y
    // luego se queda montada para siempre — de ahí en adelante el switch solo
    // alterna `hidden`, sin volver a desmontar (evita reconstruir DOM/efectos
    // en cada toggle y la clase de bugs de refs que no se re-sincronizan).
    const [dinamicasMontada, setDinamicasMontada] = useState(contextoActivo === 'dinamicas');
    useEffect(() => {
        if (contextoActivo === 'dinamicas') setDinamicasMontada(true);
    }, [contextoActivo]);

    // Cambia de contexto Y sincroniza la URL (`?dinamicas=1` presente/ausente)
    // con `replace` — no genera entradas de historial por cada toggle (mismo
    // criterio que el resto de la página con query params de un solo uso),
    // pero sí sobrevive un refresh y es shareable por link.
    function cambiarContexto(nuevo: 'articulos' | 'dinamicas') {
        setContextoActivo(nuevo);
        const params = new URLSearchParams(window.location.search);
        if (nuevo === 'dinamicas') params.set('dinamicas', '1');
        else params.delete('dinamicas');
        const qs = params.toString();
        navigate(`${window.location.pathname}${qs ? `?${qs}` : ''}`, { replace: true });
    }

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
    const { data, refetch } = useMarketplaceFeed({
        ciudad,
        lat: latitud,
        lng: longitud,
        modo: modoFeed,
        categoriaId: categoriaFeed ?? undefined,
    });

    const recientes = data?.recientes ?? [];
    const cercanos = data?.cercanos ?? [];

    // Orden del feed (Recientes/Más vistos) — el chip vive en el header, el
    // cuerpo del feed (que lo consume) vive en `SeccionFeedArticulos`.
    const [orden, setOrden] = useState<OrdenFeedInfinito>('recientes');

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

    // Header móvil se colapsa (oculta subtítulo "En {ciudad} · N publicaciones"
    // + chips de filtros) al hacer scroll hacia abajo, dejando solo la fila
    // fija (flecha + logo + buscar/notif/menú) — mismo patrón que
    // PaginaNegocios.tsx. Solo se re-expande al volver hasta el tope.
    const [headerColapsado, setHeaderColapsado] = useState(false);
    useEffect(() => {
        const el = cuerpoRef.current;
        if (!el) return;
        const onScroll = () => setHeaderColapsado(el.scrollTop > 10);
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [cuerpoRef]);

    // Alto real del overlay de subtítulo+chips (`position: absolute`, no
    // reserva espacio por sí solo). Se usa para un espaciador que empuja el
    // inicio del feed hacia abajo cuando el overlay está expandido — si no,
    // el overlay queda tapando el primer bloque del feed.
    // `useLayoutEffect` (no `useEffect`): mide ANTES del primer pintado, así
    // el espaciador del feed ya nace con el alto correcto — con `useEffect`
    // el primer render pinta alto 0 y luego salta al real ya con la
    // transición CSS puesta, viéndose como que el contenido se reacomoda.
    const overlayHeaderRef = useRef<HTMLDivElement>(null);
    const [alturaOverlayHeader, setAlturaOverlayHeader] = useState(0);
    // `false` durante el primer pintado — apaga la transición CSS del
    // espaciador solo en el montaje inicial, para que el salto de 0 al alto
    // real medido no se anime. Ver `useListoParaAnimar`.
    const listoParaAnimar = useListoParaAnimar();
    useLayoutEffect(() => {
        const el = overlayHeaderRef.current;
        if (!el) return;
        const medir = () => setAlturaOverlayHeader(el.offsetHeight);
        medir();
        const observer = new ResizeObserver(medir);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

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
    const handleOrganizarDinamica = () => {
        (mainScrollRef?.current ?? window).scrollTo({ top: 0, behavior: 'smooth' });
        navigate('/marketplace?crearDinamica=1', { replace: true });
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

    // ─── Render ────────────────────────────────────────────────────────────────

    const sinGps = !latitud || !longitud;

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

    // Mismo query que consume `SeccionFeedDinamicas` (misma queryKey → cache
    // compartida, sin request duplicado) — solo para el conteo del header,
    // que antes se quedaba mostrando siempre `totalArticulos` aunque el
    // contexto activo fuera Dinámicas.
    const { data: dataDinamicas } = useFeedInfinitoDinamicas({ ciudad });
    const totalDinamicas = useMemo(
        () => dataDinamicas?.pages.flatMap((p) => p.dinamicas).length ?? 0,
        [dataDinamicas],
    );

    // Línea/glow de acento del header: teal para Artículos, ámbar para
    // Dinámicas — mismos tonos que los badges del switch de contexto.
    const colorAcento = contextoActivo === 'dinamicas'
        ? {
            linea: 'linear-gradient(90deg, transparent, #f59e0b 40%, #fbbf24 60%, transparent)',
            glow: 'radial-gradient(ellipse at 85% 20%, rgba(245,158,11,0.10) 0%, transparent 55%)',
            lineaIzq: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.7))',
            lineaDer: 'linear-gradient(90deg, rgba(245,158,11,0.7), transparent)',
        }
        : {
            linea: 'linear-gradient(90deg, transparent, #14b8a6 40%, #2dd4bf 60%, transparent)',
            glow: 'radial-gradient(ellipse at 85% 20%, rgba(20,184,166,0.10) 0%, transparent 55%)',
            lineaIzq: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.7))',
            lineaDer: 'linear-gradient(90deg, rgba(20,184,166,0.7), transparent)',
        };

    return (
        <div className="flex flex-col h-full bg-transparent lg:block lg:h-auto lg:min-h-full">
            {/* ════════════════════════════════════════════════════════════════
                HEADER — móvil: bloque fijo (shrink-0) FUERA del scroll; desktop: sticky
            ════════════════════════════════════════════════════════════════ */}
            <div ref={headerRef} className="shrink-0 z-20 lg:sticky lg:top-0">
                {/* `relative`: contexto de posicionamiento para el overlay de
                    subtítulo+chips (`position: absolute`, ver más abajo). */}
                <div className="relative lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div
                        className="relative z-20 overflow-hidden rounded-none lg:rounded-b-3xl"
                        style={{ background: '#000000' }}
                    >
                        {/* Glow arriba-derecha — teal en Artículos, ámbar en Dinámicas */}
                        <div
                            className="pointer-events-none absolute inset-0"
                            style={{ background: colorAcento.glow }}
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
                        {/* Línea de acento superior — teal/ámbar según contexto */}
                        <div
                            className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] z-20"
                            style={{ background: colorAcento.linea }}
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
                                            <button
                                                type="button"
                                                data-testid="btn-toggle-contexto-marketplace"
                                                onClick={() => cambiarContexto(contextoActivo === 'articulos' ? 'dinamicas' : 'articulos')}
                                                aria-label={contextoActivo === 'articulos' ? 'Cambiar a Dinámicas' : 'Cambiar a Artículos'}
                                                className="flex min-w-0 flex-1 cursor-pointer items-center gap-0 rounded-lg py-0.5 pl-0 pr-2 hover:bg-white/5"
                                            >
                                            {/* Dos íconos FIJOS (MarketPlace y Dinámicas, nunca uno solo
                                                que se transforma) + flecha de switch entre ambos. El activo
                                                SIEMPRE queda pegado al título (order:2, junto al `<span>`
                                                de abajo) — al tocar, `order` se invierte y `layout` de
                                                framer-motion anima el intercambio de posición en vez de
                                                saltar de golpe. El inactivo se achica/atenúa. Tamaños
                                                reducidos vs el diseño anterior (de un solo ícono) para no
                                                truncar "MarketPlace"/"Dinámicas" en pantallas angostas. */}
                                            <div className="flex shrink-0 items-center gap-1">
                                                <motion.div
                                                    layout
                                                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                                    style={{
                                                        order: contextoActivo === 'articulos' ? 2 : 0,
                                                        background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
                                                    }}
                                                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-opacity ${
                                                        contextoActivo === 'articulos' ? 'opacity-100' : 'opacity-40'
                                                    }`}
                                                >
                                                    <ShoppingCart className="h-4 w-4 text-white" strokeWidth={2.5} />
                                                </motion.div>
                                                <ArrowLeftRight
                                                    className="h-3.5 w-3.5 shrink-0 text-white/50"
                                                    style={{ order: 1 }}
                                                    strokeWidth={2.5}
                                                />
                                                <motion.div
                                                    layout
                                                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                                    style={{
                                                        order: contextoActivo === 'dinamicas' ? 2 : 0,
                                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                    }}
                                                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-opacity ${
                                                        contextoActivo === 'dinamicas' ? 'opacity-100' : 'opacity-40'
                                                    }`}
                                                >
                                                    <Ticket className="h-4 w-4 text-white" strokeWidth={2.5} />
                                                </motion.div>
                                            </div>
                                            <span className="truncate text-2xl font-extrabold tracking-tight text-white ml-1.5 min-w-0">
                                                {contextoActivo === 'dinamicas' ? (
                                                    <>Diná<span className="text-amber-400">micas</span></>
                                                ) : (
                                                    <>Market<span className="text-teal-400">Place</span></>
                                                )}
                                            </span>
                                            </button>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-0 -mr-1">
                                            {contextoActivo === 'articulos' && (
                                                <button
                                                    data-testid="btn-buscar-marketplace"
                                                    onClick={handleAbrirBuscadorMovil}
                                                    aria-label="Buscar en MarketPlace"
                                                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                                >
                                                    <Search className="h-6 w-6 animate-pulse" strokeWidth={2.5} />
                                                </button>
                                            )}
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
                            </div>

                            {/* ═══ DESKTOP HEADER (>=lg) ═══
                                Una sola fila para igualar el alto del header
                                de Ofertas (`py-4 2xl:py-5` con logo h-11/12).
                                Layout: Logo + Título a la izquierda · chips
                                centro · KPI compacto + Publicar derecha. */}
                            <div className="hidden lg:block">
                                <div className="flex items-center justify-between gap-4 px-6 py-4 lg:px-4 lg:py-2.5 2xl:px-8 2xl:py-3.5">
                                    {/* Izquierda: flecha + logo + título (agrupados) */}
                                    <div className="flex shrink-0 items-center gap-3">
                                        {/* Flecha ← regresar al inicio (solo desktop) */}
                                        <button
                                            data-testid="btn-volver-marketplace-desktop"
                                            onClick={handleVolver}
                                            aria-label="Volver al inicio"
                                            className="flex h-9 w-9 lg:h-8 lg:w-8 2xl:h-8 2xl:w-8 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white cursor-pointer"
                                        >
                                            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                                        </button>
                                        {/* Logo+título ES el switch de contexto Artículos↔Dinámicas —
                                            tocar aquí alterna icono/texto/color en vez de agregar chips
                                            nuevos a la fila de filtros (saturaba el header). */}
                                        <button
                                            type="button"
                                            data-testid="btn-toggle-contexto-marketplace-desktop"
                                            onClick={() => cambiarContexto(contextoActivo === 'articulos' ? 'dinamicas' : 'articulos')}
                                            aria-label={contextoActivo === 'articulos' ? 'Cambiar a Dinámicas' : 'Cambiar a Artículos'}
                                            className="flex cursor-pointer items-center gap-3 rounded-lg px-1.5 py-1 lg:hover:bg-white/5"
                                        >
                                            {/* Dos íconos FIJOS (MarketPlace y Dinámicas) + flecha de
                                                switch entre ambos — mismo criterio que el header móvil,
                                                incluida la animación de reordenar (`layout` de
                                                framer-motion) para que el activo siempre quede pegado al
                                                título. */}
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <motion.div
                                                    layout
                                                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                                    style={{
                                                        order: contextoActivo === 'articulos' ? 2 : 0,
                                                        background: 'linear-gradient(135deg, #2dd4bf, #0d9488)',
                                                    }}
                                                    className={`flex h-11 w-11 lg:h-9 lg:w-9 2xl:h-10 2xl:w-10 items-center justify-center rounded-lg transition-opacity ${
                                                        contextoActivo === 'articulos' ? 'opacity-100' : 'opacity-40'
                                                    }`}
                                                >
                                                    <ShoppingCart className="h-6 w-6 lg:h-[18px] lg:w-[18px] 2xl:h-5 2xl:w-5 text-white" strokeWidth={2.5} />
                                                </motion.div>
                                                <ArrowLeftRight
                                                    className="h-4 w-4 shrink-0 text-white/50"
                                                    style={{ order: 1 }}
                                                    strokeWidth={2.5}
                                                />
                                                <motion.div
                                                    layout
                                                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                                    style={{
                                                        order: contextoActivo === 'dinamicas' ? 2 : 0,
                                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                    }}
                                                    className={`flex h-11 w-11 lg:h-9 lg:w-9 2xl:h-10 2xl:w-10 items-center justify-center rounded-lg transition-opacity ${
                                                        contextoActivo === 'dinamicas' ? 'opacity-100' : 'opacity-40'
                                                    }`}
                                                >
                                                    <Ticket className="h-6 w-6 lg:h-[18px] lg:w-[18px] 2xl:h-5 2xl:w-5 text-white" strokeWidth={2.5} />
                                                </motion.div>
                                            </div>
                                            <span className="text-2xl lg:text-xl 2xl:text-2xl font-extrabold tracking-tight text-white ml-2">
                                                {contextoActivo === 'dinamicas' ? (
                                                    <>Diná<span className="text-amber-400">micas</span></>
                                                ) : (
                                                    <>Market<span className="text-teal-400">Place</span></>
                                                )}
                                            </span>
                                        </button>
                                    </div>

                                    {/* Spacer para empujar chips + KPI + Publicar a la derecha */}
                                    <div className="flex-1" />

                                    {/* Derecha: chips de filtros + KPI dos líneas + botón Publicar.
                                        Justificados a la derecha junto al KPI (decisión de Juan
                                        para que las 3 secciones públicas se vean coherentes). */}
                                    <div className="flex shrink-0 items-center gap-4">
                                        {contextoActivo === 'articulos' && (
                                            <>
                                                <ToggleModoFeedMP valor={modoFeed} onCambio={setModoFeed} />
                                                <div className="hidden 2xl:block min-w-0">
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
                                                            className="text-3xl lg:text-2xl 2xl:text-3xl font-extrabold text-white leading-none tabular-nums"
                                                        >
                                                            {totalArticulos}
                                                        </span>
                                                        <span className="hidden text-sm 2xl:mt-1 2xl:block 2xl:text-xs font-semibold text-teal-400/80 uppercase tracking-wider">
                                                            Publicaciones
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        {/* Botón Publicar movido a FAB flotante — ver bloque al final
                                            del componente. FAB visible en móvil y desktop con animación
                                            rotate-pulse del icono "+" y color teal. */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ══ OVERLAY MÓVIL — subtítulo + chips, FUERA del flujo
                        (`position: absolute`). Se desliza con `transform`
                        puro — igual que el BottomNav — sin recalcular layout
                        cada frame. Panel propio (fondo + glow + patrón +
                        línea inferior) para leerse como una sola pieza con
                        el panel de arriba. ══ */}
                    <div
                        ref={overlayHeaderRef}
                        className="pointer-events-none absolute left-0 right-0 top-full z-10 overflow-hidden rounded-none lg:hidden"
                        style={{
                            transform: headerColapsado ? 'translateY(-100%)' : 'translateY(0)',
                            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    >
                        <div className="relative" style={{ background: '#000000' }}>
                            {/* Glow (duplicado, mismo tratamiento que el panel de arriba) */}
                            <div
                                className="pointer-events-none absolute inset-0"
                                style={{ background: colorAcento.glow }}
                            />
                            {/* Grid pattern (duplicado) */}
                            <div
                                className="pointer-events-none absolute inset-0"
                                style={{
                                    opacity: 0.08,
                                    backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                                      repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                                }}
                            />
                            {/* Línea de acento inferior — el borde real del
                                panel cuando está expandido. */}
                            <div
                                className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] z-20"
                                style={{ background: colorAcento.linea }}
                            />

                            <div className="relative z-10">
                                {/* Subtítulo */}
                                <div className="pb-1.5 flex items-center justify-center gap-2.5">
                                    <div
                                        className="h-0.5 w-14 rounded-full"
                                        style={{ background: colorAcento.lineaIzq }}
                                    />
                                    <span className="text-base font-light text-white/70 tracking-wide whitespace-nowrap">
                                        {ciudad ? (
                                            <>
                                                En{' '}
                                                <span className="font-bold text-white">
                                                    {ciudad}
                                                </span>
                                                {contextoActivo === 'dinamicas' ? (
                                                    dataDinamicas && <> · {totalDinamicas} Dinámicas</>
                                                ) : (
                                                    data && <> · {totalArticulos} publicaciones</>
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
                                        style={{ background: colorAcento.lineaDer }}
                                    />
                                </div>
                                {/* Chips de filtros — mismo patrón que Negocios y Ofertas.
                                    `pointer-events-auto`: el overlay entero es
                                    `pointer-events-none` (para no robarle el
                                    scroll al feed de abajo cuando queda
                                    encima); esta fila sí necesita clicks. */}
                                <div className="pointer-events-auto px-3 pb-3">
                                    <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                        {contextoActivo === 'articulos' && (
                                            <>
                                                <ToggleModoFeedMP valor={modoFeed} onCambio={setModoFeed} />
                                                {/* Chips de orden (Recientes/Más vistos) ocultos en
                                                    móvil por espacio; el orden queda en "recientes".
                                                    En desktop siguen visibles. */}
                                                <DropdownCategoriaFeed
                                                    categorias={categoriasMP}
                                                    valor={categoriaFeed}
                                                    onCambio={setCategoriaFeed}
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                CONTENIDO

                lg: MISMA fórmula que el header (`max-w-7xl` + `px-6`) —
                igual que Negocios — en vez de un ancho fijo, así coincide
                exacto con el header en cualquier ancho de viewport dentro
                del rango lg. 2xl: `max-w-[1068px]` + `px-0` = 3×340 + 2×24
                (gap-6) — sin tocar, revierte el padding de lg.
                Reels, composer y feed heredan este ancho.
            ════════════════════════════════════════════════════════════════ */}
            <div ref={cuerpoRef} className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain pb-24 lg:flex-none lg:overflow-visible lg:mx-auto lg:max-w-7xl lg:px-6 2xl:max-w-[1068px] 2xl:px-0 lg:py-6 2xl:py-8">
                {/* Espaciador — el overlay de subtítulo+chips no reserva
                    espacio real; cuando está expandido queda ENCIMA del
                    inicio del feed. Empuja el contenido hacia abajo esa
                    misma distancia, con la MISMA curva/duración del overlay. */}
                <div
                    className="lg:hidden"
                    style={{
                        height: headerColapsado ? 0 : alturaOverlayHeader,
                        transition: listoParaAnimar ? 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
                    }}
                />
                {/* La barra de filtros + Publicar (desktop) ahora vive dentro
                    del header dark como segunda fila — así se mueve sticky con
                    el resto del header sin sentirse desconectada. Ver bloque
                    DESKTOP HEADER arriba. */}

                {/* Artículos y Dinámicas quedan AMBOS montados una vez que se
                    activan por primera vez — se alterna con `hidden` (CSS),
                    no con un ternario que desmonta. Evita reconstruir todo el
                    DOM/efectos en cada toggle y conserva scroll/estado al
                    volver de un lado al otro. Dinámicas se monta perezosamente
                    (recién la primera vez que se activa) para no pagar su
                    query/DOM si el usuario nunca la toca; Artículos es la
                    vista por defecto, así que se monta siempre. */}
                <div className={contextoActivo === 'articulos' ? '' : 'hidden'}>
                    <SeccionFeedArticulos
                        ciudad={ciudad}
                        latitud={latitud}
                        longitud={longitud}
                        esModoPersonal={esModoPersonal}
                        esEscritorio={esEscritorio}
                        cargandoGps={cargandoGps}
                        visible={contextoActivo === 'articulos'}
                        headerBottom={headerBottom}
                        cuerpoRef={cuerpoRef}
                        modoFeed={modoFeed}
                        categoriaFeed={categoriaFeed}
                        orden={orden}
                        onLimpiarCategoria={() => setCategoriaFeed(null)}
                        onActivarUbicacion={handleActivarUbicacion}
                        onAbrirModalUbicacion={abrirModalUbicacion}
                        onPublicar={handlePublicar}
                    />
                </div>

                {dinamicasMontada && (
                    <div className={contextoActivo === 'dinamicas' ? '' : 'hidden'}>
                        <SeccionFeedDinamicas
                            ciudad={ciudad}
                            esModoPersonal={esModoPersonal}
                            headerBottom={headerBottom}
                            visible={contextoActivo === 'dinamicas'}
                        />
                    </div>
                )}

            </div>

            {/* FAB "+ Publicar" / "+ Organizar" — visible solo en modo personal
                (los negocios no publican artículos P2P ni Dinámicas en
                MarketPlace). Color según contexto activo. Ver components/ui/FabPublicar.tsx. */}
            {esModoPersonal && contextoActivo === 'articulos' && (
                <FabPublicar
                    onClick={handlePublicar}
                    ariaLabel="Publicar artículo"
                    claseColor="bg-linear-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/30 ring-2 ring-teal-300/30"
                    topPublicar={topPublicar}
                    esEscritorio={esEscritorio}
                    bottomNavVisible={bottomNavVisible}
                    labelConCardEscritorio
                    claseRight="right-4 lg:right-[240px] 2xl:right-[394px]"
                />
            )}
            {esModoPersonal && contextoActivo === 'dinamicas' && (
                <FabPublicar
                    onClick={handleOrganizarDinamica}
                    ariaLabel="Organizar Dinámica"
                    label="Organizar"
                    claseColor="bg-linear-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/30 ring-2 ring-amber-300/30"
                    topPublicar={topPublicar}
                    esEscritorio={esEscritorio}
                    bottomNavVisible={bottomNavVisible}
                    labelConCardEscritorio
                    claseRight="right-4 lg:right-[240px] 2xl:right-[394px]"
                />
            )}

            {/* Flecha "ir arriba" — en móvil va a la IZQUIERDA (`left-4`) para no
                empalmarse con el FAB Publicar (abajo-derecha); en PC vuelve al
                canal derecho, alineada al eje del Publicar que vive arriba. */}
            <BotonIrArriba
                testId="marketplace-ir-arriba"
                right="left-4 lg:left-auto lg:right-[240px] 2xl:right-[394px]"
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
                <div className="fixed top-0 left-0 right-0 z-[60] bg-black px-3 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-2.5 lg:hidden">
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
                <Tag className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                <span className="max-w-[90px] truncate">
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
