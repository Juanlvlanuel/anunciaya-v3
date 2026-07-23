/**
 * ModalUbicacionChat.tsx (v2.0 - Header gradiente + tokens corregidos)
 * =====================================================================
 * Modal para enviar ubicación en ChatYA.
 *
 * FLUJO:
 *  1. Se abre → pide GPS (navigator.geolocation)
 *  2. GPS OK  → muestra mapa interactivo con pin en la posición actual
 *  3. Pin arrastrable → al soltar llama Nominatim para reverse geocoding
 *  4. Botón Enviar (circular, lado derecho de la dirección)
 *
 * PATRÓN: TC-6A (Modal de Detalle) con header gradiente
 *
 * UBICACIÓN: apps/web/src/components/chatya/ModalUbicacionChat.tsx
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Mapa, Marker, type MapRef, type MarkerDragEvent } from '../mapa/Mapa';
import { Send, Loader, AlertCircle } from 'lucide-react';
import { Icon, type IconProps } from '@/config/iconos';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Navigation = (p: IconoWrapperProps) => <Icon icon={ICONOS.distancia} {...p} />;
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
// CONSTANTES
// =============================================================================

const GRADIENTE = {
  bg: 'linear-gradient(135deg, #1e40af, #2563eb)',
  shadow: 'rgba(37,99,235,0.4)',
  handle: 'rgba(255,255,255,0.4)',
};

// =============================================================================
// ÍCONO PERSONALIZADO DEL PIN
// =============================================================================

/** Pin del chat como elemento HTML (hijo del <Marker>), con punta abajo. */
function PinChat() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        filter: 'drop-shadow(0 4px 8px rgba(37,99,235,0.45))',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          borderRadius: '50%',
          border: '3px solid white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      </div>
      <div style={{ width: 3, height: 10, background: '#1d4ed8', borderRadius: '0 0 2px 2px' }} />
      <div style={{ width: 8, height: 3, background: 'rgba(0,0,0,0.2)', borderRadius: '50%' }} />
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================

interface MarkerArrastrableProps {
  lat: number;
  lng: number;
  onDragEnd: (lat: number, lng: number) => void;
}

