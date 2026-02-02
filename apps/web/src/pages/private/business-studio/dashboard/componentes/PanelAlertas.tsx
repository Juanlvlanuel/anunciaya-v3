/**
 * PanelAlertas.tsx
 * =================
 * Panel que muestra las alertas de seguridad
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/PanelAlertas.tsx
 */

import { Bell, AlertTriangle, Info, CheckCircle, XCircle, Check } from 'lucide-react';
import { useDashboardStore } from '../../../../../stores/useDashboardStore';
import type { AlertasData, Alerta } from '../../../../../services/dashboardService';

// =============================================================================
// TIPOS
// =============================================================================

interface PanelAlertasProps {
  alertas: AlertasData | null;
  vistaMobil?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatearFecha(fecha: string): string {
  const fechaAlerta = new Date(fecha);
  const ahora = new Date();
  const diffMin = Math.floor((ahora.getTime() - fechaAlerta.getTime()) / 60000);
  const diffHoras = Math.floor(diffMin / 60);
  const diffDias = Math.floor(diffHoras / 24);

  if (diffMin < 60) return `${diffMin}m`;
  if (diffHoras < 24) return `${diffHoras}h`;
  if (diffDias < 7) return `${diffDias}d`;
  return fechaAlerta.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function getConfigSeveridad(severidad: string) {
  switch (severidad) {
    case 'alta':
      return {
        icon: XCircle,
        bg: 'bg-rose-50',
        color: 'text-rose-500',
        border: 'border-rose-100',
      };
    case 'media':
      return {
        icon: AlertTriangle,
        bg: 'bg-amber-50',
        color: 'text-amber-500',
        border: 'border-amber-100',
      };
    case 'baja':
      return {
        icon: Info,
        bg: 'bg-blue-50',
        color: 'text-blue-500',
        border: 'border-blue-100',
      };
    default:
      return {
        icon: Info,
        bg: 'bg-slate-50',
        color: 'text-slate-500',
        border: 'border-slate-100',
      };
  }
}

// =============================================================================
// COMPONENTE ITEM ALERTA
// =============================================================================

function ItemAlerta({ alerta }: { alerta: Alerta }) {
  const { marcarAlertaLeida } = useDashboardStore();
  const config = getConfigSeveridad(alerta.severidad);
  const Icono = config.icon;

  const handleMarcarLeida = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!alerta.leida) {
      marcarAlertaLeida(alerta.id);
    }
  };

  return (
    <div
      className={`p-2 lg:p-1.5 2xl:p-2 rounded-lg border transition-colors ${
        alerta.leida
          ? 'border-slate-100 bg-slate-50/50 opacity-60'
          : `${config.border} hover:bg-slate-50`
      }`}
    >
      <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
        {/* Icono */}
        <div className={`w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 rounded-md ${config.bg} flex items-center justify-center shrink-0`}>
          <Icono className={`w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 ${config.color}`} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm lg:text-xs 2xl:text-sm font-medium truncate ${alerta.leida ? 'text-slate-500' : 'text-slate-800'}`}>
              {alerta.titulo}
            </p>
            <span className="text-xs lg:text-[10px] 2xl:text-xs text-slate-400 shrink-0">
              {formatearFecha(alerta.createdAt)}
            </span>
          </div>
          <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-500 truncate">
            {alerta.descripcion}
          </p>
        </div>

        {/* Botón marcar como leída */}
        {!alerta.leida && (
          <button
            onClick={handleMarcarLeida}
            className="p-1 rounded-md hover:bg-emerald-50 text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
            title="Marcar como leída"
          >
            <Check className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function PanelAlertas({ alertas, vistaMobil = false }: PanelAlertasProps) {
  const listaAlertas = alertas?.alertas ?? [];
  const noLeidas = alertas?.noLeidas ?? 0;

  return (
    <div className={`bg-white rounded-xl lg:rounded-md 2xl:rounded-lg border-2 border-slate-300 p-2.5 lg:p-2 2xl:p-2.5 ${!vistaMobil ? 'max-h-[260px] lg:max-h-[220px] 2xl:max-h-[280px]' : ''} flex flex-col shadow-lg hover:shadow-2xl transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 lg:mb-1.5 2xl:mb-2">
        <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2">
          <div className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-md bg-rose-100 flex items-center justify-center relative">
            <Bell className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-rose-500" />
            {noLeidas > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 lg:w-4.5 lg:h-4.5 2xl:w-4 2xl:h-4 rounded-full bg-rose-500 text-white text-[10px] lg:text-[9px] 2xl:text-[10px] flex items-center justify-center font-medium">
                {noLeidas > 9 ? '9+' : noLeidas}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-base lg:text-sm 2xl:text-base text-slate-800">Alertas</h3>
        </div>

        {/* Badge estado */}
        {noLeidas === 0 && (
          <div className="flex items-center gap-1 px-2 py-1 lg:px-1.5 lg:py-0.5 2xl:px-2 2xl:py-1 rounded-md bg-emerald-50 text-emerald-600">
            <CheckCircle className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
            <span className="text-xs lg:text-[10px] 2xl:text-xs font-medium">Todo bien</span>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className={`flex-1 space-y-1.5 lg:space-y-1 2xl:space-y-1.5 ${!vistaMobil && 'overflow-y-auto'} flex flex-col`}>
        {listaAlertas.length > 0 ? (
          listaAlertas.map((alerta) => (
            <ItemAlerta key={alerta.id} alerta={alerta} />
          ))
        ) : (
          /* Estado vacío - centrado */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <CheckCircle className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 mb-1 text-emerald-400" />
            <p className="text-sm lg:text-xs 2xl:text-sm text-emerald-600">Sin Alertas Pendientes</p>
          </div>
        )}
      </div>
    </div>
  );
}