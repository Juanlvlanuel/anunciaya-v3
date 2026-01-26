/**
 * puntos.service.ts
 * ==================
 * Lógica de negocio para la configuración de puntos.
 * 
 * Ubicación: apps/api/src/services/puntos.service.ts
 */

import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { puntosConfiguracion } from '../db/schemas/schema.js';
import type { ActualizarConfigPuntosInput } from '../validations/puntos.schema.js';

// =============================================================================
// TIPOS DE RESPUESTA
// =============================================================================

interface RespuestaServicio<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    code?: number;
}

interface ConfigPuntosCompleta {
    puntosPorPeso: number;
    minimoCompra: number;
    diasExpiracionPuntos: number;
    diasExpiracionVoucher: number;
    validarHorario: boolean;
    horarioInicio: string;
    horarioFin: string;
    activo: boolean;
    nivelesActivos: boolean;
    nivelBronce: {
        min: number;
        max: number;
        multiplicador: number;
        nombre: string | null;
    };
    nivelPlata: {
        min: number;
        max: number;
        multiplicador: number;
        nombre: string | null;
    };
    nivelOro: {
        min: number;
        multiplicador: number;
        nombre: string | null;
    };
}

// =============================================================================
// FUNCIÓN 1: OBTENER CONFIGURACIÓN DE PUNTOS
// =============================================================================

/**
 * Obtiene la configuración de puntos del negocio.
 * 
 * @param negocioId - ID del negocio
 * @returns Configuración de puntos
 */
export async function obtenerConfigPuntos(
    negocioId: string
): Promise<RespuestaServicio<ConfigPuntosCompleta>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Buscar configuración existente
        // -------------------------------------------------------------------------
        const [config] = await db
            .select()
            .from(puntosConfiguracion)
            .where(eq(puntosConfiguracion.negocioId, negocioId))
            .limit(1);

        // Si no existe, retornar valores por defecto
        if (!config) {
            return {
                success: true,
                message: 'Configuración por defecto (no configurada aún)',
                data: {
                    puntosPorPeso: 1.0,
                    minimoCompra: 0,
                    diasExpiracionPuntos: 90,
                    diasExpiracionVoucher: 30,
                    validarHorario: true,
                    horarioInicio: '09:00:00',
                    horarioFin: '22:00:00',
                    activo: true,
                    nivelesActivos: true,
                    nivelBronce: {
                        min: 0,
                        max: 999,
                        multiplicador: 1.0,
                        nombre: null,
                    },
                    nivelPlata: {
                        min: 1000,
                        max: 4999,
                        multiplicador: 1.2,
                        nombre: null,
                    },
                    nivelOro: {
                        min: 5000,
                        multiplicador: 1.5,
                        nombre: null,
                    },
                },
                code: 200,
            };
        }

        return {
            success: true,
            message: 'Configuración obtenida',
            data: {
                puntosPorPeso: parseFloat(config.puntosPorPeso),
                minimoCompra: parseFloat(config.minimoCompra),
                diasExpiracionPuntos: config.diasExpiracionPuntos,
                diasExpiracionVoucher: config.diasExpiracionVoucher,
                validarHorario: config.validarHorario,
                horarioInicio: config.horarioInicio,
                horarioFin: config.horarioFin,
                activo: config.activo,
                nivelesActivos: config.nivelesActivos ?? true,
                nivelBronce: {
                    min: config.nivelBronceMin ?? 0,
                    max: config.nivelBronceMax ?? 999,
                    multiplicador: config.nivelBronceMultiplicador ? parseFloat(config.nivelBronceMultiplicador) : 1.0,
                    nombre: config.nivelBronceNombre,
                },
                nivelPlata: {
                    min: config.nivelPlataMin ?? 1000,
                    max: config.nivelPlataMax ?? 4999,
                    multiplicador: config.nivelPlataMultiplicador ? parseFloat(config.nivelPlataMultiplicador) : 1.2,
                    nombre: config.nivelPlataNombre,
                },
                nivelOro: {
                    min: config.nivelOroMin ?? 5000,
                    multiplicador: config.nivelOroMultiplicador ? parseFloat(config.nivelOroMultiplicador) : 1.5,
                    nombre: config.nivelOroNombre,
                },
            },
            code: 200,
        };

    } catch (error) {
        console.error('Error en obtenerConfigPuntos:', error);
        return {
            success: false,
            message: 'Error interno al obtener configuración',
            code: 500,
        };
    }
}

// =============================================================================
// FUNCIÓN 2: ACTUALIZAR CONFIGURACIÓN DE PUNTOS
// =============================================================================

/**
 * Actualiza la configuración de puntos del negocio.
 * Solo el dueño puede modificar la configuración.
 * 
 * @param negocioId - ID del negocio
 * @param datos - Datos a actualizar
 * @returns Configuración actualizada
 */
