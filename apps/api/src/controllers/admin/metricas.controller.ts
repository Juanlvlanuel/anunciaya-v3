/**
 * admin/metricas.controller.ts
 * ============================
 * Controller del módulo "Métricas" del Panel Admin. Lee el filtro global de región (solo superadmin)
 * y el periodo (?meses=), llama al service y arma la respuesta. El acceso y el rol los validó
 * `requierePanel` en la ruta; el alcance fino lo aplica el service. SOLO LECTURA.
 *
 * Ubicación: apps/api/src/controllers/admin/metricas.controller.ts
 */

import type { Request, Response } from 'express';
import {
    metricasCrecimiento,
    metricasAdopcion,
    metricasUsuarios,
    normalizarPeriodo,
} from '../../services/admin/metricas.service.js';
import { panelConFiltroRegion } from '../../services/admin/negocios.service.js';

// =============================================================================
// GET /api/admin/metricas/crecimiento   (super + gerente + vendedor · alcance por rol)
// =============================================================================

export async function metricasCrecimientoController(req: Request, res: Response): Promise<void> {
    try {
        // Filtro global de región (solo superadmin); gerente/vendedor lo ignoran (su token manda).
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const periodo = normalizarPeriodo(req.query);
        const data = await metricasCrecimiento(panel, periodo);
        res.status(200).json({ success: true, message: 'Métricas de crecimiento obtenidas', data });
    } catch (error) {
        console.error('Error en metricasCrecimientoController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las métricas de crecimiento',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/metricas/adopcion   (super + gerente + vendedor · alcance por rol)
// =============================================================================

export async function metricasAdopcionController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const periodo = normalizarPeriodo(req.query);
        const data = await metricasAdopcion(panel, periodo);
        res.status(200).json({ success: true, message: 'Métricas de adopción obtenidas', data });
    } catch (error) {
        console.error('Error en metricasAdopcionController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las métricas de adopción',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/metricas/usuarios   (super + gerente · el vendedor NO entra)
// =============================================================================

export async function metricasUsuariosController(req: Request, res: Response): Promise<void> {
    try {
        const panel = panelConFiltroRegion(req.usuarioPanel!, req.query.regionId);
        const periodo = normalizarPeriodo(req.query);
        const data = await metricasUsuarios(panel, periodo);
        res.status(200).json({ success: true, message: 'Métricas de usuarios obtenidas', data });
    } catch (error) {
        console.error('Error en metricasUsuariosController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las métricas de usuarios',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
