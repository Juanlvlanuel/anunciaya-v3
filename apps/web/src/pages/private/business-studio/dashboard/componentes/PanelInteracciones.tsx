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
      return { icon: Users, bg: 'bg-slate-100', color: 'text-slate-600' };
  }
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function PanelInteracciones({ interacciones, vistaMobil = false }: PanelInteraccionesProps) {
  return (
    <div className={`bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 p-4 lg:p-3 2xl:p-4 ${!vistaMobil ? 'max-h-[270px] lg:max-h-[230px] 2xl:max-h-[340px]' : ''} flex flex-col shadow-md`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 lg:mb-2 2xl:mb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Users className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4 text-indigo-600" />
        </div>
        <h3 className="font-bold text-base lg:text-sm 2xl:text-base text-slate-800">Actividad Reciente</h3>
      </div>

      {/* Lista */}
      <div className={`flex-1 space-y-2 lg:space-y-1.5 2xl:space-y-2 ${!vistaMobil && 'overflow-y-auto'}`}>
        {interacciones.length > 0 ? (
          interacciones.slice(0, 20).map((interaccion, index) => {
            const { icon: Icono, bg, color } = getIconoInteraccion(interaccion.tipo);

            return (
              <div
                key={`${interaccion.tipo}-${interaccion.id}-${index}`}
                className="flex items-center gap-3 lg:gap-2 2xl:gap-3 p-2.5 lg:p-2 2xl:p-2.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                {/* Avatar o Icono */}
                {interaccion.avatar ? (
                  <img
                    src={interaccion.avatar}
                    alt={interaccion.titulo}
                    className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className={`w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                    {interaccion.tipo === 'compartido' ? (
                      <Icono className={`w-4 h-4 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4 ${color}`} />
                    ) : (
                      <User className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-4 2xl:h-4 text-slate-600" />
                    )}
                  </div>
                )}

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm lg:text-xs 2xl:text-sm text-slate-800 font-semibold truncate">
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
            <p className="text-sm lg:text-xs 2xl:text-sm font-medium">Sin Actividad Reciente</p>
          </div>
        )}
      </div>
    </div>
  );
}