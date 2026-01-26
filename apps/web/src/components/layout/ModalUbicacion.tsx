/**
 * ModalUbicacion.tsx
 * ===================
 * Modal para seleccionar la ubicación del usuario.
 *
 * Funcionalidades:
 * - Buscar ciudades por texto
 * - Detectar ubicación por GPS
 * - Mostrar ciudades populares
 * - Guardar selección en el store
 *
 * Ubicación: apps/web/src/components/layout/ModalUbicacion.tsx
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin, Navigation, Loader2, Check } from 'lucide-react';
import { useGpsStore } from '../../stores/useGpsStore';
import { Modal } from '../ui/Modal';
import { ModalBottom } from '../ui/ModalBottom';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import {
    buscarCiudades,
    getCiudadesPopulares,
    buscarCiudadCercana,
    type CiudadConNombreCompleto,
} from '../../data/ciudadesPopulares';

// =============================================================================
// TIPOS
// =============================================================================

interface ModalUbicacionProps {
    onClose: () => void;
}

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalUbicacion({ onClose }: ModalUbicacionProps) {
    // ---------------------------------------------------------------------------
    // Estado local
    // ---------------------------------------------------------------------------
    const [busqueda, setBusqueda] = useState('');
    const [ciudadesPopulares, setCiudadesPopulares] = useState<CiudadConNombreCompleto[]>([]);
    const [detectandoGPS, setDetectandoGPS] = useState(false);
    const [errorGPS, setErrorGPS] = useState<string | null>(null);

    // Resultados de búsqueda (calculado sincrónicamente)
    const resultados = useMemo(() => {
        if (busqueda.length >= 2) {
            return buscarCiudades(busqueda, 10);
        }
        return [];
    }, [busqueda]);

    // ---------------------------------------------------------------------------
    // Refs
    // ---------------------------------------------------------------------------
    const inputRef = useRef<HTMLInputElement>(null);

    // ---------------------------------------------------------------------------
    // Stores
    // ---------------------------------------------------------------------------
    const ciudad = useGpsStore((state) => state.ciudad);
    const setCiudad = useGpsStore((state) => state.setCiudad);
    const obtenerUbicacion = useGpsStore((state) => state.obtenerUbicacion);

    // ---------------------------------------------------------------------------
    // Efectos
    // ---------------------------------------------------------------------------

    // Cargar ciudades populares al montar
    useEffect(() => {
        const populares = getCiudadesPopulares(15);
        setCiudadesPopulares(populares);
    }, []);

    // Focus en el input al abrir
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------

    const handleSeleccionarCiudad = (ciudadSeleccionada: CiudadConNombreCompleto) => {
        setCiudad(
            ciudadSeleccionada.nombre,
            ciudadSeleccionada.estado,
            ciudadSeleccionada.coordenadas
        );
        onClose();
    };

    const handleDetectarGPS = async () => {
        setDetectandoGPS(true);
        setErrorGPS(null);

        try {
            const coordenadas = await obtenerUbicacion();

            if (coordenadas) {
                // Buscar ciudad más cercana
                const ciudadCercana = buscarCiudadCercana(
                    coordenadas.latitud,
                    coordenadas.longitud
                );

                if (ciudadCercana) {
                    setCiudad(
                        ciudadCercana.nombre,
                        ciudadCercana.estado
                        // NO pasar coordenadas - mantener las del GPS
                    );
                    onClose();
                } else {
                    console.warn('⚠️ [GPS] No se encontró ciudad cercana');
                    setErrorGPS('No se encontró una ciudad cercana a tu ubicación');
                }
            } else {
                console.error('❌ [GPS] obtenerUbicacion() retornó null/undefined');
                setErrorGPS('No se pudo obtener tu ubicación. Verifica que hayas dado permiso de ubicación.');
            }
        } catch (error) {
            console.error('❌ [GPS] Error capturado:', error);
            console.error('❌ [GPS] Tipo de error:', error instanceof Error ? error.message : error);

            if (error instanceof Error) {
                if (error.message.includes('denied')) {
                    setErrorGPS('Permiso de ubicación denegado. Por favor, activa el GPS en tu navegador.');
                } else if (error.message.includes('unavailable')) {
                    setErrorGPS('Ubicación no disponible. Verifica tu conexión GPS.');
                } else if (error.message.includes('timeout')) {
                    setErrorGPS('Tiempo de espera agotado. Intenta nuevamente.');
                } else {
                    setErrorGPS(`Error al detectar ubicación: ${error.message}`);
                }
            } else {
                setErrorGPS('Error desconocido al detectar ubicación');
            }
        } finally {
            setDetectandoGPS(false);
        }
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    // Hook para detectar dispositivo
    const { esMobile } = useBreakpoint();

    // Lista a mostrar: resultados de búsqueda o ciudades populares
    const ciudadesAMostrar = busqueda.length >= 2 ? resultados : ciudadesPopulares;
    const tituloLista = busqueda.length >= 2 ? 'Resultados' : 'Ciudades populares';

    // Contenido compartido entre ambos modales
    const contenido = (
        <>
            {/* Campo de búsqueda */}
            <div className="relative mb-4 lg:mb-3 2xl:mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-gray-400" />
                <input
                    ref={inputRef}
                    type="text"
                    id="input-buscar-ciudad"
                    name="input-buscar-ciudad"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar ciudad..."
                    className="w-full pl-10 lg:pl-9 2xl:pl-10 pr-4 py-3 lg:py-2.5 2xl:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base lg:text-sm 2xl:text-base"
                />
            </div>

            {/* GPS + Ubicación actual - Diseño moderno en línea */}
            <div className="flex items-center gap-2 mb-4 lg:mb-3 2xl:mb-4 flex-wrap">
                {/* Botón GPS - Pill moderno */}
                <button
                    onClick={handleDetectarGPS}
                    disabled={detectandoGPS}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors disabled:opacity-60 shadow-sm"
                >
                    {detectandoGPS ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Navigation className="w-4 h-4" />
                    )}
                    <span>{detectandoGPS ? 'Detectando...' : 'Usar GPS'}</span>
                </button>

                {/* Ubicación actual - Chip con check */}
                {ciudad && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-sm">
                        <Check className="w-4 h-4" />
                        <span className="font-medium truncate max-w-[180px]">{ciudad.nombreCompleto}</span>
                    </div>
                )}
            </div>

            {/* Error GPS */}
            {errorGPS && (
                <div className="mb-4 lg:mb-3 2xl:mb-4 p-3 lg:p-2.5 2xl:p-3 bg-red-50 text-red-600 text-sm lg:text-xs 2xl:text-sm rounded-lg">
                    {errorGPS}
                </div>
            )}

            {/* Lista de ciudades */}
            <div>
                <p className="text-xs lg:text-[11px] 2xl:text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 lg:mb-1.5 2xl:mb-2">
                    {tituloLista}
                </p>

                <div className="max-h-64 lg:max-h-48 2xl:max-h-64 overflow-y-auto">
                    {ciudadesAMostrar.length > 0 ? (
                        <ul className="space-y-1">
                            {ciudadesAMostrar.map((c) => (
                                <li key={`${c.nombre}-${c.estado}`}>
                                    <button
                                        onClick={() => handleSeleccionarCiudad(c)}
                                        className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 p-3 lg:p-2 2xl:p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                                    >
                                        <MapPin className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-gray-400 shrink-0" />
                                        <div>
                                            <p className="font-medium text-gray-900 text-base lg:text-sm 2xl:text-base">{c.nombre}</p>
                                            <p className="text-sm lg:text-xs 2xl:text-sm text-gray-500">{c.estado}</p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-4 lg:py-3 2xl:py-4 text-base lg:text-sm 2xl:text-base">
                            {busqueda.length >= 2
                                ? 'No se encontraron ciudades'
                                : 'Escribe para buscar'}
                        </p>
                    )}
                </div>
            </div>
        </>
    );

    // Título e ícono compartidos
    const titulo = 'Seleccionar ubicación';
    const iconoTitulo = <MapPin className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />;

    return (
        <>
            {/* MÓVIL: Bottom Sheet */}
            {esMobile ? (
                <ModalBottom
                    abierto={true}
                    onCerrar={onClose}
                    titulo={titulo}
                    iconoTitulo={iconoTitulo}
                    alturaMaxima="md"
                >
                    {contenido}
                </ModalBottom>
            ) : (
                /* ESCRITORIO: Modal Centrado */
                <Modal
                    abierto={true}
                    onCerrar={onClose}
                    titulo={titulo}
                    iconoTitulo={iconoTitulo}
                    ancho="md"
                >
                    {contenido}
                </Modal>
            )}
        </>
    );
}

export default ModalUbicacion;