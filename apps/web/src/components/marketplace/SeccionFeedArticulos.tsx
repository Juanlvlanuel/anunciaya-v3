/**
 * SeccionFeedArticulos.tsx
 * ==========================
 * Cuerpo del feed de Artículos de MarketPlace — extraído de
 * `PaginaMarketplace.tsx` para que el switch de contexto Artículos↔Dinámicas
 * pueda mantener ambas secciones montadas y alternar con `hidden` (CSS) en
 * vez de desmontar/remontar por completo (más liviano, y elimina la clase de
 * bugs de refs/efectos que no se re-sincronizan al remontar — ver
 * `docs/CHANGELOG.md`/memoria de la sesión que introdujo este componente).
 *
 * Dueño de: composer inline, feed infinito (+ reel/columna fija "Recién
 * publicado"), scroll infinito, pull-to-refresh, y el modal de comentarios
 * por deep-link (`?articuloId=&comentarioId=`). El header (con los chips de
 * filtro que controlan `modoFeed`/`categoriaFeed`/`orden`, y el KPI de
 * "publicaciones") se queda en `PaginaMarketplace.tsx` porque vive dentro del
 * chrome compartido — este componente solo LEE esos filtros vía props.
 *
 * Ubicación: apps/web/src/components/marketplace/SeccionFeedArticulos.tsx
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, CornerRightDown, Loader2, Plus, ShoppingCart } from 'lucide-react';
import { Icon, type IconProps, ICONOS } from '@/config/iconos';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Sparkles = (p: IconoWrapperProps) => <Icon icon={ICONOS.premium} {...p} />;

import { useFeedInfinitoMarketplace } from '../../hooks/queries/useMarketplace';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useMinDuracionVisible } from '../../hooks/useMinDuracionVisible';
import { CardArticuloFeed } from './CardArticuloFeed';
import { CardArticulo } from './CardArticulo';
import { ReelMarketplace } from './ReelMarketplace';
import { ComposerSection } from './composer/ComposerSection';
import { ModalComentariosMarketplace } from './ModalComentariosMarketplace';
import { IndicadorRefrescoFeed } from '../ui/IndicadorRefrescoFeed';
import type { OrdenFeedInfinito } from '../../types/marketplace';

interface SeccionFeedArticulosProps {
    ciudad: string | null;
    latitud: number | null;
    longitud: number | null;
    esModoPersonal: boolean;
    esEscritorio: boolean;
    cargandoGps: boolean;
    /** Si esta sección está visible ahora mismo (el padre la alterna con
     *  `hidden` en vez de desmontarla — ver `PaginaMarketplace.tsx`). Sirve
     *  para re-medir la columna fija al volver a mostrarse: mientras estuvo
     *  oculta pudo cambiar el ancho de scrollbar vertical de la página (la
     *  otra sección puede tener más/menos contenido), lo que corre el
     *  contenido centrado (`mx-auto`) unos px — un cambio de POSICIÓN, no de
     *  tamaño del propio placeholder, así que el `ResizeObserver` de abajo no
     *  lo detecta solo. Sin este re-medido se ve la columna "saltar" a su
     *  posición correcta un instante después de volver a Artículos. */
    visible: boolean;
    /** Borde inferior del header sticky (px) — ancla la columna fija "Recién publicado". */
    headerBottom: number;
    cuerpoRef: RefObject<HTMLDivElement | null>;
    modoFeed: 'vendo' | 'busco';
    categoriaFeed: number | null;
    orden: OrdenFeedInfinito;
    onLimpiarCategoria: () => void;
    onActivarUbicacion: () => void;
    onAbrirModalUbicacion: () => void;
    onPublicar: () => void;
}

