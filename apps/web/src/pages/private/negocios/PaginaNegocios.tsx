/**
 * ============================================================================
 * PÁGINA: PaginaNegocios (Estilo Airbnb)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/negocios/PaginaNegocios.tsx
 * 
 * PROPÓSITO:
 * Página principal de la sección Negocios con diseño inmersivo
 * Mapa como protagonista, filtros y tarjetas flotantes
 * 
 * CARACTERÍSTICAS:
 * - Mapa ocupa todo el espacio disponible
 * - Chips de filtros flotantes arriba
 * - Carrusel de tarjetas flotante abajo
 * - Toggle Lista/Mapa
 * - Sincronización tarjeta-marker
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  CreditCard,
  Truck,
  List,
  Map,
  Plus,
  Minus,
  Locate,
  X,
  Smile,
  Frown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  Store,
  Loader2,
} from 'lucide-react';
import { useListaNegocios } from '../../../hooks/useListaNegocios';
import { useFiltrosNegociosStore } from '../../../stores/useFiltrosNegociosStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useNegociosCacheStore } from '../../../stores/useNegociosCacheStore';
import { useCategorias } from '../../../hooks/useCategorias';
import { useSubcategorias } from '../../../hooks/useSubcategorias';
import type { NegocioResumen } from '../../../types/negocios';
import { PanelFiltros } from '../../../components/negocios/PanelFiltros';
import { ModalHorarios } from '../../../components/negocios/ModalHorarios';
import { useHorariosNegocio } from '../../../hooks/useHorariosNegocio';
import { useVotos } from '../../../hooks/useVotos';

// Importar estilos de Leaflet
import 'leaflet/dist/leaflet.css';

// =============================================================================
// ICONOS DE MARKERS
// =============================================================================

const iconoNegocio = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const iconoSeleccionado = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
  shadowSize: [41, 41]
});

const iconoUsuario = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// =============================================================================
// COMPONENTE: Controles del Mapa
// =============================================================================

function ControlesMapa() {
  const map = useMap();
  const { latitud, longitud } = useGpsStore();

  // Offset para compensar espacio de tarjetas y columnas laterales
  const OFFSET_LATITUD = 0.006;   // Mueve hacia arriba
  const OFFSET_LONGITUD = -0.002;  // Mueve hacia la izquierda

  // ✅ Centrar mapa automáticamente cuando cambie la ciudad
  useEffect(() => {
    if (latitud && longitud) {
      map.setView([latitud - OFFSET_LATITUD, longitud + OFFSET_LONGITUD], 15);
    }
  }, [latitud, longitud, map]);

  const handleZoomIn = () => map.zoomIn();
  const handleZoomOut = () => map.zoomOut();
  const handleCentrar = () => {
    if (latitud && longitud) {
      map.setView([latitud - OFFSET_LATITUD, longitud + OFFSET_LONGITUD], 15);
    }
  };

  return (
    <div className="absolute right-4 top-20 z-1000">
      {/* Contenedor con fondo blur y bordes elegantes */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl lg:rounded-xl 2xl:rounded-2xl shadow-lg border border-white/50 p-1.5 lg:p-1 2xl:p-1.5 flex flex-col gap-1 lg:gap-0.5 2xl:gap-1">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-xl lg:rounded-lg 2xl:rounded-xl flex items-center justify-center hover:bg-slate-100/80 active:bg-slate-200/80"
          title="Acercar"
        >
          <Plus className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-slate-700" />
        </button>

        <button
          onClick={handleZoomOut}
          className="w-9 h-9 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-xl lg:rounded-lg 2xl:rounded-xl flex items-center justify-center hover:bg-slate-100/80 active:bg-slate-200/80"
          title="Alejar"
        >
          <Minus className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-slate-700" />
        </button>

        {/* Separador sutil */}
        <div className="h-px bg-slate-200/60 mx-1.5" />

        <button
          onClick={handleCentrar}
          className="w-9 h-9 lg:w-7 lg:h-7 2xl:w-9 2xl:h-9 rounded-xl lg:rounded-lg 2xl:rounded-xl flex items-center justify-center hover:bg-blue-50/80 active:bg-blue-100/80 group"
          title="Mi ubicación"
        >
          <Locate className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-blue-600 group-hover:text-blue-700" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE: Tarjeta del Carrusel
// =============================================================================

interface TarjetaCarruselProps {
  negocio: NegocioResumen;
  seleccionado: boolean;
  onSelect: () => void;
  modoPreview?: boolean;
}

