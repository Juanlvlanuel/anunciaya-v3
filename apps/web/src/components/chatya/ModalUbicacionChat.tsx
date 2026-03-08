/**
 * ModalUbicacionChat.tsx
 * =======================
 * Modal/BottomSheet para enviar ubicación en ChatYA.
 *
 * - Móvil  → BottomSheet (vía ModalAdaptativo)
 * - Desktop → Modal centrado (vía ModalAdaptativo)
 *
 * FLUJO:
 *  1. Se abre → pide GPS (navigator.geolocation)
 *  2. GPS OK  → muestra mapa interactivo con pin en la posición actual
 *  3. Pin arrastrable → al soltar llama Nominatim para reverse geocoding
 *  4. Botón Enviar (circular, lado derecho de la dirección)
 *
 * CONTENIDO DEL MENSAJE (JSON string):
 *  { latitud: number, longitud: number, direccion: string }
 *
 * UBICACIÓN: apps/web/src/components/chatya/ModalUbicacionChat.tsx
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Send, Loader, AlertCircle } from 'lucide-react';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalUbicacionChatProps {
  abierto: boolean;
  onCerrar: () => void;
  /** Callback al confirmar — recibe el JSON string listo para enviar como contenido */
  onEnviar: (contenidoJSON: string) => void;
}

// =============================================================================
// ÍCONO PERSONALIZADO DEL PIN
// =============================================================================

const iconoPin = L.divIcon({
  className: '',
  html: `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      filter: drop-shadow(0 4px 8px rgba(37,99,235,0.45));
    ">
      <div style="
        width: 36px; height: 36px;
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        border-radius: 50%;
        border: 3px solid white;
        display: flex; align-items: center; justify-content: center;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
      <div style="width: 3px; height: 10px; background: #1d4ed8; border-radius: 0 0 2px 2px;" />
      <div style="width: 8px; height: 3px; background: rgba(0,0,0,0.2); border-radius: 50%;" />
    </div>
  `,
  iconAnchor: [18, 49],
  iconSize: [36, 49],
});

// =============================================================================
// SUB-COMPONENTE: Manejador de eventos del mapa (para drag del pin)
// =============================================================================

interface MarkerArrastrableProps {
  posicion: [number, number];
  onDragEnd: (lat: number, lng: number) => void;
}

function MarkerArrastrable({ posicion, onDragEnd }: MarkerArrastrableProps) {
  const markerRef = useRef<L.Marker>(null);

  const handleDragEnd = useCallback(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const { lat, lng } = marker.getLatLng();
    onDragEnd(lat, lng);
  }, [onDragEnd]);

  return (
    <Marker
      ref={markerRef}
      position={posicion}
      icon={iconoPin}
      draggable
      eventHandlers={{ dragend: handleDragEnd }}
    />
  );
}

