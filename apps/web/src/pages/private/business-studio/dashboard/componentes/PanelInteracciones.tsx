/**
 * PanelInteracciones.tsx
 * =======================
 * Panel de actividad reciente con estilo alineado al panel de Notificaciones:
 * avatar con gradient + iniciales, nombre en indigo, acción en negro,
 * detalle opcional en gris y timestamp en azul.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/PanelInteracciones.tsx
 *
 * TIPOS DE INTERACCIÓN:
 * - venta: Cliente realizó una compra
 * - cupon_canjeado: Cliente canjeó un cupón
 * - like: Cliente dio like al negocio
 * - nuevo_seguidor: Cliente comenzó a seguir el negocio
 * - resena: Cliente dejó una reseña
 * - compartido: Alguien compartió el negocio
 */

import { Users, ShoppingCart, Ticket, Heart, Bell, Share2, Star, User } from 'lucide-react';
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

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatearTiempo(fecha: string): string {
  const ahora = new Date();
  const fechaInteraccion = new Date(fecha);
  const diffMs = ahora.getTime() - fechaInteraccion.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMin / 60);
  const diffDias = Math.floor(diffHoras / 24);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `${diffMin} min`;
  if (diffHoras < 24) return `${diffHoras} h`;
  if (diffDias < 7) return `${diffDias} días`;

  const dia = String(fechaInteraccion.getDate()).padStart(2, '0');
  const mes = MESES_LARGOS[fechaInteraccion.getMonth()];
  const anio = fechaInteraccion.getFullYear();
  return `${dia} ${mes} ${anio}`;
}

function obtenerIniciales(nombre: string): string {
  if (!nombre) return '?';
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

type EstiloTipo = {
  icon: typeof ShoppingCart;
  gradiente: string;
  gradienteBadge: string;
};

function getEstiloTipo(tipo: Interaccion['tipo']): EstiloTipo {
  switch (tipo) {
    case 'venta':
      return {
        icon: ShoppingCart,
        gradiente: 'linear-gradient(135deg, #34d399, #059669)',
        gradienteBadge: 'linear-gradient(135deg, #059669, #047857)',
      };
    case 'cupon_canjeado':
      return {
        icon: Ticket,
        gradiente: 'linear-gradient(135deg, #f472b6, #db2777)',
        gradienteBadge: 'linear-gradient(135deg, #db2777, #be185d)',
      };
    case 'like':
      return {
        icon: Heart,
        gradiente: 'linear-gradient(135deg, #fb7185, #e11d48)',
        gradienteBadge: 'linear-gradient(135deg, #e11d48, #be123c)',
      };
    case 'nuevo_seguidor':
      return {
        icon: Bell,
        gradiente: 'linear-gradient(135deg, #60a5fa, #2563eb)',
        gradienteBadge: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      };
    case 'resena':
      return {
        icon: Star,
        gradiente: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
        gradienteBadge: 'linear-gradient(135deg, #f59e0b, #b45309)',
      };
    case 'compartido':
      return {
        icon: Share2,
        gradiente: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
        gradienteBadge: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
      };
    default:
      return {
        icon: Users,
        gradiente: 'linear-gradient(135deg, #94a3b8, #475569)',
        gradienteBadge: 'linear-gradient(135deg, #475569, #334155)',
      };
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
      <div className={`flex-1 ${!vistaMobil && 'overflow-y-auto'} divide-y-[1.5px] divide-slate-300`}>
        {interacciones.length > 0 ? (
          interacciones.slice(0, 20).map((interaccion, index) => {
            const estilo = getEstiloTipo(interaccion.tipo);
            const Icono = estilo.icon;
            const esResena = interaccion.tipo === 'resena';
            const rating = interaccion.rating ?? null;
            const detalle = interaccion.detalle ?? null;
            const iniciales = obtenerIniciales(interaccion.titulo);

            return (
              <div
                key={`${interaccion.tipo}-${interaccion.id}-${index}`}
                className="group flex items-start gap-3 lg:gap-2.5 2xl:gap-3 px-3 lg:px-3 2xl:px-3.5 py-3 lg:py-2.5 2xl:py-3 hover:bg-slate-50 transition-colors"
              >
                {/* Avatar con gradient + badge del tipo */}
                <div className="relative shrink-0">
                  <div
                    className="w-14 h-14 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full overflow-hidden flex items-center justify-center shadow-md"
                    style={{ background: estilo.gradiente }}
                  >
                    {interaccion.avatar ? (
                      <img src={interaccion.avatar} alt={interaccion.titulo} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-lg lg:text-sm 2xl:text-base tracking-tight">
                        {iniciales}
                      </span>
                    )}
                  </div>
                  <div
                    className="absolute -bottom-1 -right-1 w-7 h-7 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm"
                    style={{ background: estilo.gradienteBadge }}
                  >
                    <Icono className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 text-white" strokeWidth={2.5} />
                  </div>
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  {/* Nombre en blue-800 bold — mismo estilo que PanelNotificaciones */}
                  <p className="text-base lg:text-sm 2xl:text-base font-bold text-blue-800 truncate leading-tight">
                    {interaccion.titulo}
                  </p>

                  {/* Acción (desc) + rating para reseñas */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-sm lg:text-[13px] 2xl:text-sm font-bold text-slate-900 truncate">
                      {interaccion.descripcion}
                    </p>
                    {esResena && rating != null && rating > 0 && (
                      <div className="flex items-center gap-px shrink-0">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5 ${
                              n <= rating ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'
                            }`}
                            strokeWidth={0}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Detalle opcional en gris */}
                  {detalle && (
                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium truncate mt-0.5">
                      {detalle}
                    </p>
                  )}
                </div>

                {/* Timestamp a la derecha del item */}
                <span className="shrink-0 text-sm lg:text-[11px] 2xl:text-sm font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                  {formatearTiempo(interaccion.createdAt)}
                </span>
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
