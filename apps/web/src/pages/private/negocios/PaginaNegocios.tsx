/**
 * ============================================================================
 * PÁGINA: PaginaNegocios v2.0
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/pages/private/negocios/PaginaNegocios.tsx
 *
 * PROPÓSITO:
 * Página principal de la sección Negocios. Toggle Feed/Mapa (Feed por
 * default): cards de negocio a la izquierda + feed de publicaciones de
 * negocio a la derecha (desktop) / reel de negocios + feed apilados (móvil).
 * Ver components/negocios/publicaciones/ para el feed.
 *
 * COLOR MARCA: Blue (#3b82f6 → #2563eb)
 * REGLA: Azul solo para acentos decorativos. Botones/chips/filtros en slate.
 */

import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, useDeferredValue, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVolverAtras } from '../../../hooks/useVolverAtras';
import { useScrollAppShell } from '../../../hooks/useScrollAppShell';
import { normalizarTexto } from '../../../utils/normalizarTexto';
import { Mapa, Marker, Popup, useMap, type MapRef, type MarkerEvent } from '../../../components/mapa/Mapa';
import { ChipsFiltros } from '../../../components/negocios/ChipsFiltros';
import {
  Map as MapIcon,
  Newspaper,
  Plus,
  Minus,
  Locate,
  Check,
  Store,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Menu,
  Search,
  X,
} from 'lucide-react';
import { Icon, type IconProps } from '@/config/iconos';
import { ICONOS } from '../../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
const Sparkles = (p: IconoWrapperProps) => <Icon icon={ICONOS.premium} {...p} />;
const Bell = (p: IconoWrapperProps) => <Icon icon={ICONOS.notificaciones} {...p} />;
import { useNegociosLista } from '../../../hooks/queries/useNegocios';
import { useFiltrosNegociosStore } from '../../../stores/useFiltrosNegociosStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import { resolverCiudadId } from '../../../data/ciudadesPopulares';
import { usePerfilCategorias, usePerfilSubcategorias } from '../../../hooks/queries/usePerfil';
import { useSearchStore } from '../../../stores/useSearchStore';
import { useUiStore } from '../../../stores/useUiStore';
import { useMainScrollStore } from '../../../stores/useMainScrollStore';
import { useIniciarChatNegocio } from '../../../hooks/useIniciarChatNegocio';
import { useHideOnScroll } from '../../../hooks/useHideOnScroll';
import { useNotificacionesStore } from '../../../stores/useNotificacionesStore';
import { IconoMenuMorph } from '../../../components/ui/IconoMenuMorph';
import { BotonIrArriba } from '../../../components/ui/BotonIrArriba';
import { CardNegocio } from '../../../components/negocios/CardNegocio';
import { FabPublicar } from '../../../components/ui/FabPublicar';
import { ModalComentariosPublicacionNegocio } from '../../../components/negocios/publicaciones/ModalComentariosPublicacionNegocio';
import { ComposerSection as ComposerSectionNegocio } from '../../../components/negocios/publicaciones/composer/ComposerSection';
import { FeedPublicacionesNegocio } from '../../../components/negocios/publicaciones/FeedPublicacionesNegocio';
import { ReelNegociosFeed } from '../../../components/negocios/publicaciones/ReelNegociosFeed';
import { useAuthStore } from '../../../stores/useAuthStore';
import useBreakpoint from '../../../hooks/useBreakpoint';
import type { NegocioResumen } from '../../../types/negocios';

// =============================================================================
// CONSTANTES
// =============================================================================

type TabNegocios = 'feed' | 'mapa';

const TABS_NEGOCIOS_DESKTOP: { id: TabNegocios; label: string; Icono: typeof Newspaper }[] = [
  { id: 'feed', label: 'Feed', Icono: Newspaper },
  { id: 'mapa', label: 'Mapa', Icono: MapIcon },
];

const TABS_NEGOCIOS_MOBILE: { id: TabNegocios; label: string; Icono: typeof Newspaper }[] = [
  { id: 'feed', label: 'Feed', Icono: Newspaper },
  { id: 'mapa', label: 'Mapa', Icono: MapIcon },
];

// =============================================================================
// ICONOS DE MARKERS
// =============================================================================

const URL_MARKER_AZUL = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png';
const URL_MARKER_ROJO = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png';
const URL_MARKER_VERDE = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png';
const URL_MARKER_SOMBRA = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png';

