/**
 * VacanteAtoms.tsx
 * =================
 * Pills + status atómicos reutilizables del módulo Vacantes.
 * Componentes puros sin estado, sin lógica de negocio.
 *
 * Ubicación: apps/web/src/pages/private/business-studio/vacantes/componentes/VacanteAtoms.tsx
 */

import {
    TIPO_EMPLEO_LABEL,
    MODALIDAD_LABEL,
    type EstadoVacanteUI,
} from './helpers';
import type {
    TipoEmpleo,
    ModalidadServicio,
} from '../../../../../types/servicios';

// =============================================================================
// PILL TIPO DE EMPLEO
// =============================================================================

const COLOR_TIPO_EMPLEO: Record<TipoEmpleo, string> = {
    'tiempo-completo': 'bg-sky-50 text-sky-700 border-sky-200',
    'medio-tiempo': 'bg-violet-50 text-violet-700 border-violet-200',
    'por-proyecto': 'bg-amber-50 text-amber-700 border-amber-200',
    'eventual': 'bg-slate-100 text-slate-700 border-slate-300',
};

export function PillTipoEmpleo({ tipoEmpleo }: { tipoEmpleo: TipoEmpleo }) {
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${COLOR_TIPO_EMPLEO[tipoEmpleo]}`}
        >
            {TIPO_EMPLEO_LABEL[tipoEmpleo]}
        </span>
    );
}

// =============================================================================
// PILL MODALIDAD
// =============================================================================

const COLOR_MODALIDAD: Record<ModalidadServicio, string> = {
    presencial: 'bg-slate-100 text-slate-700 border-slate-300',
    remoto: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    hibrido: 'bg-teal-50 text-teal-700 border-teal-200',
};

export function PillModalidad({ modalidad }: { modalidad: ModalidadServicio }) {
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-wide ${COLOR_MODALIDAD[modalidad]}`}
        >
            {MODALIDAD_LABEL[modalidad]}
        </span>
    );
}

// =============================================================================
// PILL ESTADO (con dot)
// =============================================================================

const COLOR_ESTADO: Record<
    EstadoVacanteUI,
    { wrap: string; dot: string; label: string }
> = {
    activa: {
        wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'Activa',
    },
    pausada: {
        wrap: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-500',
        label: 'Pausada',
    },
    cerrada: {
        wrap: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        label: 'Cerrada',
    },
    'por-expirar': {
        wrap: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        label: 'Por expirar',
    },
    eliminada: {
        wrap: 'bg-slate-100 text-slate-500 border-slate-300',
        dot: 'bg-slate-400',
        label: 'Eliminada',
    },
};

export function PillEstadoVacante({ estado }: { estado: EstadoVacanteUI }) {
    const cfg = COLOR_ESTADO[estado];
    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-wider ${cfg.wrap}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden />
            {cfg.label}
        </span>
    );
}
