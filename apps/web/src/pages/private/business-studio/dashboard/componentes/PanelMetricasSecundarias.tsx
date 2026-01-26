/**
 * PanelMetricasSecundarias.tsx
 * ==============================
 * Panel que agrupa las métricas secundarias en un solo card
 * Muestra 4 métricas en laptop, 6 en desktop
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/PanelMetricasSecundarias.tsx
 */

import type { LucideIcon } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface Metrica {
  titulo: string;
  valor: number | string;
  subtitulo?: string;
  icono: LucideIcon;
  color: string;
  bgColor: string;
  formato?: 'numero' | 'decimal';
  mostrarEnLaptop?: boolean; // false = solo desktop
}

interface PanelMetricasSecundariasProps {
  metricas: Metrica[];
}

// =============================================================================
// SUBCOMPONENTE: Item de Métrica
// =============================================================================

interface ItemMetricaProps {
  metrica: Metrica;
}

function ItemMetrica({ metrica }: ItemMetricaProps) {
  const Icono = metrica.icono;
  
  // Formatear valor
  const valorFormateado = 
    metrica.formato === 'decimal' 
      ? Number(metrica.valor).toFixed(1)
      : metrica.valor.toLocaleString();

  return (
    <div 
      className={`flex items-center gap-3 lg:gap-2 2xl:gap-3 p-3 lg:p-2 2xl:p-3 rounded-lg ${metrica.bgColor} ${
        metrica.mostrarEnLaptop === false ? 'hidden 2xl:flex' : ''
      }`}
    >
      {/* Icono - MÁS GRANDE */}
      <div className={`w-14 h-14 lg:w-12 lg:h-12 2xl:w-14 2xl:h-14 rounded-lg ${metrica.bgColor} flex items-center justify-center shrink-0`}>
        <Icono className={`w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 ${metrica.color}`} />
      </div>

      {/* Valor y Título */}
      <div className="flex-1 min-w-0">
        <p className="text-2xl lg:text-xl 2xl:text-2xl font-bold text-slate-800 leading-none">
          {valorFormateado}
        </p>
        <p className="text-xs lg:text-[11px] 2xl:text-xs text-slate-600 font-medium truncate mt-0.5">
          {metrica.titulo}
        </p>
        {metrica.subtitulo && (
          <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-500 truncate">
            {metrica.subtitulo}
          </p>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PanelMetricasSecundarias({ metricas }: PanelMetricasSecundariasProps) {
  return (
    <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 p-4 lg:p-3 2xl:p-4 shadow-lg">
      {/* Grid de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 2xl:grid-cols-6 gap-3 lg:gap-2 2xl:gap-3">
        {metricas.map((metrica, index) => (
          <ItemMetrica key={index} metrica={metrica} />
        ))}
      </div>
    </div>
  );
}