/**
 * VacanteAtoms.tsx
 * =================
 * Pills + status atómicos reutilizables del módulo Vacantes.
 * Componentes puros sin estado, sin lógica de negocio.
 *
 * Patrón consistente con los pills de Empleados / Promociones / Catálogo:
 *   `inline-flex items-center gap-1 px-2 py-0.5 rounded-full
 *    text-sm lg:text-[11px] 2xl:text-sm font-bold
 *    bg-{color}-100 text-{color}-700`
 * Sin border (estética B2B Regla 13 — densa, no caricaturesca).
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

const CLASES_PILL_BASE =
    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold whitespace-nowrap';

// =============================================================================
// PILL TIPO DE EMPLEO
// =============================================================================

const COLOR_TIPO_EMPLEO: Record<TipoEmpleo, string> = {
    'tiempo-completo': 'bg-sky-100 text-sky-700',
    'medio-tiempo': 'bg-violet-100 text-violet-700',
    'por-proyecto': 'bg-amber-100 text-amber-700',
    'eventual': 'bg-slate-200 text-slate-700',
};

export function PillTipoEmpleo({ tipoEmpleo }: { tipoEmpleo: TipoEmpleo }) {
    return (
        <span className={`${CLASES_PILL_BASE} ${COLOR_TIPO_EMPLEO[tipoEmpleo]}`}>
            {TIPO_EMPLEO_LABEL[tipoEmpleo]}
        </span>
    );
}

// =============================================================================
// PILL MODALIDAD
// =============================================================================

const COLOR_MODALIDAD: Record<ModalidadServicio, string> = {
    presencial: 'bg-slate-200 text-slate-700',
    remoto: 'bg-cyan-100 text-cyan-700',
    hibrido: 'bg-teal-100 text-teal-700',
};

export function PillModalidad({ modalidad }: { modalidad: ModalidadServicio }) {
    return (
        <span className={`${CLASES_PILL_BASE} ${COLOR_MODALIDAD[modalidad]}`}>
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
        wrap: 'bg-emerald-100 text-emerald-700',
        dot: 'bg-emerald-500',
        label: 'Activa',
    },
    pausada: {
        wrap: 'bg-slate-200 text-slate-700',
        dot: 'bg-slate-500',
        label: 'Pausada',
    },
    cerrada: {
        wrap: 'bg-rose-100 text-rose-700',
        dot: 'bg-rose-500',
        label: 'Cerrada',
    },
    'por-expirar': {
        wrap: 'bg-amber-100 text-amber-700',
        dot: 'bg-amber-500',
        label: 'Por expirar',
    },
    eliminada: {
        wrap: 'bg-slate-200 text-slate-600',
        dot: 'bg-slate-400',
        label: 'Eliminada',
    },
};

export function PillEstadoVacante({ estado }: { estado: EstadoVacanteUI }) {
    const cfg = COLOR_ESTADO[estado];
    return (
        <span className={`${CLASES_PILL_BASE} ${cfg.wrap}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} aria-hidden />
            {cfg.label}
        </span>
    );
}
