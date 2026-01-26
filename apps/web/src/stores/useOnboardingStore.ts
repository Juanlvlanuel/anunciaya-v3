/**
 * useOnboardingStore.ts
 * =====================
 * Zustand Store para manejar el estado del Wizard de Onboarding.
 * 
 * ¿Qué hace este store?
 * - Maneja los 8 pasos del onboarding
 * - Guarda progreso en localStorage
 * - Se comunica con el backend para guardar cada paso
 * - Permite continuar donde se quedó el usuario
 * 
 * Ubicación: apps/web/src/stores/useOnboardingStore.ts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/services/api';
import { notificar } from '@/utils/notificaciones';
import { useAuthStore } from './useAuthStore';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Progreso del onboarding (respuesta del backend)
 */
interface ProgresoOnboarding {
    paso1Completo: boolean;
    paso2Completo: boolean;
    paso3Completo: boolean;
    paso4Completo: boolean;
    paso5Completo: boolean;
    paso6Completo: boolean;
    paso7Completo: boolean;
    paso8Completo: boolean;
    onboardingCompletado: boolean;
    negocio: {
        id: string;
        nombre: string;
        esBorrador: boolean;
    };
}

/**
 * Datos de negocio del usuario (respuesta de /mi-negocio)
 */
interface MiNegocio {
    id: string;
    nombre: string;
    esBorrador: boolean;
    onboardingCompletado: boolean;
}

/**
 * Horario de un día
 */
interface Horario {
    diaSemana: number; // 0-6 (Domingo-Sábado)
    abierto: boolean;
    horaApertura?: string;
    horaCierre?: string;
    tieneHorarioComida?: boolean;
    comidaInicio?: string;
    comidaFin?: string;
}

/**
 * Artículo/Producto
 */
interface Articulo {
    tipo: 'producto' | 'servicio';
    nombre: string;
    descripcion: string;
    precioBase: number;
    imagenPrincipal: string;
    disponible: boolean;
}

/**
 * Estado del store
 */
interface OnboardingState {
    // =========================================================================
    // ESTADO
    // =========================================================================

    /** ID del negocio borrador (se obtiene del backend) */
    negocioId: string | null;

    /** ID de la sucursal principal (se obtiene en Paso 2) */
    sucursalId: string | null;

    /** Paso actual del wizard (1-8) */
    pasoActual: number;

    /** Array de pasos completados [paso1, paso2, ...paso8] */
    pasosCompletados: boolean[];

    /** Indica si se está cargando algo */
    cargando: boolean;

    /** Indica si el onboarding está completado */
    completado: boolean;

    /** Indica si el botón "Siguiente" debe estar deshabilitado */
    siguienteDeshabilitado: boolean;

    // =========================================================================
    // FUNCIONES DE INICIALIZACIÓN
    // =========================================================================

    /**
     * Inicializa el onboarding obteniendo negocioId y progreso del backend
     */
    inicializarOnboarding: () => Promise<void>;

    // =========================================================================
    // FUNCIONES DE NAVEGACIÓN
    // =========================================================================

    /**
     * Ir a un paso específico (solo si los pasos anteriores están completos)
     */
    irAPaso: (numeroPaso: number) => void;

    /**
     * Avanzar al siguiente paso
     */
    siguiente: () => Promise<void>;

    /**
     * Retroceder al paso anterior
     */
    atras: () => void;

    // =========================================================================
    // FUNCIONES PARA GUARDAR CADA PASO
    // =========================================================================

    /** Paso 1: Asignar subcategorías */
    guardarPaso1: (datos: {
        nombre: string;
        subcategoriasIds: number[]
    }) => Promise<void>;

    /** Paso 2: Crear sucursal principal (ubicación) */
    guardarPaso2: (datos: {
        ciudad: string;
        direccion: string;
        latitud: number;
        longitud: number;
        zonaHoraria: string;
    }) => Promise<void>;

    /** Paso 3: Actualizar contacto */
    guardarPaso3: (datos: {
        telefono?: string;
        whatsapp?: string;
        correo?: string;
        sitioWeb?: string;
    }) => Promise<void>;

