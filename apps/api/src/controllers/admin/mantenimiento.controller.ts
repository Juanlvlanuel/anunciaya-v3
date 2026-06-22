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
    type OpcionesReconcile,
} from '../../services/admin/mantenimiento.service.js';
import {
    puedeEjecutarLimpiezaR2,
    ejecutarLimpiezaR2Segura,
    LimpiezaBloqueadaError,
    ejecutarCronManual,
    CronDesconocidoError,
    purgarCacheConfig,
    vaciarLogsBE,
} from '../../services/admin/mantenimiento-acciones.service.js';
import { obtenerPreviewCron } from '../../services/admin/crons-preview.service.js';
import { obtenerSaludSistema } from '../../services/admin/salud.service.js';
import { obtenerLogs, type NivelLog } from '../../utils/logBuffer.js';
import { obtenerEstadoCrons } from '../../utils/cronRegistry.js';

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

        // `puedeEjecutar` le dice a la UI si el borrado está habilitado (solo con
        // acceso cross-ambiente / local). En prod queda en false.
        res.status(200).json({
            success: true,
            data: { ...reporte, puedeEjecutar: puedeEjecutarLimpiezaR2() },
        });
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

        const opciones: Omit<OpcionesReconcile, 'dryRun'> = {};
        if (Array.isArray(carpetas) && carpetas.length > 0) opciones.soloCarpetas = carpetas;
        if (typeof gracia === 'number' && gracia >= 0) opciones.minutosGracia = gracia;
        if (typeof maxBorrados === 'number' && maxBorrados > 0) opciones.maxBorrados = maxBorrados;

        const resultado = await ejecutarLimpiezaR2Segura(req.usuarioPanel!, opciones);

        res.status(200).json({ success: true, data: resultado });
    } catch (error) {
        if (error instanceof LimpiezaBloqueadaError) {
            res.status(409).json({ success: false, message: error.message });
            return;
        }
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

// =============================================================================
// GET /api/admin/mantenimiento/salud
// =============================================================================

/**
 * Estado de salud del sistema: pinguea BD, Redis, R2 y Stripe y reporta estado +
 * latencia de cada uno. Solo lectura.
 */
export async function getSaludController(_req: Request, res: Response): Promise<void> {
    try {
        const salud = await obtenerSaludSistema();
        res.status(200).json({ success: true, data: salud });
    } catch (error) {
        console.error('Error en getSaludController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la salud del sistema',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/mantenimiento/logs
// =============================================================================

/**
 * Ventana de logs recientes capturados en memoria. Query params:
 *  - `nivel`: 'info' | 'warn' | 'error' (filtra; si falta, todos)
 *  - `limite`: cantidad máxima de entradas (tope interno del buffer)
 */
export async function getLogsController(req: Request, res: Response): Promise<void> {
    try {
        const nivelQuery = req.query.nivel;
        const nivel: NivelLog | undefined =
            nivelQuery === 'info' || nivelQuery === 'warn' || nivelQuery === 'error'
                ? nivelQuery
                : undefined;

        let limite: number | undefined;
        if (typeof req.query.limite === 'string') {
            const n = parseInt(req.query.limite, 10);
            if (!isNaN(n) && n > 0) limite = n;
        }

        const logs = obtenerLogs({ nivel, limite });
        res.status(200).json({ success: true, data: { logs, total: logs.length } });
    } catch (error) {
        console.error('Error en getLogsController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los logs',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/mantenimiento/crons
// =============================================================================

/**
 * Estado de las tareas programadas: catálogo + última corrida (telemetría en
 * memoria de esta instancia). Solo lectura.
 */
export function getCronsController(_req: Request, res: Response): void {
    try {
        const crons = obtenerEstadoCrons();
        res.status(200).json({ success: true, data: { crons } });
    } catch (error) {
        console.error('Error en getCronsController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el estado de los crons',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// GET /api/admin/mantenimiento/crons/:id/preview
// =============================================================================

/** Preview de qué haría un cron si se ejecutara ahora (conteo + descripción). */
export async function getPreviewCronController(req: Request, res: Response): Promise<void> {
    try {
        const preview = await obtenerPreviewCron(req.params.id);
        if (!preview) {
            res.status(404).json({ success: false, message: 'Tarea programada desconocida.' });
            return;
        }
        res.status(200).json({ success: true, data: preview });
    } catch (error) {
        console.error('Error en getPreviewCronController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el preview de la tarea',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// POST /api/admin/mantenimiento/crons/:id/ejecutar
// =============================================================================

/** Fuerza la corrida de un cron sin esperar su horario. */
export async function postEjecutarCronController(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const estado = await ejecutarCronManual(req.usuarioPanel!, id);
        res.status(200).json({ success: true, data: { cron: estado } });
    } catch (error) {
        if (error instanceof CronDesconocidoError) {
            res.status(404).json({ success: false, message: error.message });
            return;
        }
        console.error('Error en postEjecutarCronController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al ejecutar la tarea programada',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// POST /api/admin/mantenimiento/cache/purgar
// =============================================================================

/** Purga el caché en memoria de configuración del sistema. */
export async function postPurgarCacheController(req: Request, res: Response): Promise<void> {
    try {
        await purgarCacheConfig(req.usuarioPanel!);
        res.status(200).json({ success: true, message: 'Caché de configuración purgado.' });
    } catch (error) {
        console.error('Error en postPurgarCacheController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al purgar el caché',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// =============================================================================
// POST /api/admin/mantenimiento/logs/vaciar
// =============================================================================

/** Vacía el buffer de logs en memoria. */
export async function postVaciarLogsController(req: Request, res: Response): Promise<void> {
    try {
        await vaciarLogsBE(req.usuarioPanel!);
        res.status(200).json({ success: true, message: 'Logs vaciados.' });
    } catch (error) {
        console.error('Error en postVaciarLogsController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al vaciar los logs',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