/** Pin normal de un negocio (azul). Punta abajo → anchor="bottom". */
function PinNegocioMapa() {
  return (
    <img
      src={URL_MARKER_AZUL}
      alt=""
      style={{ width: 25, height: 41, display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
      draggable={false}
    />
  );
}

/** Pin del negocio seleccionado (rojo) con anillos de pulso animados. */
function PinSeleccionado() {
  return (
    <div className="pin-seleccionado-wrapper">
      <div className="pin-pulse-ring" />
      <div className="pin-pulse-ring pin-pulse-ring-2" />
      <img src={URL_MARKER_ROJO} className="pin-icon-img" alt="" draggable={false} />
      <img src={URL_MARKER_SOMBRA} className="pin-shadow-img" alt="" draggable={false} />
    </div>
  );
}

/** Pin de la ubicación del usuario (verde). */
function PinUsuario() {
  return (
    <img
      src={URL_MARKER_VERDE}
      alt=""
      style={{ width: 25, height: 41, display: 'block', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}
      draggable={false}
    />
  );
}

// =============================================================================
// ESTILOS CSS
// =============================================================================

const POPUP_STYLES = `
  .popup-negocio .maplibregl-popup-content {
    padding: 0;
    border-radius: 16px;
    overflow: hidden;
    border: 2px solid #94a3b8;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06);
  }
  .popup-negocio .maplibregl-popup-content {
    margin: 0;
    min-width: 240px;
    max-width: 270px;
  }
  .popup-negocio .maplibregl-popup-tip {
    box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  }
  .popup-negocio .maplibregl-popup-close-button {
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
  .popup-negocio .maplibregl-popup-close-button:hover {
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
// COMPONENTE: Controles de zoom (overlay blanco)
// =============================================================================

function MapaControlesZoom({ latitud, longitud }: { latitud: number | null; longitud: number | null }) {
  const { current: map } = useMap();

  return (
    <div className="absolute bottom-3 left-3 z-1000 bg-slate-900 rounded-xl shadow-lg border border-slate-700 flex flex-row overflow-hidden">
      <button
        data-testid="btn-mapa-zoom-in"
        onPointerDown={(e) => { e.stopPropagation(); map?.zoomIn(); }}
        className="w-11 h-11 lg:w-9 lg:h-9 flex items-center justify-center cursor-pointer transition-colors active:bg-slate-700"
      >
        <Plus className="w-5 h-5 lg:w-4 lg:h-4 text-white" />
      </button>
      <div className="w-px h-auto bg-slate-700 my-1.5" />
      <button
        data-testid="btn-mapa-zoom-out"
        onPointerDown={(e) => { e.stopPropagation(); map?.zoomOut(); }}
        className="w-11 h-11 lg:w-9 lg:h-9 flex items-center justify-center cursor-pointer transition-colors active:bg-slate-700"
      >
        <Minus className="w-5 h-5 lg:w-4 lg:h-4 text-white" />
      </button>
      <div className="w-px h-auto bg-slate-700 my-1.5" />
      <button
        data-testid="btn-mapa-centrar"
        onPointerDown={(e) => {
          e.stopPropagation();
          if (latitud && longitud) map?.flyTo({ center: [longitud, latitud], zoom: 15 });
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
  handleSeleccionarNegocio: (id: string, mapa?: MapRef | null) => void;
  setNegocioSeleccionadoId: (id: string | null) => void;
  onMapReady: (map: MapRef | null) => void;
  navigate: ReturnType<typeof useNavigate>;
  onChat: (negocio: NegocioResumen) => void;
}

// Un solo <Mapa> por instancia (se montan 2: lg:hidden movil + hidden lg:block
// desktop). El popup del negocio seleccionado lo dibuja el estado
// `negocioSeleccionadoId` (no se ata al marcador como en Leaflet). El flyTo al
// seleccionar corre sobre la instancia clickeada (su propia ref).
function MapaNegocio({
  centroInicial, negocios, latitud, longitud,
  negocioSeleccionadoId, handleSeleccionarNegocio, setNegocioSeleccionadoId,
  onMapReady, navigate, onChat,
}: MapaNegocionProps) {
  const mapaRef = useRef<MapRef | null>(null);

  // Recentrar a la ubicacion del usuario cuando cambia el GPS (igual que el
  // antiguo ControlesMapa). react-map-gl reajusta el tamano con el contenedor,
  // asi que ya no hace falta invalidateSize al cambiar de tab.
  useEffect(() => {
    if (latitud && longitud) mapaRef.current?.flyTo({ center: [longitud, latitud], zoom: 15 });
  }, [latitud, longitud]);

  const negocioSel = negocios.find(
    (n) => n.sucursalId === negocioSeleccionadoId && n.latitud && n.longitud,
  );

  return (
    <Mapa
      ref={(r) => { mapaRef.current = r; onMapReady(r); }}
      initialViewState={{ longitude: centroInicial[1], latitude: centroInicial[0], zoom: 14 }}
      attributionControl={false}
      style={{ width: '100%', height: '100%' }}
    >
      {latitud && longitud && (
        <Marker longitude={longitud} latitude={latitud} anchor="bottom">
          <PinUsuario />
        </Marker>
      )}

      {negocios.map((negocio) => {
        if (!negocio.latitud || !negocio.longitud) return null;
        return (
          <Marker
            key={negocio.sucursalId}
            longitude={negocio.longitud}
            latitude={negocio.latitud}
            anchor="bottom"
            style={{ cursor: 'pointer' }}
            onClick={(e: MarkerEvent<MouseEvent>) => {
              e.originalEvent.stopPropagation();
              handleSeleccionarNegocio(negocio.sucursalId, mapaRef.current);
            }}
          >
            {negocio.sucursalId === negocioSeleccionadoId ? <PinSeleccionado /> : <PinNegocioMapa />}
          </Marker>
        );
      })}

      {negocioSel && negocioSel.latitud != null && negocioSel.longitud != null && (
        <Popup
          longitude={negocioSel.longitud}
          latitude={negocioSel.latitud}
          anchor="bottom"
          offset={46}
          className="popup-negocio"
          maxWidth="270px"
          closeOnClick={true}
          onClose={() => setNegocioSeleccionadoId(null)}
        >
          <PopupNegocio
            negocio={negocioSel}
            onVerPerfil={() => navigate(`/negocios/${negocioSel.sucursalId}`)}
            onChat={() => onChat(negocioSel)}
          />
        </Popup>
      )}

      <MapaControlesZoom latitud={latitud} longitud={longitud} />
    </Mapa>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaNegocios() {
  const navigate = useNavigate();
  const location = useLocation();
  // Botón ← respeta historial (flecha nativa móvil) con fallback a /inicio.
  const handleVolver = useVolverAtras('/inicio');
  const cuerpoRef = useScrollAppShell();
  const mapRef = useRef<MapRef | null>(null);
  const btnCategoriaRef = useRef<HTMLButtonElement>(null);
  const btnSubcategoriaRef = useRef<HTMLButtonElement>(null);
  const abrirMenuDrawer = useUiStore((s) => s.abrirMenuDrawer);
  const iniciarChatNegocio = useIniciarChatNegocio();

  const handleChatPopup = useCallback((negocio: NegocioResumen) => {
    if (!negocio.usuarioId) return;
    // El popup queda cubierto por el overlay del chat (z-index superior); su
    // cierre lo maneja el estado de selección, ya no se ata al marcador.
    // Sufijo de sucursal coherente con el resto del UI: solo si >1 sucursales,
    // y para la principal usar "Matriz" en lugar del nombre (duplicado).
    const sucursalParaHeader =
      negocio.totalSucursales > 1
        ? (negocio.esPrincipal ? 'Matriz' : negocio.sucursalNombre)
        : undefined;
    // Avatar: foto de perfil de la SUCURSAL (no el logo del negocio).
    // Fallback al logo si la sucursal aún no tiene foto subida.
    const avatarSucursal = negocio.fotoPerfil ?? negocio.logoUrl ?? null;
    void iniciarChatNegocio({
      usuarioId: negocio.usuarioId,
      sucursalId: negocio.sucursalId,
      negocioNombre: negocio.negocioNombre,
      avatarUrl: avatarSucursal,
      sucursalNombre: sucursalParaHeader,
    });
  }, [iniciarChatNegocio]);

  // Refs para sincronización bidireccional
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Estado
  const [negocioSeleccionadoId, setNegocioSeleccionadoId] = useState<string | null>(null);
  // Feed es el default en desktop y móvil por igual (reemplaza a Lista).
  const [tabActiva, setTabActiva] = useState<TabNegocios>('feed');

  // ─── Deep-link desde notificación de comentario (?publicacionId=&comentarioId=) ──
  // Mismo patrón que `?resenaId=` en PaginaPerfilNegocio.tsx: estado
  // perezoso desde la URL al montar + efecto keyed en `location.search`
  // (para que funcione también si ya estás en /negocios y llega OTRA
  // notificación), con limpieza de la URL vía history replace. No hace
  // falta validar contra una lista ya cargada — el feed es infinito y el
  // modal resuelve su propio fetch por id.
  const [publicacionIdDestacada, setPublicacionIdDestacada] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('publicacionId') || null;
  });
  const [comentarioIdDestacado, setComentarioIdDestacado] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('comentarioId') || null;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nuevaPublicacionId = params.get('publicacionId');
    if (nuevaPublicacionId) {
      setPublicacionIdDestacada(nuevaPublicacionId);
      setComentarioIdDestacado(params.get('comentarioId'));
      // El deep-link solo tiene sentido en el tab Feed — por si el usuario
      // ya estaba parado en Mapa cuando llega la notificación.
      setTabActiva('feed');
      params.delete('publicacionId');
      params.delete('comentarioId');
      const nuevaUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', nuevaUrl);
    }
  }, [location.search]);
  const [buscadorMovilAbierto, setBuscadorMovilAbierto] = useState(false);
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
  // UUID de la ciudad activa (si el catálogo ya está hidratado) para filtrar el
  // catálogo de giros por su disponibilidad por ciudad. Sin match → catálogo global.
  const ciudadIdActiva = useMemo(
    () => resolverCiudadId(ciudadGps?.nombre, ciudadGps?.estado),
    [ciudadGps?.nombre, ciudadGps?.estado],
  );
  const { data: negociosRaw = [], isPending: loading } = useNegociosLista();
  const searchQuery = useSearchStore((s) => s.query);
  const setSearchQuery = useSearchStore((s) => s.setQuery);
  const abrirBuscador = useSearchStore((s) => s.abrirBuscador);
  const cerrarBuscador = useSearchStore((s) => s.cerrarBuscador);
  const buscadorAbierto = useSearchStore((s) => s.buscadorAbierto);

  // Sincronización con el store del buscador para que el input móvil
  // flotante (portal) no quede "huérfano" cuando algo externo cierra el
  // overlay (back nativo del celular, Escape, click backdrop del scrim).
  // Mismo patrón aplicado en PaginaMarketplace — ver doc allá.
  useEffect(() => {
    if (searchQuery.length >= 1 && !buscadorAbierto) {
      abrirBuscador();
    }
  }, [searchQuery, buscadorAbierto, abrirBuscador]);

  const buscadorAbiertoPrevRef = useRef(buscadorAbierto);
  useEffect(() => {
    if (buscadorAbiertoPrevRef.current && !buscadorAbierto) {
      setBuscadorMovilAbierto(false);
    }
    buscadorAbiertoPrevRef.current = buscadorAbierto;
  }, [buscadorAbierto]);

  // Negocios: el backend filtra por búsqueda, categoría, distancia, etc.
  // El filtro client-side del searchQuery global (Navbar) se mantiene como fallback.
  //
  // PERF: usamos `useDeferredValue` sobre `searchQuery` para que el render del
  // input se mantenga fluido al teclear/borrar. Sin esto, cada keystroke
  // recalcula el filtro contra el array completo de negocios y re-renderiza
  // el mapa + popups + cards — al borrar (lista crece) se sentía en cámara
  // lenta. Con `useDeferredValue`, React mantiene el input prioritario y
  // deja el filtro pesado para cuando hay tiempo libre.
  //
  // Accent-insensitive: `normalizarTexto` aplica NFD + quita diacríticos a
  // ambos lados, así "panaderia" matchea "Panadería" (y viceversa).
  const searchQueryDiferido = useDeferredValue(searchQuery);
  const negocios = useMemo(() => {
    if (!searchQueryDiferido.trim()) return negociosRaw;
    const q = normalizarTexto(searchQueryDiferido);
    return negociosRaw.filter((n) => {
      const nombreNegocio = normalizarTexto(n.negocioNombre || '');
      const nombreSucursal = normalizarTexto(n.sucursalNombre || '');
      // Concatena TODAS las subcategorías + sus categorías padre — antes solo
      // se consideraba la primera (`categorias[0]`), perdiendo matches en
      // negocios multi-categoría.
      const taxonomia = normalizarTexto(
        (n.categorias || [])
          .map(cat => `${cat.nombre || ''} ${cat.categoria?.nombre || ''}`)
          .join(' ')
      );
      const direccion = normalizarTexto(n.direccion || '');
      const ciudad = normalizarTexto(n.ciudad || '');
      return nombreNegocio.includes(q) || nombreSucursal.includes(q) || taxonomia.includes(q) || direccion.includes(q) || ciudad.includes(q);
    });
  }, [searchQueryDiferido, negociosRaw]);

  const { data: categorias = [] } = usePerfilCategorias(ciudadIdActiva);
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

  const { data: opcionesSubcategorias = [] } = usePerfilSubcategorias(categoria ?? 0, ciudadIdActiva);

  const centroInicial: [number, number] = latitud && longitud
    ? [latitud, longitud]
    : [31.3125, -113.5275];

  // Debounce: sincronizar búsqueda global del Navbar → store de filtros local
  // (400ms). El input físico (Navbar/header móvil) escribe a `useSearchStore`,
  // y nosotros propagamos a `useFiltrosNegociosStore.busqueda` para que el
  // backend filtre. Mismo patrón que MarketPlace.
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusqueda(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, setBusqueda]);

  // Cleanup al salir
  useEffect(() => {
    return () => {
      resetearFiltrosTemporales();
      cerrarBuscador();
    };
  }, []);

  // Sincronización bidireccional
  const handleSeleccionarNegocio = useCallback((sucursalId: string, mapaClickeado?: MapRef | null) => {
    const nuevoId = negocioSeleccionadoId === sucursalId ? null : sucursalId;
    setNegocioSeleccionadoId(nuevoId);

    // Preferir el mapa de la instancia que el usuario tocó (la visible). El
    // `mapRef` compartido puede apuntar al mapa oculto (size 0); flyTo sobre él
    // no se vería. Fallback a mapRef para clicks desde una card.
    const mapa = mapaClickeado ?? mapRef.current;

    if (mapa && nuevoId) {
      const negocio = negocios.find(n => n.sucursalId === nuevoId);
      const lat = Number(negocio?.latitud);
      const lng = Number(negocio?.longitud);
      // El guard `containerHeight > 0` salta el flyTo si el mapa está oculto/sin layout.
      const containerHeight = mapa.getContainer().clientHeight;
      if (negocio && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && containerHeight > 0) {
        mapa.stop();
        // Dejar el pin en el tercio inferior para que el popup (que abre hacia
        // arriba) quede visible: un offset positivo en Y baja el centro objetivo.
        // Vuelo "cinematográfico": duración larga (ms), curva de vuelo con arco
        // y easing suave (easeInOutCubic) para acelerar/desacelerar sin tirones.
        mapa.flyTo({
          center: [lng, lat],
          zoom: 17,
          offset: [0, Math.round(containerHeight * 0.22)],
          duration: 1400,
          curve: 1.6,
          easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
          essential: true,
        });
      }
    }

    if (nuevoId) {
      setTimeout(() => {
        cardRefs.current[nuevoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [negocios, negocioSeleccionadoId]);

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


  // Auto-scroll al cambiar a feed en mobile
  useEffect(() => {
    if (tabActiva === 'feed' && negocioSeleccionadoId) {
      setTimeout(() => {
        cardRefs.current[negocioSeleccionadoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [tabActiva, negocioSeleccionadoId]);

  // El scroll real de la página en desktop vive en el <main> de MainLayout
  // (overflow-y-auto fixed), NO en window. El store guarda esa ref.
  // En mobile con header propio, MainLayout pone null para que se use window.
  const mainScrollRef = useMainScrollStore(s => s.mainScrollRef);

  // Columna de cards del tab Feed (escritorio) — FIJA por JS, no por CSS
  // `sticky`. Con `sticky` había un "recorrido" perceptible: el elemento
  // viaja en flujo normal hasta alcanzar su offset y ahí se pega, lo que se
  // sentía como "la columna se mueve con el scroll". Al fijarla desde el
  // primer pixel de scroll (`position: fixed` controlado por estado) no
  // hay recorrido — pasa de "quieta arriba" a "quieta fija" sin viajar.
  const cardsPlaceholderRef = useRef<HTMLDivElement>(null);
  const [cardsLeft, setCardsLeft] = useState<number | null>(null);

  // `useLayoutEffect` (síncrono, ANTES de que el navegador pinte) en vez de
  // `useEffect`: la columna queda fija desde el primerísimo render, sin
  // esperar a que el usuario empiece a scrollear. Con el interruptor
  // anterior (fija solo tras detectar `scrollTop > 0`) quedaba un margen de
  // unos pixeles de scroll normal mientras el listener alcanzaba a
  // reaccionar — eso era el "todavía se mueve un poco" que quedaba. Ahora
  // no hay interruptor: siempre está fija, así que no hay nada que activar.
  useLayoutEffect(() => {
    // Depende de `tabActiva`: el placeholder se desmonta/remonta al
    // alternar Feed/Mapa (render condicional), así que hay que re-medir
    // cada vez que vuelve a existir — un efecto con deps `[]` solo mediría
    // la primera vez y quedaría con un `left` obsoleto tras ir y volver.
    if (tabActiva !== 'feed') return;
    const el = cardsPlaceholderRef.current;
    if (!el) return;
    const medir = () => setCardsLeft(el.getBoundingClientRect().left);
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    window.addEventListener('resize', medir);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [tabActiva]);

  // Centro horizontal REAL de `cuerpoRef` (el wrapper de la página completa,
  // `lg:mx-auto lg:max-w-[940px]`) — lo usa el indicador de refresco del feed
  // de publicaciones para ubicarse en la PÁGINA, no en su propia columna (que
  // en escritorio es más angosta: cuerpoRef menos la columna de cards de la
  // izquierda; en móvil, además, el feed va DESPUÉS del `ReelNegociosFeed` en
  // el DOM, así que un indicador "de flujo normal" quedaría abajo del
  // carrusel en vez de encima). Mismo patrón de medición por JS que
  // `cardsLeft`. Combinado más abajo con `headerBottom` para el `top` — ver
  // `feedIndicadorPos`.
  const [feedIndicadorLeft, setFeedIndicadorLeft] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = cuerpoRef.current;
    if (!el) return;
    const medir = () => setFeedIndicadorLeft(el.getBoundingClientRect().left + el.getBoundingClientRect().width / 2);
    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    window.addEventListener('resize', medir);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [cuerpoRef]);

  // Auto-scroll vertical de la columna de cards (escritorio) — mismo
  // espíritu que el carrusel automático del reel de Negocios en móvil
  // (`ReelNegociosFeed.tsx`), pero vertical y con `scrollBy` normal en vez
  // de Embla: Embla está pensado para "una slide a la vez" (basis-full),
  // y acá se ven varias cards de golpe — lo que se quiere es que avance de
  // a poco y regrese al inicio al llegar abajo. Pausa al hover (mismo
  // criterio que `pausarHover` de `useCarruselRotativo`) y respeta
  // `prefers-reduced-motion`.
  useEffect(() => {
    const el = cardsScrollRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let pausado = false;
    const onEnter = () => { pausado = true; };
    const onLeave = () => { pausado = false; };
    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    const intervalo = window.setInterval(() => {
      if (pausado) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight) return;
      if (scrollTop + clientHeight >= scrollHeight - 4) {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ top: clientHeight * 0.5, behavior: 'smooth' });
      }
    }, 3500);

    return () => {
      window.clearInterval(intervalo);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [tabActiva, negocios.length]);

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

  // FAB "+ Publicar" — feed de publicaciones de negocio. Visible solo para
  // negocios en modo Comercial (a diferencia de MP/Servicios, que son modo
  // Personal). `verificarNegocio` ya resuelve lo mismo en el backend.
  const { esEscritorio } = useBreakpoint();
  const usuarioAuth = useAuthStore((s) => s.usuario);
  const esModoComercialConNegocio =
    usuarioAuth?.modoActivo === 'comercial' && !!usuarioAuth?.negocioId;
  const handlePublicarNegocio = () => {
    (mainScrollRef?.current ?? window).scrollTo({ top: 0, behavior: 'smooth' });
    navigate('/negocios?crear=1', { replace: true });
  };

  // topPublicar arranca en 96 (guess) y se remide al alto real del header
  // (`headerRef.current.bottom + 8`) — mismo patrón que MP/Servicios. Como
  // FabPublicar ya trae `transition: top 300ms`, el salto de 96 → alto real
  // produce el efecto de "entra desde arriba y baja" al montar.
  const [topPublicar, setTopPublicar] = useState(96);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const medir = () => setTopPublicar(el.getBoundingClientRect().bottom + 8);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    window.addEventListener('resize', medir);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  // "Ver más" de una publicación del feed → página de detalle dedicada
  // (no modal, a diferencia de MarketPlace).
  const handleAbrirPublicacion = (publicacionId: string) => {
    navigate(`/negocios/publicacion/${publicacionId}`);
  };

  // Header de tamaño fijo (alineado al patrón de Ofertas/MarketPlace).
  // La lógica de compresión por scroll se eliminó — el header ya es lo
  // suficientemente delgado en su tamaño base.

  // Borde inferior REAL del header en pantalla (`getBoundingClientRect().bottom`)
  // — lo usa la columna de cards fija (ver `cardsFijas` más abajo). A
  // diferencia de `offsetHeight` (que solo da el ALTO del header), esto ya
  // incluye el offset entre el borde real del viewport y el propio `<main>`
  // (el header vive `position: fixed` — un `top` calculado solo con el alto
  // del header, sin ese offset, dejaba la columna metida por detrás).
  const [headerBottom, setHeaderBottom] = useState(150);

  // ResizeObserver en el header: actualiza --negocios-header-h en tiempo real
  // mientras dura la transición CSS (300ms), no solo al inicio.
  // Necesario para que el contenedor mapa+cards crezca suavemente al comprimirse.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--negocios-header-h', `${el.offsetHeight}px`);
      setHeaderBottom(el.getBoundingClientRect().bottom);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Posición combinada del indicador de refresco del feed de publicaciones:
  // `left` centrado en la página completa (medido arriba) + `top` justo
  // debajo del borde real del header (`headerBottom`, ya reactivo al
  // colapso del header móvil y al sticky de escritorio). Con `position:
  // fixed` esto lo saca del flujo normal — así en móvil aparece ENCIMA del
  // `ReelNegociosFeed` en vez de después (el feed va después del carrusel en
  // el DOM) y en escritorio no cae detrás del Navbar (z-50).
  const feedIndicadorPos = feedIndicadorLeft !== null ? { left: feedIndicadorLeft, top: headerBottom + 8 } : null;

  // Header móvil se colapsa (oculta subtítulo "En {ciudad} · N negocios" +
  // chips de filtros) al hacer scroll hacia abajo, dejando solo la fila
  // fija (flecha + título + los 3 iconos de la derecha). A diferencia del
  // patrón usual de hide-on-scroll (reaparece con cualquier scroll hacia
  // arriba), acá solo se re-expande al llegar de vuelta hasta el tope —
  // pedido explícito así por el usuario.
  const [headerColapsado, setHeaderColapsado] = useState(false);
  useEffect(() => {
    const el = cuerpoRef.current;
    if (!el) return;
    const onScroll = () => setHeaderColapsado(el.scrollTop > 10);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [cuerpoRef]);

  // Sincronizar store al cambiar de tab. (react-map-gl reajusta el tamaño del
  // mapa con el contenedor vía ResizeObserver, así que ya no hace falta el
  // viejo invalidateSize de Leaflet al volver a la vista mapa.)
  useEffect(() => {
    setVistaActiva(tabActiva === 'mapa' ? 'mapa' : 'lista');
  }, [tabActiva, setVistaActiva]);

  // Props compartidos del mapa
  const mapaProps = {
    centroInicial,
    negocios,
    latitud,
    longitud,
    negocioSeleccionadoId,
    handleSeleccionarNegocio,
    setNegocioSeleccionadoId,
    onMapReady: (m: MapRef | null) => { mapRef.current = m; },
    navigate,
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

      <div className="flex flex-col h-full bg-transparent lg:block lg:h-auto lg:min-h-full" data-testid="pagina-negocios">

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* HEADER STICKY — Patrón estándar con glow azul                   */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={headerRef} className="shrink-0 z-20 lg:sticky lg:top-0">
          <div className="lg:max-w-7xl lg:mx-auto lg:px-6 2xl:px-8">
            <div
              className="relative overflow-hidden rounded-none lg:rounded-b-3xl"
              style={{ background: '#000000' }}
            >
              {/* Glow azul */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 85% 20%, rgba(59,130,246,0.10) 0%, transparent 55%)' }}
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
              {/* Línea de acento superior (blue) */}
              <div
                className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none z-20"
                style={{ background: 'linear-gradient(90deg, transparent, #3b82f6 40%, #60a5fa 60%, transparent)' }}
              />
              {/* Línea de acento inferior (blue) */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none z-20"
                style={{ background: 'linear-gradient(90deg, transparent, #3b82f6 40%, #60a5fa 60%, transparent)' }}
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
                              abrirBuscador();
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
                      {/* Subtítulo móvil decorativo — colapsa al hacer scroll. */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          headerColapsado ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'
                        }`}
                      >
                        <div className="pb-2 flex items-center justify-center gap-2.5">
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
                      {/* Buscador activo — el input vive en un PORTAL FLOTANTE
                          arriba (z-[60]) para quedar por encima del overlay del
                          buscador (z-50). Aquí dentro del header sticky solo
                          conservamos el subtítulo, que queda oscurecido detrás
                          del overlay. Ver bloque `createPortal` más abajo. */}
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
                    {/* min-w-0 SIN shrink-0: el bloque puede encogerse cuando los
                        chips no caben, activando el scroll-x interno (red de
                        seguridad) en vez de desbordar y quedar recortado tras el
                        KPI. El spacer flex-1 previo sigue empujándolos a la
                        derecha mientras haya espacio. */}
                    <div className="min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                       búsqueda" se eliminó: los chips son inline ahora.
                       Colapsa al hacer scroll, igual que el subtítulo. ── */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out lg:hidden ${
                    headerColapsado ? 'max-h-0 opacity-0' : 'max-h-16 opacity-100'
                  }`}
                >
                  <div className="px-3 pb-3">
                    <div className="flex items-center gap-2 overflow-x-auto -mx-3 px-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      <ChipsFiltros variante="inline" {...chipsFiltrosProps} />
                    </div>
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

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* INPUT MÓVIL FLOTANTE — solo cuando el buscador móvil está abierto.*/}
        {/* Va por portal con z-[60] para quedar ENCIMA del overlay del      */}
        {/* buscador (z-50). El resto del header sticky (z-20) queda detrás   */}
        {/* del overlay y se ve oscurecido — solo el input queda visible.    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {buscadorMovilAbierto && createPortal(
          <div className="fixed top-0 left-0 right-0 z-[60] bg-black px-3 pt-4 pb-2.5 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40 pointer-events-none" />
                <input
                  ref={inputBusquedaRef}
                  data-testid="input-buscar-negocios"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar negocios..."
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="w-full bg-white/15 text-white text-lg placeholder-white/40 outline-none rounded-full pl-10 pr-10 py-2"
                />
                {searchQuery.trim() && (
                  <button
                    onClick={() => { setSearchQuery(''); inputBusquedaRef.current?.focus(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/25 hover:bg-white/40 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
              <button
                onClick={() => { cerrarBuscador(); setBusqueda(''); setBuscadorMovilAbierto(false); }}
                className="p-0.5 rounded-full text-white/80 hover:bg-white/20 cursor-pointer shrink-0"
              >
                <X className="w-7 h-7" />
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* FAB MÓVIL Mapa/Lista — botón circular flotante anclado al lado    */}
        {/* derecho a media pantalla. Muestra el icono del MODO OPUESTO al    */}
        {/* actual (señal visual de "click aquí para cambiar"). Solo móvil.   */}
        {/* Oculto en Modo Comercial: el comerciante ya trae el FAB Publicar  */}
        {/* como acción principal — 3 FABs juntos (flecha+toggle+publicar)   */}
        {/* se sentía cargado, y cambiar de vista es un caso de uso poco     */}
        {/* frecuente estando en modo "administrar mi negocio". Si quiere    */}
        {/* navegar como cliente, para eso está el Modo Personal.            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {!esModoComercialConNegocio && (() => {
          const opuesta = TABS_NEGOCIOS_MOBILE.find((t) => t.id !== tabActiva);
          if (!opuesta) return null;
          const IconoOpuesta = opuesta.Icono;
          return createPortal(
            <button
              type="button"
              data-testid="fab-toggle-mapa-feed-movil"
              onClick={() => setTabActiva(opuesta.id)}
              aria-label={`Cambiar a vista ${opuesta.label}`}
              style={{
                bottom: bottomNavVisible ? '5rem' : '1rem',
                transition: 'bottom 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms ease-out',
              }}
              // right-4: este toggle SOLO existe en Modo Personal (ver el
              // `!esModoComercialConNegocio` que envuelve este bloque) — el
              // FAB "Publicar" solo existe en Modo Comercial, así que nunca
              // conviven. Va a la derecha, mismo lugar que ocuparía Publicar.
              className="lg:hidden fixed right-4 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-300/30 hover:scale-105 active:scale-95"
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
        {/* Ancho FIJO derivado del ancho de 3 cards lado a lado:            */}
        {/*   - lg:  `max-w-[940px]`  = 3×300 + 2×20 (gap-5)                 */}
        {/*   - 2xl: `max-w-[1068px]` = 3×340 + 2×24 (gap-6)                 */}
        {/* Mismo ancho en ambos tabs (lista y mapa) → al alternar entre     */}
        {/* vistas el área visible no cambia. Sin padding lateral en lg+     */}
        {/* para que el ancho coincida exacto con cards+gaps (sin "sobra"    */}
        {/* que reordene el centrado). El header arriba mantiene max-w-7xl.  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div ref={cuerpoRef} className={`relative z-0 flex-1 min-h-0 overflow-y-auto overscroll-contain lg:flex-none lg:overflow-visible lg:mx-auto p-4 pb-24 lg:px-0 lg:max-w-[940px] 2xl:max-w-[1068px] ${
          tabActiva === 'mapa' ? 'lg:py-3 2xl:py-3' : 'lg:py-6 2xl:py-8'
        }`}>

          {/* ── MOBILE: Tab Feed ── Reel de negocios arriba + feed de
              publicaciones debajo, en un solo scroll vertical normal (no
              fixed inset-0 como el tab Mapa). */}
          {tabActiva === 'feed' && (
            <div className="lg:hidden" data-testid="negocios-feed-movil">
              <ReelNegociosFeed negocios={negocios} />
              <FeedPublicacionesNegocio
                ciudad={ciudadGps?.nombre ?? null}
                onAbrirDetalle={handleAbrirPublicacion}
                scrollRef={cuerpoRef}
                pullHabilitado={!esEscritorio}
                posicionFija={feedIndicadorPos ?? undefined}
              />
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

            {/* Tab Feed: Cards izquierda + feed de publicaciones derecha.
                Mismo layout de 2 columnas que el tab Mapa (mismo ancho de
                columna, mismos gaps) para que el ancho visible no salte al
                alternar entre tabs. */}
            {tabActiva === 'feed' && (
              <div className="flex gap-5 2xl:gap-6 items-start">
                {/* Placeholder `relative`: reserva el ancho/alto exactos de
                    la columna en el flujo normal (para que el feed no salte)
                    y sirve de referencia de posición para medir su `left`. */}
                <div
                  ref={cardsPlaceholderRef}
                  className="relative w-[300px] 2xl:w-[340px] shrink-0"
                  style={{ height: `calc(100vh - ${headerBottom + 16}px - 16px)` }}
                >
                  {/* Cards: SIEMPRE fija (no espera a que empieces a
                      scrollear) — cero movimiento posible. `headerBottom` es
                      el borde inferior REAL del header en pantalla
                      (getBoundingClientRect, no solo su alto). */}
                  <div
                    ref={cardsScrollRef}
                    className="negocios-cards-scroll w-[300px] 2xl:w-[340px] overflow-y-auto overflow-x-visible pr-1 z-10 lg:fixed"
                    style={{
                      top: `${headerBottom + 16}px`,
                      left: cardsLeft !== null ? `${cardsLeft}px` : undefined,
                      height: `calc(100vh - ${headerBottom + 16}px - 16px)`,
                    }}
                  >
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
                </div>

                {/* Feed de publicaciones derecha — SIN scroll interno propio
                    (a diferencia de antes): fluye como parte del documento y
                    scrollea con el <main> global, mismo patrón que Home/Coyo. */}
                <div className="flex-1 min-w-0 pr-1">
                  <FeedPublicacionesNegocio
                    ciudad={ciudadGps?.nombre ?? null}
                    onAbrirDetalle={handleAbrirPublicacion}
                    posicionFija={feedIndicadorPos ?? undefined}
                  />
                </div>
              </div>
            )}

            {/* Tab Mapa: Cards izquierda + Mapa derecha.
                gaps `lg:gap-5 2xl:gap-6` para coincidir EXACTO con los
                gaps del grid de la vista Lista (Sprint 9.3 balance):
                card 300 + gap 20 + mapa 620 = 940px = 3 cards lista. */}
            {tabActiva === 'mapa' && (
              <div className="flex gap-5 2xl:gap-6" style={{ height: 'calc(100vh - 83px - var(--negocios-header-h) - 24px)' }}>
                {/* Cards scrollable izquierda — Sprint 9.3: bajadas de
                    380/420px a 300/340px para que el mapa de la derecha
                    gane ~80px adicionales dentro del container acotado a
                    `max-w-[920px]`. */}
                <div ref={cardsScrollRef} className="negocios-cards-scroll w-[300px] 2xl:w-[340px] shrink-0 overflow-y-auto overflow-x-visible pr-1 z-10">
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

        {/* Flecha "ir arriba".
            · Modo feed: en móvil va a la IZQUIERDA (`left-4`) para no empalmarse
              con el FAB de cambiar vista Mapa/Feed (esquina inferior derecha).
              En PC ahora se ancla al borde derecho de la lista de cards —
              mismo anclaje que el modo mapa (`cardsScrollRef`) — pero SIN
              `scrollRef` explícito: el feed ya no tiene scroll interno propio,
              así que cae al default (`<main>` global) y controla el feed.
            · Modo mapa (desktop): anclada al borde derecho de la lista de
              cards y operando sobre SU scroll interno (`cardsScrollRef`,
              pasado explícito como `scrollRef` — a diferencia del feed). */}
        {tabActiva === 'feed' && (
          <BotonIrArriba
            testId="negocios-ir-arriba"
            // Modo Personal escritorio: el toggle Mapa/Feed subió arriba (ver
            // más abajo), así que la flecha baja a ocupar su antiguo lugar
            // (`2xl:right-[394px]`, mismo eje que el FAB "Publicar" — igual
            // que en MarketPlace). Modo Comercial (o móvil): sin cambios,
            // sigue en `2xl:right-[368px]`.
            right={
              !esModoComercialConNegocio && esEscritorio
                ? 'left-4 lg:left-auto lg:right-[330px] 2xl:right-[394px]'
                : 'left-4 lg:left-auto lg:right-[330px] 2xl:right-[368px]'
            }
            // `anclarDerechaRef` SOLO en escritorio + Modo Comercial: en
            // Modo Personal la flecha ya no acompaña el borde de la columna
            // de cards, se va al slot fijo de arriba (ver `right`). El div de
            // cards del tab feed vive dentro de un contenedor `hidden
            // lg:block` — en móvil sigue montado en el DOM (solo oculto por
            // CSS), así que su `getBoundingClientRect()` da puros ceros y
            // manda la flecha a una posición inválida si se lo pasamos sin
            // condición.
            anclarDerechaRef={
              esEscritorio && esModoComercialConNegocio
                ? (cardsScrollRef as RefObject<HTMLElement | null>)
                : undefined
            }
            anclaOffsetX={21}
            apilarEscritorio={0}
            // El FAB de toggle Mapa/Feed ahora vive en right-4 en móvil (no
            // en left-4) — ya no comparte esquina con esta flecha en ningún
            // modo, así que no hace falta apilar.
            apilarMovil={0}
          />
        )}
        {tabActiva === 'mapa' && (
          <BotonIrArriba
            testId="negocios-ir-arriba-mapa"
            scrollRef={cardsScrollRef as RefObject<HTMLElement | null>}
            anclarDerechaRef={cardsScrollRef as RefObject<HTMLElement | null>}
            anclaOffsetX={21}     /* ← horizontal: MÁS número = más a la IZQUIERDA (hacia las cards) */
            apilarEscritorio={0}  /* ← vertical: MÁS número = más ARRIBA (en rem sobre el fondo) */
          />
        )}

        {/* Toggle Feed/Mapa circular — SOLO escritorio, reemplaza al pill
            "Feed 20 / Mapa" flotante. Mismo ícono/estilo en ambos casos
            (círculo oscuro, ícono del modo OPUESTO):
            · Modo Comercial CON negocio: se queda ABAJO a la derecha —
              convive con el FAB "Publicar" que vive arriba (alturas
              distintas, nunca se solapan).
            · Modo Personal (o comercial sin negocio): sube ARRIBA, al mismo
              slot y estilo que el FAB "Publicar" de MarketPlace (no hay
              Publicar aquí que lo ocupe) — reusa `FabPublicar` con el ícono
              del toggle. La flecha "ir arriba" baja al lugar que este deja
              libre (ver `BotonIrArriba` más arriba). */}
        {(() => {
          const opuesta = TABS_NEGOCIOS_DESKTOP.find((t) => t.id !== tabActiva);
          if (!opuesta) return null;
          const IconoOpuesta = opuesta.Icono;

          if (!esModoComercialConNegocio && esEscritorio) {
            return (
              <FabPublicar
                onClick={() => setTabActiva(opuesta.id)}
                ariaLabel={`Cambiar a vista ${opuesta.label}`}
                testId="toggle-mapa-feed-escritorio"
                label={opuesta.label}
                claseColor="bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 ring-2 ring-blue-300/30"
                icon={<IconoOpuesta className="h-6 w-6" strokeWidth={2.5} style={{ animation: 'fab-toggle-wiggle 2.4s ease-in-out infinite' }} />}
                topPublicar={topPublicar}
                esEscritorio={esEscritorio}
                bottomNavVisible={bottomNavVisible}
                labelConCardEscritorio
              />
            );
          }

          return createPortal(
            <button
              type="button"
              data-testid="toggle-mapa-feed-escritorio"
              onClick={() => setTabActiva(opuesta.id)}
              aria-label={`Cambiar a vista ${opuesta.label}`}
              className="hidden lg:flex fixed bottom-4 right-4 lg:right-[330px] 2xl:right-[394px] z-30 h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-300/30 hover:scale-105 active:scale-95"
            >
              <IconoOpuesta className="w-6 h-6" strokeWidth={2.5} style={{ animation: 'fab-toggle-wiggle 2.4s ease-in-out infinite' }} />
            </button>,
            document.body
          );
        })()}

        {/* FAB "+ Publicar" — feed de publicaciones de negocio. Color blue
            de la marca Negocios. Ver components/ui/FabPublicar.tsx.
            Sin cambios de posición — sigue ANCLADO ARRIBA bajo el header en
            PC (`topPublicar`, con su animación de entrada "baja desde
            arriba" al montar). Solo el toggle Feed/Mapa se movió abajo. */}
        {esModoComercialConNegocio && (
          <FabPublicar
            onClick={handlePublicarNegocio}
            ariaLabel="Publicar en el feed de tu negocio"
            claseColor="bg-linear-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30 ring-2 ring-blue-300/30"
            topPublicar={topPublicar}
            esEscritorio={esEscritorio}
            bottomNavVisible={bottomNavVisible}
            labelConCardEscritorio
          />
        )}

        {/* Composer de publicaciones de negocio — modal, sin barra inline
            (nace directo con el patrón FAB-only). */}
        <ComposerSectionNegocio />

        {/* Deep-link desde notificación de comentario — abre el modal de
            comentarios de la publicación puntual (con scroll + highlight al
            comentario, ver ModalComentariosPublicacionNegocio). */}
        {publicacionIdDestacada && (
          <ModalComentariosPublicacionNegocio
            abierto={!!publicacionIdDestacada}
            onCerrar={() => {
              setPublicacionIdDestacada(null);
              setComentarioIdDestacado(null);
            }}
            publicacionId={publicacionIdDestacada}
            comentarioDestacadoId={comentarioIdDestacado}
          />
        )}

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
