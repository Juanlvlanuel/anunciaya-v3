/**
 * admin/resumen.controller.ts
 * ===========================
 * Controller del módulo "Resumen / inicio" del Panel Admin. Lee el filtro global de región (solo
 * superadmin), llama al service y arma la respuesta. El acceso y el rol los validó `requierePanel`
 * en la ruta; el alcance fino lo aplica el service.
 *
 * Ubicación: apps/api/src/controllers/admin/resumen.controller.ts
 */

import type { Request, Response } from 'express';
import { obtenerResumen } from '../../services/admin/resumen.service.js';
import { panelConFiltroRegion } from '../../services/admin/negocios.service.js';

// =============================================================================
// GET /api/admin/resumen   (tablero de inicio · super + gerente + vendedor)
// =============================================================================

export async function obtenerResumenController(req: Request, res: Response): Promise<void> {
    try {
        // Filtro global de región (solo superadmin); gerente/vendedor lo ignoran (su token manda).
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const data = await obtenerResumen(panel);
        res.status(200).json({ success: true, message: 'Resumen obtenido', data });
    } catch (error) {
        console.error('Error en obtenerResumenController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el resumen',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
