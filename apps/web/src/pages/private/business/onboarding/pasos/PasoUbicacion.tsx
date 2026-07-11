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
import { createPortal } from 'react-dom';
import { Mapa, Marker, type MapRef, type MarkerDragEvent, type MapLayerMouseEvent } from '@/components/mapa/Mapa';
import { PinMapa } from '@/components/mapa/MarcadorPopup';
import {
    Loader2, Search, Maximize2, X, Crosshair, Plus, Minus
} from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const MapPin = (p: IconoWrapperProps) => <Icon icon={ICONOS.ubicacion} {...p} />;
const Navigation = (p: IconoWrapperProps) => <Icon icon={ICONOS.distancia} {...p} />;
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useGpsStore } from '@/stores/useGpsStore';
import { api } from '@/services/api';
import { notificar } from '@/utils/notificaciones';
import { buscarCiudades, buscarCiudadCercana, type CiudadConNombreCompleto } from '@/data/ciudadesPopulares';
import { ModalUbicacion } from '@/components/layout/ModalUbicacion';
import { ModalBottom } from '@/components/ui/ModalBottom';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useBackNativo } from '@/hooks/useBackNativo';
import { detectarZonaHoraria } from '@/utils/zonaHoraria';
import { CargandoPaso } from '../componentes';

// =============================================================================
// COMPONENTES AUXILIARES DEL MAPA
// =============================================================================

interface MarcadorArrastrableProps {
    lat: number;
    lng: number;
    onMover: (lat: number, lng: number) => void;
}

