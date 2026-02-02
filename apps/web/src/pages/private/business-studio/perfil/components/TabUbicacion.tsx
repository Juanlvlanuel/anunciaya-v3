/**
 * ============================================================================
 * TAB: Ubicación
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/components/TabUbicacion.tsx
 * 
 * PROPÓSITO:
 * Tab para editar dirección, ciudad y ubicación GPS de la sucursal
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { MapPin, Navigation, Loader2, X } from 'lucide-react';
import L from 'leaflet';
import { useGpsStore } from '@/stores/useGpsStore';
import { buscarCiudades, buscarCiudadCercana, type CiudadConNombreCompleto } from '@/data/ciudadesPopulares';
import { notificar } from '@/utils/notificaciones';

import 'leaflet/dist/leaflet.css';

import type { DatosUbicacion } from '../hooks/usePerfil';

// =============================================================================
// FIX DE ICONOS DE LEAFLET
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// =============================================================================
// COMPONENTES AUXILIARES DEL MAPA
// =============================================================================

interface CentrarMapaProps {
  lat: number;
  lng: number;
  forzar?: number;
}

function CentrarMapa({ lat, lng, forzar }: CentrarMapaProps) {
  const map = useMap();
  useEffect(() => {
    const currentZoom = map.getZoom();
    map.setView([lat, lng], currentZoom);
  }, [lat, lng, forzar, map]);
  return null;
}

interface MarcadorArrastrableProps {
  posicion: [number, number];
  onMover: (lat: number, lng: number) => void;
}

function MarcadorArrastrable({ posicion, onMover }: MarcadorArrastrableProps) {
  const [posicionLocal, setPosicionLocal] = useState<[number, number]>(posicion);

  useEffect(() => {
    setPosicionLocal(posicion);
  }, [posicion]);

  const eventHandlers = {
    dragend(e: L.DragEndEvent) {
      const marker = e.target;
      const position = marker.getLatLng();
      setPosicionLocal([position.lat, position.lng]);
      onMover(position.lat, position.lng);
    },
  };

  return <Marker position={posicionLocal} draggable={true} eventHandlers={eventHandlers} />;
}

interface DetectarClicMapaProps {
  onClic: (lat: number, lng: number) => void;
}

function DetectarClicMapa({ onClic }: DetectarClicMapaProps) {
  const map = useMap();

  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      onClic(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleClick);

    return () => {
      map.off('click', handleClick);
    };
  }, [map, onClic]);

  return null;
}

// =============================================================================
// HELPER: Obtener coordenadas de ciudad
// =============================================================================

function obtenerCoordenadasDeCiudad(ciudad: CiudadConNombreCompleto): { lat: number; lng: number } | null {
  if ('coordenadas' in ciudad && ciudad.coordenadas) {
    return { lat: ciudad.coordenadas.lat, lng: ciudad.coordenadas.lng };
  }
  return null;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

interface TabUbicacionProps {
  datosUbicacion: DatosUbicacion;
  setDatosUbicacion: (datos: DatosUbicacion) => void;
}

export default function TabUbicacion({
  datosUbicacion,
  setDatosUbicacion,
}: TabUbicacionProps) {

  const { obtenerUbicacion } = useGpsStore();

  const [busquedaCiudad, setBusquedaCiudad] = useState('');
  const [resultadosCiudad, setResultadosCiudad] = useState<CiudadConNombreCompleto[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [detectandoUbicacion, setDetectandoUbicacion] = useState(false);
  const [mapaListo, setMapaListo] = useState(false);
  const [forzarCentrado, setForzarCentrado] = useState(0);

  const latitudActual = datosUbicacion.latitud ?? 31.3122;
  const longitudActual = datosUbicacion.longitud ?? -113.5465;

  useEffect(() => {
    const timer = setTimeout(() => setMapaListo(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const contenedorCiudadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mostrarResultados && contenedorCiudadRef.current) {
      setTimeout(() => {
        contenedorCiudadRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [mostrarResultados]);

  const handleBusquedaCiudad = useCallback((valor: string) => {
    setBusquedaCiudad(valor);

    if (valor.trim().length >= 2) {
      const resultados = buscarCiudades(valor);
      setResultadosCiudad(resultados);
      setMostrarResultados(true);
    } else {
      setResultadosCiudad([]);
      setMostrarResultados(false);
    }
  }, []);

  const handleSeleccionarCiudad = useCallback((ciudad: CiudadConNombreCompleto) => {
    const nombreCompleto = `${ciudad.nombre}, ${ciudad.estado}`;
    setBusquedaCiudad(nombreCompleto);

    const coords = obtenerCoordenadasDeCiudad(ciudad);

    setDatosUbicacion({
      ...datosUbicacion,
      ciudad: nombreCompleto,
      latitud: coords?.lat ?? datosUbicacion.latitud,
      longitud: coords?.lng ?? datosUbicacion.longitud,
    });

    setMostrarResultados(false);
  }, [datosUbicacion, setDatosUbicacion]);

  const handleDetectarUbicacion = useCallback(async () => {
    setDetectandoUbicacion(true);

    try {
      const coordenadas = await obtenerUbicacion();

      if (coordenadas) {
        const ciudadCercana = buscarCiudadCercana(
          coordenadas.latitud,
          coordenadas.longitud
        );

        setDatosUbicacion({
          ...datosUbicacion,
          ciudad: ciudadCercana
            ? `${ciudadCercana.nombre}, ${ciudadCercana.estado}`
            : datosUbicacion.ciudad,
          latitud: coordenadas.latitud,
          longitud: coordenadas.longitud,
        });

        if (ciudadCercana) {
          setBusquedaCiudad(`${ciudadCercana.nombre}, ${ciudadCercana.estado}`);
        }

        setForzarCentrado(prev => prev + 1);

        notificar.exito('Ubicación detectada correctamente');
      } else {
        notificar.error('No se pudo obtener la ubicación. Verifica los permisos GPS.');
      }
    } catch {
      notificar.error('No se pudo detectar la ubicación');
    } finally {
      setDetectandoUbicacion(false);
    }
  }, [obtenerUbicacion, datosUbicacion, setDatosUbicacion]);

  const handleMoverMarcador = useCallback((lat: number, lng: number) => {
    setDatosUbicacion({
      ...datosUbicacion,
      latitud: lat,
      longitud: lng,
    });
  }, [datosUbicacion, setDatosUbicacion]);

  return (
    <div className="space-y-5 lg:space-y-3 2xl:space-y-5">

      {/* Calle y Colonia */}
      <div>
        <div className="flex items-center gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-700 mb-2">
          <svg className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Calle y Colonia <span className="text-red-500">*</span>
        </div>
        <div
          className="flex items-center h-12 lg:h-10 2xl:h-12 bg-slate-50 rounded-lg px-4 lg:px-3 2xl:px-4"
          style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
        >
          <input
            type="text"
            value={datosUbicacion.direccion}
            onChange={(e) => setDatosUbicacion({ ...datosUbicacion, direccion: e.target.value })}
            placeholder="Ej: Calle Benito Juárez #123, Col. Centro"
            className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
          />
        </div>
      </div>

      {/* Ciudad con Autocomplete + Botón Detectar */}
      <div ref={contenedorCiudadRef} className="relative z-10">
        <div className="flex items-center gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-700 mb-2">
          <MapPin className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
          Ciudad <span className="text-red-500">*</span>
        </div>

        <div className="flex gap-2">
          {/* Input con Autocomplete */}
          <div className="relative flex-1">
            <div
              className="flex items-center h-12 lg:h-10 2xl:h-12 bg-slate-50 rounded-lg px-4 lg:px-3 2xl:px-4"
              style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
            >
              <input
                type="text"
                value={busquedaCiudad || datosUbicacion.ciudad}
                onChange={(e) => handleBusquedaCiudad(e.target.value)}
                onFocus={() => {
                  if (resultadosCiudad.length > 0) {
                    setMostrarResultados(true);
                  }
                }}
                placeholder="Buscar ciudad..."
                className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-400 placeholder:font-medium"
              />

              {/* Botón limpiar búsqueda */}
              {busquedaCiudad && (
                <button
                  type="button"
                  onClick={() => {
                    setBusquedaCiudad('');
                    setResultadosCiudad([]);
                    setMostrarResultados(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors ml-2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown de resultados */}
            {mostrarResultados && resultadosCiudad.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50" style={{ border: '2.5px solid #dde4ef' }}>
                {resultadosCiudad.map((ciudad, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSeleccionarCiudad(ciudad)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-2.5 border-b border-slate-100 last:border-0 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {ciudad.nombre}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {ciudad.estado}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón Detectar Ubicación */}
          <button
            type="button"
            onClick={handleDetectarUbicacion}
            disabled={detectandoUbicacion}
            className="shrink-0 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-semibold transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {detectandoUbicacion ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
            <span className="hidden lg:inline text-sm">Usar mi ubicación</span>
          </button>
        </div>
      </div>

      {/* Mapa Interactivo */}
      <div>
        <div className="flex items-start lg:items-center justify-between mb-2 gap-2 lg:gap-4">
          <div className="flex items-center gap-2.5 text-base lg:text-sm 2xl:text-base font-bold text-slate-700">
            <MapPin className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
            Ubicación en el Mapa <span className="text-red-500">*</span>
          </div>
          
          <p className="lg:hidden text-xs text-blue-700 text-right leading-tight">
            <span className="font-bold">Tip:</span> Arrastra el marcador<br /> o haz clic en el mapa
          </p>
          
          <p className="hidden lg:block text-xs 2xl:text-sm text-blue-700">
            <span className="font-semibold">Tip:</span> Arrastra el marcador o haz clic en el mapa para ajustar la ubicación exacta
          </p>
        </div>

        {/* Contenedor del Mapa */}
        <div className="relative w-full h-[360px] lg:h-96 2xl:h-[420px] rounded-lg overflow-hidden shadow-md z-0" style={{ border: '2.5px solid #dde4ef' }}>

          {/* Botón Centrar Mapa - Flotante */}
          <button
            type="button"
            onClick={() => setForzarCentrado(prev => prev + 1)}
            className="absolute top-4 right-4 z-1000 bg-white hover:bg-blue-50 text-blue-600 p-2.5 rounded-lg shadow-lg transition-all cursor-pointer"
            style={{ border: '2.5px solid #dde4ef' }}
            title="Centrar mapa en la ubicación"
          >
            <MapPin className="w-5 h-5" />
          </button>

          {mapaListo ? (
            <MapContainer
              center={[latitudActual, longitudActual]}
              zoom={15}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MarcadorArrastrable
                posicion={[latitudActual, longitudActual]}
                onMover={handleMoverMarcador}
              />
              <DetectarClicMapa onClic={handleMoverMarcador} />
              <CentrarMapa lat={latitudActual} lng={longitudActual} forzar={forzarCentrado} />
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-50">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}