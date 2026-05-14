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
import { Check, Loader2 } from 'lucide-react';
import { Icon, type IconProps } from '@iconify/react';
import { ICONOS } from '@/config/iconos';

// Wrappers locales: íconos migrados a Iconify manteniendo nombres familiares.
type IconoWrapperProps = Omit<IconProps, 'icon'>;
const Star = (p: IconoWrapperProps) => <Icon icon={ICONOS.rating} {...p} />;
const TrendingUp = (p: IconoWrapperProps) => <Icon icon={ICONOS.tendenciaSubida} {...p} />;
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { api } from '@/services/api';

// =============================================================================
// CACHÉ
// =============================================================================

const cache7 = {
    cargado: false,
    participaPuntos: false,
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export function PasoPuntos() {
    const { negocioId, guardarPaso7, setSiguienteDeshabilitado } = useOnboardingStore();

    // Estados — inicializar desde caché
    const [participaPuntos, setParticipaPuntos] = useState(cache7.participaPuntos);
    const [cargandoDatos, setCargandoDatos] = useState(!cache7.cargado);

    // Sincronizar caché
    useEffect(() => { cache7.participaPuntos = participaPuntos; }, [participaPuntos]);

    // ---------------------------------------------------------------------------
    // Cargar datos existentes
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (cache7.cargado) { setCargandoDatos(false); return; }
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
                cache7.cargado = true;
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
        const guardarFn = async (validar: boolean): Promise<boolean> => {
            try {
                if (validar) {
                    await guardarPaso7(participaPuntos as Parameters<typeof guardarPaso7>[0]);
                } else {
                    const { guardarBorradorPaso7 } = useOnboardingStore.getState();
                    await guardarBorradorPaso7(participaPuntos as Parameters<typeof guardarBorradorPaso7>[0]);
                }
                return true;
            } catch (error) {
                console.error('Error al guardar paso 7:', error);
                return false;
            }
        };

        (window as unknown as Record<string, unknown>).guardarPaso7 = guardarFn;

        return () => {
            delete (window as unknown as Record<string, unknown>).guardarPaso7;
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
            {/* CARD: Sistema de Puntos CardYA */}
            {/* ================================================================= */}
            <div className="bg-white border-2 border-slate-300 rounded-xl"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div className="px-3 lg:px-4 py-2 flex items-center justify-between rounded-t-[10px]"
                    style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <div className="flex items-center gap-2 lg:gap-2.5">
                        <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                            <Star className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Sistema de Puntos CardYA</span>
                    </div>
                    <span className="text-sm lg:text-xs 2xl:text-sm text-white/70 font-medium">Opcional</span>
                </div>

                {/* Toggle principal — estilo FilaToggle de Mi Perfil */}
                <div onClick={togglePuntos} className="p-3.5 lg:p-2.5 2xl:p-3.5 hover:bg-slate-100 cursor-pointer">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="p-2 rounded-lg shrink-0 bg-slate-100">
                                <Star className={`w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 ${participaPuntos ? 'text-amber-500' : 'text-slate-500'}`} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className={`text-sm lg:text-xs 2xl:text-sm font-bold ${participaPuntos ? 'text-slate-700' : 'text-slate-400'}`}>
                                    ¿Participar en CardYA?
                                </span>
                                <span className={`text-sm lg:text-xs 2xl:text-sm font-medium ${participaPuntos ? 'text-slate-600' : 'text-slate-400'}`}>
                                    {participaPuntos ? 'Tus clientes podrán ganar puntos' : 'Puedes activarlo después'}
                                </span>
                            </div>
                        </div>

                        <label className="shrink-0 cursor-pointer group" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={participaPuntos}
                                onChange={(e) => { e.stopPropagation(); togglePuntos(); }}
                                className="sr-only" />
                            <div className="relative w-12 h-6 lg:w-10 lg:h-5">
                                <div className={`absolute inset-0 rounded-full transition-colors ${participaPuntos ? 'bg-slate-500' : 'bg-slate-300'}`} />
                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 lg:w-4 lg:h-4 bg-white rounded-full shadow-md transition-transform ${participaPuntos ? 'translate-x-6 lg:translate-x-5' : ''}`} />
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* ================================================================= */}
            {/* CARD: Beneficios (solo si activado) */}
            {/* ================================================================= */}
            {participaPuntos && (
                <div className="bg-white border-2 border-slate-300 rounded-xl"
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="px-3 lg:px-4 py-2 flex items-center gap-2 lg:gap-2.5 rounded-t-[10px]"
                        style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                        <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                            <TrendingUp className="w-4 h-4 2xl:w-5 2xl:h-5 text-white" />
                        </div>
                        <span className="text-sm lg:text-sm 2xl:text-base font-bold text-white">Beneficios para tu negocio</span>
                    </div>
                    <div className="p-4 lg:p-3 2xl:p-4 space-y-3 lg:space-y-2 2xl:space-y-3">
                        {[
                            { titulo: 'Clientes recurrentes', desc: 'Los puntos incentivan a regresar' },
                            { titulo: 'Mayor ticket promedio', desc: 'Clientes compran más para ganar puntos' },
                            { titulo: 'Fidelización digital', desc: 'Tus clientes no olvidan su tarjeta' },
                            { titulo: 'Sin costo adicional', desc: 'Incluido en la membresía de AnunciaYA' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                                <Check className="w-5 h-5 lg:w-4 lg:h-4 2xl:w-5 2xl:h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <p className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-700">
                                    <span className="font-bold">{item.titulo}:</span> {item.desc}
                                </p>
                            </div>
                        ))}

                        {/* Nota */}
                        <div className="p-3 lg:p-2.5 2xl:p-3 bg-slate-200 border-2 border-slate-300 rounded-lg mt-2">
                            <p className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-600 leading-tight">
                                <span className="font-bold text-slate-700">Configura después:</span> Define cuántos puntos otorgas y las recompensas desde Business Studio.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Mensaje desactivado */}
            {!participaPuntos && (
                <div className="p-3 lg:p-2.5 2xl:p-3 bg-slate-200 border-2 border-slate-300 rounded-lg">
                    <p className="text-sm lg:text-sm 2xl:text-base font-medium text-slate-600 text-center">
                        Puedes activar CardYA en cualquier momento desde tu Business Studio.
                    </p>
                </div>
            )}
        </div>
    );
}

export default PasoPuntos;