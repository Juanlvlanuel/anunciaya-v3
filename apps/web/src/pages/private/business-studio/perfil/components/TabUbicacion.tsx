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
import { buscarCiudades, buscarCiudadCercana, buscarEstados, estadosMexico, type CiudadConNombreCompleto } from '@/data/ciudadesPopulares';
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
  const [ciudadEnfocada, setCiudadEnfocada] = useState(false);
  const [resultadosCiudad, setResultadosCiudad] = useState<CiudadConNombreCompleto[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [busquedaEstado, setBusquedaEstado] = useState('');
  const [estadoEnfocado, setEstadoEnfocado] = useState(false);
  const [resultadosEstado, setResultadosEstado] = useState<string[]>([]);
  const [mostrarResultadosEstado, setMostrarResultadosEstado] = useState(false);
  const [detectandoUbicacion, setDetectandoUbicacion] = useState(false);
  const [mapaListo, setMapaListo] = useState(false);
  const [forzarCentrado, setForzarCentrado] = useState(0);

  const latitudActual = datosUbicacion.latitud ?? 31.3122;
  const longitudActual = datosUbicacion.longitud ?? -113.5465;

  useEffect(() => {
    const timer = setTimeout(() => setMapaListo(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const contenedorGeneralRef = useRef<HTMLDivElement>(null);
  const contenedorCiudadRef = useRef<HTMLDivElement>(null);
  const contenedorEstadoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mostrarResultados && contenedorGeneralRef.current) {
      setTimeout(() => {
        contenedorGeneralRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 100);
    }
  }, [mostrarResultados]);

  // Cerrar dropdown de estado al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contenedorEstadoRef.current &&
        !contenedorEstadoRef.current.contains(event.target as Node)
      ) {
        setMostrarResultadosEstado(false);
      }
    };

    if (mostrarResultadosEstado) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mostrarResultadosEstado]);

  // Cerrar dropdown de ciudad al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contenedorCiudadRef.current &&
        !contenedorCiudadRef.current.contains(event.target as Node)
      ) {
        setMostrarResultados(false);
      }
    };

    if (mostrarResultados) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    // Solo guardar el nombre de la ciudad (sin estado) en busquedaCiudad
    setBusquedaCiudad('');

    const coords = obtenerCoordenadasDeCiudad(ciudad);

    setDatosUbicacion({
      ...datosUbicacion,
      // Guardar ciudad y estado por separado en la BD
      ciudad: ciudad.nombre,
      estado: ciudad.estado,
      latitud: coords?.lat ?? datosUbicacion.latitud,
      longitud: coords?.lng ?? datosUbicacion.longitud,
    });

    setMostrarResultados(false);
    setMostrarResultadosEstado(false);
  }, [datosUbicacion, setDatosUbicacion]);

  const handleBusquedaEstado = useCallback((valor: string) => {
    setBusquedaEstado(valor);

    if (valor.trim().length >= 1) {
      const resultados = buscarEstados(valor);
      setResultadosEstado(resultados);
      setMostrarResultadosEstado(true);
    } else {
      setResultadosEstado(estadosMexico);
      setMostrarResultadosEstado(true);
    }
  }, []);

  const handleSeleccionarEstado = useCallback((estado: string) => {
    setBusquedaEstado('');
    setDatosUbicacion({
      ...datosUbicacion,
      estado: estado,
    });
    setMostrarResultadosEstado(false);
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
          // Guardar ciudad y estado por separado en la BD
          ciudad: ciudadCercana
            ? ciudadCercana.nombre
            : datosUbicacion.ciudad,
          estado: ciudadCercana
            ? ciudadCercana.estado
            : datosUbicacion.estado,
          latitud: coordenadas.latitud,
          longitud: coordenadas.longitud,
        });

        // Limpiar búsquedas ya que los valores se muestran desde datosUbicacion
        if (ciudadCercana) {
          setBusquedaCiudad('');
          setBusquedaEstado('');
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-3 2xl:gap-4 lg:items-stretch">

      {/* ================================================================ */}
      {/* CARD: DIRECCIÓN */}
      {/* ================================================================ */}

      <div className="bg-white border-2 border-slate-300 rounded-xl"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2.5 rounded-t-xl"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          <MapPin className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-300 shrink-0" />
          <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Dirección</span>
        </div>

        <div className="p-4 lg:p-3 2xl:p-4 space-y-4 lg:space-y-3 2xl:space-y-4">

          {/* Calle y Colonia */}
          <div>
            <div className="flex items-center gap-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
              <MapPin className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-blue-600 shrink-0" />
              Calle y Colonia <span className="text-red-500">*</span>
            </div>
            <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
              style={{ border: '2px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
              <input
                type="text"
                value={datosUbicacion.direccion}
                onChange={(e) => setDatosUbicacion({ ...datosUbicacion, direccion: e.target.value })}
                placeholder="Ej: Calle Benito Juárez #123, Col. Centro"
                className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Ciudad + Estado */}
          <div ref={contenedorGeneralRef} className="space-y-4 lg:space-y-3 2xl:space-y-4">

              {/* Ciudad */}
              <div>
                <div className="flex items-center gap-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
                  <MapPin className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-blue-600 shrink-0" />
                  Ciudad <span className="text-red-500">*</span>
                </div>
              <div ref={contenedorCiudadRef} className="relative w-full z-20">
                <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                  style={{ border: '2px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                  <input
                    type="text"
                    value={ciudadEnfocada ? busquedaCiudad : (busquedaCiudad || datosUbicacion.ciudad)}
                    onChange={(e) => handleBusquedaCiudad(e.target.value)}
                    onFocus={() => { setCiudadEnfocada(true); setBusquedaCiudad(''); if (resultadosCiudad.length > 0) setMostrarResultados(true); }}
                    onBlur={() => { setCiudadEnfocada(false); setTimeout(() => setMostrarResultados(false), 150); }}
                    placeholder={datosUbicacion.ciudad || 'Buscar ciudad...'}
                    className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                  />
                  {busquedaCiudad && (
                    <button type="button"
                      onClick={() => { setBusquedaCiudad(''); setResultadosCiudad([]); setMostrarResultados(false); }}
                      className="text-slate-400 hover:text-slate-600 ml-2 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {mostrarResultados && resultadosCiudad.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50"
                    style={{ border: '2px solid #cbd5e1' }}>
                    {resultadosCiudad.map((ciudad, index) => (
                      <button key={index} type="button" onClick={() => handleSeleccionarCiudad(ciudad)}
                        className="w-full px-4 py-2.5 text-left hover:bg-blue-100 flex items-center gap-2.5 border-b border-slate-300 last:border-0 cursor-pointer">
                        <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">{ciudad.nombre}</p>
                          <p className="text-sm lg:text-xs 2xl:text-sm text-slate-600 truncate">{ciudad.estado}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              </div>

              {/* Estado */}
              <div>
                <div className="flex items-center gap-2 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
                  <MapPin className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-blue-600 shrink-0" />
                  Estado <span className="text-red-500">*</span>
                </div>
              <div ref={contenedorEstadoRef} className="relative w-full z-10">
                <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4"
                  style={{
                    border: !datosUbicacion.estado ? '2px solid #ef4444' : '2px solid #cbd5e1',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                  <input
                    type="text"
                    value={estadoEnfocado ? busquedaEstado : (busquedaEstado || datosUbicacion.estado || '')}
                    onChange={(e) => handleBusquedaEstado(e.target.value)}
                    onFocus={() => { setEstadoEnfocado(true); setBusquedaEstado(''); setResultadosEstado(estadosMexico); setMostrarResultadosEstado(true); }}
                    onBlur={() => setEstadoEnfocado(false)}
                    placeholder={datosUbicacion.estado || 'Estado...'}
                    className="flex-1 bg-transparent outline-none text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                  />
                  {busquedaEstado && (
                    <button type="button"
                      onClick={() => { setBusquedaEstado(''); setResultadosEstado([]); setMostrarResultadosEstado(false); }}
                      className="text-slate-400 hover:text-slate-600 ml-2 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {mostrarResultadosEstado && resultadosEstado.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl max-h-60 overflow-y-auto z-50"
                    style={{ border: '2px solid #cbd5e1' }}>
                    {resultadosEstado.map((estado, index) => (
                      <button key={index} type="button" onClick={() => handleSeleccionarEstado(estado)}
                        className="w-full px-4 py-2.5 text-left hover:bg-blue-100 flex items-center gap-2.5 border-b border-slate-300 last:border-0 cursor-pointer">
                        <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-sm lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">{estado}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!datosUbicacion.estado && (
                  <p className="absolute -bottom-5 left-0 text-xs text-red-500 font-medium">Selecciona un estado</p>
                )}
              </div>
              </div>

          </div>

        </div>
      </div>

      {/* ================================================================ */}
      {/* CARD: MAPA INTERACTIVO */}
      {/* ================================================================ */}

      <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div className="px-4 py-2.5 flex items-center gap-2.5"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          <MapPin className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-300 shrink-0" />
          <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Ubicación en el Mapa</span>
          <span className="text-red-400 ml-0.5">*</span>
          <span className="hidden lg:block text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium mx-2">
            Arrastra el marcador o haz clic para ajustar
          </span>
          <button
            type="button"
            onClick={handleDetectarUbicacion}
            disabled={detectandoUbicacion}
            className="ml-auto flex items-center gap-1.5 h-7 px-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            {detectandoUbicacion
              ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
              : <Navigation className="w-3.5 h-3.5 shrink-0" />
            }
            Tu ubicación
          </button>
        </div>

        {/* Tip móvil */}
        <div className="lg:hidden px-4 py-2 bg-blue-50 border-b border-slate-200">
          <p className="text-sm text-blue-700 font-medium">
            <span className="font-bold">Tip:</span> Arrastra el marcador o toca el mapa para ajustar la ubicación
          </p>
        </div>

        {/* Mapa */}
        <div className="relative w-full h-[360px] lg:h-[520px] 2xl:h-[580px] z-0">

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
            <div className="flex items-center justify-center h-full bg-slate-100">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          )}
        </div>

      </div>

    </div>
  );
}