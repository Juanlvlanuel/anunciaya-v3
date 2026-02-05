/**
 * KPIPrincipal.tsx
 * =================
 * Card de KPI principal con título arriba, icono + valor horizontal
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/KPIPrincipal.tsx
 * 
 * LAYOUT:
 * - Título arriba (bold)
 * - Icono izquierda + Valor grande derecha
 * - Subtítulo abajo (opcional)
 * - Mini gráfica abajo (opcional)
 * - SIN porcentajes ni tendencias
 */

import { LucideIcon } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface KPIPrincipalProps {
  titulo: string;
  valor: number;
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
  const height = 22; // Compacto
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
  miniGrafica,
  icono: Icono,
  colorIcono,
  formato = 'numero',
  subtitulo,
  cargando = false,
}: KPIPrincipalProps) {

  return (
    <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 p-2 lg:p-2 2xl:p-2.5 shadow-lg hover:shadow-2xl hover:scale-[1.02] lg:hover:scale-[1.03] hover:-translate-y-1 transition-all duration-200 h-full flex flex-col">
      {/* MÓVIL: Icono + Título en la misma línea */}
      <div className="flex items-center gap-2 mb-1 lg:hidden">
        <div className={`w-7 h-7 rounded-lg bg-linear-to-br ${colorIcono} flex items-center justify-center shadow-md shrink-0`}>
          <Icono className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm font-bold text-slate-700 leading-tight truncate">{titulo}</p>
      </div>

      {/* MÓVIL: Valor solo abajo - CENTRADO */}
      <div className="lg:hidden flex justify-center">
        {cargando ? (
          <div className="h-6 w-16 bg-slate-200 rounded animate-pulse" />
        ) : (
          <p className="text-xl font-black text-slate-800 leading-none">
            {formatearValor(valor, formato)}
          </p>
        )}
      </div>

      {/* LAPTOP/DESKTOP: Layout original */}
      <p className="hidden lg:block text-sm 2xl:text-base font-bold text-slate-700 mb-1 2xl:mb-1.5">{titulo}</p>

      <div className="hidden lg:flex items-center gap-1.5 2xl:gap-2 flex-1">
        <div className={`w-8 h-8 2xl:w-9 2xl:h-9 rounded-md 2xl:rounded-lg bg-linear-to-br ${colorIcono} flex items-center justify-center shadow-md shrink-0`}>
          <Icono className="w-4 h-4 2xl:w-4.5 2xl:h-4.5 text-white" />
        </div>
        {cargando ? (
          <div className="h-6 2xl:h-7 w-12 2xl:w-14 bg-slate-200 rounded animate-pulse" />
        ) : (
          <p className="text-xl 2xl:text-2xl font-black text-slate-800 leading-none">
            {formatearValor(valor, formato)}
          </p>
        )}
      </div>

      {/* Subtítulo abajo - Solo en laptop/desktop */}
      {subtitulo && (
        <p className="hidden lg:block text-[10px] 2xl:text-xs text-slate-500 mt-0.5 2xl:mt-1 leading-tight truncate">{subtitulo}</p>
      )}

      {/* Mini gráfica (si existe) - oculta en móvil */}
      {miniGrafica && miniGrafica.length > 0 && (
        <div className="hidden lg:block mt-0.5 2xl:mt-1 text-emerald-500">
          <MiniGrafica datos={miniGrafica} />
        </div>
      )}
    </div>
  );
}