function MarkerArrastrable({ lat, lng, onDragEnd }: MarkerArrastrableProps) {
  return (
    <Marker
      longitude={lng}
      latitude={lat}
      draggable
      anchor="bottom"
      onDragEnd={(e: MarkerDragEvent) => onDragEnd(e.lngLat.lat, e.lngLat.lng)}
    >
      <PinChat />
    </Marker>
  );
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

type EstadoGPS = 'cargando' | 'listo' | 'error';

export function ModalUbicacionChat({ abierto, onCerrar, onEnviar }: ModalUbicacionChatProps) {
  const [estadoGPS, setEstadoGPS] = useState<EstadoGPS>('cargando');
  const [posicion, setPosicion] = useState<[number, number]>([19.4326, -99.1332]);
  const [direccion, setDireccion] = useState('');
  const [cargandoDireccion, setCargandoDireccion] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const posicionInicial = useRef<[number, number] | null>(null);
  const mapaRef = useRef<MapRef | null>(null);

  // El centrado inicial en el GPS lo da `initialViewState` (el mapa solo se monta
  // cuando estadoGPS === 'listo', con `posicion` ya en las coords del GPS). NO
  // recentramos al cambiar `posicion` para que al arrastrar el pin el mapa se
  // quede quieto y el marcador permanezca donde se soltó. El botón "volver a
  // GPS" recentra de forma imperativa (ver `volverAGPS`).

  // ── Obtener GPS al abrir ──
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
      () => { setEstadoGPS('error'); },
      { timeout: 10000, maximumAge: 30000 }
    );
  }, [abierto]);

  // ── Reverse geocoding con Nominatim ──
  const obtenerDireccion = useCallback(async (lat: number, lng: number) => {
    setCargandoDireccion(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
        { headers: { 'Accept-Language': 'es' } }
      );
      const data = await res.json();
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

  const handleDragEnd = useCallback((lat: number, lng: number) => {
    setPosicion([lat, lng]);
    obtenerDireccion(lat, lng);
    // Recentrar suave al soltar el pin (easeTo anima el paneo, sin teletransporte).
    mapaRef.current?.easeTo({ center: [lng, lat], duration: 500 });
  }, [obtenerDireccion]);

  const volverAGPS = useCallback(() => {
    if (!posicionInicial.current) return;
    const [lat, lng] = posicionInicial.current;
    setPosicion(posicionInicial.current);
    obtenerDireccion(lat, lng);
    // Recentrar el mapa explícitamente (el drag ya no recentra).
    mapaRef.current?.jumpTo({ center: [lng, lat], zoom: 16 });
  }, [obtenerDireccion]);

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

  const handleCerrar = useCallback(() => {
    setEstadoGPS('cargando');
    setDireccion('');
    onCerrar();
  }, [onCerrar]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <ModalAdaptativo
      abierto={abierto}
      onCerrar={handleCerrar}
      ancho="sm"
      mostrarHeader={false}
      paddingContenido="none"
      sinScrollInterno
      alturaMaxima="lg"
      colorHandle={GRADIENTE.handle}
      headerOscuro
      zIndice="z-[9999]"
    >
      <div className="flex flex-col max-h-[80vh] lg:max-h-[75vh]">

        {/* ── Header dark gradiente ── */}
        <div
          className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl 2xl:rounded-t-2xl"
          style={{ background: GRADIENTE.bg, boxShadow: `0 4px 16px ${GRADIENTE.shadow}` }}
        >
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
          <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

          <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
            <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
              <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white">Enviar ubicación</h3>
              <span className="text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium">Arrastra el pin para ajustar</span>
            </div>
          </div>
        </div>

        {/* ── Contenido ── */}
        <div className="flex flex-col flex-1">

          {/* Estado: cargando GPS */}
          {estadoGPS === 'cargando' && (
            <div className="flex flex-col items-center justify-center gap-3 py-14">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Loader className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
              <p className="text-sm text-white/60 lg:text-slate-600 font-medium">
                Obteniendo tu ubicación...
              </p>
            </div>
          )}

          {/* Estado: error GPS */}
          {estadoGPS === 'error' && (
            <div className="flex flex-col items-center justify-center gap-3 py-14 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-sm font-semibold text-white lg:text-slate-800">
                No se pudo obtener la ubicación
              </p>
              <p className="text-sm lg:text-[11px] 2xl:text-sm text-white/50 lg:text-slate-600 font-medium">
                Verifica que los permisos de GPS estén activados para este sitio.
              </p>
            </div>
          )}

          {/* Estado: listo */}
          {estadoGPS === 'listo' && (
            <>
              {/* Mapa */}
              <div className="relative" style={{ height: 300 }}>
                <Mapa
                  ref={mapaRef}
                  initialViewState={{ longitude: posicion[1], latitude: posicion[0], zoom: 16 }}
                  attributionControl={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <MarkerArrastrable lat={posicion[0]} lng={posicion[1]} onDragEnd={handleDragEnd} />
                </Mapa>

                {/* Botón volver a GPS */}
                <button
                  onClick={volverAGPS}
                  title="Volver a mi ubicación"
                  className="absolute bottom-3 right-3 z-1000 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-slate-300 hover:bg-slate-200 active:scale-95 lg:cursor-pointer"
                >
                  <Navigation className="w-4 h-4 text-blue-600" />
                </button>
              </div>

              {/* Fila: info dirección + botón enviar */}
              <div className="flex items-center gap-3 px-4 py-3 border-t-2 border-slate-300">
                {/* Ícono */}
                <div className="w-9 h-9 rounded-full bg-blue-500/15 lg:bg-blue-100 flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4 text-blue-400 lg:text-blue-600" />
                </div>

                {/* Texto dirección */}
                <div className="flex-1 min-w-0">
                  {cargandoDireccion ? (
                    <div className="flex items-center gap-1.5">
                      <Loader className="w-3 h-3 text-white/40 lg:text-slate-600 animate-spin shrink-0" />
                      <span className="text-sm lg:text-[11px] 2xl:text-sm text-white/40 lg:text-slate-600 font-medium">Obteniendo dirección...</span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-white lg:text-slate-800 truncate leading-tight">
                      {direccion || 'Ubicación seleccionada'}
                    </p>
                  )}
                  <p className="text-sm lg:text-[11px] 2xl:text-sm text-white/40 lg:text-slate-600 font-medium mt-0.5">
                    {posicion[0].toFixed(5)}, {posicion[1].toFixed(5)}
                  </p>
                </div>

                {/* Botón enviar */}
                <button
                  onClick={handleEnviar}
                  disabled={enviando || cargandoDireccion}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-white shadow-lg shadow-slate-700/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed lg:cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #334155, #1e293b)' }}
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
      </div>
    </ModalAdaptativo>
  );
}

export default ModalUbicacionChat;
