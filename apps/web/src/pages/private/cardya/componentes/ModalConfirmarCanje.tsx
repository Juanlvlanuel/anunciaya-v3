/**
 * ModalConfirmarCanje.tsx
 * ========================
 * Modal de confirmación antes de canjear una recompensa.
 * Estilo premium consistente con CardYA.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/ModalConfirmarCanje.tsx
 */

import { useState } from 'react';
import { Gift, AlertCircle, Loader2, ArrowRight, Store } from 'lucide-react';
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

  const esGratis = recompensa.tipo === 'compras_frecuentes' && recompensa.requierePuntos === false;
  const puntosRestantes = esGratis ? puntosActuales : puntosActuales - recompensa.puntosRequeridos;

  const handleConfirmar = async () => {
    if (canjeando) return;
    setCanjeando(true);
    try {
      await onConfirmar();
    } catch (error) {
      console.error('Error al canjear:', error);
    } finally {
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
      sinScrollInterno
      alturaMaxima="xl"
      colorHandle="rgba(255,255,255,0.45)"
      headerOscuro
      className="max-w-xs lg:max-w-sm 2xl:max-w-md"
    >
      <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh] 2xl:max-h-[75vh]">

      {/* ── Header dark ── */}
      <div
        className="relative overflow-hidden px-5 lg:px-4 2xl:px-5 pt-8 pb-4 lg:py-4 2xl:py-5 shrink-0 lg:rounded-t-2xl"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
          <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white">Confirmar Canje</h2>
            <p className="text-sm lg:text-[11px] 2xl:text-sm text-amber-400/80 font-bold tracking-wide">Revisa los detalles</p>
          </div>
        </div>
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-y-auto p-5 lg:p-4 2xl:p-5">

        {/* Recompensa: imagen + info */}
        <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3 mb-4 lg:mb-3 2xl:mb-4">
          {recompensa.imagenUrl ? (
            <div
              className="w-16 h-16 lg:w-14 lg:h-14 2xl:w-16 2xl:h-16 rounded-xl overflow-hidden shrink-0"
              style={{ border: '2px solid #cbd5e1' }}
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
            <h3 className="text-xl lg:text-base 2xl:text-xl font-bold text-slate-800 truncate">{recompensa.nombre}</h3>
            {recompensa.descripcion && (
              <p className="text-base lg:text-sm 2xl:text-base text-slate-600 font-medium line-clamp-1">{recompensa.descripcion}</p>
            )}
          </div>
        </div>

        {/* Negocio */}
        <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3 mb-4 lg:mb-3 2xl:mb-4">
          {recompensa.negocioLogo ? (
            <img
              src={recompensa.negocioLogo}
              alt={recompensa.negocioNombre}
              className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-full object-cover shrink-0 border-2 border-slate-300"
            />
          ) : (
            <div className="w-12 h-12 lg:w-10 lg:h-10 2xl:w-12 2xl:h-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Store className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-amber-600" strokeWidth={2.5} />
            </div>
          )}
          <span className="text-xl lg:text-base 2xl:text-xl font-bold text-slate-800 truncate">{recompensa.negocioNombre}</span>
        </div>

        {/* Resumen de puntos */}
        <div
          className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-4 lg:p-3 2xl:p-4 mb-3 lg:mb-2.5 2xl:mb-3"
          style={{ background: '#e2e8f0', border: '2px solid #cbd5e1' }}
        >
          {esGratis ? (
            <div className="flex justify-between items-center" data-testid="canje-gratis">
              <span className="text-[15px] lg:text-[14px] 2xl:text-[15px] text-slate-700 font-bold">Costo</span>
              <span className="text-xl lg:text-lg 2xl:text-xl font-black text-emerald-600">¡Gratis!</span>
            </div>
          ) : (
            <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[14px] lg:text-[13px] 2xl:text-[14px] text-slate-600 font-semibold">Puntos actuales</span>
                <span className="text-[14px] lg:text-[13px] 2xl:text-[14px] font-bold text-slate-800">{puntosActuales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[14px] lg:text-[13px] 2xl:text-[14px] text-slate-600 font-semibold">Costo de recompensa</span>
                <span className="text-[14px] lg:text-[13px] 2xl:text-[14px] font-bold text-rose-600">
                  -{recompensa.puntosRequeridos.toLocaleString()}
                </span>
              </div>
              <div
                className="pt-2 lg:pt-1.5 2xl:pt-2 flex justify-between items-center"
                style={{ borderTop: '1px solid #cbd5e1' }}
              >
                <span className="text-[15px] lg:text-[14px] 2xl:text-[15px] text-slate-700 font-bold">Puntos restantes</span>
                <span className="text-xl lg:text-lg 2xl:text-xl font-black text-slate-800">
                  {puntosRestantes.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Advertencia */}
        <div
          className="flex items-center gap-2 p-3 lg:p-2.5 2xl:p-3 rounded-lg mb-4 lg:mb-3 2xl:mb-4"
          style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '2px solid #fde68a' }}
        >
          <AlertCircle className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 text-amber-600 shrink-0" strokeWidth={2.5} />
          <p className="text-sm lg:text-[11px] 2xl:text-sm text-amber-800 font-semibold leading-relaxed">
            {esGratis
              ? 'Presenta el código en el negocio para reclamar tu recompensa.'
              : <>Si cambias de opinión, puedes cancelarlo<br />y recuperar tus puntos.</>
            }
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-3 lg:gap-2.5 2xl:gap-3">
          <button
            data-testid="canje-cancelar"
            onClick={onCerrar}
            disabled={canjeando}
            className="flex-1 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm text-slate-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200"
            style={{ border: '2px solid #cbd5e1' }}
          >
            Cancelar
          </button>
          <button
            data-testid="canje-confirmar"
            onClick={handleConfirmar}
            disabled={canjeando}
            className="flex-1 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm text-white transition-all duration-200 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98]"
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
      </div>
    </ModalAdaptativo>
  );
}