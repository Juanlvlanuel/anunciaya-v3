/**
 * PasoPuntos.tsx - PASO 7 DEL ONBOARDING
 * ========================================
 * Configuración de participación en sistema de puntos CardYA
 * 
 * IMPORTANTE:
 * - Este paso NO tiene validación obligatoria
 * - El negocio puede elegir participar o no
 * - La configuración detallada se hace después en Business Studio
 * 
 * FUNCIONALIDAD:
 * - Toggle SI/NO para participar en CardYA
 * - Información detallada del sistema
 * - Beneficios para el negocio
 * - Explicación de cómo funciona
 * 
 * VALIDACIÓN:
 * - Ninguna - puede estar en cualquier estado
 * 
 * CREADO: 25/12/2024
 */

import { useState, useEffect } from 'react';
import { Info, Sparkles, Users, TrendingUp, Gift, Check, X, Loader2 } from 'lucide-react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { api } from '@/services/api';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoPuntos() {
    const { negocioId, guardarPaso7, setSiguienteDeshabilitado } = useOnboardingStore();

    // Estados
    const [participaPuntos, setParticipaPuntos] = useState(false);
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

                // Cargar valor de participaPuntos si existe
                if (datos.negocio?.participaPuntos !== undefined) {
                    setParticipaPuntos(datos.negocio.participaPuntos);
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
    // Validación (siempre válido - sin validación obligatoria)
    // ---------------------------------------------------------------------------
    useEffect(() => {
        // Este paso siempre es válido, puede estar en cualquier estado
        setSiguienteDeshabilitado(false);

        // ✅ Actualizar estado de paso completado (siempre válido)
        const { actualizarPasoCompletado } = useOnboardingStore.getState();
        actualizarPasoCompletado(6, true); // índice 6 = Paso 7 - SIEMPRE válido
    }, []);

    // ---------------------------------------------------------------------------
    // Exponer función de guardado
    // ---------------------------------------------------------------------------
    useEffect(() => {
        (window as any).guardarPaso7 = async (validar: boolean): Promise<boolean> => {
            // Este paso no tiene validación obligatoria - siempre es válido
            try {
                if (validar) {
                    await guardarPaso7(participaPuntos as any);
                } else {
                    const { guardarBorradorPaso7 } = useOnboardingStore.getState();
                    await guardarBorradorPaso7(participaPuntos as any);
                }
                return true;
            } catch (error) {
                console.error('Error al guardar paso 7:', error);
                return false;
            }
        };

        return () => {
            delete (window as any).guardarPaso7;
        };
    }, [participaPuntos]);

    // ---------------------------------------------------------------------------
    // Handlers
    // ---------------------------------------------------------------------------
    const togglePuntos = () => {
        setParticipaPuntos(!participaPuntos);
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

            {/* Card: ¿Qué es CardYA? */}
            <div className="bg-white rounded-lg border-2 border-slate-200 p-4 lg:p-5">
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Info className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-lg lg:text-xl font-bold text-slate-900 mb-1">
                            ¿Qué es CardYA?
                        </h2>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Es el sistema de lealtad de AnunciaYA donde tus clientes acumulan puntos por cada compra y pueden canjearlos por recompensas en tu negocio.
                        </p>
                    </div>
                </div>
            </div>

            {/* Toggle Principal */}
            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border-2 border-amber-200 rounded-lg p-4 lg:p-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${participaPuntos ? 'bg-amber-500' : 'bg-slate-200'
                            }`}>
                            {participaPuntos ? (
                                <Sparkles className="w-6 h-6 text-white" />
                            ) : (
                                <X className="w-6 h-6 text-slate-500" />
                            )}
                        </div>
                        <div>
                            <div className="text-base lg:text-lg font-bold text-slate-900">
                                ¿Quieres participar en CardYA?
                            </div>
                            <div className="text-xs lg:text-sm text-slate-600">
                                {participaPuntos ? 'Tus clientes podrán ganar puntos' : 'Puedes activarlo después'}
                            </div>
                        </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                        onClick={togglePuntos}
                        type="button"
                        className={`relative inline-flex h-8 w-14 lg:h-10 lg:w-[4.5rem] items-center rounded-full transition-colors ${participaPuntos ? 'bg-amber-500' : 'bg-slate-300'
                            }`}
                    >
                        <span className={`inline-block h-6 w-6 lg:h-8 lg:w-8 transform rounded-full bg-white transition-transform shadow-md ${participaPuntos ? 'translate-x-7 lg:translate-x-8' : 'translate-x-1'
                            }`} />
                    </button>
                </div>
            </div>

            {/* Información Condicional */}
            {participaPuntos && (
                <div className="space-y-3 lg:space-y-2.5">

                    {/* Beneficios */}
                    <div className="bg-white rounded-lg border-2 border-green-200 p-4 lg:p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <h3 className="text-base lg:text-lg font-bold text-slate-900">
                                Beneficios para tu negocio
                            </h3>
                        </div>
                        <ul className="space-y-2.5">
                            <li className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                <span className="text-sm text-slate-700">
                                    <strong>Clientes recurrentes:</strong> Los puntos incentivan a regresar
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                <span className="text-sm text-slate-700">
                                    <strong>Mayor ticket promedio:</strong> Clientes compran más para ganar puntos
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                <span className="text-sm text-slate-700">
                                    <strong>Fidelización digital:</strong> Tus clientes no olvidan su tarjeta de puntos
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                <span className="text-sm text-slate-700">
                                    <strong>Sin costo adicional:</strong> Solo pagas la membresía de AnunciaYA
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Cómo funciona */}
                    <div className="bg-white rounded-lg border-2 border-blue-200 p-4 lg:p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-600" />
                            </div>
                            <h3 className="text-base lg:text-lg font-bold text-slate-900">
                                ¿Cómo funciona?
                            </h3>
                        </div>
                        <ol className="space-y-2.5">
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-blue-600">1</span>
                                </div>
                                <span className="text-sm text-slate-700">
                                    El cliente realiza una compra en tu negocio
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-blue-600">2</span>
                                </div>
                                <span className="text-sm text-slate-700">
                                    Tú o tu empleado escanean el código QR del cliente con ScanYA
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-blue-600">3</span>
                                </div>
                                <span className="text-sm text-slate-700">
                                    Los puntos se acreditan automáticamente en su CardYA
                                </span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <span className="text-xs font-bold text-blue-600">4</span>
                                </div>
                                <span className="text-sm text-slate-700">
                                    El cliente canjea sus puntos por descuentos en futuras compras
                                </span>
                            </li>
                        </ol>
                    </div>

                    {/* Configuración después */}
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Gift className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-purple-800">
                                    <strong>Configura después:</strong> Podrás definir cuántos puntos otorgas por peso gastado y las recompensas disponibles desde tu Business Studio.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Mensaje cuando está desactivado */}
            {!participaPuntos && (
                <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-4">
                    <p className="text-sm text-slate-600 text-center">
                        No te preocupes, puedes activar CardYA en cualquier momento desde tu Business Studio.
                    </p>
                </div>
            )}
        </div>
    );
}

export default PasoPuntos;