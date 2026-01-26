/**
 * ============================================================================
 * GUARDADOS CONTROLLER - Controlador de Guardados
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/controllers/guardados.controller.ts
 * 
 * PROPÓSITO:
 * Maneja las peticiones HTTP para guardados (ofertas, rifas, empleos)
 */

import { Request, Response } from 'express';
import {
    agregarGuardado,
    quitarGuardado,
    obtenerGuardados,
} from '../services/guardados.service';

// =============================================================================
// AGREGAR A GUARDADOS
// =============================================================================

/**
 * POST /api/guardados
 * Agrega una entidad a guardados
 * 
 * Body:
 * {
 *   "entityType": "oferta",
 *   "entityId": "uuid"
 * }
 */
export async function agregarGuardadoController(req: Request, res: Response) {
    try {
        const userId = req.usuario?.usuarioId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        const { entityType, entityId } = req.body;

        // Validaciones
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos: entityType, entityId',
            });
        }

        const validEntityTypes = ['oferta', 'rifa', 'empleo'];
        if (!validEntityTypes.includes(entityType)) {
            return res.status(400).json({
                success: false,
                message: `entityType no válido. Debe ser uno de: ${validEntityTypes.join(', ')}`,
            });
        }

        // Agregar a guardados
        const resultado = await agregarGuardado({
            userId,
            entityType,
            entityId,
        });

        if (!resultado.success) {
            return res.status(400).json(resultado);
        }

        res.status(201).json(resultado);
    } catch (error) {
        console.error('Error al agregar a guardados:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al agregar a guardados',
        });
    }
}

// =============================================================================
// QUITAR DE GUARDADOS
// =============================================================================

/**
 * DELETE /api/guardados/:entityType/:entityId
 * Quita una entidad de guardados
 */
export async function quitarGuardadoController(req: Request, res: Response) {
    try {
        const userId = req.usuario?.usuarioId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        const { entityType, entityId } = req.params;

        // Validaciones
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan parámetros requeridos',
            });
        }

        const validEntityTypes = ['oferta', 'rifa', 'empleo'];
        if (!validEntityTypes.includes(entityType)) {
            return res.status(400).json({
                success: false,
                message: `entityType no válido. Debe ser uno de: ${validEntityTypes.join(', ')}`,
            });
        }

        // Quitar de guardados
        const resultado = await quitarGuardado(
            userId,
            entityType as 'oferta' | 'rifa' | 'empleo',
            entityId
        );

        if (!resultado.success) {
            return res.status(404).json(resultado);
        }

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al quitar de guardados:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al quitar de guardados',
        });
    }
}

// =============================================================================
// OBTENER GUARDADOS
// =============================================================================

/**
 * GET /api/guardados?entityType=oferta&pagina=1&limite=20
 * Obtiene la lista de entidades guardadas del usuario
 */
export async function obtenerGuardadosController(req: Request, res: Response) {
    try {
        const userId = req.usuario?.usuarioId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'No autenticado',
            });
        }

        const entityType = req.query.entityType as string | undefined;
        const pagina = parseInt(req.query.pagina as string) || 1;
        const limite = parseInt(req.query.limite as string) || 20;

        // Validar límite
        if (limite > 100) {
            return res.status(400).json({
                success: false,
                message: 'El límite máximo es 100',
            });
        }

        // Validar entityType si se proporciona
        if (entityType) {
            const validEntityTypes = ['oferta', 'rifa', 'empleo'];
            if (!validEntityTypes.includes(entityType)) {
                return res.status(400).json({
                    success: false,
                    message: `entityType no válido. Debe ser uno de: ${validEntityTypes.join(', ')}`,
                });
            }
        }

        const resultado = await obtenerGuardados(
            userId,
            entityType as 'oferta' | 'rifa' | 'empleo' | undefined,
            pagina,
            limite
        );

        res.status(200).json(resultado);
    } catch (error) {
        console.error('Error al obtener guardados:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Error al obtener guardados',
        });
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    agregarGuardadoController,
    quitarGuardadoController,
    obtenerGuardadosController,
};