export function SeccionFeedArticulos({
    ciudad,
    latitud,
    longitud,
    esModoPersonal,
    esEscritorio,
    cargandoGps,
    visible,
    headerBottom,
    cuerpoRef,
    modoFeed,
    categoriaFeed,
    orden,
    onLimpiarCategoria,
    onActivarUbicacion,
    onAbrirModalUbicacion,
    onPublicar,
}: SeccionFeedArticulosProps) {
    const location = useLocation();
    const sinGps = !latitud || !longitud;

    // Feed v1.2 (estilo Facebook) — orden seleccionable + scroll infinito.
    const {
        data: dataFeedInfinito,
        isLoading,
        isError,
        isRefetching: isRefetchingFeed,
        refetch,
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

    // Reel "Recién publicado" — SIEMPRE visible sin importar el filtro de
    // orden (Recientes/Más vistos) ni de categoría activos en el feed
    // principal: usa su propia query fija (orden='recientes', sin categoría).
    // Cuando el filtro activo del usuario coincide con estos mismos
    // parámetros, React Query comparte la queryKey y no dispara una request
    // extra. Solo se oculta en modo "busco".
    const { data: dataReel } = useFeedInfinitoMarketplace({
        ciudad,
        lat: latitud,
        lng: longitud,
        orden: 'recientes',
        modo: 'vendo',
        limite: 12,
    });

    const articulosReel = useMemo(
        () => (modoFeed === 'vendo' ? (dataReel?.pages[0]?.articulos ?? []).slice(0, 12) : []),
        [modoFeed, dataReel]
    );

    // El feed grande muestra TODOS los artículos, incluso los que están en el
    // reel — es un "highlight" rotativo, no un duplicado (mismo criterio que
    // Stories vs Feed).
    const articulosFeedSinReel = articulosFeed;

    // ─── Columna de "Recién publicado" fija (escritorio) — FIJA por JS desde
    // el primer render (sin `position: sticky`), con auto-scroll vertical y
    // pausa al hover. Como este componente ahora se queda MONTADO siempre
    // (solo se oculta con `hidden` al cambiar de contexto), el
    // `ResizeObserver` NO alcanza solo: detecta que el propio placeholder
    // cambia de TAMAÑO, pero mientras Artículos está oculto puede cambiar el
    // scrollbar vertical de la página (Dinámicas tiene más/menos contenido) y
    // eso corre el contenido centrado (`mx-auto`) unos px — un cambio de
    // POSICIÓN del placeholder, no de su tamaño, que el observer no ve. Por
    // eso `visible` (prop) entra en las deps de abajo: fuerza un re-medido
    // apenas la sección se vuelve a mostrar, antes del paint (misma técnica
    // que ya resolvía el caso de filtrar por categoría). ──────────────────
    const cardsScrollRef = useRef<HTMLDivElement>(null);
    const cardsPlaceholderRef = useRef<HTMLDivElement>(null);
    const [cardsLeft, setCardsLeft] = useState<number | null>(null);
    const cardsHeadingRef = useRef<HTMLHeadingElement>(null);
    const [cardsHeadingAlto, setCardsHeadingAlto] = useState(32);

    const hayColumnaCards = articulosReel.length > 0;

    useLayoutEffect(() => {
        const el = cardsPlaceholderRef.current;
        if (!el) return;
        const medir = () => setCardsLeft(el.getBoundingClientRect().left);
        medir();
        const observer = new ResizeObserver(medir);
        observer.observe(el);
        window.addEventListener('resize', medir);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', medir);
        };
    }, [hayColumnaCards, articulosFeedSinReel.length, visible]);

    useLayoutEffect(() => {
        const el = cardsHeadingRef.current;
        if (!el) return;
        const medir = () => setCardsHeadingAlto(el.getBoundingClientRect().height);
        medir();
        const observer = new ResizeObserver(medir);
        observer.observe(el);
        return () => observer.disconnect();
    }, [hayColumnaCards]);

    useEffect(() => {
        const el = cardsScrollRef.current;
        if (!el) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        let pausado = false;
        const onEnter = () => { pausado = true; };
        const onLeave = () => { pausado = false; };
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);

        const intervalo = window.setInterval(() => {
            if (pausado) return;
            const { scrollTop, scrollHeight, clientHeight } = el;
            if (scrollHeight <= clientHeight) return;
            if (scrollTop + clientHeight >= scrollHeight - 4) {
                el.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                el.scrollBy({ top: clientHeight * 0.5, behavior: 'smooth' });
            }
        }, 3500);

        return () => {
            window.clearInterval(intervalo);
            el.removeEventListener('mouseenter', onEnter);
            el.removeEventListener('mouseleave', onLeave);
        };
    }, [hayColumnaCards]);

    // ─── Scroll infinito automático con IntersectionObserver ──────────────
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
            { rootMargin: '600px 0px' }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // Jalar para refrescar (móvil).
    const pull = usePullToRefresh({
        onRefresh: () => refetch(),
        scrollRef: cuerpoRef,
        habilitado: !esEscritorio,
    });
    const refrescandoFeedCrudo = isRefetchingFeed && !isFetchingNextPage;
    const refrescandoFeed = useMinDuracionVisible(refrescandoFeedCrudo, 700);
    const progresoRefresco = refrescandoFeed ? 1 : pull.progreso;

    // ─── Deep-link desde notificación de comentario (?articuloId=&comentarioId=) ──
    const [articuloIdDestacado, setArticuloIdDestacado] = useState<string | null>(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('articuloId') || null;
    });
    const [comentarioIdDestacado, setComentarioIdDestacado] = useState<string | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const nuevoArticuloId = params.get('articuloId');
        if (nuevoArticuloId) {
            setArticuloIdDestacado(nuevoArticuloId);
            setComentarioIdDestacado(params.get('comentarioId'));
            params.delete('articuloId');
            params.delete('comentarioId');
            const nuevaUrl = params.toString()
                ? `${window.location.pathname}?${params.toString()}`
                : window.location.pathname;
            window.history.replaceState({}, '', nuevaUrl);
        }
    }, [location.search]);

    return (
        <>
            {/* ── Composer inline ─────────────────────────────────────
                Réplica del patrón de Servicios. Solo en modo personal —
                en modo comercial los negocios no publican artículos P2P. */}
            {esModoPersonal && (
                <div className="px-3 lg:px-0 pt-3">
                    <ComposerSection />
                </div>
            )}

            {/* Estado: sin ciudad seleccionada. En móvil (sin Navbar global)
                el botón abre el ModalUbicacion para que el usuario pueda
                elegirla sin depender del selector del Navbar. */}
            {!ciudad && (
                <div className="mx-3 mt-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 lg:mx-0">
                    <div className="flex items-start gap-2.5">
                        <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />
                        <div className="flex-1">
                            <strong className="font-semibold">Selecciona tu ciudad</strong>
                            <p className="mt-0.5">Necesitamos tu ciudad para mostrarte artículos cerca de ti.</p>
                            <button
                                data-testid="btn-seleccionar-ciudad"
                                onClick={onAbrirModalUbicacion}
                                className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm lg:hover:bg-amber-700"
                            >
                                <MapPin className="h-3.5 w-3.5" strokeWidth={2.5} />
                                Elegir ciudad
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Estado: con ciudad pero sin GPS — invitación dinámica al estilo
                de los demás estados. NO bloquea el feed. */}
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
                            style={{ background: 'linear-gradient(135deg, #2dd4bf, #0d9488)' }}
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
                        onClick={onActivarUbicacion}
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
                    <IndicadorRefrescoFeed
                        inline
                        progreso={1}
                        refrescando
                        icon={<ShoppingCart className="h-9 w-9 text-teal-600" strokeWidth={2.25} />}
                        claseAnillo="border-teal-200 border-t-teal-600"
                    />
                </div>
            )}

            {/* Estado: error */}
            {isError && !isLoading && (
                <div className="mx-3 mt-6 rounded-xl border-2 border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 lg:mx-0">
                    <div className="flex items-start gap-2.5">
                        <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" strokeWidth={2} />
                        <div>
                            <strong className="font-semibold">No pudimos cargar el feed</strong>
                            <p className="mt-0.5">Revisa tu conexión e intenta de nuevo.</p>
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

            {!isLoading && !isError && (
                <IndicadorRefrescoFeed
                    testId="marketplace-feed-refrescando"
                    progreso={progresoRefresco}
                    refrescando={refrescandoFeed}
                    sinTransicion={pull.gestoActivo}
                    icon={<ShoppingCart className="h-9 w-9 text-teal-600" strokeWidth={2.25} />}
                    claseAnillo="border-teal-200 border-t-teal-600"
                />
            )}

            {/* FEED v1.2 — MÓVIL: reel horizontal + feed apilado. ESCRITORIO:
                columna "Recién publicado" FIJA a la izquierda + feed a la
                derecha, sin scroll interno propio (fluye con <main>). */}
            {!isLoading && !isError && articulosFeed.length > 0 && (
                <>
                    <div className="lg:hidden">
                        {articulosReel.length > 0 && (
                            <div className="mt-2 px-4">
                                <ReelMarketplace articulos={articulosReel} />
                            </div>
                        )}
                        <div className="space-y-3 px-3">
                            {articulosFeedSinReel.map((articulo) => (
                                <CardArticuloFeed key={articulo.id} articulo={articulo} />
                            ))}
                        </div>
                    </div>

                    <div className="hidden lg:flex lg:items-start gap-2 2xl:gap-6">
                        {hayColumnaCards && (
                            <div
                                ref={cardsPlaceholderRef}
                                className="relative w-[320px] 2xl:w-[340px] shrink-0"
                                style={{ height: `calc(100vh - ${headerBottom + 16}px - 16px)` }}
                            >
                                <div
                                    className="w-[320px] 2xl:w-[340px] z-10 lg:fixed"
                                    style={{
                                        top: `${headerBottom + 16}px`,
                                        left: cardsLeft !== null ? `${cardsLeft}px` : undefined,
                                    }}
                                >
                                    <h3
                                        ref={cardsHeadingRef}
                                        className="flex items-center gap-1.5 px-1 pb-2 text-sm font-bold uppercase tracking-wide text-slate-600"
                                    >
                                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-teal-600" strokeWidth={2.5} />
                                        Recién publicado
                                    </h3>
                                    <div
                                        ref={cardsScrollRef}
                                        className="marketplace-cards-scroll overflow-y-auto overflow-x-visible pr-1"
                                        style={{ height: `calc(100vh - ${headerBottom + 16 + cardsHeadingAlto}px - 16px)` }}
                                    >
                                        <div className="flex flex-col gap-4 2xl:gap-5 pb-4">
                                            {articulosReel.map((articulo) => (
                                                <CardArticulo key={articulo.id} articulo={articulo} variant="glass" />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div
                            className={
                                hayColumnaCards
                                    ? 'min-w-0 flex-1'
                                    : 'mx-auto w-full max-w-[952px] 2xl:max-w-[704px]'
                            }
                        >
                            <div className="space-y-4">
                                {articulosFeedSinReel.map((articulo) => (
                                    <CardArticuloFeed key={articulo.id} articulo={articulo} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {hasNextPage && (
                        <div ref={sentinelRef} className="flex items-center justify-center py-8">
                            {isFetchingNextPage ? (
                                <Loader2 className="h-6 w-6 animate-spin text-slate-500" strokeWidth={2} />
                            ) : (
                                <div className="h-1 w-1" />
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Estado: vacío total. */}
            {!isLoading && !isError && dataFeedInfinito && articulosFeed.length === 0 && (
                <div className="relative mt-12 flex flex-col items-center px-6 text-center lg:mt-20">
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
                            style={{ background: 'linear-gradient(135deg, #2dd4bf, #0d9488)' }}
                        >
                            <ShoppingCart className="h-11 w-11 text-white" strokeWidth={2} />
                        </div>
                    </div>

                    {categoriaFeed !== null ? (
                        <>
                            <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                                Sin coincidencias
                            </h3>
                            <p className="mb-6 max-w-sm text-base text-slate-600">
                                No hay artículos con esta categoría.
                            </p>
                            <button
                                data-testid="btn-limpiar-categoria-empty-state"
                                onClick={onLimpiarCategoria}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-teal-500 to-teal-700 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
                            >
                                <ShoppingCart className="h-4 w-4" strokeWidth={2.5} />
                                Ver todos los artículos
                            </button>
                        </>
                    ) : (
                        <>
                            <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                                ¡Sé el primero!
                            </h3>
                            <p className="max-w-sm text-base text-slate-600">
                                Aún no hay {modoFeed === 'busco' ? 'búsquedas' : 'artículos'} en{' '}
                                <span className="font-bold text-slate-900">{ciudad ?? 'tu zona'}</span>.
                            </p>

                            <button
                                data-testid="btn-publicar-empty-state"
                                onClick={onPublicar}
                                className="mt-6 hidden cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-slate-800 to-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] lg:inline-flex"
                            >
                                <Plus className="h-4 w-4" strokeWidth={2.5} />
                                Publicar primer artículo
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Indicador animado apuntando al FAB — solo móvil cuando el feed
                está vacío. */}
            {!isLoading && !isError && dataFeedInfinito && articulosFeed.length === 0 && (
                <div
                    data-testid="empty-state-arrow-fab"
                    className="pointer-events-none fixed bottom-36 right-3 z-20 flex flex-col items-end gap-1 lg:hidden"
                    style={{ animation: 'mp-arrow-bounce 1.4s ease-in-out infinite' }}
                >
                    <span className="rounded-full bg-linear-to-br from-slate-800 to-slate-950 px-3 py-1.5 text-sm font-bold text-white shadow-lg whitespace-nowrap">
                        ¡Publica aquí!
                    </span>
                    <CornerRightDown className="h-8 w-8 text-slate-900 drop-shadow" strokeWidth={3} />
                    <style>{`
                        @keyframes mp-arrow-bounce {
                            0%, 100% { transform: translate(0, 0); }
                            50% { transform: translate(6px, 6px); }
                        }
                    `}</style>
                </div>
            )}

            {/* Deep-link desde notificación de comentario. */}
            {articuloIdDestacado && (
                <ModalComentariosMarketplace
                    abierto={!!articuloIdDestacado}
                    onCerrar={() => {
                        setArticuloIdDestacado(null);
                        setComentarioIdDestacado(null);
                    }}
                    articuloId={articuloIdDestacado}
                    comentarioDestacadoId={comentarioIdDestacado}
                />
            )}
        </>
    );
}

export default SeccionFeedArticulos;
