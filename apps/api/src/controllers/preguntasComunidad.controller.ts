/**
 * preguntasComunidad.controller.ts
 * =================================
 * Controllers para el feed "Pregúntale a [ciudad]" del Home.
 *
 * UBICACIÓN: apps/api/src/controllers/preguntasComunidad.controller.ts
 */

import type { Request, Response } from 'express';
import {
    crearPregunta,
    listarPreguntasPorCiudad,
} from '../services/preguntasComunidad.service.js';

// =============================================================================
// HELPERS
// =============================================================================

function obtenerUsuarioId(req: Request): string {
    return req.usuario!.usuarioId;
}

// =============================================================================
// POST /api/preguntas-comunidad
// =============================================================================

export async function crearPreguntaController(req: Request, res: Response) {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const { texto, ciudad, estado } = (req.body ?? {}) as {
            texto?: unknown;
            ciudad?: unknown;
            estado?: unknown;
        };

        // Coerción defensiva — el service revalida formato/length.
        if (typeof texto !== 'string' || typeof ciudad !== 'string' || typeof estado !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'texto, ciudad y estado son requeridos (string)',
            });
        }

        const resultado = await crearPregunta({ usuarioId, texto, ciudad, estado });

        if (!resultado.success) {
            return res.status(resultado.code || 500).json({
                success: false,
                message: resultado.message,
            });
        }

        return res.status(201).json({
            success: true,
            message: resultado.message,
            data: resultado.data,
        });
    } catch (error) {
        console.error('Error en crearPreguntaController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}

// =============================================================================
// GET /api/preguntas-comunidad?ciudad=...&limit=20&offset=0
// =============================================================================

export async function listarPreguntasPorCiudadController(req: Request, res: Response) {
    try {
        const ciudad = typeof req.query.ciudad === 'string' ? req.query.ciudad : '';
        if (ciudad.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'El parámetro de query "ciudad" es requerido',
            });
        }

        const limit = parseInt(req.query.limit as string) || undefined;
        const offset = parseInt(req.query.offset as string) || undefined;

        const resultado = await listarPreguntasPorCiudad({ ciudad, limit, offset });

        if (!resultado.success) {
            return res.status(resultado.code || 500).json({
                success: false,
                message: resultado.message,
            });
        }

        return res.status(200).json({
            success: true,
            message: resultado.message,
            data: resultado.data,
        });
    } catch (error) {
        console.error('Error en listarPreguntasPorCiudadController:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
        });
    }
}
