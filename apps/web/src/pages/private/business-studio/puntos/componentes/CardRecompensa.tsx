/**
 * CardRecompensa.tsx
 * ===================
 * Card vertical individual de una recompensa en el grid.
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/puntos/componentes/CardRecompensa.tsx
 *
 * Props:
 *   recompensa     → objeto Recompensa del store
 *   onEditar       → abre modal en modo edición
 *   onEliminar     → ejecuta eliminar con confirmación (manejo en padre)
 *   onToggleActiva → toggle activa/inactiva con optimistic update (manejo en padre)
 *   esGerente      → oculta acciones si es gerente
 */

import { Gift, Edit2, Trash2, AlertCircle, Package } from 'lucide-react';
import type { Recompensa } from '../../../../../types/puntos';

export default function CardRecompensa({
  recompensa,
  onEditar,
  onEliminar,
  onToggleActiva,
  esGerente,
}: {
  recompensa: Recompensa;
  onEditar: (r: Recompensa) => void;
  onEliminar: (id: string) => void;
  onToggleActiva: (r: Recompensa) => void;
  esGerente: boolean;
}) {
  const stockAgotado = recompensa.stock !== null && recompensa.stock === 0;

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 ${!recompensa.activa ? 'opacity-50' : ''
        }`}
      style={{ border: '2.5px solid #dde4ef', boxShadow: '0 3px 10px rgba(0,0,0,0.07)' }}
    >
      {/* Imagen con acciones superpuestas */}
      <div
        className="w-full h-32 lg:h-32 2xl:h-36 flex items-center justify-center relative"
        style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' }}
      >
        {recompensa.imagenUrl ? (
          <img src={recompensa.imagenUrl} alt={recompensa.nombre} className="w-full h-full object-cover" />
        ) : (
          <Gift className="w-9 h-9 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 text-indigo-400 opacity-60" />
        )}

        {/* Acciones sobre la imagen (solo dueños) */}
        {!esGerente && (
          <>
            {/* Toggle arriba-derecha */}
            <button
              onClick={() => onToggleActiva(recompensa)}
              className={`absolute top-2 right-2 lg:top-2 lg:right-2 w-10 h-5.5 lg:w-9 lg:h-5 2xl:w-10 2xl:h-5.5 rounded-full cursor-pointer transition-colors border-2 border-white ${recompensa.activa ? 'bg-green-500' : 'bg-slate-300'
                }`}
              style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
            >
              <div
                className={`absolute top-0.5 w-4.5 h-4.5 lg:w-4 lg:h-4 2xl:w-4.5 2xl:h-4.5 rounded-full bg-white shadow transition-transform ${recompensa.activa ? 'translate-x-4.5 lg:translate-x-4 2xl:translate-x-4.5' : 'translate-x-0.5'
                  }`}
              />
            </button>

            {/* Editar + Borrar abajo-derecha */}
            <div className="absolute bottom-2 right-2 lg:bottom-2 lg:right-2 flex items-center gap-2 lg:gap-1.5">
              <button
                onClick={() => onEditar(recompensa)}
                className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-white/90 flex items-center justify-center text-slate-600 hover:text-blue-600 cursor-pointer transition-colors" style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
              >
                <Edit2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
              </button>
              <button
                onClick={() => onEliminar(recompensa.id)}
                className="w-8 h-8 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 rounded-lg bg-white/90 flex items-center justify-center text-slate-600 hover:text-red-500 cursor-pointer transition-colors"
                style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
              >
                <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-3.5 lg:p-3.5 2xl:p-4 flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="text-[15px] lg:text-[14px] 2xl:text-[15px] font-extrabold text-slate-800 truncate flex-1">
            {recompensa.nombre}
          </h4>
          {stockAgotado && (
            <span className="text-[11px] lg:text-[10.5px] 2xl:text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <AlertCircle className="w-3 h-3 lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3" /> Agotado
            </span>
          )}
        </div>
        {recompensa.descripcion && (
          <p className="text-[12.5px] lg:text-[12px] 2xl:text-[12.5px] text-slate-500 mt-0.5 truncate">{recompensa.descripcion}</p>
        )}

        {/* Pills: solo puntos y stock */}
        <div className="mt-auto pt-2.5 lg:pt-2.5 2xl:pt-3">
          <div className="flex gap-2 lg:gap-2 2xl:gap-2 flex-wrap">
            <span
              className="text-[12px] lg:text-[11.5px] 2xl:text-[12px] font-bold px-2.5 lg:px-2.5 2xl:px-3 py-1 lg:py-0.5 2xl:py-1 rounded"
              style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', color: '#4338ca' }}
            >
              {recompensa.puntosRequeridos} pts
            </span>
            <span
              className="text-[12px] lg:text-[11.5px] 2xl:text-[12px] font-bold px-2.5 lg:px-2.5 2xl:px-3 py-1 lg:py-0.5 2xl:py-1 rounded flex items-center gap-0.5"
              style={{ background: 'linear-gradient(135deg, #f0fdf4, #bbf7d0)', color: '#166534' }}
            >
              <Package className="w-3 h-3 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
              {recompensa.stock === null ? '∞' : recompensa.stock}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}