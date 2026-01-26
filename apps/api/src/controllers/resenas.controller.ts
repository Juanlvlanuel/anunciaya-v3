/**
 * ============================================================================
 * RESEÑAS CONTROLLER - Manejo de Peticiones HTTP
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/controllers/resenas.controller.ts
 * 
 * PROPÓSITO:
 * Controlador para endpoints relacionados con reseñas
 * 
 * CREADO: Fase 5.3 - Sistema de Reseñas
 */

import { Request, Response } from 'express';
import { obtenerResenasSucursal, obtenerPromedioResenas } from '../services/resenas.service.js';

// =============================================================================
// GET /api/resenas/sucursal/:sucursalId
// =============================================================================

/**
 * Obtiene las reseñas de una sucursal
 * 
 * @route GET /api/resenas/sucursal/:sucursalId
 * @param sucursalId - UUID de la sucursal
 * @returns Lista de reseñas con datos del autor
 */
export async function getResenasSucursal(req: Request, res: Response) {
    try {
        const { sucursalId } = req.params;

        // Validar que se envió el sucursalId
        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la sucursal es requerido',
            });
        }

        // Validar formato UUID básico
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(sucursalId)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la sucursal no es válido',
            });
        }

        const resultado = await obtenerResenasSucursal(sucursalId);

        return res.json(resultado);

    } catch (error) {
        console.error('Error en getResenasSucursal:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las reseñas',
        });
    }
}

// =============================================================================
// GET /api/resenas/sucursal/:sucursalId/promedio
// =============================================================================

/**
 * Obtiene el promedio de calificación de una sucursal
 * 
 * @route GET /api/resenas/sucursal/:sucursalId/promedio
 * @param sucursalId - UUID de la sucursal
 * @returns Promedio y total de reseñas
 */
export async function getPromedioResenas(req: Request, res: Response) {
    try {
        const { sucursalId } = req.params;

        // Validar que se envió el sucursalId
        if (!sucursalId) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la sucursal es requerido',
            });
        }

        // Validar formato UUID básico
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(sucursalId)) {
            return res.status(400).json({
                success: false,
                message: 'El ID de la sucursal no es válido',
            });
        }

        const resultado = await obtenerPromedioResenas(sucursalId);

        return res.json(resultado);

    } catch (error) {
        console.error('Error en getPromedioResenas:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener el promedio de reseñas',
        });
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    getResenasSucursal,
    getPromedioResenas,
};