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
import { useChatYAStore } from '../../../../stores/useChatYAStore';
import { useUiStore } from '../../../../stores/useUiStore';

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
  const nivelesActivos = billetera.nivelesActivos ?? true;

  // ─── ChatYA ───
  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const abrirChatYA = useUiStore((s) => s.abrirChatYA);

  const handleChatYA = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!billetera.negocioUsuarioId) return;
    abrirChatTemporal({
      id: `temp_${Date.now()}`,
      otroParticipante: {
        id: billetera.negocioUsuarioId,
        nombre: billetera.negocioNombre,
        apellidos: '',
        avatarUrl: billetera.negocioLogo,
        negocioNombre: billetera.negocioNombre,
        negocioLogo: billetera.negocioLogo ?? undefined,
      },
      datosCreacion: {
        participante2Id: billetera.negocioUsuarioId,
        participante2Modo: 'comercial',
        participante2SucursalId: billetera.negocioSucursalId ?? '',
        contextoTipo: 'negocio',
      },
    });
    abrirChatYA();
  };

  // ─── Cálculo automático del progreso ───
  // Usa directamente el progreso calculado por el backend
  const progresoCalculado = billetera.progreso.porcentaje;
  const puntosFaltantes = billetera.progreso.puntosFaltantes;

  // ─── Imagen de portada (móvil y desktop) ───
  const imagenPortadaMovil = billetera.negocioPortada ? (
    <img
      src={billetera.negocioPortada}
      alt={billetera.negocioNombre}
      className="w-full h-full object-cover transition-transform duration-200 lg:group-hover:scale-110"
    />
  ) : billetera.negocioLogo ? (
    <img
      src={billetera.negocioLogo}
      alt={billetera.negocioNombre}
      className="w-full h-full object-cover transition-transform duration-200 lg:group-hover:scale-110"
    />
  ) : (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
    >
      <Store className="w-10 h-10 text-slate-600" />
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
        className="text-sm lg:text-[11px] 2xl:text-sm font-bold"
        style={{ color: nivel.color }}
      >
        {nivel.label}
      </span>
    </div>
  );

  // ─── Barra de progreso ───
  const esNivelMaximo = billetera.nivelActual === 'oro';

  // ─── Animación de barra de progreso ───
  const [progresoAnimado, setProgresoAnimado] = useState(0);

  useEffect(() => {
    // Reset a 0 inmediatamente
    setProgresoAnimado(0);

    // Esperar un frame para que el browser pinte el 0, luego animar
    const timer = requestAnimationFrame(() => {
      setProgresoAnimado(esNivelMaximo ? 100 : progresoCalculado);
    });

    return () => cancelAnimationFrame(timer);
  }, [progresoCalculado, billetera.negocioId, esNivelMaximo]);

  const barraProgreso = !nivelesActivos ? null : esNivelMaximo ? (
    // Nivel Oro: barra dorada al 100%
    <div className="mt-2 lg:mt-3.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm lg:text-[11px] 2xl:text-sm text-yellow-600 font-semibold">
          ¡Nivel máximo!
        </span>
        <span className="text-sm lg:text-[11px] 2xl:text-sm font-bold text-yellow-600">
          100%
        </span>
      </div>
      <div className="w-full h-1.5 lg:h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progresoAnimado}%`,
            background: nivel.barBg,
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  ) : puntosFaltantes !== null && (
    // Bronce/Plata: barra con progreso
    <div className="mt-2 lg:mt-3.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-semibold">
          {billetera.progreso.siguienteNivel === 'plata' ? '🥈 Plata' : '🥇 Oro'}
        </span>
        <span
          className="text-sm lg:text-[11px] 2xl:text-sm font-bold"
          style={{ color: nivel.colorLight }}
        >
          {progresoCalculado}%
        </span>
      </div>
      <div className="w-full h-1.5 lg:h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${progresoAnimado}%`,
            background: nivel.barBg,
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
      <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 mt-1">
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
        data-testid={`billetera-movil-${billetera.negocioId}`}
        className="lg:hidden group bg-white rounded-2xl overflow-hidden flex flex-row transition-all duration-300 shadow-md hover:shadow-xl cursor-pointer"
        style={{ height: '185px' }}
      >
        {/* Imagen izquierda (portada) */}
        <div className="w-36 shrink-0 relative overflow-hidden">
          {imagenPortadaMovil}
          {/* Overlay gradiente derecho */}
          <div
            className="absolute inset-y-0 right-0 w-8 pointer-events-none"
            style={{ background: 'linear-gradient(to left, rgba(255,255,255,0.3), transparent)' }}
          />
        </div>

        {/* Línea separadora vertical con gradiente */}
        <div
          className="w-1 shrink-0 self-stretch"
          style={{ background: 'linear-gradient(to bottom, #DD7C07, #000000)' }}
        />

        {/* Info derecha */}
        <div className="flex-1 p-3 flex flex-col justify-between min-w-0 overflow-hidden">
          {/* Nombre del negocio + logo */}
          <div className="flex items-center gap-2 min-w-0">
            {billetera.negocioLogo && (
              <img
                src={billetera.negocioLogo}
                alt={billetera.negocioNombre}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
              />
            )}
            <h4 className="text-lg font-bold text-slate-800 truncate leading-tight">
              {billetera.negocioNombre}
            </h4>
          </div>

          {/* Puntos */}
          <div className="flex items-center gap-2">
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
              <div className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">
                puntos disponibles
              </div>
            </div>
          </div>

          {/* Nivel o iconos de contacto */}
          {nivelesActivos ? (
            <div
              className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-lg"
              style={{ background: nivel.badgeBg, border: '1px solid rgba(0,0,0,0.08)' }}
            >
              <span className="text-sm font-medium" style={{ color: nivel.color }}>Eres Nivel</span>
              <span className="text-sm leading-none">{nivel.icono}</span>
              <span className="text-sm font-bold" style={{ color: nivel.color }}>{nivel.label}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {billetera.whatsappContacto && (
                <a
                  href={`https://wa.me/${billetera.whatsappContacto.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-8 h-8 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <img src="/whatsapp.webp" alt="WhatsApp" className="w-8 h-8 object-contain" />
                </a>
              )}
              <button
                onClick={handleChatYA}
                className="w-auto h-8 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              >
                <img src="/ChatYA.webp" alt="ChatYA" className="w-auto h-8 object-contain" />
              </button>
            </div>
          )}

          {/* Botón Ver detalles */}
          <div
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold text-sm lg:text-[11px] 2xl:text-sm text-white"
            style={{ background: '#1e293b' }}
          >
            <span>Ver detalles</span>
            <ChevronRight className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DESKTOP: Layout vertical clásico (>= lg)
      ═══════════════════════════════════════════════════════════════════ */}
      <div
        data-testid={`billetera-desktop-${billetera.negocioId}`}
        className="hidden lg:flex lg:h-[327px] 2xl:h-[363px] group bg-white rounded-2xl overflow-hidden flex-col transition-all duration-300 shadow-md hover:shadow-xl"
      >
        {/* Header: Portada del negocio */}
        <div className="w-full h-32 2xl:h-40 shrink-0 relative overflow-hidden">
          {imagenPortadaMovil}
          {/* Overlay gradiente abajo */}
          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }}
          />
          {/* Logo + Nombre sobre la imagen */}
          <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center gap-2 min-w-0">
            {billetera.negocioLogo && (
              <img
                src={billetera.negocioLogo}
                alt={billetera.negocioNombre}
                className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full object-cover shrink-0 border-2 border-white"
                style={{ boxShadow: '0 2px 8px rgba(255,255,255,0.4)' }}
              />
            )}
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
          className="h-1.5 w-full shrink-0"
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
              <div className="text-[11px] 2xl:text-sm text-slate-600 font-medium">
                puntos disponibles
              </div>
            </div>
          </div>

          {/* Barra de progreso o iconos de contacto */}
          {barraProgreso}
          {!nivelesActivos && (
            <div className="flex items-center gap-2 mt-2.5 lg:mt-2 2xl:mt-2.5">
              {billetera.whatsappContacto && (
                <a
                  href={`https://wa.me/${billetera.whatsappContacto.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-9 h-9 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <img src="/whatsapp.webp" alt="WhatsApp" className="w-8 h-8 object-contain" />
                </a>
              )}
              <button
                onClick={handleChatYA}
                className="w-auto h-9 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
              >
                <img src="/ChatYA.webp" alt="ChatYA" className="w-auto h-8 object-contain" />
              </button>
            </div>
          )}

          {/* Botón */}
          <div className="mt-auto pt-3.5">
            <button
              onClick={() => onClick(billetera)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-white cursor-pointer active:scale-[0.97] hover:bg-slate-700 transition-colors duration-150"
              style={{ background: '#1e293b' }}
            >
              <span className="text-xs 2xl:text-[13px]">Ver detalles</span>
              <ChevronRight className="w-4 h-4 2xl:w-4 2xl:h-4 text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}