/**
 * KPISecundario.tsx
 * ==================
 * Card de KPI secundario - más compacta y enfocada
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/KPISecundario.tsx
 * 
 * CAMBIO: Eliminados porcentajes y tendencias para mantener el dashboard limpio
 */

import { LucideIcon } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface KPISecundarioProps {
  titulo: string;
  valor: number;
  icono: LucideIcon;
  color: string;
  bgColor: string;
  formato?: 'numero' | 'decimal';
  subtitulo?: string;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function KPISecundario({
  titulo,
  valor,
  icono: Icono,
  color,
  bgColor,
  formato = 'numero',
  subtitulo,
}: KPISecundarioProps) {
  const valorFormateado = formato === 'decimal' 
    ? valor.toFixed(1) 
    : valor.toLocaleString('es-MX');

  return (
    <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 p-2.5 lg:p-2 2xl:p-2.5 shadow-lg hover:shadow-2xl hover:scale-[1.02] lg:hover:scale-[1.03] hover:-translate-y-1 transition-all duration-200 h-full flex items-center gap-2">
      {/* Columna 1: Icono */}
      <div className={`w-11 h-11 lg:w-10 lg:h-10 2xl:w-11 2xl:h-11 rounded-lg ${bgColor} flex items-center justify-center shrink-0`}>
        <Icono className={`w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 ${color}`} />
      </div>

      {/* Columna 2: Número */}
      <div className="shrink-0">
        <p className="text-2xl lg:text-xl 2xl:text-2xl font-black text-slate-800 leading-tight">{valorFormateado}</p>
      </div>

      {/* Columna 3: Título en 2 líneas */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className="text-xs lg:text-[10px] 2xl:text-xs font-semibold text-slate-700 leading-snug wrap-break-word">{titulo}</p>
        {/* Subtítulo */}
        {subtitulo && (
          <p className="text-[10px] lg:text-[9px] 2xl:text-[10px] text-slate-400 leading-tight mt-0.5">{subtitulo}</p>
        )}
      </div>
    </div>
  );
}