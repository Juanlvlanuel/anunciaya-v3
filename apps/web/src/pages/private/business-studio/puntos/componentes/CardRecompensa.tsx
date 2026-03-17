/**
 * CardRecompensa.tsx
 * ===================
 * Card de recompensa:
 *   - Móvil: horizontal (imagen izq + info der) como Catálogo/Ofertas
 *   - Desktop: vertical (imagen arriba + info abajo)
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/puntos/componentes/CardRecompensa.tsx
 */

import { useState } from 'react';
import { Gift, Edit2, Trash2, AlertCircle, Package } from 'lucide-react';
import { ModalImagenes } from '../../../../../components/ui/ModalImagenes';
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
  const [imagenExpandida, setImagenExpandida] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // PILLS compartidas
  // ═══════════════════════════════════════════════════════════════════
  const pills = (
    <div className="flex gap-2 flex-wrap">
      <span
        className="text-sm font-bold px-2.5 lg:px-2 2xl:px-2.5 py-1 lg:py-0.5 2xl:py-1 rounded"
        style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', color: '#4338ca' }}
      >
        {recompensa.puntosRequeridos} pts
      </span>
      <span
        className="text-sm font-bold px-2.5 lg:px-2 2xl:px-2.5 py-1 lg:py-0.5 2xl:py-1 rounded flex items-center gap-0.5"
        style={{ background: 'linear-gradient(135deg, #f0fdf4, #bbf7d0)', color: '#166534' }}
      >
        <Package className="w-3 h-3 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
        {recompensa.stock === null ? '∞' : recompensa.stock}
      </span>
      {stockAgotado && (
        <span className="text-sm font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
          <AlertCircle className="w-3 h-3" /> Agotado
        </span>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════
  // TOGGLE activa/inactiva (solo dueños)
  // ═══════════════════════════════════════════════════════════════════
  const toggle = !esGerente && (
    <label className="group shrink-0" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        checked={recompensa.activa}
        onChange={() => onToggleActiva(recompensa)}
        className="sr-only"
      />
      <div className="relative w-12 h-6 lg:w-10 lg:h-5 cursor-pointer">
        <div className="absolute inset-0 bg-slate-300 group-has-checked:bg-slate-500 rounded-full transition-colors"></div>
        <div className="absolute top-0.5 left-0.5 w-5 h-5 lg:w-4 lg:h-4 bg-white rounded-full shadow-md transition-transform group-has-checked:translate-x-6 lg:group-has-checked:translate-x-5"></div>
      </div>
    </label>
  );

  // ═══════════════════════════════════════════════════════════════════
  // ACCIONES editar/eliminar (solo dueños)
  // ═══════════════════════════════════════════════════════════════════
  const acciones = !esGerente && (
    <div className="flex items-center gap-3 shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); onEditar(recompensa); }}
        className="cursor-pointer text-blue-600"
      >
        <Edit2 className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onEliminar(recompensa.id); }}
        className="cursor-pointer text-red-600"
      >
        <Trash2 className="w-6 h-6" />
      </button>
    </div>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          MÓVIL: Card horizontal (como Catálogo/Ofertas)
      ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`lg:hidden w-full flex items-center gap-3 p-3 h-28 rounded-xl bg-white border-2 border-slate-300 text-left overflow-hidden ${!recompensa.activa ? 'opacity-50' : ''}`}
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
      >
        {/* Imagen — tamaño fijo */}
        <div
          onClick={() => recompensa.imagenUrl && setImagenExpandida(true)}
          className={`w-20 h-20 rounded-lg shrink-0 overflow-hidden flex items-center justify-center ${recompensa.imagenUrl ? 'cursor-pointer' : ''}`}
          style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' }}
        >
          {recompensa.imagenUrl ? (
            <img src={recompensa.imagenUrl} alt={recompensa.nombre} className="w-full h-full object-cover" />
          ) : (
            <Gift className="w-6 h-6 text-indigo-400 opacity-60" />
          )}
        </div>

        {/* Info — altura fija, sin crecer */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-20">
          {/* Nombre + Toggle */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-bold text-slate-800 truncate">{recompensa.nombre}</span>
            {toggle}
          </div>

          {/* Pills + Acciones */}
          <div className="flex items-center justify-between gap-2">
            {pills}
            {acciones}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP: Card vertical (original)
      ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`hidden lg:flex bg-white rounded-xl overflow-hidden flex-col border-2 border-slate-300 ${!recompensa.activa ? 'opacity-50' : ''}`}
        style={{ boxShadow: '0 3px 10px rgba(0,0,0,0.07)' }}
      >
        {/* Imagen con acciones superpuestas */}
        <div
          className="w-full lg:h-32 2xl:h-36 flex items-center justify-center relative"
          style={{ background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)' }}
        >
          {recompensa.imagenUrl ? (
            <img src={recompensa.imagenUrl} alt={recompensa.nombre} className="w-full h-full object-cover" />
          ) : (
            <Gift className="lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 text-indigo-400 opacity-60" />
          )}

          {!esGerente && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                <button
                  onClick={() => onEditar(recompensa)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-blue-600 cursor-pointer active:scale-95 transition-colors"
                >
                  <Edit2 className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={() => onEliminar(recompensa.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-red-600 cursor-pointer active:scale-95 transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 lg:p-3.5 2xl:p-4 flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="lg:text-[14px] 2xl:text-[15px] font-bold text-slate-800 truncate flex-1">
              {recompensa.nombre}
            </h4>
            {!esGerente && (
              <label className="group shrink-0">
                <input
                  type="checkbox"
                  checked={recompensa.activa}
                  onChange={() => onToggleActiva(recompensa)}
                  className="sr-only"
                />
                <div className="relative w-12 h-6 lg:w-10 lg:h-5 cursor-pointer">
                  <div className="absolute inset-0 bg-slate-300 group-has-checked:bg-slate-500 rounded-full transition-colors"></div>
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 lg:w-4 lg:h-4 bg-white rounded-full shadow-md transition-transform group-has-checked:translate-x-6 lg:group-has-checked:translate-x-5"></div>
                </div>
              </label>
            )}
            {stockAgotado && (
              <span className="text-sm font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <AlertCircle className="lg:w-2.5 lg:h-2.5 2xl:w-3 2xl:h-3" /> Agotado
              </span>
            )}
          </div>
          {recompensa.descripcion && (
            <p className="text-sm text-slate-600 font-medium mt-0.5 truncate">{recompensa.descripcion}</p>
          )}

          <div className="mt-auto pt-2.5 2xl:pt-3">
            <div className="flex gap-2 flex-wrap">
              <span
                className="text-sm font-bold lg:px-2 2xl:px-2.5 lg:py-0.5 2xl:py-1 rounded"
                style={{ background: 'linear-gradient(135deg, #eef2ff, #c7d2fe)', color: '#4338ca' }}
              >
                {recompensa.puntosRequeridos} pts
              </span>
              <span
                className="text-sm font-bold lg:px-2 2xl:px-2.5 lg:py-0.5 2xl:py-1 rounded flex items-center gap-0.5"
                style={{ background: 'linear-gradient(135deg, #f0fdf4, #bbf7d0)', color: '#166534' }}
              >
                <Package className="lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" />
                {recompensa.stock === null ? '∞' : recompensa.stock}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal imagen expandida */}
      {recompensa.imagenUrl && (
        <ModalImagenes
          images={[recompensa.imagenUrl]}
          isOpen={imagenExpandida}
          onClose={() => setImagenExpandida(false)}
        />
      )}
    </>
  );
}
