/**
 * CardVacanteMobile.tsx
 * =======================
 * Card de vacante para vista móvil (< lg). Clickeable; abre el detalle inline.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/componentes/CardVacanteMobile.tsx
 */

import { Briefcase, MapPin, MessageCircle } from 'lucide-react';
import {
    estadoUiVacante,
    formatearPrecioVacante,
} from './helpers';
import { PillTipoEmpleo, PillModalidad, PillEstadoVacante } from './VacanteAtoms';
import type { Vacante } from '../../../../../types/servicios';

interface CardVacanteMobileProps {
    vacante: Vacante;
    onClick: () => void;
}

export function CardVacanteMobile({ vacante, onClick }: CardVacanteMobileProps) {
    const estadoUi = estadoUiVacante(vacante.estado, vacante.expiraAt);
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left bg-white border border-slate-200 rounded-2xl p-3.5 mb-2.5 shadow-sm"
            data-testid={`card-vacante-${vacante.id}`}
        >
            <div className="flex items-start justify-between gap-2.5">
                <div className="min-w-0 flex-1 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 grid place-items-center shrink-0">
                        <Briefcase className="w-[18px] h-[18px]" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[15px] font-bold leading-tight text-slate-900">
                            {vacante.titulo}
                        </div>
                        <div className="flex items-center gap-1 text-[12.5px] text-slate-500 mt-0.5 font-medium">
                            <MapPin className="w-3 h-3" strokeWidth={1.75} />
                            <span className="truncate">
                                {vacante.sucursalNombre ?? 'Sin sucursal'}
                            </span>
                        </div>
                    </div>
                </div>
                <PillEstadoVacante estado={estadoUi} />
            </div>
            <div className="flex gap-1.5 flex-wrap my-2.5">
                {vacante.tipoEmpleo && (
                    <PillTipoEmpleo tipoEmpleo={vacante.tipoEmpleo} />
                )}
                <PillModalidad modalidad={vacante.modalidad} />
            </div>
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-900 tabular-nums whitespace-nowrap">
                    {formatearPrecioVacante(vacante.precio, vacante.tipoEmpleo)}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-[12.5px] font-bold">
                    <MessageCircle className="w-3 h-3" strokeWidth={2} />
                    {vacante.totalMensajes}
                </span>
            </div>
        </button>
    );
}
