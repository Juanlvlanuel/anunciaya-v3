/**
 * FeedPublicacionesNegocio.tsx
 * ==============================
 * Contenedor del feed infinito de publicaciones de negocio. Encapsula
 * `useFeedNegocioPublicaciones` + scroll infinito (IntersectionObserver,
 * mismo patrón que `PaginaMarketplace.tsx`) + estados loading/vacío + lista
 * de `CardPublicacionNegocioFeed`.
 *
 * Filtros: lee `useFiltrosNegociosStore` + `useGpsStore` — los MISMOS chips
 * del header de Negocios (Cerca de ti, Categoría, Subcategoría, CardYA, A
 * domicilio) filtran también el feed de publicaciones, no solo la lista de
 * negocios. Una publicación "hereda" los filtros del negocio que la hizo.
 *
 * Se usa en dos layouts distintos de `PaginaNegocios.tsx`:
 *  - Desktop tab Feed: columna derecha (junto a la lista de negocios).
 *  - Móvil tab Feed: debajo del `ReelNegociosFeed`.
 *
 * Refresco tipo Facebook: `useFeedNegocioPublicaciones` ya trae
 * `refetchOnMount: 'always'` + `refetchOnWindowFocus: true` (refresco
 * automático en PC al entrar/volver a la pestaña). En móvil, además, el
 * gesto de jalar para refrescar (`usePullToRefresh`, mismo patrón que el
 * Home) — solo la instancia móvil (`pullHabilitado`) engancha el gesto,
 * la instancia de escritorio nunca lo activa (evita listeners duplicados
 * sobre el mismo `scrollRef` cuando ambos bloques están montados a la vez).
 *
 * Ubicación: apps/web/src/components/negocios/publicaciones/FeedPublicacionesNegocio.tsx
 */

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Newspaper, Sparkles, Plus, Store } from 'lucide-react';
import { useFeedNegocioPublicaciones } from '../../../hooks/queries/useNegocioPublicaciones';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useFiltrosNegociosStore } from '../../../stores/useFiltrosNegociosStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { useMinDuracionVisible } from '../../../hooks/useMinDuracionVisible';
import { IndicadorRefrescoFeed } from '../../ui/IndicadorRefrescoFeed';
import { CardPublicacionNegocioFeed } from './CardPublicacionNegocioFeed';

interface FeedPublicacionesNegocioProps {
    ciudad: string | null;
    onAbrirDetalle: (id: string) => void;
    /** Contenedor con scroll para el gesto de jalar (solo la instancia móvil lo pasa). */
    scrollRef?: RefObject<HTMLElement | null>;
    /** Habilita el gesto de jalar — true SOLO en la instancia realmente móvil (ver nota arriba). */
    pullHabilitado?: boolean;
    /** Posición FIJA en px de la PÁGINA (no de esta columna) — solo la
     *  instancia de escritorio la pasa, ver `IndicadorRefrescoFeed`. */
    posicionFija?: { left: number; top: number };
}

