/**
 * ModalUbicacion.tsx (v3.0 - Header gradiente + tokens corregidos)
 * =================================================================
 * Modal para seleccionar la ubicación del usuario.
 *
 * Funcionalidades:
 * - Buscar ciudades por texto
 * - Detectar ubicación por GPS
 * - Mostrar ciudades populares
 * - Guardar selección en el store
 *
 * PATRÓN: TC-6A (Modal de Detalle) con header gradiente
 *
 * Ubicación: apps/web/src/components/layout/ModalUbicacion.tsx
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin, Navigation, Loader2, Check, X } from 'lucide-react';
import { useGpsStore } from '../../stores/useGpsStore';
import { ModalAdaptativo } from '../ui/ModalAdaptativo';
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
    /** Callback externo: si se pasa, el modal NO guarda en gpsStore — delega al padre */
    onSeleccionar?: (ciudad: CiudadConNombreCompleto) => void;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const GRADIENTE = {
    bg: 'linear-gradient(135deg, #1e40af, #2563eb)',
    shadow: 'rgba(37,99,235,0.4)',
    handle: '#1e40af',
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function ModalUbicacion({ onClose, onSeleccionar }: ModalUbicacionProps) {
    // ---------------------------------------------------------------------------
    // Estado local
    // ---------------------------------------------------------------------------
    const [busqueda, setBusqueda] = useState('');
    const [ciudadesPopulares, setCiudadesPopulares] = useState<CiudadConNombreCompleto[]>([]);
    const [detectandoGPS, setDetectandoGPS] = useState(false);
    const [errorGPS, setErrorGPS] = useState<string | null>(null);

    const resultados = useMemo(() => {
        if (busqueda.length >= 2) {
            return buscarCiudades(busqueda, 10);
        }
        return [];
    }, [busqueda]);

    // ---------------------------------------------------------------------------
    // Refs y Stores
    // ---------------------------------------------------------------------------
    const inputRef = useRef<HTMLInputElement>(null);
    const ciudad = useGpsStore((state) => state.ciudad);
    const setCiudad = useGpsStore((state) => state.setCiudad);
    const obtenerUbicacion = useGpsStore((state) => state.obtenerUbicacion);

    // ---------------------------------------------------------------------------
    // Efectos
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const populares = getCiudadesPopulares(15);
        setCiudadesPopulares(populares);
    }, []);

    useEffect(() => {
        if (window.innerWidth >= 1024) {
            inputRef.current?.focus();
        }
    }, []);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const handleSeleccionarCiudad = (ciudadSeleccionada: CiudadConNombreCompleto) => {
        if (onSeleccionar) {
            onSeleccionar(ciudadSeleccionada);
        } else {
            setCiudad(
                ciudadSeleccionada.nombre,
                ciudadSeleccionada.estado,
                ciudadSeleccionada.coordenadas
            );
        }
        onClose();
    };

    const handleDetectarGPS = async () => {
        setDetectandoGPS(true);
        setErrorGPS(null);

        try {
            const coordenadas = await obtenerUbicacion();

            if (coordenadas) {
                const ciudadCercana = buscarCiudadCercana(
                    coordenadas.latitud,
                    coordenadas.longitud
                );

                if (ciudadCercana) {
                    if (onSeleccionar) {
                        onSeleccionar(ciudadCercana);
                    } else {
                        setCiudad(
                            ciudadCercana.nombre,
                            ciudadCercana.estado
                        );
                    }
                    onClose();
                } else {
                    setErrorGPS('No se encontró una ciudad cercana a tu ubicación');
                }
            } else {
                setErrorGPS('No se pudo obtener tu ubicación. Verifica que hayas dado permiso de ubicación.');
            }
        } catch (error) {
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
    const ciudadesAMostrar = busqueda.length >= 2 ? resultados : ciudadesPopulares;
    const tituloLista = busqueda.length >= 2 ? 'Resultados' : 'Ciudades Populares';

    return (
        <ModalAdaptativo
            abierto
            onCerrar={onClose}
            ancho="sm"
            mostrarHeader={false}
            paddingContenido="none"
            sinScrollInterno
            alturaMaxima="lg"
            colorHandle={GRADIENTE.handle}
            headerOscuro
        >
            <div className="flex flex-col max-h-[80vh] lg:max-h-[75vh]">

                {/* ── Header dark gradiente ── */}
                <div
                    className="relative overflow-hidden px-4 lg:px-3 2xl:px-4 pt-8 pb-4 lg:py-3 2xl:py-4 shrink-0 lg:rounded-t-2xl"
                    style={{ background: GRADIENTE.bg, boxShadow: `0 4px 16px ${GRADIENTE.shadow}` }}
                >
                    <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/5" />
                    <div className="absolute -bottom-4 -left-4 w-14 h-14 rounded-full bg-white/5" />

                    <div className="relative flex items-center gap-3 lg:gap-2.5 2xl:gap-3">
                        <div className="w-11 h-11 lg:w-9 lg:h-9 2xl:w-11 2xl:h-11 rounded-full border-2 border-white/30 bg-white/15 flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 -space-y-0.5 lg:-space-y-1 2xl:-space-y-0.5">
                            <h3 className="text-xl lg:text-lg 2xl:text-xl font-bold text-white">Seleccionar ubicación</h3>
                            <span className="text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium">Elige tu ciudad para ver negocios cercanos</span>
                        </div>
                    </div>
                </div>

                {/* ── Contenido ── */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-3 2xl:p-4">

                    {/* Campo de búsqueda */}
                    <div className="relative mb-4 lg:mb-3 2xl:mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-600" />
                        <input
                            ref={inputRef}
                            type="text"
                            id="input-buscar-ciudad"
                            name="input-buscar-ciudad"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar ciudad..."
                            className="w-full pl-10 lg:pl-9 2xl:pl-10 pr-4 py-3 lg:py-2.5 2xl:py-3 border-2 border-slate-300 bg-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 text-base lg:text-sm 2xl:text-base font-medium text-slate-800 placeholder:text-slate-500"
                            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                        />
                        {busqueda && (
                            <button
                                onClick={() => setBusqueda('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-300 hover:bg-slate-400 flex items-center justify-center lg:cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5 text-white" />
                            </button>
                        )}
                    </div>

                    {/* GPS + Ubicación actual */}
                    <div className="flex items-center gap-2 mb-4 lg:mb-3 2xl:mb-4">
                        <button
                            onClick={handleDetectarGPS}
                            disabled={detectandoGPS}
                            className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-full text-sm font-bold border-2 border-slate-700 shadow-lg shadow-slate-700/30 disabled:opacity-60 lg:cursor-pointer active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, #334155, #1e293b)' }}
                        >
                            {detectandoGPS ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Navigation className="w-4 h-4" />
                            )}
                            <span>{detectandoGPS ? 'Detectando...' : 'Usar GPS'}</span>
                        </button>

                        {ciudad && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 border-2 border-emerald-300 text-emerald-700 rounded-full text-sm font-semibold">
                                <Check className="w-4 h-4" />
                                <span className="truncate max-w-[140px]">{ciudad.nombreCompleto}</span>
                            </div>
                        )}
                    </div>

                    {/* Error GPS */}
                    {errorGPS && (
                        <div className="mb-4 lg:mb-3 2xl:mb-4 p-3 lg:p-2.5 2xl:p-3 bg-red-100 border-2 border-red-300 text-red-700 text-sm lg:text-[11px] 2xl:text-sm font-medium rounded-lg">
                            {errorGPS}
                        </div>
                    )}

                    {/* Lista de ciudades */}
                    <div>
                        <div className="flex items-center gap-2 mb-3 lg:mb-2 2xl:mb-3 pb-2 lg:pb-1.5 2xl:pb-2 border-b-2 border-slate-300">
                            <MapPin className="w-4 h-4 text-slate-600 shrink-0" />
                            <span className="text-base lg:text-sm 2xl:text-base font-bold text-slate-800">
                                {tituloLista}
                            </span>
                        </div>

                        <div className="lg:max-h-48 2xl:max-h-64 overflow-y-auto">
                            {ciudadesAMostrar.length > 0 ? (
                                <ul className="space-y-1">
                                    {ciudadesAMostrar.map((c) => (
                                        <li key={`${c.nombre}-${c.estado}`}>
                                            <button
                                                onClick={() => handleSeleccionarCiudad(c)}
                                                className="w-full flex items-center gap-3 lg:gap-2 2xl:gap-3 p-3 lg:p-2 2xl:p-3 hover:bg-slate-200 rounded-lg text-left lg:cursor-pointer"
                                            >
                                                <div className="w-2 h-2 lg:w-1.5 lg:h-1.5 2xl:w-2 2xl:h-2 rounded-full bg-slate-400 shrink-0" />
                                                <div>
                                                    <p className="font-semibold text-slate-800 text-base lg:text-sm 2xl:text-base">{c.nombre}</p>
                                                    <p className="text-sm lg:text-[11px] 2xl:text-sm text-slate-600 font-medium">{c.estado}</p>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-center text-slate-600 font-medium py-4 lg:py-3 2xl:py-4 text-base lg:text-sm 2xl:text-base">
                                    {busqueda.length >= 2
                                        ? 'No se encontraron ciudades'
                                        : 'Escribe para buscar'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </ModalAdaptativo>
    );
}

export default ModalUbicacion;
