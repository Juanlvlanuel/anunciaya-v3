/**
 * PaginaServicios.tsx
 * =====================
 * Feed visual de la sección Servicios — punto de entrada de la sección.
 *
 * Estructura (idéntica al patrón de PaginaMarketplace / PaginaOfertas / PaginaNegocios):
 *  - Wrapper `min-h-full bg-transparent` (hereda gradiente azul del MainLayout).
 *  - `<ServiciosHeader>` sticky con `max-w-7xl` y `rounded-b-3xl` en desktop.
 *    Contiene back + logo + título + tabs + KPI.
 *  - Contenido acotado a `lg:max-w-[920px]` (alineado al ancho del
 *    composer/feed de MarketPlace para coherencia visual entre secciones).
 *  - FAB "+ Publicar" (oculto en Vacantes — se publica desde BS).
 *
 * Comportamiento por tab (Sprint 9.3):
 *  - 'todos': feed con 3 secciones agrupadas (Vacantes → Recién publicado →
 *    Clasificados). Cada sección muestra hasta 8 items (preview) con link
 *    "Ver más →" a la tab filtrada cuando la cantidad real supera 8. NO
 *    paginado — el feed inicial trae lo más reciente y cercano y suele
 *    caber sin scroll infinito.
 *  - 'servicios' / 'vacantes': lista paginada con `useServiciosFeedInfinito`.
 *    Scroll infinito en móvil (IntersectionObserver) + botón "Cargar más"
 *    en desktop. Patrón calcado de BS Empleados/Transacciones. Sin límite
 *    de items — se muestran TODOS los resultados de la ciudad hasta agotar.
 *  - 'solicitudes': `ClasificadosWidget` (densidad alta, sin paginación —
 *    los pedidos del día caben en una sola vista por diseño).
 *
 * Estados:
 *  - Sin GPS o sin ciudad → mensaje accionable invitando a activar ubicación.
 *  - Loading → spinner centrado.
 *  - Error → bloque informativo.
 *  - Vacío → mensaje amistoso + CTA Publicar.
 *
 * Doc maestro pendiente: docs/arquitectura/Servicios.md (Sprint 7).
 * Handoff de diseño: design_handoff_servicios/screens/FeedScreen.tsx.
 *
 * Ubicación: apps/web/src/pages/private/servicios/PaginaServicios.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    CornerRightDown,
    MapPin,
    Plus,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';
import { BotonIrArriba } from '../../../components/ui/BotonIrArriba';
import { useNavegarASeccion } from '../../../hooks/useNavegarASeccion';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import {
    useServiciosFeed,
    useServiciosFeedInfinito,
} from '../../../hooks/queries/useServicios';
import { ServiciosHeader } from '../../../components/servicios/ServiciosHeader';
import type { TabServicios } from '../../../components/servicios/TabsServicios';
import { CardServicio } from '../../../components/servicios/CardServicio';
import { CardHorizontal } from '../../../components/servicios/CardHorizontal';
import { ClasificadosWidget } from '../../../components/servicios/ClasificadosWidget';
import { ComposerSection } from '../../../components/servicios/composer/ComposerSection';
import { Spinner } from '../../../components/ui/Spinner';
import type {
    ModoServicio,
    PublicacionServicio,
    FiltroClasificado,
} from '../../../types/servicios';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Tope de cards a renderizar en cada sección del tab='todos' (preview).
 *  Si la cantidad real supera este límite, se muestra "Ver más →" al
 *  lado del título que cambia a la tab filtrada correspondiente. */
const LIMITE_PREVIEW_TODOS = 8;

/** Items por página del feed infinito (tabs filtradas). 20 es un buen
 *  balance: rellena 4 filas de cards en desktop (5 cols max) sin que el
 *  primer fetch tarde demasiado en BD. */
const LIMITE_FEED_INFINITO = 20;

// =============================================================================
// HELPERS
// =============================================================================

/** Mapea la tab activa al `modoServiciosDefault` que el composer recibirá.
 *  Tab Servicios → 'ofrezco', Solicitudes → 'solicito', Todos → null
 *  (el usuario elige dentro del composer). */