    /** Paso 4: Guardar horarios */
    guardarPaso4: (horarios: Horario[]) => Promise<void>;

    /** Paso 5: Actualizar imágenes (logo, portada, galería) */
    guardarPaso5: (datos: {
        logoUrl?: string;
        portadaUrl?: string;
        galeriaUrls?: string[];
    }) => Promise<void>;

    /** Paso 6: Guardar métodos de pago */
    guardarPaso6: (metodosPago: string[]) => Promise<void>;

    /** Paso 7: Configurar participación en puntos */
    guardarPaso7: (participaPuntos: boolean) => Promise<void>;

    /** Paso 8: Crear artículos iniciales */
    guardarPaso8: (articulos: Articulo[]) => Promise<void>;

    // =========================================================================
    // FUNCIONES PARA GUARDAR BORRADORES (SIN VALIDACIÓN)
    // =========================================================================

    /** Guardar borrador Paso 1 (sin validar) */
    guardarBorradorPaso1: (datos: {
        nombre?: string;
        subcategoriasIds?: number[]
    }) => Promise<void>;

    /** Guardar borrador Paso 2 (sin validar) */
    guardarBorradorPaso2: (datos: {
        ciudad?: string;
        direccion?: string;
        latitud?: number;
        longitud?: number;
        zonaHoraria?: string;
    }) => Promise<void>;

    /** Guardar borrador Paso 3 (sin validar) */
    guardarBorradorPaso3: (datos: {
        telefono?: string;
        whatsapp?: string;
        correo?: string;
        sitioWeb?: string;
    }) => Promise<void>;

    /** Guardar borrador Paso 4 (sin validar) */
    guardarBorradorPaso4: (horarios?: Horario[]) => Promise<void>;

    /** Guardar borrador Paso 5 (sin validar) */
    guardarBorradorPaso5: (datos: {
        logoUrl?: string;
        portadaUrl?: string;
        galeriaUrls?: string[];
    }) => Promise<void>;

    /** Guardar borrador Paso 6 (sin validar) */
    guardarBorradorPaso6: (metodosPago?: string[]) => Promise<void>;

    /** Guardar borrador Paso 7 (sin validar) */
    guardarBorradorPaso7: (participaPuntos?: boolean) => Promise<void>;

    /** Guardar borrador Paso 8 (sin validar) */
    guardarBorradorPaso8: (articulos?: Articulo[]) => Promise<void>;

    // =========================================================================
    // FINALIZACIÓN
    // =========================================================================

    /**
     * Finalizar onboarding (valida y publica el negocio)
     */
    finalizarOnboarding: (usuarioId: string) => Promise<void>;

    // =========================================================================
    // UTILIDADES
    // =========================================================================

    /**
         * Resetear el store (útil para testing o logout)
         */
    reset: () => void;

    /**
     * Actualiza si el botón "Siguiente" debe estar deshabilitado
     */
    setSiguienteDeshabilitado: (deshabilitado: boolean) => void;

    /**
 * Actualiza el estado de completado de un paso específico
 */
    actualizarPasoCompletado: (indice: number, completado: boolean) => void;
}

// =============================================================================
// ESTADO INICIAL
// =============================================================================

const estadoInicial = {
    negocioId: null,
    sucursalId: null,
    pasoActual: 1,
    pasosCompletados: [false, false, false, false, false, false, false, false],
    cargando: false,
    completado: false,
    siguienteDeshabilitado: false,
};

// =============================================================================
// STORE
// =============================================================================

