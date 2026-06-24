/**
 * admin/territorios.controller.ts
 * ===============================
 * Lecturas del módulo Territorios del Panel Admin (Fase 1 · VER). El controller solo
 * llama al service; el alcance por rol lo resuelve el service según `req.usuarioPanel`.
 *
 * Ubicación: apps/api/src/controllers/admin/territorios.controller.ts
 */

import type { Request, Response } from 'express';
import { listarZonas } from '../../services/admin/territorios.service.js';

/** GET /api/admin/territorios/zonas — zonas visibles para el rol (filtro ?ciudadId opcional). */
export async function listarZonasController(req: Request, res: Response): Promise<void> {
    try {
        const { ciudadId } = req.query;
        const data = await listarZonas(req.usuarioPanel!, {
            ciudadId: typeof ciudadId === 'string' ? ciudadId : undefined,
        });
        res.status(200).json({ success: true, message: 'Zonas obtenidas', data });
    } catch (error) {
        console.error('Error en listarZonasController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las zonas del territorio',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
