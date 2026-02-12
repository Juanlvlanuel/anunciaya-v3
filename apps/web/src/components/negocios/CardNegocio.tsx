/**
 * ============================================================================
 * COMPONENTE: CardNegocio — Glassmorphism Immersive
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/components/negocios/CardNegocio.tsx
 * 
 * PROPÓSITO:
 * Card reutilizable de negocio con diseño "todo sobre la imagen"
 * 
 * CARACTERÍSTICAS:
 * - Crossfade suave entre imágenes del carrusel (autoplay 3.8s)
 * - Swipe táctil para navegación de imágenes
 * - Dot indicators con animación de expansión
 * - Status pill (Abierto/Cerrado) con efecto pulse
 * - Like button con bounce + pulse ring cuando está activo
 * - Glass action bar con contacto (ChatYA, WhatsApp) + Ver Perfil
 * - Color accent dinámico por categoría del negocio
 * - Rating en pill con backdrop-blur
 * - Categoría y distancia como meta chips
 * - Pre-fetch de perfil completo (IntersectionObserver + hover)
 * - Animación flotante de like/unlike con portal
 * 
 * LAYOUT:
 * - Unificado: mismo diseño glassmorphism en todos los viewports
 * - Card normal: h-[250px] full width (se adapta al contenedor padre)
 * - forzarVertical: w-[270px] h-[410px] (Business Studio preview)
 * 
 * USO:
 * - PaginaNegocios (vista lista móvil + carrusel desktop)
 * - Business Studio (preview con forzarVertical)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Smile,
  Frown,
  Star,
  Store,
  ChevronRight,
} from 'lucide-react';
import { useNegociosCacheStore } from '../../stores/useNegociosCacheStore';
import { useHorariosNegocio } from '../../hooks/useHorariosNegocio';
import { useVotos } from '../../hooks/useVotos';
import { ModalHorarios } from './ModalHorarios';
import type { NegocioResumen } from '../../types/negocios';

// =============================================================================
// TIPOS
// =============================================================================

export interface CardNegocioProps {
  negocio: NegocioResumen;
  seleccionado: boolean;
  onSelect: () => void;
  modoPreview?: boolean;
}

// =============================================================================
// COLOR ACCENT POR CATEGORÍA
// =============================================================================

interface AccentColor {
  from: string;
  to: string;
}

const ACCENT_MAP: Record<string, AccentColor> = {
  comida:       { from: '#f97316', to: '#ea580c' },   // Naranja
  salud:        { from: '#ef4444', to: '#dc2626' },   // Rojo
  belleza:      { from: '#ec4899', to: '#db2777' },   // Rosa
  servicios:    { from: '#3b82f6', to: '#2563eb' },   // Azul
  comercios:    { from: '#22c55e', to: '#16a34a' },   // Verde
  diversión:    { from: '#a855f7', to: '#7c3aed' },   // Púrpura
  diversion:    { from: '#a855f7', to: '#7c3aed' },   // Púrpura (sin tilde)
  movilidad:    { from: '#14b8a6', to: '#0d9488' },   // Teal
  finanzas:     { from: '#3b82f6', to: '#1d4ed8' },   // Azul oscuro
  educación:    { from: '#8b5cf6', to: '#6d28d9' },   // Violeta
  educacion:    { from: '#8b5cf6', to: '#6d28d9' },   // Violeta (sin tilde)
  mascotas:     { from: '#f59e0b', to: '#d97706' },   // Amber
  turismo:      { from: '#eab308', to: '#ca8a04' },   // Dorado
};

const ACCENT_DEFAULT: AccentColor = { from: '#3b82f6', to: '#2563eb' };

function getAccentColor(categoriaNombre: string | undefined): AccentColor {
  if (!categoriaNombre) return ACCENT_DEFAULT;
  const key = categoriaNombre.toLowerCase().trim();
  // Búsqueda exacta primero
  if (ACCENT_MAP[key]) return ACCENT_MAP[key];
  // Búsqueda parcial
  for (const [mapKey, color] of Object.entries(ACCENT_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) return color;
  }
  return ACCENT_DEFAULT;
}

// =============================================================================
// KEYFRAMES (inyectados una sola vez)
// =============================================================================

const CARD_STYLES = `
  @keyframes cardStatusPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes cardHeartBounce {
    0% { transform: scale(1); }
    25% { transform: scale(1.35); }
    50% { transform: scale(0.9); }
    75% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  @keyframes cardHeartRingPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; }
    50% { transform: scale(1.5); opacity: 0; }
  }
  @keyframes cardFloatUp {
    0% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-50px); }
  }
`;

// =============================================================================
// COMPONENTE
// =============================================================================

export function CardNegocio({ negocio, seleccionado, modoPreview = false }: CardNegocioProps) {
  const navigate = useNavigate();

  // ✅ Estado de visibilidad para optimizar carrusel

  // ✅ Pre-fetch COMPLETO (perfil + ofertas + catálogo)
  const { prefetchCompleto } = useNegociosCacheStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const prefetchEjecutado = useRef(false);

  const [modalHorariosAbierto, setModalHorariosAbierto] = useState(false);
  const { horarios, loading: loadingHorarios, fetchHorarios, reset: resetHorarios } = useHorariosNegocio();
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const [likePosition, setLikePosition] = useState({ top: 0, left: 0 });

  // Crossfade carousel state
  const [imagenActual, setImagenActual] = useState(0);
  const [imagenPrevia, setImagenPrevia] = useState<number | null>(null);
  const [crossfading, setCrossfading] = useState(false);

  // Touch swipe para carrusel
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isSwiping = useRef(false);

  // Heart bounce
  const [heartBounce, setHeartBounce] = useState(false);

  // Color accent
  const accent = getAccentColor(negocio.categorias?.[0]?.nombre);

  // ── Crossfade helper ──
  const irAImagen = useCallback((siguiente: number) => {
    if (siguiente === imagenActual) return;
    setImagenPrevia(imagenActual);
    setCrossfading(true);
    setImagenActual(siguiente);
    setTimeout(() => {
      setCrossfading(false);
      setImagenPrevia(null);
    }, 500);
  }, [imagenActual]);

  // ── Touch handlers ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    isSwiping.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    if (!negocio.galeria || negocio.galeria.length <= 1) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipe = 50;
    if (diff > minSwipe) {
      irAImagen(imagenActual === negocio.galeria.length - 1 ? 0 : imagenActual + 1);
    } else if (diff < -minSwipe) {
      irAImagen(imagenActual === 0 ? negocio.galeria.length - 1 : imagenActual - 1);
    }
  };

  // ── Ref para acceder a imagenActual dentro del interval ──
  const imagenActualRef = useRef(imagenActual);
  useEffect(() => { imagenActualRef.current = imagenActual; }, [imagenActual]);

  // ── Pre-fetch COMPLETO cuando la tarjeta es visible (para móvil) ──
  useEffect(() => {
    if (!cardRef.current || prefetchEjecutado.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !prefetchEjecutado.current) {
            prefetchEjecutado.current = true;
            prefetchCompleto(negocio.sucursalId);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [negocio.sucursalId, prefetchCompleto]);

  // ── Handlers ──
  const handleVerHorarios = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const data = await fetchHorarios(negocio.sucursalId);
    if (data) setModalHorariosAbierto(true);
  };

  const handleCerrarModalHorarios = () => {
    setModalHorariosAbierto(false);
    resetHorarios();
  };

  // ✅ Handlers de hover para pre-fetch
  const handleMouseEnter = () => {
    if (!prefetchEjecutado.current) {
      prefetchEjecutado.current = true;
      prefetchCompleto(negocio.sucursalId);
    }
  };

  const handleMouseLeave = () => {
    // Vacío por ahora
  };

  const handleClick = () => {
    const url = modoPreview
      ? `/negocios/${negocio.sucursalId}?preview=true`
      : `/negocios/${negocio.sucursalId}`;
    navigate(url);
  };

  const handleChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implementar navegación a ChatYA
  };

  const { liked, toggleLike } = useVotos({
    entityType: 'sucursal',
    entityId: negocio.sucursalId,
    initialLiked: negocio.liked,
  });

  const [likeAnimation, setLikeAnimation] = useState<'like' | 'unlike' | null>(null);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likeButtonRef.current) {
      const rect = likeButtonRef.current.getBoundingClientRect();
      setLikePosition({ top: rect.top - 50, left: rect.left - 30 });
    }
    setLikeAnimation(liked ? 'unlike' : 'like');
    setHeartBounce(true);
    toggleLike();
    setTimeout(() => setHeartBounce(false), 500);
    setTimeout(() => setLikeAnimation(null), 2000);
  };

  // ── Datos derivados ──
  const distanciaTexto = negocio.distanciaKm !== null
    ? Number(negocio.distanciaKm) < 1
      ? `${Math.round(Number(negocio.distanciaKm) * 1000)} m`
      : `${Number(negocio.distanciaKm).toFixed(1)} km`
    : null;

  const calificacion = negocio.calificacionPromedio ? parseFloat(negocio.calificacionPromedio) : 0;
  const tieneResenas = negocio.totalCalificaciones > 0;
  const categoriaNombre = negocio.categorias?.[0]?.nombre || 'Negocio';

  // =========================================================================
  // RENDER: Imagen con crossfade (compartido)
  // =========================================================================
  const renderImagen = () => (
    <>
      {/* Imagen previa (se desvanece) */}
      {imagenPrevia !== null && negocio.galeria?.[imagenPrevia] && (
        <img
          src={negocio.galeria[imagenPrevia].url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: crossfading ? 0 : 1,
            transition: 'opacity 0.5s ease',
            zIndex: 1,
          }}
        />
      )}
      {/* Imagen actual */}
      {negocio.galeria && negocio.galeria.length > 0 ? (
        <img
          src={negocio.galeria[imagenActual]?.url}
          alt={negocio.galeria[imagenActual]?.titulo || negocio.negocioNombre}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            opacity: crossfading && imagenPrevia !== null ? 0.5 : 1,
            transition: 'opacity 0.5s ease',
            zIndex: 2,
          }}
        />
      ) : negocio.logoUrl ? (
        <img
          src={negocio.logoUrl}
          alt={negocio.negocioNombre}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 2 }}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center" style={{ zIndex: 2 }}>
          <Store className="w-10 h-10 text-slate-300" />
        </div>
      )}
    </>
  );

  // =========================================================================
  // RENDER: Dot indicators (compartido)
  // =========================================================================
  const renderDots = (dotSize: string, dotActiveWidth: string, gap: string, top: string) => {
    if (!negocio.galeria || negocio.galeria.length <= 1) return null;
    return (
      <div className={`absolute ${top} left-0 right-0 z-15 flex justify-center ${gap}`}>
        {negocio.galeria.slice(0, 5).map((_, index) => (
          <button
            key={index}
            onClick={(e) => { e.stopPropagation(); irAImagen(index); }}
            className={`${dotSize} rounded-full cursor-pointer transition-all duration-300 ease-out border-0 p-0 ${
              index === imagenActual
                ? `${dotActiveWidth} bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]`
                : 'bg-white/35'
            }`}
          />
        ))}
      </div>
    );
  };

  // =========================================================================
  // RENDER: Status pill con pulse (compartido)
  // =========================================================================
  const renderStatusPill = (sizeClass: string) => {
    if (negocio.estaAbierto === null) return null;
    const abierto = negocio.estaAbierto;
    return (
      <button
        onClick={handleVerHorarios}
        disabled={loadingHorarios}
        className={`absolute z-15 backdrop-blur-[10px] rounded-full flex items-center cursor-pointer hover:opacity-90 transition-opacity ${sizeClass} ${
          abierto ? 'bg-green-500/85' : 'bg-red-500/85'
        }`}
      >
        {/* Dot con pulse */}
        <span className="relative w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-white z-2" />
          <span
            className="absolute -inset-[3px] rounded-full z-1"
            style={{
              background: 'rgba(255,255,255,0.5)',
              animation: abierto
                ? 'cardStatusPulse 2s ease-in-out infinite'
                : 'cardStatusPulse 2.5s ease-in-out infinite',
            }}
          />
        </span>
        <span className="text-white font-bold leading-none">
          {loadingHorarios ? '...' : abierto ? 'Abierto' : 'Cerrado'}
        </span>
      </button>
    );
  };

  // =========================================================================
  // RENDER: Heart button con pulse ring (compartido)
  // =========================================================================
  const renderHeartButton = (sizeClass: string, iconSize: string) => (
    <button
      ref={likeButtonRef}
      onClick={handleLikeClick}
      className={`absolute z-15 bg-black/25 backdrop-blur-[10px] rounded-full flex items-center justify-center cursor-pointer overflow-visible ${sizeClass} ${
        liked ? 'bg-red-500/25 border border-red-500/30' : 'border border-white/10'
      }`}
      style={{
        animation: heartBounce ? 'cardHeartBounce 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)' : undefined,
      }}
    >
      {/* Pulse ring cuando liked */}
      {liked && (
        <span
          className="absolute -inset-1 rounded-full border-2 border-red-500/35 pointer-events-none"
          style={{ animation: 'cardHeartRingPulse 2s ease-in-out infinite' }}
        />
      )}
      <svg className={iconSize} viewBox="0 0 24 24">
        <path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill={liked ? '#ef4444' : 'rgba(255,255,255,0.7)'}
          stroke={liked ? 'white' : 'rgba(255,255,255,0.9)'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );

  // =========================================================================
  // RENDER: Like animation portal (compartido)
  // =========================================================================
  const renderLikeAnimation = () => {
    if (!likeAnimation) return null;
    return createPortal(
      <div
        className={`fixed flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap shadow-lg ${
          likeAnimation === 'like' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}
        style={{
          top: likePosition.top,
          left: likePosition.left,
          zIndex: 99999,
          pointerEvents: 'none',
          animation: 'cardFloatUp 1.5s ease-out forwards',
        }}
      >
        {likeAnimation === 'like' ? (
          <><Smile className="w-5 h-5" /><span className="text-sm font-medium">¡Gracias!</span></>
        ) : (
          <><Frown className="w-5 h-5" /><span className="text-sm font-medium">¡Oh no!</span></>
        )}
      </div>,
      document.body
    );
  };

  // =========================================================================
  // RENDER: WhatsApp icon SVG (compartido)
  // =========================================================================
  const renderWhatsAppIcon = (sizeClass: string) => (
    <svg className={`${sizeClass} text-green-500`} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );

  // =========================================================================
  // RENDER: Card Glassmorphism Immersive (unificado para todos los viewports)
  // =========================================================================
  const renderCard = () => (
    <div
      className="relative w-full h-60 2xl:h-[220px] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Crossfade images */}
      {renderImagen()}

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-3 pointer-events-none" style={{
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 32%, rgba(0,0,0,0.1) 55%, transparent 75%)',
      }} />

      {/* Accent glow bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] z-25 opacity-85"
        style={{ background: `linear-gradient(90deg, ${accent.from}, ${accent.to})` }}
      />

      {/* Dot indicators */}
      {renderDots('h-[5px] w-[5px]', 'w-[18px]', 'gap-[5px]', 'top-[10px]')}

      {/* Status pill — pegado a esquina superior izquierda */}
      {renderStatusPill('top-2 left-2 gap-[6px] px-3 py-[5px] text-[13px]')}

      {/* Heart button — pegado a esquina superior derecha */}
      {renderHeartButton('top-1.5 right-1.5 w-[38px] h-[38px]', 'w-5 h-5')}

      {/* Bottom content */}
      <div className="absolute bottom-[3px] left-0 right-0 z-10 px-3 pb-1.5">
        {/* Logo + Name + Meta + Rating */}
        <div className="flex items-center gap-2.5">
          {/* Logo circular */}
          {negocio.logoUrl ? (
            <img
              src={negocio.logoUrl}
              alt={negocio.negocioNombre}
              className="w-[42px] h-[42px] rounded-full object-cover shrink-0 border-2 border-white/80 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
            />
          ) : (
            <div className="w-[42px] h-[42px] rounded-full shrink-0 border-2 border-white/80 bg-black/30 backdrop-blur-sm flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
              <Store className="w-5 h-5 text-white/70" />
            </div>
          )}

          {/* Nombre + Categoría+Rating / Distancia */}
          <div className="min-w-0 flex-1">
            <h3 className="text-[19px] font-extrabold text-white leading-none truncate"
              style={{ WebkitTextStroke: '1.8px rgba(0,0,0,1)', paintOrder: 'stroke fill', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 1px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000' }}
            >
              {negocio.negocioNombre}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[13px] font-bold text-white"
                style={{ WebkitTextStroke: '1.2px rgba(0,0,0,1)', paintOrder: 'stroke fill', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 1px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000' }}
              >
                {categoriaNombre}
              </span>
              {tieneResenas && (
                <span className="flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-[13px] font-extrabold text-white"
                    style={{ WebkitTextStroke: '1.2px rgba(0,0,0,1)', paintOrder: 'stroke fill', textShadow: '1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 0 1px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000' }}
                  >{calificacion.toFixed(1)}</span>
                </span>
              )}
            </div>
          </div>

          {/* Distancia resaltada */}
          {distanciaTexto && (
            <div className="flex items-center gap-1 shrink-0 bg-black/40 backdrop-blur-sm rounded-[10px] px-2.5 py-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="white" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" fill="rgba(0,0,0,0.4)" stroke="none" />
              </svg>
              <span className="text-[13px] font-bold text-white">{distanciaTexto}</span>
            </div>
          )}
        </div>

        {/* Glass action bar */}
        <div className="flex items-center justify-between mt-1 bg-white/10 backdrop-blur-xl rounded-[14px] pl-3.5 pr-[5px] py-1.5 border border-white/12">
          {/* Contact icons */}
          <div className="flex items-center gap-3">
            <button onClick={handleChat} className="cursor-pointer flex items-center gap-1.5 bg-transparent border-0 p-0 active:opacity-70 transition-opacity">
              <img src="/ChatYA.webp" alt="ChatYA" className="h-7 w-auto" />
            </button>
            {negocio.whatsapp && (
              <>
                <div className="w-px h-5 bg-white/18" />
                <button
                  onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${negocio.whatsapp}`, '_blank'); }}
                  className="cursor-pointer flex items-center bg-transparent border-0 p-0 active:opacity-70 transition-opacity"
                >
                  {renderWhatsAppIcon('w-6 h-6')}
                </button>
              </>
            )}
          </div>

          {/* Ver Perfil button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleClick(); }}
            className="flex items-center gap-1 rounded-[10px] px-3.5 py-[7px] text-[13px] font-bold text-white cursor-pointer border-0 active:scale-95 transition-transform"
            style={{
              background: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
              boxShadow: `0 3px 14px ${accent.from}55`,
            }}
          >
            Ver Perfil
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // =========================================================================
  // RENDER PRINCIPAL
  // =========================================================================
  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`shrink-0 transition-all duration-200 ${
        modoPreview ? 'scale-[1.2] origin-left' : ''
      } ${
        seleccionado ? 'ring-2 ring-blue-500 scale-[1.02] rounded-2xl' : ''
      }`}
    >
      {renderCard()}

      {/* Like animation portal */}
      {renderLikeAnimation()}

      {/* Modal de horarios */}
      {modalHorariosAbierto && horarios && (
        <ModalHorarios horarios={horarios} onClose={handleCerrarModalHorarios} />
      )}

      <style>{CARD_STYLES}</style>
    </div>
  );
}

export default CardNegocio;