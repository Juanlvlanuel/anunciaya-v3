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
    <div className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-lg transition-all duration-300">
      {/* Header Colapsable - Siempre visible */}
      <button
        onClick={() => setExpandida(!expandida)}
        className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            {crecimientoPositivo ? (
              <TrendingUp className="w-4 h-4 text-blue-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-800">Ventas del Periodo</h3>
            {estadisticas && (
              <p className="text-xs text-slate-500">
                Promedio: ${estadisticas.promedioDiario.toLocaleString('es-MX')}/día
                {' '}·{' '}
                <span className={crecimientoPositivo ? 'text-emerald-600' : 'text-rose-600'}>
                  {crecimientoPositivo ? '+' : ''}{estadisticas.crecimiento}%
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Icono Expandir/Colapsar */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">
            {expandida ? 'Ocultar' : 'Ver gráfica'}
          </span>
          {expandida ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Contenido Expandible - Gráfica */}
      {expandida && (
        <div className="border-t-2 border-slate-200 animate-in slide-in-from-top duration-300">
          <GraficaVentas datos={datos} />
        </div>
      )}

      {/* Preview de Estadísticas cuando está colapsada */}
      {!expandida && estadisticas && (
        <div className="px-3 pb-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-xs text-slate-500">Mejor día</p>
            <p className="text-sm font-bold text-slate-800">{estadisticas.diaPico}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-xs text-slate-500">Promedio</p>
            <p className="text-sm font-bold text-slate-800">
              ${(estadisticas.promedioDiario / 1000).toFixed(1)}k
            </p>
          </div>
          <div className={`rounded-lg p-2 ${
            crecimientoPositivo ? 'bg-emerald-50' : 'bg-rose-50'
          }`}>
            <p className="text-xs text-slate-500">Tendencia</p>
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