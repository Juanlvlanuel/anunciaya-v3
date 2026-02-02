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
      className={`bg-white rounded-xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5 ${
        !recompensa.activa ? 'opacity-50' : ''
      }`}
      style={{ border: '2.5px solid #dde4ef', boxShadow: '0 3px 10px rgba(0,0,0,0.07)' }}
    >
      {/* Imagen */}
      <div
        className="w-full h-24 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' }}
      >
        {recompensa.imagenUrl ? (
          <img src={recompensa.imagenUrl} alt={recompensa.nombre} className="w-full h-full object-cover" />
        ) : (
          <Gift className="w-7 h-7 text-indigo-400 opacity-60" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 p-3 flex flex-col min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h4 className="text-[13.5px] font-extrabold text-slate-800 truncate flex-1">
            {recompensa.nombre}
          </h4>
          {stockAgotado && (
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <AlertCircle className="w-2.5 h-2.5" /> Agotado
            </span>
          )}
        </div>
        {recompensa.descripcion && (
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{recompensa.descripcion}</p>
        )}

        {/* Pills + acciones */}
        <div className="mt-auto pt-2">
          <div className="flex gap-1.5 flex-wrap mb-2">
            <span
              className="text-[10.5px] font-bold px-2 py-0.5 rounded"
              style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', color: '#4338ca' }}
            >
              {recompensa.puntosRequeridos} pts
            </span>
            <span
              className="text-[10.5px] font-bold px-2 py-0.5 rounded flex items-center gap-0.5"
              style={{ background: 'linear-gradient(135deg, #f0fdf4, #bbf7d0)', color: '#166534' }}
            >
              <Package className="w-2.5 h-2.5" />
              {recompensa.stock === null ? '∞' : recompensa.stock}
            </span>
            {recompensa.activa ? (
              <span
                className="text-[10.5px] font-bold px-2 py-0.5 rounded"
                style={{ background: 'linear-gradient(135deg, #dcfce7, #86efac)', color: '#166534' }}
              >
                Activa
              </span>
            ) : (
              <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                Inactiva
              </span>
            )}
          </div>

          {/* Acciones (solo dueños) */}
          {!esGerente && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onToggleActiva(recompensa)}
                className={`w-7 h-4 rounded-full transition-colors relative ${
                  recompensa.activa ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                    recompensa.activa ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <button onClick={() => onEditar(recompensa)} className="p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => onEliminar(recompensa.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}