export async function actualizarConfigPuntos(
    negocioId: string,
    datos: ActualizarConfigPuntosInput
): Promise<RespuestaServicio<ConfigPuntosCompleta>> {
    try {
        // -------------------------------------------------------------------------
        // Paso 1: Buscar configuración existente
        // -------------------------------------------------------------------------
        const [configExistente] = await db
            .select({ id: puntosConfiguracion.id })
            .from(puntosConfiguracion)
            .where(eq(puntosConfiguracion.negocioId, negocioId))
            .limit(1);

        // -------------------------------------------------------------------------
        // Paso 2: Preparar datos para actualizar
        // -------------------------------------------------------------------------
        const datosActualizar: Record<string, unknown> = {};

        // Configuración básica
        if (datos.puntosPorPeso !== undefined) {
            datosActualizar.puntosPorPeso = datos.puntosPorPeso.toString();
        }
        if (datos.minimoCompra !== undefined) {
            datosActualizar.minimoCompra = datos.minimoCompra.toString();
        }
        if (datos.diasExpiracionPuntos !== undefined) {
            datosActualizar.diasExpiracionPuntos = datos.diasExpiracionPuntos;
        }
        if (datos.diasExpiracionVoucher !== undefined) {
            datosActualizar.diasExpiracionVoucher = datos.diasExpiracionVoucher;
        }

        // Horario
        if (datos.validarHorario !== undefined) {
            datosActualizar.validarHorario = datos.validarHorario;
        }
        if (datos.horarioInicio !== undefined) {
            datosActualizar.horarioInicio = datos.horarioInicio;
        }
        if (datos.horarioFin !== undefined) {
            datosActualizar.horarioFin = datos.horarioFin;
        }

        // Estado
        if (datos.activo !== undefined) {
            datosActualizar.activo = datos.activo;
        }

        // Niveles
        if (datos.nivelesActivos !== undefined) {
            datosActualizar.nivelesActivos = datos.nivelesActivos;
        }

        // Nivel Bronce
        if (datos.nivelBronceMin !== undefined) {
            datosActualizar.nivelBronceMin = datos.nivelBronceMin;
        }
        if (datos.nivelBronceMax !== undefined) {
            datosActualizar.nivelBronceMax = datos.nivelBronceMax;
        }
        if (datos.nivelBronceMultiplicador !== undefined) {
            datosActualizar.nivelBronceMultiplicador = datos.nivelBronceMultiplicador.toString();
        }
        if (datos.nivelBronceNombre !== undefined) {
            datosActualizar.nivelBronceNombre = datos.nivelBronceNombre;
        }

        // Nivel Plata
        if (datos.nivelPlataMin !== undefined) {
            datosActualizar.nivelPlataMin = datos.nivelPlataMin;
        }
        if (datos.nivelPlataMax !== undefined) {
            datosActualizar.nivelPlataMax = datos.nivelPlataMax;
        }
        if (datos.nivelPlataMultiplicador !== undefined) {
            datosActualizar.nivelPlataMultiplicador = datos.nivelPlataMultiplicador.toString();
        }
        if (datos.nivelPlataNombre !== undefined) {
            datosActualizar.nivelPlataNombre = datos.nivelPlataNombre;
        }

        // Nivel Oro
        if (datos.nivelOroMin !== undefined) {
            datosActualizar.nivelOroMin = datos.nivelOroMin;
        }
        if (datos.nivelOroMultiplicador !== undefined) {
            datosActualizar.nivelOroMultiplicador = datos.nivelOroMultiplicador.toString();
        }
        if (datos.nivelOroNombre !== undefined) {
            datosActualizar.nivelOroNombre = datos.nivelOroNombre;
        }

        // -------------------------------------------------------------------------
        // Paso 3: Crear o actualizar
        // -------------------------------------------------------------------------
        if (configExistente) {
            // Actualizar existente
            await db
                .update(puntosConfiguracion)
                .set(datosActualizar)
                .where(eq(puntosConfiguracion.negocioId, negocioId));
        } else {
            // Crear nueva con valores por defecto + los enviados
            await db
                .insert(puntosConfiguracion)
                .values({
                    negocioId,
                    puntosPorPeso: (datos.puntosPorPeso ?? 1.0).toString(),
                    minimoCompra: (datos.minimoCompra ?? 0).toString(),
                    diasExpiracionPuntos: datos.diasExpiracionPuntos ?? 90,
                    diasExpiracionVoucher: datos.diasExpiracionVoucher ?? 30,
                    validarHorario: datos.validarHorario ?? true,
                    horarioInicio: datos.horarioInicio ?? '09:00:00',
                    horarioFin: datos.horarioFin ?? '22:00:00',
                    activo: datos.activo ?? true,
                    nivelesActivos: datos.nivelesActivos ?? true,
                    nivelBronceMin: datos.nivelBronceMin ?? 0,
                    nivelBronceMax: datos.nivelBronceMax ?? 999,
                    nivelBronceMultiplicador: (datos.nivelBronceMultiplicador ?? 1.0).toString(),
                    nivelBronceNombre: datos.nivelBronceNombre ?? null,
                    nivelPlataMin: datos.nivelPlataMin ?? 1000,
                    nivelPlataMax: datos.nivelPlataMax ?? 4999,
                    nivelPlataMultiplicador: (datos.nivelPlataMultiplicador ?? 1.2).toString(),
                    nivelPlataNombre: datos.nivelPlataNombre ?? null,
                    nivelOroMin: datos.nivelOroMin ?? 5000,
                    nivelOroMultiplicador: (datos.nivelOroMultiplicador ?? 1.5).toString(),
                    nivelOroNombre: datos.nivelOroNombre ?? null,
                });
        }

        // -------------------------------------------------------------------------
        // Paso 4: Obtener configuración actualizada
        // -------------------------------------------------------------------------
        return await obtenerConfigPuntos(negocioId);

    } catch (error) {
        console.error('Error en actualizarConfigPuntos:', error);
        return {
            success: false,
            message: 'Error interno al actualizar configuración',
            code: 500,
        };
    }
}