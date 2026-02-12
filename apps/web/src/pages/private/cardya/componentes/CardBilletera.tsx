/**
 * CardBilletera.tsx
 * =================
 * Card de billetera por negocio — estilo premium CardYA.
 * Móvil: layout horizontal compacto (imagen izquierda, info derecha)
 * Desktop: layout vertical clásico (imagen arriba, info abajo)
 *
 * UBICACIÓN: apps/web/src/pages/private/cardya/componentes/CardBilletera.tsx
 */

import { useState, useEffect } from 'react';
import { Store, TrendingUp, ChevronRight } from 'lucide-react';
import type { BilleteraNegocio } from '../../../../types/cardya';

// Configuración de niveles
const NIVELES_CONFIG = {
  bronce: {
    color: '#92400e',
    colorLight: '#d97706',
    bg: 'linear-gradient(135deg, #fbbf24, #d97706)',
    badgeBg: 'linear-gradient(135deg, #fef3c7, #fde68a)',
    barBg: 'linear-gradient(90deg, #fbbf24, #d97706)',
    label: 'Bronce',
    icono: '🥉',
  },
  plata: {
    color: '#475569',
    colorLight: '#64748b',
    bg: 'linear-gradient(135deg, #cbd5e1, #94a3b8)',
    badgeBg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
    barBg: 'linear-gradient(90deg, #94a3b8, #64748b)',
    label: 'Plata',
    icono: '🥈',
  },
  oro: {
    color: '#a16207',
    colorLight: '#ca8a04',
    bg: 'linear-gradient(135deg, #fde047, #eab308)',
    badgeBg: 'linear-gradient(135deg, #fef9c3, #fde68a)',
    barBg: 'linear-gradient(90deg, #fde047, #eab308)',
    label: 'Oro',
    icono: '🥇',
  },
} as const;

// =============================================================================
// COMPONENTE
// =============================================================================

