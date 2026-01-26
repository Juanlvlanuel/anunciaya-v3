/**
 * PasoUbicacion.tsx - SIMPLIFICADO
 * ==================================
 * Paso 2 del Onboarding - Ubicación del Negocio
 * 
 * MODO ÚNICO: PRESENCIAL
 * - Ciudad (autocomplete moderno)
 * - Dirección completa
 * - Mapa interactivo compacto
 * 
 * ACTUALIZADO: Enero 2025 - Eliminada lógica de negocios online
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import {
    MapPin, Navigation, Info, Loader2, X, Search
} from 'lucide-react';
import L from 'leaflet';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useGpsStore } from '@/stores/useGpsStore';
import { api } from '@/services/api';
import { notificar } from '@/utils/notificaciones';
import { buscarCiudades, buscarCiudadCercana, type CiudadConNombreCompleto } from '@/data/ciudadesPopulares';
import { detectarZonaHoraria } from '@/utils/zonaHoraria';

import 'leaflet/dist/leaflet.css';



// =============================================================================
// FIX DE ICONOS DE LEAFLET
// =============================================================================

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
    const forzarAnterior = useRef(forzar);

    useEffect(() => {
        // Solo restablecer zoom cuando se presiona el botón centrar
        if (forzar !== forzarAnterior.current) {
            map.setView([lat, lng], 15);
            forzarAnterior.current = forzar;
        }
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

export function PasoUbicacion() {
    const { negocioId, guardarPaso2, setSiguienteDeshabilitado } = useOnboardingStore();
    const { latitud: latitudGps, longitud: longitudGps, obtenerUbicacion } = useGpsStore();

    // Estados principales
    const [ciudad, setCiudad] = useState('');
    const [direccion, setDireccion] = useState('');
    const [latitud, setLatitud] = useState<number>(31.3122);
    const [longitud, setLongitud] = useState<number>(-113.5465);

    // Estados de carga
    const [cargandoDatos, setCargandoDatos] = useState(true);
    const [detectandoUbicacion, setDetectandoUbicacion] = useState(false);
    const [mapaListo, setMapaListo] = useState(false);
    const [forzarCentrado, setForzarCentrado] = useState(0); // Contador para forzar re-centrado

    // Estados de autocomplete
    const [sugerenciasCiudades, setSugerenciasCiudades] = useState<CiudadConNombreCompleto[]>([]);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    const [ciudadSeleccionada, setCiudadSeleccionada] = useState<CiudadConNombreCompleto | null>(null);
    const inputCiudadRef = useRef<HTMLInputElement>(null);
    const sugerenciasRef = useRef<HTMLDivElement>(null);

    // ---------------------------------------------------------------------------
    // Validación
    // ---------------------------------------------------------------------------
    const esFormularioValido = () => {
        return (
            ciudad.trim().length >= 2 &&
            ciudad.trim().length <= 120 &&
            direccion.trim().length >= 5 &&
            direccion.trim().length <= 250 &&
            latitud >= -90 &&
            latitud <= 90 &&
            longitud >= -180 &&
            longitud <= 180
        );
    };

    useEffect(() => {
        const esValido = esFormularioValido();
        setSiguienteDeshabilitado(!esValido);

        // Actualizar estado de paso completado en tiempo real
        const { actualizarPasoCompletado } = useOnboardingStore.getState();
        actualizarPasoCompletado(1, esValido); // índice 1 = Paso 2
    }, [ciudad, direccion, latitud, longitud]);

    // ---------------------------------------------------------------------------
    // Auto-detectar ubicación al cargar
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const autoDetectar = async () => {
            if (latitudGps && longitudGps) {
                setLatitud(latitudGps);
                setLongitud(longitudGps);

                const ciudadCercana = buscarCiudadCercana(latitudGps, longitudGps);
                if (ciudadCercana) {
                    setCiudad(ciudadCercana.nombre_completo);
                    setCiudadSeleccionada(ciudadCercana);
                }

                setMapaListo(true);
                return;
            }

            setDetectandoUbicacion(true);
            try {
                await obtenerUbicacion();
            } catch (error) {
                console.error('Error al obtener GPS:', error);
            } finally {
                setDetectandoUbicacion(false);
                setMapaListo(true);
            }
        };

        autoDetectar();
    }, [latitudGps, longitudGps, obtenerUbicacion]);

    // ---------------------------------------------------------------------------
    // Cargar datos guardados
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const cargarDatos = async () => {
            if (!negocioId) {
                setCargandoDatos(false);
                return;
            }

            try {
                const response = await api.get<{
                    success: boolean;
                    data: {
                        paso2Completo: boolean;
                        sucursal?: {
                            id: string;
                            ciudad: string | null;
                            direccion: string | null;
                            latitud: number | null;
                            longitud: number | null;
                        };
                    };
                }>(`/onboarding/${negocioId}/progreso`);

                if (response.data.success && response.data.data.sucursal) {
                    const { ciudad: c, direccion: d, latitud: lat, longitud: lng } = response.data.data.sucursal;

                    if (c) setCiudad(c);
                    if (d) setDireccion(d);
                    if (lat !== null && lng !== null) {
                        setLatitud(lat);
                        setLongitud(lng);
                        setMapaListo(true);
                    }
                }
            } catch (error) {
                console.error('Error al cargar datos:', error);
            } finally {
                setCargandoDatos(false);
            }
        };

        cargarDatos();
    }, [negocioId]);

    // ---------------------------------------------------------------------------
    // Autocomplete de ciudades
    // ---------------------------------------------------------------------------
    const handleCiudadChange = (valor: string) => {
        setCiudad(valor);
        setCiudadSeleccionada(null);

        if (valor.length >= 2) {
            const resultados = buscarCiudades(valor);
            setSugerenciasCiudades(resultados);
            setMostrarSugerencias(resultados.length > 0);
        } else {
            setSugerenciasCiudades([]);
            setMostrarSugerencias(false);
        }
    };

    const handleSeleccionarCiudad = (ciudad: CiudadConNombreCompleto) => {
        setCiudad(ciudad.nombre_completo);
        setCiudadSeleccionada(ciudad);
        setMostrarSugerencias(false);

        const coords = obtenerCoordenadasDeCiudad(ciudad);
        if (coords) {
            setLatitud(coords.lat);
            setLongitud(coords.lng);
            setMapaListo(true);
            setForzarCentrado(prev => prev + 1); // Forzar re-centrado
        }
    };

    const handleLimpiarCiudad = () => {
        setCiudad('');
        setCiudadSeleccionada(null);
        setSugerenciasCiudades([]);
        setMostrarSugerencias(false);
        inputCiudadRef.current?.focus();
    };

    // Cerrar sugerencias al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                sugerenciasRef.current &&
                !sugerenciasRef.current.contains(e.target as Node) &&
                inputCiudadRef.current &&
                !inputCiudadRef.current.contains(e.target as Node)
            ) {
                setMostrarSugerencias(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ---------------------------------------------------------------------------
    // Guardar datos
    // ---------------------------------------------------------------------------
    useEffect(() => {
        (window as any).guardarPaso2 = async (validar: boolean): Promise<boolean> => {
            if (validar && !esFormularioValido()) {
                notificar.error('Completa todos los campos requeridos');
                return false;
            }

            try {
                const zonaHoraria = detectarZonaHoraria(latitud, longitud);
                const datos: any = {
                    ciudad: ciudad.trim() || null,
                    direccion: direccion.trim() || null,
                    latitud: latitud || null,
                    longitud: longitud || null,
                    zonaHoraria: zonaHoraria || null,
                };

                if (validar) {
                    await guardarPaso2(datos as any);
                } else {
                    const { guardarBorradorPaso2 } = useOnboardingStore.getState();
                    await guardarBorradorPaso2(datos as any);
                }

                return true;
            } 
            catch (error) {
                console.error('Error al guardar paso 2:', error);
                return false;
            }
        };

        return () => {
            delete (window as any).guardarPaso2;
        };
    }, [ciudad, direccion, latitud, longitud]);

    // ---------------------------------------------------------------------------
    // Mover marcador
    // ---------------------------------------------------------------------------
    const handleMoverMarcador = useCallback((lat: number, lng: number) => {
        setLatitud(lat);
        setLongitud(lng);
    }, []);

    // ---------------------------------------------------------------------------
    // Detectar ubicación GPS
    // ---------------------------------------------------------------------------
    const handleDetectarUbicacion = async () => {
        setDetectandoUbicacion(true);
        try {
            await obtenerUbicacion();
            if (latitudGps && longitudGps) {
                setLatitud(latitudGps);
                setLongitud(longitudGps);

                const ciudadCercana = buscarCiudadCercana(latitudGps, longitudGps);
                if (ciudadCercana) {
                    setCiudad(ciudadCercana.nombre_completo);
                    setCiudadSeleccionada(ciudadCercana);
                }

                setForzarCentrado(prev => prev + 1); // Forzar re-centrado
            }
        } catch (error) {
            console.error('Error al detectar ubicación:', error);
            notificar.error('No se pudo detectar tu ubicación');
        } finally {
            setDetectandoUbicacion(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Render de carga
    // ---------------------------------------------------------------------------
    if (cargandoDatos) {
        return (
            <div className="flex items-center justify-center py-8 lg:py-10 2xl:py-12">
                <div className="text-center">
                    <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 animate-spin text-blue-600 mx-auto mb-2 lg:mb-3" />
                    <p className="text-xs lg:text-sm text-slate-600">Cargando...</p>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render principal
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-2.5 lg:space-y-3 2xl:space-y-4">
            {/* Dirección */}
            <div>
                <label className="block text-sm lg:text-sm 2xl:text-base font-semibold text-slate-900 mb-1.5 lg:mb-1.5 flex items-center gap-2 lg:gap-1.5">
                    <MapPin className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                    Dirección completa <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Calle Revolución #123, Col. Centro"
                    maxLength={250}
                    className="w-full px-4 lg:px-3.5 2xl:px-4 py-2.5 lg:py-2 2xl:py-2.5 border-2 border-slate-200 rounded-lg 2xl:rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm lg:text-sm 2xl:text-base transition-all"
                />
                <p className="text-[11px] lg:text-[10px] text-slate-500 mt-0.5">
                    {direccion.length}/250 caracteres
                </p>
            </div>

            {/* Ciudad - Autocomplete Moderno */}
            <div className="relative z-[9999]">
                <label className="block text-sm lg:text-sm 2xl:text-base font-semibold text-slate-900 mb-1.5 lg:mb-1.5 flex items-center gap-2 lg:gap-1.5">
                    <MapPin className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                    Ciudad <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                    <div className="absolute left-3 lg:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Search className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-slate-400" />
                    </div>
                    <input
                        ref={inputCiudadRef}
                        type="text"
                        value={ciudad}
                        onChange={(e) => handleCiudadChange(e.target.value)}
                        onFocus={() => {
                            if (sugerenciasCiudades.length > 0) {
                                setMostrarSugerencias(true);
                            }
                        }}
                        placeholder="Ej: Hermosillo, Sonora"
                        maxLength={120}
                        className="w-full pl-9 lg:pl-8 pr-9 lg:pr-8 py-2.5 lg:py-2 2xl:py-2.5 border-2 border-slate-200 rounded-lg 2xl:rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none text-sm lg:text-sm 2xl:text-base transition-all"
                    />
                    {ciudad && (
                        <button
                            onClick={handleLimpiarCiudad}
                            className="absolute right-3 lg:right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                        </button>
                    )}
                </div>

                {/* Sugerencias */}
                {mostrarSugerencias && (
                    <div
                        ref={sugerenciasRef}
                        className="absolute z-[9999] w-full mt-1 bg-white border-2 border-slate-200 rounded-lg 2xl:rounded-xl shadow-lg max-h-60 overflow-y-auto"
                    >
                        {sugerenciasCiudades.map((sug, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSeleccionarCiudad(sug)}
                                className="w-full px-4 py-2.5 lg:py-2 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0"
                            >
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-sm lg:text-sm text-slate-900 font-medium">
                                        {sug.nombre_completo}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                <p className="text-[11px] lg:text-[10px] text-slate-500 mt-0.5">
                    {ciudad.length}/120 caracteres
                </p>
            </div>

            {/* Mapa Interactivo */}
            <div className="relative z-0">
                <div className="flex items-center justify-between mb-1.5 lg:mb-2">
                    <label className="text-sm lg:text-sm 2xl:text-base font-semibold text-slate-900 flex items-center gap-2 lg:gap-1.5">
                        <Navigation className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                        Ubicación en el mapa <span className="text-red-500">*</span>
                    </label>
                    <button
                        onClick={handleDetectarUbicacion}
                        disabled={detectandoUbicacion}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {detectandoUbicacion ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Navigation className="w-5 h-5" />
                        )}
                        {detectandoUbicacion ? 'Detectando...' : 'Usar GPS'}
                    </button>
                </div>

                <div className="rounded-lg 2xl:rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm relative z-0">

                    {/* Botón Centrar Mapa - Flotante */}
                    {mapaListo && (
                        <button
                            type="button"
                            onClick={() => setForzarCentrado(prev => prev + 1)}
                            className="absolute top-3 right-3 z-[1000] bg-white hover:bg-blue-50 text-blue-600 p-2.5 lg:p-2 2xl:p-2.5 rounded-lg shadow-lg border-2 border-blue-300 hover:border-blue-500 transition-all"
                            title="Centrar mapa en la ubicación"
                        >
                            <MapPin className="w-[18px] h-[18px] lg:w-4 lg:h-4 2xl:w-[18px] 2xl:h-[18px]" />
                        </button>
                    )}

                    {mapaListo ? (
                        <MapContainer
                            center={[latitud, longitud]}
                            zoom={15}
                            style={{ height: '280px', width: '100%' }}
                            className="lg:!h-[500px] 2xl:!h-[560px] !z-0"
                        >
                            <TileLayer
                                attribution='&copy; OpenStreetMap'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MarcadorArrastrable
                                posicion={[latitud, longitud]}
                                onMover={handleMoverMarcador}
                            />
                            <DetectarClicMapa onClic={handleMoverMarcador} />
                            <CentrarMapa lat={latitud} lng={longitud} forzar={forzarCentrado} />
                        </MapContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[280px] lg:h-[500px] 2xl:h-[560px] bg-slate-50">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                    )}
                </div>

                <div className="mt-2 p-3 lg:p-2.5 bg-blue-50 border border-blue-100 rounded-lg 2xl:rounded-xl">
                    <div className="flex gap-2 lg:gap-2">
                        <Info className="w-4 h-4 lg:w-3.5 lg:h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs lg:text-[10px] 2xl:text-xs text-blue-700 leading-relaxed lg:leading-tight">
                            <span className="font-semibold">Arrastra el marcador o haz clic en el mapa</span> para ajustar la ubicación exacta de tu negocio.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PasoUbicacion;