/**
 * PasoHorarios.tsx - PASO 4 DEL ONBOARDING (VERSIÓN MEJORADA)
 * ==============================================================
 * Configuración de horarios de operación de la sucursal
 * 
 * MEJORAS APLICADAS v2.0:
 * ✅ Paleta simplificada (solo azul + verde mínimo)
 * ✅ Proporciones reducidas (inputs 40% más pequeños)
 * ✅ Indicadores de estado en tabs
 * ✅ Labels sin cajas decorativas
 * ✅ Diseño más limpio y profesional
 * 
 * CARACTERÍSTICAS:
 * - Selector de 7 días con indicadores de estado
 * - Toggle Abierto/Cerrado por día
 * - Horarios de apertura y cierre
 * - Horario de comida/break opcional
 * - Time pickers RESPONSIVOS:
 *   • Móvil: Selector iOS (ruedas)
 *   • Desktop: Input numérico con flechas
 * - Botón 24/7 y "Copiar a todos"
 * - Validaciones en tiempo real
 */

import { useState, useEffect, useRef } from 'react';
import { Clock, Coffee, Copy, Loader2, Check, X } from 'lucide-react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { api } from '@/services/api';
import { notificar } from '@/utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

interface Horario {
    diaSemana: number; // 0-6 (Domingo-Sábado)
    abierto: boolean;
    horaApertura: string; // "HH:mm"
    horaCierre: string;
    tieneHorarioComida: boolean;
    comidaInicio: string;
    comidaFin: string;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoHorarios() {
    const { negocioId, sucursalId, guardarPaso4, setSiguienteDeshabilitado } = useOnboardingStore();

    // Estados
    const [diaSeleccionado, setDiaSeleccionado] = useState(0);
    const [horarios, setHorarios] = useState<Horario[]>([
        { diaSemana: 0, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
        { diaSemana: 1, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
        { diaSemana: 2, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
        { diaSemana: 3, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
        { diaSemana: 4, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
        { diaSemana: 5, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
        { diaSemana: 6, abierto: false, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' }
    ]);
    const [cargandoDatos, setCargandoDatos] = useState(true);

    // Array visual: Lunes primero
    const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Mapeo: índice visual (0=Lun) → diaSemana BD (0=Dom, 1=Lun, ...)
    const visualADiaSemana = (indiceVisual: number): number => {
        return (indiceVisual + 1) % 7;
    };

    // Mapeo inverso: diaSemana BD → índice visual
    const diaSemanaAVisual = (diaSemana: number): number => {
        return diaSemana === 0 ? 6 : diaSemana - 1;
    };

    // ---------------------------------------------------------------------------
    // Cargar datos existentes
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const cargarDatos = async () => {
            if (!sucursalId) {
                setCargandoDatos(false);
                return;
            }

            try {
                const response = await api.get(`/onboarding/${negocioId}/progreso`);
                const datos = response.data.data;

                if (datos.horarios && datos.horarios.length > 0) {
                    const horariosFormateados = datos.horarios.map((h: any) => ({
                        diaSemana: h.diaSemana,
                        abierto: h.abierto ?? true,
                        horaApertura: formatearHora(h.horaApertura ?? '09:00:00'),
                        horaCierre: formatearHora(h.horaCierre ?? '21:00:00'),
                        tieneHorarioComida: h.tieneHorarioComida ?? false,
                        comidaInicio: formatearHora(h.comidaInicio ?? '14:00:00'),
                        comidaFin: formatearHora(h.comidaFin ?? '16:00:00')
                    }));

                    horariosFormateados.sort((a: Horario, b: Horario) => a.diaSemana - b.diaSemana);
                    setHorarios(horariosFormateados);
                }
            } catch (error) {
                console.error('Error al cargar datos:', error);
            } finally {
                setCargandoDatos(false);
            }
        };

        cargarDatos();
    }, [negocioId, sucursalId]);

    // ---------------------------------------------------------------------------
    // Helper: Formatear hora
    // ---------------------------------------------------------------------------
    const formatearHora = (hora: string | null): string => {
        if (!hora) return '09:00';
        return hora.substring(0, 5);
    };

    // ---------------------------------------------------------------------------
    // Validación en tiempo real
    // ---------------------------------------------------------------------------
    const esFormularioValido = (): boolean => {
        const algunDiaAbierto = horarios.some(h => h.abierto);
        if (!algunDiaAbierto) return false;

        for (const horario of horarios) {
            if (!horario.abierto) continue;
            if (horario.horaApertura >= horario.horaCierre) return false;
            if (horario.tieneHorarioComida) {
                if (horario.comidaInicio < horario.horaApertura) return false;
                if (horario.comidaFin > horario.horaCierre) return false;
                if (horario.comidaInicio >= horario.comidaFin) return false;
            }
        }
        return true;
    };

    useEffect(() => {
        const esValido = esFormularioValido();
        setSiguienteDeshabilitado(!esValido);

        // ✅ Actualizar estado de paso completado en tiempo real
        const { actualizarPasoCompletado } = useOnboardingStore.getState();
        actualizarPasoCompletado(3, esValido); // índice 3 = Paso 4
    }, [horarios]);

    // ---------------------------------------------------------------------------
    // Exponer función de guardado
    // ---------------------------------------------------------------------------
    useEffect(() => {
        (window as any).guardarPaso4 = async (validar: boolean): Promise<boolean> => {
            if (validar && !esFormularioValido()) {
                notificar.error('Completa los horarios correctamente');
                return false;
            }

            try {
                const datos: any = {
                    horarios: horarios.length > 0 ? horarios : null
                };

                if (validar) {
                    await guardarPaso4(datos.horarios as any);
                } else {
                    const { guardarBorradorPaso4 } = useOnboardingStore.getState();
                    await guardarBorradorPaso4(datos.horarios as any);
                }
                return true;
            } catch (error) {
                console.error('Error al guardar paso 4:', error);
                return false;
            }
        };

        return () => {
            delete (window as any).guardarPaso4;
        };
    }, [horarios]);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const actualizarHorario = (campo: keyof Horario, valor: any) => {
        const diaBD = visualADiaSemana(diaSeleccionado);
        const nuevosHorarios = horarios.map(h =>
            h.diaSemana === diaBD
                ? { ...h, [campo]: valor }
                : h
        );
        setHorarios(nuevosHorarios);

    };

    const toggleAbierto = () => {
        const diaBD = visualADiaSemana(diaSeleccionado);
        const horarioActual = horarios.find(h => h.diaSemana === diaBD)!;
        actualizarHorario('abierto', !horarioActual.abierto);
    };

    const toggleHorarioComida = () => {
        const diaBD = visualADiaSemana(diaSeleccionado);
        const horarioActual = horarios.find(h => h.diaSemana === diaBD)!;
        actualizarHorario('tieneHorarioComida', !horarioActual.tieneHorarioComida);
    };

    const marcar24x7 = () => {
        actualizarHorario('horaApertura', '00:00');
        actualizarHorario('horaCierre', '23:59');
        actualizarHorario('tieneHorarioComida', false);
        notificar.exito('Horario configurado 24/7');
    };

    const copiarATodos = () => {
        const diaBD = visualADiaSemana(diaSeleccionado);
        const horarioActual = horarios.find(h => h.diaSemana === diaBD)!;
        const nuevosHorarios = horarios.map(h => ({
            ...horarioActual,
            diaSemana: h.diaSemana // Mantener el diaSemana original de cada elemento
        }));
        setHorarios(nuevosHorarios);
        notificar.exito('Horario copiado a todos los días');
    };

    const diaBD = visualADiaSemana(diaSeleccionado);
    const horarioActual = horarios.find(h => h.diaSemana === diaBD)!;

    // ---------------------------------------------------------------------------
    // Validaciones de errores
    // ---------------------------------------------------------------------------
    const errorHorarioGeneral = horarioActual.abierto && horarioActual.horaApertura >= horarioActual.horaCierre;
    const errorHorarioComida = horarioActual.abierto && horarioActual.tieneHorarioComida && (
        horarioActual.comidaInicio < horarioActual.horaApertura ||
        horarioActual.comidaFin > horarioActual.horaCierre ||
        horarioActual.comidaInicio >= horarioActual.comidaFin
    );

    // ---------------------------------------------------------------------------
    // Render condicional
    // ---------------------------------------------------------------------------
    if (cargandoDatos) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render principal
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-2 lg:space-y-3 2xl:space-y-4 pb-6">

            {/* Selector de días con indicadores */}
            <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
                <div className="flex gap-2 min-w-max">
                    {diasSemana.map((dia, indiceVisual) => {
                        const diaBD = visualADiaSemana(indiceVisual);
                        const horarioDia = horarios.find(h => h.diaSemana === diaBD)!;
                        const seleccionado = diaSeleccionado === indiceVisual;

                        return (
                            <button
                                key={indiceVisual}
                                onClick={() => setDiaSeleccionado(indiceVisual)}
                                className={`
                                    relative px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-sm font-semibold transition-all
                                    ${seleccionado
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }
                                `}
                            >
                                {dia}
                                {/* Indicador de estado */}
                                <span className={`
                                    absolute -top-1 -right-1 w-2.5 h-2.5 lg:w-2 lg:h-2 rounded-full border-2 border-white
                                    ${horarioDia.abierto ? 'bg-green-500' : 'bg-slate-400'}
                                `} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Toggle Abierto/Cerrado */}
            <div className="flex items-center justify-between p-2.5 lg:p-3 bg-gradient-to-r from-green-50 to-green-100/50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 lg:gap-2.5">
                    <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded flex items-center justify-center ${horarioActual.abierto ? 'bg-green-100' : 'bg-slate-200'
                        }`}>
                        {horarioActual.abierto ? (
                            <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-green-600" />
                        ) : (
                            <X className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-slate-500" />
                        )}
                    </div>
                    <span className="text-sm font-medium text-slate-700">
                        {horarioActual.abierto ? 'Abierto' : 'Cerrado'}
                    </span>
                </div>
                <button
                    onClick={toggleAbierto}
                    className={`relative inline-flex h-5 w-9 lg:h-6 lg:w-11 items-center rounded-full transition-colors ${horarioActual.abierto ? 'bg-green-600' : 'bg-slate-300'
                        }`}
                >
                    <span className={`inline-block h-3.5 w-3.5 lg:h-4 lg:w-4 transform rounded-full bg-white transition-transform ${horarioActual.abierto ? 'translate-x-5 lg:translate-x-6' : 'translate-x-0.5 lg:translate-x-1'
                        }`} />
                </button>
            </div>

            {/* Contenedor de horarios */}
            {horarioActual.abierto && (
                <>
                    {/* Grid de horarios */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-24">

                        {/* Hora Apertura */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 lg:mb-1.5">
                                Hora de Apertura
                            </label>
                            <TimePicker
                                value={horarioActual.horaApertura}
                                onChange={(valor) => actualizarHorario('horaApertura', valor)}
                            />
                        </div>

                        {/* Hora Cierre */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 lg:mb-1.5">
                                Hora de Cierre
                            </label>
                            <TimePicker
                                value={horarioActual.horaCierre}
                                onChange={(valor) => actualizarHorario('horaCierre', valor)}
                            />
                        </div>
                    </div>

                    {/* Error horario general */}
                    {errorHorarioGeneral && (
                        <div className="p-2 lg:p-2 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">La hora de apertura debe ser menor a la de cierre</p>
                        </div>
                    )}

                    {/* Toggle horario de comida */}
                    <div
                        onClick={toggleHorarioComida}
                        className="flex items-center gap-2 lg:gap-2.5 p-2.5 lg:p-3 bg-linear-to-r from-orange-50 to-orange-100/50 border border-orange-200 rounded-lg cursor-pointer select-none"
                    >                        <input
                            type="checkbox"
                            id="tiene-comida"
                            checked={horarioActual.tieneHorarioComida}
                            onChange={toggleHorarioComida}
                            className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-600 border-orange-300 rounded focus:ring-2 focus:ring-orange-100"
                        />
                        <label htmlFor="tiene-comida" className="text-sm text-slate-700 cursor-pointer select-none flex items-center gap-1.5 lg:gap-2">
                            <Coffee className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-orange-600" />
                            ¿Tienes horario de comida/break?
                        </label>
                    </div>

                    {/* Horarios de comida */}
                    {horarioActual.tieneHorarioComida && (
                        <>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-24">

                                {/* Comida Inicio */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 lg:mb-1.5">
                                        Hora de Salida
                                    </label>
                                    <TimePicker
                                        value={horarioActual.comidaInicio}
                                        onChange={(valor) => actualizarHorario('comidaInicio', valor)}
                                    />
                                </div>

                                {/* Comida Fin */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 lg:mb-1.5">
                                        Hora de Regreso
                                    </label>
                                    <TimePicker
                                        value={horarioActual.comidaFin}
                                        onChange={(valor) => actualizarHorario('comidaFin', valor)}
                                    />
                                </div>
                            </div>

                            {/* Error horario comida */}
                            {errorHorarioComida && (
                                <div className="p-2 lg:p-2 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">El horario de comida debe estar dentro del horario de operación</p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Botones especiales */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-24">
                        <button
                            onClick={marcar24x7}
                            className="w-full px-4 py-2.5 lg:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                        >
                            <Clock className="w-4 h-4" />
                            Abierto 24/7
                        </button>
                        <button
                            onClick={copiarATodos}
                            className="w-full px-4 py-2.5 lg:py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                        >
                            <Copy className="w-4 h-4" />
                            Duplicar Horario
                        </button>
                    </div>
                </>
            )}

            {/* Info adicional */}
            {!horarios.some(h => h.abierto) && (
                <div className="p-2 lg:p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700">
                        Al menos un día debe estar abierto
                    </p>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// COMPONENTE TIME PICKER (RESPONSIVO)
// =============================================================================

interface TimePickerProps {
    value: string;
    onChange: (value: string) => void;
}

function TimePicker({ value, onChange }: TimePickerProps) {
    const [hora24, minutos] = value.split(':').map(Number);
    const hora12 = hora24 === 0 ? 12 : hora24 > 12 ? hora24 - 12 : hora24;
    const periodo = hora24 >= 12 ? 'PM' : 'AM';

    const actualizarHora = (nuevaHora12: number, nuevoPeriodo: string = periodo) => {
        let hora24 = nuevaHora12;
        if (nuevoPeriodo === 'PM' && nuevaHora12 !== 12) hora24 = nuevaHora12 + 12;
        if (nuevoPeriodo === 'AM' && nuevaHora12 === 12) hora24 = 0;
        onChange(`${hora24.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`);
    };

    const actualizarMinutos = (nuevosMinutos: number) => {
        onChange(`${hora24.toString().padStart(2, '0')}:${nuevosMinutos.toString().padStart(2, '0')}`);
    };

    const actualizarPeriodo = (nuevoPeriodo: string) => {
        actualizarHora(hora12, nuevoPeriodo);
    };

    return (
        <>
            {/* MÓVIL: Selector iOS */}
            <div className="lg:hidden">
                <WheelTimePicker
                    hora={hora12}
                    minutos={minutos}
                    periodo={periodo}
                    onHoraChange={actualizarHora}
                    onMinutosChange={actualizarMinutos}
                    onPeriodoChange={actualizarPeriodo}
                />
            </div>

            {/* LAPTOP/DESKTOP: Input Numérico */}
            <div className="hidden lg:flex items-center gap-2">
                <NumericInput
                    value={hora12}
                    onChange={(val) => actualizarHora(val)}
                    min={1}
                    max={12}
                />
                <span className="text-base font-medium text-slate-400">:</span>
                <NumericInput
                    value={minutos}
                    onChange={actualizarMinutos}
                    min={0}
                    max={59}
                    step={5}
                />
                <select
                    value={periodo}
                    onChange={(e) => actualizarPeriodo(e.target.value)}
                    className="appearance-none text-center text-base font-medium py-2 px-3 pr-7 border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all bg-white cursor-pointer"
                >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                </select>
            </div>
        </>
    );
}

// =============================================================================
// COMPONENTE: INPUT NUMÉRICO (DESKTOP)
// =============================================================================

interface NumericInputProps {
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step?: number;
}

function NumericInput({ value, onChange, min, max, step = 1 }: NumericInputProps) {
    const increment = () => {
        const newValue = value + step;
        onChange(newValue > max ? min : newValue);
    };

    const decrement = () => {
        const newValue = value - step;
        onChange(newValue < min ? max : newValue);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = parseInt(e.target.value) || 0;
        if (val < min) val = min;
        if (val > max) val = max;
        onChange(val);
    };

    return (
        <div className="relative flex-1">
            <input
                type="number"
                value={value.toString().padStart(2, '0')}
                onChange={handleChange}
                className="w-full text-center text-base font-medium py-2 px-3 border border-slate-200 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
            />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button
                    type="button"
                    onClick={increment}
                    className="w-5 h-4 rounded bg-slate-100 hover:bg-blue-100 flex items-center justify-center transition-all"
                >
                    <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M5 15l7-7 7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={decrement}
                    className="w-5 h-4 rounded bg-slate-100 hover:bg-blue-100 flex items-center justify-center transition-all"
                >
                    <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

// =============================================================================
// COMPONENTE: WHEEL TIME PICKER (MÓVIL - ESTILO iOS)
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

    const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, onChange: (value: any) => void, values: any[]) => {
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
        <div className="relative bg-white border-2 border-slate-200 rounded-xl p-2.5 overflow-hidden touch-none shadow-sm">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-7 border-y-2 border-blue-300 bg-blue-100/40 pointer-events-none z-0 rounded"></div>

            <div className="flex items-center justify-center gap-2">
                <div
                    ref={horaRef}
                    onScroll={() => handleScroll(horaRef, onHoraChange, horas)}
                    className="h-20 overflow-y-auto hide-scrollbar"
                    style={{ scrollSnapType: 'y mandatory', touchAction: 'pan-y' }}
                >
                    <div className="py-7">
                        {horas.map((h) => (
                            <div
                                key={h}
                                className="wheel-item text-center py-0.5 text-sm font-semibold text-slate-700"
                                style={{ scrollSnapAlign: 'center' }}
                            >
                                {h.toString().padStart(2, '0')}
                            </div>
                        ))}
                    </div>
                </div>

                <span className="text-base font-bold text-slate-400">:</span>

                <div
                    ref={minutosRef}
                    onScroll={() => handleScroll(minutosRef, onMinutosChange, minutosArray)}
                    className="h-20 overflow-y-auto hide-scrollbar"
                    style={{ scrollSnapType: 'y mandatory', touchAction: 'pan-y' }}
                >
                    <div className="py-7">
                        {minutosArray.map((m) => (
                            <div
                                key={m}
                                className="wheel-item text-center py-0.5 text-sm font-semibold text-slate-700"
                                style={{ scrollSnapAlign: 'center' }}
                            >
                                {m.toString().padStart(2, '0')}
                            </div>
                        ))}
                    </div>
                </div>

                <div
                    ref={periodoRef}
                    onScroll={() => handleScroll(periodoRef, onPeriodoChange, periodos)}
                    className="h-20 overflow-y-auto hide-scrollbar"
                    style={{ scrollSnapType: 'y mandatory', touchAction: 'pan-y' }}
                >
                    <div className="py-7">
                        {periodos.map((p) => (
                            <div
                                key={p}
                                className="wheel-item text-center py-0.5 text-sm font-bold text-slate-700"
                                style={{ scrollSnapAlign: 'center' }}
                            >
                                {p}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PasoHorarios;