/**
 * PanelOpiniones.tsx
 * ===================
 * Panel que muestra las reseñas recientes
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/dashboard/componentes/PanelOpiniones.tsx
 */

import { MessageSquare, Star, User } from 'lucide-react';
import type { Resena } from '../../../../../services/dashboardService';

// =============================================================================
// TIPOS
// =============================================================================

interface PanelOpinionesProps {
  resenas: Resena[];
}

// =============================================================================
// HELPERS
// =============================================================================

function formatearFecha(fecha: string): string {
  const fechaResena = new Date(fecha);
  const ahora = new Date();
  const diffDias = Math.floor((ahora.getTime() - fechaResena.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'Hoy';
  if (diffDias === 1) return 'Ayer';
  if (diffDias < 7) return `Hace ${diffDias}d`;
  return fechaResena.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-3.5 h-3.5 ${
            star <= rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function PanelOpiniones({ resenas }: PanelOpinionesProps) {
  return (
    <div className="bg-white rounded-2xl lg:rounded-xl 2xl:rounded-2xl border-2 border-slate-300 p-4 lg:p-3.5 2xl:p-4 max-h-[400px] flex flex-col shadow-lg hover:shadow-2xl hover:scale-[1.02] lg:hover:scale-[1.03] 2xl:hover:scale-[1.03] hover:-translate-y-1 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-yellow-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Opiniones</h3>
          <p className="text-xs text-slate-500">Reseñas recientes</p>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {resenas.length > 0 ? (
          resenas.map((resena) => (
            <div
              key={resena.id}
              className="p-3 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all shadow-sm hover:shadow-md"
            >
              {/* Header de reseña */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  {resena.autor.avatar ? (
                    <img
                      src={resena.autor.avatar}
                      alt={resena.autor.nombre}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-slate-700">
                    {resena.autor.nombre}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {formatearFecha(resena.createdAt)}
                </span>
              </div>

              {/* Rating */}
              <RatingStars rating={resena.rating} />

              {/* Texto */}
              {resena.texto && (
                <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                  {resena.texto}
                </p>
              )}
            </div>
          ))
        ) : (
          /* Estado vacío */
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-400">
            <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Sin reseñas recientes</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {resenas.length > 0 && (
        <button className="mt-3 w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded-lg transition-colors">
          Ver todas las reseñas
        </button>
      )}
    </div>
  );
}