/**
 * CardRecompensaCliente.tsx
 * ==========================
 * Card de recompensa disponible para canjear (vista cliente).
 * Móvil: layout horizontal compacto (imagen izquierda, info derecha)
 * Desktop: layout vertical clásico (imagen arriba, info abajo)
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/CardRecompensaCliente.tsx
 */

import { Lock, AlertCircle, ArrowRight, Store, Repeat } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '../../../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Gift = (p: IconoWrapperProps) => <Icon icon={ICONOS.recompensa} {...p} />;
const Sparkles = (p: IconoWrapperProps) => <Icon icon={ICONOS.premium} {...p} />;
import type { RecompensaDisponible } from '../../../../types/cardya';

// =============================================================================
// COMPONENTE
// =============================================================================

export default function CardRecompensaCliente({
  recompensa,
  onCanjear,
  onVerDetalle,
  destacada = false,
}: {
  recompensa: RecompensaDisponible;
  onCanjear: (recompensa: RecompensaDisponible) => void;
  onVerDetalle?: (recompensa: RecompensaDisponible) => void;
  destacada?: boolean;
}) {
  const esN1 = recompensa.tipo === 'compras_frecuentes';
  const puedesCanjear = esN1 ? (recompensa.desbloqueada || false) : recompensa.tienesPuntosSuficientes;
  const stockAgotado = recompensa.estaAgotada;
  const puntosFaltantes = recompensa.puntosFaltantes;
  // Clases de opacidad compartidas
  const opacityClass = stockAgotado
    ? 'opacity-50 grayscale-[30%]'
    : !puedesCanjear && !esN1
      ? 'opacity-70'
      : '';

  // ─── Imagen compartida ───
  const imagenRecompensa = recompensa.imagenUrl ? (
    <img
      src={recompensa.imagenUrl}
      alt={recompensa.nombre}
      className={`w-full h-full object-cover transition-transform duration-200 ${puedesCanjear && !stockAgotado ? 'group-hover:scale-110' : ''
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
      <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-white">Agotado</span>
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
      <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-white/80">Bloqueado</span>
    </div>
  ) : null;

  const comprasRequeridas = recompensa.numeroComprasRequeridas || 0;
  const comprasActuales = recompensa.comprasAcumuladas || 0;
  const progresoN1 = comprasRequeridas > 0 ? Math.min(comprasActuales / comprasRequeridas, 1) : 0;
  const desbloqueadaN1 = recompensa.desbloqueada || false;

  // ─── Badge de puntos / progreso N+1 ───
  const badgePuntos = esN1 ? (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold ${desbloqueadaN1 ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
        {desbloqueadaN1 ? '¡Desbloqueada!' : `${comprasActuales}/${comprasRequeridas}`}
      </span>
      {!desbloqueadaN1 && (
        <div className="h-1.5 w-16 lg:w-20 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full rounded-full" style={{
            width: `${progresoN1 * 100}%`,
            background: progresoN1 >= 0.8 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f59e0b, #fbbf24)',
          }} />
        </div>
      )}
    </div>
  ) : (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm lg:text-[11px] 2xl:text-sm font-bold ${puedesCanjear && !stockAgotado ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}
    >
      <Sparkles className="w-3 h-3" strokeWidth={2.5} />
      {recompensa.puntosRequeridos.toLocaleString()} pts
    </span>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE: Layout horizontal compacto (< lg)
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        data-testid={`recompensa-movil-${recompensa.id}`}
        onClick={() => onVerDetalle?.(recompensa)}
        className={`lg:hidden group rounded-2xl overflow-hidden flex flex-row transition-all duration-300 ${esN1 ? '' : 'bg-white'} ${destacada ? 'border-2 border-amber-500' : 'shadow-md'} ${opacityClass} ${destacada ? 'animate-[glow_1.5s_ease-in-out_2]' : ''} ${onVerDetalle ? 'cursor-pointer' : ''}`}
        style={{
          height: '185px',
          background: esN1 ? 'linear-gradient(135deg, #000000, #020617, #0f172a)' : undefined,
          boxShadow: destacada ? '0 0 20px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.15)' : undefined,
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
          {esN1 && (
            <div
              className="absolute top-0 left-0 right-0 flex items-center justify-center gap-0.5 py-1.5"
              style={{ background: 'linear-gradient(135deg, #064e3b, #059669, #34d399)' }}
            >
              <Repeat className="w-4 h-4 text-white shrink-0" strokeWidth={2.5} />
              <span className="text-sm font-bold text-white">Tarjeta de Sellos</span>
            </div>
          )}
        </div>

        {/* Línea separadora vertical con gradiente */}
        <div
          className="w-1 shrink-0 self-stretch"
          style={{ background: esN1 ? 'linear-gradient(to bottom, #10b981, #1e293b)' : 'linear-gradient(to bottom, #DD7C07, #000000)' }}
        />

        {/* Info derecha */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0 overflow-hidden">
          {/* Top: Logo + Negocio → Título recompensa */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {recompensa.negocioLogo ? (
                <img
                  src={recompensa.negocioLogo}
                  alt={recompensa.negocioNombre}
                  className={`w-8 h-8 rounded-full object-cover shrink-0 border ${esN1 ? 'border-white/20' : 'border-slate-300'}`}
                />
              ) : (
                <Store className={`w-8 h-8 shrink-0 ${esN1 ? 'text-white/50' : 'text-amber-600'}`} strokeWidth={2.5} />
              )}
              <p className={`text-lg font-bold truncate leading-tight ${esN1 ? 'text-white/60' : 'text-slate-700'}`}>
                {recompensa.negocioNombre}
              </p>
            </div>
            <h4 className={`text-lg font-bold truncate leading-tight mt-1 ${esN1 ? 'text-white' : 'text-slate-800'}`}>
              {recompensa.nombre}
            </h4>
          </div>

          {/* Middle: Puntos + Stock (solo recompensas por puntos) */}
          {!esN1 && <div className="flex items-center justify-between">
            {badgePuntos}
            {recompensa.stock !== null && !stockAgotado && (
              <div className="flex flex-col items-end gap-1 min-w-0">
                <span
                  className="text-sm lg:text-[11px] 2xl:text-sm font-bold leading-none"
                  style={{
                    color: recompensa.stock <= 5 ? '#dc2626' : recompensa.stock <= 20 ? '#d97706' : '#475569',
                  }}
                >
                  {recompensa.stock <= 5 ? `¡Últimos ${recompensa.stock}!` : `${recompensa.stock} disp.`}
                </span>
                {recompensa.stock <= 20 && (
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden" style={{ width: '50px' }}>
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
          </div>}

          {/* Bottom: Acción */}
          <div>
            {esN1 ? (
              /* Tarjeta de sellos móvil */
              stockAgotado ? (
                <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm lg:text-[11px] 2xl:text-sm" style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', color: '#991b1b' }}>
                  <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>Agotado</span>
                </div>
              ) : desbloqueadaN1 ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onCanjear(recompensa); }}
                  data-testid={`btn-canjear-movil-${recompensa.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm lg:text-[11px] 2xl:text-sm text-white active:scale-[0.97] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                >
                  <Gift className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>Canjear gratis</span>
                  <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
                </button>
              ) : (
                <div className="w-full">
                  {/* Círculos de sellos — 3 arriba, 2 + contador abajo */}
                  {(() => {
                    const ventanaInicio = Math.max(0, Math.min(comprasActuales - 2, comprasRequeridas - 5));
                    const ventanaFin = Math.min(ventanaInicio + 5, comprasRequeridas);
                    const posiciones = Array.from({ length: ventanaFin - ventanaInicio }, (_, i) => ventanaInicio + i);
                    const faltantes = comprasRequeridas > ventanaFin ? comprasRequeridas - ventanaFin : 0;
                    const circulo = (pos: number) => {
                      const completado = pos < comprasActuales;
                      const esUltimo = pos === comprasRequeridas - 1;
                      return (
                        <div
                          key={pos}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${esUltimo ? 'animate-bounce' : ''}`}
                          style={{
                            background: completado
                              ? 'linear-gradient(135deg, #064e3b, #059669, #10b981)'
                              : esUltimo
                                ? 'linear-gradient(135deg, #92400e, #b45309, #d97706)'
                                : 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2))',
                            border: completado ? 'none' : '2px solid rgba(255,255,255,0.3)',
                            color: completado || esUltimo ? '#fff' : 'rgba(255,255,255,0.5)',
                          }}
                        >
                          {esUltimo && !completado ? '🎁' : completado ? '✓' : pos + 1}
                        </div>
                      );
                    };
                    return (
                      <div className="flex flex-col items-center mb-1.5">
                        <div className="flex items-center gap-1">{posiciones.map(circulo)}</div>
                        {faltantes > 0 && (
                          <span className="text-sm font-bold text-white/40 mt-0.5">+{faltantes} sellos más</span>
                        )}
                      </div>
                    );
                  })()}
                  {/* Texto progreso + barra */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white/70">{comprasActuales}/{comprasRequeridas} compras</span>
                    <span className="text-sm font-black text-amber-400">{Math.round(progresoN1 * 100)}%</span>
                  </div>
                  <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${progresoN1 * 100}%`,
                      background: progresoN1 >= 0.8 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #f59e0b, #d97706)',
                    }} />
                  </div>
                </div>
              )
            ) : (
              /* Recompensa por puntos móvil (original) */
              stockAgotado ? (
                <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm lg:text-[11px] 2xl:text-sm" style={{ background: 'linear-gradient(135deg, #fecaca, #fca5a5)', color: '#991b1b', opacity: 0.8 }}>
                  <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>Agotado</span>
                </div>
              ) : !puedesCanjear ? (
                <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm lg:text-[11px] 2xl:text-sm" style={{ background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', color: '#475569' }}>
                  <Lock className="w-3.5 h-3.5" strokeWidth={2} />
                  <span>Faltan {puntosFaltantes.toLocaleString()} pts</span>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onCanjear(recompensa); }}
                  data-testid={`btn-canjear-movil-${recompensa.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm lg:text-[11px] 2xl:text-sm text-white active:scale-[0.97] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}
                >
                  <Gift className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span>Canjear ahora</span>
                  <ArrowRight className="w-3 h-3" strokeWidth={2.5} />
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP: Layout según tipo (>= lg)
      ═══════════════════════════════════════════════════════════════════ */}
      {esN1 ? (
        /* ── TARJETA DE SELLOS — diseño dark premium ── */
        <div
          data-testid={`recompensa-desktop-${recompensa.id}`}
          onClick={() => onVerDetalle?.(recompensa)}
          className={`hidden lg:flex lg:h-[327px] 2xl:h-[363px] group rounded-2xl overflow-hidden flex-col transition-all duration-300 ${desbloqueadaN1 ? 'hover:shadow-xl' : ''} shadow-md ${opacityClass} ${onVerDetalle ? 'cursor-pointer' : ''}`}
          style={{ background: 'linear-gradient(135deg, #000000, #020617, #0f172a)' }}
        >
          {/* Header: Imagen + overlay dark */}
          <div className="w-full h-32 2xl:h-40 shrink-0 relative overflow-hidden">
            {recompensa.imagenUrl ? (
              <img
                src={recompensa.imagenUrl}
                alt={recompensa.nombre}
                className="w-full h-full object-cover opacity-80 transition-transform duration-200 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }} />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.7), rgba(15,23,42,0.05))' }} />

            {/* Logo + Negocio sobre la imagen */}
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-2 min-w-0">
              {recompensa.negocioLogo && (
                <img
                  src={recompensa.negocioLogo}
                  alt=""
                  className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full object-cover shrink-0 border-2 border-white"
                  style={{ boxShadow: '0 2px 8px rgba(255,255,255,0.4)' }}
                />
              )}
              <span
                className="text-base 2xl:text-xl font-bold text-white/80 truncate"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
              >
                {recompensa.negocioNombre}
              </span>
            </div>

            {/* Badge Tarjeta de Sellos */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 2xl:px-5 py-1.5 2xl:py-2 rounded-b-xl whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #064e3b, #059669, #34d399)', boxShadow: '0 4px 12px rgba(16,185,129,0.4)' }}>
              <Repeat className="w-4 h-4 2xl:w-5 2xl:h-5 text-white animate-spin shrink-0" strokeWidth={2.5} style={{ animationDuration: '4s' }} />
              <span className="text-sm 2xl:text-base font-bold text-white">Tarjeta de Sellos</span>
            </div>
          </div>

          {/* Línea separadora horizontal con gradiente */}
          <div
            className="h-1.5 w-full shrink-0"
            style={{ background: 'linear-gradient(to right, #10b981, #000000)' }}
          />

          {/* Contenido dark */}
          <div className="flex-1 p-3.5 2xl:p-4 flex flex-col gap-1">
            <h4 className="text-lg 2xl:text-xl font-bold text-white truncate leading-tight">
              {recompensa.nombre}
            </h4>
            {/* Sellos circulares */}
            <div className="flex items-center gap-1 mb-1 flex-wrap justify-center">
                  {(() => {
                    const ventanaInicio = Math.max(0, Math.min(comprasActuales - 2, comprasRequeridas - 5));
                    const ventanaFin = Math.min(ventanaInicio + 5, comprasRequeridas);
                    const posiciones = Array.from({ length: ventanaFin - ventanaInicio }, (_, i) => ventanaInicio + i);
                    return (
                      <>
                        {posiciones.map((pos) => {
                          const completado = pos < comprasActuales;
                          const esUltimo = pos === comprasRequeridas - 1;
                          const numero = pos + 1;
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
                                animationDuration: '2s',
                              }}
                            >
                              {esUltimo && !completado ? '🎁' : completado ? '✓' : numero}
                            </div>
                          );
                        })}
                        {comprasRequeridas > ventanaFin && (
                          <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-white/40 ml-1">+{comprasRequeridas - ventanaFin}</span>
                        )}
                      </>
                    );
                  })()}
            </div>

            {/* Progreso texto + barra */}
            <div className="mb-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs 2xl:text-sm font-bold text-white/70">
                  {desbloqueadaN1 ? '¡Completada!' : `${comprasActuales} de ${comprasRequeridas} compras`}
                </span>
                <span className={`text-xs 2xl:text-sm font-black ${desbloqueadaN1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {desbloqueadaN1 ? '✨' : `${Math.round(progresoN1 * 100)}%`}
                </span>
              </div>
              <div className="w-full h-2 2xl:h-2.5 bg-white/10 rounded-full overflow-hidden">
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

            {/* Botón */}
            <div className="mt-auto">
              {stockAgotado ? (
                <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" strokeWidth={2.5} />
                  <span className="text-[11px] 2xl:text-sm font-bold text-red-400">Sin stock</span>
                </div>
              ) : desbloqueadaN1 ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onCanjear(recompensa); }}
                  data-testid={`btn-canjear-desktop-${recompensa.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs 2xl:text-[13px] text-white active:scale-[0.97] cursor-pointer hover:shadow-lg animate-pulse"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 4px 16px rgba(16,185,129,0.4)',
                    animationDuration: '3s',
                  }}
                >
                  <Gift className="w-4 h-4" strokeWidth={2.5} />
                  <span>¡Canjear gratis!</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs 2xl:text-[13px] cursor-not-allowed bg-white/15">
                  <Repeat className="w-3.5 h-3.5 text-white/40" strokeWidth={2} />
                  <span className="text-white/40">Faltan {comprasRequeridas - comprasActuales} compras</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── RECOMPENSA POR PUNTOS — diseño original blanco ── */
        <div
          data-testid={`recompensa-desktop-${recompensa.id}`}
          onClick={() => onVerDetalle?.(recompensa)}
          className={`hidden lg:flex lg:h-[327px] 2xl:h-[363px] group bg-white rounded-2xl overflow-hidden flex-col transition-all duration-300 ${puedesCanjear && !stockAgotado ? 'hover:shadow-xl' : ''} ${destacada ? 'border-2 border-amber-500' : 'shadow-md'} ${opacityClass} ${destacada ? 'animate-[glow_1.5s_ease-in-out_2]' : ''} ${onVerDetalle ? 'cursor-pointer' : ''}`}
          style={{
            boxShadow: destacada ? '0 0 20px rgba(245,158,11,0.4), 0 0 40px rgba(245,158,11,0.15)' : undefined,
          }}
        >
          <div className="w-full h-32 2xl:h-40 shrink-0 relative overflow-hidden">
            {imagenRecompensa}
            <div className="absolute inset-x-0 bottom-0 h-20 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)' }} />
            {badgeEstado}
            <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center gap-2 min-w-0">
              {recompensa.negocioLogo ? (
                <img
                  src={recompensa.negocioLogo}
                  alt=""
                  className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full object-cover shrink-0 border-2 border-white"
                  style={{ boxShadow: '0 2px 8px rgba(255,255,255,0.4)' }}
                />
              ) : (
                <Store className="w-8 h-8 2xl:w-9 2xl:h-9 shrink-0 text-white/60" strokeWidth={2} />
              )}
              <span className="text-base 2xl:text-xl font-bold text-white/80 truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                {recompensa.negocioNombre}
              </span>
            </div>
          </div>

          <div className="h-1.5 w-full shrink-0" style={{ background: 'linear-gradient(to right, #DD7C07, #000000)' }} />

          <div className="flex-1 p-3.5 2xl:p-4 flex flex-col gap-2">
            <h4 className="text-lg 2xl:text-xl font-bold text-slate-800 truncate leading-tight">
              {recompensa.nombre}
            </h4>
            {recompensa.descripcion && (
              <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600 font-medium line-clamp-2 leading-relaxed">{recompensa.descripcion}</p>
            )}
            <div className="flex items-center justify-between">
              {badgePuntos}
              {recompensa.stock !== null && !stockAgotado && (
                <div className="flex flex-col items-end gap-1 min-w-0">
                  <span className="text-xs 2xl:text-[13px] font-bold leading-none" style={{ color: recompensa.stock <= 5 ? '#dc2626' : recompensa.stock <= 20 ? '#d97706' : '#475569' }}>
                    {recompensa.stock <= 5 ? `¡Últimos ${recompensa.stock}!` : `${recompensa.stock} disp.`}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-auto">
              {stockAgotado ? (
                <div className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl" style={{ background: '#fee2e2', border: '2px solid #fecaca' }}>
                  <AlertCircle className="w-3.5 h-3.5 text-red-600" strokeWidth={2.5} />
                  <span className="text-[11px] 2xl:text-sm font-bold text-red-700">Sin stock disponible</span>
                </div>
              ) : !puedesCanjear ? (
                <div className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-xs 2xl:text-[13px] cursor-not-allowed" style={{ background: '#e2e8f0', border: '2px solid #cbd5e1' }}>
                  <Lock className="w-3.5 h-3.5 text-slate-600" strokeWidth={2} />
                  <span className="text-slate-600">Faltan {puntosFaltantes.toLocaleString()} pts</span>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onCanjear(recompensa); }}
                  data-testid={`btn-canjear-desktop-${recompensa.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs 2xl:text-[13px] text-white active:scale-[0.97] cursor-pointer hover:shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}
                >
                  <Gift className="w-4 h-4" strokeWidth={2.5} />
                  <span>Canjear ahora</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}