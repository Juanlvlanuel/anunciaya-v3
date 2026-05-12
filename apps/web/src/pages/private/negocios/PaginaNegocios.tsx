/**
 * ============================================================================
 * PÁGINA: PaginaNegocios v2.0
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/negocios/PaginaNegocios.tsx
 *
 * PROPÓSITO:
 * Página principal de la sección Negocios con diseño estándar (CardYA/Cupones/Guardados).
 * Mapa compacto arriba + grid de cards abajo (desktop).
 * Toggle lista/mapa en mobile.
 *
 * COLOR MARCA: Blue (#3b82f6 → #2563eb)
 * REGLA: Azul solo para acentos decorativos. Botones/chips/filtros en slate.
 */

import { useState, useEffect, useRef, useMemo, useCallback, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ChipsFiltros } from '../../../components/negocios/ChipsFiltros';
import {
  List,
  Map as MapIcon,
  MapPin,
  Plus,
  Minus,
  Locate,
  Check,
  Store,
  Loader2,
  Star,
  ChevronRight,
  ChevronLeft,
  Menu,
  Search,
  X,
  Sparkles,
  Bell,
} from 'lucide-react';
import { useNegociosLista } from '../../../hooks/queries/useNegocios';
import { useFiltrosNegociosStore } from '../../../stores/useFiltrosNegociosStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import { usePerfilCategorias, usePerfilSubcategorias } from '../../../hooks/queries/usePerfil';
import { useSearchStore } from '../../../stores/useSearchStore';
import { useUiStore } from '../../../stores/useUiStore';
import { useMainScrollStore } from '../../../stores/useMainScrollStore';
import { useChatYAStore } from '../../../stores/useChatYAStore';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';
import { useNotificacionesStore } from '../../../stores/useNotificacionesStore';
import { IconoMenuMorph } from '../../../components/ui/IconoMenuMorph';
import { CardNegocio } from '../../../components/negocios/CardNegocio';
import type { NegocioResumen } from '../../../types/negocios';

// Importar estilos de Leaflet
import 'leaflet/dist/leaflet.css';

// =============================================================================
// CONSTANTES
// =============================================================================

type TabNegocios = 'lista' | 'mapa';

const TABS_NEGOCIOS_DESKTOP: { id: TabNegocios; label: string; Icono: typeof List }[] = [
  { id: 'mapa', label: 'Mapa', Icono: MapIcon },
  { id: 'lista', label: 'Lista', Icono: List },
];

const TABS_NEGOCIOS_MOBILE: { id: TabNegocios; label: string; Icono: typeof List }[] = [
  { id: 'lista', label: 'Lista', Icono: List },
  { id: 'mapa', label: 'Mapa', Icono: MapIcon },
];

// =============================================================================
// ICONOS DE MARKERS
// =============================================================================

const iconoNegocio = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const iconoSeleccionadoAnimado = new L.DivIcon({
  className: '',
  html: `<div class="pin-seleccionado-wrapper">
    <div class="pin-pulse-ring"></div>
    <div class="pin-pulse-ring pin-pulse-ring-2"></div>
    <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png" class="pin-icon-img" />
    <img src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png" class="pin-shadow-img" />
  </div>`,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
});

const iconoUsuario = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// =============================================================================
// ESTILOS CSS
// =============================================================================

const POPUP_STYLES = `
  .popup-negocio .leaflet-popup-content-wrapper {
    padding: 0;
    border-radius: 16px;
    overflow: hidden;
    border: 2px solid #94a3b8;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
  }
  .popup-negocio .leaflet-popup-content {
    margin: 0;
    min-width: 240px;
    max-width: 270px;
  }
  .popup-negocio .leaflet-popup-tip {
    box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  }
  .popup-negocio .leaflet-popup-close-button {
    top: 8px !important;
    right: 8px !important;
    width: 30px !important;
    height: 30px !important;
    font-size: 20px !important;
    font-weight: 700 !important;
    color: rgba(255,255,255,0.7) !important;
    background: rgba(255,255,255,0.15) !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 0 !important;
    padding: 0 0 1px 0 !important;
    text-indent: 0 !important;
    text-align: center !important;
    transition: all 0.15s !important;
    cursor: pointer !important;
    z-index: 9999 !important;
    pointer-events: auto !important;
    position: absolute !important;
  }
  .popup-negocio .leaflet-popup-close-button:hover {
    color: #fff !important;
    background: rgba(255,255,255,0.3) !important;
  }
  .popup-negocio p {
    margin: 0 !important;
  }
  @keyframes popupStatusPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .pin-seleccionado-wrapper {
    position: relative;
    width: 30px;
    height: 49px;
  }
  .pin-icon-img {
    width: 30px;
    height: 49px;
    position: relative;
    z-index: 2;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  }
  .pin-shadow-img {
    position: absolute;
    left: 0;
    top: 1px;
    width: 41px;
    height: 41px;
    z-index: 0;
    opacity: 0.65;
  }
  .pin-pulse-ring {
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%) scale(1);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 3px solid #ef4444;
    opacity: 0;
    animation: pinPulseAnim 2s ease-out infinite;
    z-index: 1;
  }
  .pin-pulse-ring-2 {
    animation-delay: 0.8s;
  }
  @keyframes pinPulseAnim {
    0% { transform: translateX(-50%) scale(0.8); opacity: 0.9; }
    100% { transform: translateX(-50%) scale(3.5); opacity: 0; }
  }
  .negocios-tabs::-webkit-scrollbar { display: none; }
  .negocios-tabs { -ms-overflow-style: none; scrollbar-width: none; }
  .negocios-cards-scroll::-webkit-scrollbar { width: 12px; }
  .negocios-cards-scroll::-webkit-scrollbar-track { background: transparent; }
  .negocios-cards-scroll::-webkit-scrollbar-thumb { background: #94a3b8; border-radius: 6px; }
  .negocios-cards-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }
`;

// =============================================================================
// COMPONENTE: PopupNegocio
// =============================================================================

interface PopupNegocioProps {
  negocio: NegocioResumen;
  onVerPerfil: () => void;
  onChat: () => void;
}

