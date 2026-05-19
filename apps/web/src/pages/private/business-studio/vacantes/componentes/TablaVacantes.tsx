/**
 * TablaVacantes.tsx
 * ==================
 * Tabla densa B2B (desktop) de Vacantes con filas clickeables.
 *
 * Diseñada para coexistir visualmente con Empleados, Clientes y Promociones —
 * mismo header oscuro con gradient BS, mismo zebra slate-100, mismos botones
 * inline de acción (TC-1D) sin border ni bg, color directo al semántico.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/componentes/TablaVacantes.tsx
 */

import { Briefcase, Eye, Pencil, PauseCircle, PlayCircle, Trash2, MapPin } from 'lucide-react';
import Tooltip from '../../../../../components/ui/Tooltip';
import {
    diasRestantesVacante,
    estadoUiVacante,
    formatearPrecioVacante,
    type EstadoVacanteUI,
} from './helpers';
import { PillTipoEmpleo, PillModalidad, PillEstadoVacante } from './VacanteAtoms';
import type { Vacante } from '../../../../../types/servicios';

interface TablaVacantesProps {
    vacantes: Vacante[];
    onVer: (vacante: Vacante) => void;
    onEditar: (vacante: Vacante) => void;
    onPausar: (vacante: Vacante) => void;
    onReactivar: (vacante: Vacante) => void;
    onEliminar: (vacante: Vacante) => void;
}

const COLUMNAS = '2.1fr 1.1fr 1fr 1.2fr 0.9fr 1fr 1fr 0.9fr';

