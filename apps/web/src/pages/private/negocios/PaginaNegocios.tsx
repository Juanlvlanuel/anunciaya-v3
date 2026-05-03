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
import { useNavigate } from 'react-router-dom';
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
  SlidersHorizontal,
} from 'lucide-react';
import { useNegociosLista } from '../../../hooks/queries/useNegocios';
import { useScrollDirection } from '../../../hooks/useScrollDirection';
import { useFiltrosNegociosStore } from '../../../stores/useFiltrosNegociosStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import { usePerfilCategorias, usePerfilSubcategorias } from '../../../hooks/queries/usePerfil';
import { useSearchStore } from '../../../stores/useSearchStore';
import { useUiStore } from '../../../stores/useUiStore';
import { useMainScrollStore } from '../../../stores/useMainScrollStore';
import { useChatYAStore } from '../../../stores/useChatYAStore';
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
    <div ref={controlRef} className="absolute bottom-3 right-3 z-1000 bg-slate-900 rounded-xl shadow-lg border border-slate-700 flex flex-row overflow-hidden">
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
  const mapRef = useRef<L.Map | null>(null);
  const btnCategoriaRef = useRef<HTMLButtonElement>(null);
  const btnSubcategoriaRef = useRef<HTMLButtonElement>(null);
  const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
  const abrirChatTemporal = useChatYAStore((s) => s.abrirChatTemporal);
  const abrirChatYA = useUiStore((s) => s.abrirChatYA);

  const handleChatPopup = useCallback((negocio: NegocioResumen) => {
    if (!negocio.usuarioId) return;
    abrirChatTemporal({
      id: `temp_${Date.now()}`,
      otroParticipante: {
        id: negocio.usuarioId,
        nombre: negocio.negocioNombre,
        apellidos: '',
        avatarUrl: negocio.logoUrl,
        negocioNombre: negocio.negocioNombre,
        negocioLogo: negocio.logoUrl || undefined,
        sucursalNombre: negocio.sucursalNombre || undefined,
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
  const [popupFiltrosMovil, setPopupFiltrosMovil] = useState(false);
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

  const { scrollY } = useScrollDirection({
    scrollRef: scrollRefActivo,
    threshold: 10,
    topOffset: 10,
  });

  const [comprimido, setComprimido] = useState(false);

  useEffect(() => {
    if (!comprimido && scrollY > 100) {
      setComprimido(true);
    } else if (comprimido && scrollY < 40) {
      setComprimido(false);
    }
  }, [scrollY, comprimido]);

  // Al cambiar de tab, el scroll del nuevo contenedor comienza desde 0;
  // expandir el header para que el usuario no quede en estado comprimido sin scroll.
  useEffect(() => {
    setComprimido(false);
  }, [tabActiva]);

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
                      <div className={[
                        'flex items-center justify-between px-3 transition-[padding] duration-300',
                        comprimido ? 'pt-2.5 pb-2' : 'pt-4 pb-2.5',
                      ].join(' ')}>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            data-testid="btn-volver-negocios"
                            onClick={() => navigate('/inicio')}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                          >
                            <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                          </button>
                          <div
                            className={[
                              'rounded-lg flex items-center justify-center shrink-0 transition-all duration-300',
                              comprimido ? 'w-7 h-7' : 'w-9 h-9',
                            ].join(' ')}
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                          >
                            <Store
                              className={[
                                'text-white transition-all duration-300',
                                comprimido ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5',
                              ].join(' ')}
                              strokeWidth={2.5}
                            />
                          </div>
                          <span
                            className={[
                              'font-extrabold text-white tracking-tight truncate transition-all duration-300',
                              comprimido ? 'text-base' : 'text-2xl',
                            ].join(' ')}
                          >
                            Negocios <span className="text-blue-400">Locales</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mr-1">
                          {comprimido && (
                            <span className="text-[10px] tracking-[1px] text-white/55 font-medium uppercase mr-1">
                              {negocios.length} HOY
                            </span>
                          )}
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
                            data-testid="btn-menu-negocios"
                            onClick={abrirMenuDrawer}
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
                          >
                            <Menu className="w-6 h-6" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                      {/* Subtítulo móvil — se oculta al comprimir */}
                      <div
                        className={[
                          'transition-[opacity,max-height,padding] duration-300 overflow-hidden',
                          comprimido
                            ? 'opacity-0 max-h-0 pb-0 pointer-events-none'
                            : 'opacity-100 max-h-12 pb-2',
                        ].join(' ')}
                        aria-hidden={comprimido}
                      >
                        <div className="flex items-center justify-center gap-2.5">
                          <div
                            className="h-0.5 w-14 rounded-full"
                            style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.7))' }}
                          />
                          <span className="text-base font-light text-white/70 tracking-wide">
                            Descubre en <span className="font-bold text-white">{nombreCiudad}</span>
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
                        <span className="text-base font-light text-white/70 tracking-wide">
                          Descubre en <span className="font-bold text-white">{nombreCiudad}</span>
                        </span>
                        <div
                          className="h-0.5 w-14 rounded-full"
                          style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.7), transparent)' }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* ══ DESKTOP HEADER ══ */}
                <div className="hidden lg:block">
                  <div className={[
                    'flex items-center justify-between gap-6 px-6 2xl:px-8 transition-[padding] duration-300',
                    comprimido ? 'py-3' : 'py-4 2xl:py-5',
                  ].join(' ')}>
                    {/* Logo + Título (encoge al comprimir) */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div
                        className={[
                          'rounded-lg flex items-center justify-center transition-all duration-300',
                          comprimido ? 'w-10 h-10' : 'w-11 h-11 2xl:w-12 2xl:h-12',
                        ].join(' ')}
                        style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
                      >
                        <Store
                          className={[
                            'text-white transition-all duration-300',
                            comprimido ? 'w-5 h-5' : 'w-6 h-6 2xl:w-6.5 2xl:h-6.5',
                          ].join(' ')}
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="flex items-baseline">
                        <span
                          className={[
                            'font-extrabold text-white tracking-tight transition-all duration-300',
                            comprimido ? 'text-2xl' : 'text-2xl 2xl:text-3xl',
                          ].join(' ')}
                        >
                          Negocios{' '}
                        </span>
                        <span
                          className={[
                            'font-extrabold text-blue-400 tracking-tight transition-all duration-300',
                            comprimido ? 'text-2xl' : 'text-2xl 2xl:text-3xl',
                          ].join(' ')}
                        >
                          Locales
                        </span>
                      </div>
                    </div>

                    {/* Centro: Subtítulo — se oculta al comprimir */}
                    <div
                      className={[
                        'flex-1 text-center min-w-0 transition-[opacity,max-height] duration-300 overflow-hidden',
                        comprimido
                          ? 'opacity-0 max-h-0 pointer-events-none'
                          : 'opacity-100 max-h-24',
                      ].join(' ')}
                      aria-hidden={comprimido}
                    >
                      <h1 className="text-3xl 2xl:text-[34px] font-light text-white/70 leading-tight truncate">
                        Descubre en{' '}
                        <span className="font-bold text-white">{nombreCiudad}</span>
                      </h1>
                      <div className="flex items-center justify-center gap-3 mt-1.5">
                        <div
                          className="h-0.5 w-20 2xl:w-24 rounded-full"
                          style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.7))' }}
                        />
                        <span className="text-sm 2xl:text-base font-semibold text-blue-400/70 uppercase tracking-[3px]">
                          comercios cerca de ti
                        </span>
                        <div
                          className="h-0.5 w-20 2xl:w-24 rounded-full"
                          style={{ background: 'linear-gradient(90deg, rgba(59,130,246,0.7), transparent)' }}
                        />
                      </div>
                    </div>

                    {/* KPIs: primera columna siempre visible, segunda se oculta al comprimir */}
                    <div className="flex items-center gap-5 shrink-0">
                      {/* Comprimido: "19 Negocios" en una línea. Normal: columna vertical. */}
                      {comprimido ? (
                        <div className="flex items-baseline gap-1.5 shrink-0">
                          <span className="text-2xl font-extrabold text-blue-400 leading-none tabular-nums">
                            {negocios.length}
                          </span>
                          <span className="text-sm font-semibold text-white/40 uppercase tracking-wider">
                            Negocios
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center w-16 2xl:w-18">
                          <span className="text-2xl 2xl:text-3xl font-extrabold text-blue-400 leading-none tabular-nums">
                            {negocios.length}
                          </span>
                          <span className="text-xs 2xl:text-sm font-semibold text-white/40 uppercase tracking-wider mt-1">
                            Negocios
                          </span>
                        </div>
                      )}
                      {/* Separador + radio — solo cuando el filtro de cercanía está activo */}
                      {cercaDeMi && (
                        <div
                          className={[
                            'flex items-center gap-5 transition-[opacity,max-height] duration-300 overflow-hidden',
                            comprimido
                              ? 'opacity-0 max-h-0 pointer-events-none'
                              : 'opacity-100 max-h-24',
                          ].join(' ')}
                          aria-hidden={comprimido}
                        >
                          <div className="w-1 h-16 rounded-full" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0.25) 70%, transparent)' }} />
                          <div className="flex flex-col items-center w-16 2xl:w-18">
                            <span className="text-2xl 2xl:text-3xl font-extrabold text-white leading-none whitespace-nowrap">
                              {distancia} km
                            </span>
                            <span className="text-[10px] 2xl:text-[11px] font-semibold text-white/40 uppercase tracking-wider mt-1">
                              Radio
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── TABS ── */}
                <div className="flex items-center">
                  <div className="negocios-tabs flex lg:flex-none overflow-x-auto flex-1">
                    {(window.innerWidth >= 1024 ? TABS_NEGOCIOS_DESKTOP : TABS_NEGOCIOS_MOBILE).map(({ id, label, Icono }) => (
                      <button
                        key={id}
                        data-testid={`tab-negocios-${id}`}
                        onClick={() => setTabActiva(id)}
                        className="flex items-center gap-2 lg:gap-2.5 px-4 lg:px-7 2xl:px-9 py-3 lg:py-3.5 text-base lg:text-base 2xl:text-[17px] cursor-pointer relative whitespace-nowrap shrink-0"
                        style={{
                          color: tabActiva === id ? '#3b82f6' : 'rgba(255,255,255,0.50)',
                          fontWeight: tabActiva === id ? 700 : 500,
                          background: 'transparent',
                        }}
                      >
                        <Icono className="w-4.5 h-4.5 lg:w-5 lg:h-5 2xl:w-[22px] 2xl:h-[22px]" />
                        {label}
                        {id === 'lista' && negocios.length > 0 && (
                          <span className="text-[10px] font-bold bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center">{negocios.length}</span>
                        )}
                        {tabActiva === id && (
                          <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-400" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Botón filtros mobile — en la fila de tabs */}
                  <button
                    data-testid="btn-filtros-movil"
                    onClick={() => setPopupFiltrosMovil(true)}
                    className="lg:hidden ml-auto mr-3 w-9 h-9 rounded-lg flex items-center justify-center cursor-pointer shrink-0 relative transition-colors text-white/50 hover:text-white hover:bg-white/10"
                  >
                    <SlidersHorizontal className="w-5 h-5" strokeWidth={2.5} />
                    {filtrosActivos() > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {filtrosActivos()}
                      </span>
                    )}
                  </button>

                  {/* ChipsFiltros desktop — en la fila de tabs */}
                  <div className="hidden lg:flex items-center gap-2 ml-auto pr-6 2xl:pr-8 overflow-x-auto">
                    <ChipsFiltros variante="inline" {...chipsFiltrosProps} />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

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
                <div className="flex flex-col items-center justify-center py-12 px-4 bg-white border-2 border-[#e8e6e0] rounded-xl shadow-md">
                  <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                    <Store className="w-6 h-6 text-blue-500" strokeWidth={2} />
                  </div>
                  <p className="text-base font-bold text-[#1a1a1a]">Sin resultados</p>
                  <p className="text-sm text-[#6b6b6b] mt-1 mb-4">
                    Ajusta los filtros o amplía el radio
                  </p>
                  {filtrosActivos() > 0 && (
                    <button
                      onClick={limpiarFiltros}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1a1a1a] text-white text-xs font-semibold hover:bg-[#333] cursor-pointer"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
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
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-24 h-24 rounded-full bg-linear-to-br from-blue-100 to-blue-50 flex items-center justify-center ring-8 ring-blue-50 mb-6">
                      <Store className="w-12 h-12 lg:w-16 lg:h-16 text-blue-400" />
                    </div>
                    <p className="text-xl lg:text-2xl font-bold text-gray-900">No se encontraron negocios</p>
                    <p className="text-base lg:text-lg font-medium text-gray-600 mt-1">Intenta ajustar los filtros o ampliar el radio de búsqueda</p>
                  </div>
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
                    <div className="flex flex-col items-center justify-center py-12 px-4 bg-white border-2 border-[#e8e6e0] rounded-xl shadow-md">
                      <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
                        <Store className="w-6 h-6 text-blue-500" strokeWidth={2} />
                      </div>
                      <h3 className="text-base font-bold text-[#1a1a1a]">Sin resultados</h3>
                      <p className="text-sm text-[#6b6b6b] mt-1 mb-4">
                        Ajusta los filtros o amplía el radio
                      </p>
                      {filtrosActivos() > 0 && (
                        <button
                          onClick={limpiarFiltros}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1a1a1a] text-white text-xs font-semibold hover:bg-[#333] cursor-pointer"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
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

        {/* Dropdown distancia */}
        {dropdownDistancia && (
          <div
            data-dropdown
            className="fixed w-[280px] bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-99999 py-4 px-5"
            style={{ top: posDropdownDist.top, left: posDropdownDist.left }}
          >
            <div className="flex gap-2.5 mb-4">
              <button
                onClick={() => { if (cercaDeMi) toggleCercaDeMi(); }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all ${
                  !cercaDeMi ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                }`}
              >
                Mi ciudad
              </button>
              <button
                onClick={() => { if (!cercaDeMi) toggleCercaDeMi(); }}
                className={`flex-1 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all ${
                  cercaDeMi ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                }`}
              >
                Cerca de mí
              </button>
            </div>
            {cercaDeMi && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-sm font-semibold text-slate-500">Distancia</span>
                  <span className="text-base font-bold text-slate-800">{distancia} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={distancia}
                  onChange={(e) => setDistancia(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-blue-500"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 ${((distancia - 1) / 49) * 100}%, #e2e8f0 ${((distancia - 1) / 49) * 100}%)`,
                  }}
                />
                <div className="flex justify-between mt-1.5">
                  <span className="text-xs text-slate-400">1 km</span>
                  <span className="text-xs text-slate-400">50 km</span>
                </div>
              </div>
            )}
            <button
              onClick={() => setDropdownDistancia(false)}
              className="w-full mt-4 py-2 rounded-xl text-sm font-bold text-white cursor-pointer transition-all"
              style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
            >
              Aplicar
            </button>
          </div>
        )}

        {dropdownCategoria && (
          <div
            className="fixed bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-99999 py-1 overflow-hidden w-[220px]"
            style={{ top: posicionDropdownCat.top, left: posicionDropdownCat.left }}
          >
            <div className="max-h-[300px] overflow-y-auto">
              <button
                onClick={() => { setCategoria(null); setSubcategorias([]); setDropdownCategoria(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold cursor-pointer ${!categoria ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                data-testid="dropdown-cat-todas"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${!categoria ? 'bg-blue-500' : 'bg-slate-200'}`}>
                  {!categoria && <Check className="w-3 h-3 text-white" />}
                </div>
                Todas
              </button>
              {categorias.map((cat) => {
                const isSelected = categoria === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setCategoria(cat.id); setSubcategorias([]); setDropdownCategoria(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold cursor-pointer ${isSelected ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                    data-testid={`dropdown-cat-${cat.id}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-slate-200'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
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
            className="fixed bg-white rounded-xl border-2 border-slate-300 shadow-lg shadow-slate-200/50 z-99999 py-1 overflow-hidden w-[220px]"
            style={{ top: posicionDropdownSub.top, left: posicionDropdownSub.left }}
          >
            <div className="max-h-[300px] overflow-y-auto">
              <button
                onClick={() => { setSubcategorias([]); setDropdownSubcategoria(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold cursor-pointer ${subcategoriasSeleccionadas.length === 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                data-testid="dropdown-subcat-todas"
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${subcategoriasSeleccionadas.length === 0 ? 'bg-blue-500' : 'bg-slate-200'}`}>
                  {subcategoriasSeleccionadas.length === 0 && <Check className="w-3 h-3 text-white" />}
                </div>
                Todas
              </button>
              {opcionesSubcategorias.map((sub) => {
                const isSelected = subcategoriasSeleccionadas.includes(sub.id);
                return (
                  <button
                    key={sub.id}
                    onClick={() => { setSubcategorias([sub.id]); setDropdownSubcategoria(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm font-semibold cursor-pointer ${isSelected ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-blue-50'}`}
                    data-testid={`dropdown-subcat-${sub.id}`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-slate-200'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="truncate">{sub.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* POPUP FILTROS MOBILE                                             */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {popupFiltrosMovil && (
          <div className="lg:hidden fixed inset-0 z-99999 flex items-center justify-center p-6">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setPopupFiltrosMovil(false)}
            />
            {/* Contenido */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Header */}
              <div
                className="relative px-5 py-4 overflow-hidden"
                style={{ background: '#000000' }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.12) 0%, transparent 60%)' }}
                />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="w-5 h-5 text-blue-400" />
                    <span className="text-lg font-bold text-white">Ajustar búsqueda</span>
                  </div>
                  <button
                    onClick={() => setPopupFiltrosMovil(false)}
                    className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5">

                {/* Toggle Cerca de mí / En mi ciudad */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-3">Ubicación</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { if (cercaDeMi) toggleCercaDeMi(); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all ${
                        !cercaDeMi
                          ? 'bg-slate-800 text-white shadow-md'
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                      data-testid="filtro-en-mi-ciudad"
                    >
                      En mi ciudad
                    </button>
                    <button
                      onClick={() => { if (!cercaDeMi) toggleCercaDeMi(); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all ${
                        cercaDeMi
                          ? 'bg-slate-800 text-white shadow-md'
                          : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                      }`}
                      data-testid="filtro-cerca-de-mi"
                    >
                      Cerca de mí
                    </button>
                  </div>
                </div>

                {/* Slider de distancia — solo si cercaDeMi */}
                {cercaDeMi && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-slate-500">Distancia</p>
                      <span className="text-lg font-bold text-slate-800">{distancia} km</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={distancia}
                      onChange={(e) => setDistancia(Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer accent-blue-500"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 ${((distancia - 1) / 49) * 100}%, #e2e8f0 ${((distancia - 1) / 49) * 100}%)`,
                      }}
                      data-testid="slider-distancia-movil"
                    />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-slate-400">1 km</span>
                      <span className="text-xs text-slate-400">50 km</span>
                    </div>
                  </div>
                )}

                {/* Filtros rápidos */}
                <div>
                  <p className="text-sm font-semibold text-slate-500 mb-3">Servicios</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={toggleSoloCardya}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                        soloCardya
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-2 border-slate-300 hover:border-slate-400'
                      }`}
                      data-testid="filtro-cardya-movil"
                    >
                      <span className="text-base leading-none">💳</span> CardYA
                    </button>
                    <button
                      onClick={toggleConEnvio}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                        conEnvio
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-2 border-slate-300 hover:border-slate-400'
                      }`}
                      data-testid="filtro-envio-movil"
                    >
                      <span className="text-base leading-none">📦</span> Envíos
                    </button>
                    <button
                      onClick={toggleConServicioDomicilio}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all border flex items-center gap-1.5 ${
                        conServicioDomicilio
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-600 border-2 border-slate-300 hover:border-slate-400'
                      }`}
                      data-testid="filtro-servicio-domicilio-movil"
                    >
                      <span className="text-base leading-none">🏠</span> Servicio a domicilio
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => { limpiarFiltros(); setPopupFiltrosMovil(false); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 bg-slate-200 hover:bg-slate-300 cursor-pointer transition-colors"
                >
                  Limpiar
                </button>
                <button
                  onClick={() => setPopupFiltrosMovil(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  }}
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PaginaNegocios;
