/**
 * TablaVacantes.tsx
 * ==================
 * Tabla densa B2B (desktop) de Vacantes con filas clickeables.
 *
 * Diseñada para coexistir visualmente con Promociones, Empleados y Sucursales.
 * Cada acción (Editar, Pausar/Reactivar, Eliminar) es un botón ícono con tooltip.
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
                className="bg-white border border-slate-200 rounded-2xl px-5 py-10 text-center text-slate-500 text-sm font-medium"
                data-testid="tabla-vacantes-vacia"
            >
                No hay vacantes que coincidan con el filtro.
            </div>
        );
    }

    return (
        <div
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
            data-testid="tabla-vacantes-desktop"
        >
            {/* Header */}
            <div
                className="grid items-center gap-x-4 px-5 py-3 bg-slate-900 text-white text-[11px] font-semibold tracking-wider uppercase"
                style={{
                    gridTemplateColumns: '2.4fr 1.1fr 1fr 1.2fr 0.9fr 1fr 1fr 0.9fr',
                }}
            >
                <span>Vacante</span>
                <span>Tipo</span>
                <span>Modalidad</span>
                <span>Salario</span>
                <span className="text-center">Chats</span>
                <span>Estado</span>
                <span>Vigencia</span>
                <span className="text-right">Acciones</span>
            </div>

            {/* Body */}
            {vacantes.map((vacante, idx) => {
                const estadoUi = estadoUiVacante(vacante.estado, vacante.expiraAt);
                const dias = diasRestantesVacante(vacante.expiraAt);
                return (
                    <FilaVacante
                        key={vacante.id}
                        vacante={vacante}
                        estadoUi={estadoUi}
                        diasRestantes={dias}
                        zebra={idx % 2 === 1}
                        onVer={() => onVer(vacante)}
                        onEditar={() => onEditar(vacante)}
                        onPausar={() => onPausar(vacante)}
                        onReactivar={() => onReactivar(vacante)}
                        onEliminar={() => onEliminar(vacante)}
                    />
                );
            })}
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
    zebra: boolean;
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
    zebra,
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
                'grid items-center gap-x-4 px-5 py-3 border-t border-slate-200 hover:bg-slate-50 transition-colors lg:cursor-pointer ' +
                (zebra ? 'bg-slate-50/40' : 'bg-white')
            }
            style={{
                gridTemplateColumns: '2.4fr 1.1fr 1fr 1.2fr 0.9fr 1fr 1fr 0.9fr',
            }}
            onClick={onVer}
            data-testid={`fila-vacante-${vacante.id}`}
        >
            {/* Col 1 — Vacante */}
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 grid place-items-center shrink-0">
                    <Briefcase className="w-[18px] h-[18px]" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                    <div className="text-sm lg:text-base font-semibold text-slate-900 truncate">
                        {vacante.titulo}
                    </div>
                    <div className="flex items-center gap-1.5 text-[12.5px] text-slate-500 mt-0.5 font-medium">
                        <MapPin className="w-3 h-3" strokeWidth={1.75} />
                        <span className="truncate">
                            {vacante.sucursalNombre ?? 'Sin sucursal'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Col 2 — Tipo */}
            <div className="flex items-center">
                {vacante.tipoEmpleo && (
                    <PillTipoEmpleo tipoEmpleo={vacante.tipoEmpleo} />
                )}
            </div>

            {/* Col 3 — Modalidad */}
            <div className="flex items-center">
                <PillModalidad modalidad={vacante.modalidad} />
            </div>

            {/* Col 4 — Salario */}
            <span className="text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">
                {formatearPrecioVacante(vacante.precio, vacante.tipoEmpleo)}
            </span>

            {/* Col 5 — Chats */}
            <span className="text-center text-sm font-bold tabular-nums text-slate-900">
                {vacante.totalMensajes}
            </span>

            {/* Col 6 — Estado */}
            <div className="flex items-center">
                <PillEstadoVacante estado={estadoUi} />
            </div>

            {/* Col 7 — Vigencia */}
            <span className="text-[12.5px] text-slate-600 tabular-nums font-medium">
                {estadoUi === 'cerrada' ? (
                    <>
                        Cerrada
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                            ya no recibe candidatos
                        </span>
                    </>
                ) : (
                    <>
                        {diasRestantes}d restantes
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                            auto-pausa al expirar
                        </span>
                    </>
                )}
            </span>

            {/* Col 8 — Acciones */}
            <div className="flex justify-end gap-1.5">
                <Tooltip text="Ver detalle">
                    <button
                        type="button"
                        onClick={(ev) => stopPropagation(ev, onVer)}
                        className="w-[30px] h-[30px] rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-600 lg:cursor-pointer hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        data-testid={`btn-ver-${vacante.id}`}
                    >
                        <Eye className="w-[15px] h-[15px]" strokeWidth={1.75} />
                    </button>
                </Tooltip>
                <Tooltip text="Editar">
                    <button
                        type="button"
                        onClick={(ev) => stopPropagation(ev, onEditar)}
                        className="w-[30px] h-[30px] rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-600 lg:cursor-pointer hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        data-testid={`btn-editar-${vacante.id}`}
                    >
                        <Pencil className="w-[15px] h-[15px]" strokeWidth={1.75} />
                    </button>
                </Tooltip>
                {vacante.estado === 'pausada' && (
                    <Tooltip text="Reactivar">
                        <button
                            type="button"
                            onClick={(ev) => stopPropagation(ev, onReactivar)}
                            className="w-[30px] h-[30px] rounded-lg border border-slate-200 bg-white grid place-items-center text-emerald-600 lg:cursor-pointer hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                            data-testid={`btn-reactivar-${vacante.id}`}
                        >
                            <PlayCircle className="w-[15px] h-[15px]" strokeWidth={1.75} />
                        </button>
                    </Tooltip>
                )}
                {vacante.estado === 'activa' && (
                    <Tooltip text="Pausar">
                        <button
                            type="button"
                            onClick={(ev) => stopPropagation(ev, onPausar)}
                            className="w-[30px] h-[30px] rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-600 lg:cursor-pointer hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            data-testid={`btn-pausar-${vacante.id}`}
                        >
                            <PauseCircle className="w-[15px] h-[15px]" strokeWidth={1.75} />
                        </button>
                    </Tooltip>
                )}
                <Tooltip text="Eliminar">
                    <button
                        type="button"
                        onClick={(ev) => stopPropagation(ev, onEliminar)}
                        className="w-[30px] h-[30px] rounded-lg border border-slate-200 bg-white grid place-items-center text-slate-600 lg:cursor-pointer hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                        data-testid={`btn-eliminar-${vacante.id}`}
                    >
                        <Trash2 className="w-[15px] h-[15px]" strokeWidth={1.75} />
                    </button>
                </Tooltip>
            </div>
        </div>
    );
}
