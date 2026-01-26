/**
 * ============================================================================
 * DASHBOARD CONTROLLER - Business Studio
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/controllers/dashboard.controller.ts
 * 
 * PROPÓSITO:
 * Manejar las peticiones HTTP para el Dashboard de Business Studio
 * 
 * ENDPOINTS:
 * GET /api/business/dashboard/kpis         → KPIs principales
 * GET /api/business/dashboard/ventas       → Ventas diarias (gráfica)
 * GET /api/business/dashboard/campanas     → Campañas activas
 * GET /api/business/dashboard/interacciones    → Feed de actividad reciente (NUEVO)
 * GET /api/business/dashboard/resenas      → Reseñas recientes
 * GET /api/business/dashboard/alertas      → Alertas de seguridad
 * PUT /api/business/dashboard/alertas/:id  → Marcar alerta leída
 * 
 * CREADO: Fase 5.4 - Dashboard Business Studio
 */

import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service.js';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Request con negocioId inyectado por middleware
 */
interface RequestConNegocio extends Request {
    negocioId?: string;
}

// =============================================================================
// OBTENER KPIs
// =============================================================================

/**
 * GET /api/business/dashboard/kpis
 * 
 * Query params:
 * - periodo: 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio' (default: 'semana')
 */
export async function obtenerKPIs(
    req: RequestConNegocio,
    res: Response,
    next: NextFunction
) {
    try {
        const negocioId = req.negocioId;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                error: 'No se encontró el negocio asociado',
            });
        }

        const periodo = (req.query.periodo as string) || 'semana';
        const sucursalId = req.query.sucursalId as string | undefined;

        // Validar periodo
        const periodosValidos = ['hoy', 'semana', 'mes', 'trimestre', 'anio'];
        if (!periodosValidos.includes(periodo)) {
            return res.status(400).json({
                success: false,
                error: 'Periodo no válido. Use: hoy, semana, mes, trimestre, anio',
            });
        }

        const resultado = await dashboardService.obtenerKPIs(
            negocioId,
            periodo as 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio',
            sucursalId
        );

        return res.json(resultado);
    } catch (error) {
        next(error);
    }
}

// =============================================================================
// OBTENER VENTAS DIARIAS
// =============================================================================

/**
 * GET /api/business/dashboard/ventas
 * 
 * Query params:
 * - periodo: 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio' (default: 'semana')
 */
export async function obtenerVentasDiarias(
    req: RequestConNegocio,
    res: Response,
    next: NextFunction
) {
    try {
        const negocioId = req.negocioId;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                error: 'No se encontró el negocio asociado',
            });
        }

        const periodo = (req.query.periodo as string) || 'semana';
        const sucursalId = req.query.sucursalId as string | undefined;

        // Validar periodo
        const periodosValidos = ['hoy', 'semana', 'mes', 'trimestre', 'anio'];
        if (!periodosValidos.includes(periodo)) {
            return res.status(400).json({
                success: false,
                error: 'Periodo no válido. Use: hoy, semana, mes, trimestre, anio',
            });
        }

        const resultado = await dashboardService.obtenerVentasDiarias(
            negocioId,
            periodo as 'hoy' | 'semana' | 'mes' | 'trimestre' | 'anio',
            sucursalId
        );

        return res.json(resultado);
    } catch (error) {
        next(error);
    }
}

// =============================================================================
// OBTENER CAMPAÑAS ACTIVAS
// =============================================================================

/**
 * GET /api/business/dashboard/campanas
 * 
 * Query params:
 * - limite: número de campañas (default: 5, max: 20)
 */
export async function obtenerCampanasActivas(
    req: RequestConNegocio,
    res: Response,
    next: NextFunction
) {
    try {
        const negocioId = req.negocioId;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                error: 'No se encontró el negocio asociado',
            });
        }

        let limite = parseInt(req.query.limite as string) || 5;
        limite = Math.min(Math.max(limite, 1), 20); // Entre 1 y 20
        const sucursalId = req.query.sucursalId as string | undefined;

        const resultado = await dashboardService.obtenerCampanasActivas(negocioId, limite, sucursalId);

        return res.json(resultado);
    } catch (error) {
        next(error);
    }
}

