/**
 * ModalDetalleRecompensa.tsx
 * ==========================
 * Modal de detalle de una recompensa disponible.
 * Muestra imagen ampliada, descripción completa, progreso y botón de canje.
 * Adaptativo: ModalBottom en móvil, Modal centrado en desktop.
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/ModalDetalleRecompensa.tsx
 */

import { Gift, Store, Sparkles, Lock, AlertCircle, ArrowRight, Repeat } from 'lucide-react';
import { ModalAdaptativo } from '../../../../components/ui/ModalAdaptativo';
import type { RecompensaDisponible } from '../../../../types/cardya';

// =============================================================================
// COMPONENTE
// =============================================================================

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  recompensa: RecompensaDisponible | null;
  onCanjear: (recompensa: RecompensaDisponible) => void;
}

export default function ModalDetalleRecompensa({ abierto, onCerrar, recompensa, onCanjear }: Props) {
  if (!recompensa) return null;

  const esN1 = recompensa.tipo === 'compras_frecuentes';
  const puedesCanjear = esN1 ? (recompensa.desbloqueada || false) : recompensa.tienesPuntosSuficientes;
  const stockAgotado = recompensa.estaAgotada;
  const comprasRequeridas = recompensa.numeroComprasRequeridas || 0;
  const comprasActuales = recompensa.comprasAcumuladas || 0;
  const progresoN1 = comprasRequeridas > 0 ? Math.min(comprasActuales / comprasRequeridas, 1) : 0;
  const desbloqueadaN1 = recompensa.desbloqueada || false;

  const colorHandle = 'rgba(255,255,255,0.4)';

  const handleCanjear = () => {
    onCerrar();
    onCanjear(recompensa);
  };

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={onCerrar}
      ancho="md"
      paddingContenido="none"
      mostrarHeader={false}
      sinScrollInterno
      alturaMaxima="xl"
      colorHandle={colorHandle}
      headerOscuro
      className="max-w-xs lg:max-w-md 2xl:max-w-lg"
    >
      <div className="flex flex-col max-h-[85vh] lg:max-h-[75vh] 2xl:max-h-[75vh]">

        {/* ─── Header ─── */}
        <div
          className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3.5 2xl:py-4 shrink-0 lg:rounded-t-2xl"
          style={{
            background: esN1
              ? 'linear-gradient(135deg, #064e3b, #065f46, #059669)'
              : 'linear-gradient(135deg, #0f172a, #1e293b)',
          }}
        >
          {/* Círculos decorativos */}
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
            {/* Ícono circular */}
            <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
              {esN1
                ? <Repeat className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" strokeWidth={2.5} />
                : <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" strokeWidth={2.5} />
              }
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white truncate">{recompensa.nombre}</h3>
              <p className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-white/70 truncate">
                {esN1 ? 'Tarjeta de Sellos' : 'Recompensa'}
              </p>
            </div>
          </div>
        </div>

        {/* ─── Body ─── */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-3 2xl:p-4 space-y-3 lg:space-y-2.5 2xl:space-y-3">

          {/* Imagen */}
          <div className="w-full h-44 lg:h-36 2xl:h-44 rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden shrink-0">
            {recompensa.imagenUrl ? (
              <img src={recompensa.imagenUrl} alt={recompensa.nombre} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
              >
                <Gift className="w-14 h-14 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 text-amber-500/40" strokeWidth={2} />
              </div>
            )}
          </div>

          {/* Negocio */}
          <div className="flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
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
            <span className="text-xl lg:text-base 2xl:text-xl font-bold text-slate-800 truncate">
              {recompensa.negocioNombre}
            </span>
          </div>

          {/* Descripción */}
          {recompensa.descripcion && (
            <div className="rounded-xl border-2 border-slate-300 px-3 pt-2 pb-2.5 lg:px-2.5 lg:pt-1.5 lg:pb-2 2xl:px-3 2xl:pt-2 2xl:pb-2.5">
              <p className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-slate-400 uppercase tracking-wide mb-1">Acerca de esta recompensa</p>
              <p className="text-base lg:text-sm 2xl:text-base font-medium text-slate-700 leading-relaxed">
                {recompensa.descripcion}
              </p>
            </div>
          )}

          {/* Progreso sellos */}
          {esN1 && (
            <div
              className="rounded-xl lg:rounded-lg 2xl:rounded-xl p-3.5 lg:p-3 2xl:p-3.5"
              style={{ background: 'linear-gradient(135deg, #000000, #0f172a)', border: '2px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-1.5 mb-3 flex-wrap justify-center">
                {(() => {
                  const ventanaInicio = Math.max(0, Math.min(comprasActuales - 2, comprasRequeridas - 5));
                  const ventanaFin = Math.min(ventanaInicio + 5, comprasRequeridas);
                  const posiciones = Array.from({ length: ventanaFin - ventanaInicio }, (_, i) => ventanaInicio + i);
                  return (
                    <>
                      {posiciones.map((pos) => {
                        const completado = pos < comprasActuales;
                        const esUltimo = pos === comprasRequeridas - 1;
                        return (
                          <div
                            key={pos}
                            className={`w-9 h-9 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 rounded-full flex items-center justify-center text-sm lg:text-xs 2xl:text-sm font-black shrink-0 ${esUltimo ? 'animate-bounce' : ''}`}
                            style={{
                              background: completado
                                ? 'linear-gradient(135deg, #064e3b, #059669, #10b981)'
                                : esUltimo
                                  ? 'linear-gradient(135deg, #92400e, #b45309, #d97706)'
                                  : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2))',
                              border: completado ? 'none' : '2px solid rgba(255,255,255,0.3)',
                              color: completado || esUltimo ? '#fff' : 'rgba(255,255,255,0.5)',
                              ...(esUltimo ? { animationDuration: '2s' } : {}),
                            }}
                          >
                            {esUltimo && !completado ? '🎁' : completado ? '✓' : pos + 1}
                          </div>
                        );
                      })}
                      {comprasRequeridas > ventanaFin && (
                        <span className="text-sm font-bold text-white/40">+{comprasRequeridas - ventanaFin}</span>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-white/70">
                  {desbloqueadaN1 ? '¡Completada!' : `${comprasActuales} de ${comprasRequeridas} compras`}
                </span>
                <span className={`text-sm lg:text-[11px] 2xl:text-sm font-black ${desbloqueadaN1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {desbloqueadaN1 ? '✨' : `${Math.round(progresoN1 * 100)}%`}
                </span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${desbloqueadaN1 ? 100 : progresoN1 * 100}%`,
                    background: desbloqueadaN1
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Puntos requeridos */}
          {!esN1 && (
            <div className="rounded-xl border-2 border-slate-300 px-3 py-2.5 lg:px-2.5 lg:py-2 2xl:px-3 2xl:py-2.5 flex items-center justify-between">
              <span className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-600">Puntos requeridos</span>
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-base lg:text-sm 2xl:text-base font-bold"
                style={{
                  background: puedesCanjear && !stockAgotado ? '#fef3c7' : '#e2e8f0',
                  color: puedesCanjear && !stockAgotado ? '#92400e' : '#475569',
                }}
              >
                <Sparkles className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
                {recompensa.puntosRequeridos.toLocaleString()} pts
              </span>
            </div>
          )}

          {/* Stock bajo */}
          {recompensa.stock !== null && !stockAgotado && recompensa.stock <= 20 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-base lg:text-sm 2xl:text-base font-semibold text-slate-600">Disponibles</span>
              <span
                className="text-base lg:text-sm 2xl:text-base font-bold"
                style={{ color: recompensa.stock <= 5 ? '#dc2626' : '#d97706' }}
              >
                {recompensa.stock <= 5 ? `¡Solo ${recompensa.stock}!` : `${recompensa.stock} disp.`}
              </span>
            </div>
          )}

          {/* Botón de acción */}
          {stockAgotado ? (
            <div
              className="flex items-center justify-center gap-2 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm cursor-not-allowed"
              style={{ background: '#fee2e2', border: '2px solid #fecaca', color: '#991b1b' }}
            >
              <AlertCircle className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2.5} />
              Sin stock disponible
            </div>
          ) : !puedesCanjear ? (
            <div
              className="flex items-center justify-center gap-2 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm cursor-not-allowed"
              style={{ background: '#e2e8f0', border: '2px solid #cbd5e1', color: '#475569' }}
            >
              <Lock className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2} />
              {esN1
                ? `Faltan ${comprasRequeridas - comprasActuales} compras`
                : `Faltan ${recompensa.puntosFaltantes.toLocaleString()} pts`}
            </div>
          ) : (
            <button
              onClick={handleCanjear}
              data-testid="btn-canjear-modal-detalle"
              className="w-full flex items-center justify-center gap-2 py-2.5 lg:py-2 2xl:py-2.5 rounded-xl lg:rounded-lg 2xl:rounded-xl font-bold text-sm lg:text-[12px] 2xl:text-sm text-white cursor-pointer active:scale-[0.98]"
              style={{
                background: esN1
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                boxShadow: esN1
                  ? '0 4px 12px rgba(16,185,129,0.3)'
                  : '0 4px 12px rgba(245,158,11,0.3)',
              }}
            >
              <Gift className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" strokeWidth={2.5} />
              {esN1 ? '¡Canjear gratis!' : 'Canjear ahora'}
              <ArrowRight className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </ModalAdaptativo>
  );
}
