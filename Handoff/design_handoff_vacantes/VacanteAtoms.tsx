/**
 * VacanteAtoms.tsx — Pills + status + secciones de UI reutilizables.
 * Todo Tailwind v4. Sin estado.
 */

import { Icon } from '@iconify/react';
import {
  TIPO_EMPLEO_LABEL,
  MODALIDAD_LABEL,
  ESTADO_LABEL,
  formatPrecio,
} from './helpers';
import { ICONOS } from './iconos';
import type {
  TipoEmpleo,
  Modalidad,
  EstadoVacanteUI,
  Precio,
} from './types';

/* ============================================================
   Pills de clasificación
   ============================================================ */
export function PillTipoEmpleo({ tipoEmpleo }: { tipoEmpleo: TipoEmpleo }) {
  const colorMap: Record<TipoEmpleo, string> = {
    'tiempo-completo': 'bg-sky-50 text-sky-700 border-sky-200',
    'medio-tiempo':    'bg-violet-50 text-violet-700 border-violet-200',
    'por-proyecto':    'bg-amber-50 text-amber-700 border-amber-200',
    'eventual':        'bg-slate-100 text-slate-700 border-slate-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-bold tracking-wide ${colorMap[tipoEmpleo]}`}>
      {TIPO_EMPLEO_LABEL[tipoEmpleo]}
    </span>
  );
}

export function PillModalidad({ modalidad }: { modalidad: Modalidad }) {
  const colorMap: Record<Modalidad, string> = {
    presencial: 'bg-slate-100 text-slate-700 border-slate-300',
    remoto:     'bg-cyan-50 text-cyan-700 border-cyan-200',
    hibrido:    'bg-teal-50 text-teal-700 border-teal-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-bold tracking-wide ${colorMap[modalidad]}`}>
      {MODALIDAD_LABEL[modalidad]}
    </span>
  );
}

/* ============================================================
   Status pill (con dot)
   ============================================================ */
export function PillEstado({ estado }: { estado: EstadoVacanteUI }) {
  const config: Record<EstadoVacanteUI, { wrap: string; dot: string }> = {
    activa: {
      wrap: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot:  'bg-emerald-500',
    },
    pausada: {
      wrap: 'bg-slate-100 text-slate-700 border-slate-300',
      dot:  'bg-slate-500',
    },
    cerrada: {
      wrap: 'bg-rose-50 text-rose-700 border-rose-200',
      dot:  'bg-rose-500',
    },
    'por-expirar': {
      wrap: 'bg-amber-50 text-amber-700 border-amber-200',
      dot:  'bg-amber-500',
    },
  };
  const c = config[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold tracking-wider ${c.wrap}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} aria-hidden />
      {ESTADO_LABEL[estado]}
    </span>
  );
}

/* ============================================================
   Salario formateado
   ============================================================ */
export function SalarioTexto({
  precio,
  tipoEmpleo,
  size = 'sm',
}: {
  precio: Precio;
  tipoEmpleo?: TipoEmpleo;
  size?: 'sm' | 'md';
}) {
  const f = formatPrecio(precio, tipoEmpleo);
  const sizeCls = size === 'md' ? 'text-base' : 'text-sm';
  return (
    <span className={`${sizeCls} font-bold text-slate-900 tabular-nums whitespace-nowrap`}>
      {f.main}
      {f.unit && <span className="font-medium text-slate-500"> {f.unit}</span>}
    </span>
  );
}

/* ============================================================
   Stat card (KPI)
   ============================================================ */
export interface StatCardProps {
  num: number;
  label: string;
  icon: keyof typeof ICONOS;
  tono: 'sky' | 'emerald' | 'amber' | 'violet' | 'rose';
}

export function StatCard({ num, label, icon, tono }: StatCardProps) {
  const tonos = {
    sky:     { wrap: 'border-sky-200     bg-sky-50',     ic: 'bg-sky-100     text-sky-700',     num: 'text-sky-700' },
    emerald: { wrap: 'border-emerald-200 bg-emerald-50', ic: 'bg-emerald-100 text-emerald-700', num: 'text-emerald-700' },
    amber:   { wrap: 'border-amber-200   bg-amber-50',   ic: 'bg-amber-100   text-amber-700',   num: 'text-amber-700' },
    violet:  { wrap: 'border-violet-200  bg-violet-50',  ic: 'bg-violet-100  text-violet-700',  num: 'text-violet-700' },
    rose:    { wrap: 'border-rose-200    bg-rose-50',    ic: 'bg-rose-100    text-rose-700',    num: 'text-rose-700' },
  }[tono];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${tonos.wrap} min-w-[110px]`}>
      <div className={`w-10 h-10 rounded-lg grid place-items-center shrink-0 ${tonos.ic}`}>
        <Icon icon={ICONOS[icon]} className="w-[18px] h-[18px]" />
      </div>
      <div>
        <div className={`text-[22px] font-extrabold leading-none tabular-nums tracking-tight ${tonos.num}`}>
          {num}
        </div>
        <div className="text-[13px] font-semibold text-slate-600 mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Vigencia (en celdas de tabla / detalle)
   ============================================================ */
export function VigenciaCell({
  diasParaExpirar,
  estado,
}: {
  diasParaExpirar: number;
  estado: EstadoVacanteUI;
}) {
  if (estado === 'cerrada') {
    return (
      <span className="text-[13px] text-slate-600 tabular-nums">
        Cerrada
        <span className="block text-xs text-slate-500 mt-0.5">
          ya no recibe candidatos
        </span>
      </span>
    );
  }
  return (
    <span className="text-[13px] text-slate-600 tabular-nums">
      {diasParaExpirar}d restantes
      <span className="block text-xs text-slate-500 mt-0.5">
        auto-pausa al expirar
      </span>
    </span>
  );
}
