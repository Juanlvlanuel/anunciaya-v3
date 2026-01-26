/**
 * PanelAlertas.tsx
 * =================
 * Panel que muestra las alertas de seguridad
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/PanelAlertas.tsx
 */

import { Bell, AlertTriangle, Info, CheckCircle, XCircle, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
      className={`p-3 rounded-xl border transition-colors ${
        alerta.leida
          ? 'border-slate-100 bg-slate-50/50 opacity-60'
          : `${config.border} hover:bg-slate-50`
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icono */}
        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
          <Icono className={`w-4 h-4 ${config.color}`} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-medium truncate ${alerta.leida ? 'text-slate-500' : 'text-slate-800'}`}>
              {alerta.titulo}
            </p>
            <span className="text-xs text-slate-400 shrink-0">
              {formatearFecha(alerta.createdAt)}
            </span>
          </div>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {alerta.descripcion}
          </p>
        </div>

        {/* Botón marcar como leída */}
        {!alerta.leida && (
          <button
            onClick={handleMarcarLeida}
            className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
            title="Marcar como leída"
          >
            <Check className="w-4 h-4" />
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
  const navigate = useNavigate();
  const listaAlertas = alertas?.alertas ?? [];
  const noLeidas = alertas?.noLeidas ?? 0;

  return (
    <div className={`bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl border-2 border-slate-300 p-4 lg:p-3.5 2xl:p-4 ${!vistaMobil && 'max-h-[400px]'} flex flex-col shadow-lg hover:shadow-2xl hover:scale-[1.02] lg:hover:scale-[1.03] 2xl:hover:scale-[1.03] hover:-translate-y-1 transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center relative">
            <Bell className="w-4 h-4 text-rose-500" />
            {noLeidas > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-medium">
                {noLeidas > 9 ? '9+' : noLeidas}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Alertas</h3>
            <p className="text-xs text-slate-500">
              {noLeidas > 0 ? `${noLeidas} sin leer` : 'Al día'}
            </p>
          </div>
        </div>

        {/* Badge estado */}
        {noLeidas === 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Todo bien</span>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className={`flex-1 space-y-2 ${!vistaMobil && 'overflow-y-auto'}`}>
        {listaAlertas.length > 0 ? (
          listaAlertas.map((alerta) => (
            <ItemAlerta key={alerta.id} alerta={alerta} />
          ))
        ) : (
          /* Estado vacío */
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-400">
            <CheckCircle className="w-8 h-8 mb-2 text-emerald-400" />
            <p className="text-sm text-emerald-600">Sin alertas pendientes</p>
          </div>
        )}
      </div>

      {/* Botón Ver Todas */}
      {listaAlertas.length > 0 && (
        <button
          onClick={() => navigate('/business-studio/alertas')}
          className="mt-3 w-full py-2 text-sm text-rose-600 hover:text-rose-700 font-medium hover:bg-rose-50 rounded-lg transition-colors"
        >
          Ver todas las alertas →
        </button>
      )}
    </div>
  );
}