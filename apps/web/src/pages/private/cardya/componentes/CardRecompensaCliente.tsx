/**
 * CardRecompensaCliente.tsx
 * ==========================
 * Card de recompensa disponible para canjear (vista cliente).
 * Móvil: layout horizontal compacto (imagen izquierda, info derecha)
 * Desktop: layout vertical clásico (imagen arriba, info abajo)
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/CardRecompensaCliente.tsx
 */

import { Gift, Sparkles, Lock, AlertCircle, ArrowRight, Store } from 'lucide-react';
import type { RecompensaDisponible } from '../../../../types/cardya';

// =============================================================================
// COMPONENTE
// =============================================================================

export default function CardRecompensaCliente({
  recompensa,
  onCanjear,
  destacada = false,
}: {
  recompensa: RecompensaDisponible;
  onCanjear: (recompensa: RecompensaDisponible) => void;
  destacada?: boolean;
}) {
  const puedesCanjear = recompensa.tienesPuntosSuficientes;
  const stockAgotado = recompensa.estaAgotada;
  const puntosFaltantes = recompensa.puntosFaltantes;

  // Clases de opacidad compartidas
  const opacityClass = stockAgotado
    ? 'opacity-50 grayscale-[30%]'
    : !puedesCanjear
      ? 'opacity-70'
      : '';

  // ─── Imagen compartida ───
  const imagenRecompensa = recompensa.imagenUrl ? (
    <img
      src={recompensa.imagenUrl}
      alt={recompensa.nombre}
      className={`w-full h-full object-cover transition-transform duration-500 ${puedesCanjear && !stockAgotado ? 'group-hover:scale-105' : ''
        }`}
    />
  ) : (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
    >
      <Gift className="w-10 h-10 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 text-amber-500/40" />
    </div>
  );

  // ─── Badge de estado ───
  const badgeEstado = stockAgotado ? (
    <div
      className="absolute top-2 right-2 lg:top-3 lg:right-3 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-lg flex items-center gap-1 lg:gap-1.5 bg-red-500"
      style={{ boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}
    >
      <AlertCircle className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-white" strokeWidth={2.5} />
      <span className="text-[10px] lg:text-[11px] font-bold text-white">Agotado</span>
    </div>
  ) : !puedesCanjear ? (
    <div
      className="absolute top-2 right-2 lg:top-3 lg:right-3 px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-lg flex items-center gap-1 lg:gap-1.5 backdrop-blur-sm"
      style={{
        background: 'rgba(30,41,59,0.85)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <Lock className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-white/70" strokeWidth={2.5} />
      <span className="text-[10px] lg:text-[11px] font-bold text-white/80">Bloqueado</span>
    </div>
  ) : null;

  // ─── Badge de puntos ───
  const badgePuntos = (
    <div
      className="flex items-center gap-1 px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg"
      style={{
        background: puedesCanjear && !stockAgotado
          ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
          : '#f8fafc',
        border: puedesCanjear && !stockAgotado
          ? '1px solid #fde68a'
          : '1px solid #e2e8f0',
      }}
    >
      <Sparkles
        className="w-3 h-3 lg:w-3.5 lg:h-3.5"
        style={{ color: puedesCanjear && !stockAgotado ? '#d97706' : '#94a3b8' }}
        strokeWidth={2.5}
      />
      <span
        className="text-xs lg:text-xs 2xl:text-[13px] font-bold"
        style={{ color: puedesCanjear && !stockAgotado ? '#92400e' : '#64748b' }}
      >
        {recompensa.puntosRequeridos.toLocaleString()} pts
      </span>
    </div>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE: Layout horizontal compacto (< lg)
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`lg:hidden group bg-white rounded-2xl overflow-hidden flex flex-row transition-all duration-300 ${opacityClass} ${destacada ? 'animate-[glow_1.5s_ease-in-out_2]' : ''}`}
        style={{
          border: destacada ? '2px solid #f59e0b' : '1px solid #e2e8f0', height: '185px',
          boxShadow: destacada ? '0 0 20px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.15)' : '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        {/* Imagen izquierda */}
        <div className="w-36 shrink-0 relative overflow-hidden">
          {imagenRecompensa}
          <div
            className="absolute inset-y-0 right-0 w-8 pointer-events-none"
            style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.3), transparent)' }}
          />
          {badgeEstado}
        </div>

        {/* Línea separadora vertical con gradiente */}
        <div
          className="w-1 shrink-0 self-stretch"
          style={{ background: 'linear-gradient(to bottom, #DD7C07, #000000)' }}
        />

        {/* Info derecha */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0 overflow-hidden">
          {/* Top: Nombre + Negocio + Descripción */}
          <div className="min-w-0">
            <h4 className="text-lg font-bold text-slate-800 truncate leading-tight">
              {recompensa.nombre}
            </h4>
            <div className="flex items-center gap-1 mt-0.5">
              <Store className="w-3 h-3 text-amber-600 shrink-0" strokeWidth={2.5} />
              <p className="text-xs text-amber-700 font-bold truncate">
                {recompensa.negocioNombre}
              </p>
            </div>
            {recompensa.descripcion && (
              <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-snug">
                {recompensa.descripcion}
              </p>
            )}
          </div>

          {/* Middle: Puntos + Stock */}
          <div className="flex items-center justify-between">
            {badgePuntos}
            {recompensa.stock !== null && !stockAgotado && (
              <div className="flex flex-col items-end gap-1 min-w-0">
                <span
                  className="text-[13px] font-bold leading-none"
                  style={{
                    color: recompensa.stock <= 5 ? '#dc2626' : recompensa.stock <= 20 ? '#d97706' : '#94a3b8',
                  }}
                >
                  {recompensa.stock <= 5 ? `¡Últimos ${recompensa.stock}!` : `${recompensa.stock} disp.`}
                </span>
                {recompensa.stock <= 20 && (
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" style={{ width: '50px' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: recompensa.stock <= 5 ? '15%' : '45%',
                        background: recompensa.stock <= 5
                          ? 'linear-gradient(90deg, #ef4444, #f87171)'
                          : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom: Acción */}
          <div>
            {stockAgotado ? (
              <div
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs"
                style={{
                  background: 'linear-gradient(135deg, #fecaca, #fca5a5)',
                  color: '#991b1b',
                  opacity: 0.8,
                }}
              >
                <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>Agotado</span>
              </div>
            ) : !puedesCanjear ? (
              <div
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs"
                style={{
                  background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                  color: '#475569',
                }}
              >
                <Lock className="w-3.5 h-3.5" strokeWidth={2} />
                <span>Faltan {puntosFaltantes.toLocaleString()} pts</span>
              </div>
            ) : (
              <button
                onClick={() => onCanjear(recompensa)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-xs text-white transition-all duration-200 active:scale-[0.97] cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                }}
              >
                <Gift className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span>Canjear ahora</span>
                <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP: Layout vertical clásico (>= lg)
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`hidden lg:flex group bg-white rounded-2xl overflow-hidden flex-col transition-all duration-300 hover:shadow-xl ${opacityClass} ${destacada ? 'animate-[glow_1.5s_ease-in-out_2]' : ''}`}
        style={{
          border: destacada ? '2px solid #f59e0b' : '1px solid #e2e8f0',
          boxShadow: destacada ? '0 0 20px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.15)' : '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header: Imagen */}
        <div className="w-full h-32 2xl:h-40 relative overflow-hidden">
          {imagenRecompensa}
          <div
            className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }}
          />
          {badgeEstado}
          <div className="absolute bottom-2.5 left-3.5 right-3.5">
            <h4
              className="text-lg 2xl:text-xl font-bold text-white truncate"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)' }}
            >
              {recompensa.nombre}
            </h4>
          </div>
        </div>

        {/* Línea separadora horizontal con gradiente */}
        <div
          className="h-1 w-full shrink-0"
          style={{ background: 'linear-gradient(to right, #DD7C07, #000000)' }}
        />

        {/* Contenido */}
        <div className="flex-1 p-3.5 2xl:p-4 flex flex-col">
          {/* Badge negocio */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg self-start mb-2 2xl:mb-2.5"
            style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a' }}
          >
            <Store className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-amber-600" strokeWidth={2.5} />
            <span className="text-[11px] 2xl:text-xs font-bold text-amber-800 truncate max-w-[140px]">
              {recompensa.negocioNombre}
            </span>
          </div>

          {recompensa.descripcion && (
            <p className="text-xs 2xl:text-[13px] text-slate-500 line-clamp-2 leading-relaxed">
              {recompensa.descripcion}
            </p>
          )}

          <div className="flex items-center justify-between mt-3">
            {badgePuntos}
            {recompensa.stock !== null && !stockAgotado && (
              <div className="flex flex-col items-end gap-1 min-w-0">
                <span
                  className="text-xs 2xl:text-[13px] font-bold leading-none"
                  style={{
                    color: recompensa.stock <= 5 ? '#dc2626' : recompensa.stock <= 20 ? '#d97706' : '#94a3b8',
                  }}
                >
                  {recompensa.stock <= 5 ? `¡Últimos ${recompensa.stock}!` : `${recompensa.stock} disp.`}
                </span>
                {recompensa.stock <= 20 && (
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden" style={{ width: '60px' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: recompensa.stock <= 5 ? '15%' : '45%',
                        background: recompensa.stock <= 5
                          ? 'linear-gradient(90deg, #ef4444, #f87171)'
                          : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-auto pt-3.5">
            {stockAgotado ? (
              <div
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl"
                style={{ background: '#fef2f2', border: '1.5px solid #fecaca' }}
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-400" strokeWidth={2.5} />
                <span className="text-[11px] 2xl:text-[12px] font-bold text-red-500">Sin stock disponible</span>
              </div>
            ) : !puedesCanjear ? (
              <div
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl"
                style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
              >
                <Lock className="w-3.5 h-3.5 text-slate-400" strokeWidth={2} />
                <span className="text-[11px] 2xl:text-[12px] font-bold text-slate-500">
                  Faltan {puntosFaltantes.toLocaleString()} pts
                </span>
              </div>
            ) : (
              <button
                onClick={() => onCanjear(recompensa)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs 2xl:text-[13px] text-white transition-all duration-200 active:scale-[0.97] cursor-pointer hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                }}
              >
                <Gift className="w-4 h-4" strokeWidth={2.5} />
                <span>Canjear ahora</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}