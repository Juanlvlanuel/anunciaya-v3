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

import { useState, useEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { Coffee, Copy, Loader2, Check, X, ChevronDown } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Clock = (p: IconoWrapperProps) => <Icon icon={ICONOS.horario} {...p} />;
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
// CACHÉ — persiste entre montar/desmontar
// =============================================================================

const HORARIOS_DEFAULT: Horario[] = [
    { diaSemana: 0, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
    { diaSemana: 1, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
    { diaSemana: 2, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
    { diaSemana: 3, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
    { diaSemana: 4, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
    { diaSemana: 5, abierto: true, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
    { diaSemana: 6, abierto: false, horaApertura: '09:00', horaCierre: '21:00', tieneHorarioComida: false, comidaInicio: '14:00', comidaFin: '16:00' },
];

const cache4 = {
    cargado: false,
    horarios: HORARIOS_DEFAULT,
    diaSeleccionado: 0,
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoHorarios() {
    const { negocioId, sucursalId, guardarPaso4, setSiguienteDeshabilitado } = useOnboardingStore();

    // Estados — inicializar desde caché
    const [diaSeleccionado, setDiaSeleccionado] = useState(cache4.diaSeleccionado);
    const [horarios, setHorarios] = useState<Horario[]>(cache4.horarios);
    const [cargandoDatos, setCargandoDatos] = useState(!cache4.cargado);
    const [dropdownDiasAbierto, setDropdownDiasAbierto] = useState(false);
    const dropdownDiasRef = useRef<HTMLDivElement>(null);
    const comidaRef = useRef<HTMLDivElement>(null);

    // Array visual: Lunes primero
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // Mapeo: índice visual (0=Lun) → diaSemana BD (0=Dom, 1=Lun, ...)
    const visualADiaSemana = (indiceVisual: number): number => {
        return (indiceVisual + 1) % 7;
    };

    // Cerrar dropdown al click fuera
    useEffect(() => {
        const handleClickFuera = (e: MouseEvent) => {
            if (dropdownDiasRef.current && !dropdownDiasRef.current.contains(e.target as Node)) {
                setDropdownDiasAbierto(false);
            }
        };
        document.addEventListener('mousedown', handleClickFuera);
        return () => document.removeEventListener('mousedown', handleClickFuera);
    }, []);

    // Sincronizar caché
    useEffect(() => {
        cache4.horarios = horarios;
        cache4.diaSeleccionado = diaSeleccionado;
    }, [horarios, diaSeleccionado]);

    // ---------------------------------------------------------------------------
    // Cargar datos existentes
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (cache4.cargado) { setCargandoDatos(false); return; }
        const cargarDatos = async () => {
            if (!sucursalId) {
                setCargandoDatos(false);
                return;
            }

            try {
                const response = await api.get(`/onboarding/${negocioId}/progreso`);
                const datos = response.data.data;

                if (datos.horarios && datos.horarios.length > 0) {
                    const horariosFormateados = datos.horarios.map((h: Partial<Horario> & { diaSemana: number }) => ({
                        diaSemana: h.diaSemana,
                        abierto: h.abierto ?? true,
                        horaApertura: formatearHora(h.horaApertura ?? '09:00'),
                        horaCierre: formatearHora(h.horaCierre ?? '21:00'),
                        tieneHorarioComida: h.tieneHorarioComida ?? false,
                        comidaInicio: formatearHora(h.comidaInicio ?? '14:00'),
                        comidaFin: formatearHora(h.comidaFin ?? '16:00'),
                    }));

                    horariosFormateados.sort((a: Horario, b: Horario) => a.diaSemana - b.diaSemana);
                    setHorarios(horariosFormateados);
                }
            } catch (error) {
                console.error('Error al cargar datos:', error);
            } finally {
                setCargandoDatos(false);
                cache4.cargado = true;
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
        const guardarFn = async (validar: boolean): Promise<boolean> => {
            if (validar && !esFormularioValido()) {
                notificar.error('Completa los horarios correctamente');
                return false;
            }

            try {
                const datosHorarios = horarios.length > 0 ? horarios : undefined;

                if (validar) {
                    await guardarPaso4(datosHorarios as Parameters<typeof guardarPaso4>[0]);
                } else {
                    const { guardarBorradorPaso4 } = useOnboardingStore.getState();
                    await guardarBorradorPaso4(datosHorarios as Parameters<typeof guardarBorradorPaso4>[0]);
                }
                return true;
            } catch (error) {
                console.error('Error al guardar paso 4:', error);
                return false;
            }
        };

        (window as unknown as Record<string, unknown>).guardarPaso4 = guardarFn;

        return () => {
            delete (window as unknown as Record<string, unknown>).guardarPaso4;
        };
    }, [horarios]);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const actualizarHorario = (campo: keyof Horario, valor: string | boolean) => {
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
        const actual = horarios.find(h => h.diaSemana === diaBD)!;
        const activar = !actual.tieneHorarioComida;
        actualizarHorario('tieneHorarioComida', activar);
    };

    const marcar24x7 = (e: React.MouseEvent) => {
        e.stopPropagation();
        const nuevosHorarios = horarios.map(h => ({
            ...h,
            abierto: true,
            horaApertura: '00:00',
            horaCierre: '23:59',
            tieneHorarioComida: false,
        }));
        setHorarios(nuevosHorarios);
        notificar.exito('Horario configurado 24/7');
    };

    const copiarATodos = (e: React.MouseEvent) => {
        e.stopPropagation();
        const diaBD = visualADiaSemana(diaSeleccionado);
        const actual = horarios.find(h => h.diaSemana === diaBD)!;
        const nuevosHorarios = horarios.map(h => ({
            ...actual,
            diaSemana: h.diaSemana,
        }));
        setHorarios(nuevosHorarios);
        notificar.exito('Duplicado a toda la semana');
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
            <div className="flex items-center justify-center py-8 lg:py-10 2xl:py-12">
                <div className="text-center">
                    <Loader2 className="w-6 h-6 lg:w-8 lg:h-8 2xl:w-10 2xl:h-10 animate-spin text-slate-600 mx-auto mb-2 lg:mb-3" />
                    <p className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-600">Cargando...</p>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render principal — Cards estilo Mi Perfil
    // ---------------------------------------------------------------------------
    // Helper: contenido del horario (compartido móvil/desktop)
    const renderHorarioContenido = () => (
        horarioActual.abierto ? (
            <>
                {/* Horario de Atención — columna en móvil, fila en desktop */}
                <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-2.5 2xl:gap-3">
                    <div>
                        <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-500" /> Apertura
                        </label>
                        <TimePicker hora={horarioActual.horaApertura} onChange={(v) => actualizarHorario('horaApertura', v)} />
                    </div>
                    <div>
                        <label className="text-sm lg:text-sm 2xl:text-base font-bold text-slate-700 mb-1.5 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-500" /> Cierre
                        </label>
                        <TimePicker hora={horarioActual.horaCierre} onChange={(v) => actualizarHorario('horaCierre', v)} />
                    </div>
                </div>

                {errorHorarioGeneral && (
                    <div className="p-2.5 bg-red-100 border-2 border-red-300 rounded-lg">
                        <p className="text-sm font-medium text-red-600">La hora de apertura debe ser menor a la de cierre</p>
                    </div>
                )}

                {/* Horario de Comida */}
                <div ref={comidaRef} className={`p-3 lg:p-2.5 2xl:p-3 rounded-xl border-2 ${horarioActual.tieneHorarioComida ? 'bg-amber-100 border-amber-300' : 'bg-slate-100 border-slate-300'}`}>
                    <div className="flex items-center gap-3 cursor-pointer" onClick={toggleHorarioComida}>
                        <div className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                            horarioActual.tieneHorarioComida ? 'border-amber-600 bg-amber-600' : 'border-slate-300 bg-white'
                        }`}>
                            {horarioActual.tieneHorarioComida && <Check className="w-3 h-3 text-white stroke-3" />}
                        </div>
                        <Coffee className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 ${horarioActual.tieneHorarioComida ? 'text-amber-600' : 'text-slate-500'}`} />
                        <span className={`text-sm lg:text-sm 2xl:text-base font-bold select-none ${horarioActual.tieneHorarioComida ? 'text-amber-700' : 'text-slate-700'}`}>
                            Horario de comida / break
                        </span>
                    </div>

                    {horarioActual.tieneHorarioComida && (
                        <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-2.5 2xl:gap-3 mt-3">
                            <div>
                                <label className="text-sm lg:text-sm 2xl:text-base font-bold text-amber-700 mb-1.5 block">Salida</label>
                                <TimePicker hora={horarioActual.comidaInicio} onChange={(v) => actualizarHorario('comidaInicio', v)} />
                            </div>
                            <div>
                                <label className="text-sm lg:text-sm 2xl:text-base font-bold text-amber-700 mb-1.5 block">Regreso</label>
                                <TimePicker hora={horarioActual.comidaFin} onChange={(v) => actualizarHorario('comidaFin', v)} />
                            </div>
                        </div>
                    )}

                    {errorHorarioComida && (
                        <div className="p-2.5 bg-red-100 border-2 border-red-300 rounded-lg mt-2">
                            <p className="text-sm font-medium text-red-600">El horario de comida debe estar dentro del horario de operación</p>
                        </div>
                    )}
                </div>
            </>
        ) : (
            <div className="flex items-center gap-3 py-4 justify-center text-slate-400">
                <X className="w-5 h-5" />
                <span className="text-sm lg:text-sm 2xl:text-base font-medium">Este día permanecerá cerrado</span>
            </div>
        )
    );

    return (
        <div className="space-y-4 lg:space-y-3.5 2xl:space-y-5">

            {/* ================================================================= */}
            {/* MÓVIL: Card único con dropdown + botones + config */}
            {/* ================================================================= */}
            <div className="lg:hidden space-y-4">
                {/* Card: Horario de Atención */}
                <div className="bg-white border-2 border-slate-300 rounded-xl"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="px-3 py-2 flex items-center justify-between rounded-t-[10px]"
                        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                                <Clock className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-bold text-white">Horario de Atención</span>
                        </div>
                        <span className="text-sm font-medium text-white/60">
                            {diasSemana[diaSeleccionado]} — {horarioActual.abierto ? 'Abierto' : 'Cerrado'}
                        </span>
                    </div>
                    <div className="p-4 space-y-3">
                        {/* Dropdown selector de día */}
                        <div ref={dropdownDiasRef} className="relative">
                            <div onClick={() => setDropdownDiasAbierto(!dropdownDiasAbierto)}
                                className="flex items-center h-11 bg-slate-100 rounded-lg px-4 border-2 border-slate-300 hover:border-slate-400 cursor-pointer"
                                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                <span className="flex-1 text-base font-medium text-slate-800">{diasSemana[diaSeleccionado]}</span>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${horarioActual.abierto ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        {horarioActual.abierto ? 'Abierto' : 'Cerrado'}
                                    </span>
                                    <ChevronDown className={`w-5 h-5 text-slate-600 shrink-0 transition-transform ${dropdownDiasAbierto ? 'rotate-180' : ''}`} />
                                </div>
                            </div>

                            {dropdownDiasAbierto && (
                                <div className="absolute z-30 mt-1.5 w-full bg-white rounded-xl border-2 border-slate-300 shadow-lg overflow-hidden">
                                    <div className="py-1">
                                        {diasSemana.map((dia, indiceVisual) => {
                                            const diaBDLocal = visualADiaSemana(indiceVisual);
                                            const horarioDia = horarios.find(h => h.diaSemana === diaBDLocal)!;
                                            const seleccionado = diaSeleccionado === indiceVisual;
                                            return (
                                                <button key={indiceVisual} type="button"
                                                    onClick={() => { setDiaSeleccionado(indiceVisual); setDropdownDiasAbierto(false); }}
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left cursor-pointer transition-colors ${
                                                        seleccionado ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-600 font-medium hover:bg-slate-200'
                                                    }`}>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${seleccionado ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                                            {seleccionado && <Check className="w-3 h-3 text-white" />}
                                                        </div>
                                                        <span className="text-base">{dia}</span>
                                                    </div>
                                                    <span className={`w-2.5 h-2.5 rounded-full ${horarioDia.abierto ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Botones rápidos */}
                        <div className="flex gap-2">
                            <button onClick={copiarATodos}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 lg:py-2 2xl:py-2.5 text-sm lg:text-sm 2xl:text-base font-semibold bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 text-white rounded-lg cursor-pointer transition-all">
                                <Copy className="w-4 h-4" />
                                Duplicar
                            </button>
                            <button onClick={marcar24x7}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 lg:py-2 2xl:py-2.5 text-sm lg:text-sm 2xl:text-base font-semibold bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 text-white rounded-lg cursor-pointer transition-all">
                                <Clock className="w-4 h-4" />
                                24/7
                            </button>
                        </div>
                    </div>
                </div>

                {/* Card: Configuración del día seleccionado */}
                <div className="bg-white border-2 border-slate-300 rounded-xl"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="px-3 py-2 flex items-center justify-between rounded-t-[10px]"
                        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                                <Clock className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-sm font-bold text-white">{diasSemana[diaSeleccionado]}</span>
                        </div>
                        <label className="flex items-center gap-2.5 cursor-pointer group">
                            <span className="text-sm font-medium text-white/60">{horarioActual.abierto ? 'Abierto' : 'Cerrado'}</span>
                            <input type="checkbox" className="sr-only" checked={horarioActual.abierto} onChange={toggleAbierto} />
                            <div className="relative w-12 h-6">
                                <div className={`absolute inset-0 rounded-full transition-colors ${horarioActual.abierto ? 'bg-slate-500' : 'bg-white/20'}`} />
                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${horarioActual.abierto ? 'translate-x-6' : ''}`} />
                            </div>
                        </label>
                    </div>
                    <div className="p-4 space-y-4">
                        {renderHorarioContenido()}
                    </div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* DESKTOP: Card días (botones) + Card config */}
            {/* ================================================================= */}
            <div className="hidden lg:block space-y-3.5 2xl:space-y-5">
                {/* Card: Selector de días */}
                <div className="bg-white border-2 border-slate-300 rounded-xl"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="px-4 py-2 flex items-center gap-2.5 rounded-t-[10px]"
                        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                            <Clock className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <span className="text-sm 2xl:text-base font-bold text-white">Horario de Atención</span>
                    </div>
                    <div className="p-3 2xl:p-4 space-y-2.5 2xl:space-y-3">
                        <div className="grid grid-cols-7 gap-1 2xl:gap-1.5">
                            {diasSemana.map((dia, indiceVisual) => {
                                const diaBDLocal = visualADiaSemana(indiceVisual);
                                const horarioDia = horarios.find(h => h.diaSemana === diaBDLocal)!;
                                const seleccionado = diaSeleccionado === indiceVisual;
                                return (
                                    <button key={indiceVisual} onClick={() => setDiaSeleccionado(indiceVisual)}
                                        className={`relative px-1 py-1 2xl:py-1.5 rounded-xl text-xs 2xl:text-sm font-semibold transition-all border-2 cursor-pointer text-center ${
                                            seleccionado
                                                ? 'bg-slate-800 text-white border-slate-800'
                                                : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-200'
                                        }`}>
                                        {dia}
                                        <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border-2 border-white ${
                                            horarioDia.abierto ? 'bg-emerald-500' : 'bg-slate-400'
                                        }`} />
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={copiarATodos}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 lg:py-2 2xl:py-2.5 text-sm lg:text-sm 2xl:text-base font-semibold bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 text-white rounded-lg cursor-pointer transition-all">
                                <Copy className="w-4 h-4" />
                                Duplicar
                            </button>
                            <button onClick={marcar24x7}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 lg:py-2 2xl:py-2.5 text-sm lg:text-sm 2xl:text-base font-semibold bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-700/30 text-white rounded-lg cursor-pointer transition-all">
                                <Clock className="w-4 h-4" />
                                24/7
                            </button>
                        </div>
                    </div>
                </div>

                {/* Card: Configuración del día */}
                <div className="bg-white border-2 border-slate-300 rounded-xl"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="px-4 py-2 flex items-center justify-between rounded-t-[10px]"
                        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                        <div className="flex items-center gap-2 lg:gap-2.5">
                            <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                                <Clock className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                            </div>
                            <span className="text-sm 2xl:text-base font-bold text-white">{diasSemana[diaSeleccionado]}</span>
                        </div>
                        <label className="flex items-center gap-2.5 cursor-pointer group">
                            <span className="text-sm 2xl:text-base font-medium text-white/60">{horarioActual.abierto ? 'Abierto' : 'Cerrado'}</span>
                            <input type="checkbox" className="sr-only" checked={horarioActual.abierto} onChange={toggleAbierto} />
                            <div className="relative w-10 h-5">
                                <div className={`absolute inset-0 rounded-full transition-colors ${horarioActual.abierto ? 'bg-slate-500' : 'bg-white/20'}`} />
                                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${horarioActual.abierto ? 'translate-x-5' : ''}`} />
                            </div>
                        </label>
                    </div>
                    <div className="p-3 2xl:p-4 space-y-3 2xl:space-y-4">
                        {renderHorarioContenido()}
                    </div>
                </div>
            </div>

            {/* Alerta */}
            {!horarios.some(h => h.abierto) && (
                <div className="p-2.5 bg-amber-100 border-2 border-amber-300 rounded-lg">
                    <p className="text-sm font-medium text-amber-700">Al menos un día debe estar abierto</p>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// COMPONENTE: TimePicker (IDÉNTICO A Mi Perfil)
// Móvil: Modal con reloj circular | Desktop: Inputs numéricos + AM/PM
// =============================================================================

interface TimePickerProps {
    hora: string;
    onChange: (hora: string) => void;
}

function TimePicker({ hora, onChange }: TimePickerProps) {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
    const [dropdownAbierto, setDropdownAbierto] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLDivElement>(null);
    const clockRef = useRef<HTMLDivElement>(null);
    const [posicion, setPosicion] = useState({ top: 0, left: 0, width: 0 });
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
        if (pickerMovilAbierto) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [pickerMovilAbierto]);

    const abrirPickerMovil = () => {
        const parsed = parsearHora(hora);
        setTempH(parsed.hora); setTempM(parsed.minutos); setTempP(parsed.periodo);
        setModo('hora');
        setPickerMovilAbierto(true);
    };

    const handleSelectHora = (num: number) => {
        setTempH(num);
        setTimeout(() => setModo('minutos'), 220);
    };

    const CLOCK_SIZE = 220, CLOCK_CENTER = 110, CLOCK_RADIO = 80, CLOCK_BTN_HALF = 20;
    const horasReloj = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const minutosReloj = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    const calcularValorDesdeTouch = (clientX: number, clientY: number) => {
        if (!clockRef.current) return;
        const rect = clockRef.current.getBoundingClientRect();
        const x = clientX - rect.left - CLOCK_CENTER;
        const y = clientY - rect.top - CLOCK_CENTER;
        const angulo = ((Math.atan2(y, x) * 180 / Math.PI) + 90 + 360) % 360;
        const idx = Math.round(angulo / 30) % 12;
        if (modo === 'hora') setTempH(horasReloj[idx]);
        else setTempM(minutosReloj[idx]);
    };

    if (isMobile) {
        const horaDisplay = `${h}:${m.toString().padStart(2, '0')} ${p}`;
        const getPosReloj = (index: number) => {
            const angle = (index * 30 - 90) * (Math.PI / 180);
            return { x: Math.cos(angle) * CLOCK_RADIO, y: Math.sin(angle) * CLOCK_RADIO };
        };
        const selIdx = modo === 'hora' ? horasReloj.indexOf(tempH) : minutosReloj.findIndex(v => v === tempM);
        const { x: selX, y: selY } = getPosReloj(selIdx >= 0 ? selIdx : 0);

        return (
            <>
                <div onClick={abrirPickerMovil}
                    className="flex items-center h-11 bg-slate-100 rounded-lg border-2 border-slate-300 hover:border-slate-400 px-4 cursor-pointer"
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                    <Clock className="w-4 h-4 text-slate-500 shrink-0 mr-2.5" />
                    <span className="flex-1 text-base font-semibold text-slate-800">{horaDisplay}</span>
                    <ChevronDown className="w-5 h-5 text-slate-600 shrink-0" />
                </div>

                {pickerMovilAbierto && createPortal(
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setPickerMovilAbierto(false)} />
                        <div style={{ position: 'relative', background: '#000', borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 272, boxShadow: '0 32px 80px rgba(0,0,0,0.95), 0 0 0 1px #1c1c1e' }}>
                            <div style={{ padding: '22px 22px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0 }}>
                                    <button type="button" onClick={() => setModo('hora')} style={{ background: 'none', border: 'none', padding: '0 4px', fontSize: 54, fontWeight: 800, lineHeight: 1, cursor: 'pointer', color: modo === 'hora' ? '#fff' : '#374151', borderBottom: `2.5px solid ${modo === 'hora' ? '#6b7280' : 'transparent'}` }}>
                                        {tempH.toString().padStart(2, '0')}
                                    </button>
                                    <span style={{ fontSize: 50, fontWeight: 800, color: '#1f2937', lineHeight: 1, paddingBottom: 2 }}>:</span>
                                    <button type="button" onClick={() => setModo('minutos')} style={{ background: 'none', border: 'none', padding: '0 4px', fontSize: 54, fontWeight: 800, lineHeight: 1, cursor: 'pointer', color: modo === 'minutos' ? '#fff' : '#374151', borderBottom: `2.5px solid ${modo === 'minutos' ? '#6b7280' : 'transparent'}` }}>
                                        {tempM.toString().padStart(2, '0')}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 3 }}>
                                    <button type="button" onClick={() => setTempP('AM')} style={{ padding: '5px 11px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: tempP === 'AM' ? '#fff' : '#374151', background: tempP === 'AM' ? '#1c1c1e' : 'transparent', border: `1px solid ${tempP === 'AM' ? '#374151' : '#111'}` }}>AM</button>
                                    <button type="button" onClick={() => setTempP('PM')} style={{ padding: '5px 11px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: tempP === 'PM' ? '#fff' : '#374151', background: tempP === 'PM' ? '#1c1c1e' : 'transparent', border: `1px solid ${tempP === 'PM' ? '#374151' : '#111'}` }}>PM</button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 18px 14px' }}>
                                <div ref={clockRef}
                                    onTouchStart={(e) => calcularValorDesdeTouch(e.touches[0].clientX, e.touches[0].clientY)}
                                    onTouchMove={(e) => calcularValorDesdeTouch(e.touches[0].clientX, e.touches[0].clientY)}
                                    onTouchEnd={() => { if (modo === 'hora') setTimeout(() => setModo('minutos'), 200); }}
                                    style={{ position: 'relative', width: CLOCK_SIZE, height: CLOCK_SIZE, borderRadius: '50%', background: '#111', border: '1px solid #1c1c1e', touchAction: 'none' }}>
                                    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={CLOCK_SIZE} height={CLOCK_SIZE}>
                                        <line x1={CLOCK_CENTER} y1={CLOCK_CENTER} x2={CLOCK_CENTER + selX} y2={CLOCK_CENTER + selY} stroke="#4b5563" strokeWidth="2" strokeLinecap="round" />
                                        <circle cx={CLOCK_CENTER} cy={CLOCK_CENTER} r="3" fill="#6b7280" />
                                        <circle cx={CLOCK_CENTER + selX} cy={CLOCK_CENTER + selY} r="20" fill="#ffffff" fillOpacity="0.06" />
                                    </svg>
                                    {modo === 'hora'
                                        ? horasReloj.map((num, i) => { const { x, y } = getPosReloj(i); return (
                                            <button key={num} type="button" onClick={() => handleSelectHora(num)} style={{ position: 'absolute', left: CLOCK_CENTER + x - CLOCK_BTN_HALF, top: CLOCK_CENTER + y - CLOCK_BTN_HALF, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: num === tempH ? '#000' : '#6b7280', background: num === tempH ? '#fff' : 'transparent', border: 'none', cursor: 'pointer', zIndex: 1, userSelect: 'none' }}>{num}</button>
                                        ); })
                                        : minutosReloj.map((num, i) => { const { x, y } = getPosReloj(i); return (
                                            <button key={num} type="button" onClick={() => setTempM(num)} style={{ position: 'absolute', left: CLOCK_CENTER + x - CLOCK_BTN_HALF, top: CLOCK_CENTER + y - CLOCK_BTN_HALF, width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: num === tempM ? '#000' : '#6b7280', background: num === tempM ? '#fff' : 'transparent', border: 'none', cursor: 'pointer', zIndex: 1, userSelect: 'none' }}>{num.toString().padStart(2, '0')}</button>
                                        ); })
                                    }
                                </div>
                            </div>
                            <div style={{ padding: '0 22px 22px' }}>
                                <button type="button" onClick={() => { onChange(formatearHoraStr(tempH, tempM, tempP)); setPickerMovilAbierto(false); }}
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
    }

    // Desktop: NumberInput + AM/PM dropdown
    return (
        <div className="flex items-center gap-1.5">
            <NumberInput value={h} min={1} max={12} onChange={(newH) => handleChange(newH, m, p)} />
            <span className="text-lg font-bold text-slate-400">:</span>
            <NumberInput value={m} min={0} max={55} step={5} onChange={(newM) => handleChange(h, newM, p)} />
            <div className="relative">
                <div ref={buttonRef} onClick={() => setDropdownAbierto(!dropdownAbierto)}
                    className="w-20 lg:w-16 2xl:w-20 flex items-center justify-center h-11 lg:h-10 2xl:h-11 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 border-2 border-slate-300"
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                    <span className="text-base lg:text-sm 2xl:text-base font-medium text-slate-800">{p}</span>
                    <ChevronDown className={`w-4 h-4 ml-1 text-slate-500 transition-transform ${dropdownAbierto ? 'rotate-180' : ''}`} />
                </div>
                {dropdownAbierto && createPortal(
                    <div ref={dropdownRef} className="bg-white rounded-lg shadow-xl overflow-hidden z-9999"
                        style={{ position: 'fixed', top: `${posicion.top}px`, left: `${posicion.left}px`, width: `${posicion.width}px`, border: '2px solid #cbd5e1' }}>
                        <button type="button" onClick={() => { handleChange(h, m, 'AM'); setDropdownAbierto(false); }}
                            className={`w-full px-4 py-2.5 text-center text-base lg:text-sm 2xl:text-base font-medium cursor-pointer ${p === 'AM' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-white text-slate-700 hover:bg-slate-200'}`}>AM</button>
                        <button type="button" onClick={() => { handleChange(h, m, 'PM'); setDropdownAbierto(false); }}
                            className={`w-full px-4 py-2.5 text-center text-base lg:text-sm 2xl:text-base font-medium cursor-pointer ${p === 'PM' ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'bg-white text-slate-700 hover:bg-slate-200'}`}>PM</button>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
}

// =============================================================================
// NUMBER INPUT (DESKTOP) — idéntico a Mi Perfil
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
            <input id={inputId} name={inputId} type="number" value={value.toString().padStart(2, '0')} onChange={handleChange}
                className="w-full text-center text-base lg:text-sm 2xl:text-base font-medium h-11 lg:h-10 2xl:h-11 px-3 bg-slate-100 rounded-lg focus:outline-none border-2 border-slate-300"
                style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }} />
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button type="button" onClick={increment} className="w-5 h-4 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 flex items-center justify-center cursor-pointer">
                    <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button type="button" onClick={decrement} className="w-5 h-4 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 flex items-center justify-center cursor-pointer">
                    <svg className="w-3 h-3 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
            </div>
        </div>
    );
}

export default PasoHorarios;