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
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../../../../../stores/useDashboardStore';
import type { Periodo } from '../../../../../services/dashboardService';
import { Tag, Ticket, Package, RefreshCw } from 'lucide-react';
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

interface HeaderDashboardProps {
  onNuevaOferta?: () => void;
  onNuevoArticulo?: () => void;
}

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

export default function HeaderDashboard({ onNuevaOferta, onNuevoArticulo }: HeaderDashboardProps) {
  const navigate = useNavigate();
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

  const handleNuevoCupon = () => {
    navigate('/business-studio/cupones');
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
              <p className="text-sm lg:text-sm 2xl:text-base text-slate-500 mt-0.5 font-medium">
                Métricas y actividad reciente
              </p>
            </div>
          </div>

          {/* Acciones rápidas - Visibles en móvil aquí */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={onNuevaOferta}
              className="p-2 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-all shadow-sm cursor-pointer"
            >
              <Tag className="w-5 h-5" />
            </button>

            <button
              onClick={handleNuevoCupon}
              className="p-2 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 transition-all shadow-sm cursor-pointer"
            >
              <Ticket className="w-5 h-5" />
            </button>

            <button
              onClick={onNuevoArticulo}
              className="p-2 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm cursor-pointer"
            >
              <Package className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controles - SOLO DESKTOP */}
        <div className="hidden lg:flex items-center gap-3">
          {/* Acciones rápidas - Solo desktop con tooltips */}
          <div className="flex items-center gap-2">
            <Tooltip text="Nueva Oferta" position="bottom">
              <button
                onClick={onNuevaOferta}
                className="p-2.5 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                <Tag className="w-5 h-5" />
              </button>
            </Tooltip>

            <Tooltip text="Nuevo Cupón" position="bottom">
              <button
                onClick={handleNuevoCupon}
                className="p-2.5 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                <Ticket className="w-5 h-5" />
              </button>
            </Tooltip>

            <Tooltip text="Nuevo Artículo" position="bottom">
              <button
                onClick={onNuevoArticulo}
                className="p-2.5 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm hover:shadow-md cursor-pointer"
              >
                <Package className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>

          {/* Separador */}
          <div className="w-px h-8 bg-slate-200" />

          {/* Selector de periodo DESKTOP - 5 opciones */}
          <div className="flex items-center gap-1">
            {PERIODOS.map((p) => (
              <button
                key={p.valor}
                onClick={() => setPeriodo(p.valor)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${periodo === p.valor
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-blue-100'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Botón refresh */}
          <button
            onClick={handleRefresh}
            disabled={refrescando}
            className="p-2.5 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm hover:shadow-md disabled:opacity-50 cursor-pointer"
            title="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 ${refrescando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </>
  );
}