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
          className={`w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 ${
            star <= rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

function getEmojiPorRating(rating: number): string {
  if (rating === 5) return '🤩';
  if (rating === 4) return '😊';
  if (rating === 3) return '😐';
  if (rating === 2) return '😕';
  return '😞';
}

// =============================================================================
// COMPONENTE
// =============================================================================

export default function PanelOpiniones({ resenas }: PanelOpinionesProps) {
  return (
    <div className="bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl border-2 border-slate-300 p-3 lg:p-2.5 2xl:p-3 max-h-[270px] lg:max-h-[230px] 2xl:max-h-[340px] flex flex-col shadow-lg hover:shadow-2xl transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 lg:mb-1.5 2xl:mb-2">
        <div className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
          <MessageSquare className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-4.5 2xl:h-4.5 text-yellow-600" />
        </div>
        <div>
          <h3 className="font-bold text-base lg:text-sm 2xl:text-base text-slate-800 leading-tight">Reseñas</h3>
          <p className="text-[10px] lg:text-[9px] 2xl:text-[12px] text-slate-500">Opiniones recientes</p>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 space-y-2 lg:space-y-1.5 2xl:space-y-2 overflow-y-auto flex flex-col">
        {resenas.length > 0 ? (
          resenas.map((resena) => (
            <div
              key={resena.id}
              className="p-2 lg:p-1.5 2xl:p-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-all"
            >
              {/* Header de reseña */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  {/* Avatar */}
                  {resena.autor.avatar ? (
                    <img
                      src={resena.autor.avatar}
                      alt={resena.autor.nombre}
                      className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 rounded-full bg-slate-100 flex items-center justify-center">
                      <User className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3 text-slate-400" />
                    </div>
                  )}
                  <span className="text-xs lg:text-[10px] 2xl:text-xs font-medium text-slate-700">
                    {resena.autor.nombre}
                  </span>
                  <RatingStars rating={resena.rating} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] lg:text-[9px] 2xl:text-[10px] text-slate-400">
                    {formatearFecha(resena.createdAt)}
                  </span>
                  <span className="text-sm lg:text-xs 2xl:text-sm">{getEmojiPorRating(resena.rating)}</span>
                </div>
              </div>

              {/* Texto */}
              {resena.texto && (
                <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-600 mt-1 line-clamp-2">
                  {resena.texto}
                </p>
              )}
            </div>
          ))
        ) : (
          /* Estado vacío - centrado */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MessageSquare className="w-8 h-8 lg:w-6 lg:h-6 2xl:w-8 2xl:h-8 mb-1 opacity-50" />
            <p className="text-sm lg:text-xs 2xl:text-sm">Sin Reseñas Recientes</p>
          </div>
        )}
      </div>
    </div>
  );
}