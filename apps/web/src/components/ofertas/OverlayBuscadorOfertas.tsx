/**
 * OverlayBuscadorOfertas.tsx
 * ============================
 * Overlay del buscador de la sección Ofertas. Clon adaptado del
 * `OverlayBuscadorMarketplace` con identidad ámbar y comportamiento sobrio:
 *
 *  - SIN sección de populares (la sección Ofertas no calcula populares para
 *    no pesar al backend con un dataset chico — ver §racional en
 *    `services/ofertas/buscador.ts`).
 *  - Estado vacío: solo "Búsquedas recientes" + tip de empezar a escribir.
 *  - Mientras escribe (debounce 300ms): cards con preview (`titulo +
 *    tipo+valor del descuento + negocio + ciudad`).
 *  - Click en sugerencia → cierra overlay + `navigate('/ofertas?oferta=:id')`.
 *    PaginaOfertas reacciona al search param y abre `ModalOfertaDetalle`.
 *  - Click en "Ver todos los resultados" → cierra overlay; el feed ya está
 *    filtrado en vivo por `useSearchStore.query`. Sin página de resultados
 *    dedicada (la lista in-page del feed sirve como tal).
 *
 * IMPORTANTE: el input físico vive en el Navbar global (desktop) o inline
 * en el header de Ofertas (móvil). Este componente solo aporta contenido.
 *
 * Visibilidad: solo rutas que empiecen con `/ofertas`. Aparece cuando
 * `buscadorAbierto === true` o cuando `query.length >= 1`.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§P5 — patrón replicado).
 *
 * Ubicación: apps/web/src/components/ofertas/OverlayBuscadorOfertas.tsx
 */

import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X, ArrowUpRight, Tag } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../config/iconos';
import { useSearchStore } from '../../stores/useSearchStore';
import { useGpsStore } from '../../stores/useGpsStore';
import { useBuscadorOfertasSugerencias } from '../../hooks/queries/useOfertasFeed';
import {
    obtenerBusquedasRecientes,
    quitarBusquedaReciente,
    borrarBusquedasRecientes,
    agregarBusquedaReciente,
} from '../../utils/busquedasRecientes';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;

// =============================================================================
// HELPERS DE FORMATO DEL DESCUENTO
// =============================================================================

/** Resumen humano del descuento. Igual al patrón usado en cards. */
function formatearDescuento(tipo: string, valor: number): string {
    if (tipo === 'porcentaje') return `${valor}% OFF`;
    if (tipo === 'monto_fijo') return `-$${valor.toLocaleString('es-MX')}`;
    if (tipo === '2x1') return '2x1';
    if (tipo === '3x2') return '3x2';
    if (tipo === 'precio_fijo') return `$${valor.toLocaleString('es-MX')}`;
    return tipo.replace('_', ' ');
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function OverlayBuscadorOfertas() {
    const location = useLocation();
    const navigate = useNavigate();

    const query = useSearchStore((s) => s.query);
    const buscadorAbierto = useSearchStore((s) => s.buscadorAbierto);
    const cerrarBuscador = useSearchStore((s) => s.cerrarBuscador);
    const setQuery = useSearchStore((s) => s.setQuery);

    const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? null);

    const [recientesRev, setRecientesRev] = useState(0);
    const recientes = obtenerBusquedasRecientes('ofertas');
    void recientesRev;

    // ─── Visibilidad: solo en rutas /ofertas* ────────────────────────────────
    const enOfertas = location.pathname.startsWith('/ofertas');
    const debeMostrar = enOfertas && (buscadorAbierto || query.length >= 1);

    // ─── Hook de datos ───────────────────────────────────────────────────────
    const { data: sugerencias = [], isFetching: cargandoSug } =
        useBuscadorOfertasSugerencias(query, ciudad);

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

    const handleClickSugerencia = (ofertaId: string) => {
        agregarBusquedaReciente(query.trim(), 'ofertas');
        setRecientesRev((v) => v + 1);
        cerrarBuscador();
        navigate(`/ofertas?oferta=${ofertaId}`);
    };

    // Click en chip de búsqueda reciente: rellena el query (dispara
    // sugerencias en vivo) sin cerrar el overlay — el usuario decide cuál
    // sugerencia abrir.
    const seleccionarTerminoReciente = (termino: string) => {
        const limpio = termino.trim();
        if (limpio.length < 2) return;
        agregarBusquedaReciente(limpio, 'ofertas');
        setRecientesRev((v) => v + 1);
        setQuery(limpio);
    };

    return (
        <div
            data-testid="overlay-buscador-ofertas"
            className="fixed inset-0 z-30 bg-black/30"
            onClick={cerrarBuscador}
            role="dialog"
            aria-modal="true"
            aria-label="Buscador de Ofertas"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="mx-auto mt-20 max-h-[75vh] max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl lg:mt-24"
            >
                {/* ─── Estado vacío: solo recientes + hint ──────────────── */}
                {!escribiendo && (
                    <div className="space-y-5 p-4">
                        {recientes.length > 0 && (
                            <section data-testid="seccion-busquedas-recientes-ofertas">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                        <Clock className="h-4 w-4" strokeWidth={2} />
                                        Búsquedas recientes
                                    </h3>
                                    <button
                                        data-testid="btn-borrar-recientes-ofertas"
                                        onClick={() => {
                                            borrarBusquedasRecientes('ofertas');
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
                                                quitarBusquedaReciente(termino, 'ofertas');
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
                                    Empieza a escribir para buscar ofertas en{' '}
                                    {ciudad ?? 'tu ciudad'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Sugerencias en vivo ─────────────────────────────── */}
                {escribiendo && (
                    <section data-testid="seccion-sugerencias-ofertas" className="p-2">
                        <h3 className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Resultados
                        </h3>
                        {cargandoSug && sugerencias.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-slate-500">
                                Buscando...
                            </div>
                        ) : sugerencias.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-slate-500">
                                No hay ofertas para &quot;{query.trim()}&quot;.
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {sugerencias.map((oferta, idx) => (
                                    <li key={oferta.ofertaId}>
                                        <button
                                            data-testid={`sugerencia-oferta-${idx}`}
                                            onClick={() => handleClickSugerencia(oferta.ofertaId)}
                                            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-100"
                                        >
                                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                                {oferta.imagen ? (
                                                    <img
                                                        src={oferta.imagen}
                                                        alt={oferta.titulo}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-amber-500">
                                                        <Tag className="h-5 w-5" strokeWidth={2} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex min-w-0 flex-1 flex-col">
                                                <span className="truncate text-sm font-semibold text-slate-900">
                                                    {oferta.titulo}
                                                </span>
                                                <span className="truncate text-sm">
                                                    <span className="font-bold text-amber-700">
                                                        {formatearDescuento(oferta.tipo, oferta.valor)}
                                                    </span>
                                                    <span className="ml-2 font-normal text-slate-600">
                                                        · {oferta.negocioNombre}
                                                    </span>
                                                </span>
                                                <span className="truncate text-xs text-slate-400">
                                                    {oferta.ciudad}
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
            data-testid={`chip-reciente-ofertas-${termino}`}
            className="group inline-flex items-center gap-1.5 rounded-full border-2 border-slate-200 bg-white pl-3 pr-1 text-sm text-slate-700 hover:border-amber-400"
        >
            <button
                onClick={onClick}
                className="cursor-pointer py-1 font-medium hover:text-slate-900"
            >
                {termino}
            </button>
            <button
                data-testid={`btn-quitar-reciente-ofertas-${termino}`}
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

export default OverlayBuscadorOfertas;
