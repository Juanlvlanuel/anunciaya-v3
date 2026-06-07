/**
 * admin/regiones.controller.ts
 * ============================
 * GET /api/admin/regiones — regiones configuradas para el filtro global del
 * Panel. Solo superadmin (lo protege el gate global de routes/admin/index.ts).
 *
 * Ubicación: apps/api/src/controllers/admin/regiones.controller.ts
 */

import type { Request, Response } from 'express';
import { listarRegiones } from '../../services/admin/regiones.service.js';

export async function listarRegionesController(_req: Request, res: Response): Promise<void> {
    try {
        const data = await listarRegiones();
        res.status(200).json({ success: true, message: 'Regiones obtenidas', data });
    } catch (error) {
        console.error('Error en listarRegionesController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las regiones',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