function TarjetaCarrusel({ negocio, seleccionado, modoPreview = false }: TarjetaCarruselProps) {
  const navigate = useNavigate();

  // ✅ Pre-fetch COMPLETO (perfil + ofertas + catálogo)
  const { prefetchCompleto } = useNegociosCacheStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const prefetchEjecutado = useRef(false);

  const [modalHorariosAbierto, setModalHorariosAbierto] = useState(false);
  const { horarios, loading: loadingHorarios, fetchHorarios, reset: resetHorarios } = useHorariosNegocio();
  const likeButtonRef = useRef<HTMLButtonElement>(null);
  const [likePosition, setLikePosition] = useState({ top: 0, left: 0 });
  const [imagenActual, setImagenActual] = useState(0);

  // Autoplay del carrusel
  useEffect(() => {
    if (!negocio.galeria || negocio.galeria.length <= 1) return;

    const intervalo = setInterval(() => {
      setImagenActual((prev) => (prev === negocio.galeria.length - 1 ? 0 : prev + 1));
    }, 3000); // Cambia cada 3 segundos

    return () => clearInterval(intervalo);
  }, [negocio.galeria]);

  // ✅ Pre-fetch COMPLETO cuando la tarjeta es visible (para móvil)
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
      { threshold: 0.5 } // 50% visible
    );

    observer.observe(cardRef.current);

    return () => observer.disconnect();
  }, [negocio.sucursalId, prefetchCompleto]);

  const handleVerHorarios = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const data = await fetchHorarios(negocio.sucursalId);
    if (data) {
      setModalHorariosAbierto(true);
    }
  };

  const handleCerrarModalHorarios = () => {
    setModalHorariosAbierto(false);
    resetHorarios();
  };

  const handleClick = () => {
    const url = modoPreview
      ? `/negocios/${negocio.sucursalId}?preview=true`
      : `/negocios/${negocio.sucursalId}`;
    navigate(url);
  };

  // ✅ Pre-fetch COMPLETO en hover (desktop)
  const handleMouseEnter = () => {
    if (!prefetchEjecutado.current) {
      prefetchEjecutado.current = true;
      prefetchCompleto(negocio.sucursalId);
    }
  };

  const handleChat = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const { liked, toggleLike } = useVotos({
    entityType: 'sucursal',
    entityId: negocio.sucursalId,
    initialLiked: negocio.liked,
  });

  const [likeAnimation, setLikeAnimation] = useState<'like' | 'unlike' | null>(null);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Calcular posición del botón
    if (likeButtonRef.current) {
      const rect = likeButtonRef.current.getBoundingClientRect();
      setLikePosition({
        top: rect.top - 50,
        left: rect.left - 30,
      });
    }

    // Mostrar animación según el estado actual
    if (liked) {
      setLikeAnimation('unlike');
    } else {
      setLikeAnimation('like');
    }

    // Ejecutar el toggle
    toggleLike();

    // Quitar animación después de 1.5 segundos
    setTimeout(() => {
      setLikeAnimation(null);
    }, 2000);
  };

  const distanciaTexto = negocio.distanciaKm !== null
    ? Number(negocio.distanciaKm) < 1
      ? `${Math.round(Number(negocio.distanciaKm) * 1000)} m`
      : `${Number(negocio.distanciaKm).toFixed(1)} km`
    : null;

  const calificacion = negocio.calificacionPromedio ? parseFloat(negocio.calificacionPromedio) : 0;
  const tieneResenas = negocio.totalCalificaciones > 0;

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      className={`
    shrink-0 w-auto h-auto lg:w-[180px] lg:h-[270px] 2xl:w-[270px] 2xl:h-[410px] bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col relative
  transition-all duration-200
  ${seleccionado ? 'ring-2 ring-blue-500 scale-[1.02]' : 'hover:shadow-xl'}
`}
    >
      {/* Línea de acento superior */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-blue-500 to-blue-600 z-10"></div>

      {/* Imagen - Carrusel */}
      <div className="relative h-48 lg:h-[130px] 2xl:h-[200px] shrink-0 mt-1 overflow-hidden">
        {/* Imágenes */}
        {negocio.galeria && negocio.galeria.length > 0 ? (
          <>
            <img
              src={negocio.galeria[imagenActual]?.url}
              alt={negocio.galeria[imagenActual]?.titulo || negocio.negocioNombre}
              className="w-full h-full object-cover"
            />

            {/* Flechas de navegación (solo si hay más de 1 imagen) */}
            {negocio.galeria.length > 1 && (
              <>
                {/* Flecha izquierda */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImagenActual((prev) => (prev === 0 ? negocio.galeria.length - 1 : prev - 1));
                  }}
                  className="absolute left-2 lg:left-1 2xl:left-2 top-1/2 -translate-y-1/2 w-7 h-7 lg:w-5 lg:h-5 2xl:w-7 2xl:h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-110 z-10"
                >
                  <ChevronLeft className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-slate-700" />
                </button>

                {/* Flecha derecha */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImagenActual((prev) => (prev === negocio.galeria.length - 1 ? 0 : prev + 1));
                  }}
                  className="absolute right-2 lg:right-1 2xl:right-2 top-1/2 -translate-y-1/2 w-7 h-7 lg:w-5 lg:h-5 2xl:w-7 2xl:h-7 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md cursor-pointer transition-all hover:scale-110 z-10"
                >
                  <ChevronRight className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-slate-700" />
                </button>

                {/* Indicadores de puntos */}
                <div className="absolute bottom-2 lg:bottom-1 2xl:bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 lg:gap-1 2xl:gap-1.5 z-10">
                  {negocio.galeria.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagenActual(index);
                      }}
                      className={`w-2 h-2 lg:w-1.5 lg:h-1.5 2xl:w-2 2xl:h-2 rounded-full cursor-pointer transition-all ${index === imagenActual
                        ? 'bg-white w-4 lg:w-3 2xl:w-4'
                        : 'bg-white/50 hover:bg-white/75'
                        }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : negocio.logoUrl ? (
          <img
            src={negocio.logoUrl}
            alt={negocio.negocioNombre}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <Store className="w-10 h-10 text-slate-300" />
          </div>
        )}

        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent pointer-events-none"></div>

        {/* Badge estado */}
        {negocio.estaAbierto !== null && (
          <button
            onClick={handleVerHorarios}
            disabled={loadingHorarios}
            className={`absolute top-2 left-2 lg:top-1 lg:left-1 2xl:top-2 2xl:left-2 flex items-center gap-1.5 lg:gap-1 2xl:gap-1.5 rounded-full px-2.5 py-1 lg:px-1.5 lg:py-0.5 2xl:px-2.5 2xl:py-1 shadow-sm cursor-pointer hover:opacity-90 transition-opacity z-10 ${negocio.estaAbierto ? 'bg-green-500' : 'bg-red-500'
              }`}
          >
            <span className={`w-1.5 h-1.5 lg:w-1 lg:h-1 2xl:w-1.5 2xl:h-1.5 rounded-full bg-white ${loadingHorarios ? 'animate-pulse' : ''}`}></span>
            <span className="text-xs lg:text-[10px] 2xl:text-xs font-semibold text-white">
              {loadingHorarios ? 'Cargando...' : negocio.estaAbierto ? 'Abierto' : 'Cerrado'}
            </span>
          </button>
        )}


        {/* Like */}
        <div className="absolute top-1 right-1 lg:top-0 lg:right-0 2xl:top-1 2xl:right-1">
          {/* Botón corazón */}
          <button
            ref={likeButtonRef}
            onClick={handleLikeClick}
            className="w-12 h-12 lg:w-8 lg:h-8 2xl:w-12 2xl:h-12 flex items-center justify-center hover:scale-110 transition-transform cursor-pointer"
          >
            <svg className="w-9 h-9 lg:w-6 lg:h-6 2xl:w-9 2xl:h-9" viewBox="0 0 24 24">
              <path
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                fill={liked ? "#ef4444" : "white"}
                stroke={liked ? "white" : "#ef4444"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Animación flotante - FIXED fuera del card */}
        {likeAnimation && (
          <div
            className={`fixed flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap z-9999 shadow-lg
          ${likeAnimation === 'like' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
          animate-[floatUp_1.5s_ease-out_forwards]
        `}
            style={{
              top: likePosition.top,
              left: likePosition.left,
            }}
          >
            {likeAnimation === 'like' ? (
              <>
                <Smile className="w-5 h-5" />
                <span className="text-sm font-medium">¡Gracias!</span>
              </>
            ) : (
              <>
                <Frown className="w-5 h-5" />
                <span className="text-sm font-medium">¡Oh no!</span>
              </>
            )}
          </div>
        )}

        {/* Distancia flotante */}
        {distanciaTexto && (
          <span className="absolute bottom-2 right-2 lg:bottom-1 lg:right-1 2xl:bottom-2 2xl:right-2 bg-white/95 text-xs lg:text-[10px] 2xl:text-xs font-semibold text-slate-700 px-2 py-1 lg:px-1.5 lg:py-0.5 2xl:px-2 2xl:py-1 rounded-full shadow-sm z-10">
            {distanciaTexto}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-3 lg:px-2 lg:py-2 2xl:px-4 2xl:py-3 flex-1 flex flex-col">
        {/* Nombre + Rating */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 text-xl lg:text-sm 2xl:text-xl leading-tight line-clamp-1 flex-1">
            {negocio.negocioNombre}
          </h3>
          {tieneResenas && (
            <div className="flex items-center gap-1 lg:gap-0.5 2xl:gap-1 shrink-0">
              <Star className="w-5 h-5 lg:w-3 lg:h-3 2xl:w-5 2xl:h-5 text-amber-400 fill-amber-400" />
              <span className="text-lg lg:text-xs 2xl:text-lg font-semibold text-slate-700">{calificacion.toFixed(1)}</span>
              <span className="text-sm lg:text-[10px] 2xl:text-sm text-slate-400">({negocio.totalCalificaciones})</span>
            </div>
          )}
        </div>

        {/* Categoría */}
        <p className="text-base lg:text-[10px] 2xl:text-base text-slate-500 mt-1 lg:mt-0 2xl:mt-1 line-clamp-1">
          {negocio.categorias?.[0]?.nombre || 'Negocio'}
        </p>

        {/* Espaciador */}
        <div className="flex-1"></div>

        {/* Contenedor de contacto + flecha */}
        <div className="flex flex-col gap-3 lg:gap-1.5 2xl:gap-3 mt-1">
          {/* Sección de contacto centrada */}
          <div className="flex flex-col gap-2 lg:gap-1 2xl:gap-2">
            {/* Línea con título */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-300"></div>
              <span className="text-xs lg:text-[10px] 2xl:text-xs text-slate-400 font-medium">Contactar</span>
              <div className="flex-1 h-px bg-slate-300"></div>
            </div>

            {/* Card con botones centrado */}
            <div className="flex items-center justify-center gap-4 lg:gap-1.5 2xl:gap-4 bg-slate-100 rounded-xl lg:rounded-lg 2xl:rounded-xl px-3 py-2 lg:px-1.5 lg:py-1 2xl:px-3 2xl:py-2">
              {/* ChatYA */}
              <div className="relative group">
                <button
                  onClick={handleChat}
                  className="cursor-pointer hover:scale-105 transition-transform flex items-center"
                >
                  <img src="/ChatYA.webp" alt="ChatYA" className="h-7 lg:h-5 2xl:h-7 w-auto" />
                </button>
              </div>

              {/* Separador */}
              <div className="w-px h-6 lg:h-4 2xl:h-6 bg-slate-300"></div>

              {/* WhatsApp */}
              {negocio.whatsapp && (
                <div className="relative group">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://wa.me/${negocio.whatsapp}`, '_blank');
                    }}
                    className="flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-transform"
                  >
                    <svg className="w-6 h-6 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <span className="text-sm lg:text-[10px] 2xl:text-sm font-medium text-green-600">WhatsApp</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Botón Ver Perfil */}
          <button
            onClick={handleClick}
            className="w-full flex items-center justify-center gap-2 lg:gap-1 2xl:gap-2 px-3 py-2 lg:px-2 lg:py-1.5 2xl:px-3 2xl:py-2 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-lg transition-all hover:scale-[1.02] cursor-pointer group"
          >
            <span className="text-sm lg:text-xs 2xl:text-sm font-semibold">Ver Perfil</span>
            <svg className="w-6 h-6 lg:w-4 lg:h-4 2xl:w-6 2xl:h-6 animate-[pulse_1.5s_ease-in-out_infinite] group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>          </button>
        </div>
      </div>
      {/* Modal de horarios */}
      {modalHorariosAbierto && horarios && (
        <ModalHorarios
          horarios={horarios}
          onClose={handleCerrarModalHorarios}
        />
      )}
    </div>
  );
}

