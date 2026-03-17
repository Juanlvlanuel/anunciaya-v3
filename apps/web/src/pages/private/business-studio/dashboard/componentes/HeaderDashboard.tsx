/**
 * HeaderDashboard.tsx
 * ====================
 * Header del Dashboard con título, selector de periodo y acciones rápidas
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/HeaderDashboard.tsx
 * 
 * ESTILO: Igual a PaginaPuntos - icono con gradiente y animación bounce
 */

import { useState } from 'react';
import { useDashboardStore } from '../../../../../stores/useDashboardStore';
import type { Periodo } from '../../../../../services/dashboardService';
import { RefreshCw } from 'lucide-react';
import Tooltip from '../../../../../components/ui/Tooltip';

// =============================================================================
// CSS — Animación del icono del header (estilo Puntos)
// =============================================================================

const ESTILO_ICONO_HEADER = `
  @keyframes dashboard-icon-bounce {
    0%, 100% { transform: translateY(0); }
    40%      { transform: translateY(-4px); }
    60%      { transform: translateY(-2px); }
  }
  .dashboard-icon-bounce {
    animation: dashboard-icon-bounce 2s ease-in-out infinite;
  }
`;

// =============================================================================
// TIPOS
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface HeaderDashboardProps {}

const PERIODOS: { valor: Periodo; label: string }[] = [
  { valor: 'hoy', label: 'Hoy' },
  { valor: 'semana', label: '7 días' },
  { valor: 'mes', label: '30 días' },
  { valor: 'trimestre', label: '90 días' },
  { valor: 'anio', label: '12 meses' },
];

// =============================================================================
// COMPONENTE
// =============================================================================

export default function HeaderDashboard(_props: HeaderDashboardProps) {
  const { periodo, setPeriodo, cargarTodo } = useDashboardStore();

  // Estado para animación del botón refresh
  const [refrescando, setRefrescando] = useState(false);

  const handleRefresh = async () => {
    setRefrescando(true);
    await cargarTodo();
    // Delay mínimo para ver la animación
    await new Promise(resolve => setTimeout(resolve, 500));
    setRefrescando(false);
  };

  return (
    <>
      {/* Inyectar estilos de animación */}
      <style dangerouslySetInnerHTML={{ __html: ESTILO_ICONO_HEADER }} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Título con icono estilo Puntos */}
        <div className="flex items-center gap-3 justify-between lg:justify-start">
          <div className="flex items-center gap-4 shrink-0">
            {/* Contenedor del icono con gradiente */}
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #2563eb, #3b82f6, #60a5fa)',
                boxShadow: '0 6px 20px rgba(37,99,235,0.4)',
              }}
            >
              {/* Grid de 4 cuadros animado (representa dashboard) */}
              <div
                className="dashboard-icon-bounce grid grid-cols-2 gap-1"
                style={{ width: 24, height: 24 }}
              >
                <div className="rounded-sm bg-white/90" style={{ width: 10, height: 10 }} />
                <div className="rounded-sm bg-white/70" style={{ width: 10, height: 10 }} />
                <div className="rounded-sm bg-white/70" style={{ width: 10, height: 10 }} />
                <div className="rounded-sm bg-white/90" style={{ width: 10, height: 10 }} />
              </div>
            </div>
            <div>
              <h1 className="text-2xl lg:text-2xl 2xl:text-3xl font-extrabold text-slate-900 tracking-tight">
                Dashboard
              </h1>
              <p className="text-base lg:text-sm 2xl:text-base text-slate-600 -mt-1 lg:mt-0.5 font-medium">
                Métricas<span className="hidden lg:inline"> y actividad reciente</span>
              </p>
            </div>
          </div>

        </div>

        {/* Controles - SOLO DESKTOP */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Selector de periodo DESKTOP - 5 opciones */}
          <div className="flex items-center bg-slate-200 rounded-xl border-2 border-slate-300 p-0.5 shadow-md">
            {PERIODOS.map((p) => (
              <button
                key={p.valor}
                onClick={() => setPeriodo(p.valor)}
                className={`px-3 2xl:px-4 h-9 2xl:h-10 flex items-center rounded-lg text-xs 2xl:text-sm font-semibold whitespace-nowrap cursor-pointer ${periodo === p.valor
                    ? 'text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-300'
                  }`}
                style={periodo === p.valor ? { background: 'linear-gradient(135deg, #1e293b, #334155)' } : undefined}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Botón refresh */}
          <Tooltip text="Actualizar" position="bottom">
            <button
              onClick={handleRefresh}
              disabled={refrescando}
              className="p-2 2xl:p-2.5 rounded-lg 2xl:rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 2xl:w-5 2xl:h-5 ${refrescando ? 'animate-spin' : ''}`} />
            </button>
          </Tooltip>
        </div>
      </div>
    </>
  );
}