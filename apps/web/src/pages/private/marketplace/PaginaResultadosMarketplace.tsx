/**
 * PaginaResultadosMarketplace.tsx
 * ================================
 * Vista de resultados del buscador del MarketPlace.
 *
 * URL state:
 *  - `?q=<query>&precioMin=&precioMax=&condicion=nuevo,usado&distanciaMaxKm=10
 *     &ordenar=recientes`
 *  - Compartible y bookmarkeable. Modificar filtros actualiza la URL.
 *
 * Layout:
 *  - Móvil: header sticky con back + chip "[query] · X resultados" + botón
 *    "Filtros" + dropdown ordenar. Bottom sheet de filtros.
 *  - Desktop: 2 columnas — sidebar de filtros izquierda + grid de resultados
 *    derecha. Mismo header.
 *
 * Scroll infinito con `IntersectionObserver` sobre un sentinel al final
 * del grid.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P5)
 * Sprint:      docs/prompts Marketplace/Sprint-6-Buscador.md
 *
 * Ubicación: apps/web/src/pages/private/marketplace/PaginaResultadosMarketplace.tsx
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { ChevronLeft, SlidersHorizontal, X, Search, ChevronDown } from 'lucide-react';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useSearchStore } from '../../../stores/useSearchStore';
import {
    useBuscadorResultados,
    type FiltrosBusquedaCliente,
} from '../../../hooks/queries/useMarketplace';
import { useFiltrosBuscadorUrl } from '../../../hooks/useFiltrosBuscadorUrl';
import { CardArticulo } from '../../../components/marketplace/CardArticulo';
import { FiltrosBuscador } from '../../../components/marketplace/FiltrosBuscador';
import { Spinner } from '../../../components/ui/Spinner';
import type { ArticuloFeed } from '../../../types/marketplace';

const ORDENES = [
    { valor: 'recientes' as const, label: 'Más recientes' },
    { valor: 'cercanos' as const, label: 'Más cercanos' },
    { valor: 'precio_asc' as const, label: 'Precio menor' },
    { valor: 'precio_desc' as const, label: 'Precio mayor' },
];

export function PaginaResultadosMarketplace() {
    const navigate = useNavigate();
    // Botón ← respeta historial (flecha nativa móvil) con fallback a /marketplace.
    const handleVolver = useVolverAtras('/marketplace');
    const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? null);
    const lat = useGpsStore((s) => s.latitud);
    const lng = useGpsStore((s) => s.longitud);
    const queryGlobal = useSearchStore((s) => s.query);

    const { filtros, setFiltros, actualizarFiltro, quitarFiltro, limpiarFiltros } =
        useFiltrosBuscadorUrl();

    const [filtrosMobileAbierto, setFiltrosMobileAbierto] = useState(false);
    const [ordenarAbierto, setOrdenarAbierto] = useState(false);
    const ordenarRef = useRef<HTMLDivElement>(null);

    // Inyectar GPS en filtros para que el backend use lat/lng cuando ordenar=cercanos
    const filtrosConGps: FiltrosBusquedaCliente = useMemo(
        () => ({
            ...filtros,
            lat: lat ?? undefined,
            lng: lng ?? undefined,
        }),
        [filtros, lat, lng]
    );

    const {
        data,
        isLoading,
        isFetching,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useBuscadorResultados(ciudad, filtrosConGps);

    // ─── Scroll infinito con IntersectionObserver ──────────────────────────
    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: '200px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // ─── Cerrar dropdown ordenar al click fuera ────────────────────────────
    useEffect(() => {
        if (!ordenarAbierto) return;
        const handler = (e: MouseEvent) => {
            if (ordenarRef.current && !ordenarRef.current.contains(e.target as Node)) {
                setOrdenarAbierto(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [ordenarAbierto]);

    // ─── Aplanar páginas ──────────────────────────────────────────────────
    const articulos = useMemo(() => {
        if (!data) return [];
        return data.pages.flatMap((p) => p.data);
    }, [data]);
    const total = data?.pages[0]?.paginacion.total ?? 0;
    const queryActual = filtros.q ?? queryGlobal ?? '';

    // ─── Chips de filtros activos ─────────────────────────────────────────
    const chipsActivos: Array<{ key: keyof FiltrosBusquedaCliente; label: string }> = [];
    if (filtros.distanciaMaxKm !== undefined) {
        chipsActivos.push({ key: 'distanciaMaxKm', label: `Hasta ${filtros.distanciaMaxKm} km` });
    }
    if (filtros.precioMin !== undefined || filtros.precioMax !== undefined) {
        const min = filtros.precioMin ?? 0;
        const max = filtros.precioMax ?? 999999;
        chipsActivos.push({
            key: 'precioMin',
            label: `$${min.toLocaleString('es-MX')} - $${max.toLocaleString('es-MX')}`,
        });
    }
    if (filtros.condicion && filtros.condicion.length > 0) {
        chipsActivos.push({
            key: 'condicion',
            label: filtros.condicion
                .map((c) =>
                    c === 'para_reparar'
                        ? 'Para reparar'
                        : c.charAt(0).toUpperCase() + c.slice(1)
                )
                .join(', '),
        });
    }

    const ordenLabel =
        ORDENES.find((o) => o.valor === (filtros.ordenar ?? 'recientes'))?.label ??
        'Más recientes';

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <div data-testid="pagina-resultados-marketplace" className="min-h-full bg-slate-50">
            {/* ─── Header sticky ─────────────────────────────────────────── */}
            <div className="sticky top-0 z-20 bg-white shadow-sm">
                <div className="lg:mx-auto lg:max-w-7xl lg:px-6 2xl:px-8">
                    <div className="flex items-center gap-2 px-3 py-3">
                        <button
                            data-testid="btn-volver-resultados"
                            onClick={handleVolver}
                            aria-label="Volver al MarketPlace"
                            className="flex h-10 w-10 cursor-pointer shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
                        >
                            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <div
                                data-testid="header-resultados-titulo"
                                className="truncate text-sm font-semibold text-slate-900"
                            >
                                {queryActual ? (
                                    <>
                                        "{queryActual}"
                                    </>
                                ) : (
                                    'Todos los artículos'
                                )}
                            </div>
                            <div className="text-xs text-slate-500">
                                {isLoading && articulos.length === 0
                                    ? 'Buscando...'
                                    : `${total} ${total === 1 ? 'resultado' : 'resultados'}`}
                            </div>
                        </div>
                        {/* Dropdown ordenar */}
                        <div className="relative shrink-0" ref={ordenarRef}>
                            <button
                                data-testid="btn-ordenar"
                                onClick={() => setOrdenarAbierto((v) => !v)}
                                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                {ordenLabel}
                                <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                            {ordenarAbierto && (
                                <div className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                                    {ORDENES.map((o) => (
                                        <button
                                            key={o.valor}
                                            data-testid={`opcion-ordenar-${o.valor}`}
                                            onClick={() => {
                                                actualizarFiltro('ordenar', o.valor);
                                                setOrdenarAbierto(false);
                                            }}
                                            className={`block w-full cursor-pointer px-3 py-2 text-left text-xs ${
                                                (filtros.ordenar ?? 'recientes') === o.valor
                                                    ? 'bg-teal-50 font-semibold text-teal-700'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Botón filtros (solo móvil) */}
                        <button
                            data-testid="btn-abrir-filtros-mobile"
                            onClick={() => setFiltrosMobileAbierto(true)}
                            aria-label="Abrir filtros"
                            className="flex h-10 w-10 cursor-pointer shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white hover:bg-slate-50 lg:hidden"
                        >
                            <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
                            {chipsActivos.length > 0 && (
                                <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-500 px-1 text-[10px] font-bold text-white">
                                    {chipsActivos.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Chips de filtros activos */}
                    {chipsActivos.length > 0 && (
                        <div
                            data-testid="chips-filtros-activos"
                            className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-3 py-2"
                        >
                            {chipsActivos.map((chip) => (
                                <span
                                    key={chip.key}
                                    className="inline-flex items-center gap-1 rounded-full border border-teal-300 bg-teal-50 pl-2.5 pr-1 text-xs font-medium text-teal-800"
                                >
                                    {chip.label}
                                    <button
                                        data-testid={`btn-quitar-chip-${chip.key}`}
                                        onClick={() => quitarFiltro(chip.key)}
                                        aria-label={`Quitar filtro ${chip.label}`}
                                        className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-teal-700 hover:bg-teal-100"
                                    >
                                        <X className="h-3 w-3" strokeWidth={2.5} />
                                    </button>
                                </span>
                            ))}
                            <button
                                data-testid="btn-limpiar-todos-chips"
                                onClick={limpiarFiltros}
                                className="ml-1 cursor-pointer text-xs font-semibold text-rose-600 hover:text-rose-700"
                            >
                                Limpiar todos
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Layout 2 cols (desktop) ───────────────────────────────── */}
            <div className="lg:mx-auto lg:max-w-7xl lg:px-6 lg:py-6 2xl:px-8">
                <div className="lg:flex lg:gap-6">
                    {/* Sidebar filtros (solo desktop) */}
                    <div className="hidden lg:block">
                        <FiltrosBuscador
                            variante="desktop"
                            abierto={true}
                            onCerrar={() => {}}
                            filtros={filtros}
                            onAplicar={(nuevos) => setFiltros(nuevos)}
                            onLimpiar={limpiarFiltros}
                            tieneGps={lat !== null && lng !== null}
                        />
                    </div>

                    {/* Grid de resultados */}
                    <div className="flex-1 px-3 py-4 lg:px-0 lg:py-0">
                        {isLoading && articulos.length === 0 ? (
                            <div className="flex min-h-60 items-center justify-center">
                                <Spinner tamanio="lg" />
                            </div>
                        ) : articulos.length === 0 ? (
                            <EstadoVacio
                                query={queryActual}
                                hayFiltros={chipsActivos.length > 0}
                                onLimpiar={limpiarFiltros}
                            />
                        ) : (
                            <>
                                <div
                                    data-testid="grid-resultados"
                                    className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4 2xl:grid-cols-4"
                                >
                                    {articulos.map((a) => (
                                        <CardArticulo
                                            key={a.id}
                                            articulo={{ ...a, distanciaMetros: null } as ArticuloFeed}
                                        />
                                    ))}
                                </div>
                                {/* Sentinel para scroll infinito */}
                                <div ref={sentinelRef} className="h-8" />
                                {isFetchingNextPage && (
                                    <div className="flex items-center justify-center py-4">
                                        <Spinner tamanio="md" />
                                    </div>
                                )}
                                {!hasNextPage && articulos.length > 0 && (
                                    <p className="py-6 text-center text-xs text-slate-500">
                                        Mostrando {articulos.length} de {total} resultados
                                    </p>
                                )}
                            </>
                        )}
                        {!isLoading && isFetching && articulos.length > 0 && (
                            <div className="pointer-events-none fixed bottom-4 right-4 z-30 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs text-white shadow-lg">
                                Actualizando...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Bottom sheet filtros (móvil) ─────────────────────────── */}
            <FiltrosBuscador
                variante="mobile"
                abierto={filtrosMobileAbierto}
                onCerrar={() => setFiltrosMobileAbierto(false)}
                filtros={filtros}
                onAplicar={(nuevos) => setFiltros(nuevos)}
                onLimpiar={limpiarFiltros}
                tieneGps={lat !== null && lng !== null}
            />

            {/* Overlay del buscador: montado globalmente en `MainLayout` para
                cualquier ruta `/marketplace/*`. Ya no necesita montaje local. */}
        </div>
    );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

interface EstadoVacioProps {
    query: string;
    hayFiltros: boolean;
    onLimpiar: () => void;
}

function EstadoVacio({ query, hayFiltros, onLimpiar }: EstadoVacioProps) {
    return (
        <div
            data-testid="estado-vacio-resultados"
            className="mx-auto mt-8 max-w-md rounded-xl border-2 border-slate-200 bg-white p-8 text-center"
        >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Search className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
            </div>
            <h3 className="mb-2 text-base font-semibold text-slate-900">
                {query
                    ? `No encontramos artículos para "${query}"`
                    : 'No hay artículos que coincidan'}
            </h3>
            <p className="text-sm text-slate-600">
                {hayFiltros
                    ? 'Probá quitar algunos filtros para ampliar los resultados.'
                    : 'Probá con otra búsqueda.'}
            </p>
            {hayFiltros && (
                <button
                    data-testid="btn-limpiar-filtros-vacio"
                    onClick={onLimpiar}
                    className="mt-4 inline-flex cursor-pointer items-center rounded-lg bg-linear-to-br from-slate-800 to-slate-950 px-4 py-2 text-sm font-bold text-white"
                >
                    Limpiar filtros
                </button>
            )}
        </div>
    );
}

export default PaginaResultadosMarketplace;
