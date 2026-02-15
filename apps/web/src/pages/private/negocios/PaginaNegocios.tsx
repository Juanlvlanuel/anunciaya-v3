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

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ChipsFiltros } from '../../../components/negocios/ChipsFiltros';
import {
  // Search eliminado
  // SlidersHorizontal eliminado
  List,
  Map,
  MapPin,
  Plus,
  Minus,
  Locate,
  Check,
  Store,
  Loader2,
  Star,
  ChevronRight,
} from 'lucide-react';
import { useListaNegocios } from '../../../hooks/useListaNegocios';
import { useFiltrosNegociosStore } from '../../../stores/useFiltrosNegociosStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useCategorias } from '../../../hooks/useCategorias';
import { useSubcategorias } from '../../../hooks/useSubcategorias';
import { useSearchStore } from '../../../stores/useSearchStore';
// PanelFiltros eliminado
import { CardNegocio } from '../../../components/negocios/CardNegocio';
import type { NegocioResumen } from '../../../types/negocios';

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

const iconoSeleccionadoAnimado = new L.DivIcon({
  className: '',
  html: `<div class="pin-seleccionado-wrapper">
    <div class="pin-pulse-ring"></div>
    <div class="pin-pulse-ring pin-pulse-ring-2"></div>
    <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png" class="pin-icon-img" />
    <img src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png" class="pin-shadow-img" />
  </div>`,
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -40],
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
// COLOR FIJO PARA POPUP
// =============================================================================

const ACCENT_COLOR = { from: '#3b82f6', to: '#2563eb' };

// =============================================================================
// ESTILOS CSS PARA POPUP PERSONALIZADO
// =============================================================================

const POPUP_STYLES = `
  .popup-negocio .leaflet-popup-content-wrapper {
    padding: 0;
    border-radius: 16px;
    overflow: hidden;
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
  @keyframes popupStatusPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  /* Pin seleccionado con pulse */
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
    .popup-negocio p {
  margin: 0 !important;
}
    
`;

// =============================================================================
// COMPONENTE: PopupNegocio (contenido mejorado del popup del mapa)
// =============================================================================

interface PopupNegocioProps {
  negocio: NegocioResumen;
  onVerPerfil: () => void;
}

function PopupNegocio({ negocio, onVerPerfil }: PopupNegocioProps) {
  const calificacion = negocio.calificacionPromedio ? parseFloat(negocio.calificacionPromedio) : 0;
  const tieneResenas = negocio.totalCalificaciones > 0;

  const distanciaTexto = negocio.distanciaKm !== null
    ? Number(negocio.distanciaKm) < 1
      ? `${Math.round(Number(negocio.distanciaKm) * 1000)} m`
      : `${Number(negocio.distanciaKm).toFixed(1)} km`
    : null;

  return (
    <div>
      {/* Header con gradiente */}
      <div className="bg-linear-to-r from-blue-500 to-blue-600 px-4 py-2">
        <div className="flex items-center gap-3">
          {negocio.logoUrl ? (
            <img
              src={negocio.logoUrl}
              alt={negocio.negocioNombre}
              className="w-11 h-11 rounded-xl object-cover shrink-0 border-2 border-white/30 shadow-lg"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl shrink-0 border-2 border-white/30 shadow-lg bg-black/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-white/70" />
            </div>
          )}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <h3 className="text-[16px] font-bold text-white leading-tight truncate">
              {negocio.negocioNombre}
            </h3>
            {negocio.sucursalNombre?.includes(`${negocio.negocioNombre} - `) && (
              <p className="text-[14px] font-medium text-blue-100 mt-3 truncate">
                Sucursal - {negocio.sucursalNombre.replace(`${negocio.negocioNombre} - `, '')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-2.5">
        {/* Fila: Status — Rating — Distancia */}
        <div className="flex items-center justify-between pb-4 text-[13px]">
          {/* Status */}
          {negocio.estaAbierto !== null && (
            <div className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: negocio.estaAbierto ? '#22c55e' : '#ef4444',
                  animation: 'popupStatusPulse 2s ease-in-out infinite',
                }}
              />
              <span className={`font-semibold ${negocio.estaAbierto ? 'text-green-600' : 'text-red-500'}`}>
                {negocio.estaAbierto ? 'Abierto' : 'Cerrado'}
              </span>
            </div>
          )}

          {/* Rating */}
          {tieneResenas && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-bold text-slate-800">{calificacion.toFixed(1)}</span>
              <span className="text-[12px] text-slate-400">({negocio.totalCalificaciones})</span>
            </div>
          )}

          {/* Distancia */}
          {distanciaTexto && (
            <div className="flex items-center gap-1 text-slate-500">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-medium">{distanciaTexto}</span>
            </div>
          )}
        </div>

        {/* Dirección */}
        {negocio.direccion && (
          <p className="text-[13px] text-slate-400 mt-4 leading-none truncate">
            {negocio.direccion}
          </p>
        )}

        {/* Separador */}
        <div className="h-px bg-slate-100 my-2" />

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onVerPerfil(); }}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[13px] font-bold text-white cursor-pointer border-0 active:scale-95 transition-transform"
            style={{
              background: `linear-gradient(135deg, ${ACCENT_COLOR.from}, ${ACCENT_COLOR.to})`,
              boxShadow: `0 2px 8px ${ACCENT_COLOR.from}30`,
            }}
          >
            Ver Perfil
            <ChevronRight className="w-4 h-4" />
          </button>
          {negocio.whatsapp && (
            <button
              onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${negocio.whatsapp}`, '_blank'); }}
              className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center cursor-pointer shrink-0 hover:bg-green-100 transition-colors"
            >
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
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
// COMPONENTE: Controles del Mapa
// =============================================================================

function ControlesMapa({ onMapReady }: { onMapReady?: (map: L.Map) => void }) {
  const map = useMap();
  const { latitud, longitud } = useGpsStore();

  // ✅ Centrar mapa automáticamente cuando cambie la ciudad
  useEffect(() => {
    if (latitud && longitud) {
      map.setView([latitud, longitud], 15);
    }
  }, [latitud, longitud, map]);

  // Exponer referencia del mapa al padre
  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map, onMapReady]);

  // En móvil: mantener controles en el mapa
  return (
    <div className="lg:hidden absolute left-3 bottom-3 z-1000">
      <div className="bg-blue-600 rounded-full shadow-lg flex items-center gap-0.5 p-1">
        <button
          onClick={() => map.zoomIn()}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-500 active:bg-blue-700 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
        <div className="w-px h-5 bg-white/30" />
        <button
          onClick={() => map.zoomOut()}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-500 active:bg-blue-700 cursor-pointer transition-colors"
        >
          <Minus className="w-4 h-4 text-white" />
        </button>
        <div className="w-px h-5 bg-white/30" />
        <button
          onClick={() => {
            if (latitud && longitud) map.setView([latitud, longitud], 15);
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-blue-500 active:bg-blue-700 cursor-pointer transition-colors"
        >
          <Locate className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PaginaNegocios() {
  const navigate = useNavigate();
  const carruselRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const btnCategoriaRef = useRef<HTMLButtonElement>(null);
  const btnSubcategoriaRef = useRef<HTMLButtonElement>(null);

  // Refs para sincronización bidireccional
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Estado
  const [negocioSeleccionadoId, setNegocioSeleccionadoId] = useState<string | null>(null);
  const [vistaLista, setVistaLista] = useState(window.innerWidth < 768); // En móvil, Lista por defecto
  // filtrosAbiertos eliminado
  // drawerFiltrosMovil eliminado
  // Búsqueda eliminada — se usará buscador global del Navbar
  const [dropdownCategoria, setDropdownCategoria] = useState(false);
  const [dropdownSubcategoria, setDropdownSubcategoria] = useState(false);
  const [posicionDropdownCat, setPosicionDropdownCat] = useState({ top: 0, left: 0 });
  const [posicionDropdownSub, setPosicionDropdownSub] = useState({ top: 0, left: 0 });
  const [esMovil, setEsMovil] = useState(window.innerWidth < 768);
  // vistaGrid eliminado — desktop solo muestra vista mapa

  // Detectar modo preview card
  const searchParams = new URLSearchParams(window.location.search);
  const esModoPreviewCard = searchParams.get('preview') === 'card';
  const sucursalIdPreview = searchParams.get('sucursalId');

  // Stores y hooks
  const { latitud, longitud } = useGpsStore();
  const { negocios: negociosRaw, loading, refetch } = useListaNegocios();
  const searchQuery = useSearchStore((s) => s.query);
  const cerrarBuscador = useSearchStore((s) => s.cerrarBuscador);

  // Filtrar negocios por búsqueda (búsqueda extensa en múltiples campos)
  // Optimizado con useMemo para evitar lag al borrar
  const negocios = useMemo(() => {
    if (!searchQuery.trim()) return negociosRaw;

    const q = searchQuery.toLowerCase();

    return negociosRaw.filter((n) => {
      // 1. Nombre del negocio
      const nombreNegocio = (n.negocioNombre || '').toLowerCase();

      // 2. Nombre de la sucursal
      const nombreSucursal = (n.sucursalNombre || '').toLowerCase();

      // 3. Categoría padre
      const categoriaPadre = (n.categorias?.[0]?.categoria?.nombre || '').toLowerCase();

      // 4. Subcategorías (todas)
      const subcategorias = (n.categorias || [])
        .map(cat => (cat.nombre || '').toLowerCase())
        .join(' ');

      // 5. Dirección
      const direccion = (n.direccion || '').toLowerCase();

      // 6. Ciudad
      const ciudad = (n.ciudad || '').toLowerCase();

      // Buscar en cualquiera de los campos
      return (
        nombreNegocio.includes(q) ||
        nombreSucursal.includes(q) ||
        categoriaPadre.includes(q) ||
        subcategorias.includes(q) ||
        direccion.includes(q) ||
        ciudad.includes(q)
      );
    });
  }, [searchQuery, negociosRaw]);

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
    filtrosActivos,
    limpiarFiltros,
    resetearFiltrosTemporales,
  } = useFiltrosNegociosStore();

  // Opciones de subcategorías basadas en la categoría seleccionada
  const { subcategorias: opcionesSubcategorias } = useSubcategorias(categoria);

  // Centro del mapa
  const centroInicial: [number, number] = latitud && longitud
    ? [latitud, longitud]
    : [31.3125, -113.5275]; // Puerto Peñasco default

  // ✅ Recargar negocios cuando cambie la ubicación
  useEffect(() => {
    if (latitud && longitud) {
      refetch();
    }
  }, [latitud, longitud]);

  // ✅ Cleanup: Resetear filtros temporales al salir de la página
  useEffect(() => {
    return () => {
      // Al desmontar el componente (salir de /negocios)
      resetearFiltrosTemporales(); // Limpia distancia y búsqueda del store
      cerrarBuscador();            // Limpia búsqueda del navbar
    };
  }, []);

  // Handlers de sincronización
  const handleSeleccionarNegocio = (sucursalId: string) => {
    const nuevoId = negocioSeleccionadoId === sucursalId ? null : sucursalId;
    setNegocioSeleccionadoId(nuevoId);

    if (!mapRef.current || !nuevoId) return;

    const negocio = negocios.find(n => n.sucursalId === nuevoId);
    if (!negocio?.latitud || !negocio?.longitud) return;

    // Centrar mapa en el negocio
    mapRef.current.stop();
    mapRef.current.flyTo([negocio.latitud, negocio.longitud], 17, { duration: 0.5 });

    // Abrir popup del marker
    setTimeout(() => {
      markerRefs.current[nuevoId]?.openPopup();
    }, 600);

    // Auto-scroll a la tarjeta correspondiente
    setTimeout(() => {
      cardRefs.current[nuevoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Helper: determinar icono del marker según estado
  const getIconoMarker = (sucursalId: string): L.Icon | L.DivIcon => {
    if (sucursalId === negocioSeleccionadoId) return iconoSeleccionadoAnimado;
    return iconoNegocio;
  };

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
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

  // Auto-scroll a tarjeta seleccionada al cambiar a vista lista (móvil)
  useEffect(() => {
    if (vistaLista && negocioSeleccionadoId) {
      setTimeout(() => {
        cardRefs.current[negocioSeleccionadoId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [vistaLista, negocioSeleccionadoId]);

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
          <CardNegocio
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
        <div className="flex flex-col min-h-0">

          {/* Header con pills de categorías */}
          <div className="sticky top-0 z-50 bg-black py-1.5 -mt-px">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {/* Pill "Todos" */}
              <button
                onClick={() => setCategoria(null)}
                className={`shrink-0 px-5 py-2 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer flex items-center ${!categoria
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/70'
                  }`}
              >
                Todos
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoria(categoria === cat.id ? null : cat.id)}
                  className={`shrink-0 px-3 py-1 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${categoria === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white/70'
                    }`}
                >
                  <span className="text-lg">{cat.icono}</span>
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de tarjetas vertical */}
          <div className="px-4 py-4">
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
                  <div
                    key={negocio.sucursalId}
                    ref={(el) => { cardRefs.current[negocio.sucursalId] = el; }}
                  >
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

          {/* Pestaña lateral → Vista Mapa */}
          <button
            onClick={() => setVistaLista(false)}
            className="fixed right-0 top-1/2 -translate-y-1/2 z-1000 w-9 h-16 flex items-center justify-center pr-1 rounded-l-2xl cursor-pointer active:scale-95 transition-all hover:w-11"
            style={{
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRight: 'none',
            }}
          >
            <MapPin className="w-6 h-6 text-blue-400 drop-shadow-md" />
          </button>
        </div>
      );
    }

    // Vista Mapa Móvil
    return (
      <div className="relative" style={{ height: 'calc(100vh - 130px)' }}>

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
              keepBuffer={5}
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
                  <Popup className="popup-negocio">
                    <PopupNegocio
                      negocio={negocio}
                      onVerPerfil={() => navigate(`/negocios/${negocio.sucursalId}`)}
                    />
                  </Popup>
                </Marker>
              );
            })}

            <ControlesMapa onMapReady={(m) => { mapRef.current = m; }} />
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

        {/* Header con pills de categorías (mismo estilo que vista lista) */}
        <div className="absolute top-0 left-0 right-0 z-1000">
          <div className="bg-black  py-1.5">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCategoria(null)}
                className={`shrink-0 px-5 py-2 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer flex items-center ${!categoria
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/10 text-white/70'
                  }`}
              >
                Todos
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoria(categoria === cat.id ? null : cat.id)}
                  className={`shrink-0 px-3 py-1 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${categoria === cat.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-white/70'
                    }`}
                >
                  <span className="text-lg">{cat.icono}</span>
                  {cat.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pestaña lateral → Vista Lista */}
        <button
          onClick={() => setVistaLista(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-1000 w-9 h-16 flex items-center justify-center pr-1 rounded-l-2xl cursor-pointer active:scale-95 transition-all hover:w-11"
          style={{
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRight: 'none',
          }}
        >
          <List className="w-6 h-6 text-blue-400 drop-shadow-md" />
        </button>

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

        {/* Estilos CSS para popups personalizados */}
        <style>{POPUP_STYLES}</style>
      </div>
    );
  }

  // =============================================================================
  // RENDER: Vista Mapa (principal)
  // =============================================================================

  return (
    <div className="relative h-[calc(100vh-90px)] lg:h-[calc(100vh-90px)] w-full">

      {/* ================================================================= */}
      {/* PANEL UNIFICADO DESKTOP (Solo Mapa)                              */}
      {/* ================================================================= */}
      <div className="hidden lg:flex absolute left-4 right-4 bottom-4 top-4 z-1000 flex-col">
        {/* Fondo del panel */}
        <div className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/50" />

        {/* Header del panel - DARK (siempre con filtros) */}
        <div className="relative z-1010 px-4 py-3 bg-black rounded-t-2xl">
          <div className="flex items-center gap-3">
            {/* Badge de conteo */}
            <div className="shrink-0 flex items-center gap-2">
              <div className="bg-blue-500 text-white text-lg font-bold rounded-xl w-10 h-10 flex items-center justify-center shadow-md">
                {negocios.length}
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold text-white">{negocios.length === 1 ? 'Negocio' : 'Negocios'}</p>
                <p className="text-[11px] text-white/50">encontrados</p>
              </div>
            </div>

            {/* Filtros inline (sin buscador) */}
            <div className="flex items-center justify-center gap-2 flex-1 ml-2">
              <ChipsFiltros
                variante="inline"
                distancia={distancia}
                setDistancia={setDistancia}
                categoria={categoria}
                categorias={categorias}
                dropdownCategoria={dropdownCategoria}
                setDropdownCategoria={setDropdownCategoria}
                btnCategoriaRef={btnCategoriaRef}
                setPosicionDropdownCat={setPosicionDropdownCat}
                opcionesSubcategorias={opcionesSubcategorias}
                subcategoriasSeleccionadas={subcategoriasSeleccionadas}
                dropdownSubcategoria={dropdownSubcategoria}
                setDropdownSubcategoria={setDropdownSubcategoria}
                btnSubcategoriaRef={btnSubcategoriaRef}
                setPosicionDropdownSub={setPosicionDropdownSub}
                soloCardya={soloCardya}
                toggleSoloCardya={toggleSoloCardya}
                conEnvio={conEnvio}
                toggleConEnvio={toggleConEnvio}
                filtrosActivos={filtrosActivos}
                limpiarFiltros={limpiarFiltros}
              />
            </div>

            {/* Controles de mapa (derecha) */}
            <div className="shrink-0 flex items-center gap-0.5 bg-white/10 rounded-xl p-1 ml-2">
              <button
                onClick={() => mapRef.current?.zoomIn()}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/15 active:bg-white/25 cursor-pointer transition-colors"
                title="Acercar"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
              <div className="w-px h-5 bg-white/20" />
              <button
                onClick={() => mapRef.current?.zoomOut()}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/15 active:bg-white/25 cursor-pointer transition-colors"
                title="Alejar"
              >
                <Minus className="w-4 h-4 text-white" />
              </button>
              <div className="w-px h-5 bg-white/20" />
              <button
                onClick={() => {
                  if (latitud && longitud) mapRef.current?.setView([latitud, longitud], 15);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/15 active:bg-white/25 cursor-pointer transition-colors"
                title="Mi ubicación"
              >
                <Locate className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido: Solo vista mapa con cards laterales */}
        <div className="relative z-10 flex-1 flex overflow-hidden rounded-b-2xl">
          {/* Columna de cards (scroll vertical, transparente) */}
          <div
            ref={carruselRef}
            className="w-[380px] 2xl:w-[420px] shrink-0 overflow-y-auto scrollbar-hide p-4 flex flex-col gap-9 z-10"
          >
            {loading && negocios.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-full h-[180px] bg-slate-100 rounded-2xl animate-pulse shrink-0">
                  <div className="h-[120px] bg-slate-200 rounded-t-2xl" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : negocios.length > 0 ? (
              negocios.map((negocio) => (
                <div
                  key={negocio.sucursalId}
                  ref={(el) => { cardRefs.current[negocio.sucursalId] = el; }}
                >
                  <CardNegocio
                    negocio={negocio}
                    seleccionado={negocio.sucursalId === negocioSeleccionadoId}
                    onSelect={() => handleSeleccionarNegocio(negocio.sucursalId)}
                  />
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Store className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium text-lg">No se encontraron negocios</p>
                  <p className="text-sm text-slate-400 mt-1">Intenta ajustar los filtros</p>
                </div>
              </div>
            )}
          </div>

          {/* Mapa integrado */}
          <div className="flex-1 relative rounded-br-2xl overflow-hidden">
            <MapContainer
              center={centroInicial}
              zoom={14}
              className="w-full h-full"
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                keepBuffer={5}
                updateWhenZooming={false}
                updateWhenIdle={true}
              />

              {latitud && longitud && (
                <Marker position={[latitud, longitud]} icon={iconoUsuario}>
                  <Popup>
                    <p className="font-semibold text-center">Tu ubicación</p>
                  </Popup>
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
                    <Popup className="popup-negocio">
                      <PopupNegocio
                        negocio={negocio}
                        onVerPerfil={() => navigate(`/negocios/${negocio.sucursalId}`)}
                      />
                    </Popup>
                  </Marker>
                );
              })}

              <ControlesMapa onMapReady={(m) => { mapRef.current = m; }} />
            </MapContainer>

            {/* Viñeta difuminada en el mapa */}
            <div className="absolute inset-0 pointer-events-none z-999">
              <div className="absolute top-0 left-0 right-0 h-8 bg-linear-to-b from-white/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-linear-to-t from-white/50 to-transparent" />
              <div className="absolute top-0 bottom-0 left-0 w-8 bg-linear-to-r from-white/50 to-transparent" />
              <div className="absolute top-0 bottom-0 right-0 w-8 bg-linear-to-l from-white/50 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {/* DROPDOWNS GLOBALES (se renderizan siempre, posición fixed) */}
      {dropdownCategoria && (
        <div
          className="fixed bg-white rounded-xl shadow-2xl z-99999 border border-slate-200 overflow-hidden w-[220px]"
          style={{ top: posicionDropdownCat.top, left: posicionDropdownCat.left }}
        >
          <div className="max-h-[300px] overflow-y-auto">
            <button
              onClick={() => {
                setCategoria(null);
                setSubcategorias([]);
                setDropdownCategoria(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${!categoria
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
            >
              <span>Todas</span>
              {!categoria && <Check className="w-4 h-4 text-blue-600" />}
            </button>
            <div className="h-px bg-slate-100" />
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
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${isSelected
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                >
                  <span>{cat.nombre}</span>
                  {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {dropdownSubcategoria && (
        <div
          className="fixed bg-white rounded-xl shadow-2xl z-99999 border border-slate-200 overflow-hidden w-[220px]"
          style={{ top: posicionDropdownSub.top, left: posicionDropdownSub.left }}
        >
          <div className="max-h-[300px] overflow-y-auto">
            <button
              onClick={() => {
                setSubcategorias([]);
                setDropdownSubcategoria(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${subcategoriasSeleccionadas.length === 0
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
            >
              <span>Todas</span>
              {subcategoriasSeleccionadas.length === 0 && <Check className="w-4 h-4 text-blue-600" />}
            </button>
            <div className="h-px bg-slate-100" />
            {opcionesSubcategorias.map((sub) => {
              const isSelected = subcategoriasSeleccionadas.includes(sub.id);
              return (
                <button
                  key={sub.id}
                  onClick={() => {
                    setSubcategorias([sub.id]);
                    setDropdownSubcategoria(false);
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${isSelected
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                >
                  <span className="truncate">{sub.nombre}</span>
                  {isSelected && <Check className="w-4 h-4 text-slate-700 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Estilos CSS para popups personalizados */}
      <style>{POPUP_STYLES}</style>

    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PaginaNegocios;