// Sub-componente para centrar el mapa cuando cambia la posición inicial
function CentrarMapa({ posicion }: { posicion: [number, number] }) {
  const map = useMapEvents({});
  useEffect(() => {
    map.setView(posicion, 16);
  }, [posicion, map]);
  return null;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

type EstadoGPS = 'cargando' | 'listo' | 'error';

export function ModalUbicacionChat({ abierto, onCerrar, onEnviar }: ModalUbicacionChatProps) {
  const [estadoGPS, setEstadoGPS] = useState<EstadoGPS>('cargando');
  const [posicion, setPosicion] = useState<[number, number]>([19.4326, -99.1332]); // CDMX fallback
  const [direccion, setDireccion] = useState('');
  const [cargandoDireccion, setCargandoDireccion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const posicionInicial = useRef<[number, number] | null>(null);

  // ── Obtener GPS al abrir ────────────────────────────────────────────────────
  useEffect(() => {
    if (!abierto) return;

    setEstadoGPS('cargando');
    setDireccion('');
    posicionInicial.current = null;

    if (!navigator.geolocation) {
      setEstadoGPS('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosicion(coords);
        posicionInicial.current = coords;
        setEstadoGPS('listo');
        obtenerDireccion(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setEstadoGPS('error');
      },
      { timeout: 10000, maximumAge: 30000 }
    );
  }, [abierto]);

  // ── Reverse geocoding con Nominatim ────────────────────────────────────────
  const obtenerDireccion = useCallback(async (lat: number, lng: number) => {
    setCargandoDireccion(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const data = await res.json();
      // Priorizar: calle + número, colonia, ciudad
      const addr = data.address ?? {};
      const partes = [
        addr.road && addr.house_number
          ? `${addr.road} ${addr.house_number}`
          : addr.road ?? addr.pedestrian ?? addr.footway,
        addr.suburb ?? addr.neighbourhood ?? addr.quarter,
        addr.city ?? addr.town ?? addr.village ?? addr.municipality,
      ].filter(Boolean);
      setDireccion(partes.length > 0 ? partes.join(', ') : data.display_name ?? 'Ubicación seleccionada');
    } catch {
      setDireccion('Ubicación seleccionada');
    } finally {
      setCargandoDireccion(false);
    }
  }, []);

  // ── Pin drag end ────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback((lat: number, lng: number) => {
    setPosicion([lat, lng]);
    obtenerDireccion(lat, lng);
  }, [obtenerDireccion]);

  // ── Volver a GPS original ───────────────────────────────────────────────────
  const volverAGPS = useCallback(() => {
    if (!posicionInicial.current) return;
    setPosicion(posicionInicial.current);
    obtenerDireccion(posicionInicial.current[0], posicionInicial.current[1]);
  }, [obtenerDireccion]);

  // ── Enviar ──────────────────────────────────────────────────────────────────
  const handleEnviar = useCallback(async () => {
    if (estadoGPS !== 'listo' || enviando) return;
    setEnviando(true);
    try {
      const contenido = JSON.stringify({
        latitud: posicion[0],
        longitud: posicion[1],
        direccion: direccion || 'Ubicación seleccionada',
      });
      onEnviar(contenido);
      onCerrar();
    } finally {
      setEnviando(false);
    }
  }, [estadoGPS, enviando, posicion, direccion, onEnviar, onCerrar]);

  // ── Reset al cerrar ─────────────────────────────────────────────────────────
  const handleCerrar = useCallback(() => {
    setEstadoGPS('cargando');
    setDireccion('');
    onCerrar();
  }, [onCerrar]);

  // =============================================================================
  // RENDER: contenido del modal
  // =============================================================================

  const contenido = (
    <div className="flex flex-col">

      {/* ── Estado: cargando GPS ── */}
      {estadoGPS === 'cargando' && (
        <div className="flex flex-col items-center justify-center gap-3 py-14">
          <div className="w-12 h-12 rounded-full bg-blue-50 lg:bg-blue-50 flex items-center justify-center">
            <Loader className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
          <p className="text-sm text-white/60 lg:text-gray-500 font-medium">
            Obteniendo tu ubicación...
          </p>
        </div>
      )}

      {/* ── Estado: error GPS ── */}
      {estadoGPS === 'error' && (
        <div className="flex flex-col items-center justify-center gap-3 py-14 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-sm font-semibold text-white lg:text-gray-800">
            No se pudo obtener la ubicación
          </p>
          <p className="text-xs text-white/50 lg:text-gray-500">
            Verifica que los permisos de GPS estén activados para este sitio.
          </p>
        </div>
      )}

      {/* ── Estado: listo ── */}
      {estadoGPS === 'listo' && (
        <>
          {/* Hint */}
          <div className="px-4 py-2 flex items-center gap-2
            bg-blue-500/10 lg:bg-blue-50
            border-b border-blue-500/10 lg:border-blue-100">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 lg:bg-blue-500 shrink-0" />
            <p className="text-xs font-medium text-blue-300 lg:text-blue-700">
              Arrastra el pin para ajustar la ubicación
            </p>
          </div>

          {/* Mapa */}
          <div className="relative" style={{ height: 300 }}>
            <MapContainer
              center={posicion}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MarkerArrastrable
                posicion={posicion}
                onDragEnd={handleDragEnd}
              />
              <CentrarMapa posicion={posicion} />
            </MapContainer>

            {/* Botón volver a GPS */}
            <button
              onClick={volverAGPS}
              title="Volver a mi ubicación"
              className="absolute bottom-3 right-3 z-1000 w-9 h-9 rounded-full bg-white shadow-lg
                flex items-center justify-center border border-gray-200
                hover:bg-gray-50 active:scale-95 transition-transform"
            >
              <Navigation className="w-4 h-4 text-blue-600" />
            </button>
          </div>

          {/* Fila: info dirección + botón enviar */}
          <div className="flex items-center gap-3 px-4 py-3">
            {/* Ícono */}
            <div className="w-9 h-9 rounded-full bg-blue-500/15 lg:bg-blue-50
              flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4 text-blue-400 lg:text-blue-600" />
            </div>

            {/* Texto dirección */}
            <div className="flex-1 min-w-0">
              {cargandoDireccion ? (
                <div className="flex items-center gap-1.5">
                  <Loader className="w-3 h-3 text-white/40 lg:text-gray-400 animate-spin shrink-0" />
                  <span className="text-xs text-white/40 lg:text-gray-400">Obteniendo dirección...</span>
                </div>
              ) : (
                <p className="text-sm font-semibold text-white lg:text-gray-800 truncate leading-tight">
                  {direccion || 'Ubicación seleccionada'}
                </p>
              )}
              <p className="text-xs text-white/40 lg:text-gray-400 mt-0.5">
                {posicion[0].toFixed(5)}, {posicion[1].toFixed(5)}
              </p>
            </div>

            {/* Botón enviar circular (igual al del input bar) */}
            <button
              onClick={handleEnviar}
              disabled={enviando || cargandoDireccion}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0
                bg-linear-to-br from-blue-600 to-blue-500 text-white
                shadow-[0_3px_10px_rgba(37,99,235,0.3)]
                hover:shadow-[0_4px_14px_rgba(37,99,235,0.4)]
                hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-transform"
            >
              {enviando
                ? <Loader className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={handleCerrar}
      titulo={
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400 lg:text-blue-600" />
          <span>Enviar ubicación</span>
        </div>
      }
      mostrarHeader
      sinScrollInterno
      alturaMaxima="lg"
      ancho="sm"
      paddingContenido="none"
      zIndice="z-[9999]"
    >
      {contenido}
    </ModalAdaptativo>
  );
}

export default ModalUbicacionChat;