function modoComposerPorTab(t: TabServicios): ModoServicio | null {
    if (t === 'servicios') return 'ofrezco';
    if (t === 'solicitudes') return 'solicito';
    return null;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaServicios() {
    const navigate = useNavigate();
    const handleVolver = useVolverAtras('/inicio');

    // ─── Stores ────────────────────────────────────────────────────────────
    // CRÍTICO: la ciudad se lee del mismo store que usa el Navbar global
    // (`useGpsStore.ciudad.nombre`) para mantener consistencia con MarketPlace
    // y Ofertas. No usar `useAuthStore.usuario.ciudad`.
    const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? null);
    const latitud = useGpsStore((s) => s.latitud);
    const longitud = useGpsStore((s) => s.longitud);
    const obtenerUbicacion = useGpsStore((s) => s.obtenerUbicacion);
    const cargandoGps = useGpsStore((s) => s.cargando);

    // Modo activo del usuario. En modo Comercial NO se muestra el FAB de
    // publicar — el comerciante publica desde Business Studio (BS Vacantes).
    // El feed/detalle/perfil del prestador SÍ son visibles en ambos modos.
    const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
    const esModoPersonal = modoActivo !== 'comercial';

    // Breakpoint para el widget Clasificados (1 col mobile / 2 cols desktop)
    // y para el sentinel del feed infinito (auto-load solo en móvil).
    const { esEscritorio, esMobile } = useBreakpoint();

    // FAB "Publicar": en ESCRITORIO arriba (bajo el header, medido en
    // `topPublicar`); en MÓVIL abajo a la derecha (la flecha "ir arriba" va
    // abajo a la izquierda). El BottomNav hace subir/bajar el FAB móvil.
    // Medimos el header sticky (cambia de alto con tabs/buscador). Mismo patrón
    // que MarketPlace.
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

    // ─── Estado local ─────────────────────────────────────────────────────
    // `tabActiva` → tab activa del segmented control. Reemplaza al sistema
    // previo de chips Servicio/Vacantes + Ofrecen/Solicitan que mezclaba 2
    // ejes y generaba confusión (decisión 2026-05). Las 3 tabs agrupan por
    // tipo de publicación:
    //   - servicios   → tipo='servicio-persona'  (gente que ofrece su trabajo)
    //   - solicitudes → tipo='solicito'          (gente que busca contratar)
    //   - vacantes    → tipo='vacante-empresa'   (empleos formales de negocios)
    //
    // Sprint 9.3: `tabActiva` se sincroniza con el query param `?tab=`
    // para que el filtro PERSISTA al navegar al detalle y regresar
    // (back nativo de móvil, flecha del header, back del navegador).
    // Cuando es 'todos' (default) se omite del URL para mantenerlo limpio.
    const [searchParams, setSearchParams] = useSearchParams();
    const TABS_VALIDAS: TabServicios[] = [
        'todos',
        'servicios',
        'solicitudes',
        'vacantes',
    ];
    const tabInicial = ((): TabServicios => {
        const t = searchParams.get('tab');
        return t && (TABS_VALIDAS as string[]).includes(t)
            ? (t as TabServicios)
            : 'todos';
    })();
    const [tabActiva, setTabActivaState] = useState<TabServicios>(tabInicial);

    /** Cambia el tab activo Y actualiza el query param del URL con
     *  `replace: true` (no llena el history con cada cambio de tab).
     *  Esto hace que al ir al detalle y regresar, el URL conserve el
     *  filtro elegido y el tab se restaure automáticamente. */
    const setTabActiva = (nuevo: TabServicios) => {
        setTabActivaState(nuevo);
        const sp = new URLSearchParams(searchParams);
        if (nuevo === 'todos') {
            sp.delete('tab');
        } else {
            sp.set('tab', nuevo);
        }
        setSearchParams(sp, { replace: true });
    };

    // El estado `composerExpandido` se eliminó junto con `MisPublicacionesWidget`
    // (Sprint 9.2): el atajo a /mis-publicaciones ahora vive como chip dentro
    // del propio composer (header de la pill colapsada). Mismo patrón que MP.

    // Filtro del tag strip del widget Clasificados (interno de la tab Solicitudes).
    const [filtroClasificado, setFiltroClasificado] =
        useState<FiltroClasificado>('todos');

    // ─── React Query — feed inicial ────────────────────────────────────────
    // SIEMPRE activo — es la fuente de verdad para:
    //   - Tab 'todos': secciones agrupadas (Vacantes + Recién publicado).
    //   - Tab 'solicitudes': widget Clasificados (no paginado).
    //   - Conteos por tab (los chips de TabsServicios).
    //   - KPI del header.
    const { data, isLoading, isError, refetch } = useServiciosFeed({
        ciudad,
        lat: latitud,
        lng: longitud,
        modo: null,
    });

    const recientesRaw = data?.recientes ?? [];
    const cercanosRaw = data?.cercanos ?? [];

    // ─── React Query — feed INFINITO (paginado) ────────────────────────────
    // Solo se dispara cuando el usuario está en una tab filtrada que se
    // beneficia de paginación (servicios o vacantes). En 'todos' está
    // apagado (la UI usa el feed inicial agrupado por secciones); en
    // 'solicitudes' también está apagado (el widget Clasificados maneja
    // su propia UX sin paginación).
    //
    // El `tipo` matchea con el enum de BD (servicio-persona / vacante-empresa).
    // `orden: 'recientes'` mantiene consistencia con la sensación del feed
    // de "lo más nuevo primero" — el sort por distancia queda como filtro
    // futuro si se necesita.
    const tipoFiltroInfinito = tabActiva === 'servicios'
        ? 'servicio-persona'
        : tabActiva === 'vacantes'
            ? 'vacante-empresa'
            : undefined;

    const feedInfinitoEnabled = tipoFiltroInfinito !== undefined;

    const feedInfinitoQuery = useServiciosFeedInfinito({
        ciudad,
        lat: latitud,
        lng: longitud,
        tipo: tipoFiltroInfinito,
        orden: 'recientes',
        limite: LIMITE_FEED_INFINITO,
        enabled: feedInfinitoEnabled,
    });

    // Items aplanados del infinito (todas las páginas concatenadas).
    const itemsInfinitos = useMemo(
        () =>
            feedInfinitoQuery.data?.pages.flatMap((p) => p.items) ?? [],
        [feedInfinitoQuery.data],
    );
    const totalInfinito =
        feedInfinitoQuery.data?.pages[0]?.paginacion.total ?? 0;
    const hayMasInfinito = feedInfinitoQuery.hasNextPage;
    const cargandoMasInfinito = feedInfinitoQuery.isFetchingNextPage;
    const cargandoInfinito = feedInfinitoQuery.isPending && feedInfinitoEnabled;

    // ─── Sentinel + IntersectionObserver para scroll infinito móvil ────────
    // Patrón calcado de PaginaEmpleados.tsx (BS): cuando el sentinel entra
    // al viewport y aún hay páginas pendientes, dispara fetchNextPage.
    // En desktop el botón "Cargar más" toma el rol (el sentinel sigue
    // observándose pero rara vez se activa porque la lista no llega tan
    // abajo sin scrollear).
    const sentinelaRef = useRef<HTMLDivElement | null>(null);
    const fetchNextPage = feedInfinitoQuery.fetchNextPage;

    useEffect(() => {
        // Solo en móvil: el sentinel observa el final de la lista y dispara
        // la siguiente página automáticamente. En desktop el usuario aprieta
        // el botón "Cargar más" — no queremos comportamiento auto-load en
        // desktop porque los grids se vuelven enormes y desorientan.
        if (!esMobile || !feedInfinitoEnabled || !sentinelaRef.current) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    hayMasInfinito &&
                    !cargandoMasInfinito
                ) {
                    fetchNextPage();
                }
            },
            { rootMargin: '100px' },
        );
        observer.observe(sentinelaRef.current);
        return () => observer.disconnect();
    }, [
        esMobile,
        feedInfinitoEnabled,
        hayMasInfinito,
        cargandoMasInfinito,
        fetchNextPage,
    ]);

    // Mapeo tab → tipo de publicación que muestra en recientes/cercanos.
    //   - servicios → solo servicio-persona
    //   - solicitudes → solo solicito (renderizado en ClasificadosWidget aparte)
    //   - vacantes → solo vacante-empresa
    //   - todos → servicio-persona + vacante-empresa juntos (los solicito
    //     van al widget aparte en su propia sección)
    const tipoDeTab: Record<
        TabServicios,
        PublicacionServicio['tipo'] | 'todos'
    > = {
        todos: 'todos',
        servicios: 'servicio-persona',
        solicitudes: 'solicito',
        vacantes: 'vacante-empresa',
    };

    const tipoActivo = tipoDeTab[tabActiva];

    /** Vacantes (Sprint 9.3 — sección propia arriba del feed cuando
     *  tab='todos' o tab='vacantes'). Combina recientes+cercanos y
     *  deduplica por id. Las vacantes ya NO aparecen en "Recién
     *  publicado" cuando tab='todos' (tienen su sección dedicada). */
    const vacantes = useMemo(() => {
        if (tabActiva !== 'todos' && tabActiva !== 'vacantes') return [];
        const mapa = new Map<string, typeof recientesRaw[number]>();
        for (const p of [...recientesRaw, ...cercanosRaw]) {
            if (p.tipo === 'vacante-empresa') mapa.set(p.id, p);
        }
        return Array.from(mapa.values()).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
        );
    }, [recientesRaw, cercanosRaw, tabActiva]);

    /** "Recién publicado" — combina recientes + cercanos (dedupe por id)
     *  para no perder publicaciones que solo aparecen en `cercanos`. Antes
     *  esas se mostraban en la sección "Cerca de ti" eliminada en Sprint
     *  9.3; ahora se incluyen aquí junto con las recientes.
     *
     *  Filtros por tab:
     *  - tab='todos':     todo lo que NO es Clasificados (`solicito`) ni
     *                     Vacantes (`vacante-empresa`) — esos tienen
     *                     secciones dedicadas arriba/abajo del feed.
     *  - tab='servicios': solo `servicio-persona`.
     *  - tab='vacantes':  vacío (vacantes están en su sección arriba).
     *  - tab='solicitudes': vacío (ClasificadosWidget aparte). */
    const recientes = useMemo(() => {
        if (tabActiva === 'vacantes' || tabActiva === 'solicitudes') return [];
        const mapa = new Map<string, typeof recientesRaw[number]>();
        for (const p of [...recientesRaw, ...cercanosRaw]) {
            if (tipoActivo === 'todos') {
                if (p.tipo === 'solicito' || p.tipo === 'vacante-empresa') continue;
            } else if (p.tipo !== tipoActivo) {
                continue;
            }
            // Map.set conserva la primera ocurrencia por id — orden de
            // recientesRaw (created_at DESC) prevalece sobre cercanosRaw.
            if (!mapa.has(p.id)) mapa.set(p.id, p);
        }
        return Array.from(mapa.values()).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
        );
    }, [recientesRaw, cercanosRaw, tipoActivo, tabActiva]);

    // `cercanos` (sección "Cerca de ti") eliminado Sprint 9.3 —
    // sus items se reparten ahora entre las 3 secciones del feed
    // según tipo (Vacantes / Recién publicado / Clasificados).
    // `cercanosRaw` sigue alimentando el dedupe/conteo de las demás
    // secciones combinándose con `recientesRaw`.

    /** Solicitudes para la tab Solicitudes. Dedup por id + aplica el filtro
     *  del tag strip del widget (categoría / urgente). */
    const clasificados = useMemo(() => {
        const mapa = new Map<string, typeof recientesRaw[number]>();
        for (const p of [...recientesRaw, ...cercanosRaw]) {
            if (p.tipo !== 'solicito') continue;
            if (filtroClasificado === 'urgente' && !p.urgente) continue;
            if (
                filtroClasificado !== 'todos' &&
                filtroClasificado !== 'urgente' &&
                p.categoria !== filtroClasificado
            )
                continue;
            mapa.set(p.id, p);
        }
        // Urgentes primero, luego por fecha de creación descendente.
        return Array.from(mapa.values()).sort((a, b) => {
            if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
            return b.createdAt.localeCompare(a.createdAt);
        });
    }, [recientesRaw, cercanosRaw, filtroClasificado]);

    /** KPI "N pedidos hoy" del widget — total de `solicito` únicos sin filtro. */
    const totalClasificadosHoy = useMemo(() => {
        const ids = new Set<string>();
        for (const p of [...recientesRaw, ...cercanosRaw]) {
            if (p.tipo === 'solicito') ids.add(p.id);
        }
        return ids.size;
    }, [recientesRaw, cercanosRaw]);

    /** Conteos por tab para los badges de TabsServicios. Cuenta IDs únicos
     *  de cada tipo en recientes + cercanos. El badge de `todos` es la suma
     *  global (servicios + solicitudes + vacantes). */
    const conteosPorTab = useMemo<Partial<Record<TabServicios, number>>>(() => {
        const ids = {
            servicios: new Set<string>(),
            solicitudes: new Set<string>(),
            vacantes: new Set<string>(),
            todos: new Set<string>(),
        };
        for (const p of [...recientesRaw, ...cercanosRaw]) {
            ids.todos.add(p.id);
            if (p.tipo === 'servicio-persona') ids.servicios.add(p.id);
            else if (p.tipo === 'solicito') ids.solicitudes.add(p.id);
            else if (p.tipo === 'vacante-empresa') ids.vacantes.add(p.id);
        }
        return {
            todos: ids.todos.size,
            servicios: ids.servicios.size,
            solicitudes: ids.solicitudes.size,
            vacantes: ids.vacantes.size,
        };
    }, [recientesRaw, cercanosRaw]);

    /** Expande el composer inline en el feed pasando el modo deseado
     *  como query param. La pill de `<ComposerSection>` lo detecta y se
     *  expande con el modo correcto. Hace scroll al top para asegurar
     *  que el composer entre en viewport. */
    function expandirComposer(modo: ModoServicio | null) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const qs = modo ? `?crear=${modo}` : '?crear=ofrezco';
        navigate(`/servicios${qs}`, { replace: true });
    }
    const irAPublicar = () => expandirComposer(null);
    const irAPublicarOfrezco = () => expandirComposer('ofrezco');
    const irAPublicarSolicito = () => expandirComposer('solicito');

    // ─── Estado: sin GPS ──────────────────────────────────────────────────
    if (!ciudad || latitud === null || longitud === null) {
        return (
            <div className="min-h-full bg-transparent">
                <ServiciosHeader
                    onBack={handleVolver}
                    ciudad={ciudad}
                    totalPublicaciones={null}
                />
                <div className="lg:mx-auto lg:max-w-[920px] lg:px-4">
                    <div className="px-6 py-12 flex flex-col items-center text-center max-w-md mx-auto">
                        <div className="w-20 h-20 rounded-full bg-sky-50 grid place-items-center mb-4">
                            <MapPin
                                className="w-7 h-7 text-sky-600"
                                strokeWidth={1.75}
                            />
                        </div>
                        <h2 className="text-[18px] font-extrabold text-slate-900">
                            Activa tu ubicación
                        </h2>
                        <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
                            Necesitamos saber dónde estás para mostrarte
                            servicios y personas cerca de ti.
                        </p>
                        <button
                            data-testid="btn-activar-gps-servicios"
                            onClick={() => obtenerUbicacion()}
                            disabled={cargandoGps}
                            className="mt-5 px-5 py-2.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 text-white font-semibold text-sm shadow-cta-sky disabled:opacity-60 lg:cursor-pointer flex items-center gap-2"
                        >
                            {cargandoGps ? 'Buscando…' : 'Activar ubicación'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Render principal ─────────────────────────────────────────────────
    const totalTabActiva = conteosPorTab[tabActiva] ?? 0;

    // FAB: un solo botón "+ Publicar" en todas las tabs excepto Vacantes
    // (Vacantes no tiene FAB público — se publica desde BS). El handler
    // varía según tab para ahorrar el Paso 1 del wizard:
    //   - todos       → wizard sin modo (el Paso 1 pregunta)
    //   - servicios   → wizard con modo=ofrezco (directo al detalle)
    //   - solicitudes → wizard con modo=solicito (directo al detalle)
    const fabHandler: (() => void) | null = !esModoPersonal
        ? null
        : tabActiva === 'todos'
            ? irAPublicar
            : tabActiva === 'servicios'
                ? irAPublicarOfrezco
                : tabActiva === 'solicitudes'
                    ? irAPublicarSolicito
                    : null;

    return (
        <div className="min-h-full bg-transparent">
            <ServiciosHeader
                stickyRef={headerRef}
                onBack={handleVolver}
                ciudad={ciudad}
                totalPublicaciones={totalTabActiva}
                tabActiva={tabActiva}
                onTabChange={setTabActiva}
                conteosPorTab={conteosPorTab}
            />

            {/* ── Contenido ── */}
            <div className="lg:mx-auto lg:max-w-[920px] lg:px-4">
                {/* Composer inline — pill colapsada que se expande
                    in-place al tap. Solo en modo Personal y en tabs
                    donde el usuario puede publicar (Todos / Servicios /
                    Solicitudes). Vacantes se publica desde Business
                    Studio, no aquí.

                    Sprint 9.2: se quitó el widget lateral `MisPublicacionesWidget`
                    y el atajo a /mis-publicaciones quedó como chip dentro
                    del header de la pill (mismo patrón que MP). Todo el
                    contenido del feed (composer + cards + secciones) se
                    acota a `max-w-[920px]` desde el container padre, igual
                    que MP — el composer hereda ese ancho sin wrapper extra. */}
                {esModoPersonal && tabActiva !== 'vacantes' && (
                    <div className="px-4 lg:px-0 pt-3 lg:pt-4">
                        <ComposerSection
                            modoServiciosDefault={modoComposerPorTab(tabActiva)}
                        />
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Spinner tamanio="lg" />
                    </div>
                ) : isError ? (
                    <ErrorBloque onReintentar={() => refetch()} />
                ) : tabActiva === 'solicitudes' ? (
                    /* ═══ TAB SOLICITUDES — el widget ya tiene su propia UI ═══
                       `onPublicar` sí se pasa (Sprint 9.3): el footer del
                       widget se rediseñó como CTA de conversión amber y
                       tiene sentido aunque el FAB global esté visible
                       (aquí el contexto es "ya viste las solicitudes de
                       otros, publica la tuya"). No usa paginación infinita
                       — los clasificados del día caben sin scroll y la UX
                       del widget es densa por diseño. */
                    totalClasificadosHoy > 0 ? (
                        <div className="px-4 lg:px-0 mt-4 lg:mt-5">
                            <ClasificadosWidget
                                pedidos={clasificados}
                                filtroActivo={filtroClasificado}
                                onFiltroChange={setFiltroClasificado}
                                desktop={esEscritorio}
                                ciudad={ciudad.split(',')[0]}
                                onPedidoClick={(id) =>
                                    navigate(`/servicios/${id}`)
                                }
                                onPublicar={
                                    esModoPersonal ? irAPublicarSolicito : undefined
                                }
                                /* `onVerTodos` NO se pasa aquí: ya estamos
                                   en tab='solicitudes', no hay a dónde
                                   navegar — "ver más" carecería de sentido. */
                            />
                        </div>
                    ) : (
                        <TabVacia
                            titulo="Sin solicitudes activas"
                            subtitulo="Nadie ha pedido un servicio aún."
                            ctaLabel={esModoPersonal ? 'Pide un servicio' : null}
                            onCta={irAPublicarSolicito}
                        />
                    )
                ) : tabActiva === 'servicios' || tabActiva === 'vacantes' ? (
                    /* ═══ TAB FILTRADAS — Servicios / Vacantes (paginadas) ═══
                       Sprint 9.3: estas dos tabs usan `useServiciosFeedInfinito`
                       para listar TODOS los resultados con scroll infinito
                       móvil + botón "Cargar más" desktop (patrón calcado de
                       BS Empleados/Transacciones). Sin slice — se ven los N
                       que haya hasta agotar la BD.

                       El tab='todos' (más abajo) sigue usando el feed simple
                       con secciones agrupadas y preview de 8 items por sección. */
                    <>
                        {/* Banner solo en Vacantes — invita al comerciante a
                            publicar desde BS si tiene negocio. */}
                        {tabActiva === 'vacantes' && <BannerVacantesBS />}

                        {cargandoInfinito ? (
                            <div className="flex items-center justify-center py-20">
                                <Spinner tamanio="lg" />
                            </div>
                        ) : itemsInfinitos.length === 0 ? (
                            tabActiva === 'vacantes' ? (
                                <TabVacia
                                    titulo="Sin vacantes activas"
                                    subtitulo="Los negocios verificados publican sus puestos aquí."
                                    ctaLabel={null}
                                    onCta={() => undefined}
                                />
                            ) : (
                                <FeedVacio
                                    onPublicar={esModoPersonal ? irAPublicar : null}
                                    ciudad={ciudad}
                                />
                            )
                        ) : (
                            <section className="px-4 lg:px-0 mt-5 lg:mt-6 pb-28 lg:pb-32">
                                <TituloSeccion count={totalInfinito}>
                                    {tabActiva === 'vacantes'
                                        ? `Vacantes en ${ciudad.split(',')[0]}`
                                        : `Servicios en ${ciudad.split(',')[0]}`}
                                </TituloSeccion>

                                <div
                                    data-testid={
                                        tabActiva === 'vacantes'
                                            ? 'servicios-grid-vacantes-paginado'
                                            : 'servicios-grid-servicios-paginado'
                                    }
                                    className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4"
                                >
                                    {itemsInfinitos.map((p) => (
                                        <CardSegunTipo
                                            key={p.id}
                                            publicacion={p}
                                            distanciaMetros={p.distanciaMetros}
                                            onClick={() =>
                                                navigate(`/servicios/${p.id}`)
                                            }
                                        />
                                    ))}
                                </div>

                                {/* Sentinel móvil — IntersectionObserver lo
                                    observa para auto-cargar la siguiente
                                    página. En desktop está oculto (no auto-load). */}
                                <div
                                    ref={sentinelaRef}
                                    className="h-1 lg:hidden"
                                />

                                {/* Spinner mientras carga la siguiente página
                                    (común móvil y desktop). */}
                                {cargandoMasInfinito && (
                                    <div className="flex justify-center py-4">
                                        <Spinner />
                                    </div>
                                )}

                                {/* Botón "Cargar más" desktop. Se oculta en
                                    móvil porque el sentinel ya carga solo. */}
                                {hayMasInfinito && !cargandoMasInfinito && (
                                    <div className="hidden lg:block mt-6">
                                        <button
                                            type="button"
                                            onClick={() => fetchNextPage()}
                                            data-testid="btn-cargar-mas-servicios"
                                            className="w-full py-3 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-sky-400 hover:text-sky-700 lg:cursor-pointer transition-colors"
                                        >
                                            Cargar más
                                        </button>
                                    </div>
                                )}

                                {/* Mensaje "ya no hay más" al final cuando
                                    el usuario llegó al fondo del listado. */}
                                {!hayMasInfinito && itemsInfinitos.length > 0 && (
                                    <p className="mt-6 text-center text-sm lg:text-[13px] 2xl:text-sm text-slate-600 font-semibold">
                                        Has visto todos los resultados ({totalInfinito})
                                    </p>
                                )}
                            </section>
                        )}
                    </>
                ) : recientes.length === 0
                    && vacantes.length === 0
                    && totalClasificadosHoy === 0 ? (
                    /* ═══ TAB 'todos' VACÍA — sin servicios, vacantes ni
                       solicitudes en toda la ciudad ═══ */
                    <FeedVacio
                        onPublicar={esModoPersonal ? irAPublicar : null}
                        ciudad={ciudad}
                    />
                ) : (
                    /* ═══ TAB 'todos' CON CONTENIDO ═══
                       Secciones agrupadas como preview (slice 8) con link
                       "Ver más →" a la tab filtrada cuando hay más. La
                       paginación completa vive en las tabs filtradas (rama
                       de arriba con useServiciosFeedInfinito). */
                    <>
                        {/* 1. VACANTES — preview slice 8 + Ver más. */}
                        {vacantes.length > 0 && (
                            <section className="px-4 lg:px-0 mt-5 lg:mt-6">
                                <TituloSeccion
                                    count={vacantes.length}
                                    onVerMas={
                                        vacantes.length > LIMITE_PREVIEW_TODOS
                                            ? () => setTabActiva('vacantes')
                                            : undefined
                                    }
                                >
                                    Vacantes en {ciudad.split(',')[0]}
                                </TituloSeccion>
                                <div
                                    data-testid="servicios-grid-vacantes"
                                    className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4"
                                >
                                    {vacantes
                                        .slice(0, LIMITE_PREVIEW_TODOS)
                                        .map((p) => (
                                            <CardSegunTipo
                                                key={p.id}
                                                publicacion={p}
                                                distanciaMetros={
                                                    p.distanciaMetros
                                                }
                                                onClick={() =>
                                                    navigate(
                                                        `/servicios/${p.id}`,
                                                    )
                                                }
                                            />
                                        ))}
                                </div>
                            </section>
                        )}

                        {/* 2. SERVICIOS — carrusel horizontal preview slice 8
                            + Ver más a la tab Servicios. El título es
                            "Servicios" (no "Recién publicado") para mantener
                            simetría con las otras 2 secciones del tab='todos'
                            (Vacantes / Servicios / Clasificados) y para
                            matchear el nombre de la tab cuando el usuario
                            entra al vista filtrada. El orden por fecha es
                            implícito — los cards muestran "hace Xh". */}
                        {recientes.length > 0 && (
                            <section className="px-4 lg:px-0 mt-6 lg:mt-8">
                                <TituloSeccion
                                    count={recientes.length}
                                    onVerMas={
                                        recientes.length > LIMITE_PREVIEW_TODOS
                                            ? () => setTabActiva('servicios')
                                            : undefined
                                    }
                                >
                                    Servicios en {ciudad.split(',')[0]}
                                </TituloSeccion>
                                <div
                                    data-testid="servicios-carrusel-recientes"
                                    className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x"
                                >
                                    {recientes
                                        .slice(0, LIMITE_PREVIEW_TODOS)
                                        .map((p) => (
                                            <CardHorizontal
                                                key={p.id}
                                                publicacion={p}
                                                distanciaMetros={
                                                    p.distanciaMetros
                                                }
                                                onClick={() =>
                                                    navigate(
                                                        `/servicios/${p.id}`,
                                                    )
                                                }
                                            />
                                        ))}
                                </div>
                            </section>
                        )}

                        {/* 3. CLASIFICADOS — widget con teaser de los
                            `solicito` activos (la tab Solicitudes tiene la
                            versión completa). */}
                        {totalClasificadosHoy > 0 && (
                            <div className="px-4 lg:px-0 mt-6 lg:mt-8">
                                <ClasificadosWidget
                                    pedidos={clasificados}
                                    filtroActivo={filtroClasificado}
                                    onFiltroChange={setFiltroClasificado}
                                    desktop={esEscritorio}
                                    ciudad={ciudad.split(',')[0]}
                                    onPedidoClick={(id) =>
                                        navigate(`/servicios/${id}`)
                                    }
                                    /* "Ver más →" en el header del widget
                                       solo aparece si hay más de 6 (el
                                       widget muestra hasta 6 en desktop —
                                       con 6 o menos el usuario ya las ve
                                       todas, no tiene sentido navegar). */
                                    onVerTodos={
                                        totalClasificadosHoy > 6
                                            ? () => setTabActiva('solicitudes')
                                            : undefined
                                    }
                                    onPublicar={
                                        esModoPersonal
                                            ? irAPublicarSolicito
                                            : undefined
                                    }
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* FAB "+ Publicar" — un solo botón. El wizard pregunta el modo
                (Ofrezco / Solicito) en su Paso 1 cuando no se especifica. En
                tabs Servicios/Solicitudes ya se preselecciona el modo. Tab
                Vacantes no tiene FAB (se publica desde BS).
                ESCRITORIO: anclado arriba bajo el header (`topPublicar`).
                MÓVIL: abajo a la derecha (sube a bottom-20 con el BottomNav,
                baja a bottom-4 al ocultarse). Mismo patrón que MarketPlace. */}
            {fabHandler && (
                <button
                    type="button"
                    data-testid="fab-publicar"
                    onClick={fabHandler}
                    aria-label="Publicar"
                    style={{
                        ...(esEscritorio ? { top: `${topPublicar}px` } : {}),
                        transition: 'top 300ms cubic-bezier(0.4, 0, 0.2, 1), bottom 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out',
                    }}
                    className={`fixed right-4 z-30 lg:right-[330px] 2xl:right-[394px] flex cursor-pointer flex-col items-center gap-1 ${
                        esEscritorio ? '' : bottomNavVisible ? 'bottom-20' : 'bottom-4'
                    }`}
                >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-sky-700 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-300/30 transition-transform hover:scale-105">
                        <Plus
                            className="h-6 w-6"
                            strokeWidth={2.75}
                            style={{
                                animation:
                                    'fab-servicios-pulse 2.4s ease-in-out infinite',
                            }}
                        />
                    </span>
                    <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-sm font-bold text-slate-700 shadow-md backdrop-blur-sm lg:bg-transparent lg:px-0 lg:py-0 lg:text-base lg:shadow-none lg:backdrop-blur-none">
                        Publicar
                    </span>
                    <style>{`
                        @keyframes fab-servicios-pulse {
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
                testId="servicios-ir-arriba"
                right="left-4 lg:left-auto lg:right-[330px] 2xl:right-[394px]"
            />
        </div>
    );
}

// =============================================================================
// SUBCOMPONENTES
// =============================================================================

function CardSegunTipo({
    publicacion,
    distanciaMetros,
    onClick,
}: {
    publicacion: PublicacionServicio & { distanciaMetros?: number | null };
    distanciaMetros?: number | null;
    onClick?: () => void;
}) {
    // Sprint 9.3: `CardServicio` es universal — renderiza los 3 tipos
    // (`servicio-persona`, `solicito`, `vacante-empresa`) con el mismo
    // layout y misma altura. La diferenciación visual entre tipos vive en
    // el badge sup-izq de la foto y en el meta secundario (modalidad vs
    // tipo de empleo). Ya no se ramifica aquí por `publicacion.tipo`.
    return (
        <CardServicio
            publicacion={publicacion}
            distanciaMetros={distanciaMetros}
            onClick={onClick}
        />
    );
}

function TituloSeccion({
    children,
    count,
    onVerMas,
    verMasLabel = 'Ver más',
}: {
    children: React.ReactNode;
    /** Número de resultados — se renderiza INLINE al lado del título
     *  como "(N)" en gris discreto. Si no se pasa, no se muestra. */
    count?: number;
    /** Si se pasa, renderiza un link "Ver más →" alineado a la derecha
     *  del título. Pensado para los "preview" del tab='todos' donde cada
     *  sección muestra solo N items y el resto se ve filtrando la tab. */
    onVerMas?: () => void;
    /** Texto del link cuando `onVerMas` está activo. Default: "Ver más". */
    verMasLabel?: string;
}) {
    return (
        <div className="mb-2 lg:mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] lg:text-[18px] font-extrabold tracking-tight text-slate-900 truncate min-w-0">
                {children}
                {count != null && count > 0 && (
                    <span className="ml-1.5 text-[14px] font-semibold text-slate-500 tabular-nums">
                        ({count})
                    </span>
                )}
            </h2>
            {onVerMas && (
                <button
                    type="button"
                    onClick={onVerMas}
                    data-testid="btn-ver-mas-seccion"
                    className="shrink-0 inline-flex items-center gap-0.5 text-[13px] lg:text-[12px] 2xl:text-[13px] font-semibold text-sky-700 hover:text-sky-800 lg:cursor-pointer"
                >
                    {verMasLabel}
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
            )}
        </div>
    );
}

/** Banner sobre la tab Vacantes: invita al comerciante a publicar desde BS.
 *  Visible siempre — los usuarios sin negocio simplemente lo ignoran. La
 *  navegación a BS Vacantes se gatekeepea en `/business-studio/vacantes`
 *  (auth + tener negocio activo + ModoGuard 'comercial'). Usa
 *  `useNavegarASeccion` porque es un salto entre top-levels (Servicios → BS). */
function BannerVacantesBS() {
    const navegarASeccion = useNavegarASeccion();
    return (
        <div className="px-4 lg:px-0 mt-4 lg:mt-5">
            <button
                type="button"
                data-testid="banner-publicar-vacante-bs"
                onClick={() => navegarASeccion('/business-studio/vacantes')}
                className="flex w-full items-center gap-3 rounded-2xl border border-sky-300 bg-sky-50 px-4 py-3 text-left lg:cursor-pointer lg:hover:border-sky-400 lg:hover:bg-sky-100/60"
            >
                <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{
                        background: 'linear-gradient(135deg, #38bdf8, #0369a1)',
                    }}
                >
                    <Wrench className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900">
                        ¿Tienes un negocio?
                    </div>
                    <div className="text-sm font-medium text-slate-600">
                        Publica vacantes desde Business Studio.
                    </div>
                </div>
                <CornerRightDown
                    className="h-5 w-5 shrink-0 text-sky-700 -rotate-90"
                    strokeWidth={2.5}
                />
            </button>
        </div>
    );
}

/** Estado vacío genérico por tab — más sobrio que `FeedVacio` (que tiene
 *  ilustración + animaciones para el caso totalmente vacío sin filtros). */
function TabVacia({
    titulo,
    subtitulo,
    ctaLabel,
    onCta,
}: {
    titulo: string;
    subtitulo: string;
    ctaLabel: string | null;
    onCta: () => void;
}) {
    return (
        <div className="px-6 py-12 flex flex-col items-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-sky-100 grid place-items-center mb-4">
                <Sparkles
                    className="w-7 h-7 text-sky-600"
                    strokeWidth={1.75}
                />
            </div>
            <h2 className="text-[18px] font-extrabold text-slate-900">
                {titulo}
            </h2>
            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
                {subtitulo}
            </p>
            {ctaLabel && (
                <button
                    type="button"
                    onClick={onCta}
                    className="mt-5 px-5 py-2.5 rounded-full bg-linear-to-b from-sky-500 to-sky-700 text-white font-semibold text-sm shadow-cta-sky lg:cursor-pointer"
                >
                    {ctaLabel}
                </button>
            )}
        </div>
    );
}

function ErrorBloque({ onReintentar }: { onReintentar: () => void }) {
    return (
        <div className="px-6 py-12 flex flex-col items-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-50 grid place-items-center mb-4">
                <AlertCircle
                    className="w-7 h-7 text-amber-600"
                    strokeWidth={1.75}
                />
            </div>
            <h2 className="text-[18px] font-extrabold text-slate-900">
                No pudimos cargar el feed
            </h2>
            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
                Revisa tu conexión y vuelve a intentarlo.
            </p>
            <button
                data-testid="btn-reintentar-servicios"
                onClick={onReintentar}
                className="mt-5 px-5 py-2.5 rounded-full bg-slate-900 text-white font-semibold text-sm shadow-md lg:cursor-pointer hover:bg-slate-800"
            >
                Reintentar
            </button>
        </div>
    );
}

function FeedVacio({
    onPublicar,
    ciudad,
}: {
    /** Si es null (modo comercial) NO se muestra el CTA — el comerciante
     *  publica desde Business Studio → Vacantes, no desde aquí. */
    onPublicar: (() => void) | null;
    ciudad: string | null;
}) {
    return (
        <>
            <div
                data-testid="servicios-empty"
                className="relative mt-12 flex flex-col items-center px-6 text-center lg:mt-20 pb-32"
            >
                {/* Sparkles decorativos animados */}
                <Sparkles
                    className="absolute left-8 top-2 h-5 w-5 animate-pulse text-sky-400/70"
                    strokeWidth={2}
                    style={{ animationDuration: '2.5s' }}
                />
                <Sparkles
                    className="absolute right-10 top-10 h-4 w-4 animate-pulse text-sky-300/70"
                    strokeWidth={2}
                    style={{ animationDuration: '3.2s', animationDelay: '0.6s' }}
                />

                {/* Icono central con halos pulsantes */}
                <div className="relative mb-6">
                    <div
                        className="absolute inset-0 -m-5 animate-ping rounded-full bg-sky-300/40"
                        style={{ animationDuration: '2.4s' }}
                    />
                    <div
                        className="absolute inset-0 -m-2 animate-ping rounded-full bg-sky-400/40"
                        style={{
                            animationDuration: '2.4s',
                            animationDelay: '0.4s',
                        }}
                    />
                    <div
                        className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl"
                        style={{
                            background:
                                'linear-gradient(135deg, #38bdf8, #0369a1)',
                        }}
                    >
                        <Wrench
                            className="h-11 w-11 text-white"
                            strokeWidth={2}
                        />
                    </div>
                </div>

                <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                    ¡Sé el primero!
                </h3>
                <p className="max-w-sm text-base text-slate-600">
                    Aún no hay servicios en{' '}
                    <span className="font-bold text-slate-900">
                        {ciudad ?? 'tu zona'}
                    </span>
                    . Publica algo y empieza a conectar con tus vecinos hoy
                    mismo.
                </p>

                {/* CTA inline solo desktop — en móvil el FAB ya es visible.
                    Oculto en modo Comercial: el comerciante publica desde
                    Business Studio → Vacantes, no desde aquí. */}
                {onPublicar && (
                    <button
                        data-testid="btn-publicar-servicios-empty"
                        onClick={onPublicar}
                        className="mt-6 hidden cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-slate-800 to-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] lg:inline-flex"
                    >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                        Publicar primer servicio
                    </button>
                )}
            </div>

            {/* Indicador animado apuntando al FAB (abajo-derecha en móvil) —
                solo móvil cuando el feed está vacío. Mismo patrón que MarketPlace. */}
            <div
                data-testid="empty-state-arrow-fab-servicios"
                className="pointer-events-none fixed bottom-36 right-3 z-20 flex flex-col items-end gap-1 lg:hidden"
                style={{
                    animation: 'srv-arrow-bounce 1.4s ease-in-out infinite',
                }}
            >
                <span className="rounded-full bg-linear-to-br from-slate-800 to-slate-950 px-3 py-1.5 text-sm font-bold text-white shadow-lg whitespace-nowrap">
                    ¡Publica aquí!
                </span>
                <CornerRightDown
                    className="h-8 w-8 text-slate-900 drop-shadow"
                    strokeWidth={3}
                />
                <style>{`
                    @keyframes srv-arrow-bounce {
                        0%, 100% { transform: translate(0, 0); }
                        50% { transform: translate(6px, 6px); }
                    }
                `}</style>
            </div>
        </>
    );
}

export default PaginaServicios;
