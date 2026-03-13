/**
 * GraficaColapsable.tsx
 * ======================
 * Wrapper de GraficaVentas con funcionalidad de expandir/colapsar
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/GraficaColapsable.tsx
 * 
 * CARACTERÍSTICAS:
 * - Inicia colapsada (solo header visible)
 * - Click para expandir y mostrar gráfica completa
 * - Muestra resumen de estadísticas cuando está colapsada
 * - Animación suave al expandir/colapsar
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import GraficaVentas from './GraficaVentas';
import type { VentasData } from '../../../../../services/dashboardService';

// =============================================================================
// TIPOS
// =============================================================================

interface GraficaColapsableProps {
  datos: VentasData | null;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function GraficaColapsable({ datos }: GraficaColapsableProps) {
  const [expandida, setExpandida] = useState(false);
  
  const estadisticas = datos?.estadisticas;
  const crecimientoPositivo = (estadisticas?.crecimiento ?? 0) >= 0;

  return (
    <div className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-md transition-all duration-300">
      {/* Header Colapsable - Siempre visible */}
      <button
        onClick={() => setExpandida(!expandida)}
        className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-slate-100 transition-colors focus:outline-none"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          {crecimientoPositivo ? (
            <TrendingUp className="w-4 h-4 text-blue-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-600" />
          )}
        </div>

        <div className="flex-1 text-left min-w-0">
          <h3 className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800">Ventas del Periodo</h3>
          {estadisticas && (
            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600 truncate">
              ${estadisticas.promedioDiario >= 1000
                ? `${(estadisticas.promedioDiario / 1000).toFixed(1)}k`
                : estadisticas.promedioDiario.toLocaleString('es-MX')}/día
              {' '}·{' '}Mejor día: {estadisticas.diaPico}
            </p>
          )}
        </div>

        {/* "Ver gráfica" solo en laptop/desktop — en móvil solo el chevron */}
        <span className="hidden lg:inline text-[11px] 2xl:text-sm font-medium text-slate-600">
          {expandida ? 'Ocultar' : 'Ver gráfica'}
        </span>
        {expandida ? (
          <ChevronUp className="w-5 h-5 text-slate-600 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-600 shrink-0" />
        )}
      </button>

      {/* Contenido Expandible - Gráfica */}
      {expandida && (
        <div className="border-t-2 border-slate-300 animate-in slide-in-from-top duration-300">
          <GraficaVentas datos={datos} embedded />
        </div>
      )}

      {/* Preview de Estadísticas cuando está colapsada — solo laptop/desktop */}
      {!expandida && estadisticas && (
        <div className="px-3 pb-3 hidden lg:grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-100 rounded-lg p-2">
            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">Mejor día</p>
            <p className="text-sm font-bold text-slate-800">{estadisticas.diaPico}</p>
          </div>
          <div className="bg-slate-100 rounded-lg p-2">
            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">Promedio</p>
            <p className="text-sm font-bold text-slate-800">
              {estadisticas.promedioDiario >= 1000
                ? `$${(estadisticas.promedioDiario / 1000).toFixed(1)}k`
                : `$${estadisticas.promedioDiario.toLocaleString('es-MX')}`}
            </p>
          </div>
          <div className={`rounded-lg p-2 ${
            crecimientoPositivo ? 'bg-emerald-100' : 'bg-rose-100'
          }`}>
            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-600">Tendencia</p>
            <p className={`text-sm font-bold ${
              crecimientoPositivo ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {crecimientoPositivo ? '+' : ''}{estadisticas.crecimiento}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}