// =============================================================================
// OBTENER ACTIVIDAD RECIENTE (NUEVO)
// =============================================================================

/**
 * GET /api/business/dashboard/interacciones
 * 
 * Query params:
 * - limite: número de actividades (default: 10, max: 20)
 * 
 * Retorna feed combinado de:
 * - Ventas recientes
 * - Cupones canjeados
 * - Ofertas publicadas
 * - Productos actualizados
 */
export async function obtenerInteracciones(
    req: RequestConNegocio,
    res: Response,
    next: NextFunction
) {
    try {
        const negocioId = req.negocioId;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                error: 'No se encontró el negocio asociado',
            });
        }

        let limite = parseInt(req.query.limite as string) || 10;
        limite = Math.min(Math.max(limite, 1), 20); // Entre 1 y 20
        const sucursalId = req.query.sucursalId as string | undefined;

        const resultado = await dashboardService.obtenerInteracciones(negocioId, limite, sucursalId);

        return res.json(resultado);
    } catch (error) {
        next(error);
    }
}

// =============================================================================
// OBTENER RESEÑAS RECIENTES
// =============================================================================

/**
 * GET /api/business/dashboard/resenas
 * 
 * Query params:
 * - limite: número de reseñas (default: 5, max: 20)
 */
export async function obtenerResenasRecientes(
    req: RequestConNegocio,
    res: Response,
    next: NextFunction
) {
    try {
        const negocioId = req.negocioId;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                error: 'No se encontró el negocio asociado',
            });
        }

        let limite = parseInt(req.query.limite as string) || 5;
        limite = Math.min(Math.max(limite, 1), 20); // Entre 1 y 20
        const sucursalId = req.query.sucursalId as string | undefined;

        const resultado = await dashboardService.obtenerResenasRecientes(negocioId, limite, sucursalId);

        return res.json(resultado);
    } catch (error) {
        next(error);
    }
}

// =============================================================================
// OBTENER ALERTAS RECIENTES
// =============================================================================

/**
 * GET /api/business/dashboard/alertas
 * 
 * Query params:
 * - limite: número de alertas (default: 5, max: 20)
 */
export async function obtenerAlertasRecientes(
    req: RequestConNegocio,
    res: Response,
    next: NextFunction
) {
    try {
        const negocioId = req.negocioId;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                error: 'No se encontró el negocio asociado',
            });
        }

        let limite = parseInt(req.query.limite as string) || 5;
        limite = Math.min(Math.max(limite, 1), 20);
        const sucursalId = req.query.sucursalId as string | undefined;

        const resultado = await dashboardService.obtenerAlertasRecientes(negocioId, limite, sucursalId);

        return res.json(resultado);
    } catch (error) {
        next(error);
    }
}

// =============================================================================
// MARCAR ALERTA COMO LEÍDA
// =============================================================================

/**
 * PUT /api/business/dashboard/alertas/:id
 * 
 * Marca una alerta específica como leída
 */
export async function marcarAlertaLeida(
    req: RequestConNegocio,
    res: Response,
    next: NextFunction
) {
    try {
        const negocioId = req.negocioId;
        const alertaId = req.params.id;

        if (!negocioId) {
            return res.status(400).json({
                success: false,
                error: 'No se encontró el negocio asociado',
            });
        }

        if (!alertaId) {
            return res.status(400).json({
                success: false,
                error: 'ID de alerta requerido',
            });
        }

        const resultado = await dashboardService.marcarAlertaLeida(alertaId, negocioId);

        return res.json(resultado);
    } catch (error) {
        next(error);
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    obtenerKPIs,
    obtenerVentasDiarias,
    obtenerCampanasActivas,
    obtenerInteracciones,
    obtenerResenasRecientes,
    obtenerAlertasRecientes,
    marcarAlertaLeida,
};