/**
 * puntos.controller.ts
 * =====================
 * Controlador para los endpoints de Configuración de Puntos.
 * 
 * Ubicación: apps/api/src/controllers/puntos.controller.ts
 */

import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { usuarios, negocioSucursales } from '../db/schemas/schema.js';
import {
    actualizarConfigPuntosSchema,
    formatearErroresZod,
} from '../validations/puntos.schema.js';
import {
    obtenerConfigPuntos,
    actualizarConfigPuntos,
} from '../services/puntos.service.js';

// =============================================================================
// FUNCIÓN AUXILIAR: OBTENER NEGOCIO DEL USUARIO
// =============================================================================

interface DatosNegocioUsuario {
    negocioId: string | null;
    esDueno: boolean;
    esGerente: boolean;
}

async function obtenerNegocioDelUsuario(usuarioId: string): Promise<DatosNegocioUsuario> {
    const [usuario] = await db
        .select({
            negocioId: usuarios.negocioId,
            sucursalAsignada: usuarios.sucursalAsignada,
            tieneModoComercial: usuarios.tieneModoComercial,
        })
        .from(usuarios)
        .where(eq(usuarios.id, usuarioId))
        .limit(1);

    if (!usuario || !usuario.tieneModoComercial) {
        return { negocioId: null, esDueno: false, esGerente: false };
    }

    // Si tiene negocioId directo → es dueño
    if (usuario.negocioId) {
        return {
            negocioId: usuario.negocioId,
            esDueno: true,
            esGerente: false
        };
    }

    // Si tiene sucursalAsignada → es gerente, buscar negocio de la sucursal
    if (usuario.sucursalAsignada) {
        const [sucursalInfo] = await db
            .select({ negocioId: negocioSucursales.negocioId })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.id, usuario.sucursalAsignada))
            .limit(1);

        if (sucursalInfo) {
            return {
                negocioId: sucursalInfo.negocioId,
                esDueno: false,
                esGerente: true
            };
        }
    }

    return { negocioId: null, esDueno: false, esGerente: false };
}

// =============================================================================
// CONTROLLER 1: OBTENER CONFIGURACIÓN DE PUNTOS
// =============================================================================

/**
 * GET /api/puntos/configuracion
 * 
 * Obtiene la configuración de puntos del negocio.
 * Requiere autenticación y modo comercial activo.
 */
export async function obtenerConfigPuntosController(req: Request, res: Response): Promise<void> {
    // ---------------------------------------------------------------------------
    // Paso 1: Verificar autenticación
    // ---------------------------------------------------------------------------
    if (!req.usuario) {
        res.status(401).json({
            success: false,
            message: 'No autenticado',
        });
        return;
    }

    // ---------------------------------------------------------------------------
    // Paso 2: Obtener negocioId del usuario
    // ---------------------------------------------------------------------------
    const datosNegocio = await obtenerNegocioDelUsuario(req.usuario.usuarioId);

    if (!datosNegocio.negocioId) {
        res.status(403).json({
            success: false,
            message: 'No tienes un negocio asociado',
        });
        return;
    }

    // ---------------------------------------------------------------------------
    // Paso 3: Llamar al servicio
    // ---------------------------------------------------------------------------
    const resultado = await obtenerConfigPuntos(datosNegocio.negocioId);

    // ---------------------------------------------------------------------------
    // Paso 4: Responder
    // ---------------------------------------------------------------------------
    res.status(resultado.code ?? 200).json({
        success: resultado.success,
        message: resultado.message,
        data: resultado.data,
    });
}

// =============================================================================
// CONTROLLER 2: ACTUALIZAR CONFIGURACIÓN DE PUNTOS
// =============================================================================

/**
 * PUT /api/puntos/configuracion
 * 
 * Actualiza la configuración de puntos del negocio.
 * Solo el dueño puede modificar la configuración.
 */
export async function actualizarConfigPuntosController(req: Request, res: Response): Promise<void> {
    // ---------------------------------------------------------------------------
    // Paso 1: Verificar autenticación
    // ---------------------------------------------------------------------------
    if (!req.usuario) {
        res.status(401).json({
            success: false,
            message: 'No autenticado',
        });
        return;
    }

    // ---------------------------------------------------------------------------
    // Paso 2: Obtener negocioId y verificar que sea dueño
    // ---------------------------------------------------------------------------
    const datosNegocio = await obtenerNegocioDelUsuario(req.usuario.usuarioId);

    if (!datosNegocio.negocioId) {
        res.status(403).json({
            success: false,
            message: 'No tienes un negocio asociado',
        });
        return;
    }

    if (!datosNegocio.esDueno) {
        res.status(403).json({
            success: false,
            message: 'Solo el dueño puede modificar la configuración de puntos',
        });
        return;
    }

    // ---------------------------------------------------------------------------
    // Paso 3: Validar datos con Zod
    // ---------------------------------------------------------------------------
    const validacion = actualizarConfigPuntosSchema.safeParse(req.body);

    if (!validacion.success) {
        res.status(400).json({
            success: false,
            message: 'Datos inválidos',
            errors: formatearErroresZod(validacion.error),
        });
        return;
    }

    // ---------------------------------------------------------------------------
    // Paso 4: Llamar al servicio
    // ---------------------------------------------------------------------------
    const resultado = await actualizarConfigPuntos(datosNegocio.negocioId, validacion.data);

    // ---------------------------------------------------------------------------
    // Paso 5: Responder
    // ---------------------------------------------------------------------------
    res.status(resultado.code ?? 200).json({
        success: resultado.success,
        message: resultado.message,
        data: resultado.data,
    });
}