export function TablaVacantes({
    vacantes,
    onVer,
    onEditar,
    onPausar,
    onReactivar,
    onEliminar,
}: TablaVacantesProps) {
    if (vacantes.length === 0) {
        return (
            <div
                className="bg-white border-2 border-slate-300 rounded-xl px-5 py-10 text-center text-slate-600 text-sm font-medium"
                data-testid="tabla-vacantes-vacia"
            >
                No hay vacantes que coincidan con el filtro.
            </div>
        );
    }

    return (
        <div
            className="rounded-xl overflow-hidden border-2 border-slate-300"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            data-testid="tabla-vacantes-desktop"
        >
            {/* Header con gradient BS (TC-9) */}
            <div
                className="grid items-center gap-x-4 px-4 lg:px-3 2xl:px-5 py-2 h-12"
                style={{
                    gridTemplateColumns: COLUMNAS,
                    background: 'linear-gradient(135deg, #1e293b, #334155)',
                }}
            >
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider ">
                    Vacante
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider ">
                    Tipo
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider mr-15">
                    Modalidad
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider ml-4">
                    Salario
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider ml-4">
                    Chats
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider ml-1">
                    Estado
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider ">
                    Vigencia
                </span>
                <span className="text-[11px] 2xl:text-sm font-semibold text-white uppercase tracking-wider text-right">
                    Acciones
                </span>
            </div>

            {/* Body */}
            <div className="bg-white">
                {vacantes.map((vacante, idx) => {
                    const estadoUi = estadoUiVacante(vacante.estado, vacante.expiraAt);
                    const dias = diasRestantesVacante(vacante.expiraAt);
                    return (
                        <FilaVacante
                            key={vacante.id}
                            vacante={vacante}
                            estadoUi={estadoUi}
                            diasRestantes={dias}
                            indice={idx}
                            onVer={() => onVer(vacante)}
                            onEditar={() => onEditar(vacante)}
                            onPausar={() => onPausar(vacante)}
                            onReactivar={() => onReactivar(vacante)}
                            onEliminar={() => onEliminar(vacante)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

// =============================================================================
// FILA
// =============================================================================

interface FilaVacanteProps {
    vacante: Vacante;
    estadoUi: EstadoVacanteUI;
    diasRestantes: number;
    indice: number;
    onVer: () => void;
    onEditar: () => void;
    onPausar: () => void;
    onReactivar: () => void;
    onEliminar: () => void;
}

function FilaVacante({
    vacante,
    estadoUi,
    diasRestantes,
    indice,
    onVer,
    onEditar,
    onPausar,
    onReactivar,
    onEliminar,
}: FilaVacanteProps) {
    const stopPropagation = (
        ev: React.MouseEvent<HTMLButtonElement>,
        handler: () => void,
    ) => {
        ev.stopPropagation();
        handler();
    };

    return (
        <div
            className={
                'grid items-center gap-x-4 px-4 lg:px-3 2xl:px-5 py-2.5 lg:py-2 2xl:py-2.5 ' +
                'text-sm lg:text-xs 2xl:text-sm ' +
                'border-b border-slate-300 lg:cursor-pointer hover:bg-slate-200 ' +
                (indice % 2 === 0 ? 'bg-white' : 'bg-slate-100')
            }
            style={{ gridTemplateColumns: COLUMNAS }}
            onClick={onVer}
            data-testid={`fila-vacante-${vacante.id}`}
        >
            {/* Col 1 — Vacante */}
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-lg bg-sky-100 text-sky-700 grid place-items-center shrink-0">
                    <Briefcase
                        className="w-5 h-5 lg:w-[18px] lg:h-[18px] 2xl:w-5 2xl:h-5"
                        strokeWidth={1.75}
                    />
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">
                        {vacante.titulo}
                    </p>
                    <p className="flex items-center gap-1 text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium truncate mt-0.5">
                        <MapPin className="w-3 h-3 shrink-0" strokeWidth={1.75} />
                        <span className="truncate">
                            {vacante.sucursalNombre ?? 'Sin sucursal'}
                        </span>
                    </p>
                </div>
            </div>

            {/* Col 2 — Tipo */}
            <div className="flex items-center justify-left mr-10">
                {vacante.tipoEmpleo && (
                    <PillTipoEmpleo tipoEmpleo={vacante.tipoEmpleo} />
                )}
            </div>

            {/* Col 3 — Modalidad */}
            <div className="flex items-center justify-center mr-10">
                <PillModalidad modalidad={vacante.modalidad} />
            </div>

            {/* Col 4 — Salario */}
            <div className="text-center font-bold text-slate-900 tabular-nums whitespace-nowrap mr-10">
                {formatearPrecioVacante(vacante.precio, vacante.tipoEmpleo)}
            </div>

            {/* Col 5 — Chats */}
            <div className="text-center font-bold tabular-nums text-slate-900 mr-10">
                {vacante.totalMensajes}
            </div>

            {/* Col 6 — Estado */}
            <div className="flex items-center justify-center mr-10">
                <PillEstadoVacante estado={estadoUi} />
            </div>

            {/* Col 7 — Vigencia */}
            <div className="text-center text-slate-800 tabular-nums font-semibold whitespace-nowrap mr-2">
                {estadoUi === 'cerrada' ? 'Cerrada' : `${diasRestantes}d restantes`}
            </div>

            {/* Col 8 — Acciones (TC-1D: inline, sin border, color semántico directo) */}
            <div className="flex justify-end gap-0.5">
                <Tooltip text="Ver detalle">
                    <button
                        type="button"
                        onClick={(ev) => stopPropagation(ev, onVer)}
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 lg:cursor-pointer"
                        data-testid={`btn-ver-${vacante.id}`}
                    >
                        <Eye className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                    </button>
                </Tooltip>
                <Tooltip text="Editar">
                    <button
                        type="button"
                        onClick={(ev) => stopPropagation(ev, onEditar)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 lg:cursor-pointer"
                        data-testid={`btn-editar-${vacante.id}`}
                    >
                        <Pencil className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                    </button>
                </Tooltip>
                {vacante.estado === 'pausada' && (
                    <Tooltip text="Reactivar">
                        <button
                            type="button"
                            onClick={(ev) => stopPropagation(ev, onReactivar)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 lg:cursor-pointer"
                            data-testid={`btn-reactivar-${vacante.id}`}
                        >
                            <PlayCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                        </button>
                    </Tooltip>
                )}
                {vacante.estado === 'activa' && (
                    <Tooltip text="Pausar">
                        <button
                            type="button"
                            onClick={(ev) => stopPropagation(ev, onPausar)}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 lg:cursor-pointer"
                            data-testid={`btn-pausar-${vacante.id}`}
                        >
                            <PauseCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                        </button>
                    </Tooltip>
                )}
                <Tooltip text="Eliminar">
                    <button
                        type="button"
                        onClick={(ev) => stopPropagation(ev, onEliminar)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 lg:cursor-pointer"
                        data-testid={`btn-eliminar-${vacante.id}`}
                    >
                        <Trash2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}