// =============================================================================
// COMPONENTE: Panel de Filtros Modal
// =============================================================================

interface PanelFiltrosModalProps {
  abierto: boolean;
  onCerrar: () => void;
}

function PanelFiltrosModal({ abierto, onCerrar }: PanelFiltrosModalProps) {
  const { categorias } = useCategorias();
  const {
    categoria,
    setCategoria,
    distancia,
    setDistancia,
    soloCardya,
    toggleSoloCardya,
    conEnvio,
    toggleConEnvio,
    limpiarFiltros,
  } = useFiltrosNegociosStore();

  if (!abierto) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onCerrar}
        className="fixed inset-0 bg-black/50 z-2000 animate-in fade-in duration-200"
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-2001 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
          <button
            onClick={onCerrar}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">

          {/* Distancia */}
          <div>
            <label htmlFor="input-distancia-filtro" className="text-sm font-medium text-slate-700 mb-3 block">
              Distancia máxima: <span className="text-blue-600">{distancia} km</span>
            </label>
            <input
              id="input-distancia-filtro"
              name="input-distancia-filtro"
              type="range"
              min="1"
              max="50"
              value={distancia}
              onChange={(e) => setDistancia(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>

          {/* Categoría */}
          <div>
            <label htmlFor="select-categoria-filtro" className="text-sm font-medium text-slate-700 mb-3 block">Categoría</label>
            <select
              id="select-categoria-filtro"
              name="select-categoria-filtro"
              value={categoria || ''}
              onChange={(e) => setCategoria(e.target.value ? Number(e.target.value) : null)}
              className="w-full p-3 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icono} {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            <span className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-slate-700">Acepta CardYA</span>
              </div>
              <button
                onClick={toggleSoloCardya}
                className={`
                  w-12 h-6 rounded-full transition-colors
                  ${soloCardya ? 'bg-purple-600' : 'bg-slate-300'}
                `}
              >
                <div className={`
                  w-5 h-5 bg-white rounded-full shadow transition-transform
                  ${soloCardya ? 'translate-x-6' : 'translate-x-0.5'}
                `} />
              </button>
            </span>

            <span className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-slate-700">Con envío a domicilio</span>
              </div>
              <button
                onClick={toggleConEnvio}
                className={`
                  w-12 h-6 rounded-full transition-colors
                  ${conEnvio ? 'bg-green-600' : 'bg-slate-300'}
                `}
              >
                <div className={`
                  w-5 h-5 bg-white rounded-full shadow transition-transform
                  ${conEnvio ? 'translate-x-6' : 'translate-x-0.5'}
                `} />
              </button>
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={limpiarFiltros}
            className="flex-1 px-4 py-3 text-slate-700 font-medium rounded-xl hover:bg-slate-100 transition-colors"
          >
            Limpiar
          </button>
          <button
            onClick={onCerrar}
            className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaNegocios() {
  const navigate = useNavigate();
  const carruselRef = useRef<HTMLDivElement>(null);
  const btnDistanciaRef = useRef<HTMLButtonElement>(null);
  const btnCategoriaRef = useRef<HTMLButtonElement>(null);
  const btnSubcategoriaRef = useRef<HTMLButtonElement>(null);

  // Estado
  const [negocioSeleccionadoId, setNegocioSeleccionadoId] = useState<string | null>(null);
  const [vistaLista, setVistaLista] = useState(window.innerWidth < 768); // En móvil, Lista por defecto
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [drawerFiltrosMovil, setDrawerFiltrosMovil] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [dropdownDistancia, setDropdownDistancia] = useState(false);
  const [dropdownCategoria, setDropdownCategoria] = useState(false);
  const [dropdownSubcategoria, setDropdownSubcategoria] = useState(false);
  const [posicionDropdown, setPosicionDropdown] = useState({ top: 0, left: 0 });
  const [posicionDropdownCat, setPosicionDropdownCat] = useState({ top: 0, left: 0 });
  const [posicionDropdownSub, setPosicionDropdownSub] = useState({ top: 0, left: 0 });
  const [esMovil, setEsMovil] = useState(window.innerWidth < 768);

  // Detectar modo preview card
  const searchParams = new URLSearchParams(window.location.search);
  const esModoPreviewCard = searchParams.get('preview') === 'card';
  const sucursalIdPreview = searchParams.get('sucursalId');

  // Stores y hooks
  const { latitud, longitud } = useGpsStore();
  const { negocios, loading, refetch } = useListaNegocios();
  const { categorias } = useCategorias();
  const {
    categoria,
    setCategoria,
    subcategorias: subcategoriasSeleccionadas,
    setSubcategorias,
    distancia,
    setDistancia,
    soloCardya,
    toggleSoloCardya,
    conEnvio,
    toggleConEnvio,
    setBusqueda: setBusquedaStore,
    filtrosActivos,
    limpiarFiltros,
  } = useFiltrosNegociosStore();

  // Opciones de subcategorías basadas en la categoría seleccionada
  const { subcategorias: opcionesSubcategorias } = useSubcategorias(categoria);

  // Centro del mapa
  const centroInicial: [number, number] = latitud && longitud
    ? [latitud, longitud]
    : [31.3125, -113.5275]; // Puerto Peñasco default

  // Debounce para búsqueda en tiempo real
  // ✅ MEJORA: Solo dispara si la búsqueda realmente cambió
  const busquedaStoreActual = useFiltrosNegociosStore((state) => state.busqueda);

  useEffect(() => {
    // No disparar si el valor ya es igual al del store
    if (busqueda === busquedaStoreActual) return;

    const timer = setTimeout(() => {
      setBusquedaStore(busqueda);
    }, 400);

    return () => clearTimeout(timer);
  }, [busqueda, busquedaStoreActual, setBusquedaStore]);

  // ✅ NUEVO: Recargar negocios cuando cambie la ubicación
  useEffect(() => {
    if (latitud && longitud) {
      refetch();
    }
  }, [latitud, longitud]);

  // Handlers
  const handleSeleccionarNegocio = (sucursalId: string) => {
    setNegocioSeleccionadoId(
      negocioSeleccionadoId === sucursalId ? null : sucursalId
    );
  };

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setBusquedaStore(busqueda);
  };

  const scrollCarrusel = (direccion: 'izq' | 'der') => {
    if (carruselRef.current) {
      const scrollAmount = 300;
      carruselRef.current.scrollBy({
        left: direccion === 'izq' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setDropdownDistancia(false);
        setDropdownCategoria(false);
        setDropdownSubcategoria(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Detectar cambio de tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      setEsMovil(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // =============================================================================
  // RENDER: Modo Preview Card (para Business Studio)
  // =============================================================================

  if (esModoPreviewCard && sucursalIdPreview) {
    const negocioPreview = negocios.find(n => n.sucursalId === sucursalIdPreview);

    if (loading) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      );
    }

    if (!negocioPreview) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <Store className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p>Negocio no encontrado</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
        <div className="w-full max-w-[300px]">
          <TarjetaCarrusel
            negocio={negocioPreview}
            seleccionado={false}
            onSelect={() => { }}
            modoPreview={true}
          />
        </div>
      </div>
    );
  }

  // =============================================================================
  // RENDER: Vista Móvil
  // =============================================================================

  if (esMovil) {
    // Vista Lista Móvil
    if (vistaLista) {
      return (
        <div className="flex flex-col bg-slate-50" style={{ height: 'calc(100vh - 130px - 88px)' }}>

          {/* DRAWER DE FILTROS (desde izquierda, max 60%) */}
          {drawerFiltrosMovil && (
            <>
              {/* Overlay */}
              <div
                className="fixed inset-0 bg-black/40 z-9998"
                onClick={() => setDrawerFiltrosMovil(false)}
              />
              {/* Panel */}
              <div className="fixed top-0 left-0 bottom-0 w-[60%] max-w-[280px] bg-white z-9999 shadow-2xl overflow-y-auto">
                <PanelFiltros onCerrar={() => setDrawerFiltrosMovil(false)} />              </div>
            </>
          )}

          {/* Header con búsqueda y botones */}
          <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Botón Filtros (izquierda) */}
              <div className="relative">
                <button
                  onClick={() => setDrawerFiltrosMovil(true)}
                  className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${filtrosActivos() > 0
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700'
                    }`}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </button>
                {filtrosActivos() > 0 && (
                  <span className="absolute -top-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] bg-red-500 text-white">
                    {filtrosActivos()}
                  </span>
                )}
              </div>

              {/* Búsqueda (centro) */}
              <form onSubmit={handleBuscar} className="flex-1 min-w-0">
                <div className="bg-slate-100 rounded-full px-4 py-3 flex items-center gap-3">
                  <Search className="w-5 h-5 text-slate-400" />
                  <input
                    id="input-busqueda-negocios-movil"
                    name="input-busqueda-negocios-movil"
                    type="text"
                    placeholder="Buscar negocio..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="bg-transparent outline-none text-base flex-1"
                  />
                </div>
              </form>

              {/* Botón cambiar vista (derecha) */}
              <button
                onClick={() => setVistaLista(false)}
                className="shrink-0 w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-700"
              >
                <Map className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lista de tarjetas vertical */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loading && negocios.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : negocios.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Store className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-slate-500">No se encontraron negocios</p>
              </div>
            ) : (
              <div className="space-y-4">
                {negocios.map((negocio) => (
                  <TarjetaCarrusel
                    key={negocio.sucursalId}
                    negocio={negocio}
                    seleccionado={negocio.sucursalId === negocioSeleccionadoId}
                    onSelect={() => handleSeleccionarNegocio(negocio.sucursalId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Vista Mapa Móvil
    return (
      <div className="relative" style={{ height: 'calc(100vh - 130px)' }}>

        {/* DRAWER DE FILTROS (desde izquierda, max 60%) */}
        {drawerFiltrosMovil && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/40 z-9998"
              onClick={() => setDrawerFiltrosMovil(false)}
            />
            {/* Panel */}
            <div className="fixed top-0 left-0 bottom-0 w-[60%] max-w-[280px] bg-white z-9999 shadow-2xl overflow-y-auto">
              <PanelFiltros onCerrar={() => setDrawerFiltrosMovil(false)} />            </div>
          </>
        )}

        {/* Mapa con viñeta difuminada */}
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={centroInicial}
            zoom={14}
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {latitud && longitud && (
              <Marker position={[latitud, longitud]} icon={iconoUsuario}>
                <Popup><p className="font-semibold text-center">Tu ubicación</p></Popup>
              </Marker>
            )}

            {negocios.map((negocio, index) => {
              if (!latitud || !longitud) return null;
              const offsetLat = (Math.sin(index * 1.5) * 0.015);
              const offsetLng = (Math.cos(index * 1.5) * 0.015);
              const posicion: [number, number] = [latitud + offsetLat, longitud + offsetLng];

              return (
                <Marker
                  key={negocio.sucursalId}
                  position={posicion}
                  icon={negocio.sucursalId === negocioSeleccionadoId ? iconoSeleccionado : iconoNegocio}
                  eventHandlers={{ click: () => handleSeleccionarNegocio(negocio.sucursalId) }}
                >
                  <Popup>
                    <div className="min-w-[150px]">
                      <h3 className="font-semibold text-slate-900 text-sm">{negocio.negocioNombre}</h3>
                      <p className="text-xs text-slate-500 mt-1">{negocio.direccion}</p>
                      <button
                        onClick={() => navigate(`/negocios/${negocio.sucursalId}`)}
                        className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium"
                      >
                        Ver perfil
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            <ControlesMapa />
          </MapContainer>

          {/* Viñeta difuminada - 4 lados (solo desktop) */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none z-999">
            {/* Arriba */}
            <div className="absolute top-0 left-0 right-0 h-24 bg-linear-to-b from-slate-100/70 to-transparent" />
            {/* Abajo */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-linear-to-t from-slate-100/70 to-transparent" />
            {/* Izquierda */}
            <div className="absolute top-0 bottom-0 left-0 w-16 bg-linear-to-r from-slate-100/50 to-transparent" />
            {/* Derecha */}
            <div className="absolute top-0 bottom-0 right-0 w-16 bg-linear-to-l from-slate-100/50 to-transparent" />
          </div>
        </div>

        {/* Barra superior con búsqueda y botones */}
        <div className="absolute top-2 left-2 right-2 z-1000">
          <div className="flex items-center gap-3">
            {/* Botón Filtros (izquierda) */}
            <div className="relative">
              <button
                onClick={() => setDrawerFiltrosMovil(true)}
                className={`shrink-0 w-12 h-12 rounded-full shadow-md flex items-center justify-center ${filtrosActivos() > 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700'
                  }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
              {filtrosActivos() > 0 && (
                <span className="absolute -top-1 -right-1 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] bg-red-500 text-white">
                  {filtrosActivos()}
                </span>
              )}
            </div>

            {/* Búsqueda (centro) */}
            <form onSubmit={handleBuscar} className="flex-1 min-w-0">
              <div className="bg-white rounded-full shadow-md px-4 py-3 flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  id="input-busqueda-negocios-desktop"
                  name="input-busqueda-negocios-desktop"
                  type="text"
                  placeholder="Buscar negocio..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="bg-transparent outline-none text-base flex-1"
                />
              </div>
            </form>

            {/* Botón cambiar a Lista (derecha) */}
            <button
              onClick={() => setVistaLista(true)}
              className="shrink-0 w-12 h-12 rounded-full shadow-md bg-white flex items-center justify-center text-slate-700"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carrusel de tarjetas móvil - OCULTO */}
        <div className="hidden absolute bottom-16 left-0 right-0 z-1000">
          <div className="px-4 pb-2">
            <p className="text-xs text-white bg-black/50 rounded-full px-3 py-1 inline-block mb-2">
              {negocios.length} {negocios.length === 1 ? 'negocio' : 'negocios'}
            </p>
          </div>

          {negocios.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-4">
              {negocios.map((negocio) => (
                <div
                  key={negocio.sucursalId}
                  onClick={() => navigate(`/negocios/${negocio.sucursalId}`)}
                  className={`shrink-0 w-64 bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer ${negocioSeleccionadoId === negocio.sucursalId ? 'ring-2 ring-blue-500' : ''
                    }`}
                >
                  <div className="h-28 bg-slate-100 relative">
                    {negocio.logoUrl ? (
                      <img src={negocio.logoUrl} alt={negocio.negocioNombre} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="w-10 h-10 text-slate-300" />
                      </div>
                    )}
                    {negocio.estaAbierto !== null && (
                      <span className={`absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full ${negocio.estaAbierto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        ● {negocio.estaAbierto ? 'Abierto' : 'Cerrado'}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{negocio.negocioNombre}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {negocio.categorias?.[0]?.nombre} • A {Number(negocio.distanciaKm || 0).toFixed(1)} km
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-4 bg-white rounded-xl p-6 text-center">
              <Store className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No se encontraron negocios</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =============================================================================
  // RENDER: Vista Mapa (principal)
  // =============================================================================

  return (
    <div className="relative h-[calc(100vh-90px)] lg:h-[calc(100vh-90px)] w-full">

      {/* MAPA DE FONDO con viñeta */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={centroInicial}
          zoom={14}
          className="w-full h-full"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Marker del usuario */}
          {latitud && longitud && (
            <Marker position={[latitud, longitud]} icon={iconoUsuario}>
              <Popup>
                <p className="font-semibold text-center">Tu ubicación</p>
              </Popup>
            </Marker>
          )}

          {/* Markers de negocios */}
          {negocios.map((negocio) => {
            // Usar coordenadas reales de la sucursal
            if (!negocio.latitud || !negocio.longitud) return null;
            const posicion: [number, number] = [negocio.latitud, negocio.longitud];

            return (
              <Marker
                key={negocio.sucursalId}
                position={posicion}
                icon={negocio.sucursalId === negocioSeleccionadoId ? iconoSeleccionado : iconoNegocio}
                eventHandlers={{
                  click: () => handleSeleccionarNegocio(negocio.sucursalId),
                }}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <h3 className="font-semibold text-slate-900">{negocio.negocioNombre}</h3>
                    <p className="text-xs text-slate-500 mt-1">{negocio.direccion}</p>
                    <button
                      onClick={() => navigate(`/negocios/${negocio.sucursalId}`)}
                      className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium"
                    >
                      Ver perfil
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          <ControlesMapa />
        </MapContainer>

        {/* Viñeta difuminada - 4 lados */}
        <div className="absolute inset-0 pointer-events-none z-999">
          <div className="absolute top-0 left-0 right-0 h-8 bg-linear-to-b from-slate-100 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-slate-100 to-transparent" />
          <div className="absolute top-0 bottom-0 left-0 w-8 bg-linear-to-r from-slate-100 to-transparent" />
          <div className="absolute top-0 bottom-0 right-0 w-8 bg-linear-to-l from-slate-100 to-transparent" />
        </div>
      </div>

      {/* CHIPS DE FILTROS (flotante arriba) */}
      <div className="absolute top-4 left-4 right-4 z-9000">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
          {/* Barra de búsqueda */}
          <form onSubmit={handleBuscar} className="shrink-0">
            <div className="bg-white rounded-full shadow-lg px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 flex items-center gap-2 min-w-[200px] lg:min-w-[140px] 2xl:min-w-[200px]">
              <Search className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-slate-400" />
              <input
                id="input-busqueda-negocios-laptop"
                name="input-busqueda-negocios-laptop"
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar negocio..."
                className="bg-transparent outline-none text-sm lg:text-[11px] 2xl:text-sm w-full"
              />
            </div>
          </form>

          {/* Chip distancia con dropdown */}
          <div className="relative shrink-0" data-dropdown>
            <button
              ref={btnDistanciaRef}
              onClick={(e) => {
                e.stopPropagation();
                if (btnDistanciaRef.current) {
                  const rect = btnDistanciaRef.current.getBoundingClientRect();
                  setPosicionDropdown({ top: rect.bottom + 8, left: rect.left });
                }
                setDropdownDistancia(!dropdownDistancia);
                setDropdownCategoria(false);
                setDropdownSubcategoria(false);
              }}
              className="bg-white rounded-full shadow-lg px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 flex items-center gap-2 lg:gap-1 2xl:gap-2 text-sm lg:text-[11px] 2xl:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <MapPin className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-blue-600" />
              {distancia} km
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownDistancia ? 'rotate-180' : ''}`} />
            </button>

            {dropdownDistancia && (
              <div
                className="fixed bg-white rounded-xl shadow-2xl p-4 min-w-[220px] z-9999 border border-slate-200"
                style={{ top: posicionDropdown.top, left: posicionDropdown.left }}
              >
                <label htmlFor="input-distancia-dropdown" className="text-sm font-medium text-slate-700 mb-3 block">
                  Distancia: <span className="text-blue-600">{distancia} km</span>
                </label>
                <input
                  id="input-distancia-dropdown"
                  name="input-distancia-dropdown"
                  type="range"
                  min="1"
                  max="50"
                  value={distancia}
                  onChange={(e) => setDistancia(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {[1, 3, 5, 10, 25, 50].map((km) => (
                    <button
                      key={km}
                      onClick={() => setDistancia(km)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${distancia === km
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {km}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chip categoría con dropdown */}
          <div className="relative shrink-0" data-dropdown>
            <button
              ref={btnCategoriaRef}
              onClick={(e) => {
                e.stopPropagation();
                if (btnCategoriaRef.current) {
                  const rect = btnCategoriaRef.current.getBoundingClientRect();
                  setPosicionDropdownCat({ top: rect.bottom + 8, left: rect.left });
                }
                setDropdownCategoria(!dropdownCategoria);
                setDropdownDistancia(false);
                setDropdownSubcategoria(false);
              }}
              className={`rounded-full shadow-lg px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 flex items-center gap-2 lg:gap-1 2xl:gap-2 text-sm lg:text-[11px] 2xl:text-sm font-medium transition-colors ${categoria ? 'bg-linear-to-r from-blue-500 to-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                }`}
            >
              <Store className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
              {categoria ? categorias.find(c => c.id === categoria)?.nombre || 'Categoría' : 'Categoría'}
              <ChevronDown className={`w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 transition-transform ${dropdownCategoria ? 'rotate-180' : ''}`} />
            </button>

            {dropdownCategoria && (
              <div
                className="fixed bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-lg z-9999 border border-slate-200 overflow-hidden w-[220px] lg:w-40 2xl:w-[220px]"
                style={{ top: posicionDropdownCat.top, left: posicionDropdownCat.left }}
              >
                {/* Lista con scroll */}
                <div className="max-h-[300px] lg:max-h-[220px] 2xl:max-h-[300px] overflow-y-auto">
                  {/* Opción "Todas" */}
                  <button
                    onClick={() => {
                      setCategoria(null);
                      setSubcategorias([]);
                      setDropdownCategoria(false);
                    }}
                    className={`w-full px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 text-left text-sm lg:text-[11px] 2xl:text-sm flex items-center justify-between transition-colors ${!categoria
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                      }`}
                  >
                    <span>Todas</span>
                    {!categoria && <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-blue-600" />}
                  </button>

                  {/* Separador */}
                  <div className="h-px bg-slate-100" />

                  {/* Lista de categorías */}
                  {categorias.map((cat) => {
                    const isSelected = categoria === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setCategoria(cat.id);
                          setSubcategorias([]);
                          setDropdownCategoria(false);
                        }}
                        className={`w-full px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 text-left text-sm lg:text-[11px] 2xl:text-sm flex items-center justify-between transition-colors ${isSelected
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                          }`}
                      >
                        <span>{cat.nombre}</span>
                        {isSelected && <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Chip subcategoría (solo si hay categoría seleccionada y subcategorías disponibles) */}
          {categoria && opcionesSubcategorias.length > 0 && (
            <div className="relative shrink-0" data-dropdown>
              <button
                ref={btnSubcategoriaRef}
                onClick={(e) => {
                  e.stopPropagation();
                  if (btnSubcategoriaRef.current) {
                    const rect = btnSubcategoriaRef.current.getBoundingClientRect();
                    setPosicionDropdownSub({ top: rect.bottom + 8, left: rect.left });
                  }
                  setDropdownSubcategoria(!dropdownSubcategoria);
                  setDropdownDistancia(false);
                  setDropdownCategoria(false);
                }}
                className={`rounded-full shadow-lg px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 flex items-center gap-2 lg:gap-1 2xl:gap-2 text-sm lg:text-[11px] 2xl:text-sm font-medium transition-colors ${subcategoriasSeleccionadas.length > 0 ? 'bg-linear-to-r from-blue-500 to-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                {subcategoriasSeleccionadas.length > 0
                  ? opcionesSubcategorias.find(s => s.id === subcategoriasSeleccionadas[0])?.nombre || 'Subcategoría'
                  : 'Subcategoría'}
                <ChevronDown className={`w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 transition-transform ${dropdownSubcategoria ? 'rotate-180' : ''}`} />
              </button>

              {dropdownSubcategoria && (
                <div
                  className="fixed bg-white rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-lg z-9999 border border-slate-200 overflow-hidden w-[220px] lg:w-40 2xl:w-[220px]"
                  style={{ top: posicionDropdownSub.top, left: posicionDropdownSub.left }}
                >


                  {/* Lista con scroll */}
                  <div className="max-h-[300px] lg:max-h-[220px] 2xl:max-h-[300px] overflow-y-auto">
                    {/* Opción "Todas" */}
                    <button
                      onClick={() => {
                        setSubcategorias([]);
                        setDropdownSubcategoria(false);
                      }}
                      className={`w-full px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 text-left text-sm lg:text-[11px] 2xl:text-sm flex items-center justify-between transition-colors ${subcategoriasSeleccionadas.length === 0
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                    >
                      <span>Todas</span>
                      {subcategoriasSeleccionadas.length === 0 && (
                        <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-blue-600" />)}
                    </button>

                    {/* Separador */}
                    <div className="h-px bg-slate-100" />

                    {/* Lista de subcategorías */}
                    {opcionesSubcategorias.map((sub) => {
                      const isSelected = subcategoriasSeleccionadas.includes(sub.id);
                      return (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setSubcategorias([sub.id]);
                            setDropdownSubcategoria(false);
                          }}
                          className={`w-full px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 text-left text-sm lg:text-[11px] 2xl:text-sm flex items-center justify-between transition-colors ${isSelected
                            ? 'bg-blue-50 text-blue-700 font-medium'
                            : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                            }`}
                        >
                          <span className="truncate">{sub.nombre}</span>
                          {isSelected && (
                            <Check className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-slate-700 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chip CardYA */}
          <button
            onClick={toggleSoloCardya}
            className={`
        shrink-0 rounded-full shadow-lg px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 flex items-center gap-2 lg:gap-1 2xl:gap-2 text-sm lg:text-[11px] 2xl:text-sm font-medium transition-colors
        ${soloCardya ? 'bg-linear-to-r from-blue-500 to-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}
    `}
          >
            <CreditCard className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
            CardYA
          </button>

          {/* Chip envío */}
          <button
            onClick={toggleConEnvio}
            className={`
        shrink-0 rounded-full shadow-lg px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 flex items-center gap-2 lg:gap-1 2xl:gap-2 text-sm lg:text-[11px] 2xl:text-sm font-medium transition-colors
        ${conEnvio ? 'bg-linear-to-r from-blue-500 to-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}
    `}
          >
            <Truck className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
            Con envío
          </button>

          {/* Botón limpiar filtros (solo si hay filtros activos) */}
          {filtrosActivos() > 0 && (
            <button
              onClick={limpiarFiltros}
              className="shrink-0 bg-red-50 text-red-600 rounded-full shadow-lg px-4 py-2.5 lg:px-2.5 lg:py-1.5 2xl:px-4 2xl:py-2.5 flex items-center gap-2 lg:gap-1 2xl:gap-2 text-sm lg:text-[11px] 2xl:text-sm font-medium hover:bg-red-100 transition-colors"
            >
              <X className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* TOGGLE LISTA/MAPA (solo móvil) */}
      <div className="absolute bottom-52 left-1/2 -translate-x-1/2 z-1000 lg:hidden">
        <div className="bg-slate-900 rounded-full p-1 flex shadow-xl">
          <button
            onClick={() => setVistaLista(true)}
            className={`
        px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors
        ${vistaLista ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}
      `}
          >
            <List className="w-4 h-4" />
            Lista
          </button>
          <button
            onClick={() => setVistaLista(false)}
            className={`
        px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors
        ${!vistaLista ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}
      `}
          >
            <Map className="w-4 h-4" />
            Mapa
          </button>
        </div>
      </div>

      {/* CARRUSEL DE TARJETAS (flotante abajo - solo desktop) */}
      <div className="hidden lg:block absolute bottom-4 lg:bottom-0 left-4 right-4 z-1000">
        {/* Flechas de navegación */}
        <button
          onClick={() => scrollCarrusel('izq')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 bg-white rounded-full shadow-lg flex items-center justify-center z-10 hover:bg-slate-50"
        >
          <ChevronLeft className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600" />
        </button>
        <button
          onClick={() => scrollCarrusel('der')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-10 h-10 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 bg-white rounded-full shadow-lg flex items-center justify-center z-10 hover:bg-slate-50"
        >
          <ChevronRight className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600" />
        </button>

        {/* Carrusel */}
        <div
          ref={carruselRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-6 pb-2"
        >
          {loading && negocios.length === 0 ? (
            // Skeletons de carga (solo primera carga)
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-72 h-48 bg-white rounded-xl shadow-xl animate-pulse">
                <div className="h-32 bg-slate-200 rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))
          ) : negocios.length > 0 ? (
            negocios.map((negocio) => (
              <TarjetaCarrusel
                key={negocio.sucursalId}
                negocio={negocio}
                seleccionado={negocio.sucursalId === negocioSeleccionadoId}
                onSelect={() => handleSeleccionarNegocio(negocio.sucursalId)}
              />
            ))
          ) : (
            <div className="shrink-0 w-full bg-white rounded-xl shadow-xl p-8 text-center">
              <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No se encontraron negocios</p>
              <p className="text-sm text-slate-400 mt-1">Intenta ajustar los filtros</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE FILTROS */}
      <PanelFiltrosModal
        abierto={filtrosAbiertos}
        onCerrar={() => setFiltrosAbiertos(false)}
      />
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PaginaNegocios;