function MarcadorArrastrable({ lat, lng, onMover }: MarcadorArrastrableProps) {
    return (
        <Marker
            longitude={lng}
            latitude={lat}
            draggable
            anchor="bottom"
            onDragEnd={(e: MarkerDragEvent) => onMover(e.lngLat.lat, e.lngLat.lng)}
        >
            <PinMapa color="azul" />
        </Marker>
    );
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
    const [mapaFullscreen, setMapaFullscreen] = useState(false);
    const { esMobile } = useBreakpoint();

    // El mapa fullscreen de escritorio es overlay propio sin base; el back debe
    // cerrarlo. En móvil usa ModalBottom (ya cierra con back), por eso !esMobile.
    useBackNativo({ abierto: mapaFullscreen && !esMobile, onCerrar: () => setMapaFullscreen(false), discriminador: '_mapaOnboarding' });

    // (Estado se auto-rellena desde ciudad/GPS — no necesita autocomplete)

    // Refs para click outside
    const contenedorGeneralRef = useRef<HTMLDivElement>(null);
    const inputCiudadRef = useRef<HTMLInputElement>(null);
    const sugerenciasRef = useRef<HTMLDivElement>(null);

    // Refs de los mapas (compacto + fullscreen) para centrado imperativo.
    const mapCompactoRef = useRef<MapRef | null>(null);
    const mapFullscreenRef = useRef<MapRef | null>(null);

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

    const handleClicMapa = useCallback((e: MapLayerMouseEvent) => {
        handleMoverMarcador(e.lngLat.lat, e.lngLat.lng);
    }, [handleMoverMarcador]);

    // Centrar ambos mapas cuando se presiona "centrar" o se detecta GPS/ciudad
    // (forzarCentrado se incrementa en esos casos). Reemplaza al antiguo
    // sub-componente CentrarMapa que usaba useMap(). Depende SOLO de
    // forzarCentrado para no recentrar en cada arrastre del marcador.
    useEffect(() => {
        if (forzarCentrado === 0) return;
        mapCompactoRef.current?.flyTo({ center: [longitud, latitud], zoom: 15 });
        mapFullscreenRef.current?.flyTo({ center: [longitud, latitud], zoom: 15 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forzarCentrado]);

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
            <CargandoPaso />
        );
    }

    // Contenido del mapa a pantalla completa (reutilizado por el ModalBottom
    // móvil y el modal centrado de desktop): controles de zoom dark + mapa.
    const contenidoMapaFullscreen = (
        <>
            <div className="absolute bottom-6 right-3 z-1000 bg-slate-900 rounded-xl shadow-lg border border-slate-700 flex flex-row overflow-hidden">
                <button type="button" onClick={() => setForzarCentrado(prev => prev + 1)} className="w-11 h-11 flex items-center justify-center cursor-pointer active:bg-slate-700" title="Centrar mapa">
                    <Crosshair className="w-5 h-5 text-white" />
                </button>
                <div className="w-px h-auto bg-slate-700 my-1.5" />
                <button type="button" onClick={() => mapFullscreenRef.current?.zoomIn()} className="w-11 h-11 flex items-center justify-center cursor-pointer active:bg-slate-700" title="Acercar">
                    <Plus className="w-5 h-5 text-white" />
                </button>
                <div className="w-px h-auto bg-slate-700 my-1.5" />
                <button type="button" onClick={() => mapFullscreenRef.current?.zoomOut()} className="w-11 h-11 flex items-center justify-center cursor-pointer active:bg-slate-700" title="Alejar">
                    <Minus className="w-5 h-5 text-white" />
                </button>
            </div>
            <Mapa
                ref={mapFullscreenRef}
                initialViewState={{ longitude: longitud, latitude: latitud, zoom: 16 }}
                onClick={handleClicMapa}
                style={{ height: '100%', width: '100%' }}
            >
                <MarcadorArrastrable lat={latitud} lng={longitud} onMover={handleMoverMarcador} />
            </Mapa>
        </>
    );

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
                            <>
                                {/* Botón expandir — dark, esquina superior derecha */}
                                <button type="button"
                                    onClick={() => setMapaFullscreen(true)}
                                    className="absolute top-3 right-3 z-[1000] w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-700 border border-slate-700 shadow-lg flex items-center justify-center cursor-pointer transition-colors"
                                    title="Ver mapa completo"
                                    data-testid="btn-expandir-mapa-onboarding">
                                    <Maximize2 className="w-4 h-4 text-white" />
                                </button>
                                {/* Controles de zoom (centrar / + / −) — dark, abajo derecha */}
                                <div className="absolute bottom-3 right-3 z-[1000] bg-slate-900 rounded-xl shadow-lg border border-slate-700 flex flex-row overflow-hidden">
                                    <button type="button" onClick={() => setForzarCentrado(prev => prev + 1)} className="w-10 h-10 flex items-center justify-center cursor-pointer active:bg-slate-700" title="Centrar mapa">
                                        <Crosshair className="w-4.5 h-4.5 text-white" />
                                    </button>
                                    <div className="w-px h-auto bg-slate-700 my-1.5" />
                                    <button type="button" onClick={() => mapCompactoRef.current?.zoomIn()} className="w-10 h-10 flex items-center justify-center cursor-pointer active:bg-slate-700" title="Acercar">
                                        <Plus className="w-4.5 h-4.5 text-white" />
                                    </button>
                                    <div className="w-px h-auto bg-slate-700 my-1.5" />
                                    <button type="button" onClick={() => mapCompactoRef.current?.zoomOut()} className="w-10 h-10 flex items-center justify-center cursor-pointer active:bg-slate-700" title="Alejar">
                                        <Minus className="w-4.5 h-4.5 text-white" />
                                    </button>
                                </div>
                            </>
                        )}

                        {mapaListo ? (
                            <div className="h-[250px] lg:h-[280px] 2xl:h-80 w-full">
                                <Mapa
                                    ref={mapCompactoRef}
                                    initialViewState={{ longitude: longitud, latitude: latitud, zoom: 15 }}
                                    onClick={handleClicMapa}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <MarcadorArrastrable lat={latitud} lng={longitud} onMover={handleMoverMarcador} />
                                </Mapa>
                            </div>
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

            {/* ============================================================ */}
            {/* POPUP FULLSCREEN DEL MAPA — portal a body para estar encima de todo */}
            {/* ============================================================ */}
            {mapaFullscreen && (
                esMobile ? (
                    /* MÓVIL: ModalBottom (bottom sheet) */
                    <ModalBottom
                        abierto={mapaFullscreen}
                        onCerrar={() => setMapaFullscreen(false)}
                        mostrarHeader={false}
                        headerOscuro
                        sinScrollInterno
                        alturaMaxima="xl"
                        className="h-[90vh]!"
                        zIndice="z-[9999]"
                    >
                        {/* Header */}
                        <div
                            className="shrink-0 px-4 pt-8 pb-3 flex items-center gap-3"
                            style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                        >
                            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                <MapPin className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-white">Ajustar ubicación</h3>
                                <p className="text-xs text-white/70 font-medium truncate">
                                    Arrastra el marcador o toca el mapa para ajustar la ubicación
                                </p>
                            </div>
                        </div>
                        {/* Mapa */}
                        <div className="flex-1 min-h-0 relative">
                            {contenidoMapaFullscreen}
                        </div>
                    </ModalBottom>
                ) : createPortal(
                    /* DESKTOP: modal centrado */
                    <div
                        className="fixed inset-0 z-[99999] bg-slate-900/80 flex items-center justify-center p-8"
                        onClick={() => setMapaFullscreen(false)}
                        data-testid="mapa-fullscreen-overlay-onboarding"
                    >
                        <div
                            className="relative w-full h-full max-w-6xl max-h-[95vh] rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header del popup */}
                            <div
                                className="shrink-0 px-4 py-3 flex items-center gap-3"
                                style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}
                            >
                                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                    <MapPin className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-white">Ajustar ubicación</h3>
                                    <p className="text-xs text-white/70 font-medium truncate">
                                        Arrastra el marcador o toca el mapa para ajustar la ubicación
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMapaFullscreen(false)}
                                    className="shrink-0 w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
                                    title="Cerrar"
                                    data-testid="btn-cerrar-mapa-fullscreen-onboarding"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>
                            {/* Mapa a pantalla completa */}
                            <div className="flex-1 min-h-0 relative">
                                {contenidoMapaFullscreen}
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            )}
        </div>
    );
}

export default PasoUbicacion;