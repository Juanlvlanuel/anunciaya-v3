/**
 * PanelInteracciones.tsx
 * =======================
 * Panel que muestra las interacciones recientes de clientes
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/PanelInteracciones.tsx
 * 
 * TIPOS DE INTERACCIÓN:
 * - venta: Cliente realizó una compra
 * - cupon_canjeado: Cliente canjeó un cupón
 * - like: Cliente dio like al negocio
 * - nuevo_seguidor: Cliente comenzó a seguir el negocio
 * - compartido: Alguien compartió el negocio
 */

import { Users, ShoppingCart, Ticket, Heart, Bell, Share2, User } from 'lucide-react';
import type { Interaccion } from '../../../../../services/dashboardService';

// =============================================================================
// TIPOS
// =============================================================================

interface PanelInteraccionesProps {
  interacciones: Interaccion[];
  vistaMobil?: boolean;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatearTiempo(fecha: string): string {
  const ahora = new Date();
  const fechaInteraccion = new Date(fecha);
  const diffMs = ahora.getTime() - fechaInteraccion.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMin / 60);
  const diffDias = Math.floor(diffHoras / 24);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHoras < 24) return `${diffHoras}h`;
  if (diffDias < 7) return `${diffDias}d`;
  return fechaInteraccion.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function getIconoInteraccion(tipo: Interaccion['tipo']) {
  switch (tipo) {
    case 'venta':
      return { icon: ShoppingCart, bg: 'bg-emerald-100', color: 'text-emerald-600' };
    case 'cupon_canjeado':
      return { icon: Ticket, bg: 'bg-amber-100', color: 'text-amber-600' };
    case 'like':
      return { icon: Heart, bg: 'bg-rose-100', color: 'text-rose-600' };
    case 'nuevo_seguidor':
      return { icon: Bell, bg: 'bg-blue-100', color: 'text-blue-600' };
    case 'compartido':
      return { icon: Share2, bg: 'bg-purple-100', color: 'text-purple-600' };
    default:
      return { icon: Users, bg: 'bg-slate-200', color: 'text-slate-600' };
  }
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function PanelInteracciones({ interacciones, vistaMobil = false }: PanelInteraccionesProps) {
  return (
    <div className={`bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 ${!vistaMobil ? 'h-full' : ''} flex flex-col shadow-md overflow-hidden`}>
      {/* Header — gradiente oscuro */}
      <div
        className="flex items-center gap-2.5 px-3 lg:px-4 2xl:px-4 py-2 shrink-0"
        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
      >
        <div className="w-7 h-7 lg:w-9 lg:h-9 2xl:w-9 2xl:h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
          <Users className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
        </div>
        <h3 className="font-bold text-base lg:text-sm 2xl:text-base text-white">Actividad Reciente</h3>
      </div>

      {/* Lista */}
      <div className={`flex-1 space-y-2 lg:space-y-1.5 2xl:space-y-2 ${!vistaMobil && 'overflow-y-auto'} p-3 lg:p-2.5 2xl:p-3`}>
        {interacciones.length > 0 ? (
          interacciones.slice(0, 20).map((interaccion, index) => {
            const { icon: Icono, bg, color } = getIconoInteraccion(interaccion.tipo);

            return (
              <div
                key={`${interaccion.tipo}-${interaccion.id}-${index}`}
                className="flex items-center gap-3 lg:gap-2 2xl:gap-3 p-2.5 lg:p-2 2xl:p-2.5 rounded-lg"
              >
                {/* Avatar o Icono */}
                <div className={`w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-full ${interaccion.avatar ? '' : bg} flex items-center justify-center shrink-0 overflow-hidden`}>
                  {interaccion.avatar ? (
                    <img src={interaccion.avatar} alt={interaccion.titulo} className="w-full h-full object-cover" />
                  ) : interaccion.tipo === 'compartido' ? (
                    <Icono className={`w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 ${color}`} />
                  ) : (
                    <User className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-600" />
                  )}
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-800 font-semibold truncate">
                    {interaccion.titulo}
                  </p>
                  <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium truncate">
                    {interaccion.descripcion}
                  </p>
                </div>

                {/* Icono tipo + Tiempo */}
                <div className="flex items-center gap-2 lg:gap-1.5 2xl:gap-2 shrink-0">
                  <div className={`w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 rounded-md ${bg} flex items-center justify-center`}>
                    <Icono className={`w-4 h-4 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4 ${color}`} />
                  </div>
                  <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium whitespace-nowrap">
                    {formatearTiempo(interaccion.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          /* Estado vacío */
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-600">
            <Users className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 mb-2 opacity-50" />
            <p className="text-sm lg:text-[11px] 2xl:text-sm font-medium">Sin Actividad Reciente</p>
          </div>
        )}
      </div>
    </div>
  );
}