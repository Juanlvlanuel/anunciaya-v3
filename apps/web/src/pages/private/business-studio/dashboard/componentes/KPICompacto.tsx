/**
 * KPICompacto.tsx
 * ================
 * Card de KPI en formato horizontal compacto
 * Usado para los 2 KPIs secundarios: Clientes y Transacciones
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/KPICompacto.tsx
 * 
 * DISEÑO:
 * - Más compacto que KPIPrincipal
 * - Más información que KPISecundario
 * - Layout vertical optimizado
 * - Incluye tendencia y subtítulo
 */

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Tendencia } from '../../../../../services/dashboardService';

// =============================================================================
// TIPOS
// =============================================================================

interface KPICompactoProps {
  titulo: string;
  valor: number;
  porcentaje?: number;
  tendencia?: Tendencia;
  icono: LucideIcon;
  colorIcono: string;
  subtitulo?: string;
  cargando?: boolean;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function KPICompacto({
  titulo,
  valor,
  porcentaje = 0,
  tendencia = 'igual',
  icono: Icono,
  colorIcono,
  subtitulo,
  cargando = false,
}: KPICompactoProps) {
  // Determinar color y icono de tendencia
  const tendenciaConfig = {
    subida: { color: 'text-emerald-600 bg-emerald-100', Icon: TrendingUp },
    bajada: { color: 'text-rose-600 bg-rose-100', Icon: TrendingDown },
    igual: { color: 'text-slate-500 bg-slate-100', Icon: Minus },
  };

  const { color: colorTendencia, Icon: IconoTendencia } = tendenciaConfig[tendencia];

  return (
    <div className="bg-white rounded-xl border-2 border-slate-300 p-2.5 shadow-lg hover:shadow-xl hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-200 h-full flex items-center gap-2.5">
      {/* Columna 1: Icono */}
      <div className={`w-12 h-12 rounded-lg bg-linear-to-br ${colorIcono} flex items-center justify-center shadow-md shrink-0`}>
        <Icono className="w-6 h-6 text-white" />
      </div>

      {/* Columna 2: Contenido (Título + Valor + Subtítulo) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Título */}
        <p className="text-sm font-semibold text-slate-500 leading-tight">{titulo}</p>
        
        {/* Valor */}
        {cargando ? (
          <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mt-0.5" />
        ) : (
          <p className="text-2xl font-black text-slate-800 leading-tight">
            {valor.toLocaleString('es-MX')}
          </p>
        )}
        
        {/* Subtítulo */}
        {subtitulo && (
          <p className="text-xs text-slate-400 leading-tight whitespace-nowrap">
            {subtitulo}
          </p>
        )}
      </div>

      {/* Columna 3: Badge Tendencia */}
      <div className={`flex items-center gap-0.5 px-2 py-1 rounded-full ${colorTendencia} shrink-0`}>
        <IconoTendencia className="w-3.5 h-3.5" />
        <span className="text-xs font-bold">
          {porcentaje > 0 ? '+' : ''}{porcentaje}%
        </span>
      </div>
    </div>
  );
}