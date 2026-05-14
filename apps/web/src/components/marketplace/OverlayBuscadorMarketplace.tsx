/**
 * OverlayBuscadorMarketplace.tsx
 * ===============================
 * Overlay del buscador del MarketPlace que se ancla al `useSearchStore`
 * global (manejado por el Navbar).
 *
 * IMPORTANTE — decisión post-QA del Sprint 2:
 *  El overlay NO tiene input propio. El input físico SIEMPRE vive en el
 *  Navbar global (useSearchStore.query). Este componente solo muestra:
 *   - Estado vacío: "Búsquedas recientes" + "Más buscado en [ciudad]".
 *   - Mientras escribe (debounce 300ms): sugerencias en vivo.
 *   - Al ejecutar (Enter o tap en sugerencia): navega a /marketplace/buscar.
 *
 * Visibilidad:
 *  - Solo se monta dentro de rutas que empiecen con `/marketplace`.
 *  - Aparece cuando `buscadorAbierto === true` (focus del input del Navbar)
 *    o cuando `query.length >= 1`.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P5)
 * Sprint:      docs/prompts Marketplace/Sprint-6-Buscador.md
 *
 * Ubicación: apps/web/src/components/marketplace/OverlayBuscadorMarketplace.tsx
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, ArrowUpRight } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';
import { useSearchStore } from '../../stores/useSearchStore';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
const TrendingUp = (p: IconoWrapperProps) => <Icon icon={ICONOS.tendenciaSubida} {...p} />;
import { useGpsStore } from '../../stores/useGpsStore';
import {
    useBuscadorSugerencias,
    useBuscadorPopulares,
} from '../../hooks/queries/useMarketplace';
import {
    obtenerBusquedasRecientes,
    quitarBusquedaReciente,
    borrarBusquedasRecientes,
    agregarBusquedaReciente,
} from '../../utils/busquedasRecientes';
import { useState } from 'react';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function OverlayBuscadorMarketplace() {
    const location = useLocation();
    const navigate = useNavigate();

    const query = useSearchStore((s) => s.query);
    const buscadorAbierto = useSearchStore((s) => s.buscadorAbierto);
    const cerrarBuscador = useSearchStore((s) => s.cerrarBuscador);
    const setQuery = useSearchStore((s) => s.setQuery);

    const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? null);

    // Re-render cuando cambian las búsquedas recientes (cuando borra una o todas)
    const [recientesRev, setRecientesRev] = useState(0);
    const recientes = obtenerBusquedasRecientes();
    void recientesRev; // forzar dependencia con re-render

    // ─── Visibilidad: solo en rutas /marketplace*  ───────────────────────────
    const enMarketplace = location.pathname.startsWith('/marketplace');
    const debeMostrar = enMarketplace && (buscadorAbierto || query.length >= 1);

    // ─── Hooks de datos ───────────────────────────────────────────────────────
    const { data: sugerencias = [], isFetching: cargandoSug } = useBuscadorSugerencias(
        query,
        ciudad
    );
    const { data: populares = [] } = useBuscadorPopulares(ciudad);

    // ─── Cerrar con Escape ────────────────────────────────────────────────────
    useEffect(() => {
        if (!debeMostrar) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                cerrarBuscador();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [debeMostrar, cerrarBuscador]);

    // ─── Ejecutar búsqueda ────────────────────────────────────────────────────
    const ejecutarBusqueda = (terminoCrudo: string) => {
        const termino = terminoCrudo.trim();
        if (termino.length < 2) return;
        agregarBusquedaReciente(termino);
        setRecientesRev((v) => v + 1);
        setQuery(termino);
        cerrarBuscador();
        navigate(`/marketplace/buscar?q=${encodeURIComponent(termino)}`);
    };

    // ─── Submit con Enter ─────────────────────────────────────────────────────
    // El input vive en el Navbar — escuchamos Enter globalmente cuando estamos
    // visibles. Evita acoplarnos al ref del Navbar.
    const queryRef = useRef(query);
    queryRef.current = query;
    useEffect(() => {
        if (!debeMostrar) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                const target = e.target as HTMLElement | null;
                // Solo ejecutar si el foco está en el input del navbar
                if (target?.id === 'input-busqueda-navbar') {
                    ejecutarBusqueda(queryRef.current);
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debeMostrar]);

    if (!debeMostrar) return null;

    const escribiendo = query.trim().length >= 2;

    return (
        <div
            data-testid="overlay-buscador-marketplace"
            className="fixed inset-0 z-30 bg-black/30"
            onClick={cerrarBuscador}
            role="dialog"
            aria-modal="true"
            aria-label="Buscador de MarketPlace"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="mx-auto mt-20 max-h-[75vh] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl lg:mt-24"
            >
                {/* ─── Estado vacío: recientes + populares ─────────────────── */}
                {!escribiendo && (
                    <div className="space-y-5 p-4">
                        {/* Búsquedas recientes */}
                        {recientes.length > 0 && (
                            <section data-testid="seccion-busquedas-recientes">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                        <Clock className="h-4 w-4" strokeWidth={2} />
                                        Búsquedas recientes
                                    </h3>
                                    <button
                                        data-testid="btn-borrar-recientes"
                                        onClick={() => {
                                            borrarBusquedasRecientes();
                                            setRecientesRev((v) => v + 1);
                                        }}
                                        className="cursor-pointer text-xs font-semibold text-rose-600 hover:text-rose-700"
                                    >
                                        Borrar todo
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {recientes.map((termino) => (
                                        <ChipReciente
                                            key={termino}
                                            termino={termino}
                                            onClick={() => ejecutarBusqueda(termino)}
                                            onQuitar={() => {
                                                quitarBusquedaReciente(termino);
                                                setRecientesRev((v) => v + 1);
                                            }}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Populares */}
                        {populares.length > 0 && (
                            <section data-testid="seccion-populares">
                                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                    <TrendingUp className="h-4 w-4" strokeWidth={2} />
                                    Más buscado en {ciudad ?? 'tu ciudad'}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {populares.map((termino) => (
                                        <button
                                            key={termino}
                                            data-testid={`chip-popular-${termino}`}
                                            onClick={() => ejecutarBusqueda(termino)}
                                            className="cursor-pointer rounded-full border-2 border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-700"
                                        >
                                            {termino}
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}

                        {recientes.length === 0 && populares.length === 0 && (
                            <div className="py-6 text-center">
                                <Search
                                    className="mx-auto mb-2 h-8 w-8 text-slate-300"
                                    strokeWidth={1.5}
                                />
                                <p className="text-sm text-slate-500">
                                    Empieza a escribir para buscar artículos en {ciudad ?? 'tu ciudad'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Sugerencias en vivo: cards con preview ─────────────── */}
                {escribiendo && (
                    <section data-testid="seccion-sugerencias" className="p-2">
                        <h3 className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Resultados
                        </h3>
                        {cargandoSug && sugerencias.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-slate-500">
                                Buscando...
                            </div>
                        ) : sugerencias.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-slate-500">
                                No hay resultados para &quot;{query.trim()}&quot;. Presiona Enter para
                                buscar de todos modos.
                            </div>
                        ) : (
                            <>
                                <ul className="flex flex-col gap-1">
                                    {sugerencias.map((articulo, idx) => (
                                        <li key={articulo.id}>
                                            <button
                                                data-testid={`sugerencia-${idx}`}
                                                onClick={() => {
                                                    agregarBusquedaReciente(query.trim());
                                                    setRecientesRev((v) => v + 1);
                                                    cerrarBuscador();
                                                    navigate(`/marketplace/articulo/${articulo.id}`);
                                                }}
                                                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-100"
                                            >
                                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                                    {articulo.fotoPortada ? (
                                                        <img
                                                            src={articulo.fotoPortada}
                                                            alt={articulo.titulo}
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-slate-300">
                                                            <Search className="h-5 w-5" strokeWidth={1.5} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex min-w-0 flex-1 flex-col">
                                                    <span className="truncate text-sm font-semibold text-slate-900">
                                                        {articulo.titulo}
                                                    </span>
                                                    <span className="truncate text-sm font-bold text-teal-700">
                                                        {`$${articulo.precio.toLocaleString('es-MX')}`}
                                                        <span className="ml-2 font-normal text-slate-500 capitalize">
                                                            · {articulo.condicion.replace('_', ' ')}
                                                        </span>
                                                    </span>
                                                    <span className="truncate text-xs text-slate-400">
                                                        {articulo.ciudad}
                                                    </span>
                                                </div>
                                                <ArrowUpRight
                                                    className="h-4 w-4 shrink-0 text-slate-400"
                                                    strokeWidth={2}
                                                />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    data-testid="btn-ver-todos-resultados"
                                    onClick={() => ejecutarBusqueda(query)}
                                    className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-t border-slate-200 px-3 py-3 text-sm font-semibold text-teal-700 hover:bg-slate-50"
                                >
                                    Ver todos los resultados de &quot;{query.trim()}&quot;
                                    <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                                </button>
                            </>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// CHIP DE BÚSQUEDA RECIENTE (con X removible)
// =============================================================================

interface ChipRecienteProps {
    termino: string;
    onClick: () => void;
    onQuitar: () => void;
}

function ChipReciente({ termino, onClick, onQuitar }: ChipRecienteProps) {
    return (
        <span
            data-testid={`chip-reciente-${termino}`}
            className="group inline-flex items-center gap-1.5 rounded-full border-2 border-slate-200 bg-white pl-3 pr-1 text-sm text-slate-700 hover:border-slate-400"
        >
            <button
                onClick={onClick}
                className="cursor-pointer py-1 font-medium hover:text-slate-900"
            >
                {termino}
            </button>
            <button
                data-testid={`btn-quitar-reciente-${termino}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onQuitar();
                }}
                aria-label={`Quitar "${termino}"`}
                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
                <X className="h-3 w-3" strokeWidth={2.5} />
            </button>
        </span>
    );
}

export default OverlayBuscadorMarketplace;
