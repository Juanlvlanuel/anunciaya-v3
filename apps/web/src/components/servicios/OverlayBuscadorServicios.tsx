/**
 * OverlayBuscadorServicios.tsx
 * =============================
 * Overlay del buscador de la sección Servicios. Clon adaptado del
 * `OverlayBuscadorOfertas` con identidad sky y comportamiento sobrio:
 *
 *  - SIN sección de populares (dataset chico — ver §racional en
 *    `services/servicios/buscador.ts`).
 *  - Estado vacío: solo "Búsquedas recientes" + tip de empezar a escribir.
 *  - Mientras escribe (debounce 300ms): cards con preview (título + precio +
 *    modalidad + oferente + ciudad).
 *  - Click en sugerencia → cierra overlay + navega a `/servicios/:id`.
 *  - Click fuera o `Escape` → cierra el overlay.
 *
 * IMPORTANTE: el input físico vive en el Navbar global (desktop) o inline en
 * el header de Servicios (móvil). Este componente solo aporta contenido.
 *
 * Visibilidad: solo rutas que empiecen con `/servicios`. Aparece cuando
 * `buscadorAbierto === true` o cuando `query.length >= 1`.
 *
 * Doc: docs/estandares/PATRON_BUSCADOR_SECCION.md.
 *
 * Ubicación: apps/web/src/components/servicios/OverlayBuscadorServicios.tsx
 */

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, Wrench, X } from 'lucide-react';
import { Icon, type IconProps } from '@/config/iconos';
import { ICONOS } from '../../config/iconos';
import { useGpsStore } from '../../stores/useGpsStore';
import { useSearchStore } from '../../stores/useSearchStore';
import { useBuscadorServiciosSugerencias } from '../../hooks/queries/useServicios';
import {
    agregarBusquedaReciente,
    borrarBusquedasRecientes,
    obtenerBusquedasRecientes,
    quitarBusquedaReciente,
} from '../../utils/busquedasRecientes';
import {
    formatearPrecioServicio,
    modalidadLabel,
    obtenerFotoPortada,
} from '../../utils/servicios';
import { OverlayBuscadorContainer } from '../ui/OverlayBuscadorContainer';

