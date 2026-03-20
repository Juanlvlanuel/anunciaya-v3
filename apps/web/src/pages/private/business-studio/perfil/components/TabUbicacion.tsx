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
import { MapPin, Navigation, Loader2, X, Search } from 'lucide-react';
import { ModalUbicacion } from '../../../../../components/layout/ModalUbicacion';
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
  const [ciudadEnfocada, setCiudadEnfocada] = useState(false);
  const [resultadosCiudad, setResultadosCiudad] = useState<CiudadConNombreCompleto[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [detectandoUbicacion, setDetectandoUbicacion] = useState(false);
  const [modalCiudadAbierto, setModalCiudadAbierto] = useState(false);
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

  // Cerrar dropdown de ciudad al hacer clic fuera (desktop)
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
  }, [datosUbicacion, setDatosUbicacion]);

  // Handler: selección de ciudad desde ModalUbicacion
  const handleSeleccionarCiudadModal = useCallback((ciudad: CiudadConNombreCompleto) => {
    const coords = obtenerCoordenadasDeCiudad(ciudad);
    setDatosUbicacion({
      ...datosUbicacion,
      ciudad: ciudad.nombre,
      estado: ciudad.estado,
      latitud: coords?.lat ?? datosUbicacion.latitud,
      longitud: coords?.lng ?? datosUbicacion.longitud,
    });
    setForzarCentrado(prev => prev + 1);
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
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-3 2xl:gap-4 lg:items-stretch">

      {/* ================================================================ */}
      {/* CARD: DIRECCIÓN */}
      {/* ================================================================ */}

      <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
            <MapPin className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </div>
          <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Dirección</span>
        </div>

        <div className="p-4 lg:p-3 2xl:p-4 space-y-4 lg:space-y-3 2xl:space-y-4">

          {/* Calle y Colonia */}
          <div>
            <div className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
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

              {/* Ciudad — Móvil: botón que abre modal | Desktop: input con dropdown */}
              <div>
                <div className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
                  Ciudad <span className="text-red-500">*</span>
                </div>

                {/* MÓVIL: botón que abre modal fullscreen */}
                <button
                  type="button"
                  onClick={() => setModalCiudadAbierto(true)}
                  className="lg:hidden flex items-center w-full h-11 bg-slate-100 rounded-lg px-4 cursor-pointer"
                  style={{ border: '2px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                >
                  <span className={`flex-1 text-left text-base font-medium ${datosUbicacion.ciudad ? 'text-slate-800' : 'text-slate-500'}`}>
                    {datosUbicacion.ciudad || 'Buscar ciudad...'}
                  </span>
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                {/* DESKTOP: input con dropdown autocomplete */}
                <div ref={contenedorCiudadRef} className="relative w-full z-20 hidden lg:block">
                  <div className="flex items-center lg:h-10 2xl:h-11 bg-slate-100 rounded-lg lg:px-3 2xl:px-4"
                    style={{ border: '2px solid #cbd5e1', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                    <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                    <input
                      type="text"
                      value={ciudadEnfocada ? busquedaCiudad : (busquedaCiudad || datosUbicacion.ciudad)}
                      onChange={(e) => handleBusquedaCiudad(e.target.value)}
                      onFocus={() => { setCiudadEnfocada(true); setBusquedaCiudad(''); if (resultadosCiudad.length > 0) setMostrarResultados(true); }}
                      onBlur={() => { setCiudadEnfocada(false); setTimeout(() => setMostrarResultados(false), 150); }}
                      placeholder={datosUbicacion.ciudad || 'Buscar ciudad...'}
                      className="flex-1 bg-transparent outline-none lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
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
                          <span className="flex-1 lg:text-xs 2xl:text-sm font-semibold text-slate-800 truncate">
                            {ciudad.nombre}, <span className="font-medium text-slate-600">{ciudad.estado}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Estado — Solo lectura (se auto-completa con la ciudad) */}
              <div>
                <div className="text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5">
                  Estado
                </div>
                <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-50 rounded-lg px-4 lg:px-3 2xl:px-4"
                  style={{
                    border: !datosUbicacion.estado ? '2px solid #ef4444' : '2px solid #e2e8f0',
                  }}>
                  <span className={`flex-1 text-base lg:text-sm 2xl:text-base font-medium ${datosUbicacion.estado ? 'text-slate-700' : 'text-slate-400'}`}>
                    {datosUbicacion.estado || 'Se auto-completa al seleccionar ciudad'}
                  </span>
                </div>
                {!datosUbicacion.estado && (
                  <p className="mt-1 text-xs text-red-500 font-medium">Selecciona una ciudad</p>
                )}
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
        <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5"
          style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
          <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
            <MapPin className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
          </div>
          <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Ubicación en el Mapa</span>
          <span className="text-red-400">*</span>
          <button
            type="button"
            onClick={handleDetectarUbicacion}
            disabled={detectandoUbicacion}
            className="ml-auto flex items-center gap-1.5 h-9 lg:h-8 2xl:h-9 px-3 lg:px-2.5 2xl:px-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg text-sm lg:text-xs 2xl:text-sm font-semibold cursor-pointer disabled:cursor-not-allowed shrink-0"
          >
            {detectandoUbicacion
              ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
              : <Navigation className="w-4 h-4 shrink-0" />
            }
            Mi Ubicación
          </button>
        </div>

        {/* Tip */}
        <div className="px-4 lg:px-3 2xl:px-4 py-2 lg:py-1.5 2xl:py-2 bg-blue-50 border-b border-slate-200">
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

    {/* Modal compartido — Buscar Ciudad */}
    {modalCiudadAbierto && (
      <ModalUbicacion
        onClose={() => setModalCiudadAbierto(false)}
        onSeleccionar={handleSeleccionarCiudadModal}
      />
    )}
    </>
  );
}