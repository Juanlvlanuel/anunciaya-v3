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
import { Info, Banknote, CreditCard, Building2, Loader2, LucideIcon } from 'lucide-react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { api } from '@/services/api';
import { notificar } from '@/utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

interface MetodoPago {
    id: string;
    nombre: string;
    Icono: LucideIcon;
    descripcion: string;
    valor: 'efectivo' | 'tarjeta_debito' | 'transferencia';
    colorBg: string;
    colorText: string;
    colorBorder: string;
    colorBorderSelected: string;
    colorBgSelected: string;
}

const METODOS_PAGO: MetodoPago[] = [
    {
        id: 'efectivo',
        nombre: 'Efectivo',
        Icono: Banknote,
        descripcion: 'Pago en efectivo',
        valor: 'efectivo',
        colorBg: 'bg-green-100',
        colorText: 'text-green-600',
        colorBorder: 'border-green-500',
        colorBorderSelected: 'border-green-500',
        colorBgSelected: 'bg-green-50',
    },
    {
        id: 'tarjeta',
        nombre: 'Tarjeta',
        Icono: CreditCard,
        descripcion: 'Débito o crédito',
        valor: 'tarjeta_debito',
        colorBg: 'bg-blue-100',
        colorText: 'text-blue-600',
        colorBorder: 'border-blue-500',
        colorBorderSelected: 'border-blue-500',
        colorBgSelected: 'bg-blue-50',
    },
    {
        id: 'transferencia',
        nombre: 'Transferencia',
        Icono: Building2,
        descripcion: 'Transferencia bancaria',
        valor: 'transferencia',
        colorBg: 'bg-purple-100',
        colorText: 'text-purple-600',
        colorBorder: 'border-purple-500',
        colorBorderSelected: 'border-purple-500',
        colorBgSelected: 'bg-purple-50',
    },
];

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoMetodosPago() {
    const { negocioId, guardarPaso6, setSiguienteDeshabilitado } = useOnboardingStore();

    // Estados
    const [metodosSeleccionados, setMetodosSeleccionados] = useState<string[]>([]);
    const [cargandoDatos, setCargandoDatos] = useState(true);

    // ---------------------------------------------------------------------------
    // Cargar datos existentes
    // ---------------------------------------------------------------------------
    useEffect(() => {
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
                        .filter((m: any) => m.activo) // Solo los activos
                        .map((m: any) => m.tipo);     // Extraer solo el campo 'tipo'
                    setMetodosSeleccionados(metodosGuardados);
                }
            } catch (error) {
                console.error('Error al cargar datos:', error);
            } finally {
                setCargandoDatos(false);
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
        (window as any).guardarPaso6 = async (validar: boolean): Promise<boolean> => {
            if (validar && !esFormularioValido()) {
                notificar.error('Debes seleccionar al menos 1 método de pago');
                return false;
            }

            try {
                const datos: any = {
                    metodos: metodosSeleccionados.length > 0 ? metodosSeleccionados : null
                };

                if (validar) {
                    await guardarPaso6(datos.metodos as any);
                } else {
                    const { guardarBorradorPaso6 } = useOnboardingStore.getState();
                    await guardarBorradorPaso6(datos.metodos as any);
                }
                return true;
            } catch (error) {
                console.error('Error al guardar paso 6:', error);
                return false;
            }
        };

        return () => {
            delete (window as any).guardarPaso6;
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
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render principal
    // ---------------------------------------------------------------------------
    return (
        <div className="space-y-3 lg:space-y-2.5 2xl:space-y-3">

            {/* Alert informativo */}
            <div className="flex items-start gap-2 lg:gap-2.5 p-2.5 lg:p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="mt-0.5">
                    <Info className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                </div>
                <div>
                    <p className="text-xs lg:text-xs 2xl:text-sm text-blue-800">
                        <span className="font-semibold">Solo informativo:</span> Selecciona los métodos que aceptas. Aparecerán como badges en tu perfil público.
                    </p>
                </div>
            </div>

            {/* Grid de métodos de pago */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-2.5 2xl:gap-3">

                {METODOS_PAGO.map((metodo) => {
                    const isSelected = metodosSeleccionados.includes(metodo.valor);

                    return (
                        <button
                            key={metodo.id}
                            onClick={() => toggleMetodo(metodo.valor)}
                            type="button"
                            className={`
                                group relative p-4 lg:p-3 2xl:p-4 rounded-lg border-2 text-left transition-all
                                ${isSelected
                                    ? `${metodo.colorBorderSelected} ${metodo.colorBgSelected} shadow-sm`
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                }
                            `}
                        >
                            {/* Checkmark */}
                            <div className={`
                                absolute top-3 right-3 w-5 h-5 lg:w-6 lg:h-6 rounded flex items-center justify-center transition-all border-2
                                ${isSelected
                                    ? `${metodo.colorBorder} ${metodo.colorBg}`
                                    : 'border-slate-300 bg-white'
                                }
                            `}>
                                {isSelected && (
                                    <svg className={`w-3 h-3 lg:w-3.5 lg:h-3.5 ${metodo.colorText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>

                            {/* Contenido */}
                            <div className="flex items-center gap-2 lg:gap-1.5 pr-8">
                                {/* Ícono en contenedor */}
                                <div className={`w-6 h-6 rounded-lg ${metodo.colorBg} flex items-center justify-center shrink-0`}>
                                    <metodo.Icono className={`w-5 h-5 ${metodo.colorText}`} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    {/* Nombre */}
                                    <div className="text-sm lg:text-sm font-semibold text-slate-900 mb-0.5">
                                        {metodo.nombre}
                                    </div>
                                    {/* Descripción */}
                                    <div className="text-xs text-slate-600">
                                        {metodo.descripcion}
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}

                {/* Tercero vacío para mantener grid */}
                <div className="hidden lg:block" />
            </div>

            {/* Mensaje de validación */}
            {!esFormularioValido() && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                        Debes seleccionar al menos 1 método de pago
                    </p>
                </div>
            )}
        </div>
    );
}

export default PasoMetodosPago;