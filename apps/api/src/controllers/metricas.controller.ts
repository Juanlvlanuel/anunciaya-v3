/**
 * ============================================================================
 * MÉTRICAS CONTROLLER - Controlador de Métricas
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/controllers/metricas.controller.ts
 * 
 * PROPÓSITO:
 * Maneja las peticiones HTTP para registrar y obtener métricas
 */

import { Request, Response } from 'express';
import {
    registrarView,
    registrarShare,
    registrarClick,
    registrarMessage,
    obtenerMetricas,
} from '../services/metricas.service';

// =============================================================================
// REGISTRAR VISTA
// =============================================================================

/**
 * POST /api/metricas/view
 * Registra una vista de una entidad
 * 
 * Body:
 * {
 *   "entityType": "negocio",
 *   "entityId": "uuid"
 * }
 */
export async function registrarViewController(req: Request, res: Response) {
    try {
        const { entityType, entityId } = req.body;

        // Validaciones
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos: entityType, entityId',
            });
        }

        const validEntityTypes = ['sucursal', 'articulo', 'publicacion', 'oferta', 'rifa', 'subasta'];
        if (!validEntityTypes.includes(entityType)) {
            return res.status(400).json({
                success: false,
                message: `entityType no válido. Debe ser uno de: ${validEntityTypes.join(', ')}`,
            });
        }

        const resultado = await registrarView(entityType, entityId);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al registrar vista:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al registrar vista',
        });
    }
}

// =============================================================================
// REGISTRAR COMPARTIDO
// =============================================================================

/**
 * POST /api/metricas/share
 * Registra un compartido de una entidad
 * 
 * Body:
 * {
 *   "entityType": "negocio",
 *   "entityId": "uuid"
 * }
 */
export async function registrarShareController(req: Request, res: Response) {
    try {
        const { entityType, entityId } = req.body;

        // Validaciones
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos: entityType, entityId',
            });
        }

        const resultado = await registrarShare(entityType, entityId);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al registrar compartido:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al registrar compartido',
        });
    }
}

// =============================================================================
// REGISTRAR CLICK
// =============================================================================

/**
 * POST /api/metricas/click
 * Registra un click en un enlace de una entidad
 * 
 * Body:
 * {
 *   "entityType": "negocio",
 *   "entityId": "uuid"
 * }
 */
export async function registrarClickController(req: Request, res: Response) {
    try {
        const { entityType, entityId } = req.body;

        // Validaciones
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos: entityType, entityId',
            });
        }

        const resultado = await registrarClick(entityType, entityId);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al registrar click:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al registrar click',
        });
    }
}

// =============================================================================
// REGISTRAR MENSAJE
// =============================================================================

/**
 * POST /api/metricas/message
 * Registra un mensaje enviado a una entidad
 * 
 * Body:
 * {
 *   "entityType": "negocio",
 *   "entityId": "uuid"
 * }
 */
export async function registrarMessageController(req: Request, res: Response) {
    try {
        const { entityType, entityId } = req.body;

        // Validaciones
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos: entityType, entityId',
            });
        }

        const resultado = await registrarMessage(entityType, entityId);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al registrar mensaje:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al registrar mensaje',
        });
    }
}

// =============================================================================
// OBTENER MÉTRICAS
// =============================================================================

/**
 * GET /api/metricas/:entityType/:entityId
 * Obtiene todas las métricas de una entidad
 */
export async function obtenerMetricasController(req: Request, res: Response) {
    try {
        const { entityType, entityId } = req.params;

        // Validaciones
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos',
            });
        }

        const resultado = await obtenerMetricas(entityType as any, entityId);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al obtener métricas:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al obtener métricas',
        });
    }
}

// =============================================================================
// REGISTRAR VISTA PÚBLICA (Sin autenticación)
// =============================================================================

/**
 * POST /api/metricas/public-view
 * Registra una vista pública de una entidad (sin autenticación)
 * 
 * Usado cuando alguien ve un negocio desde un enlace compartido
 * sin estar logueado en AnunciaYA
 * 
 * Body:
 * {
 *   "entityType": "negocio",
 *   "entityId": "uuid"
 * }
 */
export async function registrarPublicViewController(req: Request, res: Response) {
    try {
        const { entityType, entityId } = req.body;

        // Validaciones
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos: entityType, entityId',
            });
        }

        // Registrar vista usando la misma función
        const resultado = await registrarView(entityType, entityId);

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al registrar vista pública:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al registrar vista pública',
        });
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    registrarViewController,
    registrarShareController,
    registrarClickController,
    registrarMessageController,
    obtenerMetricasController,
    registrarPublicViewController,
};