export default function CardBilletera({
  billetera,
  onClick,
}: {
  billetera: BilleteraNegocio;
  onClick: (billetera: BilleteraNegocio) => void;
}) {
  const nivel = NIVELES_CONFIG[billetera.nivelActual];

  // ─── Cálculo automático del progreso ───
  // Usa directamente el progreso calculado por el backend
  const progresoCalculado = billetera.progreso.porcentaje;
  const puntosFaltantes = billetera.progreso.puntosFaltantes;

  // ─── Imagen compartida (logo o placeholder) ───
  const imagenPortada = billetera.negocioLogo ? (
    <img
      src={billetera.negocioLogo}
      alt={billetera.negocioNombre}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
    />
  ) : (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
    >
      <Store className="w-10 h-10 lg:w-11 lg:h-11 2xl:w-14 2xl:h-14 text-slate-500" />
    </div>
  );

  // ─── Badge de nivel ───
  const badgeNivel = (
    <div
      className="absolute top-2 right-2 lg:top-3 lg:right-3 px-2.5 py-1 lg:px-2.5 lg:py-1 rounded-lg flex items-center gap-1.5 lg:gap-1.5 backdrop-blur-sm"
      style={{
        background: nivel.badgeBg,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        border: '1px solid rgba(255,255,255,0.5)',
      }}
    >
      <span className="text-sm lg:text-sm leading-none">{nivel.icono}</span>
      <span
        className="text-[11px] lg:text-[10.5px] 2xl:text-[11px] font-bold"
        style={{ color: nivel.color }}
      >
        {nivel.label}
      </span>
    </div>
  );

  // ─── Barra de progreso ───
  // ─── Animación de barra de progreso ───
  const [progresoAnimado, setProgresoAnimado] = useState(0);

  useEffect(() => {
    // Reset a 0 inmediatamente
    setProgresoAnimado(0);

    // Esperar un frame para que el browser pinte el 0, luego animar
    const timer = requestAnimationFrame(() => {
      setProgresoAnimado(progresoCalculado);
    });

    return () => cancelAnimationFrame(timer);
  }, [progresoCalculado, billetera.negocioId]);

  const barraProgreso = puntosFaltantes !== null && (
    <div className="mt-2 lg:mt-3.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs lg:text-[11px] 2xl:text-xs text-slate-600 font-semibold">
          Siguiente nivel
        </span>
        <span
          className="text-xs lg:text-[11px] 2xl:text-xs font-bold"
          style={{ color: nivel.colorLight }}
        >
          {progresoCalculado}%
        </span>
      </div>
      <div className="w-full h-1.5 lg:h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progresoAnimado}%`,
            background: nivel.barBg,
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
      <p className="text-xs lg:text-[10px] 2xl:text-[11px] text-slate-500 mt-1">
        Faltan <strong className="text-slate-600">{puntosFaltantes.toLocaleString()}</strong> puntos
      </p>
    </div>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          MOBILE: Layout horizontal compacto (< lg)
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        onClick={() => onClick(billetera)}
        className="lg:hidden group bg-white rounded-2xl overflow-hidden flex flex-row transition-all duration-300 hover:shadow-xl cursor-pointer"
        style={{
          border: '1px solid #e2e8f0', height: '185px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        {/* Imagen izquierda */}
        <div className="w-36 shrink-0 relative overflow-hidden">
          {imagenPortada}
          {/* Overlay gradiente derecho */}
          <div
            className="absolute inset-y-0 right-0 w-8 pointer-events-none"
            style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.3), transparent)' }}
          />
          {/* Badge de nivel en la imagen */}
          {badgeNivel}
        </div>

        {/* Línea separadora vertical con gradiente */}
        <div
          className="w-1 shrink-0 self-stretch"
          style={{ background: 'linear-gradient(to bottom, #DD7C07, #000000)' }}
        />

        {/* Info derecha */}
        <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0 overflow-hidden">
          {/* Nombre del negocio */}
          <h4 className="text-lg font-bold text-slate-800 truncate leading-tight">
            {billetera.negocioNombre}
          </h4>

          {/* Puntos */}
          <div className="flex items-center gap-2 mt-1.5">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ background: nivel.bg }}
            >
              <TrendingUp className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800 leading-none">
                {billetera.puntosDisponibles.toLocaleString()}
              </div>
              <div className="text-sm text-slate-500 font-medium">
                puntos disponibles
              </div>
            </div>
          </div>

          {/* Barra de progreso */}
          {barraProgreso}

          {/* Botón Ver detalles */}
          <div className="flex justify-end mt-1">
            <div
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg"
              style={{ background: '#1e293b' }}
            >
              <span className="text-xs font-bold text-white">Ver detalles</span>
              <ChevronRight className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP: Layout vertical clásico (>= lg)
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex group bg-white rounded-2xl overflow-hidden flex-col transition-all duration-300 hover:shadow-xl"
        style={{
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header: Portada del negocio */}
        <div className="w-full h-32 2xl:h-40 relative overflow-hidden">
          {imagenPortada}
          {/* Overlay gradiente abajo */}
          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }}
          />
          {/* Badge de nivel */}
          {badgeNivel}
          {/* Nombre sobre la imagen */}
          <div className="absolute bottom-2.5 left-3.5 right-3.5">
            <h4
              className="text-lg 2xl:text-xl font-bold text-white truncate"
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5)' }}
            >
              {billetera.negocioNombre}
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
          {/* Puntos */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: nivel.bg }}
            >
              <TrendingUp className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-xl 2xl:text-2xl font-black text-slate-800 leading-none">
                {billetera.puntosDisponibles.toLocaleString()}
              </div>
              <div className="text-[11px] 2xl:text-xs text-slate-500 font-medium">
                puntos disponibles
              </div>
            </div>
          </div>

          {/* Barra de progreso */}
          {barraProgreso}

          {/* Botón */}
          <div className="mt-auto pt-3.5">
            <button
              onClick={() => onClick(billetera)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 hover:bg-slate-800 [&:hover>span]:text-white [&:hover>svg]:text-white"
              style={{ border: '1.5px solid #e2e8f0' }}
            >
              <span className="text-xs 2xl:text-sm font-bold text-slate-700 transition-colors duration-150">
                Ver detalles
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400 transition-colors duration-150" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}