export function FeedPublicacionesNegocio({ ciudad, onAbrirDetalle, scrollRef, pullHabilitado = false, posicionFija }: FeedPublicacionesNegocioProps) {
    const navigate = useNavigate();
    const handlePublicar = () => navigate('/negocios?crear=1');
    // El composer es exclusivo de negocios en modo Comercial (a diferencia
    // de MP/Servicios) — el CTA del estado vacío solo aplica a quien
    // realmente puede publicar.
    const usuarioAuth = useAuthStore((s) => s.usuario);
    const puedePublicar = usuarioAuth?.modoActivo === 'comercial' && !!usuarioAuth?.negocioId;

    // Mismos filtros que consume `useNegociosLista()` para la lista de
    // negocios — el feed de publicaciones se filtra igual.
    const { categoria, subcategorias, distancia, cercaDeMi, soloCardya, aDomicilio, filtrosActivos, limpiarFiltros } =
        useFiltrosNegociosStore();
    const { latitud, longitud } = useGpsStore();

    const {
        data,
        isLoading,
        isError,
        isRefetching,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useFeedNegocioPublicaciones({
        ciudad,
        latitud,
        longitud,
        // `distanciaMaxKm` solo se manda con "Cerca de ti" activo (igual que
        // useNegociosLista) — sin él, el backend igual usa lat/lng para
        // calcular `distanciaKm` de cada card, con un radio default de 50km.
        ...(cercaDeMi && { distanciaMaxKm: distancia }),
        categoriaId: categoria,
        subcategoriaIds: subcategorias,
        aceptaCardYA: soloCardya,
        aDomicilio,
    });

    const publicaciones = useMemo(
        () => data?.pages.flatMap((p) => p.publicaciones) ?? [],
        [data]
    );

    // ─── Scroll infinito automático (mismo patrón que PaginaMarketplace) ──────
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

    // Jalar para refrescar (móvil) — mismo hook que el Home. `progreso` sigue
    // el dedo mientras jalas; en cuanto el refetch real arranca (por el pull
    // o por el auto-refresh de `refetchOnMount`/`refetchOnWindowFocus`),
    // `refrescando` se enciende solo y el indicador gira hasta que termina.
    const pull = usePullToRefresh({
        onRefresh: () => refetch(),
        scrollRef,
        habilitado: pullHabilitado,
    });
    // `useMinDuracionVisible`: en escritorio el refetch a veces resuelve en
    // 304 Not Modified (ETag) casi instantáneo — sin esto, el anillo prende
    // y apaga entre renders y nunca alcanza a pintarse en pantalla.
    const refrescandoCrudo = isRefetching && !isFetchingNextPage;
    const refrescando = useMinDuracionVisible(refrescandoCrudo, 700);
    const progreso = refrescando ? 1 : pull.progreso;
    const indicador = (
        <IndicadorRefrescoFeed
            testId="negocios-feed-refrescando"
            progreso={progreso}
            refrescando={refrescando}
            sinTransicion={pull.gestoActivo}
            icon={<Store className="h-9 w-9 text-blue-600" strokeWidth={2.25} />}
            claseAnillo="border-blue-200 border-t-blue-600"
            posicionFija={posicionFija}
        />
    );

    let contenido: ReactNode;

    if (isLoading) {
        contenido = (
            <div className="flex items-center justify-center py-12" data-testid="feed-publicaciones-negocio-cargando">
                <IndicadorRefrescoFeed
                    inline
                    progreso={1}
                    refrescando
                    icon={<Store className="h-9 w-9 text-blue-600" strokeWidth={2.25} />}
                    claseAnillo="border-blue-200 border-t-blue-600"
                />
            </div>
        );
    } else if (isError) {
        contenido = (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500" data-testid="feed-publicaciones-negocio-error">
                <Newspaper className="w-8 h-8 mb-2 text-slate-300" strokeWidth={1.5} />
                <p className="text-[14px] font-semibold">No pudimos cargar el feed.</p>
            </div>
        );
    } else if (publicaciones.length === 0) {
        // Dos casos bien distintos (mismo criterio que la lista de negocios,
        // `EstadoCiudadSinNegocios`/`EstadoFiltroSinNegocios`):
        //  - Hay filtros activos y no matchean nada → "sin coincidencias",
        //    con CTA para limpiarlos. NO es lo mismo que "no hay publicaciones".
        //  - Sin filtros, la ciudad realmente no tiene publicaciones aún.
        const hayFiltros = filtrosActivos() > 0;

        contenido = (
            <div
                className="relative mt-8 flex flex-col items-center px-6 text-center lg:mt-16"
                data-testid="feed-publicaciones-negocio-vacio"
            >
                {/* Sparkles decorativos — mismo patrón que MarketPlace/Servicios,
                    en azul (marca Negocios). */}
                <Sparkles
                    className="absolute left-8 top-2 h-5 w-5 animate-pulse text-blue-400/70"
                    strokeWidth={2}
                    style={{ animationDuration: '2.5s' }}
                />
                <Sparkles
                    className="absolute right-10 top-10 h-4 w-4 animate-pulse text-blue-300/70"
                    strokeWidth={2}
                    style={{ animationDuration: '3.2s', animationDelay: '0.6s' }}
                />

                {/* Icono central con halos pulsantes */}
                <div className="relative mb-6">
                    <div
                        className="absolute inset-0 -m-5 animate-ping rounded-full bg-blue-300/40"
                        style={{ animationDuration: '2.4s' }}
                    />
                    <div
                        className="absolute inset-0 -m-2 animate-ping rounded-full bg-blue-400/40"
                        style={{ animationDuration: '2.4s', animationDelay: '0.4s' }}
                    />
                    <div
                        className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl"
                        style={{ background: 'linear-gradient(135deg, #60a5fa, #2563eb)' }}
                    >
                        {hayFiltros ? (
                            <Store className="h-11 w-11 text-white" strokeWidth={2} />
                        ) : (
                            <Newspaper className="h-11 w-11 text-white" strokeWidth={2} />
                        )}
                    </div>
                </div>

                {hayFiltros ? (
                    <>
                        <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                            Sin coincidencias
                        </h3>
                        <p className="mb-6 max-w-sm text-base text-slate-600">
                            No hay publicaciones con estos filtros.
                        </p>
                        <button
                            type="button"
                            data-testid="btn-limpiar-filtros-feed-negocio"
                            onClick={limpiarFiltros}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-blue-500 to-blue-700 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
                        >
                            <Newspaper className="h-4 w-4" strokeWidth={2.5} />
                            Ver todas las publicaciones
                        </button>
                    </>
                ) : puedePublicar ? (
                    <>
                        <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                            ¡Sé el primero!
                        </h3>
                        <p className="max-w-sm text-base text-slate-600">
                            Aún no hay publicaciones en{' '}
                            <span className="font-bold text-slate-900">{ciudad ?? 'tu zona'}</span>.
                        </p>
                        <button
                            type="button"
                            data-testid="btn-publicar-empty-state-negocio"
                            onClick={handlePublicar}
                            className="mt-6 hidden cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-slate-800 to-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02] lg:inline-flex"
                        >
                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                            Publicar primera publicación
                        </button>
                    </>
                ) : (
                    <>
                        <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                            Aún no hay publicaciones
                        </h3>
                        <p className="max-w-sm text-base text-slate-600">
                            En{' '}
                            <span className="font-bold text-slate-900">{ciudad ?? 'tu zona'}</span>{' '}
                            — vuelve pronto.
                        </p>
                    </>
                )}
            </div>
        );
    } else {
        contenido = (
            <div className="space-y-4" data-testid="feed-publicaciones-negocio">
                {publicaciones.map((publicacion) => (
                    <CardPublicacionNegocioFeed
                        key={publicacion.id}
                        publicacion={publicacion}
                        onAbrirDetalle={onAbrirDetalle}
                    />
                ))}

                {hasNextPage && (
                    <div ref={sentinelRef} className="flex items-center justify-center py-4">
                        {isFetchingNextPage && <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative">
            {indicador}
            {contenido}
        </div>
    );
}

export default FeedPublicacionesNegocio;
