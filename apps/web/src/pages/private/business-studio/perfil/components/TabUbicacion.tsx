/**
 * ============================================================================
 * TAB: Ubicación
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/components/TabUbicacion.tsx
 * 
 * PROPÓSITO:
 * Tab para editar dirección, ciudad y ubicación GPS de la sucursal
 * 
* FEATURES:
* - Autocomplete de ciudades
 * - Botón detectar ubicación GPS
 * - Mapa interactivo con Leaflet
 * - Marcador arrastrable
 * - 100% responsive (móvil, laptop 1366x768, desktop 1920x1080)
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
    // Mantener el zoom actual del mapa al cambiar ubicación
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

  // Estados locales
  const [busquedaCiudad, setBusquedaCiudad] = useState('');
  const [resultadosCiudad, setResultadosCiudad] = useState<CiudadConNombreCompleto[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [detectandoUbicacion, setDetectandoUbicacion] = useState(false);
  const [mapaListo, setMapaListo] = useState(false);
  const [forzarCentrado, setForzarCentrado] = useState(0); // Contador para forzar re-centrado


  // Valores por defecto para coordenadas (Puerto Peñasco como fallback)
  const latitudActual = datosUbicacion.latitud ?? 31.3122;
  const longitudActual = datosUbicacion.longitud ?? -113.5465;

  // Inicializar mapa después de montar
  useEffect(() => {
    const timer = setTimeout(() => setMapaListo(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Ref para auto-scroll al campo de ciudad
  const contenedorCiudadRef = useRef<HTMLDivElement>(null);

  // ✅ Auto-scroll cuando aparece el dropdown de resultados
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

  // Manejar búsqueda de ciudad
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

  // Seleccionar ciudad del dropdown
  const handleSeleccionarCiudad = useCallback((ciudad: CiudadConNombreCompleto) => {
    const nombreCompleto = `${ciudad.nombre}, ${ciudad.estado}`;
    setBusquedaCiudad(nombreCompleto);

    // Obtener coordenadas
    const coords = obtenerCoordenadasDeCiudad(ciudad);

    setDatosUbicacion({
      ...datosUbicacion,
      ciudad: nombreCompleto,
      latitud: coords?.lat ?? datosUbicacion.latitud,
      longitud: coords?.lng ?? datosUbicacion.longitud,
    });

    setMostrarResultados(false);
  }, [datosUbicacion, setDatosUbicacion]);

  // Detectar ubicación GPS (solo para negocios físicos)
  const handleDetectarUbicacion = useCallback(async () => {
    setDetectandoUbicacion(true);

    try {
      const coordenadas = await obtenerUbicacion();

      if (coordenadas) {
        // Buscar ciudad más cercana usando las coordenadas
        const ciudadCercana = buscarCiudadCercana(
          coordenadas.latitud,
          coordenadas.longitud
        );

        // Actualizar todos los campos: ciudad, latitud y longitud
        setDatosUbicacion({
          ...datosUbicacion,
          ciudad: ciudadCercana
            ? `${ciudadCercana.nombre}, ${ciudadCercana.estado}`
            : datosUbicacion.ciudad,
          latitud: coordenadas.latitud,
          longitud: coordenadas.longitud,
        });

        // Actualizar también el input de búsqueda
        if (ciudadCercana) {
          setBusquedaCiudad(`${ciudadCercana.nombre}, ${ciudadCercana.estado}`);
        }

        // Forzar re-centrado del mapa
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

  // Mover marcador
  const handleMoverMarcador = useCallback((lat: number, lng: number) => {
    setDatosUbicacion({
      ...datosUbicacion,
      latitud: lat,
      longitud: lng,
    });
  }, [datosUbicacion, setDatosUbicacion]);

  return (
    <div className="space-y-4 lg:space-y-4 2xl:space-y-6">

      {/* Calle y Colonia */}
      <div>
        <label htmlFor="input-direccion" className="block text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-1.5 lg:mb-1.5 2xl:mb-2">
          Calle y Colonia <span className="text-red-500">*</span>
        </label>
        <input
          id="input-direccion"
          name="input-direccion"
          type="text"
          value={datosUbicacion.direccion}
          onChange={(e) => setDatosUbicacion({ ...datosUbicacion, direccion: e.target.value })}
          placeholder="Ej: Calle Benito Juárez #123, Col. Centro"
          className="w-full px-4 lg:px-3 2xl:px-4 py-2.5 lg:py-2 2xl:py-3 text-base lg:text-sm 2xl:text-base bg-slate-50 border-2 border-slate-300 rounded-xl lg:rounded-lg 2xl:rounded-xl font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
        />
      </div>

      {/* Ciudad con Autocomplete + Botón Detectar */}
      <div ref={contenedorCiudadRef} className="relative z-10">
        <label htmlFor="input-ciudad" className="block text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700 mb-1.5 lg:mb-1.5 2xl:mb-2">
          Ciudad <span className="text-red-500">*</span>
        </label>

        <div className="flex gap-2 lg:gap-1.5 2xl:gap-2">
          {/* Input con Autocomplete */}
          <div className="relative flex-1">
            <div className="absolute left-3 lg:left-2.5 2xl:left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <MapPin className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
            </div>
            <input
              id="input-ciudad"
              name="input-ciudad"
              type="text"
              value={busquedaCiudad || datosUbicacion.ciudad}
              onChange={(e) => handleBusquedaCiudad(e.target.value)}
              onFocus={() => {
                if (resultadosCiudad.length > 0) {
                  setMostrarResultados(true);
                }
              }}
              placeholder="Buscar ciudad..."
              className="w-full pl-10 lg:pl-9 2xl:pl-10 pr-10 lg:pr-9 2xl:pr-10 py-2.5 lg:py-2 2xl:py-3 text-base lg:text-sm 2xl:text-base bg-slate-50 border-2 border-slate-300 rounded-xl lg:rounded-lg 2xl:rounded-xl font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
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
                className="absolute right-3 lg:right-2.5 2xl:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4" />
              </button>
            )}

            {/* Dropdown de resultados */}
            {mostrarResultados && resultadosCiudad.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-slate-300 rounded-xl lg:rounded-lg 2xl:rounded-xl shadow-2xl z-9999 max-h-60 lg:max-h-48 2xl:max-h-60 overflow-y-auto">
                {resultadosCiudad.map((ciudad, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSeleccionarCiudad(ciudad)}
                    className="w-full px-4 lg:px-3 2xl:px-4 py-2.5 lg:py-2 2xl:py-3 text-left hover:bg-blue-50 transition-colors flex items-center gap-2 lg:gap-1.5 2xl:gap-2 border-b border-slate-100 last:border-0"
                  >
                    <MapPin className="w-4 h-4 lg:w-3 lg:h-3 2xl:w-4 2xl:h-4 text-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm lg:text-xs 2xl:text-sm font-medium text-slate-900 truncate">
                        {ciudad.nombre}
                      </p>
                      <p className="text-xs lg:text-[10px] 2xl:text-xs text-slate-500 truncate">
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
            className="shrink-0 px-4 lg:px-3 2xl:px-4 py-2.5 lg:py-2 2xl:py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl lg:rounded-lg 2xl:rounded-xl font-semibold transition-colors shadow-sm flex items-center gap-2 lg:gap-1.5 2xl:gap-2"
          >
            {detectandoUbicacion ? (
              <Loader2 className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
            )}
            <span className="hidden lg:inline text-sm lg:text-xs 2xl:text-sm">Usar mi ubicación</span>
          </button>
        </div>
      </div>

      {/* Mapa Interactivo */}
      <div>
        <div className="flex items-start lg:items-center justify-between mb-1.5 lg:mb-1.5 2xl:mb-2 gap-2 lg:gap-4 2xl:gap-4">
          <span className="block text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-700">
            Ubicación en el Mapa <span className="text-red-500">*</span>
          </span>
          
          {/* Texto CORTO en móvil */}
          <p className="lg:hidden text-xs text-blue-700 text-right leading-tight">
            <span className="font-bold">Tip:</span> Arrastra el marcador<br /> o haz clic en el mapa
          </p>
          
          {/* Texto ORIGINAL en desktop */}
          <p className="hidden lg:block text-xs 2xl:text-sm text-blue-700">
            <span className="font-semibold">Tip:</span> Arrastra el marcador o haz clic en el mapa para ajustar la ubicación exacta
          </p>
        </div>

        {/* Contenedor del Mapa */}
        <div className="relative w-full h-[360px] lg:h-96 2xl:h-[470px] rounded-xl lg:rounded-lg 2xl:rounded-xl overflow-hidden border-2 border-slate-300 shadow-md z-0">

          {/* Botón Centrar Mapa - Flotante */}
          <button
            type="button"
            onClick={() => setForzarCentrado(prev => prev + 1)}
            className="absolute top-4 right-4 z-1000 bg-white hover:bg-blue-50 text-blue-600 p-2.5 lg:p-2 2xl:p-2.5 rounded-lg shadow-lg border-2 border-blue-300 hover:border-blue-500 transition-all"
            title="Centrar mapa en la ubicación"
          >
            <MapPin className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5" />
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
              <Loader2 className="w-6 h-6 lg:w-5 lg:h-5 2xl:w-6 2xl:h-6 animate-spin text-blue-600" />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}