/**
 * KPIPrincipal.tsx
 * =================
 * Card de KPI principal con valor grande, comparación y mini gráfica
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/KPIPrincipal.tsx
 * 
 * OPTIMIZACIÓN MÓVIL:
 * - Reducido padding de p-3 a p-2.5 en móvil
 * - Icono de w-14 a w-12 en móvil
 * - Valor de text-3xl a text-2xl en móvil
 * - Badge tendencia más compacto
 * - Mini gráfica altura reducida de 32 a 24
 * - Gaps reducidos para mejor aprovechamiento vertical
 */

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Tendencia } from '../../../../../services/dashboardService';

// =============================================================================
// TIPOS
// =============================================================================

interface KPIPrincipalProps {
  titulo: string;
  valor: number;
  valorAnterior?: number;
  porcentaje?: number;
  tendencia?: Tendencia;
  miniGrafica?: number[];
  icono: LucideIcon;
  colorIcono: string;
  formato?: 'numero' | 'moneda' | 'decimal';
  subtitulo?: string;
  cargando?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatearValor(valor: number, formato: 'numero' | 'moneda' | 'decimal'): string {
  switch (formato) {
    case 'moneda':
      return `$${valor.toLocaleString('es-MX')}`;
    case 'decimal':
      return valor.toFixed(1);
    default:
      return valor.toLocaleString('es-MX');
  }
}

function MiniGrafica({ datos }: { datos: number[] }) {
  if (!datos.length) return null;

  const max = Math.max(...datos, 1);
  const width = 100;
  const height = 24; // Reducido de 32 a 24
  const padding = 2;

  // Crear path para área
  const puntos = datos.map((v, i) => {
    const x = padding + (i / (datos.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (v / max) * (height - padding * 2);
    return { x, y };
  });

  const linePath = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${puntos[puntos.length - 1]?.x ?? width} ${height} L ${padding} ${height} Z`;

  return (
    <svg width={width} height={height} className="opacity-60">
      <defs>
        <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#gradientArea)" />
      <path d={linePath} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function KPIPrincipal({
  titulo,
  valor,
  porcentaje = 0,
  tendencia = 'igual',
  miniGrafica,
  icono: Icono,
  colorIcono,
  formato = 'numero',
  subtitulo,
  cargando = false,
}: KPIPrincipalProps) {
  // Determinar color y icono de tendencia
  const tendenciaConfig = {
    subida: { color: 'text-emerald-600 bg-emerald-100', Icon: TrendingUp },
    bajada: { color: 'text-rose-600 bg-rose-100', Icon: TrendingDown },
    igual: { color: 'text-slate-500 bg-slate-100', Icon: Minus },
  };

  const { color: colorTendencia, Icon: IconoTendencia } = tendenciaConfig[tendencia];

  return (
    <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 p-2.5 lg:p-2.5 2xl:p-3 shadow-lg hover:shadow-2xl hover:scale-[1.02] lg:hover:scale-[1.03] hover:-translate-y-1 transition-all duration-200 h-full flex flex-col justify-center">
      {/* Layout horizontal */}
      <div className="flex items-center gap-2.5 lg:gap-2.5 2xl:gap-3">
        {/* Icono */}
        <div className={`w-12 h-12 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14 rounded-lg lg:rounded-lg 2xl:rounded-xl bg-linear-to-br ${colorIcono} flex items-center justify-center shadow-md shrink-0`}>
          <Icono className="w-6 h-6 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-white" />
        </div>

        {/* Contenido central - centrado verticalmente */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Valor */}
          {cargando ? (
            <div className="h-7 lg:h-8 2xl:h-9 w-20 bg-slate-200 rounded animate-pulse" />
          ) : (
            <p className="text-2xl lg:text-2xl 2xl:text-3xl font-black text-slate-800 truncate leading-tight">
              {formatearValor(valor, formato)}
            </p>
          )}
          {/* Título */}
          <p className="text-sm lg:text-sm 2xl:text-base font-semibold text-slate-500 truncate leading-tight">{titulo}</p>
          {/* Subtítulo */}
          {subtitulo && (
            <p className="text-xs lg:text-xs 2xl:text-sm text-slate-400 truncate leading-tight">{subtitulo}</p>
          )}
        </div>

        {/* Badge tendencia (derecha) */}
        <div className={`flex items-center gap-0.5 px-2 py-1 lg:px-2 lg:py-1 2xl:px-2.5 2xl:py-1.5 rounded-full ${colorTendencia} shrink-0`}>
          <IconoTendencia className="w-3.5 h-3.5 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
          <span className="text-xs lg:text-xs 2xl:text-sm font-bold">
            {porcentaje > 0 ? '+' : ''}{porcentaje}%
          </span>
        </div>
      </div>

      {/* Mini gráfica (si existe) */}
      {miniGrafica && miniGrafica.length > 0 && (
        <div className="mt-1.5 lg:mt-1.5 2xl:mt-2 text-emerald-500">
          <MiniGrafica datos={miniGrafica} />
        </div>
      )}
    </div>
  );
}