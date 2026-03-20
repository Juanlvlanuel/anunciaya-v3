/**
 * PasoMetodosPago.tsx - PASO 6 DEL ONBOARDING
 * ==============================================
 * Métodos de pago aceptados por el negocio
 * 
 * IMPORTANTE:
 * - Los métodos son solo INFORMATIVOS
 * - NO se procesan pagos dentro de la app
 * - Se muestran como badges en el perfil público
 * 
 * MÉTODOS DISPONIBLES:
 * - Efectivo (efectivo)
 * - Tarjeta (tarjeta_debito)
 * - Transferencia (transferencia)
 * 
 * VALIDACIÓN:
 * - Al menos 1 método debe estar seleccionado
 * 
 * CREADO: 25/12/2024
 */

import { useState, useEffect } from 'react';
import { Banknote, CreditCard, ArrowLeftRight, Loader2, Wallet } from 'lucide-react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { api } from '@/services/api';
import { notificar } from '@/utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

interface MetodoPago {
    id: string;
    nombre: string;
    Icono: typeof Banknote;
    descripcion: string;
    valor: 'efectivo' | 'tarjeta_debito' | 'transferencia';
}

const METODOS_PAGO: MetodoPago[] = [
    { id: 'efectivo', nombre: 'Efectivo', Icono: Banknote, descripcion: 'Pagos en efectivo en tu establecimiento', valor: 'efectivo' },
    { id: 'tarjeta', nombre: 'Tarjeta', Icono: CreditCard, descripcion: 'Débito, crédito o pagos con terminal', valor: 'tarjeta_debito' },
    { id: 'transferencia', nombre: 'Transferencia', Icono: ArrowLeftRight, descripcion: 'Transferencias bancarias o apps de pago', valor: 'transferencia' },
];

// =============================================================================
// CACHÉ
// =============================================================================

