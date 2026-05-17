/**
 * ReporteUI.tsx — Componentes compartidos para tablas del módulo Reportes BS
 */

import type { LucideIcon } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

/** Tipo que admite tanto LucideIcon (forwardRef) como wrappers locales Iconify. */
export type IconLike =
  | LucideIcon
  | ComponentType<{ className?: string; strokeWidth?: number; fill?: string; width?: number | string; height?: number | string }>;

/** Paleta de colores para KpiCard — igual al patrón del Dashboard BS */
export type ColorKpi = 'emerald' | 'blue' | 'violet' | 'amber' | 'red' | 'slate';

interface PaletaKpi {
  bg: string;
  border: string;
  iconBg: string;
  iconShadow: string;
  texto: string;
}

const PALETA_KPI: Record<ColorKpi, PaletaKpi> = {
  emerald: {
    bg: 'linear-gradient(135deg, #f0fdf4, #fff)',
    border: '#86efac',
    iconBg: 'linear-gradient(135deg, #bbf7d0, #86efac)',
    iconShadow: '0 3px 8px rgba(22,163,74,0.25)',
    texto: 'text-emerald-700',
  },
  blue: {
    bg: 'linear-gradient(135deg, #eff6ff, #fff)',
    border: '#93c5fd',
    iconBg: 'linear-gradient(135deg, #bfdbfe, #93c5fd)',
    iconShadow: '0 3px 8px rgba(37,99,235,0.25)',
    texto: 'text-blue-700',
  },
  violet: {
    bg: 'linear-gradient(135deg, #f5f3ff, #fff)',
    border: '#c4b5fd',
    iconBg: 'linear-gradient(135deg, #ddd6fe, #c4b5fd)',
    iconShadow: '0 3px 8px rgba(139,92,246,0.25)',
    texto: 'text-violet-700',
  },
  amber: {
    bg: 'linear-gradient(135deg, #fffbeb, #fff)',
    border: '#fcd34d',
    iconBg: 'linear-gradient(135deg, #fde68a, #fcd34d)',
    iconShadow: '0 3px 8px rgba(217,119,6,0.25)',
    texto: 'text-amber-700',
  },
  red: {
    bg: 'linear-gradient(135deg, #fef2f2, #fff)',
    border: '#fca5a5',
    iconBg: 'linear-gradient(135deg, #fecaca, #fca5a5)',
    iconShadow: '0 3px 8px rgba(220,38,38,0.25)',
    texto: 'text-red-700',
  },
  slate: {
    bg: 'linear-gradient(135deg, #f8fafc, #fff)',
    border: '#cbd5e1',
    iconBg: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
    iconShadow: '0 3px 8px rgba(71,85,105,0.25)',
    texto: 'text-slate-700',
  },
};

interface KpiCardProps {
  icono: IconLike;
  label: string;
  valor: ReactNode;
  color: ColorKpi;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
  /** Contenido extra debajo del valor principal (ej: sub-valor del mejor vendedor) */
  extra?: ReactNode;
}

/**
 * KpiCard — Tarjeta KPI con gradient y color semántico.
 * Tamaños idénticos al Dashboard BS (compactos). Diseñada para usarse dentro de <CarouselKPI>.
 * En móvil: scroll horizontal con min-width 30%. En lg+: min-width fijo + flex-1 opcional del padre.
 */
export function KpiCard({ icono: Icono, label, valor, color, onClick, disabled, testId, extra }: KpiCardProps) {
  const paleta = PALETA_KPI[color];

  const clases = `flex items-center gap-2 lg:gap-1.5 2xl:gap-2 rounded-xl px-2 lg:px-2 2xl:px-3 py-0 lg:py-1.5 2xl:py-2 shrink-0 h-13 2xl:h-16 min-w-[calc(30%-10px)] lg:min-w-[110px] 2xl:min-w-[140px] ${onClick && !disabled ? 'lg:cursor-pointer hover:brightness-95 transition' : ''} ${disabled ? 'opacity-75' : ''} text-left`;

  const estilo = {
    background: paleta.bg,
    border: `2px solid ${paleta.border}`,
    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
  };

  const contenido = (
    <>
      <div
        className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: paleta.iconBg, boxShadow: paleta.iconShadow }}
      >
        <Icono className={`w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 ${paleta.texto}`} />
      </div>
      <div className="min-w-0 text-left">
        <div className={`text-[16px] lg:text-sm 2xl:text-base font-extrabold leading-tight truncate ${paleta.texto}`}>
          {valor}
        </div>
        <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold mt-0.5 whitespace-nowrap">
          {label}
        </div>
        {extra}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={clases} style={estilo} data-testid={testId}>
        {contenido}
      </button>
    );
  }

  return (
    <div className={clases} style={estilo} data-testid={testId}>
      {contenido}
    </div>
  );
}

/** Título de sección con gradiente oscuro (patrón Dashboard) */
export function PanelTitulo({ icono: Icono, titulo }: { icono: IconLike; titulo: string }) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 lg:px-4 2xl:px-4 py-2"
      style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
      >
        <Icono className="w-4 h-4 text-white" />
      </div>
      <h3 className="text-base lg:text-sm 2xl:text-base font-bold text-white">{titulo}</h3>
    </div>
  );
}

/** Header de columnas para tablas */
export function TablaHeader({ columnas }: { columnas: string[] }) {
  return (
    <div className="grid gap-px bg-slate-200" style={{ gridTemplateColumns: columnas.map(() => '1fr').join(' ') }}>
      {columnas.map((col) => (
        <div key={col} className="bg-slate-300 text-slate-700 font-bold text-sm lg:text-[11px] 2xl:text-sm h-8 2xl:h-9 flex items-center px-3">
          {col}
        </div>
      ))}
    </div>
  );
}

/** Formatear monto en pesos MXN */
export function formatearMonto(valor: number): string {
  return `$${valor.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/**
 * Formatear una semana como rango "DD - DD Mes YYYY" en español.
 * Recibe la fecha del primer día de la semana (formato YYYY-MM-DD).
 * Ejemplo: "16 - 22 Feb 2026"
 */
export function formatearSemana(fechaISO: string): string {
  const fecha = new Date(fechaISO + 'T12:00:00');
  const fin = new Date(fecha.getTime() + 6 * 24 * 60 * 60 * 1000);
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mismoMes = fecha.getMonth() === fin.getMonth() && fecha.getFullYear() === fin.getFullYear();
  if (mismoMes) {
    return `${fecha.getDate()} - ${fin.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()}`;
  }
  const mismoAnio = fecha.getFullYear() === fin.getFullYear();
  if (mismoAnio) {
    return `${fecha.getDate()} ${meses[fecha.getMonth()]} - ${fin.getDate()} ${meses[fin.getMonth()]} ${fecha.getFullYear()}`;
  }
  return `${fecha.getDate()} ${meses[fecha.getMonth()]} ${fecha.getFullYear()} - ${fin.getDate()} ${meses[fin.getMonth()]} ${fin.getFullYear()}`;
}
