/**
 * ModalConfirmarCanje.tsx
 * ========================
 * Modal de confirmación antes de canjear una recompensa.
 * Estilo premium consistente con CardYA.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/ModalConfirmarCanje.tsx
 */

import { useState } from 'react';
import { X, Gift, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import type { RecompensaDisponible } from '../../../../types/cardya';

export default function ModalConfirmarCanje({
  abierto,
  onCerrar,
  recompensa,
  puntosActuales,
  onConfirmar,
}: {
  abierto: boolean;
  onCerrar: () => void;
  recompensa: RecompensaDisponible | null;
  puntosActuales: number;
  onConfirmar: () => Promise<void>;
}) {
  const [canjeando, setCanjeando] = useState(false);

  if (!abierto || !recompensa) return null;

  const puntosRestantes = puntosActuales - recompensa.puntosRequeridos;

  const handleConfirmar = async () => {
    if (canjeando) return;
    setCanjeando(true);
    try {
      await onConfirmar();
    } catch (error) {
      console.error('Error al canjear:', error);
      setCanjeando(false);
    }
  };

  return (
    <ModalAdaptativo 
      abierto={abierto} 
      onCerrar={onCerrar} 
      ancho="sm" 
      mostrarHeader={false}
      paddingContenido="none"
      className="lg:max-w-xs 2xl:max-w-md"
    >
      {/* ── Header dark ── */}
      <div
        className="relative overflow-hidden px-5 lg:px-4 2xl:px-5 py-5 lg:py-4 2xl:py-5"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
      >
        {/* Grid sutil */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.03,
            backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                             repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
          }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
            <div
              className="w-10 h-10 lg:w-9 lg:h-9 2xl:w-10 2xl:h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base lg:text-sm 2xl:text-base font-bold text-white">Confirmar Canje</h2>
              <p className="text-xs lg:text-[10px] 2xl:text-xs text-white/40 font-medium">Revisa los detalles</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            disabled={canjeando}
            className="w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="p-5 lg:p-4 2xl:p-5">

        {/* Recompensa: imagen + info */}
        <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3 mb-4 lg:mb-3 2xl:mb-4">
          {recompensa.imagenUrl ? (
            <div
              className="w-16 h-16 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16 rounded-xl overflow-hidden shrink-0"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <img
                src={recompensa.imagenUrl}
                alt={recompensa.nombre}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
            >
              <Gift className="w-7 h-7 lg:w-6 lg:h-6 2xl:w-7 2xl:h-7 text-amber-500/40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800 truncate">{recompensa.nombre}</h3>
            {recompensa.descripcion && (
              <p className="text-[12px] lg:text-[11px] 2xl:text-[12px] text-slate-500 line-clamp-1">{recompensa.descripcion}</p>
            )}
            <p className="text-[11px] lg:text-[10px] 2xl:text-[11px] text-slate-400 font-medium mt-0.5">{recompensa.negocioNombre}</p>
          </div>
        </div>

        {/* Resumen de puntos */}
        <div
          className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-4 lg:p-3 2xl:p-4 mb-3 lg:mb-2.5 2xl:mb-3"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
        >
          <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[13px] lg:text-[12px] 2xl:text-[13px] text-slate-500 font-medium">Puntos actuales</span>
              <span className="text-[13px] lg:text-[12px] 2xl:text-[13px] font-bold text-slate-800">{puntosActuales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] lg:text-[12px] 2xl:text-[13px] text-slate-500 font-medium">Costo de recompensa</span>
              <span className="text-[13px] lg:text-[12px] 2xl:text-[13px] font-bold text-rose-600">
                -{recompensa.puntosRequeridos.toLocaleString()}
              </span>
            </div>
            <div
              className="pt-2 lg:pt-1.5 2xl:pt-2 flex justify-between items-center"
              style={{ borderTop: '1px solid #e2e8f0' }}
            >
              <span className="text-sm lg:text-[13px] 2xl:text-sm text-slate-700 font-bold">Puntos restantes</span>
              <span className="text-lg lg:text-base 2xl:text-lg font-black text-slate-800">
                {puntosRestantes.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Advertencia */}
        <div
          className="flex items-start gap-2 p-3 lg:p-2.5 2xl:p-3 rounded-lg mb-4 lg:mb-3 2xl:mb-4"
          style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a' }}
        >
          <AlertCircle className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.5} />
          <p className="text-[11px] lg:text-[10px] 2xl:text-[11px] text-amber-700 font-medium leading-relaxed">
            Una vez canjeado, recibirás un voucher digital. Los puntos no son reembolsables.
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3 lg:gap-2.5 2xl:gap-3">
          <button
            onClick={onCerrar}
            disabled={canjeando}
            className="flex-1 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-[13px] lg:text-[12px] 2xl:text-[13px] text-slate-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            style={{ border: '1.5px solid #e2e8f0' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={canjeando}
            className="flex-1 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-[13px] lg:text-[12px] 2xl:text-[13px] text-white transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98]"
            style={{
              background: canjeando
                ? 'linear-gradient(135deg, #64748b, #475569)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              boxShadow: canjeando ? 'none' : '0 4px 12px rgba(245, 158, 11, 0.3)',
            }}
          >
            {canjeando ? (
              <>
                <Loader2 className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 animate-spin" />
                Canjeando...
              </>
            ) : (
              <>
                Confirmar
                <ArrowRight className="w-3.5 h-3.5 lg:w-3 lg:h-3 2xl:w-3.5 2xl:h-3.5" strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </div>
    </ModalAdaptativo>
  );
}