/**
 * HeaderDashboard.tsx
 * ====================
 * Header del Dashboard con título, selector de periodo y acciones rápidas
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/HeaderDashboard.tsx
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardStore } from '../../../../../stores/useDashboardStore';
import type { Periodo } from '../../../../../services/dashboardService';
import { LayoutDashboard, Tag, Ticket, Package, RefreshCw } from 'lucide-react';
import Tooltip from '../../../../../components/ui/Tooltip';

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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Título */}
      <div className="flex items-center gap-3 justify-between lg:justify-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <LayoutDashboard className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-800">
              Dashboard
            </h1>
            <p className="text-sm text-slate-500 hidden lg:block">Métricas y actividad reciente</p>
          </div>
        </div>

        {/* Acciones rápidas - Visibles en móvil aquí */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            onClick={onNuevaOferta}
            className="p-2 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-all shadow-sm"
          >
            <Tag className="w-5 h-5" />
          </button>

          <button
            onClick={handleNuevoCupon}
            className="p-2 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 transition-all shadow-sm"
          >
            <Ticket className="w-5 h-5" />
          </button>

          <button
            onClick={onNuevoArticulo}
            className="p-2 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
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
              className="p-2.5 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 transition-all shadow-sm hover:shadow-md"
            >
              <Tag className="w-5 h-5" />
            </button>
          </Tooltip>

          <Tooltip text="Nuevo Cupón" position="bottom">
            <button
              onClick={handleNuevoCupon}
              className="p-2.5 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 transition-all shadow-sm hover:shadow-md"
            >
              <Ticket className="w-5 h-5" />
            </button>
          </Tooltip>

          <Tooltip text="Nuevo Artículo" position="bottom">
            <button
              onClick={onNuevoArticulo}
              className="p-2.5 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm hover:shadow-md"
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
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${periodo === p.valor
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
          className="p-2.5 rounded-xl bg-white border-2 border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
          title="Actualizar"
        >
          <RefreshCw className={`w-5 h-5 ${refrescando ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}