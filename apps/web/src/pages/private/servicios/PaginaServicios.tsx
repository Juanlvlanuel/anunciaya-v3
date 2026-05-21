/**
 * PaginaServicios.tsx
 * =====================
 * Feed visual de la sección Servicios — punto de entrada de la sección.
 *
 * Estructura (idéntica al patrón de PaginaMarketplace / PaginaOfertas / PaginaNegocios):
 *  - Wrapper `min-h-full bg-transparent` (hereda gradiente azul del MainLayout).
 *  - `<ServiciosHeader>` sticky con `max-w-7xl` y `rounded-b-3xl` en desktop.
 *    Contiene back + logo + título + toggle Ofrezco/Solicito + KPI.
 *  - Contenido en contenedor `lg:max-w-7xl` también.
 *  - Carrusel "Recién publicado" con snap horizontal.
 *  - Grid "Cerca de ti" (2 cols móvil / 3 cols lg / 4 cols 2xl).
 *  - FAB "+ Publicar".
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

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    CornerRightDown,
    MapPin,
    Plus,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';
import { useNavegarASeccion } from '../../../hooks/useNavegarASeccion';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useServiciosFeed } from '../../../hooks/queries/useServicios';
import { ServiciosHeader } from '../../../components/servicios/ServiciosHeader';
import type { TabServicios } from '../../../components/servicios/TabsServicios';
import { CardServicio } from '../../../components/servicios/CardServicio';
import { CardVacante } from '../../../components/servicios/CardVacante';
import { CardHorizontal } from '../../../components/servicios/CardHorizontal';
import { ClasificadosWidget } from '../../../components/servicios/ClasificadosWidget';
import { ComposerSection } from '../../../components/servicios/composer/ComposerSection';
import { MisPublicacionesWidget } from '../../../components/servicios/composer/MisPublicacionesWidget';
import { Spinner } from '../../../components/ui/Spinner';
import type {
    ModoServicio,
    PublicacionServicio,
    FiltroClasificado,
} from '../../../types/servicios';

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

    // Breakpoint para el widget Clasificados (1 col mobile / 2 cols desktop).
    const { esEscritorio } = useBreakpoint();

    // BottomNav auto-hide tracker — el FAB Publicar baja a `bottom-4` cuando
    // el BottomNav se oculta y vuelve a `bottom-20` cuando reaparece. Mismo
    // patrón que el FAB del MarketPlace.
    const { shouldShow: bottomNavVisible } = useHideOnScroll({ direction: 'down' });

    // ─── Estado local ─────────────────────────────────────────────────────
    // `tabActiva` → tab activa del segmented control. Reemplaza al sistema
    // previo de chips Servicio/Vacantes + Ofrecen/Solicitan que mezclaba 2
    // ejes y generaba confusión (decisión 2026-05). Las 3 tabs agrupan por
    // tipo de publicación:
    //   - servicios   → tipo='servicio-persona'  (gente que ofrece su trabajo)
    //   - solicitudes → tipo='solicito'          (gente que busca contratar)
    //   - vacantes    → tipo='vacante-empresa'   (empleos formales de negocios)
    const [tabActiva, setTabActiva] = useState<TabServicios>('todos');

    // Estado del composer: el widget <MisPublicacionesWidget> lo lee
    // para mostrar 5 cards cuando hay más altura disponible (composer
    // expandido) y solo 2 en estado colapsado.
    const [composerExpandido, setComposerExpandido] = useState(false);

    // Filtro del tag strip del widget Clasificados (interno de la tab Solicitudes).
    const [filtroClasificado, setFiltroClasificado] =
        useState<FiltroClasificado>('todos');

    // ─── React Query — feed inicial ────────────────────────────────────────
    const { data, isLoading, isError, refetch } = useServiciosFeed({
        ciudad,
        lat: latitud,
        lng: longitud,
        modo: null,
    });

    const recientesRaw = data?.recientes ?? [];
    const cercanosRaw = data?.cercanos ?? [];

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

    /** Recientes filtrados por la tab activa. En `todos` excluimos `solicito`
     *  porque esos viven en el widget Clasificados (sección aparte). */
    const recientes = useMemo(() => {
        if (tipoActivo === 'todos') {
            return recientesRaw.filter((p) => p.tipo !== 'solicito');
        }
        return recientesRaw.filter((p) => p.tipo === tipoActivo);
    }, [recientesRaw, tipoActivo]);

    const cercanos = useMemo(() => {
        if (tipoActivo === 'todos') {
            return cercanosRaw.filter((p) => p.tipo !== 'solicito');
        }
        return cercanosRaw.filter((p) => p.tipo === tipoActivo);
    }, [cercanosRaw, tipoActivo]);

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
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
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
                onBack={handleVolver}
                ciudad={ciudad}
                totalPublicaciones={totalTabActiva}
                tabActiva={tabActiva}
                onTabChange={setTabActiva}
                conteosPorTab={conteosPorTab}
            />

            {/* ── Contenido ── */}
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                {/* Composer inline — pill colapsada que se expande
                    in-place al tap. Solo en modo Personal y en tabs
                    donde el usuario puede publicar (Todos / Servicios /
                    Solicitudes). Vacantes se publica desde Business
                    Studio, no aquí.

                    En PC se renderiza junto a `<MisPublicacionesWidget>`
                    en grid 2-col (composer + atajo a publicaciones del
                    autor). En móvil el composer ocupa todo el ancho y
                    el widget se oculta (la gestión vive en /mis-publicaciones). */}
                {esModoPersonal && tabActiva !== 'vacantes' && (
                    <div className="px-4 lg:px-0 pt-3 lg:pt-4">
                        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-4 lg:items-stretch">
                            <div className="min-w-0">
                                <ComposerSection
                                    modoServiciosDefault={modoComposerPorTab(tabActiva)}
                                    onExpandirChange={setComposerExpandido}
                                />
                            </div>
                            <div className="hidden lg:block">
                                <MisPublicacionesWidget
                                    composerExpandido={composerExpandido}
                                />
                            </div>
                        </div>
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
                       `onPublicar` no se pasa: el botón "+ Publicar pedido"
                       del widget es redundante con el FAB global "+ Publicar"
                       que ya está en la página. */
                    totalClasificadosHoy > 0 ? (
                        <div className="px-4 lg:px-0 mt-4 lg:mt-5">
                            <ClasificadosWidget
                                pedidos={clasificados}
                                totalHoy={totalClasificadosHoy}
                                filtroActivo={filtroClasificado}
                                onFiltroChange={setFiltroClasificado}
                                desktop={esEscritorio}
                                onPedidoClick={(id) =>
                                    navigate(`/servicios/${id}`)
                                }
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
                ) : recientes.length === 0
                    && cercanos.length === 0
                    && (tabActiva !== 'todos' || totalClasificadosHoy === 0) ? (
                    /* ═══ TAB Servicios / Vacantes / Todos — VACÍA ═══ */
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
                    /* ═══ TAB Servicios / Vacantes / Todos con contenido ═══ */
                    <>
                        {/* Banner solo en Vacantes — invita al comerciante a
                            publicar desde BS si tiene negocio. */}
                        {tabActiva === 'vacantes' && (
                            <BannerVacantesBS />
                        )}

                        {recientes.length > 0 && (
                            <section className="px-4 lg:px-0 mt-5 lg:mt-6">
                                <TituloSeccion>
                                    Recién publicado en {ciudad.split(',')[0]}
                                </TituloSeccion>
                                <div
                                    data-testid="servicios-carrusel-recientes"
                                    className="flex gap-3 lg:gap-4 overflow-x-auto no-scrollbar pb-2 snap-x"
                                >
                                    {recientes.map((p) => (
                                        <CardHorizontal
                                            key={p.id}
                                            publicacion={p}
                                            onClick={() =>
                                                navigate(`/servicios/${p.id}`)
                                            }
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {cercanos.length > 0 && (
                            <section className="px-4 lg:px-0 mt-6 lg:mt-8">
                                <TituloSeccion
                                    count={`${cercanos.length} resultado${cercanos.length === 1 ? '' : 's'}`}
                                >
                                    Cerca de ti
                                </TituloSeccion>
                                <div
                                    data-testid="servicios-grid-cercanos"
                                    className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4"
                                >
                                    {cercanos.map((p) => (
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
                            </section>
                        )}

                        {/* Tab Todos: además del feed, mostrar ClasificadosWidget
                            al final con las solicitudes activas (los `solicito`
                            no caben en el grid principal con servicio/vacante). */}
                        {tabActiva === 'todos' && totalClasificadosHoy > 0 && (
                            <div className="px-4 lg:px-0 mt-6 lg:mt-8">
                                <ClasificadosWidget
                                    pedidos={clasificados}
                                    totalHoy={totalClasificadosHoy}
                                    filtroActivo={filtroClasificado}
                                    onFiltroChange={setFiltroClasificado}
                                    desktop={esEscritorio}
                                    onPedidoClick={(id) =>
                                        navigate(`/servicios/${id}`)
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
                Posición dinámica: baja a `bottom-4` cuando el BottomNav se
                oculta, sube a `bottom-20` cuando reaparece. Mismo patrón
                visual que el FAB del MarketPlace. */}
            {fabHandler && (
                <button
                    type="button"
                    data-testid="fab-publicar"
                    onClick={fabHandler}
                    aria-label="Publicar"
                    style={{
                        transition: 'bottom 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out',
                    }}
                    className={`fixed right-4 z-30 lg:right-[330px] 2xl:right-[394px] lg:bottom-6 flex cursor-pointer flex-col items-center gap-1 ${
                        bottomNavVisible ? 'bottom-20' : 'bottom-4'
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
    // Los `tipo='solicito'` ya no llegan aquí — viven en ClasificadosWidget.
    if (publicacion.tipo === 'vacante-empresa') {
        return <CardVacante publicacion={publicacion} onClick={onClick} />;
    }
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
}: {
    children: React.ReactNode;
    count?: string;
}) {
    return (
        <div className="flex items-end justify-between mb-2 lg:mb-3">
            <h2 className="text-[17px] lg:text-[18px] font-extrabold tracking-tight text-slate-900">
                {children}
            </h2>
            {count && (
                <span className="text-[12px] font-semibold text-slate-500">
                    {count}
                </span>
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
                    className="h-5 w-5 shrink-0 text-sky-700 rotate-[-90deg]"
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

            {/* Indicador animado apuntando al FAB — solo móvil cuando el feed
                está vacío. Mismo patrón que MarketPlace. */}
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
