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
import { Coffee, Copy, Check, X, ChevronDown } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
import type { DatosHorarios, HorarioDia } from '../hooks/usePerfil';
import { notificar } from '@/utils/notificaciones';

interface TabHorariosProps {
    datosHorarios: DatosHorarios;
    setDatosHorarios: (datos: DatosHorarios) => void;
}

export default function TabHorarios({ datosHorarios, setDatosHorarios }: TabHorariosProps) {
    const [diaSeleccionado, setDiaSeleccionado] = useState(0);
    const [dropdownDiasAbierto, setDropdownDiasAbierto] = useState(false);
    const dropdownDiasRef = useRef<HTMLDivElement>(null);
    const comidaRef = useRef<HTMLDivElement>(null);
    const horarios = datosHorarios.horarios;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownDiasRef.current && !dropdownDiasRef.current.contains(e.target as Node)) {
                setDropdownDiasAbierto(false);
            }
        };
        if (dropdownDiasAbierto) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownDiasAbierto]);

    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

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

        notificar.exito('Duplicado a toda la semana');
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

    const handleToggleComida = (activar: boolean) => {
        actualizarHorarioDia(diaSeleccionado, { tieneHorarioComida: activar });

        if (activar && window.innerWidth < 1024) {
            const main = document.querySelector('main');
            if (!main) return;
            setTimeout(() => {
                const el = comidaRef.current;
                if (!el) return;
                let offsetTop = 0;
                let current: HTMLElement | null = el;
                while (current && current !== main) {
                    offsetTop += current.offsetTop;
                    current = current.offsetParent as HTMLElement | null;
                }
                const targetScroll = offsetTop + el.offsetHeight - main.clientHeight + 16;
                main.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
            }, 50);
        }
    };

    return (
        <div className="space-y-4 lg:space-y-3 2xl:space-y-4">

            {/* ============================================================ */}
            {/* CARD: SELECTOR DE DÍAS */}
            {/* ============================================================ */}

            <div className="bg-white border-2 border-slate-300 rounded-xl"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

                {/* Header */}
                <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                      <Clock className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                    </div>
                    <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Horario de Atención</span>
                    <span className="ml-auto text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium">
                        {diasSemana[diaSeleccionado]} — {horarioDia.abierto ? 'Abierto' : 'Cerrado'}
                    </span>
                </div>

                <div className="p-3 lg:p-2.5 2xl:p-3 space-y-3 lg:space-y-2.5 2xl:space-y-3">

                    {/* Selector de días — Móvil: dropdown / Desktop: botones */}

                    {/* MÓVIL */}
                    <div ref={dropdownDiasRef} className="relative lg:hidden">
                        <div
                            onClick={() => setDropdownDiasAbierto(!dropdownDiasAbierto)}
                            className="flex items-center h-11 bg-slate-100 rounded-lg pl-3 pr-2.5 border-2 border-slate-300 hover:border-slate-400 cursor-pointer gap-2"
                            style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                        >
                            <span className="flex-1 text-base font-semibold text-slate-800 truncate">{diasSemana[diaSeleccionado]}</span>
                            <span className={`text-sm font-medium shrink-0 ${horarioDia.abierto ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {horarioDia.abierto ? 'Abierto' : 'Cerrado'}
                            </span>
                            <ChevronDown className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${dropdownDiasAbierto ? 'rotate-180' : ''}`} />
                        </div>

                        {dropdownDiasAbierto && (
                            <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border-2 border-slate-300 shadow-lg overflow-hidden">
                                <div className="py-1">
                                    {diasSemana.map((nombreDia, indiceVisual) => {
                                        const diaBD_iter = visualADiaSemana(indiceVisual);
                                        const horarioDelDia = horarios.find(h => h.diaSemana === diaBD_iter);
                                        const estaAbierto = horarioDelDia?.abierto ?? true;
                                        const esSeleccionado = indiceVisual === diaSeleccionado;

                                        return (
                                            <button
                                                key={indiceVisual}
                                                type="button"
                                                onClick={() => { setDiaSeleccionado(indiceVisual); setDropdownDiasAbierto(false); }}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left cursor-pointer ${
                                                    esSeleccionado
                                                        ? 'bg-blue-100 text-blue-700 font-semibold'
                                                        : 'text-slate-600 font-medium hover:bg-blue-50'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${esSeleccionado ? 'bg-blue-500' : 'bg-slate-200'}`}>
                                                    {esSeleccionado && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                                </div>
                                                <span className="flex-1 text-base">{nombreDia}</span>
                                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${estaAbierto ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DESKTOP: días + botones en la misma fila */}
                    <div className="hidden lg:flex gap-1.5 items-center">
                        <div className="flex gap-1.5 overflow-x-auto flex-1">
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
                                            relative shrink-0 min-w-[62px] lg:min-w-[54px] 2xl:min-w-[62px] px-3 py-2 rounded-lg text-base lg:text-sm 2xl:text-base font-bold cursor-pointer border-2
                                            ${esSeleccionado
                                                ? 'bg-slate-800 text-white border-slate-800'
                                                : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100'
                                            }
                                        `}
                                    >
                                        {!esSeleccionado && (
                                            <div className="absolute -top-1 -right-1">
                                                {estaAbierto
                                                    ? <Check className="w-3 h-3 text-green-600 bg-white rounded-full border border-green-600" strokeWidth={3} />
                                                    : <X className="w-3 h-3 text-slate-400 bg-white rounded-full border border-slate-300" strokeWidth={3} />
                                                }
                                            </div>
                                        )}
                                        {nombreDia}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                            <button type="button" onClick={duplicarHorario}
                                className="flex items-center gap-1.5 px-3 py-2 lg:text-sm 2xl:text-base font-semibold bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 text-white rounded-lg cursor-pointer transition-all">
                                <Copy className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                Duplicar
                            </button>
                            <button type="button" onClick={establecer24_7}
                                className="flex items-center gap-1.5 px-3 py-2 lg:text-sm 2xl:text-base font-semibold bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 text-white rounded-lg cursor-pointer transition-all">
                                <Clock className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4" />
                                24/7
                            </button>
                        </div>
                    </div>

                    {/* MÓVIL: botones debajo */}
                    <div className="flex gap-2 lg:hidden">
                        <button type="button" onClick={duplicarHorario}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 text-white rounded-lg cursor-pointer transition-all">
                            <Copy className="w-4 h-4" />
                            Duplicar
                        </button>
                        <button type="button" onClick={establecer24_7}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 text-white rounded-lg cursor-pointer transition-all">
                            <Clock className="w-4 h-4" />
                            24/7
                        </button>
                    </div>

                </div>
            </div>

            {/* ============================================================ */}
            {/* CARD: CONFIGURACIÓN DEL DÍA */}
            {/* ============================================================ */}

            <div className="bg-white border-2 border-slate-300 rounded-xl"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>

                {/* Header con toggle */}
                <div className="px-3 lg:px-4 py-2 lg:py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                      <Clock className="w-4 h-4 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-white" />
                    </div>
                    <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">{diasSemana[diaSeleccionado]}</span>
                    <label className="ml-auto flex items-center gap-2.5 cursor-pointer group">
                        <input
                            id="checkbox-dia-abierto"
                            name="checkbox-dia-abierto"
                            type="checkbox"
                            checked={horarioDia.abierto}
                            onChange={(e) => actualizarHorarioDia(diaSeleccionado, { abierto: e.target.checked })}
                            className="sr-only"
                        />
                        <span className="text-sm lg:text-xs 2xl:text-sm font-medium text-white/60 group-has-checked:text-slate-300">
                            {horarioDia.abierto ? 'Abierto' : 'Cerrado'}
                        </span>
                        <div className="relative w-12 h-6 lg:w-10 lg:h-5">
                            <div className="absolute inset-0 bg-white/20 group-has-checked:bg-slate-500 rounded-full transition-colors"></div>
                            <div className="absolute top-0.5 left-0.5 w-5 h-5 lg:w-4 lg:h-4 bg-white rounded-full shadow-md transition-transform group-has-checked:translate-x-6 lg:group-has-checked:translate-x-5"></div>
                        </div>
                    </label>
                </div>

                {/* Contenido según estado */}
                {horarioDia.abierto ? (
                    <div className="p-4 lg:p-3 2xl:p-4 space-y-3 lg:space-y-2.5 2xl:space-y-3">

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-2 2xl:gap-3 lg:items-start">

                            <div>
                                <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
                                    <div>
                                        <span className="flex items-center gap-1.5 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5"><Clock className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-500" />Apertura</span>
                                        <TimePicker
                                            hora={formatearHora(horarioDia.horaApertura)}
                                            onChange={(nuevaHora) => actualizarHorarioDia(diaSeleccionado, { horaApertura: nuevaHora + ':00' })}
                                        />
                                    </div>
                                    <div>
                                        <span className="flex items-center gap-1.5 text-sm lg:text-xs 2xl:text-sm font-bold text-slate-700 mb-1.5"><Clock className="w-4 h-4 lg:w-3.5 lg:h-3.5 2xl:w-4 2xl:h-4 text-slate-500" />Cierre</span>
                                        <TimePicker
                                            hora={formatearHora(horarioDia.horaCierre)}
                                            onChange={(nuevaHora) => actualizarHorarioDia(diaSeleccionado, { horaCierre: nuevaHora + ':00' })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Horario de Comida */}
                            <div ref={comidaRef} className="bg-amber-100 border-2 border-amber-300 rounded-xl p-3 lg:p-2.5 2xl:p-3">
                                <label className={`flex items-center gap-2 cursor-pointer ${horarioDia.tieneHorarioComida ? 'mb-2' : ''}`}>
                                    <input
                                        id="checkbox-horario-comida"
                                        name="checkbox-horario-comida"
                                        type="checkbox"
                                        checked={horarioDia.tieneHorarioComida}
                                        onChange={(e) => handleToggleComida(e.target.checked)}
                                        className="w-4 h-4 accent-amber-600 border-2 border-amber-300 rounded"
                                    />
                                    <Coffee className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-amber-600" />
                                    <span className="text-sm lg:text-xs 2xl:text-sm font-bold text-amber-700">
                                        Horario de comida / break
                                    </span>
                                </label>

                                {horarioDia.tieneHorarioComida && (
                                    <div className="space-y-2 lg:space-y-1.5 2xl:space-y-2">
                                        <div>
                                            <span className="block text-sm lg:text-xs 2xl:text-sm font-semibold text-amber-700 mb-1.5">Salida</span>
                                            <TimePicker
                                                hora={formatearHora(horarioDia.comidaInicio)}
                                                onChange={(nuevaHora) => actualizarHorarioDia(diaSeleccionado, { comidaInicio: nuevaHora + ':00' })}
                                            />
                                        </div>
                                        <div>
                                            <span className="block text-sm lg:text-xs 2xl:text-sm font-semibold text-amber-700 mb-1.5">Regreso</span>
                                            <TimePicker
                                                hora={formatearHora(horarioDia.comidaFin)}
                                                onChange={(nuevaHora) => actualizarHorarioDia(diaSeleccionado, { comidaFin: nuevaHora + ':00' })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Error de validación */}
                        {errorValidacion && (
                            <div className="bg-red-100 border-2 border-red-300 rounded-xl p-3 flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-white text-xs font-bold">!</span>
                                </div>
                                <div>
                                    <p className="text-red-700 font-bold text-sm lg:text-xs 2xl:text-sm">Horario inválido</p>
                                    <p className="text-red-600 text-sm lg:text-xs 2xl:text-sm font-medium">{errorValidacion}</p>
                                </div>
                            </div>
                        )}

                    </div>
                ) : (
                    <div className="py-10 text-center">
                        <X className="w-10 h-10 text-slate-300 mx-auto mb-2.5" strokeWidth={1.5} />
                        <p className="text-sm lg:text-xs 2xl:text-sm text-slate-500 font-semibold">Este día permanecerá cerrado</p>
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
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
    // Desktop: dropdown AM/PM
    const [dropdownAbierto, setDropdownAbierto] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);
    const clockRef = useRef<HTMLDivElement>(null);
    const [posicion, setPosicion] = useState({ top: 0, left: 0, width: 0 });
    // Móvil: reloj circular
    const [pickerMovilAbierto, setPickerMovilAbierto] = useState(false);
    const [modo, setModo] = useState<'hora' | 'minutos'>('hora');
    const [tempH, setTempH] = useState(1);
    const [tempM, setTempM] = useState(0);
    const [tempP, setTempP] = useState('AM');

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (dropdownAbierto && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setPosicion({ top: rect.bottom + 4, left: rect.left, width: rect.width });
        }
    }, [dropdownAbierto]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setDropdownAbierto(false);
            }
        };
        if (dropdownAbierto) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownAbierto]);

    const parsearHora = (horaStr: string) => {
        const [hh, mm] = horaStr.split(':').map(Number);
        const periodo = hh >= 12 ? 'PM' : 'AM';
        const hora12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
        return { hora: hora12, minutos: mm, periodo };
    };

    const formatearHoraStr = (h: number, min: number, per: string): string => {
        let hh = per === 'PM' && h !== 12 ? h + 12 : h;
        if (per === 'AM' && h === 12) hh = 0;
        return `${hh.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    };

    const { hora: h, minutos: m, periodo: p } = parsearHora(hora);

    const handleChange = (newH: number, newM: number, newP: string) => {
        onChange(formatearHoraStr(newH, newM, newP));
    };

    useEffect(() => {
        if (pickerMovilAbierto) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [pickerMovilAbierto]);

    const abrirPickerMovil = () => {
        const parsed = parsearHora(hora);
        setTempH(parsed.hora);
        setTempM(parsed.minutos);
        setTempP(parsed.periodo);
        setModo('hora');
        setPickerMovilAbierto(true);
    };

    const handleSelectHora = (num: number) => {
        setTempH(num);
        setTimeout(() => setModo('minutos'), 220);
    };

    // Geometría del reloj (compartida entre handlers y render)
    const CLOCK_SIZE = 220;
    const CLOCK_CENTER = 110;
    const CLOCK_RADIO = 80;
    const CLOCK_BTN_HALF = 20;
    const horasReloj = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const minutosReloj = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    const calcularValorDesdeTouch = (clientX: number, clientY: number) => {
        if (!clockRef.current) return;
        const rect = clockRef.current.getBoundingClientRect();
        const x = clientX - rect.left - CLOCK_CENTER;
        const y = clientY - rect.top - CLOCK_CENTER;
        const angulo = ((Math.atan2(y, x) * 180 / Math.PI) + 90 + 360) % 360;
        const idx = Math.round(angulo / 30) % 12;
        if (modo === 'hora') {
            setTempH(horasReloj[idx]);
        } else {
            setTempM(minutosReloj[idx]);
        }
    };

    const handleClockTouchStart = (e: React.TouchEvent) => {
        const t = e.touches[0];
        calcularValorDesdeTouch(t.clientX, t.clientY);
    };

    const handleClockTouchMove = (e: React.TouchEvent) => {
        const t = e.touches[0];
        calcularValorDesdeTouch(t.clientX, t.clientY);
    };

    const handleClockTouchEnd = () => {
        if (modo === 'hora') setTimeout(() => setModo('minutos'), 200);
    };

    if (isMobile) {
        const horaDisplay = `${h}:${m.toString().padStart(2, '0')} ${p}`;

        const SIZE = CLOCK_SIZE;
        const CENTER = CLOCK_CENTER;
        const RADIO = CLOCK_RADIO;
        const BTN_HALF = CLOCK_BTN_HALF;

        const getPosReloj = (index: number) => {
            const angle = (index * 30 - 90) * (Math.PI / 180);
            return { x: Math.cos(angle) * RADIO, y: Math.sin(angle) * RADIO };
        };

        const selIdx = modo === 'hora'
            ? horasReloj.indexOf(tempH)
            : minutosReloj.findIndex(v => v === tempM);
        const { x: selX, y: selY } = getPosReloj(selIdx >= 0 ? selIdx : 0);

        return (
            <>
                {/* Trigger */}
                <div
                    onClick={abrirPickerMovil}
                    className="flex items-center h-11 bg-slate-100 rounded-lg border-2 border-slate-300 hover:border-slate-400 px-4 cursor-pointer"
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                >
                    <Clock className="w-4 h-4 text-slate-500 shrink-0 mr-2.5" />
                    <span className="flex-1 text-base font-semibold text-slate-800">{horaDisplay}</span>
                    <ChevronDown className="w-5 h-5 text-slate-600 shrink-0" />
                </div>

                {/* Modal con reloj circular */}
                {pickerMovilAbierto && createPortal(
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

                        {/* Backdrop — bloquea todo lo de atrás */}
                        <div className="absolute inset-0 bg-black/50" onClick={() => setPickerMovilAbierto(false)} />

                        {/* Card — minimal dark */}
                        <div style={{ position: 'relative', background: '#000', borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 272, boxShadow: '0 32px 80px rgba(0,0,0,0.95), 0 0 0 1px #1c1c1e' }}>

                            {/* Tiempo + AM/PM */}
                            <div style={{ padding: '22px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                                    <button type="button" onClick={() => setModo('hora')} style={{
                                        background: 'none', border: 'none', padding: '0 4px',
                                        fontSize: 54, fontWeight: 800, lineHeight: 1, cursor: 'pointer',
                                        color: modo === 'hora' ? '#fff' : '#374151',
                                        borderBottom: `2.5px solid ${modo === 'hora' ? '#6b7280' : 'transparent'}`,
                                    }}>
                                        {tempH.toString().padStart(2, '0')}
                                    </button>
                                    <span style={{ fontSize: 50, fontWeight: 800, color: '#1f2937', lineHeight: 1, paddingBottom: 2 }}>:</span>
                                    <button type="button" onClick={() => setModo('minutos')} style={{
                                        background: 'none', border: 'none', padding: '0 4px',
                                        fontSize: 54, fontWeight: 800, lineHeight: 1, cursor: 'pointer',
                                        color: modo === 'minutos' ? '#fff' : '#374151',
                                        borderBottom: `2.5px solid ${modo === 'minutos' ? '#6b7280' : 'transparent'}`,
                                    }}>
                                        {tempM.toString().padStart(2, '0')}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 3 }}>
                                    <button type="button" onClick={() => setTempP('AM')} style={{
                                        padding: '5px 11px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                        color: tempP === 'AM' ? '#fff' : '#374151',
                                        background: tempP === 'AM' ? '#1c1c1e' : 'transparent',
                                        border: `1px solid ${tempP === 'AM' ? '#374151' : '#111'}`,
                                    }}>AM</button>
                                    <button type="button" onClick={() => setTempP('PM')} style={{
                                        padding: '5px 11px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                        color: tempP === 'PM' ? '#fff' : '#374151',
                                        background: tempP === 'PM' ? '#1c1c1e' : 'transparent',
                                        border: `1px solid ${tempP === 'PM' ? '#374151' : '#111'}`,
                                    }}>PM</button>
                                </div>
                            </div>

                            {/* Reloj */}
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 18px 14px' }}>
                                <div
                                    ref={clockRef}
                                    onTouchStart={handleClockTouchStart}
                                    onTouchMove={handleClockTouchMove}
                                    onTouchEnd={handleClockTouchEnd}
                                    style={{ position: 'relative', width: SIZE, height: SIZE, borderRadius: '50%', background: '#111', border: '1px solid #1c1c1e', touchAction: 'none' }}
                                >
                                    {/* Manecilla */}
                                    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={SIZE} height={SIZE}>
                                        <line x1={CENTER} y1={CENTER} x2={CENTER + selX} y2={CENTER + selY} stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
                                        <circle cx={CENTER} cy={CENTER} r="3" fill="#6b7280" />
                                        <circle cx={CENTER + selX} cy={CENTER + selY} r="20" fill="#ffffff" fillOpacity="0.06" />
                                    </svg>

                                    {/* Números */}
                                    {modo === 'hora'
                                        ? horasReloj.map((num, i) => {
                                            const { x, y } = getPosReloj(i);
                                            const activo = num === tempH;
                                            return (
                                                <button key={num} type="button" onClick={() => handleSelectHora(num)} style={{
                                                    position: 'absolute',
                                                    left: CENTER + x - BTN_HALF, top: CENTER + y - BTN_HALF,
                                                    width: 40, height: 40, borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 15, fontWeight: 700,
                                                    color: activo ? '#000' : '#6b7280',
                                                    background: activo ? '#fff' : 'transparent',
                                                    border: 'none', cursor: 'pointer', zIndex: 1, userSelect: 'none',
                                                }}>
                                                    {num}
                                                </button>
                                            );
                                        })
                                        : minutosReloj.map((num, i) => {
                                            const { x, y } = getPosReloj(i);
                                            const activo = num === tempM;
                                            return (
                                                <button key={num} type="button" onClick={() => setTempM(num)} style={{
                                                    position: 'absolute',
                                                    left: CENTER + x - BTN_HALF, top: CENTER + y - BTN_HALF,
                                                    width: 40, height: 40, borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 13, fontWeight: 700,
                                                    color: activo ? '#000' : '#6b7280',
                                                    background: activo ? '#fff' : 'transparent',
                                                    border: 'none', cursor: 'pointer', zIndex: 1, userSelect: 'none',
                                                }}>
                                                    {num.toString().padStart(2, '0')}
                                                </button>
                                            );
                                        })
                                    }
                                </div>
                            </div>

                            {/* Listo */}
                            <div style={{ padding: '0 22px 22px' }}>
                                <button type="button"
                                    onClick={() => { onChange(formatearHoraStr(tempH, tempM, tempP)); setPickerMovilAbierto(false); }}
                                    style={{ width: '100%', height: 44, borderRadius: 12, fontSize: 15, fontWeight: 700, color: '#fff', background: '#1c1c1e', border: '1px solid #374151', cursor: 'pointer' }}>
                                    Listo
                                </button>
                            </div>

                        </div>
                    </div>,
                    document.body
                )}
            </>
        );
    } else {
        return (
            <div className="flex items-center gap-1.5">
                <NumberInput value={h} min={1} max={12} onChange={(newH) => handleChange(newH, m, p)} />
                <span className="text-lg font-bold text-slate-400">:</span>
                <NumberInput value={m} min={0} max={55} step={5} onChange={(newM) => handleChange(h, newM, p)} />

                {/* Dropdown AM/PM */}
                <div className="relative">
                    <div
                        ref={buttonRef}
                        onClick={() => setDropdownAbierto(!dropdownAbierto)}
                        className="w-20 lg:w-16 2xl:w-20 flex items-center justify-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg cursor-pointer hover:bg-blue-50 border-2 border-slate-300"
                        style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                    >
                        <span className="text-base lg:text-sm 2xl:text-base font-medium text-slate-800">{p}</span>
                        <ChevronDown className={`w-4 h-4 ml-1 text-slate-500 transition-transform ${dropdownAbierto ? 'rotate-180' : ''}`} />
                    </div>

                    {dropdownAbierto && createPortal(
                        <div
                            ref={dropdownRef}
                            className="bg-white rounded-lg shadow-xl overflow-hidden z-9999"
                            style={{
                                position: 'fixed',
                                top: `${posicion.top}px`,
                                left: `${posicion.left}px`,
                                width: `${posicion.width}px`,
                                border: '2px solid #cbd5e1'
                            }}
                        >
                            <button type="button"
                                onClick={() => { handleChange(h, m, 'AM'); setDropdownAbierto(false); }}
                                className={`w-full px-4 py-2.5 text-center text-base lg:text-sm 2xl:text-base font-medium cursor-pointer ${p === 'AM' ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-white text-slate-700 hover:bg-blue-50'}`}>
                                AM
                            </button>
                            <button type="button"
                                onClick={() => { handleChange(h, m, 'PM'); setDropdownAbierto(false); }}
                                className={`w-full px-4 py-2.5 text-center text-base lg:text-sm 2xl:text-base font-medium cursor-pointer ${p === 'PM' ? 'bg-blue-100 text-blue-700 font-semibold' : 'bg-white text-slate-700 hover:bg-blue-50'}`}>
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
                className="w-full text-center text-base lg:text-sm 2xl:text-base font-medium h-11 lg:h-10 2xl:h-11 px-3 bg-slate-100 rounded-lg focus:outline-none border-2 border-slate-300"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button type="button" onClick={increment} className="w-5 h-4 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 flex items-center justify-center cursor-pointer">
                    <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M5 15l7-7 7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button type="button" onClick={decrement} className="w-5 h-4 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 flex items-center justify-center cursor-pointer">
                    <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

