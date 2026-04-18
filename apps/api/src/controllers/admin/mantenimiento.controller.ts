/**
 * admin/mantenimiento.controller.ts
 * ===================================
 * Controllers de la sección "Mantenimiento" del Panel Admin.
 *
 * Protegidos globalmente por el middleware `requireAdminSecret` aplicado en
 * `routes/admin/index.ts` (hoy). En el futuro, cuando exista Panel Admin con
 * cuentas admin reales, se reemplaza ese middleware por auth JWT sin tocar
 * este archivo.
 *
 * Ubicación: apps/api/src/controllers/admin/mantenimiento.controller.ts
 */

import type { Request, Response } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    generarReporteReconcile,
    ejecutarLimpiezaR2,
    type OpcionesReconcile,
} from '../../services/admin/mantenimiento.service.js';

// =============================================================================
// GET /api/admin/mantenimiento/r2-reconcile
// =============================================================================

/**
 * Reporte de estado del reconcile. No modifica nada (seguro para correr siempre).
 * Acepta query params:
 *  - `carpetas`: lista separada por coma (ej: `carpetas=portadas,logos`)
 *  - `gracia`: minutos de gracia para archivos recientes (ej: `gracia=10`)
 */
export async function getReporteReconcileController(req: Request, res: Response): Promise<void> {
    try {
        const opciones: OpcionesReconcile = {};

        if (typeof req.query.carpetas === 'string' && req.query.carpetas.length > 0) {
            opciones.soloCarpetas = req.query.carpetas.split(',').map(c => c.trim());
        }

        if (typeof req.query.gracia === 'string') {
            const minutos = parseInt(req.query.gracia, 10);
            if (!isNaN(minutos) && minutos >= 0) opciones.minutosGracia = minutos;
        }

        const reporte = await generarReporteReconcile(opciones);

        res.status(200).json({ success: true, data: reporte });
    } catch (error) {
        console.error('Error en getReporteReconcileController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar reporte de reconcile',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// POST /api/admin/mantenimiento/r2-reconcile/ejecutar
// =============================================================================

/**
 * Ejecuta la limpieza real de archivos huérfanos en R2.
 *
 * Requiere body:
 *  - `confirmacion`: literal 'SI_BORRAR_HUERFANAS' (protección contra ejecuciones accidentales)
 *
 * Body opcional:
 *  - `carpetas`: array de carpetas a limpiar (ej: `['portadas']`). Si no, todas
 *  - `gracia`: minutos de gracia. Default 5
 *  - `maxBorrados`: tope de borrados. Default 500
 */
export async function postEjecutarReconcileController(req: Request, res: Response): Promise<void> {
    try {
        const { confirmacion, carpetas, gracia, maxBorrados } = req.body ?? {};

        if (confirmacion !== 'SI_BORRAR_HUERFANAS') {
            res.status(400).json({
                success: false,
                message: 'Falta confirmación explícita. Envía `confirmacion: "SI_BORRAR_HUERFANAS"` en el body.',
            });
            return;
        }

        const opciones: OpcionesReconcile = { dryRun: false };
        if (Array.isArray(carpetas) && carpetas.length > 0) opciones.soloCarpetas = carpetas;
        if (typeof gracia === 'number' && gracia >= 0) opciones.minutosGracia = gracia;
        if (typeof maxBorrados === 'number' && maxBorrados > 0) opciones.maxBorrados = maxBorrados;

        const resultado = await ejecutarLimpiezaR2(opciones);

        res.status(200).json({ success: true, data: resultado });
    } catch (error) {
        console.error('Error en postEjecutarReconcileController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al ejecutar limpieza',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/mantenimiento/r2-reconcile/log
// =============================================================================

/**
 * Devuelve las últimas N ejecuciones del reconcile (dry-run y reales) para
 * auditoría. Query params:
 *  - `limit`: cantidad máxima de filas (default 50, máx 500)
 *  - `soloEjecuciones`: si `true`, filtra a dryRun=false (omite los reportes)
 */
export async function getReconcileLogController(req: Request, res: Response): Promise<void> {
    try {
        let limit = 50;
        if (typeof req.query.limit === 'string') {
            const n = parseInt(req.query.limit, 10);
            if (!isNaN(n) && n > 0) limit = Math.min(n, 500);
        }

        const soloEjecuciones = req.query.soloEjecuciones === 'true';

        const filtro = soloEjecuciones ? sql`WHERE dry_run = false` : sql``;

        const res_ = await db.execute(sql`
            SELECT id, ejecutado_at, ejecutado_por, dry_run, carpetas,
                   huerfanas_detectadas, eliminadas, fallidas,
                   ignoradas_por_gracia, detalle
            FROM r2_reconcile_log
            ${filtro}
            ORDER BY ejecutado_at DESC
            LIMIT ${limit}
        `);

        res.status(200).json({
            success: true,
            data: {
                ejecuciones: res_.rows,
                total: res_.rows.length,
            },
        });
    } catch (error) {
        // Si la tabla no existe aún, devolver respuesta informativa en vez de 500
        if (error instanceof Error && /does not exist/i.test(error.message)) {
            res.status(503).json({
                success: false,
                message: 'Tabla r2_reconcile_log no existe aún. Ejecutar la migración `docs/migraciones/2026-04-17-r2-reconcile-log.sql`',
            });
            return;
        }
        console.error('Error en getReconcileLogController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener log de reconcile',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