const cache6 = {
    cargado: false,
    metodosSeleccionados: [] as string[],
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoMetodosPago() {
    const { negocioId, guardarPaso6, setSiguienteDeshabilitado } = useOnboardingStore();

    // Estados — inicializar desde caché
    const [metodosSeleccionados, setMetodosSeleccionados] = useState<string[]>(cache6.metodosSeleccionados);
    const [cargandoDatos, setCargandoDatos] = useState(!cache6.cargado);

    // Sincronizar caché
    useEffect(() => {
        cache6.metodosSeleccionados = metodosSeleccionados;
    }, [metodosSeleccionados]);

    // ---------------------------------------------------------------------------
    // Cargar datos existentes
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (cache6.cargado) { setCargandoDatos(false); return; }
        const cargarDatos = async () => {
            if (!negocioId) {
                setCargandoDatos(false);
                return;
            }

            try {
                const response = await api.get(`/onboarding/${negocioId}/progreso`);
                const datos = response.data.data;

                // Si ya hay métodos de pago guardados, cargarlos
                // El backend regresa: [{ id, negocioId, sucursalId, tipo, activo, instrucciones }, ...]
                if (datos.metodosPago && datos.metodosPago.length > 0) {
                    const metodosGuardados = datos.metodosPago
                        .filter((m: { activo: boolean }) => m.activo)
                        .map((m: { tipo: string }) => m.tipo);
                    setMetodosSeleccionados(metodosGuardados);
                }
            } catch (error) {
                console.error('Error al cargar datos:', error);
            } finally {
                setCargandoDatos(false);
                cache6.cargado = true;
            }
        };

        cargarDatos();
    }, [negocioId]);

    // ---------------------------------------------------------------------------
    // Validación en tiempo real
    // ---------------------------------------------------------------------------
    const esFormularioValido = (): boolean => {
        return metodosSeleccionados.length > 0;
    };

    useEffect(() => {
        const esValido = esFormularioValido();
        setSiguienteDeshabilitado(!esValido);

        // ✅ Actualizar estado de paso completado en tiempo real
        const { actualizarPasoCompletado } = useOnboardingStore.getState();
        actualizarPasoCompletado(5, esValido); // índice 5 = Paso 6
    }, [metodosSeleccionados]);

    // ---------------------------------------------------------------------------
    // Exponer función de guardado
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const guardarFn = async (validar: boolean): Promise<boolean> => {
            if (validar && !esFormularioValido()) {
                notificar.error('Debes seleccionar al menos 1 método de pago');
                return false;
            }

            try {
                const metodos = metodosSeleccionados.length > 0 ? metodosSeleccionados : undefined;

                if (validar) {
                    await guardarPaso6(metodos as Parameters<typeof guardarPaso6>[0]);
                } else {
                    const { guardarBorradorPaso6 } = useOnboardingStore.getState();
                    await guardarBorradorPaso6(metodos as Parameters<typeof guardarBorradorPaso6>[0]);
                }
                return true;
            } catch (error) {
                console.error('Error al guardar paso 6:', error);
                return false;
            }
        };

        (window as unknown as Record<string, unknown>).guardarPaso6 = guardarFn;

        return () => {
            delete (window as unknown as Record<string, unknown>).guardarPaso6;
        };
    }, [metodosSeleccionados]);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const toggleMetodo = (valor: string) => {
        if (metodosSeleccionados.includes(valor)) {
            // Deseleccionar
            setMetodosSeleccionados(prev => prev.filter(m => m !== valor));
        } else {
            // Seleccionar
            setMetodosSeleccionados(prev => [...prev, valor]);
        }
    };

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
    // Render principal — Card estilo Mi Perfil
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-4 lg:space-y-3.5 2xl:space-y-5">

            {/* ================================================================= */}
            {/* CARD: Métodos de Pago — idéntico a Mi Perfil */}
            {/* ================================================================= */}
            <div className="bg-white border-2 border-slate-300 rounded-xl"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="px-3 lg:px-4 py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                        <Wallet className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                    </div>
                    <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Métodos de Pago</span>
                    <span className="text-red-400 ml-0.5">*</span>
                    <span className="ml-auto text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium">Mínimo 1</span>
                </div>

                {/* Lista vertical con toggles */}
                {METODOS_PAGO.map((metodo, index) => {
                    const activo = metodosSeleccionados.includes(metodo.valor);
                    return (
                        <div key={metodo.id}>
                            <div onClick={() => toggleMetodo(metodo.valor)}
                                className="p-3.5 lg:p-2.5 2xl:p-3.5 hover:bg-slate-100 cursor-pointer">
                                <div className="flex items-center justify-between gap-4">
                                    {/* Ícono + Texto */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="p-2 rounded-lg shrink-0 bg-slate-100">
                                            <metodo.Icono className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-slate-500" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-sm lg:text-xs 2xl:text-sm font-bold ${activo ? 'text-slate-700' : 'text-slate-400'}`}>
                                                {metodo.nombre}
                                            </span>
                                            <span className={`text-sm lg:text-xs 2xl:text-sm font-medium truncate ${activo ? 'text-slate-600' : 'text-slate-400'}`}>
                                                {metodo.descripcion}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Toggle */}
                                    <label className="shrink-0 cursor-pointer group" onClick={(e) => e.stopPropagation()}>
                                        <input type="checkbox" checked={activo}
                                            onChange={(e) => { e.stopPropagation(); toggleMetodo(metodo.valor); }}
                                            className="sr-only" />
                                        <div className="relative w-12 h-6 lg:w-10 lg:h-5">
                                            <div className={`absolute inset-0 rounded-full transition-colors ${activo ? 'bg-slate-500' : 'bg-slate-300'}`} />
                                            <div className={`absolute top-0.5 left-0.5 w-5 h-5 lg:w-4 lg:h-4 bg-white rounded-full shadow-md transition-transform ${activo ? 'translate-x-6 lg:translate-x-5' : ''}`} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                            {/* Divider */}
                            {index < METODOS_PAGO.length - 1 && <div className="border-t border-slate-200" />}
                        </div>
                    );
                })}
            </div>

            {/* Alerta */}
            {!esFormularioValido() && (
                <div className="flex items-center gap-2.5 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
                    <p className="text-sm lg:text-xs 2xl:text-sm font-semibold text-red-700">
                        Debes seleccionar al menos un método de pago
                    </p>
                </div>
            )}
        </div>
    );
}

export default PasoMetodosPago;