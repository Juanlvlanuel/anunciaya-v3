/**
 * ============================================================================
 * TAB: Horarios
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/pages/private/business-studio/perfil/components/TabHorarios.tsx
 * 
 * PROPÓSITO:
 * Tab para editar horarios de atención (reutiliza lógica de PasoHorarios del onboarding)
 * 
 * CARACTERÍSTICAS:
 * - Selector de 7 días con indicadores de estado
 * - Toggle Abierto/Cerrado por día
 * - Horarios de apertura y cierre
 * - Horario de comida/break opcional
 * - Time pickers RESPONSIVOS (móvil: ruedas iOS, desktop: inputs numéricos)
 * - Botones "Duplicar Horario" y "24/7" en header
 * - Componente grande que aprovecha todo el ancho
 */

import { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { Clock, Coffee, Copy, Check, X } from 'lucide-react';
import type { DatosHorarios, HorarioDia } from '../hooks/usePerfil';
import { notificar } from '@/utils/notificaciones';

interface TabHorariosProps {
    datosHorarios: DatosHorarios;
    setDatosHorarios: (datos: DatosHorarios) => void;
}

export default function TabHorarios({ datosHorarios, setDatosHorarios }: TabHorariosProps) {
    const [diaSeleccionado, setDiaSeleccionado] = useState(0);
    const horarios = datosHorarios.horarios;
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const visualADiaSemana = (indiceVisual: number): number => (indiceVisual + 1) % 7;
    const formatearHora = (hora: string | null): string => hora ? hora.substring(0, 5) : '09:00';

    const validarHorarioDia = (horario: HorarioDia): string | null => {
        if (!horario.abierto) return null;

        if (!horario.horaApertura || !horario.horaCierre) {
            return 'Falta hora de apertura o cierre';
        }

        const apertura = horario.horaApertura.substring(0, 5);
        const cierre = horario.horaCierre.substring(0, 5);

        if (cierre <= apertura) {
            return 'La hora de cierre debe ser mayor que la de apertura';
        }

        if (horario.tieneHorarioComida && horario.comidaInicio && horario.comidaFin) {
            const comidaInicio = horario.comidaInicio.substring(0, 5);
            const comidaFin = horario.comidaFin.substring(0, 5);

            if (comidaFin <= comidaInicio) {
                return 'El fin de comida debe ser mayor que el inicio';
            }

            if (comidaInicio < apertura || comidaFin > cierre) {
                return 'El horario de comida debe estar dentro del horario de operación';
            }
        }

        return null;
    };

    const actualizarHorarioDia = (indiceVisual: number, cambios: Partial<HorarioDia>) => {
        const diaBD = visualADiaSemana(indiceVisual);
        const nuevosHorarios = [...horarios];
        const indiceEnArray = nuevosHorarios.findIndex(h => h.diaSemana === diaBD);
        if (indiceEnArray !== -1) {
            nuevosHorarios[indiceEnArray] = { ...nuevosHorarios[indiceEnArray], ...cambios };
            setDatosHorarios({ horarios: nuevosHorarios });
        }
    };

    const duplicarHorario = () => {
        const diaBD = visualADiaSemana(diaSeleccionado);
        const horarioActual = horarios.find(h => h.diaSemana === diaBD);
        if (!horarioActual) return;
        const nuevosHorarios = horarios.map(h => ({
            ...h,
            abierto: horarioActual.abierto,
            horaApertura: horarioActual.horaApertura,
            horaCierre: horarioActual.horaCierre,
            tieneHorarioComida: horarioActual.tieneHorarioComida,
            comidaInicio: horarioActual.comidaInicio,
            comidaFin: horarioActual.comidaFin
        }));
        setDatosHorarios({ horarios: nuevosHorarios });

        notificar.exito('Horario duplicado a toda la semana');
    };

    const establecer24_7 = () => {
        const nuevosHorarios = horarios.map(h => ({
            ...h,
            abierto: true,
            horaApertura: '00:00:00',
            horaCierre: '23:59:00',
            tieneHorarioComida: false
        }));
        setDatosHorarios({ horarios: nuevosHorarios });
    };

    const diaBD = visualADiaSemana(diaSeleccionado);
    const horarioDia = horarios.find(h => h.diaSemana === diaBD) || {
        diaSemana: diaBD,
        abierto: true,
        horaApertura: '09:00:00',
        horaCierre: '21:00:00',
        tieneHorarioComida: false,
        comidaInicio: '14:00:00',
        comidaFin: '16:00:00'
    };

    const errorValidacion = validarHorarioDia(horarioDia);


    return (
        <div className="space-y-5 lg:space-y-3 2xl:space-y-5">

            {/* HEADER: DÍAS + BOTONES */}
            <div className="space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-3">

                {/* Selector de días */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
                    {diasSemana.map((nombreDia, indiceVisual) => {
                        const diaBD_iter = visualADiaSemana(indiceVisual);
                        const horarioDelDia = horarios.find(h => h.diaSemana === diaBD_iter);
                        const estaAbierto = horarioDelDia?.abierto ?? true;
                        const esSeleccionado = indiceVisual === diaSeleccionado;

                        return (
                            <button
                                key={indiceVisual}
                                type="button"
                                onClick={() => setDiaSeleccionado(indiceVisual)}
                                className={`
                                    relative shrink-0 min-w-[60px] px-3 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer
                                    ${esSeleccionado ? 'bg-blue-600 text-white shadow-md' : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-300'}
                                `}
                            >
                                {!esSeleccionado && (
                                    <div className="absolute -top-1 -right-1 flex items-center justify-center">
                                        {estaAbierto ? (
                                            <Check className="w-3.5 h-3.5 text-green-600 bg-white rounded-full border border-green-600" strokeWidth={3} />
                                        ) : (
                                            <X className="w-3.5 h-3.5 text-slate-400 bg-white rounded-full border border-slate-300" strokeWidth={3} />
                                        )}
                                    </div>
                                )}
                                {nombreDia}
                            </button>
                        );
                    })}
                </div>

                {/* Botones rápidos */}
                <div className="flex gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={duplicarHorario}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-all shadow-sm cursor-pointer"
                    >
                        <Copy className="w-4 h-4" />
                        <span>Duplicar</span>
                    </button>
                    <button
                        type="button"
                        onClick={establecer24_7}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm cursor-pointer"
                    >
                        <Clock className="w-4 h-4" />
                        <span>24/7</span>
                    </button>
                </div>
            </div>

            {/* FORMULARIO DEL DÍA SELECCIONADO - SIN CARD CONTENEDOR */}
            <div className="space-y-4 lg:space-y-3 2xl:space-y-4">

                {/* SECCIÓN 1: Estado del día - SIEMPRE VISIBLE */}
                <div className="bg-blue-50 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-blue-600" />
                            <span className="text-base lg:text-sm 2xl:text-base font-bold text-slate-700">Estado del día</span>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                id="checkbox-dia-abierto"
                                name="checkbox-dia-abierto"
                                type="checkbox"
                                checked={horarioDia.abierto}
                                onChange={(e) => actualizarHorarioDia(diaSeleccionado, { abierto: e.target.checked })}
                                className="sr-only"
                            />
                            <div className="relative w-14 h-7">
                                <div className="absolute inset-0 bg-slate-400 group-has-checked:bg-green-500 rounded-full transition-all"></div>
                                <div className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all group-has-checked:translate-x-7"></div>
                            </div>
                            <span className={`text-base lg:text-sm 2xl:text-base font-bold ${horarioDia.abierto ? 'text-green-600' : 'text-slate-600'}`}>
                                {horarioDia.abierto ? 'Abierto' : 'Cerrado'}
                            </span>
                        </label>
                    </div>
                </div>

                {/* CONTENIDO SEGÚN ESTADO */}
                {horarioDia.abierto ? (
                    <>
                        {/* SECCIÓN 2: Horario de Atención */}
                        <div className="bg-blue-50 rounded-xl p-5">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <span className="block text-base lg:text-sm 2xl:text-base font-bold text-slate-700 mb-2.5">
                                        Hora de Apertura
                                    </span>
                                    <TimePicker
                                        hora={formatearHora(horarioDia.horaApertura)}
                                        onChange={(nuevaHora) => actualizarHorarioDia(diaSeleccionado, { horaApertura: nuevaHora + ':00' })}
                                    />
                                </div>
                                <div>
                                    <span className="block text-base lg:text-sm 2xl:text-base font-bold text-slate-700 mb-2.5">
                                        Hora de Cierre
                                    </span>
                                    <TimePicker
                                        hora={formatearHora(horarioDia.horaCierre)}
                                        onChange={(nuevaHora) => actualizarHorarioDia(diaSeleccionado, { horaCierre: nuevaHora + ':00' })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 3: Horario de comida (checkbox + expandible) */}
                        <div className="space-y-3">
                            {/* Checkbox */}
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    id="checkbox-horario-comida"
                                    name="checkbox-horario-comida"
                                    type="checkbox"
                                    checked={horarioDia.tieneHorarioComida}
                                    onChange={(e) => actualizarHorarioDia(diaSeleccionado, { tieneHorarioComida: e.target.checked })}
                                    className="w-5 h-5 text-amber-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-amber-200 transition-all"
                                />
                                <Coffee className="w-5 h-5 text-amber-600" />
                                <span className="text-base lg:text-sm 2xl:text-base font-bold text-slate-700">
                                    ¿Tienes horario de comida/break?
                                </span>
                            </label>

                            {/* Horarios expandibles */}
                            {horarioDia.tieneHorarioComida && (
                                <div className="bg-blue-50 rounded-xl p-5">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <span className="block text-base lg:text-sm 2xl:text-base font-bold text-slate-700 mb-2.5">
                                                Hora de Salida
                                            </span>
                                            <TimePicker
                                                hora={formatearHora(horarioDia.comidaInicio)}
                                                onChange={(nuevaHora) => actualizarHorarioDia(diaSeleccionado, { comidaInicio: nuevaHora + ':00' })}
                                            />
                                        </div>
                                        <div>
                                            <span className="block text-base lg:text-sm 2xl:text-base font-bold text-slate-700 mb-2.5">
                                                Hora de Regreso
                                            </span>
                                            <TimePicker
                                                hora={formatearHora(horarioDia.comidaFin)}
                                                onChange={(nuevaHora) => actualizarHorarioDia(diaSeleccionado, { comidaFin: nuevaHora + ':00' })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {errorValidacion && horarioDia.abierto && (
                            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-white text-xs font-bold">!</span>
                                </div>
                                <div>
                                    <p className="text-red-700 font-semibold text-sm">Horario inválido</p>
                                    <p className="text-red-600 text-sm">{errorValidacion}</p>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="py-16 text-center bg-blue-50 rounded-xl">
                        <X className="w-14 h-14 text-slate-400 mx-auto mb-4" strokeWidth={1.5} />
                        <p className="text-base text-slate-600 font-semibold">Este día permanecerá cerrado</p>
                    </div>
                )}

            </div>
        </div>
    );
}

// =============================================================================
// TIME PICKER (RESPONSIVO)
// =============================================================================

interface TimePickerProps {
    hora: string;
    onChange: (hora: string) => void;
}

function TimePicker({ hora, onChange }: TimePickerProps) {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [dropdownAbierto, setDropdownAbierto] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);
    const [posicion, setPosicion] = useState({ top: 0, left: 0, width: 0 });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Actualizar posición cuando se abre el dropdown
    useEffect(() => {
        if (dropdownAbierto && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosicion({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
            });
        }
    }, [dropdownAbierto]);

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setDropdownAbierto(false);
            }
        };

        if (dropdownAbierto) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownAbierto]);

    const parsearHora = (horaStr: string) => {
        const [hh, mm] = horaStr.split(':').map(Number);
        const periodo = hh >= 12 ? 'PM' : 'AM';
        const hora12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
        return { hora: hora12, minutos: mm, periodo };
    };

    const formatearHora = (hora: number, minutos: number, periodo: string): string => {
        let hh = periodo === 'PM' && hora !== 12 ? hora + 12 : hora;
        if (periodo === 'AM' && hora === 12) hh = 0;
        return `${hh.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
    };

    const { hora: h, minutos: m, periodo: p } = parsearHora(hora);

    const handleChange = (newHora: number, newMinutos: number, newPeriodo: string) => {
        onChange(formatearHora(newHora, newMinutos, newPeriodo));
    };

    if (isMobile) {
        return (
            <WheelTimePicker
                hora={h}
                minutos={m}
                periodo={p}
                onHoraChange={(newH) => handleChange(newH, m, p)}
                onMinutosChange={(newM) => handleChange(h, newM, p)}
                onPeriodoChange={(newP) => handleChange(h, m, newP)}
            />
        );
    } else {
        return (
            <div className="flex items-center gap-1.5">
                <NumberInput value={h} min={1} max={12} onChange={(newH) => handleChange(newH, m, p)} />
                <span className="text-lg font-bold text-slate-400">:</span>
                <NumberInput value={m} min={0} max={55} step={5} onChange={(newM) => handleChange(h, newM, p)} />

                {/* Dropdown Custom AM/PM */}
                <div className="relative">
                    <div
                        ref={buttonRef}
                        onClick={() => setDropdownAbierto(!dropdownAbierto)}
                        className="w-20 lg:w-16 2xl:w-20 flex items-center justify-center h-12 lg:h-10 2xl:h-12 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition-all"
                        style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                    >
                        <span className="text-base lg:text-sm 2xl:text-base font-medium text-slate-800">{p}</span>
                        <svg className="w-4 h-4 ml-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>

                    {/* Dropdown Options - Usando Portal */}
                    {dropdownAbierto && createPortal(
                        <div
                            ref={dropdownRef}
                            className="bg-white rounded-lg shadow-xl overflow-hidden z-9999"
                            style={{
                                position: 'fixed',
                                top: `${posicion.top}px`,
                                left: `${posicion.left}px`,
                                width: `${posicion.width}px`,
                                border: '2.5px solid #dde4ef'
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    handleChange(h, m, 'AM');
                                    setDropdownAbierto(false);
                                }}
                                className={`w-full px-4 py-2.5 text-center text-base lg:text-sm 2xl:text-base font-medium transition-all cursor-pointer ${p === 'AM' ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                AM
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleChange(h, m, 'PM');
                                    setDropdownAbierto(false);
                                }}
                                className={`w-full px-4 py-2.5 text-center text-base lg:text-sm 2xl:text-base font-medium transition-all cursor-pointer ${p === 'PM' ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                PM
                            </button>
                        </div>,
                        document.body
                    )}
                </div>
            </div>
        );
    }
}

// =============================================================================
// NUMBER INPUT (DESKTOP)
// =============================================================================

interface NumberInputProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (value: number) => void;
}

function NumberInput({ value, min, max, step = 1, onChange }: NumberInputProps) {
    const inputId = useId();
    const increment = () => onChange(value + step > max ? min : value + step);
    const decrement = () => onChange(value - step < min ? max : value - step);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = parseInt(e.target.value) || 0;
        if (val < min) val = min;
        if (val > max) val = max;
        onChange(val);
    };

    return (
        <div className="relative flex-1">
            <input
                id={inputId}
                name={inputId}
                type="number"
                value={value.toString().padStart(2, '0')}
                onChange={handleChange}
                className="w-full text-center text-base lg:text-sm 2xl:text-base font-medium h-12 lg:h-10 2xl:h-12 px-3 bg-slate-50 rounded-lg focus:outline-none transition-all"
                style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button type="button" onClick={increment} className="w-5 h-4 rounded bg-slate-200 hover:bg-blue-200 border border-slate-300 flex items-center justify-center transition-all cursor-pointer">
                    <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M5 15l7-7 7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button type="button" onClick={decrement} className="w-5 h-4 rounded bg-slate-200 hover:bg-blue-200 border border-slate-300 flex items-center justify-center transition-all cursor-pointer">
                    <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// WHEEL TIME PICKER (MÓVIL)
// =============================================================================

interface WheelTimePickerProps {
    hora: number;
    minutos: number;
    periodo: string;
    onHoraChange: (hora: number) => void;
    onMinutosChange: (minutos: number) => void;
    onPeriodoChange: (periodo: string) => void;
}

function WheelTimePicker({ hora, minutos, periodo, onHoraChange, onMinutosChange, onPeriodoChange }: WheelTimePickerProps) {
    const horaRef = useRef<HTMLDivElement | null>(null);
    const minutosRef = useRef<HTMLDivElement | null>(null);
    const periodoRef = useRef<HTMLDivElement | null>(null);
    const horas = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutosArray = Array.from({ length: 12 }, (_, i) => i * 5);
    const periodos = ['AM', 'PM'];

    useEffect(() => {
        const scrollToSelected = (ref: React.RefObject<HTMLDivElement | null>, index: number) => {
            if (!ref.current) return;
            const items = ref.current.querySelectorAll('.wheel-item');
            const item = items[index];
            if (item) {
                const container = ref.current;
                const itemHeight = (item as HTMLElement).offsetHeight;
                const scrollTop = (item as HTMLElement).offsetTop - container.offsetHeight / 2 + itemHeight / 2;
                container.scrollTop = scrollTop;
            }
        };
        setTimeout(() => {
            scrollToSelected(horaRef, hora - 1);
            scrollToSelected(minutosRef, minutos / 5);
            scrollToSelected(periodoRef, periodo === 'AM' ? 0 : 1);
        }, 100);
    }, []);

    const handleScroll = <T,>(ref: React.RefObject<HTMLDivElement | null>, onChange: (value: T) => void, values: T[]) => {
        if (!ref.current) return;
        const container = ref.current;
        const items = container.querySelectorAll('.wheel-item');
        const containerRect = container.getBoundingClientRect();
        const centerY = containerRect.top + containerRect.height / 2;
        let closestIndex = 0;
        let minDistance = Infinity;
        items.forEach((item, index) => {
            const itemRect = item.getBoundingClientRect();
            const itemCenterY = itemRect.top + itemRect.height / 2;
            const distance = Math.abs(centerY - itemCenterY);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
            }
        });
        onChange(values[closestIndex]);
    };

    return (
        <div className="relative bg-slate-50 rounded-xl p-2.5 overflow-hidden touch-none shadow-sm" style={{ border: '2.5px solid #dde4ef', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-7 border-y-2 border-blue-400 bg-blue-100/60 pointer-events-none z-0 rounded"></div>
            <div className="flex items-center justify-center gap-2">
                <div ref={horaRef} onScroll={() => handleScroll(horaRef, onHoraChange, horas)} className="h-20 overflow-y-auto hide-scrollbar" style={{ scrollSnapType: 'y mandatory', touchAction: 'pan-y' }}>
                    <div className="py-7">
                        {horas.map((h) => <div key={h} className="wheel-item text-center py-0.5 text-sm font-bold text-slate-800" style={{ scrollSnapAlign: 'center' }}>{h.toString().padStart(2, '0')}</div>)}
                    </div>
                </div>
                <span className="text-base lg:text-sm 2xl:text-base font-bold text-slate-400">:</span>
                <div ref={minutosRef} onScroll={() => handleScroll(minutosRef, onMinutosChange, minutosArray)} className="h-20 overflow-y-auto hide-scrollbar" style={{ scrollSnapType: 'y mandatory', touchAction: 'pan-y' }}>
                    <div className="py-7">
                        {minutosArray.map((m) => <div key={m} className="wheel-item text-center py-0.5 text-sm font-bold text-slate-800" style={{ scrollSnapAlign: 'center' }}>{m.toString().padStart(2, '0')}</div>)}
                    </div>
                </div>
                <div ref={periodoRef} onScroll={() => handleScroll(periodoRef, onPeriodoChange, periodos)} className="h-20 overflow-y-auto hide-scrollbar" style={{ scrollSnapType: 'y mandatory', touchAction: 'pan-y' }}>
                    <div className="py-7">
                        {periodos.map((p) => <div key={p} className="wheel-item text-center py-0.5 text-sm font-bold text-slate-700" style={{ scrollSnapAlign: 'center' }}>{p}</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
}