type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function OverlayBuscadorServicios() {
    const location = useLocation();
    const navigate = useNavigate();

    const query = useSearchStore((s) => s.query);
    const buscadorAbierto = useSearchStore((s) => s.buscadorAbierto);
    const cerrarBuscador = useSearchStore((s) => s.cerrarBuscador);
    const setQuery = useSearchStore((s) => s.setQuery);

    const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? null);

    const [recientesRev, setRecientesRev] = useState(0);
    const recientes = obtenerBusquedasRecientes('servicios');
    void recientesRev;

    // ─── Visibilidad: solo en rutas /servicios* ──────────────────────────────
    const enServicios = location.pathname.startsWith('/servicios');
    const debeMostrar = enServicios && (buscadorAbierto || query.length >= 1);

    // ─── Hook de datos ───────────────────────────────────────────────────────
    const { data: sugerencias = [], isFetching: cargandoSug } =
        useBuscadorServiciosSugerencias(query, ciudad);

    const escribiendo = query.trim().length >= 2;

    const handleClickSugerencia = (publicacionId: string) => {
        agregarBusquedaReciente(query.trim(), 'servicios');
        setRecientesRev((v) => v + 1);
        cerrarBuscador();
        // `replace: true` evita dejar entrada fantasma del overlay en el
        // history (ver OverlayBuscadorNegocios).
        navigate(`/servicios/${publicacionId}`, { replace: true });
    };

    const seleccionarTerminoReciente = (termino: string) => {
        const limpio = termino.trim();
        if (limpio.length < 2) return;
        agregarBusquedaReciente(limpio, 'servicios');
        setRecientesRev((v) => v + 1);
        setQuery(limpio);
    };

    return (
        <OverlayBuscadorContainer
            abierto={debeMostrar}
            onCerrar={cerrarBuscador}
            discriminador="_buscadorServicios"
            ariaLabel="Buscador de Servicios"
            testId="overlay-buscador-servicios"
        >
                {/* ─── Estado vacío: solo recientes + hint ──────────────── */}
                {!escribiendo && (
                    <div className="space-y-5 p-4">
                        {recientes.length > 0 && (
                            <section data-testid="seccion-busquedas-recientes-servicios">
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                                        <Clock className="h-4 w-4" strokeWidth={2} />
                                        Búsquedas recientes
                                    </h3>
                                    <button
                                        data-testid="btn-borrar-recientes-servicios"
                                        onClick={() => {
                                            borrarBusquedasRecientes('servicios');
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
                                                quitarBusquedaReciente(termino, 'servicios');
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
                                    Empieza a escribir para buscar servicios en{' '}
                                    {ciudad ?? 'tu ciudad'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── Sugerencias en vivo ─────────────────────────────── */}
                {escribiendo && (
                    <section
                        data-testid="seccion-sugerencias-servicios"
                        className="p-2"
                    >
                        <h3 className="px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Resultados
                        </h3>
                        {cargandoSug && sugerencias.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-slate-500">
                                Buscando...
                            </div>
                        ) : sugerencias.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-slate-500">
                                No hay servicios para &quot;{query.trim()}&quot;.
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {sugerencias.map((sug, idx) => {
                                    const fotoUrl = obtenerFotoPortada(
                                        sug.fotos,
                                        sug.fotoPortadaIndex,
                                    );
                                    return (
                                        <li key={sug.publicacionId}>
                                            <button
                                                data-testid={`sugerencia-servicio-${idx}`}
                                                onClick={() =>
                                                    handleClickSugerencia(
                                                        sug.publicacionId,
                                                    )
                                                }
                                                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-100"
                                            >
                                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                                    {fotoUrl ? (
                                                        <img
                                                            src={fotoUrl}
                                                            alt={sug.titulo}
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className="flex h-full w-full items-center justify-center text-sky-500">
                                                            <Wrench
                                                                className="h-5 w-5"
                                                                strokeWidth={2}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex min-w-0 flex-1 flex-col">
                                                    <span className="flex items-center gap-2 min-w-0">
                                                        <span className="truncate text-base font-semibold text-slate-900">
                                                            {sug.titulo}
                                                        </span>
                                                        <span className="shrink-0 text-sm font-bold text-sky-700">
                                                            · {formatearPrecioServicio(sug.precio, { esVacante: !!sug.negocioNombre })}
                                                        </span>
                                                    </span>
                                                    {(() => {
                                                        // Quién publica:
                                                        //  - Si hay negocio asociado (vacante-empresa) → "Negocio | Sucursal"
                                                        //    (la sucursal solo aplica cuando el negocio tiene más de una).
                                                        //  - Si no hay negocio → persona ofreciendo/solicitando.
                                                        if (sug.negocioNombre) {
                                                            const etiquetaSucursal = sug.totalSucursales > 1
                                                                ? (sug.esPrincipal ? 'Matriz' : sug.sucursalNombre)
                                                                : null;
                                                            return (
                                                                <span className="flex items-center gap-2 truncate text-sm">
                                                                    <span className="truncate font-medium text-slate-600">
                                                                        {sug.negocioNombre}
                                                                    </span>
                                                                    {etiquetaSucursal && (
                                                                        <>
                                                                            <span className="h-3.5 w-px shrink-0 bg-slate-300" />
                                                                            <span className="truncate font-medium text-slate-600">
                                                                                {etiquetaSucursal}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                    <span className="shrink-0 font-medium text-slate-500">
                                                                        · {modalidadLabel(sug.modalidad)}
                                                                    </span>
                                                                </span>
                                                            );
                                                        }
                                                        const nombrePersona = `${sug.oferenteNombre}${sug.oferenteApellidos ? ` ${sug.oferenteApellidos}` : ''}`.trim();
                                                        return (
                                                            <span className="flex items-center gap-2 truncate text-sm">
                                                                <span className="truncate font-medium text-slate-600">
                                                                    {nombrePersona}
                                                                </span>
                                                                <span className="shrink-0 font-medium text-slate-500">
                                                                    · {modalidadLabel(sug.modalidad)}
                                                                </span>
                                                            </span>
                                                        );
                                                    })()}
                                                    <span className="truncate text-xs font-medium text-slate-600">
                                                        {sug.ciudad}
                                                    </span>
                                                </div>
                                                <ArrowUpRight
                                                    className="h-5 w-5 shrink-0 text-slate-400"
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
        </OverlayBuscadorContainer>
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
            data-testid={`chip-reciente-servicios-${termino}`}
            className="group inline-flex items-center gap-1.5 rounded-full border-2 border-slate-200 bg-white pl-3 pr-1 text-sm text-slate-700 hover:border-sky-400"
        >
            <button
                onClick={onClick}
                className="cursor-pointer py-1 font-medium hover:text-slate-900"
            >
                {termino}
            </button>
            <button
                data-testid={`btn-quitar-reciente-servicios-${termino}`}
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

export default OverlayBuscadorServicios;