export const useOnboardingStore = create<OnboardingState>()(
    persist(
        (set, get) => ({
            // Estado inicial
            ...estadoInicial,

            // =====================================================================
            // INICIALIZACIÓN
            // =====================================================================

            inicializarOnboarding: async () => {
                try {
                    // PASO 1: Obtener negocio del usuario
                    const respuestaMiNegocio = await api.get<{
                        success: boolean;
                        data: MiNegocio | null;
                    }>('/onboarding/mi-negocio');

                    if (!respuestaMiNegocio.data.success) {
                        throw new Error('Error al obtener negocio');
                    }

                    const miNegocio = respuestaMiNegocio.data.data;

                    // Si no tiene negocio, algo está mal
                    if (!miNegocio) {
                        notificar.error('No se encontró un negocio asociado a tu cuenta');
                        return;
                    }

                    // PASO 2: Obtener progreso del onboarding
                    const respuestaProgreso = await api.get<{
                        success: boolean;
                        data: ProgresoOnboarding;
                    }>(`/onboarding/${miNegocio.id}/progreso`);

                    if (!respuestaProgreso.data.success) {
                        throw new Error('Error al obtener progreso');
                    }

                    const progreso = respuestaProgreso.data.data;

                    // PASO 3: Actualizar estado del store
                    const pasosCompletados = [
                        progreso.paso1Completo,
                        progreso.paso2Completo,
                        progreso.paso3Completo,
                        progreso.paso4Completo,
                        progreso.paso5Completo,
                        progreso.paso6Completo,
                        progreso.paso7Completo,
                        progreso.paso8Completo,
                    ];

                    // Determinar en qué paso debe estar el usuario
                    let pasoActual = 1;
                    for (let i = 0; i < pasosCompletados.length; i++) {
                        if (!pasosCompletados[i]) {
                            pasoActual = i + 1;
                            break;
                        }
                    }

                    // Si todos los pasos están completos, ir al paso 8
                    if (pasosCompletados.every((p) => p === true)) {
                        pasoActual = 8;
                    }

                    // ✅ UN SOLO SET - Todos los cambios juntos
                    set({
                        negocioId: miNegocio.id,
                        pasoActual,
                        pasosCompletados,
                        completado: progreso.onboardingCompletado,
                    });
                } catch (error) {
                    console.error('❌ Error al inicializar onboarding:', error);
                    notificar.error('Error al cargar el onboarding');
                    throw error;
                }
            },

            // =====================================================================
            // NAVEGACIÓN
            // =====================================================================

            irAPaso: (numeroPaso: number) => {
                const { pasoActual, pasosCompletados } = get();

                // Validar que el paso esté en rango válido
                if (numeroPaso < 1 || numeroPaso > 8) {
                    console.warn('Paso fuera de rango:', numeroPaso);
                    return;
                }

                // Validar que no sea el mismo paso actual
                if (numeroPaso === pasoActual) {
                    return;
                }

                // Determinar dirección del movimiento
                const esRetroceso = numeroPaso < pasoActual;
                const esAvance = numeroPaso > pasoActual;

                // REGLAS:
                // 1. Retroceder SIEMPRE está permitido
                // 2. Avanzar solo si el paso actual está completo
                if (esRetroceso) {
                    // Siempre permitir retroceder
                    set({ pasoActual: numeroPaso });
                } else if (esAvance) {
                    // Para avanzar, verificar que el paso actual esté completo
                    const pasoActualCompletado = pasosCompletados[pasoActual - 1];

                    if (pasoActualCompletado) {
                        set({ pasoActual: numeroPaso });
                    } else {
                        notificar.info('Completa el paso actual antes de avanzar');
                    }
                }
            },

            siguiente: async () => {
                const { pasoActual, siguienteDeshabilitado, pasosCompletados } = get();

                // Validar que el formulario esté completo
                if (siguienteDeshabilitado) {
                    notificar.advertencia('Completa todos los campos requeridos antes de continuar');
                    return;
                }

                // Solo avanzar de paso (el guardado lo hace BotonesNavegacion)
                if (pasoActual < 8) {
                    set({ pasoActual: pasoActual + 1 });
                }
            },

            atras: () => {
                const { pasoActual } = get();
                if (pasoActual > 1) {
                    set({ pasoActual: pasoActual - 1 });
                }
            },

            setSiguienteDeshabilitado: (deshabilitado: boolean) => {
                set({ siguienteDeshabilitado: deshabilitado });
            },

            actualizarPasoCompletado: (indice: number, completado: boolean) => {
                set((state) => {
                    const nuevosPasos = [...state.pasosCompletados];
                    nuevosPasos[indice] = completado;
                    return { pasosCompletados: nuevosPasos };
                });
            },

            // =====================================================================
            // GUARDAR PASOS
            // =====================================================================

            guardarPaso1: async (datos) => {
                const { negocioId, pasosCompletados } = get();
                if (!negocioId) return;

                try {
                    set({ cargando: true });

                    // NUEVO ENDPOINT: /paso1 (en lugar de /subcategorias)
                    await api.post(`/onboarding/${negocioId}/paso1`, {
                        nombre: datos.nombre,
                        subcategoriasIds: datos.subcategoriasIds,
                    });

                    // Marcar paso 1 como completado
                    const nuevosCompletados = [...pasosCompletados];
                    nuevosCompletados[0] = true;

                    set({
                        pasosCompletados: nuevosCompletados,
                        cargando: false,
                    });

                    notificar.exito('Información guardada correctamente');
                } catch (error: any) {
                    console.error('Error al guardar paso 1:', error);
                    notificar.error(error.response?.data?.message || 'Error al guardar');
                    set({ cargando: false });
                    throw error;
                }
            },

            guardarPaso2: async (datos) => {
                const { negocioId, pasosCompletados } = get();
                if (!negocioId) return;

                try {
                    set({ cargando: true });

                    const respuesta = await api.put<{  // ✅ CAMBIO: post → put
                        success: boolean;
                        sucursalId: string;
                    }>(`/onboarding/${negocioId}/sucursal`, datos);

                    if (respuesta.data.success) {
                        // Guardar sucursalId para los siguientes pasos
                        const { sucursalId } = respuesta.data;

                        // Marcar paso 2 como completado
                        const nuevosCompletados = [...pasosCompletados];
                        nuevosCompletados[1] = true;

                        set({
                            sucursalId,
                            pasosCompletados: nuevosCompletados,
                            cargando: false,
                        });

                        notificar.exito('Ubicación actualizada correctamente');
                    }
                } catch (error: any) {
                    console.error('Error al guardar paso 2:', error);
                    notificar.error(error.response?.data?.message || 'Error al guardar ubicación');
                    set({ cargando: false });
                    throw error;
                }
            },

            guardarPaso3: async (datos) => {
                const { negocioId, sucursalId, pasosCompletados } = get();
                if (!negocioId) return;

                try {
                    set({ cargando: true });

                    await api.post(`/onboarding/${negocioId}/contacto`, {
                        ...datos,
                        sucursalId, // Necesario para actualizar teléfono/whatsapp de sucursal
                    });

                    // Marcar paso 3 como completado
                    const nuevosCompletados = [...pasosCompletados];
                    nuevosCompletados[2] = true;

                    set({
                        pasosCompletados: nuevosCompletados,
                        cargando: false,
                    });

                    notificar.exito('Contacto guardado correctamente');
                } catch (error: any) {
                    console.error('Error al guardar paso 3:', error);
                    notificar.error(error.response?.data?.message || 'Error al guardar contacto');
                    set({ cargando: false });
                    throw error;
                }
            },

            guardarPaso4: async (horarios) => {
                const { negocioId, sucursalId, pasosCompletados } = get();
                if (!negocioId || !sucursalId) return;

                try {
                    set({ cargando: true });

                    await api.post(`/onboarding/${negocioId}/horarios`, {
                        sucursalId,
                        horarios,
                    });

                    // Marcar paso 4 como completado
                    const nuevosCompletados = [...pasosCompletados];
                    nuevosCompletados[3] = true;

                    set({
                        pasosCompletados: nuevosCompletados,
                        cargando: false,
                    });

                    notificar.exito('Horarios guardados correctamente');
                } catch (error: any) {
                    console.error('Error al guardar paso 4:', error);
                    notificar.error(error.response?.data?.message || 'Error al guardar horarios');
                    set({ cargando: false });
                    throw error;
                }
            },

            guardarPaso5: async (datos) => {
                const { negocioId, sucursalId, pasosCompletados } = get();  // ← CAMBIO: Agregado sucursalId
                if (!negocioId) return;

                try {
                    set({ cargando: true });

                    // Guardar logo (obligatorio)
                    if (datos.logoUrl) {
                        await api.post(`/onboarding/${negocioId}/logo`, {
                            logoUrl: datos.logoUrl,
                        });
                    }

                    // Guardar portada (opcional)
                    if (datos.portadaUrl) {
                        await api.post(`/onboarding/${negocioId}/portada`, {
                            sucursalId,          // ← CAMBIO: Agregado sucursalId
                            portadaUrl: datos.portadaUrl,
                        });
                    }

                    // Marcar paso 5 como completado
                    const nuevosCompletados = [...pasosCompletados];
                    nuevosCompletados[4] = true;

                    set({
                        pasosCompletados: nuevosCompletados,
                        cargando: false,
                    });

                    notificar.exito('Imágenes guardadas correctamente');
                } catch (error: any) {
                    console.error('Error al guardar paso 5:', error);
                    notificar.error(error.response?.data?.message || 'Error al guardar imágenes');
                    set({ cargando: false });
                    throw error;
                }
            },

            guardarPaso6: async (metodosPago) => {
                const { negocioId, sucursalId, pasosCompletados } = get();  // ← CAMBIO 1
                if (!negocioId) return;

                try {
                    set({ cargando: true });

                    await api.post(`/onboarding/${negocioId}/metodos-pago`, {
                        sucursalId,      // ← CAMBIO 2
                        metodos: [...new Set(metodosPago)],
                    });

                    // Marcar paso 6 como completado
                    const nuevosCompletados = [...pasosCompletados];
                    nuevosCompletados[5] = true;

                    set({
                        pasosCompletados: nuevosCompletados,
                        cargando: false,
                    });

                    notificar.exito('Métodos de pago guardados correctamente');
                } catch (error: any) {
                    console.error('Error al guardar paso 6:', error);
                    notificar.error(error.response?.data?.message || 'Error al guardar métodos de pago');
                    set({ cargando: false });
                    throw error;
                }
            },

            guardarPaso7: async (participaPuntos) => {
                const { negocioId, pasosCompletados } = get();
                if (!negocioId) return;

                try {
                    set({ cargando: true });

                    await api.post(`/onboarding/${negocioId}/puntos`, {
                        participaPuntos,
                    });

                    // Marcar paso 7 como completado
                    const nuevosCompletados = [...pasosCompletados];
                    nuevosCompletados[6] = true;

                    set({
                        pasosCompletados: nuevosCompletados,
                        cargando: false,
                    });

                    notificar.exito('Configuración de puntos guardada');
                } catch (error: any) {
                    console.error('Error al guardar paso 7:', error);
                    notificar.error(error.response?.data?.message || 'Error al guardar configuración');
                    set({ cargando: false });
                    throw error;
                }
            },
            guardarPaso8: async (articulos) => {
                const { negocioId, sucursalId, pasosCompletados } = get();  // ← AGREGAR sucursalId
                if (!negocioId) return;

                try {
                    set({ cargando: true });

                    // Guardar artículos (permite 1+)
                    // La validación de mínimo 3 solo aplica al finalizar/publicar
                    await api.post(`/onboarding/${negocioId}/articulos`, {
                        sucursalId,     // ← AGREGAR ESTA LÍNEA
                        articulos,
                    });

                    // Marcar paso 8 como completado
                    const nuevosCompletados = [...pasosCompletados];
                    nuevosCompletados[7] = true;

                    set({
                        pasosCompletados: nuevosCompletados,
                        cargando: false,
                    });

                } catch (error: any) {
                    console.error('Error al guardar paso 8:', error);
                    notificar.error(error.response?.data?.message || 'Error al guardar productos');
                    set({ cargando: false });
                    throw error;
                }
            },

            // =====================================================================
            // FUNCIONES DE BORRADOR (GUARDAR SIN VALIDACIÓN)
            // =====================================================================

            guardarBorradorPaso1: async (datos) => {
                const { negocioId } = get();
                if (!negocioId) return;

                try {
                    await api.patch(`/onboarding/${negocioId}/paso1/draft`, datos);
                } catch (error) {
                    console.error('Error al guardar borrador paso 1:', error);
                    // Silencioso - no mostrar error al usuario
                }
            },

            guardarBorradorPaso2: async (datos) => {
                const { negocioId } = get();
                if (!negocioId) return;

                try {
                    await api.patch(`/onboarding/${negocioId}/sucursal/draft`, datos);
                } catch (error) {
                    console.error('Error al guardar borrador paso 2:', error);
                }
            },

            guardarBorradorPaso3: async (datos) => {
                const { negocioId } = get();
                if (!negocioId) return;

                try {
                    await api.patch(`/onboarding/${negocioId}/contacto/draft`, datos);
                } catch (error) {
                    console.error('Error al guardar borrador paso 3:', error);
                }
            },

            guardarBorradorPaso4: async (horarios) => {
                const { negocioId } = get();
                if (!negocioId) return;

                try {
                    await api.patch(`/onboarding/${negocioId}/horarios/draft`, {
                        horarios: horarios || []
                    });
                } catch (error) {
                    console.error('Error al guardar borrador paso 4:', error);
                }
            },

            guardarBorradorPaso5: async (datos) => {
                const { negocioId } = get();
                if (!negocioId) return;

                try {
                    // Logo
                    if (datos.logoUrl !== undefined) {
                        await api.patch(`/onboarding/${negocioId}/logo/draft`, {
                            logoUrl: datos.logoUrl
                        });
                    }

                    // Portada
                    if (datos.portadaUrl !== undefined) {
                        await api.patch(`/onboarding/${negocioId}/portada/draft`, {
                            portadaUrl: datos.portadaUrl
                        });
                    }

                } catch (error) {
                    console.error('Error al guardar borrador paso 5:', error);
                }
            },

            guardarBorradorPaso6: async (metodosPago) => {
                const { negocioId, sucursalId } = get();
                if (!negocioId) return;

                try {
                    await api.patch(`/onboarding/${negocioId}/metodos-pago/draft`, {
                        sucursalId,
                        metodos: metodosPago || []
                    });
                } catch (error) {
                    console.error('Error al guardar borrador paso 6:', error);
                }
            },

            guardarBorradorPaso7: async (participaPuntos) => {
                const { negocioId } = get();
                if (!negocioId) return;

                try {
                    await api.patch(`/onboarding/${negocioId}/puntos/draft`, {
                        participaPuntos
                    });
                } catch (error) {
                    console.error('Error al guardar borrador paso 7:', error);
                }
            },

            guardarBorradorPaso8: async (articulos) => {
                const { negocioId } = get();
                if (!negocioId) return;

                try {
                    await api.patch(`/onboarding/${negocioId}/articulos/draft`, {
                        articulos: articulos || []
                    });
                } catch (error) {
                    console.error('Error al guardar borrador paso 8:', error);
                }
            },

            // =====================================================================
            // FINALIZACIÓN
            // =====================================================================

            // Función finalizarOnboarding (línea 686):
            finalizarOnboarding: async (usuarioId: string) => {
                const { negocioId } = get();
                if (!negocioId) return;

                try {
                    set({ cargando: true });

                    await api.post(`/onboarding/${negocioId}/finalizar`, {
                        usuarioId,
                    });

                    set({
                        completado: true,
                        cargando: false,
                    });

                    // ✅ RECARGAR datos del usuario
                    const { recargarDatosUsuario } = useAuthStore.getState();
                    await recargarDatosUsuario();

                    notificar.exito('¡Bienvenido! Tu negocio ya está publicado');
                } catch (error: any) {
                    console.error('Error al finalizar onboarding:', error);
                    notificar.error(
                        error.response?.data?.message || 'Error al finalizar onboarding'
                    );
                    set({ cargando: false });
                    throw error;
                }
            },

            // =====================================================================
            // UTILIDADES
            // =====================================================================

            reset: () => {
                set(estadoInicial);
            },
        }),
        {
            name: 'onboarding-storage',
            partialize: (state) => ({
                negocioId: state.negocioId,
                sucursalId: state.sucursalId,
                pasoActual: state.pasoActual,
                pasosCompletados: state.pasosCompletados,
                completado: state.completado,
            }),
        }
    )
);

export default useOnboardingStore;