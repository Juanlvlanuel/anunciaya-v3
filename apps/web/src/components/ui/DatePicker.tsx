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
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Icon, type IconProps } from '@/config/iconos';
import { ICONOS } from '../../config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Calendar = (p: IconoWrapperProps) => <Icon icon={ICONOS.fechas} {...p} />;

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
    /** En móvil (<1024px) abre el calendario centrado en pantalla en lugar de dropdown */
    centradoEnMovil?: boolean;
    /** Coloca el icono de calendario a la izquierda (estilo Correo/Ciudad) en vez de la derecha. */
    iconoIzquierda?: boolean;
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
    className = '',
    centradoEnMovil = false,
    iconoIzquierda = false,
}: DatePickerProps) {
    const [abierto, setAbierto] = useState(false);
    const [mesActual, setMesActual] = useState<number>(new Date().getMonth());
    const [añoActual, setAñoActual] = useState<number>(new Date().getFullYear());
    const contenedorRef = useRef<HTMLDivElement>(null);
    const calendarRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);
    // Vista interna: días (default), selección de mes, o selección de año.
    const [vista, setVista] = useState<'dias' | 'meses' | 'anios'>('dias');
    const [anioBloque, setAnioBloque] = useState<number>(new Date().getFullYear() - 5);

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

    // Al abrir, siempre empezar en la vista de días.
    useEffect(() => {
        if (abierto) setVista('dias');
    }, [abierto]);

    // Cerrar al hacer click fuera.
    // Usa composedPath() (robusto con el portal y con los botones que se re-renderizan al
    // cambiar de mes/año/vista — `contains(target)` fallaba ahí) y se registra un frame después
    // de abrir (grace period) para que el mismo click que abre el calendario no lo cierre.
    useEffect(() => {
        if (!abierto) return;

        const clicEsDentro = (e: Event): boolean => {
            const path = (typeof e.composedPath === 'function' ? e.composedPath() : []) as EventTarget[];
            const cont = contenedorRef.current;
            const cal = calendarRef.current;
            const target = e.target instanceof Node ? e.target : null;
            if (cont && (path.includes(cont) || (target && cont.contains(target)))) return true;
            if (cal && (path.includes(cal) || (target && cal.contains(target)))) return true;
            return false;
        };

        const handlePointerDown = (e: PointerEvent) => {
            if (!clicEsDentro(e)) setAbierto(false);
        };

        const raf = requestAnimationFrame(() => {
            document.addEventListener('pointerdown', handlePointerDown, true);
        });

        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('pointerdown', handlePointerDown, true);
        };
    }, [abierto]);

    // (Se retiró el auto-cierre por scroll: con capture:true se disparaba con el scroll residual
    // del trackpad al abrir y cerraba el calendario solo. El click-fuera ya cubre el cierre.)

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

    // Las flechas del header avanzan según la vista: mes / año / bloque de 12 años.
    const irAtras = () => {
        if (vista === 'dias') handleMesAnterior();
        else if (vista === 'meses') setAñoActual(añoActual - 1);
        else setAnioBloque(anioBloque - 12);
    };
    const irAdelante = () => {
        if (vista === 'dias') handleMesSiguiente();
        else if (vista === 'meses') setAñoActual(añoActual + 1);
        else setAnioBloque(anioBloque + 12);
    };
    // Click en el título sube de nivel: días → meses → años.
    const avanzarVista = () => {
        if (vista === 'dias') setVista('meses');
        else if (vista === 'meses') { setAnioBloque(añoActual - 5); setVista('anios'); }
    };
    const tituloHeader = vista === 'dias'
        ? `${MESES[mesActual]} ${añoActual}`
        : vista === 'meses'
            ? `${añoActual}`
            : `${anioBloque} – ${anioBloque + 11}`;

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
                className={`w-full h-11 lg:h-10 2xl:h-11 flex items-center ${iconoIzquierda ? 'gap-2' : 'justify-between'} px-3 border-2 rounded-lg text-base lg:text-sm 2xl:text-base font-medium transition-colors ${disabled
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
                        : error
                            ? 'border-red-300 hover:border-red-400 cursor-pointer'
                            : abierto
                                ? 'border-blue-600 ring-2 ring-blue-300 cursor-pointer'
                                : 'border-slate-300 hover:border-slate-400 cursor-pointer'
                    }`}
            >
                {iconoIzquierda && <Calendar className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500 shrink-0" />}
                <span className={`${iconoIzquierda ? 'flex-1 text-left' : ''} ${value ? 'text-slate-700' : 'text-slate-400'}`}>
                    {value ? formatearParaMostrar(value) : placeholder}
                </span>
                {!iconoIzquierda && <Calendar className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Calendario desplegable / modal centrado */}
            {abierto && createPortal(
                <>
                    {/* Backdrop: solo en modo modal centrado en móvil */}
                    {centradoEnMovil && window.innerWidth < 1024 && (
                        <div
                            className="fixed inset-0 bg-black/50"
                            style={{ zIndex: 9998 }}
                            onMouseDown={() => setAbierto(false)}
                        />
                    )}
                <div
                    ref={calendarRef}
                    className="fixed bg-white rounded-2xl p-3 shadow-[0_12px_48px_-8px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 border border-slate-100"
                    onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                    onTouchEnd={(e) => {
                        if (touchStartX.current === null) return;
                        const diff = touchStartX.current - e.changedTouches[0].clientX;
                        touchStartX.current = null;
                        if (Math.abs(diff) < 50) return;
                        if (diff > 0) handleMesSiguiente(); else handleMesAnterior();
                    }}
                    style={{
                        zIndex: 9999,
                        ...(() => {
                            const isMobile = window.innerWidth < 1024;

                            // Modo modal centrado en móvil
                            if (centradoEnMovil && isMobile) {
                                return {
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '336px',
                                };
                            }

                            if (!contenedorRef.current) return { top: 0, left: 0 };
                            const rect = contenedorRef.current.getBoundingClientRect();

                            // Dimensiones del calendario
                            // El calendario toma el ancho del input (acotado para que los días
                            // no queden ni apretados ni demasiado grandes).
                            const anchoCalendario = Math.min(Math.max(rect.width, 264), isMobile ? 320 : 360);
                            const alturaEstimada = 280;

                            // Detectar espacio disponible en todas direcciones
                            const espacioAbajo = window.innerHeight - rect.bottom;
                            const espacioArriba = rect.top;
                            const espacioDerecha = window.innerWidth - rect.left;

                            // Decidir si abre arriba o abajo
                            const abreArriba = espacioAbajo < alturaEstimada && espacioArriba > espacioAbajo;

                            // Decidir posición horizontal (solo móvil)
                            let leftPosition = rect.left;
                            if (isMobile) {
                                // Si no cabe a la derecha, alinear el borde DERECHO del calendario con el borde DERECHO del input
                                if (espacioDerecha < anchoCalendario) {
                                    leftPosition = rect.right - anchoCalendario;
                                }
                                // Asegurar que no se salga por la izquierda del viewport
                                if (leftPosition < 8) {
                                    leftPosition = 8;
                                }
                                // Asegurar que no se salga por la derecha del viewport
                                if (leftPosition + anchoCalendario > window.innerWidth - 8) {
                                    leftPosition = window.innerWidth - anchoCalendario - 8;
                                }
                            }

                            return {
                                top: abreArriba ? undefined : rect.bottom + 6,
                                bottom: abreArriba ? (window.innerHeight - rect.top + 6) : undefined,
                                left: leftPosition,
                                width: `${anchoCalendario}px`,
                            };
                        })()
                    }}
                >
                    {/* Header - Navegación mes/año */}
                    <div className="flex items-center justify-between mb-2">
                        <button
                            type="button"
                            onClick={irAtras}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                            <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={2.5} />
                        </button>
                        <button
                            type="button"
                            onClick={avanzarVista}
                            className="px-3 py-1 rounded-lg text-lg font-bold text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            {tituloHeader}
                        </button>
                        <button
                            type="button"
                            onClick={irAdelante}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                            <ChevronRight className="w-[18px] h-[18px]" strokeWidth={2.5} />
                        </button>
                    </div>

                    {vista === 'dias' && (<>
                    {/* Días de la semana */}
                    <div className="grid grid-cols-7 mb-1">
                        {DIAS_SEMANA.map((dia) => (
                            <div key={dia} className="text-center text-xs font-semibold text-slate-400 py-1.5">
                                {dia}
                            </div>
                        ))}
                    </div>

                    {/* Días del mes */}
                    <div className="grid grid-cols-7 gap-0.5">
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
                                    className={`aspect-square flex items-center justify-center rounded-lg text-base transition-all ${
                                        deshabilitado
                                            ? 'text-slate-300 cursor-not-allowed'
                                            : seleccionado
                                                ? 'bg-slate-800 text-white font-semibold shadow-sm shadow-slate-900/30 cursor-pointer'
                                                : hoy
                                                    ? 'text-slate-900 font-bold ring-1 ring-inset ring-slate-300 hover:bg-slate-100 cursor-pointer'
                                                    : 'text-slate-700 font-medium hover:bg-slate-100 cursor-pointer'
                                    }`}
                                >
                                    {dia}
                                </button>
                            );
                        })}
                    </div>
                    </>)}

                    {/* Vista: selección de mes */}
                    {vista === 'meses' && (
                        <div className="grid grid-cols-3 gap-1.5 py-1">
                            {MESES.map((nombreMes, idx) => (
                                <button
                                    key={nombreMes}
                                    type="button"
                                    onClick={() => { setMesActual(idx); setVista('dias'); }}
                                    className={`py-2 rounded-lg text-base transition-all cursor-pointer ${
                                        idx === mesActual
                                            ? 'bg-slate-800 text-white font-semibold shadow-sm shadow-slate-900/30'
                                            : 'text-slate-700 font-medium hover:bg-slate-100'
                                    }`}
                                >
                                    {nombreMes.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Vista: selección de año */}
                    {vista === 'anios' && (
                        <div className="grid grid-cols-3 gap-1.5 py-1">
                            {Array.from({ length: 12 }, (_, i) => anioBloque + i).map((anio) => (
                                <button
                                    key={anio}
                                    type="button"
                                    onClick={() => { setAñoActual(anio); setVista('meses'); }}
                                    className={`py-2 rounded-lg text-base transition-all cursor-pointer ${
                                        anio === añoActual
                                            ? 'bg-slate-800 text-white font-semibold shadow-sm shadow-slate-900/30'
                                            : 'text-slate-700 font-medium hover:bg-slate-100'
                                    }`}
                                >
                                    {anio}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Footer - Botones rápidos (solo en la vista de días) */}
                    {vista === 'dias' && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleLimpiar}
                            className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                            Limpiar
                        </button>
                        <button
                            type="button"
                            onClick={handleHoy}
                            className="flex-1 py-1.5 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                            Hoy
                        </button>
                    </div>
                    )}
                </div>
                </>,
                document.body
            )}
        </div>
    );
}

export default DatePicker;