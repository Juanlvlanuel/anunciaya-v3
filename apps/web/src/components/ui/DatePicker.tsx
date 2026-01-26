/**
 * ============================================================================
 * COMPONENTE: DatePicker Universal
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/components/ui/DatePicker.tsx
 * 
 * PROPÓSITO:
 * Selector de fechas que se escala proporcionalmente al tamaño del input
 * Diseño fluido y universal - funciona en inputs de cualquier tamaño
 * 
 * FEATURES:
 * - Escala automática basada en el ancho del input
 * - Tamaños relativos (no valores fijos)
 * - Legible en inputs pequeños y grandes
 * - Mantiene proporciones correctas
 * - Position fixed para escapar de overflow
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface DatePickerProps {
    value: string; // Formato: YYYY-MM-DD
    onChange: (date: string) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: boolean;
    minDate?: string; // YYYY-MM-DD
    maxDate?: string; // YYYY-MM-DD
    className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const getDiasEnMes = (año: number, mes: number): number => {
    return new Date(año, mes + 1, 0).getDate();
};

const getPrimerDiaSemana = (año: number, mes: number): number => {
    return new Date(año, mes, 1).getDay();
};

const formatearFecha = (año: number, mes: number, dia: number): string => {
    const mesStr = String(mes + 1).padStart(2, '0');
    const diaStr = String(dia).padStart(2, '0');
    return `${año}-${mesStr}-${diaStr}`;
};

const parsearFecha = (fecha: string): { año: number; mes: number; dia: number } | null => {
    if (!fecha) return null;
    const [año, mes, dia] = fecha.split('-').map(Number);
    return { año, mes: mes - 1, dia };
};

const formatearParaMostrar = (fecha: string): string => {
    if (!fecha) return '';
    const parsed = parsearFecha(fecha);
    if (!parsed) return '';
    return `${String(parsed.dia).padStart(2, '0')}/${String(parsed.mes + 1).padStart(2, '0')}/${parsed.año}`;
};

// =============================================================================
// COMPONENTE
// =============================================================================

export function DatePicker({
    value,
    onChange,
    placeholder = 'Seleccionar fecha',
    disabled = false,
    error = false,
    minDate,
    maxDate,
    className = ''
}: DatePickerProps) {
    const [abierto, setAbierto] = useState(false);
    const [mesActual, setMesActual] = useState<number>(new Date().getMonth());
    const [añoActual, setAñoActual] = useState<number>(new Date().getFullYear());
    const contenedorRef = useRef<HTMLDivElement>(null);

    // Sincronizar con valor seleccionado
    useEffect(() => {
        if (value) {
            const parsed = parsearFecha(value);
            if (parsed) {
                setMesActual(parsed.mes);
                setAñoActual(parsed.año);
            }
        }
    }, [value]);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handleClickFuera = (e: MouseEvent) => {
            if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
                setAbierto(false);
            }
        };

        if (abierto) {
            document.addEventListener('mousedown', handleClickFuera);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickFuera);
        };
    }, [abierto]);

    // Cerrar al hacer scroll
    useEffect(() => {
        const handleScroll = () => {
            if (abierto) {
                setAbierto(false);
            }
        };

        if (abierto) {
            window.addEventListener('scroll', handleScroll, true);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [abierto]);

    const handleMesAnterior = () => {
        if (mesActual === 0) {
            setMesActual(11);
            setAñoActual(añoActual - 1);
        } else {
            setMesActual(mesActual - 1);
        }
    };

    const handleMesSiguiente = () => {
        if (mesActual === 11) {
            setMesActual(0);
            setAñoActual(añoActual + 1);
        } else {
            setMesActual(mesActual + 1);
        }
    };

    const handleSeleccionarDia = (dia: number) => {
        const fechaSeleccionada = formatearFecha(añoActual, mesActual, dia);
        
        if (minDate && fechaSeleccionada < minDate) return;
        if (maxDate && fechaSeleccionada > maxDate) return;

        onChange(fechaSeleccionada);
        setAbierto(false);
    };

    const handleHoy = () => {
        const hoy = new Date();
        const fechaHoy = formatearFecha(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        
        if (minDate && fechaHoy < minDate) return;
        if (maxDate && fechaHoy > maxDate) return;

        onChange(fechaHoy);
        setMesActual(hoy.getMonth());
        setAñoActual(hoy.getFullYear());
        setAbierto(false);
    };

    const handleLimpiar = () => {
        onChange('');
        setAbierto(false);
    };

    // Generar días del mes
    const diasEnMes = getDiasEnMes(añoActual, mesActual);
    const primerDia = getPrimerDiaSemana(añoActual, mesActual);
    const diasArray: (number | null)[] = [];

    for (let i = 0; i < primerDia; i++) {
        diasArray.push(null);
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
        diasArray.push(dia);
    }

    // Verificar estados de días
    const isDiaDeshabilitado = (dia: number): boolean => {
        const fecha = formatearFecha(añoActual, mesActual, dia);
        if (minDate && fecha < minDate) return true;
        if (maxDate && fecha > maxDate) return true;
        return false;
    };

    const isDiaSeleccionado = (dia: number): boolean => {
        if (!value) return false;
        const parsed = parsearFecha(value);
        if (!parsed) return false;
        return parsed.año === añoActual && parsed.mes === mesActual && parsed.dia === dia;
    };

    const isHoy = (dia: number): boolean => {
        const hoy = new Date();
        return hoy.getFullYear() === añoActual && hoy.getMonth() === mesActual && hoy.getDate() === dia;
    };

    return (
        <div ref={contenedorRef} className={`relative ${className}`}>
            {/* Input */}
            <button
                type="button"
                onClick={() => !disabled && setAbierto(!abierto)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-3 py-2 lg:py-1.5 2xl:py-2 border-2 rounded-lg text-sm lg:text-xs 2xl:text-sm font-medium transition-colors ${
                    disabled
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                        : error
                        ? 'border-red-300 hover:border-red-400'
                        : abierto
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-slate-300 hover:border-slate-400'
                }`}
            >
                <span className={value ? 'text-slate-700' : 'text-slate-400'}>
                    {value ? formatearParaMostrar(value) : placeholder}
                </span>
                <Calendar className="w-4 h-4 text-slate-400" />
            </button>

            {/* Calendario desplegable - Escalado proporcional */}
            {abierto && (
                <div 
                    className="fixed bg-white rounded-lg shadow-2xl border-2 border-slate-200"
                    style={{
                        zIndex: 9999,
                        top: contenedorRef.current 
                            ? contenedorRef.current.getBoundingClientRect().bottom + 4 
                            : 0,
                        left: contenedorRef.current 
                            ? contenedorRef.current.getBoundingClientRect().left 
                            : 0,
                        width: contenedorRef.current 
                            ? contenedorRef.current.getBoundingClientRect().width 
                            : 'auto',
                        // Padding proporcional al ancho (2-3%)
                        padding: contenedorRef.current 
                            ? `${Math.max(8, contenedorRef.current.getBoundingClientRect().width * 0.025)}px`
                            : '8px'
                    }}
                >
                    {/* Header - Navegación mes/año */}
                    <div 
                        className="flex items-center justify-between"
                        style={{
                            marginBottom: contenedorRef.current 
                                ? `${Math.max(6, contenedorRef.current.getBoundingClientRect().width * 0.02)}px`
                                : '6px'
                        }}
                    >
                        <button
                            type="button"
                            onClick={handleMesAnterior}
                            className="hover:bg-slate-200 rounded transition-colors"
                            style={{
                                padding: contenedorRef.current 
                                    ? `${Math.max(2, contenedorRef.current.getBoundingClientRect().width * 0.01)}px`
                                    : '2px'
                            }}
                        >
                            <ChevronLeft 
                                style={{
                                    width: contenedorRef.current 
                                        ? `${Math.max(12, contenedorRef.current.getBoundingClientRect().width * 0.08)}px`
                                        : '12px',
                                    height: contenedorRef.current 
                                        ? `${Math.max(12, contenedorRef.current.getBoundingClientRect().width * 0.08)}px`
                                        : '12px'
                                }}
                                className="text-slate-600" 
                            />
                        </button>
                        <div 
                            className="font-bold text-slate-800"
                            style={{
                                fontSize: contenedorRef.current 
                                    ? `${Math.max(10, contenedorRef.current.getBoundingClientRect().width * 0.065)}px`
                                    : '10px'
                            }}
                        >
                            {MESES[mesActual]} {añoActual}
                        </div>
                        <button
                            type="button"
                            onClick={handleMesSiguiente}
                            className="hover:bg-slate-200 rounded transition-colors"
                            style={{
                                padding: contenedorRef.current 
                                    ? `${Math.max(2, contenedorRef.current.getBoundingClientRect().width * 0.01)}px`
                                    : '2px'
                            }}
                        >
                            <ChevronRight 
                                style={{
                                    width: contenedorRef.current 
                                        ? `${Math.max(12, contenedorRef.current.getBoundingClientRect().width * 0.08)}px`
                                        : '12px',
                                    height: contenedorRef.current 
                                        ? `${Math.max(12, contenedorRef.current.getBoundingClientRect().width * 0.08)}px`
                                        : '12px'
                                }}
                                className="text-slate-600" 
                            />
                        </button>
                    </div>

                    {/* Días de la semana */}
                    <div 
                        className="grid grid-cols-7"
                        style={{
                            gap: contenedorRef.current 
                                ? `${Math.max(1, contenedorRef.current.getBoundingClientRect().width * 0.005)}px`
                                : '1px',
                            marginBottom: contenedorRef.current 
                                ? `${Math.max(4, contenedorRef.current.getBoundingClientRect().width * 0.015)}px`
                                : '4px'
                        }}
                    >
                        {DIAS_SEMANA.map((dia) => (
                            <div 
                                key={dia} 
                                className="text-center font-bold text-slate-500"
                                style={{
                                    fontSize: contenedorRef.current 
                                        ? `${Math.max(8, contenedorRef.current.getBoundingClientRect().width * 0.055)}px`
                                        : '8px',
                                    padding: contenedorRef.current 
                                        ? `${Math.max(2, contenedorRef.current.getBoundingClientRect().width * 0.008)}px`
                                        : '2px'
                                }}
                            >
                                {dia}
                            </div>
                        ))}
                    </div>

                    {/* Días del mes */}
                    <div 
                        className="grid grid-cols-7"
                        style={{
                            gap: contenedorRef.current 
                                ? `${Math.max(1, contenedorRef.current.getBoundingClientRect().width * 0.005)}px`
                                : '1px'
                        }}
                    >
                        {diasArray.map((dia, index) => {
                            if (dia === null) {
                                return <div key={`empty-${index}`} />;
                            }

                            const deshabilitado = isDiaDeshabilitado(dia);
                            const seleccionado = isDiaSeleccionado(dia);
                            const hoy = isHoy(dia);

                            return (
                                <button
                                    key={dia}
                                    type="button"
                                    onClick={() => !deshabilitado && handleSeleccionarDia(dia)}
                                    disabled={deshabilitado}
                                    className={`
                                        aspect-square flex items-center justify-center rounded-lg font-medium transition-all
                                        ${deshabilitado
                                            ? 'text-slate-300 cursor-not-allowed'
                                            : seleccionado
                                            ? 'bg-blue-500 text-white font-bold shadow-md'
                                            : hoy
                                            ? 'bg-blue-50 text-blue-600 font-bold ring-2 ring-blue-500'
                                            : 'text-slate-700 hover:bg-slate-200'
                                        }
                                    `}
                                    style={{
                                        fontSize: contenedorRef.current 
                                            ? `${Math.max(10, contenedorRef.current.getBoundingClientRect().width * 0.065)}px`
                                            : '10px'
                                    }}
                                >
                                    {dia}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer - Botones rápidos */}
                    <div 
                        className="flex border-t border-slate-200"
                        style={{
                            gap: contenedorRef.current 
                                ? `${Math.max(4, contenedorRef.current.getBoundingClientRect().width * 0.01)}px`
                                : '4px',
                            marginTop: contenedorRef.current 
                                ? `${Math.max(6, contenedorRef.current.getBoundingClientRect().width * 0.02)}px`
                                : '6px',
                            paddingTop: contenedorRef.current 
                                ? `${Math.max(6, contenedorRef.current.getBoundingClientRect().width * 0.02)}px`
                                : '6px'
                        }}
                    >
                        <button
                            type="button"
                            onClick={handleLimpiar}
                            className="flex-1 font-semibold text-slate-600 hover:bg-slate-200 rounded transition-colors"
                            style={{
                                fontSize: contenedorRef.current 
                                    ? `${Math.max(9, contenedorRef.current.getBoundingClientRect().width * 0.055)}px`
                                    : '9px',
                                padding: contenedorRef.current 
                                    ? `${Math.max(4, contenedorRef.current.getBoundingClientRect().width * 0.015)}px`
                                    : '4px'
                            }}
                        >
                            Limpiar
                        </button>
                        <button
                            type="button"
                            onClick={handleHoy}
                            className="flex-1 font-semibold text-blue-600 bg-blue-50 hover:bg-blue-200 rounded transition-colors"
                            style={{
                                fontSize: contenedorRef.current 
                                    ? `${Math.max(9, contenedorRef.current.getBoundingClientRect().width * 0.055)}px`
                                    : '9px',
                                padding: contenedorRef.current 
                                    ? `${Math.max(4, contenedorRef.current.getBoundingClientRect().width * 0.015)}px`
                                    : '4px'
                            }}
                        >
                            Hoy
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DatePicker;