function PopupNegocio({ negocio, onVerPerfil, onChat }: PopupNegocioProps) {
  const calificacion = negocio.calificacionPromedio ? parseFloat(negocio.calificacionPromedio) : 0;
  const tieneResenas = negocio.totalCalificaciones > 0;

  const distanciaTexto = negocio.distanciaKm !== null
    ? Number(negocio.distanciaKm) < 1
      ? `${Math.round(Number(negocio.distanciaKm) * 1000)} m`
      : `${Number(negocio.distanciaKm).toFixed(1)} km`
    : null;

  return (
    <div>
      {/* Header oscuro con glow azul */}
      <div
        className="relative px-4 py-3 overflow-hidden"
        style={{ background: '#000000' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.12) 0%, transparent 60%)' }}
        />
        <div className="relative z-10 flex items-center gap-3">
          {negocio.logoUrl ? (
            <img
              src={negocio.logoUrl}
              alt={negocio.negocioNombre}
              className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-white/20"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
            >
              <Store className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-bold text-white leading-tight truncate">
              {negocio.negocioNombre}
            </h3>
            {negocio.totalSucursales > 1 && (
              <p className="text-sm font-medium text-white/70 truncate mt-0.5">
                {negocio.esPrincipal ? 'Matriz' : negocio.sucursalNombre}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-center gap-3 pb-4 text-[14px]">
          {negocio.estaAbierto !== null && (
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: negocio.estaAbierto ? '#22c55e' : '#ef4444',
                  animation: 'popupStatusPulse 2s ease-in-out infinite',
                }}
              />
              <span className={`font-bold ${negocio.estaAbierto ? 'text-green-600' : 'text-red-500'}`}>
                {negocio.estaAbierto ? 'Abierto' : 'Cerrado'}
              </span>
            </div>
          )}
          {tieneResenas && (
            <>
              <div className="w-px h-4 bg-slate-400" />
              <div className="flex items-center gap-1.5">
                <Star className="w-4.5 h-4.5 text-amber-400 fill-amber-400" />
                <span className="font-bold text-slate-800">{calificacion.toFixed(1)}</span>
                <span className="text-[13px] text-slate-400">({negocio.totalCalificaciones})</span>
              </div>
            </>
          )}
          {distanciaTexto && (
            <>
              <div className="w-px h-4 bg-slate-400" />
              <div className="flex items-center gap-1.5 text-slate-500">
                <MapPin className="w-4 h-4" />
                <span className="font-bold">{distanciaTexto}</span>
              </div>
            </>
          )}
        </div>

        {negocio.direccion && (
          <div className="flex items-center gap-2 pt-1 pb-1 border-t border-slate-300">
            <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
            <p className="text-[14px] font-bold text-slate-500 leading-snug line-clamp-2 pt-0.5">
              {negocio.direccion}
            </p>
          </div>
        )}

        <div className="h-px bg-slate-300 my-3" />

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onVerPerfil(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[14px] font-bold text-white cursor-pointer border-0 active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              boxShadow: '0 2px 8px rgba(15,23,42,0.40)',
            }}
          >
            Ver Perfil
            <ChevronRight className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onChat(); }}
            className="cursor-pointer shrink-0 hover:scale-110 active:scale-95"
          >
            <img src="/IconoRojoChatYA.webp" alt="ChatYA" className="h-11 w-auto" />
          </button>
          {negocio.whatsapp && (
            <button
              onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${negocio.whatsapp}`, '_blank'); }}
              className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center cursor-pointer shrink-0 hover:scale-110 active:scale-95 p-1.5"
            >
              <svg className="w-full h-full text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE: Controles del Mapa (overlay dentro del mapa)
// =============================================================================

function ControlesMapa({ onMapReady }: { onMapReady?: (map: L.Map) => void }) {
  const map = useMap();
  const { latitud, longitud } = useGpsStore();

  useEffect(() => {
    if (latitud && longitud) {
      map.setView([latitud, longitud], 15);
    }
  }, [latitud, longitud, map]);

  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map, onMapReady]);

  // Invalidar tamaño cuando el contenedor cambie
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 300);
  }, [map]);

  return null;
}

// =============================================================================
// COMPONENTE: Controles de zoom (overlay blanco)
// =============================================================================

function MapaControlesZoom({ latitud, longitud }: { mapRef?: unknown; latitud: number | null; longitud: number | null }) {
  const map = useMap();
  const controlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (controlRef.current) {
      L.DomEvent.disableClickPropagation(controlRef.current);
      L.DomEvent.disableScrollPropagation(controlRef.current);
    }
  }, []);

  return (
    <div ref={controlRef} className="absolute bottom-3 left-3 lg:left-auto lg:right-3 z-1000 bg-slate-900 rounded-xl shadow-lg border border-slate-700 flex flex-row overflow-hidden">
      <button
        data-testid="btn-mapa-zoom-in"
        onPointerDown={(e) => { e.stopPropagation(); map.zoomIn(); }}
        className="w-11 h-11 lg:w-9 lg:h-9 flex items-center justify-center cursor-pointer transition-colors active:bg-slate-700"
      >
        <Plus className="w-5 h-5 lg:w-4 lg:h-4 text-white" />
      </button>
      <div className="w-px h-auto bg-slate-700 my-1.5" />
      <button
        data-testid="btn-mapa-zoom-out"
        onPointerDown={(e) => { e.stopPropagation(); map.zoomOut(); }}
        className="w-11 h-11 lg:w-9 lg:h-9 flex items-center justify-center cursor-pointer transition-colors active:bg-slate-700"
      >
        <Minus className="w-5 h-5 lg:w-4 lg:h-4 text-white" />
      </button>
      <div className="w-px h-auto bg-slate-700 my-1.5" />
      <button
        data-testid="btn-mapa-centrar"
        onPointerDown={(e) => {
          e.stopPropagation();
          if (latitud && longitud) map.setView([latitud, longitud], 15);
        }}
        className="w-11 h-11 lg:w-9 lg:h-9 flex items-center justify-center cursor-pointer transition-colors active:bg-slate-700"
      >
        <Locate className="w-5 h-5 lg:w-4 lg:h-4 text-white" />
      </button>
    </div>
  );
}

// =============================================================================
// COMPONENTE: Mapa compartido (renderizado único)
// =============================================================================

interface MapaNegocionProps {
  centroInicial: [number, number];
  negocios: NegocioResumen[];
  latitud: number | null;
  longitud: number | null;
  negocioSeleccionadoId: string | null;
  getIconoMarker: (id: string) => L.Icon | L.DivIcon;
  handleSeleccionarNegocio: (id: string) => void;
  setNegocioSeleccionadoId: (id: string | null) => void;
  onMapReady: (map: L.Map) => void;
  navigate: ReturnType<typeof useNavigate>;
  markerRefs: React.MutableRefObject<Record<string, L.Marker>>;
  onChat: (negocio: NegocioResumen) => void;
  className?: string;
}

function MapaNegocio({
  centroInicial, negocios, latitud, longitud,
  getIconoMarker, handleSeleccionarNegocio, setNegocioSeleccionadoId,
  onMapReady, navigate, markerRefs, onChat, className = '',
}: MapaNegocionProps) {
  return (
    <MapContainer
      center={centroInicial}
      zoom={14}
      className={`w-full h-full ${className}`}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        keepBuffer={8}
        updateWhenZooming={false}
        updateWhenIdle={true}
      />

      {latitud && longitud && (
        <Marker position={[latitud, longitud]} icon={iconoUsuario}>
          <Popup><p className="font-semibold text-center">Tu ubicación</p></Popup>
        </Marker>
      )}

      {negocios.map((negocio) => {
        if (!negocio.latitud || !negocio.longitud) return null;
        const posicion: [number, number] = [negocio.latitud, negocio.longitud];

        return (
          <Marker
            key={negocio.sucursalId}
            position={posicion}
            icon={getIconoMarker(negocio.sucursalId)}
            eventHandlers={{
              click: () => handleSeleccionarNegocio(negocio.sucursalId),
              add: (e) => { markerRefs.current[negocio.sucursalId] = e.target as L.Marker; },
              popupclose: () => { setNegocioSeleccionadoId(null); },
            }}
          >
            <Popup className="popup-negocio" autoPan={true} autoPanPadding={[70, 70]}>
              <PopupNegocio
                negocio={negocio}
                onVerPerfil={() => navigate(`/negocios/${negocio.sucursalId}`)}
                onChat={() => onChat(negocio)}
              />
            </Popup>
          </Marker>
        );
      })}

      <ControlesMapa onMapReady={onMapReady} />
      <MapaControlesZoom latitud={latitud} longitud={longitud} />
    </MapContainer>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaNegocios() {
  const navigate = useNavigate();
  // Botón ← respeta historial (flecha nativa móvil) con fallback a /inicio.
  const handleVolver = useVolverAtras('/inicio');
  const mapRef = useRef<L.Map | null>(null);
  const btnCategoriaRef = useRef<HTMLButtonElement>(null);
  const btnSubcategoriaRef = useRef<HTMLButtonElement>(null);
  const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const abrirChatYA = useUiStore((s) => s.abrirChatYA);

  const handleChatPopup = useCallback((negocio: NegocioResumen) => {
    if (!negocio.usuarioId) return;
    // Sufijo de sucursal coherente con el resto del UI: solo si >1 sucursales,
    // y para la principal usar "Matriz" en lugar del nombre (duplicado).
    const sucursalParaHeader =
      negocio.totalSucursales > 1
        ? (negocio.esPrincipal ? 'Matriz' : negocio.sucursalNombre)
        : undefined;
    abrirChatTemporal({
      id: `temp_${Date.now()}`,
      otroParticipante: {
        id: negocio.usuarioId,
        nombre: negocio.negocioNombre,
        apellidos: '',
        avatarUrl: negocio.logoUrl,
        negocioNombre: negocio.negocioNombre,
        negocioLogo: negocio.logoUrl || undefined,
        sucursalNombre: sucursalParaHeader || undefined,
      },
      datosCreacion: {
        participante2Id: negocio.usuarioId,
        participante2Modo: 'comercial',
        participante2SucursalId: negocio.sucursalId,
        contextoTipo: 'negocio',
      },
    });
    abrirChatYA();
  }, [abrirChatTemporal, abrirChatYA]);

  // Refs para sincronización bidireccional
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Estado
  const [negocioSeleccionadoId, setNegocioSeleccionadoId] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<TabNegocios>(window.innerWidth >= 1024 ? 'mapa' : 'lista');
  const [buscadorMovilAbierto, setBuscadorMovilAbierto] = useState(false);
  const [busquedaLocal, setBusquedaLocal] = useState('');
  const inputBusquedaRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsScrollRef = useRef<HTMLDivElement>(null);
  const [dropdownDistancia, setDropdownDistancia] = useState(false);
  const [posDropdownDist, setPosDropdownDist] = useState({ top: 0, left: 0 });
  const [dropdownCategoria, setDropdownCategoria] = useState(false);
  const [dropdownSubcategoria, setDropdownSubcategoria] = useState(false);
  const [posicionDropdownCat, setPosicionDropdownCat] = useState({ top: 0, left: 0 });
  const [posicionDropdownSub, setPosicionDropdownSub] = useState({ top: 0, left: 0 });

  // Detectar modo preview card
  const searchParams = new URLSearchParams(window.location.search);
  const esModoPreviewCard = searchParams.get('preview') === 'card';
  const sucursalIdPreview = searchParams.get('sucursalId');

  // Stores y hooks
  const { latitud, longitud } = useGpsStore();
  const ciudadGps = useGpsStore(s => s.ciudad);
  const nombreCiudad = ciudadGps?.nombre || 'tu ciudad';
  const { data: negociosRaw = [], isPending: loading } = useNegociosLista();
  const searchQuery = useSearchStore((s) => s.query);
  const cerrarBuscador = useSearchStore((s) => s.cerrarBuscador);

  // Negocios: el backend filtra por búsqueda, categoría, distancia, etc.
  // El filtro client-side del searchQuery global (Navbar) se mantiene como fallback
  const negocios = useMemo(() => {
    if (!searchQuery.trim()) return negociosRaw;
    const q = searchQuery.toLowerCase();
    return negociosRaw.filter((n) => {
      const nombreNegocio = (n.negocioNombre || '').toLowerCase();
      const nombreSucursal = (n.sucursalNombre || '').toLowerCase();
      const categoriaPadre = (n.categorias?.[0]?.categoria?.nombre || '').toLowerCase();
      const subcategorias = (n.categorias || []).map(cat => (cat.nombre || '').toLowerCase()).join(' ');
      const direccion = (n.direccion || '').toLowerCase();
      const ciudad = (n.ciudad || '').toLowerCase();
      return nombreNegocio.includes(q) || nombreSucursal.includes(q) || categoriaPadre.includes(q) || subcategorias.includes(q) || direccion.includes(q) || ciudad.includes(q);
    });
  }, [searchQuery, negociosRaw]);

  const { data: categorias = [] } = usePerfilCategorias();
  const {
    categoria, setCategoria,
    subcategorias: subcategoriasSeleccionadas, setSubcategorias,
    cercaDeMi, toggleCercaDeMi,
    distancia, setDistancia,
    soloCardya, toggleSoloCardya,
    conEnvio, toggleConEnvio,
    conServicioDomicilio, toggleConServicioDomicilio,
    aDomicilio, toggleADomicilio,
    setBusqueda,
    setVistaActiva,
    filtrosActivos, limpiarFiltros,
    resetearFiltrosTemporales,
  } = useFiltrosNegociosStore();

  const { data: opcionesSubcategorias = [] } = usePerfilSubcategorias(categoria ?? 0);

  const centroInicial: [number, number] = latitud && longitud
    ? [latitud, longitud]
    : [31.3125, -113.5275];

  // Debounce: sincronizar búsqueda local → store (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusqueda(busquedaLocal);
    }, 400);
    return () => clearTimeout(timer);
  }, [busquedaLocal, setBusqueda]);

  // Cleanup al salir
  useEffect(() => {
    return () => {
      resetearFiltrosTemporales();
      cerrarBuscador();
    };
  }, []);

  // Sincronización bidireccional
  const handleSeleccionarNegocio = useCallback((sucursalId: string) => {
    const nuevoId = negocioSeleccionadoId === sucursalId ? null : sucursalId;
    setNegocioSeleccionadoId(nuevoId);

    if (mapRef.current && nuevoId) {
      const negocio = negocios.find(n => n.sucursalId === nuevoId);
      const lat = Number(negocio?.latitud);
      const lng = Number(negocio?.longitud);
      if (negocio && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        mapRef.current.stop();
        // Centrar el mapa para que el popup (que abre hacia arriba) quede visible
        // Calculamos offset basado en el tamaño del contenedor del mapa
        const mapContainer = mapRef.current.getContainer();
        const containerHeight = mapContainer.clientHeight;
        // El popup ocupa ~250px hacia arriba, centramos el pin en el tercio inferior
        const targetPoint = mapRef.current.project([lat, lng], 17);
        targetPoint.y -= containerHeight * 0.25; // Desplazar 25% hacia arriba
        const targetLatLng = mapRef.current.unproject(targetPoint, 17);
        mapRef.current.flyTo(targetLatLng, 17, { duration: 0.5 });
        setTimeout(() => { markerRefs.current[nuevoId]?.openPopup(); }, 600);
      }
    }

    if (nuevoId) {
      setTimeout(() => {
        cardRefs.current[nuevoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [negocios, negocioSeleccionadoId]);

  const getIconoMarker = (sucursalId: string): L.Icon | L.DivIcon => {
    if (sucursalId === negocioSeleccionadoId) return iconoSeleccionadoAnimado;
    return iconoNegocio;
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

  // NOTA: NO agregar useLayoutEffect que llame `btnCategoriaRef.current.getBoundingClientRect()`
  // aquí. Hay 2 instancias de ChipsFiltros renderizadas (desktop + móvil) que
  // comparten el mismo ref → el ref termina apuntando al botón oculto con
  // `lg:hidden`, cuyas coords son {0,0} en `getBoundingClientRect`. Las coords
  // correctas se calculan en el `onClick` del chip usando `e.currentTarget`
  // (ver `ChipsFiltros.tsx`).


  // Auto-scroll al cambiar a lista en mobile
  useEffect(() => {
    if (tabActiva === 'lista' && negocioSeleccionadoId) {
      setTimeout(() => {
        cardRefs.current[negocioSeleccionadoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [tabActiva, negocioSeleccionadoId]);

  // El scroll real de la página en desktop vive en el <main> de MainLayout
  // (overflow-y-auto fixed), NO en window. El store guarda esa ref.
  // En mobile con header propio, MainLayout pone null para que se use window.
  const mainScrollRef = useMainScrollStore(s => s.mainScrollRef);

  // Compresión sticky scroll-aware:
  // - Vista Mapa (desktop): scroll en el contenedor interno de cards.
  // - Vista Lista (desktop/mobile): scroll en el <main> de MainLayout (o window si null).
  const scrollRefActivo = useMemo((): RefObject<HTMLElement | null> | undefined => {
    if (tabActiva === 'mapa') return cardsScrollRef as RefObject<HTMLElement | null>;
    return mainScrollRef ?? undefined;
  }, [tabActiva, mainScrollRef]);

  // Notificaciones — botón Bell en el header móvil (entre buscar y menú).
  const cantidadNoLeidas = useNotificacionesStore((s) => s.totalNoLeidas);
  const togglePanelNotificaciones = useNotificacionesStore((s) => s.togglePanel);

  // BottomNav auto-hide tracker: replicar mismas condiciones que BottomNav.tsx
  // para que el FAB Mapa/Lista baje cuando el BottomNav se oculta y suba
  // cuando reaparece. En vista mapa el BottomNav está disabled (siempre visible).
  const { shouldShow: bottomNavVisible } = useHideOnScroll({
    direction: 'down',
    disabled: tabActiva === 'mapa',
  });

  // Header de tamaño fijo (alineado al patrón de Ofertas/MarketPlace).
  // La lógica de compresión por scroll se eliminó — el header ya es lo
  // suficientemente delgado en su tamaño base.

  // ResizeObserver en el header: actualiza --negocios-header-h en tiempo real
  // mientras dura la transición CSS (300ms), no solo al inicio.
  // Necesario para que el contenedor mapa+cards crezca suavemente al comprimirse.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--negocios-header-h', `${el.offsetHeight}px`);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Invalidar mapa al cambiar tab a mapa + sincronizar store
  useEffect(() => {
    setVistaActiva(tabActiva === 'mapa' ? 'mapa' : 'lista');
    if (tabActiva === 'mapa') {
      setTimeout(() => { mapRef.current?.invalidateSize(); }, 200);
    }
  }, [tabActiva, setVistaActiva]);

  // Props compartidos del mapa
  const mapaProps = {
    centroInicial,
    negocios,
    latitud,
    longitud,
    negocioSeleccionadoId,
    getIconoMarker,
    handleSeleccionarNegocio,
    setNegocioSeleccionadoId,
    onMapReady: (m: L.Map) => { mapRef.current = m; },
    navigate,
    markerRefs,
    onChat: handleChatPopup,
  };

  // Props compartidos de ChipsFiltros
  const chipsFiltrosProps = {
    cercaDeMi, toggleCercaDeMi,
    distancia, setDistancia,
    categoria, categorias,
    dropdownCategoria, setDropdownCategoria,
    btnCategoriaRef, setPosicionDropdownCat,
    opcionesSubcategorias, subcategoriasSeleccionadas,
    dropdownSubcategoria, setDropdownSubcategoria,
    btnSubcategoriaRef, setPosicionDropdownSub,
    soloCardya, toggleSoloCardya,
    conEnvio, toggleConEnvio,
    conServicioDomicilio, toggleConServicioDomicilio,
    aDomicilio, toggleADomicilio,
    dropdownDistancia, setDropdownDistancia,
    posDropdownDist, setPosDropdownDist,
    filtrosActivos, limpiarFiltros,
  };

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
      <div className="min-h-screen bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-start p-4 pl-6">
        <div className="w-full max-w-[300px]">
          <CardNegocio negocio={negocioPreview} seleccionado={false} onSelect={() => {}} modoPreview={true} />
        </div>
      </div>
    );
  }

  // =============================================================================
  // RENDER: Layout estándar (CardYA/Cupones/Guardados pattern)
  // =============================================================================

  return (
    <>
      <style>{POPUP_STYLES}</style>

      <div className="min-h-full bg-transparent" data-testid="pagina-negocios">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* HEADER STICKY — Patrón estándar con glow azul                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={headerRef} className="sticky top-0 z-20">
          <div className="lg:max-w-7xl lg:mx-auto lg:px-6 2xl:px-8">
            <div
              className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
              style={{ background: '#000000' }}
            >
              {/* Glow sutil azul */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(59,130,246,0.07) 0%, transparent 50%)' }}
              />
              {/* Grid pattern */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: 0.08,
                  backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px),
                                   repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)`,
                }}
              />

              <div className="relative z-10">

                {/* ══ MOBILE HEADER ══ */}
                <div className="lg:hidden">
                  {!buscadorMovilAbierto ? (
                    <>
                      {/* Fila principal: flecha, nombre, buscador, menú */}
                      <div className="flex items-center justify-between gap-1 px-2 pt-4 pb-2.5">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <button
                            data-testid="btn-volver-negocios"
                            onClick={handleVolver}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                          >
                            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                          </button>
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                          >
                            <Store className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
                          </div>
                          <span className="flex flex-col leading-none min-w-0 ml-1.5">
                            <span className="text-2xl font-extrabold text-white tracking-tight">
                              Negocios
                            </span>
                            <span className="text-xs font-bold uppercase tracking-[0.16em] text-blue-400">
                              Locales
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-0 -mr-1 shrink-0">
                          <button
                            data-testid="btn-buscar-negocios"
                            onClick={() => {
                              setBuscadorMovilAbierto(true);
                              setTimeout(() => inputBusquedaRef.current?.focus(), 100);
                            }}
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                          >
                            <Search className="w-6 h-6 animate-pulse" strokeWidth={2.5} />
                          </button>
                          <button
                            data-testid="btn-notificaciones-negocios"
                            onClick={(e) => { e.currentTarget.blur(); togglePanelNotificaciones(); }}
                            aria-label="Notificaciones"
                            className="relative w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                          >
                            <Bell className="w-6 h-6 animate-bell-ring" strokeWidth={2.5} />
                            {cantidadNoLeidas > 0 && (
                              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-bold ring-2 ring-black px-1 leading-none">
                                {cantidadNoLeidas > 9 ? '9+' : cantidadNoLeidas}
                              </span>
                            )}
                          </button>
                          <button
                            data-testid="btn-menu-negocios"
                            onClick={abrirMenuDrawer}
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                          >
                            <IconoMenuMorph />
                          </button>
                        </div>
                      </div>
                      {/* Subtítulo móvil decorativo */}
                      <div className="pb-2 overflow-hidden">
                        <div className="flex items-center justify-center gap-2.5">
                          <div
                            className="h-0.5 w-14 rounded-full"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.7))' }}
                          />
                          <span className="text-base font-light text-white/70 tracking-wide whitespace-nowrap">
                            En <span className="font-bold text-white">{nombreCiudad}</span> · {negocios.length} negocios
                          </span>
                          <div
                            className="h-0.5 w-14 rounded-full"
                            style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.7), transparent)' }}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Buscador activo — reemplaza fila principal */}
                      <div className="flex items-center gap-2.5 px-3 pt-4 pb-2.5">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40 pointer-events-none" />
                          <input
                            ref={inputBusquedaRef}
                            data-testid="input-buscar-negocios"
                            type="text"
                            value={busquedaLocal}
                            onChange={(e) => setBusquedaLocal(e.target.value)}
                            onBlur={() => {
                              if (!busquedaLocal.trim()) {
                                setBuscadorMovilAbierto(false);
                              }
                            }}
                            placeholder="Buscar negocios..."
                            className="w-full bg-white/15 text-white text-lg placeholder-white/40 outline-none rounded-full pl-10 pr-10 py-2"
                          />
                          {busquedaLocal.trim() && (
                            <button
                              onClick={() => { setBusquedaLocal(''); inputBusquedaRef.current?.focus(); }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/25 hover:bg-white/40 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => { setBusquedaLocal(''); setBusqueda(''); setBuscadorMovilAbierto(false); }}
                          className="p-0.5 rounded-full text-white/80 hover:bg-white/20 cursor-pointer shrink-0"
                        >
                          <X className="w-7 h-7" />
                        </button>
                      </div>
                      {/* Subtítulo se mantiene al buscar */}
                      <div className="flex items-center justify-center gap-2.5 pb-2">
                        <div
                          className="h-0.5 w-14 rounded-full"
                          style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.7))' }}
                        />
                        <span className="text-base font-light text-white/70 tracking-wide whitespace-nowrap">
                          En <span className="font-bold text-white">{nombreCiudad}</span> · {negocios.length} negocios
                        </span>
                        <div
                          className="h-0.5 w-14 rounded-full"
                          style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.7), transparent)' }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* ══ DESKTOP HEADER — Una sola fila integrada con TODO:
                    Logo + tabs Mapa/Lista + chips de filtros + KPI.
                    Los tabs y chips viven en la fila externa SOLO en móvil. ══ */}
                <div className="hidden lg:block">
                  <div className="flex items-center gap-4 px-6 py-4 2xl:px-8 2xl:py-5">
                    {/* Bloque izquierdo: flecha + logo + título (agrupados) */}
                    <div className="flex items-center gap-3 shrink-0">
                      {/* Flecha ← regresar al inicio (solo desktop) */}
                      <button
                        data-testid="btn-volver-negocios-desktop"
                        onClick={handleVolver}
                        aria-label="Volver al inicio"
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                      >
                        <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                      </button>
                      {/* Logo */}
                      <div
                        className="w-11 h-11 2xl:w-12 2xl:h-12 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                      >
                        <Store className="w-6 h-6 2xl:w-6.5 2xl:h-6.5 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex items-baseline">
                        <span className="text-2xl 2xl:text-3xl font-extrabold text-white tracking-tight">
                          Negocios
                        </span>
                        <span className="text-2xl 2xl:text-3xl font-extrabold text-blue-400 tracking-tight">
                          Locales
                        </span>
                      </div>
                    </div>

                    {/* Spacer para empujar chips + KPI a la derecha */}
                    <div className="flex-1" />

                    {/* Derecha: chips de filtros (junto al KPI).
                        Las tabs Mapa/Lista ya NO viven aquí — para liberar espacio
                        ahora son un toggle pill flotante (ver fixed bottom-right). */}
                    <div className="min-w-0 shrink-0 overflow-hidden">
                      <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <ChipsFiltros variante="inline" {...chipsFiltrosProps} />
                      </div>
                    </div>

                    {/* KPI dos líneas — mismo patrón que Ofertas/MP */}
                    <div className="flex flex-col items-end shrink-0">
                      <span
                        data-testid="kpi-total-negocios"
                        className="text-3xl 2xl:text-[40px] font-extrabold text-white leading-none tabular-nums"
                      >
                        {negocios.length}
                      </span>
                      <span className="text-sm lg:text-[11px] 2xl:text-sm font-semibold text-blue-400/80 uppercase tracking-wider mt-1">
                        Negocios
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── TABS Mapa/Lista — eliminadas del header en móvil.
                       Ahora es un FAB flotante anclado al lado derecho
                       (ver bloque TOGGLE FLOTANTE más abajo). ── */}

                {/* ── CHIPS FILTROS — solo móvil, scroll horizontal (mismo
                       patrón que Ofertas y MarketPlace). El popup "Ajustar
                       búsqueda" se eliminó: los chips son inline ahora. ── */}
                <div className="px-3 pb-3 lg:hidden">
                  <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <ChipsFiltros variante="inline" {...chipsFiltrosProps} />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TOGGLE FLOTANTE Mapa/Lista — solo desktop. Las tabs se sacaron    */}
        {/* del header dark para liberar espacio horizontal de los chips de   */}
        {/* filtros. Renderizado por portal en document.body para evitar que  */}
        {/* el `overflow-hidden` del header dark recorte el `fixed`.          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {createPortal(
          <div
            data-testid="toggle-mapa-lista-flotante"
            // z-40 (no z-50): debe quedar DEBAJO del ChatOverlay desktop
            // (z-41) para que el chat lo tape al abrirse. z-50 lo dejaba
            // visible por encima del overlay. z-40 sigue por encima del
            // header sticky de Negocios (z-20). BottomNav también usa
            // z-40 pero solo existe en móvil — sin conflicto en desktop.
            className="hidden lg:flex fixed top-50 lg:right-70 2xl:right-94 z-40 items-center gap-1 rounded-full bg-black p-1.5 shadow-2xl ring-1 ring-white/15 backdrop-blur"
          >
            {TABS_NEGOCIOS_DESKTOP.map(({ id, label, Icono }) => {
              const activo = tabActiva === id;
              return (
                <button
                  key={id}
                  data-testid={`toggle-flotante-${id}`}
                  onClick={() => setTabActiva(id)}
                  aria-pressed={activo}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${activo
                      ? 'bg-white text-blue-700 shadow-md'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <Icono className="w-4 h-4" strokeWidth={2.5} />
                  {label}
                  {id === 'lista' && negocios.length > 0 && (
                    <span className={`text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${activo ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                      }`}>
                      {negocios.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* FAB MÓVIL Mapa/Lista — botón circular flotante anclado al lado    */}
        {/* derecho a media pantalla. Muestra el icono del MODO OPUESTO al    */}
        {/* actual (señal visual de "click aquí para cambiar"). Solo móvil.   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {(() => {
          const opuesta = TABS_NEGOCIOS_MOBILE.find((t) => t.id !== tabActiva);
          if (!opuesta) return null;
          const IconoOpuesta = opuesta.Icono;
          return createPortal(
            <button
              type="button"
              data-testid="fab-toggle-mapa-lista-movil"
              onClick={() => setTabActiva(opuesta.id)}
              aria-label={`Cambiar a vista ${opuesta.label}`}
              style={{
                bottom: bottomNavVisible ? '5rem' : '1rem',
                transition: 'bottom 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out',
              }}
              className="lg:hidden fixed right-4 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-linear-to-br from-slate-800 to-slate-950 text-white shadow-lg hover:scale-105 active:scale-95"
            >
              <IconoOpuesta className="w-6 h-6" strokeWidth={2.5} style={{ animation: 'fab-toggle-wiggle 2.4s ease-in-out infinite' }} />
              <style>{`
                @keyframes fab-toggle-wiggle {
                  0%, 100% { transform: rotate(0deg); }
                  25% { transform: rotate(-12deg); }
                  75% { transform: rotate(12deg); }
                }
              `}</style>
            </button>,
            document.body
          );
        })()}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* CONTENIDO                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className={`relative z-0 lg:max-w-7xl lg:mx-auto ${tabActiva === 'mapa' ? 'p-4 lg:px-6 lg:py-3 2xl:px-8 2xl:py-3' : 'p-4 lg:p-6 2xl:p-8'}`}>

          {/* ── MOBILE: Tab Lista ── */}
          {tabActiva === 'lista' && (
            <div className="lg:hidden" data-testid="negocios-lista-movil">
              {loading && negocios.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : negocios.length === 0 ? (
                filtrosActivos() === 0 ? (
                  <EstadoCiudadSinNegocios ciudad={nombreCiudad} />
                ) : (
                  <EstadoFiltroSinNegocios onLimpiar={limpiarFiltros} />
                )
              ) : (
                <div className="space-y-4">
                  {negocios.map((negocio) => (
                    <div key={negocio.sucursalId} ref={(el) => { cardRefs.current[negocio.sucursalId] = el; }}>
                      <CardNegocio
                        negocio={negocio}
                        seleccionado={negocio.sucursalId === negocioSeleccionadoId}
                        onSelect={() => handleSeleccionarNegocio(negocio.sucursalId)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MOBILE: Tab Mapa ── */}
          {tabActiva === 'mapa' && (
            <div className="lg:hidden -mx-1 -mt-4 -mb-4 fixed inset-0 z-0" data-testid="negocios-mapa-movil" style={{ top: 'var(--negocios-header-h, 150px)', bottom: '70px' }}>
              <div className="relative w-full h-full">
                <MapaNegocio {...mapaProps} />
                {/* Viñeta */}
                <div className="absolute inset-0 pointer-events-none z-5">
                  <div className="absolute top-0 left-0 right-0 h-6 bg-linear-to-b from-white/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-linear-to-t from-white/40 to-transparent" />
                </div>
              </div>
            </div>
          )}

          {/* ── DESKTOP ── */}
          <div className="hidden lg:block" data-testid="negocios-desktop">

            {/* Tab Lista: Solo grid de cards */}
            {tabActiva === 'lista' && (
              <>
                {loading && negocios.length === 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-5 2xl:gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="h-[200px] bg-slate-100 rounded-2xl animate-pulse">
                        <div className="h-[130px] bg-slate-200 rounded-t-2xl" />
                        <div className="p-3 space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-3/4" />
                          <div className="h-3 bg-slate-200 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : negocios.length === 0 ? (
                  filtrosActivos() === 0 ? (
                    <EstadoCiudadSinNegocios ciudad={nombreCiudad} />
                  ) : (
                    <EstadoFiltroSinNegocios onLimpiar={limpiarFiltros} />
                  )
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4 lg:gap-5 2xl:gap-6">
                    {negocios.map((negocio) => (
                      <div key={negocio.sucursalId} ref={(el) => { cardRefs.current[negocio.sucursalId] = el; }}>
                        <CardNegocio
                          negocio={negocio}
                          seleccionado={negocio.sucursalId === negocioSeleccionadoId}
                          onSelect={() => handleSeleccionarNegocio(negocio.sucursalId)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Tab Mapa: Cards izquierda + Mapa derecha */}
            {tabActiva === 'mapa' && (
              <div className="flex gap-4 2xl:gap-5" style={{ height: 'calc(100vh - 83px - var(--negocios-header-h) - 24px)' }}>
                {/* Cards scrollable izquierda */}
                <div ref={cardsScrollRef} className="negocios-cards-scroll w-[380px] 2xl:w-[420px] shrink-0 overflow-y-auto overflow-x-visible pr-1 z-10">
                  {loading && negocios.length === 0 ? (
                    <div className="flex flex-col gap-5">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-[200px] bg-slate-100 rounded-2xl animate-pulse">
                          <div className="h-[130px] bg-slate-200 rounded-t-2xl" />
                          <div className="p-3 space-y-2">
                            <div className="h-4 bg-slate-200 rounded w-3/4" />
                            <div className="h-3 bg-slate-200 rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : negocios.length === 0 ? (
                    filtrosActivos() === 0 ? (
                      <EstadoCiudadSinNegocios ciudad={nombreCiudad} />
                    ) : (
                      <EstadoFiltroSinNegocios onLimpiar={limpiarFiltros} />
                    )
                  ) : (
                    <div className="flex flex-col gap-4 2xl:gap-5 pb-4">
                      {negocios.map((negocio) => (
                        <div key={negocio.sucursalId} ref={(el) => { cardRefs.current[negocio.sucursalId] = el; }}>
                          <CardNegocio
                            negocio={negocio}
                            seleccionado={negocio.sucursalId === negocioSeleccionadoId}
                            onSelect={() => handleSeleccionarNegocio(negocio.sucursalId)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mapa fijo derecha */}
                <div className="flex-1 relative rounded-2xl border border-slate-200 overflow-hidden">
                  <MapaNegocio {...mapaProps} />
                  {/* Viñeta sutil */}
                  <div className="absolute inset-0 pointer-events-none z-5">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-linear-to-b from-white/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-white/30 to-transparent" />
                    <div className="absolute top-0 bottom-0 left-0 w-8 bg-linear-to-r from-white/30 to-transparent" />
                    <div className="absolute top-0 bottom-0 right-0 w-8 bg-linear-to-l from-white/30 to-transparent" />
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* DROPDOWNS GLOBALES (posición fixed)                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}

        {/* Dropdown distancia ELIMINADO en v3.1.
            El control ahora vive dentro de ChipsFiltros como un chip
            secundario "📍 N km ▾" que aparece cuando "Cerca de ti" está
            activo. Tiene su propio dropdown local con slider en tiempo real. */}

        {/* Dropdowns Categoría/Subcategoría — estilo blanco original (claro
            sobre fondo dark del header). `position: fixed` con coords
            calculadas en el `onClick` del chip vía `e.currentTarget`. */}
        {dropdownCategoria && (
          <div
            data-dropdown
            className="fixed bg-slate-100 rounded-xl border border-slate-300 shadow-md z-99999 py-1.5 overflow-hidden w-[220px]"
            style={{ top: posicionDropdownCat.top, left: posicionDropdownCat.left }}
          >
            <div className="max-h-[300px] overflow-y-auto">
              <button
                onClick={() => { setCategoria(null); setSubcategorias([]); setDropdownCategoria(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold cursor-pointer ${!categoria ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-200/70'}`}
                data-testid="dropdown-cat-todas"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${!categoria ? 'bg-white ring-2 ring-white/80' : 'bg-slate-300'}`}>
                  {!categoria && <Check className="w-3 h-3 text-blue-500" strokeWidth={3} />}
                </div>
                Todas
              </button>
              {categorias.map((cat) => {
                const isSelected = categoria === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setCategoria(cat.id); setSubcategorias([]); setDropdownCategoria(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold cursor-pointer ${isSelected ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-200/70'}`}
                    data-testid={`dropdown-cat-${cat.id}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-white ring-2 ring-white/80' : 'bg-slate-300'}`}>
                      {isSelected && <Check className="w-3 h-3 text-blue-500" strokeWidth={3} />}
                    </div>
                    {cat.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {dropdownSubcategoria && (
          <div
            data-dropdown
            className="fixed bg-slate-100 rounded-xl border border-slate-300 shadow-md z-99999 py-1.5 overflow-hidden w-[220px]"
            style={{ top: posicionDropdownSub.top, left: posicionDropdownSub.left }}
          >
            <div className="max-h-[300px] overflow-y-auto">
              <button
                onClick={() => { setSubcategorias([]); setDropdownSubcategoria(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold cursor-pointer ${subcategoriasSeleccionadas.length === 0 ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-200/70'}`}
                data-testid="dropdown-subcat-todas"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${subcategoriasSeleccionadas.length === 0 ? 'bg-white ring-2 ring-white/80' : 'bg-slate-300'}`}>
                  {subcategoriasSeleccionadas.length === 0 && <Check className="w-3 h-3 text-blue-500" strokeWidth={3} />}
                </div>
                Todas
              </button>
              {opcionesSubcategorias.map((sub) => {
                const isSelected = subcategoriasSeleccionadas.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    onClick={() => { setSubcategorias([sub.id]); setDropdownSubcategoria(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold cursor-pointer ${isSelected ? 'bg-blue-500 text-white' : 'text-slate-700 hover:bg-slate-200/70'}`}
                    data-testid={`dropdown-subcat-${sub.id}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-white ring-2 ring-white/80' : 'bg-slate-300'}`}>
                      {isSelected && <Check className="w-3 h-3 text-blue-500" strokeWidth={3} />}
                    </div>
                    <span className="truncate">{sub.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// ============================================================================
// SUB-COMPONENTES — Estados vacíos
// ============================================================================

/**
 * Ciudad SIN negocios en absoluto (sin filtros aplicados). Mensaje claro:
 * la ciudad aún no tiene comercios registrados, no es un error del usuario.
 */
function EstadoCiudadSinNegocios({ ciudad }: { ciudad: string }) {
  return (
    <div className="relative flex flex-col items-center px-6 pt-10 pb-12 text-center lg:pt-16 lg:pb-20">
      <Sparkles
        className="absolute left-8 top-2 h-5 w-5 animate-pulse text-blue-400/70"
        strokeWidth={2}
        style={{ animationDuration: '2.5s' }}
      />
      <Sparkles
        className="absolute right-10 top-10 h-4 w-4 animate-pulse text-blue-300/70"
        strokeWidth={2}
        style={{ animationDuration: '3.2s', animationDelay: '0.6s' }}
      />

      <div className="relative mb-6">
        <div
          className="absolute inset-0 -m-5 animate-ping rounded-full bg-blue-300/40"
          style={{ animationDuration: '2.4s' }}
        />
        <div
          className="absolute inset-0 -m-2 animate-ping rounded-full bg-blue-400/40"
          style={{ animationDuration: '2.4s', animationDelay: '0.4s' }}
        />
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
        >
          <Store className="h-11 w-11 text-white" strokeWidth={2} />
        </div>
      </div>

      <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
        Aún no hay negocios en{' '}
        <span className="text-blue-600">{ciudad || 'tu ciudad'}</span>
      </h3>
      <p className="max-w-sm text-base text-slate-600">
        Estamos sumando comercios locales. Pronto verás aquí restaurantes,
        tiendas y servicios cerca de ti.
      </p>
    </div>
  );
}

/**
 * Filtro activo sin resultados. CTA para limpiar filtros.
 */
function EstadoFiltroSinNegocios({ onLimpiar }: { onLimpiar: () => void }) {
  return (
    <div className="relative flex flex-col items-center px-6 pt-10 pb-12 text-center lg:pt-16 lg:pb-20">
      <Sparkles
        className="absolute left-8 top-2 h-5 w-5 animate-pulse text-blue-400/70"
        strokeWidth={2}
        style={{ animationDuration: '2.5s' }}
      />
      <Sparkles
        className="absolute right-10 top-10 h-4 w-4 animate-pulse text-blue-300/70"
        strokeWidth={2}
        style={{ animationDuration: '3.2s', animationDelay: '0.6s' }}
      />

      <div className="relative mb-6">
        <div
          className="absolute inset-0 -m-5 animate-ping rounded-full bg-blue-300/40"
          style={{ animationDuration: '2.4s' }}
        />
        <div
          className="absolute inset-0 -m-2 animate-ping rounded-full bg-blue-400/40"
          style={{ animationDuration: '2.4s', animationDelay: '0.4s' }}
        />
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
        >
          <Store className="h-11 w-11 text-white" strokeWidth={2} />
        </div>
      </div>

      <h3 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
        Sin coincidencias
      </h3>
      <p className="mb-6 max-w-sm text-base text-slate-600">
        No encontramos negocios con estos filtros. Prueba ampliar el radio o
        ver todos los negocios de tu ciudad.
      </p>

      <button
        data-testid="btn-limpiar-filtros-negocios"
        onClick={onLimpiar}
        className="inline-flex animate-pulse cursor-pointer items-center gap-2 rounded-full bg-linear-to-br from-blue-500 to-blue-700 px-6 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
        style={{ animationDuration: '2.4s' }}
      >
        <Store className="h-4 w-4" strokeWidth={2.5} />
        Ver todos los negocios
      </button>
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PaginaNegocios;
