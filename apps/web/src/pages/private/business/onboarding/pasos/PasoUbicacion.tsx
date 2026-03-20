/**
 * PasoUbicacion.tsx - SIMPLIFICADO
 * ==================================
 * Paso 2 del Onboarding - Ubicación del Negocio
 * 
 * MODO ÚNICO: PRESENCIAL
 * - Ciudad (autocomplete moderno)
 * - Estado (dropdown con búsqueda)
 * - Dirección completa
 * - Mapa interactivo compacto
 * 
 * ACTUALIZADO: Febrero 2026 - Layout Ciudad+Estado+GPS en una fila
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import {
    MapPin, Navigation, Loader2, Search
} from 'lucide-react';
import L from 'leaflet';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useGpsStore } from '@/stores/useGpsStore';
import { api } from '@/services/api';
import { notificar } from '@/utils/notificaciones';
import { buscarCiudades, buscarCiudadCercana, type CiudadConNombreCompleto } from '@/data/ciudadesPopulares';
import { ModalUbicacion } from '@/components/layout/ModalUbicacion';
import { detectarZonaHoraria } from '@/utils/zonaHoraria';

import 'leaflet/dist/leaflet.css';



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
// CACHÉ — persiste entre montar/desmontar
// =============================================================================

const cache2 = {
    cargado: false,
    ciudad: '',
    estado: '',
    direccion: '',
    latitud: 31.3122,
    longitud: -113.5465,
    mapaListo: false,
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoUbicacion() {
    const { negocioId, guardarPaso2, setSiguienteDeshabilitado } = useOnboardingStore();
    const { latitud: latitudGps, longitud: longitudGps, obtenerUbicacion } = useGpsStore();

    // Estados principales — inicializar desde caché
    const [ciudad, setCiudad] = useState(cache2.ciudad);
    const [estado, setEstado] = useState(cache2.estado);
    const [direccion, setDireccion] = useState(cache2.direccion);
    const [latitud, setLatitud] = useState<number>(cache2.latitud);
    const [longitud, setLongitud] = useState<number>(cache2.longitud);

    // Estados de carga
    const [cargandoDatos, setCargandoDatos] = useState(!cache2.cargado);
    const [detectandoUbicacion, setDetectandoUbicacion] = useState(false);
    const [mapaListo, setMapaListo] = useState(cache2.mapaListo);
    const [forzarCentrado, setForzarCentrado] = useState(0);

    // Estados de autocomplete CIUDAD
    const [busquedaCiudad, setBusquedaCiudad] = useState('');
    const [sugerenciasCiudades, setSugerenciasCiudades] = useState<CiudadConNombreCompleto[]>([]);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
    const [, setCiudadSeleccionada] = useState<CiudadConNombreCompleto | null>(null);
    const [inputCiudadActivo, setInputCiudadActivo] = useState(false);
    const [modalCiudadAbierto, setModalCiudadAbierto] = useState(false);

    // (Estado se auto-rellena desde ciudad/GPS — no necesita autocomplete)

    // Refs para click outside
    const contenedorGeneralRef = useRef<HTMLDivElement>(null);
    const inputCiudadRef = useRef<HTMLInputElement>(null);
    const sugerenciasRef = useRef<HTMLDivElement>(null);

    // ---------------------------------------------------------------------------
    // Validación
    // ---------------------------------------------------------------------------
    const esFormularioValido = () => {
        return (
            ciudad.trim().length >= 2 &&
            ciudad.trim().length <= 120 &&
            estado.trim().length >= 2 &&
            estado.trim().length <= 100 &&
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
    }, [ciudad, estado, direccion, latitud, longitud]);

    // Sincronizar caché
    useEffect(() => {
        cache2.ciudad = ciudad;
        cache2.estado = estado;
        cache2.direccion = direccion;
        cache2.latitud = latitud;
        cache2.longitud = longitud;
        cache2.mapaListo = mapaListo;
    }, [ciudad, estado, direccion, latitud, longitud, mapaListo]);

    // ---------------------------------------------------------------------------
    // Auto-detectar ubicación al cargar
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (cache2.cargado) return;
        const autoDetectar = async () => {
            if (latitudGps && longitudGps) {
                setLatitud(latitudGps);
                setLongitud(longitudGps);

                const ciudadCercana = buscarCiudadCercana(latitudGps, longitudGps);
                if (ciudadCercana) {
                    setCiudad(ciudadCercana.nombre);
                    setEstado(ciudadCercana.estado);
                    setCiudadSeleccionada(ciudadCercana);
                    setBusquedaCiudad('');
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
        if (cache2.cargado) { setCargandoDatos(false); return; }
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
                            estado: string | null;
                            direccion: string | null;
                            latitud: number | null;
                            longitud: number | null;
                        };
                    };
                }>(`/onboarding/${negocioId}/progreso`);

                if (response.data.success && response.data.data.sucursal) {
                    const { ciudad: c, estado: e, direccion: d, latitud: lat, longitud: lng } = response.data.data.sucursal;

                    if (c && c !== 'Por configurar') setCiudad(c);
                    if (e && e !== 'Por configurar') setEstado(e);
                    if (d && d !== 'Por configurar') setDireccion(d);
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
                cache2.cargado = true;
            }
        };

        cargarDatos();
    }, [negocioId]);


    const handleSeleccionarCiudadModal = (ciudadSel: CiudadConNombreCompleto) => {
        handleSeleccionarCiudad(ciudadSel);
        setModalCiudadAbierto(false);
    };

    const handleSeleccionarCiudad = (ciudadSel: CiudadConNombreCompleto) => {
        setCiudad(ciudadSel.nombre);
        setEstado(ciudadSel.estado);
        setCiudadSeleccionada(ciudadSel);
        setMostrarSugerencias(false);
        setBusquedaCiudad(''); // Limpiar búsqueda

        const coords = obtenerCoordenadasDeCiudad(ciudadSel);
        if (coords) {
            setLatitud(coords.lat);
            setLongitud(coords.lng);
            setMapaListo(true);
            setForzarCentrado(prev => prev + 1);
        }
    };


    // ---------------------------------------------------------------------------
    // Cerrar dropdowns al hacer clic fuera
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;

            // Cerrar dropdown de ciudad
            if (
                sugerenciasRef.current &&
                !sugerenciasRef.current.contains(target) &&
                inputCiudadRef.current &&
                !inputCiudadRef.current.contains(target)
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
        const guardarFn = async (validar: boolean): Promise<boolean> => {
            if (validar && !esFormularioValido()) {
                notificar.error('Completa todos los campos requeridos');
                return false;
            }

            try {
                const zonaHoraria = detectarZonaHoraria(latitud, longitud);
                const datos = {
                    ciudad: ciudad.trim() || undefined,
                    estado: estado.trim() || undefined,
                    direccion: direccion.trim() || undefined,
                    latitud: latitud || undefined,
                    longitud: longitud || undefined,
                    zonaHoraria: zonaHoraria || undefined,
                };

                if (validar) {
                    await guardarPaso2(datos as Parameters<typeof guardarPaso2>[0]);
                } else {
                    const { guardarBorradorPaso2 } = useOnboardingStore.getState();
                    await guardarBorradorPaso2(datos);
                }

                return true;
            }
            catch (error) {
                console.error('Error al guardar paso 2:', error);
                return false;
            }
        };

        (window as unknown as Record<string, unknown>).guardarPaso2 = guardarFn;

        return () => {
            delete (window as unknown as Record<string, unknown>).guardarPaso2;
        };
    }, [ciudad, estado, direccion, latitud, longitud]);

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

            // Obtener coordenadas actualizadas del store (no del render)
            const storeState = useGpsStore.getState();
            const lat = storeState.latitud;
            const lng = storeState.longitud;

            if (lat && lng) {
                setLatitud(lat);
                setLongitud(lng);

                const ciudadCercana = buscarCiudadCercana(lat, lng);

                if (ciudadCercana) {
                    setCiudad(ciudadCercana.nombre);
                    setEstado(ciudadCercana.estado);
                    setCiudadSeleccionada(ciudadCercana);
                    setBusquedaCiudad('');
                    setInputCiudadActivo(false); // Cerrar modo edición ciudad
 // Cerrar dropdown
                    setMostrarSugerencias(false); // Cerrar dropdown de ciudad también
                }

                setForzarCentrado(prev => prev + 1);
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
                    <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 animate-spin text-slate-600 mx-auto mb-2 lg:mb-3" />
                    <p className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-600">Cargando...</p>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render principal
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-4 lg:space-y-3.5 2xl:space-y-5" ref={contenedorGeneralRef}>

            {/* ================================================================= */}
            {/* CARD: Dirección */}
            {/* ================================================================= */}
            <div className="bg-white border-2 border-slate-300 rounded-xl"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="px-3 lg:px-4 py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                        <MapPin className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                    </div>
                    <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Dirección</span>
                </div>
                <div className="p-4 lg:p-3 2xl:p-4 space-y-4 lg:space-y-3 2xl:space-y-4">

                    {/* Calle y Colonia */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700">
                                Calle y Colonia <span className="text-red-500">*</span>
                            </label>
                            <span className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-500">
                                {direccion.length}/250
                            </span>
                        </div>
                        <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-4 lg:px-3 2xl:px-4 border-2 border-slate-300"
                            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                            <input
                                type="text"
                                value={direccion}
                                onChange={(e) => setDireccion(e.target.value)}
                                placeholder="Ej: Calle Revolución #123, Col. Centro"
                                maxLength={250}
                                className="flex-1 bg-transparent outline-none text-sm lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                            />
                        </div>
                    </div>

                    {/* Ciudad + Estado */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-2.5 2xl:gap-3">

                        {/* Ciudad */}
                        <div className="relative z-20">
                            <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 block">
                                Ciudad <span className="text-red-500">*</span>
                            </label>

                            {/* MÓVIL: botón que abre modal */}
                            <button type="button" onClick={() => setModalCiudadAbierto(true)}
                                className="lg:hidden flex items-center w-full h-11 bg-slate-100 rounded-lg px-4 border-2 border-slate-300 hover:border-slate-400 cursor-pointer"
                                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                <span className={`flex-1 text-left text-base font-medium ${ciudad ? 'text-slate-800' : 'text-slate-500'}`}>
                                    {ciudad || 'Buscar ciudad...'}
                                </span>
                                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                            </button>

                            {/* DESKTOP: input con autocomplete */}
                            <div className="hidden lg:block relative">
                                <div className="flex items-center h-10 2xl:h-11 bg-slate-100 rounded-lg px-2.5 2xl:px-3 border-2 border-slate-300"
                                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                    <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
                                    <input
                                        ref={inputCiudadRef}
                                        type="text"
                                        autoComplete="new-password"
                                        value={inputCiudadActivo ? busquedaCiudad : ciudad}
                                        onChange={(e) => {
                                            const valor = e.target.value;
                                            setBusquedaCiudad(valor);
                                            if (valor === '') { setCiudad(''); setCiudadSeleccionada(null); }
                                            if (valor.length >= 2) {
                                                const resultados = buscarCiudades(valor);
                                                setSugerenciasCiudades(resultados);
                                                setMostrarSugerencias(resultados.length > 0);
                                            } else {
                                                setSugerenciasCiudades([]);
                                                setMostrarSugerencias(false);
                                            }
                                        }}
                                        onFocus={() => {
                                            setInputCiudadActivo(true);
                                            setBusquedaCiudad(ciudad);
                                            if (ciudad.length >= 2) {
                                                const resultados = buscarCiudades(ciudad);
                                                setSugerenciasCiudades(resultados);
                                                setMostrarSugerencias(resultados.length > 0);
                                            }
                                        }}
                                        onBlur={() => setTimeout(() => setInputCiudadActivo(false), 200)}
                                        placeholder="Buscar ciudad..."
                                        maxLength={120}
                                        className="flex-1 bg-transparent outline-none text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                                    />
                                </div>

                                {/* Sugerencias */}
                                {mostrarSugerencias && (
                                    <div ref={sugerenciasRef}
                                        className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border-2 border-slate-300 shadow-lg overflow-hidden">
                                        <div className="max-h-[250px] overflow-y-auto py-1">
                                            {sugerenciasCiudades.map((sug, idx) => (
                                                <button key={idx} type="button"
                                                    onClick={() => handleSeleccionarCiudad(sug)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer text-slate-600 font-medium hover:bg-slate-200 transition-colors">
                                                    <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                                                    <span className="flex-1 text-sm 2xl:text-base font-semibold text-slate-800 truncate">
                                                        {sug.nombre}, <span className="font-medium text-slate-600">{sug.estado}</span>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Estado (solo lectura — se auto-rellena) */}
                        <div>
                            <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 block">
                                Estado
                            </label>
                            <div className="flex items-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg px-3 lg:px-2.5 2xl:px-3 border-2 border-slate-300"
                                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                <span className={`flex-1 text-sm lg:text-sm 2xl:text-base font-medium ${estado ? 'text-slate-800' : 'text-slate-500'}`}>
                                    {estado || 'Se auto-completa'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* CARD: Ubicación en el Mapa */}
            {/* ================================================================= */}
            <div className="bg-white border-2 border-slate-300 rounded-xl relative z-0"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="px-3 lg:px-4 py-2 flex items-center justify-between rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="flex items-center gap-2 lg:gap-2.5">
                        <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                            <Navigation className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Ubicación en el Mapa</span>
                    </div>
                    <button type="button" onClick={handleDetectarUbicacion} disabled={detectandoUbicacion}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 border-2 border-white/30 text-white hover:bg-white/25 transition-all cursor-pointer text-sm font-semibold whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                        {detectandoUbicacion ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4 shrink-0" />}
                        Mi Ubicación
                    </button>
                </div>
                <div className="p-4 lg:p-3 2xl:p-4 space-y-3 lg:space-y-2.5 2xl:space-y-3">

                    {/* Tip */}
                    <p className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-500">
                        <span className="font-bold text-slate-700">Tip:</span> Arrastra el marcador o toca el mapa para ajustar la ubicación
                    </p>

                    {/* Mapa */}
                    <div className="rounded-lg overflow-hidden border-2 border-slate-300 relative z-0">
                        {mapaListo && (
                            <button type="button"
                                onClick={() => setForzarCentrado(prev => prev + 1)}
                                className="absolute top-3 right-3 z-1000 bg-white hover:bg-slate-100 text-slate-700 p-2 rounded-lg shadow-lg border-2 border-slate-300 hover:border-slate-400 transition-all cursor-pointer"
                                title="Centrar mapa">
                                <MapPin className="w-4 h-4" />
                            </button>
                        )}

                        {mapaListo ? (
                            <MapContainer
                                center={[latitud, longitud]}
                                zoom={15}
                                style={{ height: '250px', width: '100%' }}
                                className="lg:h-[280px]! 2xl:h-80! z-0!"
                            >
                                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <MarcadorArrastrable posicion={[latitud, longitud]} onMover={handleMoverMarcador} />
                                <DetectarClicMapa onClic={handleMoverMarcador} />
                                <CentrarMapa lat={latitud} lng={longitud} forzar={forzarCentrado} />
                            </MapContainer>
                        ) : (
                            <div className="flex items-center justify-center h-[250px] lg:h-[280px] 2xl:h-80 bg-slate-50">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
                            </div>
                        )}
                    </div>

                </div>
            </div>
            {/* Modal de ciudad (móvil) */}
            {modalCiudadAbierto && (
                <ModalUbicacion
                    onClose={() => setModalCiudadAbierto(false)}
                    onSeleccionar={handleSeleccionarCiudadModal}
                />
            )}
        </div>
    );
}

export default PasoUbicacion;