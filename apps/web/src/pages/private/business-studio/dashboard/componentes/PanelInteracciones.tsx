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
      return { icon: ShoppingCart, bg: 'bg-emerald-50', color: 'text-emerald-500' };
    case 'cupon_canjeado':
      return { icon: Ticket, bg: 'bg-amber-50', color: 'text-amber-500' };
    case 'like':
      return { icon: Heart, bg: 'bg-rose-50', color: 'text-rose-500' };
    case 'nuevo_seguidor':
      return { icon: Bell, bg: 'bg-blue-50', color: 'text-blue-500' };
    case 'compartido':
      return { icon: Share2, bg: 'bg-purple-50', color: 'text-purple-500' };
    default:
      return { icon: Users, bg: 'bg-slate-50', color: 'text-slate-500' };
  }
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function PanelInteracciones({ interacciones, vistaMobil = false }: PanelInteraccionesProps) {
  return (
    <div className={`bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl border-2 border-slate-300 p-4 lg:p-3.5 2xl:p-4 ${!vistaMobil && 'max-h-[400px]'} flex flex-col shadow-lg hover:shadow-2xl hover:scale-[1.02] lg:hover:scale-[1.03] 2xl:hover:scale-[1.03] hover:-translate-y-1 transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Users className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Interacciones</h3>
          <p className="text-xs text-slate-500">Actividad de clientes</p>
        </div>
      </div>

      {/* Lista */}
      <div className={`flex-1 space-y-3 ${!vistaMobil && 'overflow-y-auto'}`}>
        {interacciones.length > 0 ? (
          interacciones.map((interaccion, index) => {
            const { icon: Icono, bg, color } = getIconoInteraccion(interaccion.tipo);

            return (
              <div
                key={`${interaccion.tipo}-${interaccion.id}-${index}`}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {/* Avatar o Icono */}
                {interaccion.avatar ? (
                  <img
                    src={interaccion.avatar}
                    alt={interaccion.titulo}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                    {interaccion.tipo === 'compartido' ? (
                      <Icono className={`w-4 h-4 ${color}`} />
                    ) : (
                      <User className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                )}

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 font-medium truncate">
                    {interaccion.titulo}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {interaccion.descripcion}
                  </p>
                </div>

                {/* Icono tipo + Tiempo */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-6 h-6 rounded-md ${bg} flex items-center justify-center`}>
                    <Icono className={`w-3 h-3 ${color}`} />
                  </div>
                  <span className="text-xs text-slate-400 w-8 text-right">
                    {formatearTiempo(interaccion.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          /* Estado vacío */
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-400">
            <Users className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Sin interacciones recientes</p>
          </div>
        )}
      </div>
    </div>
  );
}