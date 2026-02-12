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
  // LayoutGrid eliminado
} from 'lucide-react';
import { useListaNegocios } from '../../../hooks/useListaNegocios';
import { useFiltrosNegociosStore } from '../../../stores/useFiltrosNegociosStore';
import { useGpsStore } from '../../../stores/useGpsStore';
import { useCategorias } from '../../../hooks/useCategorias';
import { useSubcategorias } from '../../../hooks/useSubcategorias';
import { useSearchStore } from '../../../stores/useSearchStore';
// PanelFiltros eliminado
import { CardNegocio } from '../../../components/negocios/CardNegocio';

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

function ControlesMapa({ onMapReady }: { onMapReady?: (map: L.Map) => void }) {
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

  // Exponer referencia del mapa al padre
  useEffect(() => {
    if (onMapReady) onMapReady(map);
  }, [map, onMapReady]);

  // En móvil: mantener controles en el mapa
  // En desktop: controles van en el header (no renderizar aquí)
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
            if (latitud && longitud) map.setView([latitud - OFFSET_LATITUD, longitud + OFFSET_LONGITUD], 15);
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

  // Filtrar negocios por búsqueda (nombre o categoría)
  const negocios = searchQuery.trim()
    ? negociosRaw.filter((n) => {
        const q = searchQuery.toLowerCase();
        const nombre = (n.negocioNombre || '').toLowerCase();
        const cat = (n.categorias?.[0]?.nombre || '').toLowerCase();
        return nombre.includes(q) || cat.includes(q);
      })
    : negociosRaw;

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

  // Handlers
  const handleSeleccionarNegocio = (sucursalId: string) => {
    setNegocioSeleccionadoId(
      negocioSeleccionadoId === sucursalId ? null : sucursalId
    );
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
                className={`shrink-0 px-5 py-2 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer flex items-center ${
                  !categoria
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
                  className={`shrink-0 px-3 py-1 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    categoria === cat.id
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
                  <CardNegocio
                    key={negocio.sucursalId}
                    negocio={negocio}
                    seleccionado={negocio.sucursalId === negocioSeleccionadoId}
                    onSelect={() => handleSeleccionarNegocio(negocio.sucursalId)}
                  />
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
                        className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium cursor-pointer"
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

        {/* Header con pills de categorías (mismo estilo que vista lista) */}
        <div className="absolute top-0 left-0 right-0 z-1000">
          <div className="bg-black  py-1.5">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCategoria(null)}
                className={`shrink-0 px-5 py-2 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer flex items-center ${
                  !categoria
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
                  className={`shrink-0 px-3 py-1 rounded-xl text-[13px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    categoria === cat.id
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
                  if (latitud && longitud) mapRef.current?.setView([latitud - 0.006, longitud - 0.002], 15);
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
                  <CardNegocio
                    key={negocio.sucursalId}
                    negocio={negocio}
                    seleccionado={negocio.sucursalId === negocioSeleccionadoId}
                    onSelect={() => handleSeleccionarNegocio(negocio.sucursalId)}
                  />
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
                            className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium cursor-pointer"
                          >
                            Ver perfil
                          </button>
                        </div>
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

    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default PaginaNegocios;