/**
 * CardRecompensa.tsx
 * ===================
 * Card de recompensa estilo CardYA con colores neutros BS.
 *   - Móvil: horizontal (imagen izq + info der)
 *   - Desktop: vertical (imagen con nombre overlay + línea gradiente + info)
 *
 * UBICACIÓN: apps/web/src/pages/private/business-studio/puntos/componentes/CardRecompensa.tsx
 */

import { useState } from 'react';
import { Gift, Edit2, Trash2, AlertCircle, Package, Sparkles, Repeat, Ticket, Users } from 'lucide-react';
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
  // TOGGLE activa/inactiva (solo dueños)
  // ═══════════════════════════════════════════════════════════════════
  const toggle = !esGerente && (
    <label className="group shrink-0" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        name={`toggle-recompensa-${recompensa.id}`}
        checked={recompensa.activa}
        onChange={() => onToggleActiva(recompensa)}
        className="sr-only"
      />
      <div className="relative w-12 h-6 lg:w-10 lg:h-5 cursor-pointer">
        <div className="absolute inset-0 bg-slate-300 group-has-checked:bg-slate-500 rounded-full transition-colors" />
        <div className="absolute top-0.5 left-0.5 w-5 h-5 lg:w-4 lg:h-4 bg-white rounded-full shadow-md transition-transform group-has-checked:translate-x-6 lg:group-has-checked:translate-x-5" />
      </div>
    </label>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════
          MÓVIL: Lista horizontal (< lg)
      ═══════════════════════════════════════════════════════════════ */}
      <div
        onClick={() => !esGerente && onEditar(recompensa)}
        className={`lg:hidden w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-50 transition-colors ${!esGerente ? 'cursor-pointer' : ''} ${!recompensa.activa ? 'opacity-50' : ''}`}
      >
        {/* Imagen */}
        <div
          onClick={(e) => { if (recompensa.imagenUrl) { e.stopPropagation(); setImagenExpandida(true); } }}
          className={`w-[76px] h-[76px] rounded-lg shrink-0 overflow-hidden flex items-center justify-center ${recompensa.imagenUrl ? 'cursor-pointer' : ''}`}
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
        >
          {recompensa.imagenUrl ? (
            <img src={recompensa.imagenUrl} alt={recompensa.nombre} className="w-full h-full object-cover" />
          ) : (
            <Gift className="w-10 h-10 text-slate-500" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base font-bold text-slate-800 truncate">{recompensa.nombre}</span>
            {toggle}
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1.5 flex-wrap">
              {recompensa.tipo !== 'compras_frecuentes' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm font-bold bg-indigo-100 text-indigo-700">
                  <Sparkles className="w-3 h-3" />
                  {recompensa.puntosRequeridos} pts
                </span>
              )}
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm font-bold bg-green-100 text-green-700">
                <Package className="w-3 h-3" />
                {recompensa.stock === null ? '∞' : recompensa.stock}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm font-black bg-amber-100 text-amber-700">
                <Ticket className="w-3 h-3" />
                {recompensa.canjesRealizados}
              </span>
              {recompensa.tipo === 'compras_frecuentes' && recompensa.numeroComprasRequeridas && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm font-bold bg-blue-100 text-blue-700">
                  <Repeat className="w-3 h-3" />
                  {recompensa.numeroComprasRequeridas}
                </span>
              )}
              {recompensa.tipo === 'compras_frecuentes' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm font-bold bg-indigo-100 text-indigo-700">
                  <Users className="w-3 h-3" />
                  {recompensa.clientesActivos}
                </span>
              )}
              {stockAgotado && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-sm font-bold bg-red-100 text-red-700">
                  <AlertCircle className="w-3 h-3" /> Agotado
                </span>
              )}
            </div>
            {!esGerente && (
              <div className="flex items-center gap-3 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); onEliminar(recompensa.id); }} className="cursor-pointer text-red-600">
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP: Card vertical estilo CardYA (>= lg)
      ═══════════════════════════════════════════════════════════════ */}
      <div
        className={`hidden lg:flex bg-white rounded-xl overflow-hidden flex-col shadow-md ${!recompensa.activa ? 'opacity-50' : ''}`}
      >
        {/* Imagen con nombre overlay + acciones */}
        <div
          className="w-full lg:h-32 2xl:h-36 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
        >
          {recompensa.imagenUrl ? (
            <img
              src={recompensa.imagenUrl}
              alt={recompensa.nombre}
              className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform"
              onClick={() => setImagenExpandida(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gift className="lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 text-slate-500" />
            </div>
          )}

          {/* Overlay gradiente abajo */}
          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}
          />

          {/* Nombre sobre la imagen */}
          <div className="absolute bottom-2.5 left-3 right-3">
            <h4
              className="lg:text-base 2xl:text-lg font-bold text-white truncate"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
            >
              {recompensa.nombre}
            </h4>
          </div>

          {/* Toggle activa — arriba derecha */}
          {!esGerente && (
            <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
              {toggle}
            </div>
          )}

          {/* Acciones */}
          {!esGerente && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
              <button
                onClick={() => onEditar(recompensa)}
                className="w-8 h-8 2xl:w-9 2xl:h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-blue-600 cursor-pointer active:scale-95 transition-colors"
              >
                <Edit2 className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
              </button>
              <button
                onClick={() => onEliminar(recompensa.id)}
                className="w-8 h-8 2xl:w-9 2xl:h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-red-600 cursor-pointer active:scale-95 transition-colors"
              >
                <Trash2 className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
              </button>
            </div>
          )}
        </div>

        {/* Línea separadora gradiente */}
        <div
          className="h-1.5 w-full shrink-0"
          style={{ background: 'linear-gradient(to right, #3b82f6, #1e293b)' }}
        />

        {/* Contenido */}
        <div className="flex-1 lg:p-3 2xl:p-3.5 flex flex-col min-w-0">
          {/* Descripción */}
          <p className="lg:text-xs 2xl:text-sm text-slate-600 font-semibold line-clamp-2 leading-relaxed mb-2 2xl:mb-2.5">
            {recompensa.descripcion || 'Sin descripción'}
          </p>

          {/* Stats — grid horizontal */}
          <div className="mt-auto pt-2 2xl:pt-2.5 flex items-stretch divide-x-[1.5px] divide-slate-300">
            {recompensa.tipo !== 'compras_frecuentes' && (
              <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
                <Sparkles className="w-5 h-5 2xl:w-5.5 2xl:h-5.5 text-indigo-600" />
                <span className="lg:text-base 2xl:text-lg font-black text-slate-800">{recompensa.puntosRequeridos}</span>
                <span className="lg:text-xs 2xl:text-sm font-semibold text-slate-600">Puntos</span>
              </div>
            )}
            {recompensa.tipo === 'compras_frecuentes' && recompensa.numeroComprasRequeridas && (
              <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
                <Repeat className="w-5 h-5 2xl:w-5.5 2xl:h-5.5 text-blue-600" />
                <span className="lg:text-base 2xl:text-lg font-black text-slate-800">{recompensa.numeroComprasRequeridas}</span>
                <span className="lg:text-xs 2xl:text-sm font-semibold text-slate-600">Compras</span>
              </div>
            )}
            <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
              <Package className="w-5 h-5 2xl:w-5.5 2xl:h-5.5 text-green-600" />
              <span className="lg:text-base 2xl:text-lg font-black text-slate-800">{recompensa.stock === null ? '∞' : recompensa.stock}</span>
              <span className="lg:text-xs 2xl:text-sm font-semibold text-slate-600">Stock</span>
            </div>
            <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
              <Ticket className={`w-5 h-5 2xl:w-5.5 2xl:h-5.5 text-amber-600 ${recompensa.canjesRealizados > 0 ? 'animate-pulse' : ''}`} style={recompensa.canjesRealizados > 0 ? { animationDuration: '3s' } : undefined} />
              <span className="lg:text-base 2xl:text-lg font-black text-amber-700">{recompensa.canjesRealizados}</span>
              <span className="lg:text-xs 2xl:text-sm font-semibold text-slate-600">Canjes</span>
            </div>
            {recompensa.tipo === 'compras_frecuentes' && (
              <div className="flex-1 flex flex-col items-center gap-0.5 px-2">
                <Users className="w-5 h-5 2xl:w-5.5 2xl:h-5.5 text-indigo-600" />
                <span className="lg:text-base 2xl:text-lg font-black text-slate-800">{recompensa.clientesActivos}</span>
                <span className="lg:text-xs 2xl:text-sm font-semibold text-slate-600">Activos</span>
              </div>
            )}
          </div>
          {stockAgotado && (
            <div className="flex items-center justify-center gap-1 mt-1.5 py-1 rounded-lg bg-red-100">
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              <span className="lg:text-[11px] 2xl:text-xs font-bold text-red-700">Agotado</span>
            </div>
          )}
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
