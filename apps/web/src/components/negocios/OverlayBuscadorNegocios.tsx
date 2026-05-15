/**
 * OverlayBuscadorNegocios.tsx
 * =============================
 * Overlay del buscador de la sección Negocios. Sigue el patrón de
 * `OverlayBuscadorMarketplace` con identidad azul y comportamiento sobrio:
 *
 *  - SIN endpoint backend nuevo. Filtra in-memory contra `useNegociosLista()`
 *    (React Query ya cachea esa lista entre el feed y el overlay).
 *  - SIN sección de populares. Solo recientes (localStorage) + sugerencias.
 *  - Click en sugerencia → `navigate('/negocios/:sucursalId')` — abre el
 *    perfil completo del negocio. Misma ruta que se usa al hacer click en
 *    un card del feed.
 *  - Click en "Ver todos los resultados" → cierra overlay; el feed in-page
 *    ya está filtrado por `useSearchStore.query`.
 *
 * Búsqueda contra: nombre del negocio, nombre de la sucursal, categoría
 * padre, subcategorías, dirección y ciudad. Mismo patrón que el filtro
 * in-memory existente en `PaginaNegocios.tsx`.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§P5 — patrón replicado).
 *
 * Ubicación: apps/web/src/components/negocios/OverlayBuscadorNegocios.tsx
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, ArrowUpRight, Store } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';
import { useSearchStore } from '../../stores/useSearchStore';
import { useNegociosLista } from '../../hooks/queries/useNegocios';
import {
    obtenerBusquedasRecientes,
    quitarBusquedaReciente,
    borrarBusquedasRecientes,
    agregarBusquedaReciente,
} from '../../utils/busquedasRecientes';
import { normalizarTexto } from '../../utils/normalizarTexto';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function OverlayBuscadorNegocios() {
    const location = useLocation();
    const navigate = useNavigate();

    const query = useSearchStore((s) => s.query);
    const buscadorAbierto = useSearchStore((s) => s.buscadorAbierto);
    const cerrarBuscador = useSearchStore((s) => s.cerrarBuscador);
    const setQuery = useSearchStore((s) => s.setQuery);

    const [recientesRev, setRecientesRev] = useState(0);
    const recientes = obtenerBusquedasRecientes('negocios');
    void recientesRev;

    // ─── Visibilidad: solo en rutas /negocios* ───────────────────────────────
    const enNegocios = location.pathname.startsWith('/negocios');
    const debeMostrar = enNegocios && (buscadorAbierto || query.length >= 1);

    // ─── Datos: lista completa de negocios (React Query cachea) ─────────────
    const { data: negocios = [] } = useNegociosLista();

    // ─── Filtro in-memory contra el query ────────────────────────────────────
    // Accent-insensitive: `normalizarTexto` aplica NFD + quita diacríticos a
    // ambos lados, así "panaderia" matchea "Panadería" (y viceversa).
    //
    // Cobertura idéntica al backend (`negocios.service.ts` filtro `busqueda`):
    // nombre del negocio, nombre de la sucursal, dirección, ciudad, todas las
    // subcategorías y todas las categorías padre del negocio.
    const sugerencias = useMemo(() => {
        const q = normalizarTexto(query.trim());
        if (q.length < 2) return [];
        return negocios
            .filter((n) => {
                const nombreNegocio = normalizarTexto(n.negocioNombre || '');
                const nombreSucursal = normalizarTexto(n.sucursalNombre || '');
                // Concatena TODAS las subcategorías + sus categorías padre
                // para no perder coincidencias en negocios multi-categoría.
                const taxonomia = normalizarTexto(
                    (n.categorias || [])
                        .map((cat) => `${cat.nombre || ''} ${cat.categoria?.nombre || ''}`)
                        .join(' '),
                );
                const direccion = normalizarTexto(n.direccion || '');
                const ciudad = normalizarTexto(n.ciudad || '');
                return (
                    nombreNegocio.includes(q) ||
                    nombreSucursal.includes(q) ||
                    taxonomia.includes(q) ||
                    direccion.includes(q) ||
                    ciudad.includes(q)
                );
            })
            .slice(0, 5);
    }, [query, negocios]);

    // ─── Cerrar con Escape ───────────────────────────────────────────────────
    useEffect(() => {
        if (!debeMostrar) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') cerrarBuscador();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [debeMostrar, cerrarBuscador]);

    if (!debeMostrar) return null;

    const escribiendo = query.trim().length >= 2;

    const handleClickSugerencia = (sucursalId: string) => {
        agregarBusquedaReciente(query.trim(), 'negocios');
        setRecientesRev((v) => v + 1);
        cerrarBuscador();
        // Abre el perfil completo del negocio — misma ruta que el click en
        // un card del feed.
        navigate(`/negocios/${sucursalId}`);
    };

    // Click en chip reciente: rellena el query (dispara las sugerencias en
    // vivo) sin cerrar el overlay — el usuario decide cuál sugerencia abrir.
    const seleccionarTerminoReciente = (termino: string) => {
        const limpio = termino.trim();
        if (limpio.length < 2) return;
        agregarBusquedaReciente(limpio, 'negocios');
        setRecientesRev((v) => v + 1);
        setQuery(limpio);
    };

    return (
        <div
            data-testid="overlay-buscador-negocios"
            className="fixed inset-0 z-30 bg-black/30"
            onClick={cerrarBuscador}
            role="dialog"
            aria-modal="true"
            aria-label="Buscador de Negocios"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="mx-auto mt-20 max-h-[75vh] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl lg:mt-24"
            >
                {/* ─── Estado vacío: solo recientes + hint ──────────────── */}
                {!escribiendo && (
                    <div className="space-y-5 p-4">
                        {recientes.length > 0 && (
                            <section data-testid="seccion-busquedas-recientes-negocios">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                        <Clock className="h-4 w-4" strokeWidth={2} />
                                        Búsquedas recientes
                                    </h3>
                                    <button
                                        data-testid="btn-borrar-recientes-negocios"
                                        onClick={() => {
                                            borrarBusquedasRecientes('negocios');
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
                                            onClick={() => seleccionarTerminoReciente(termino)}
                                            onQuitar={() => {
                                                quitarBusquedaReciente(termino, 'negocios');
                                                setRecientesRev((v) => v + 1);
                                            }}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {recientes.length === 0 && (
                            <div className="py-6 text-center">
                                <Search
                                    className="mx-auto mb-2 h-8 w-8 text-slate-300"
                                    strokeWidth={1.5}
                                />
                                <p className="text-sm text-slate-500">
                                    Empieza a escribir para buscar negocios
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Sugerencias en vivo ─────────────────────────────── */}
                {escribiendo && (
                    <section data-testid="seccion-sugerencias-negocios" className="p-2">
                        <h3 className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Resultados
                        </h3>
                        {sugerencias.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-slate-500">
                                No hay negocios para &quot;{query.trim()}&quot;.
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {sugerencias.map((negocio, idx) => {
                                    const categoriaPadre =
                                        negocio.categorias?.[0]?.categoria?.nombre || '';
                                    // Etiqueta de sucursal: solo si el negocio
                                    // tiene >1 sucursal (mismo patrón aplicado
                                    // en CardNegocio / PaginaPerfilNegocio /
                                    // popup del mapa). La principal se rotula
                                    // como "Matriz", las demás muestran su
                                    // nombre real.
                                    const tieneVariasSucursales =
                                        (negocio.totalSucursales ?? 1) > 1;
                                    const etiquetaSucursal = tieneVariasSucursales
                                        ? negocio.esPrincipal
                                            ? 'Matriz'
                                            : negocio.sucursalNombre
                                        : null;
                                    return (
                                        <li key={negocio.sucursalId}>
                                            <button
                                                data-testid={`sugerencia-negocio-${idx}`}
                                                onClick={() =>
                                                    handleClickSugerencia(negocio.sucursalId)
                                                }
                                                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-100"
                                            >
                                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                                    {negocio.logoUrl ? (
                                                        <img
                                                            src={negocio.logoUrl}
                                                            alt={negocio.negocioNombre}
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-blue-500">
                                                            <Store
                                                                className="h-5 w-5"
                                                                strokeWidth={2}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex min-w-0 flex-1 flex-col">
                                                    <span className="truncate text-sm font-semibold text-slate-900">
                                                        {negocio.negocioNombre}
                                                    </span>
                                                    <span className="truncate text-sm">
                                                        {categoriaPadre && (
                                                            <span className="font-bold text-blue-700">
                                                                {categoriaPadre}
                                                            </span>
                                                        )}
                                                        {etiquetaSucursal && (
                                                            <span className="ml-2 font-normal text-slate-600">
                                                                · {etiquetaSucursal}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="truncate text-xs text-slate-400">
                                                        {negocio.ciudad}
                                                    </span>
                                                </div>
                                                <ArrowUpRight
                                                    className="h-4 w-4 shrink-0 text-slate-400"
                                                    strokeWidth={2}
                                                />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// CHIP DE BÚSQUEDA RECIENTE
// =============================================================================

interface ChipRecienteProps {
    termino: string;
    onClick: () => void;
    onQuitar: () => void;
}

function ChipReciente({ termino, onClick, onQuitar }: ChipRecienteProps) {
    return (
        <span
            data-testid={`chip-reciente-negocios-${termino}`}
            className="group inline-flex items-center gap-1.5 rounded-full border-2 border-slate-200 bg-white pl-3 pr-1 text-sm text-slate-700 hover:border-blue-400"
        >
            <button
                onClick={onClick}
                className="cursor-pointer py-1 font-medium hover:text-slate-900"
            >
                {termino}
            </button>
            <button
                data-testid={`btn-quitar-reciente-negocios-${termino}`}
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

export default OverlayBuscadorNegocios;
