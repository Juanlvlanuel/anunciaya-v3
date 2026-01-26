/**
 * BannerAlertasUrgentes.tsx
 * ==========================
 * Banner horizontal que muestra alertas urgentes (no leídas)
 * Solo se muestra en móvil cuando hay alertas pendientes
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/BannerAlertasUrgentes.tsx
 * 
 * CARACTERÍSTICAS:
 * - Muestra máximo 2 alertas visibles
 * - Si hay más, muestra "y X más"
 * - Click en alerta para marcar como leída
 * - Colores según severidad (alta, media, baja)
 * - Botón para marcar todas como leídas
 */

import { AlertTriangle, XCircle, Info, Check, ChevronRight } from 'lucide-react';
import { useDashboardStore } from '../../../../../stores/useDashboardStore';
import { useNavigate } from 'react-router-dom';
import type { Alerta } from '../../../../../services/dashboardService';

// =============================================================================
// TIPOS
// =============================================================================

interface BannerAlertasUrgentesProps {
  alertas: Alerta[];
}

// =============================================================================
// HELPERS
// =============================================================================

function getConfigSeveridad(severidad: string) {
  switch (severidad) {
    case 'alta':
      return {
        icon: XCircle,
        bg: 'bg-rose-50',
        border: 'border-rose-200',
        text: 'text-rose-800',
        iconColor: 'text-rose-500',
        badge: 'bg-rose-500',
      };
    case 'media':
      return {
        icon: AlertTriangle,
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        iconColor: 'text-amber-500',
        badge: 'bg-amber-500',
      };
    case 'baja':
      return {
        icon: Info,
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        iconColor: 'text-blue-500',
        badge: 'bg-blue-500',
      };
    default:
      return {
        icon: Info,
        bg: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-800',
        iconColor: 'text-slate-500',
        badge: 'bg-slate-500',
      };
  }
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function BannerAlertasUrgentes({ alertas }: BannerAlertasUrgentesProps) {
  const { marcarAlertaLeida, marcarTodasAlertasLeidas } = useDashboardStore();
  const navigate = useNavigate();

  if (!alertas.length) return null;

  // Tomar solo las 2 primeras alertas para mostrar
  const alertasVisibles = alertas.slice(0, 2);
  const alertasRestantes = alertas.length - alertasVisibles.length;

  // Determinar severidad más alta (para el badge)
  const severidadMasAlta = alertas.some(a => a.severidad === 'alta') 
    ? 'alta' 
    : alertas.some(a => a.severidad === 'media') 
    ? 'media' 
    : 'baja';

  const config = getConfigSeveridad(severidadMasAlta);
  const Icono = config.icon;

  const handleMarcarLeida = (alertaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    marcarAlertaLeida(alertaId);
  };

  const handleMarcarTodasLeidas = (e: React.MouseEvent) => {
    e.stopPropagation();
    marcarTodasAlertasLeidas();
  };

  const handleVerTodas = () => {
    navigate('/business-studio/alertas');
  };

  return (
    <div 
      className={`${config.bg} ${config.border} border-2 rounded-xl p-3 shadow-lg animate-in slide-in-from-top duration-300`}
      role="alert"
    >
      {/* Header del Banner */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center relative`}>
            <Icono className={`w-4 h-4 ${config.iconColor}`} />
            <span className={`absolute -top-1 -right-1 w-5 h-5 ${config.badge} text-white text-xs font-bold rounded-full flex items-center justify-center`}>
              {alertas.length}
            </span>
          </div>
          <div>
            <p className={`text-sm font-bold ${config.text}`}>
              {alertas.length === 1 ? 'Alerta Pendiente' : `${alertas.length} Alertas Pendientes`}
            </p>
            <p className="text-xs text-slate-500">
              {severidadMasAlta === 'alta' ? 'Requiere atención inmediata' : 'Revisa cuando puedas'}
            </p>
          </div>
        </div>

        {/* Botón Marcar Todas como Leídas */}
        <button
          onClick={handleMarcarTodasLeidas}
          className="p-1.5 rounded-lg hover:bg-white/50 text-slate-500 hover:text-emerald-600 transition-colors"
          title="Marcar todas como leídas"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>

      {/* Lista de Alertas Visibles */}
      <div className="space-y-2">
        {alertasVisibles.map((alerta) => {
          const alertaConfig = getConfigSeveridad(alerta.severidad);
          const AlertaIcono = alertaConfig.icon;

          return (
            <div
              key={alerta.id}
              className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
            >
              {/* Icono de la alerta */}
              <div className={`w-6 h-6 rounded-md ${alertaConfig.bg} flex items-center justify-center shrink-0`}>
                <AlertaIcono className={`w-3.5 h-3.5 ${alertaConfig.iconColor}`} />
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {alerta.titulo}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {alerta.descripcion}
                </p>
              </div>

              {/* Botón Marcar como Leída */}
              <button
                onClick={(e) => handleMarcarLeida(alerta.id, e)}
                className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-500 transition-colors shrink-0"
                title="Marcar como leída"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer - Ver todas / Alertas restantes */}
      {(alertasRestantes > 0 || alertas.length > 0) && (
        <button
          onClick={handleVerTodas}
          className={`mt-2 w-full py-2 rounded-lg ${config.text} hover:bg-white/50 font-medium text-sm flex items-center justify-center gap-1 transition-colors`}
        >
          {alertasRestantes > 0 ? (
            <>Ver {alertasRestantes} más <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>Ver todas las alertas <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      )}
    </div>
  );
}