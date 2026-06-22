/**
 * admin/mantenimiento.routes.ts
 * ===============================
 * Rutas de la sección "Mantenimiento" del Panel Admin.
 *
 * El middleware `requireAdminSecret` se aplica a nivel de `routes/admin/index.ts`
 * (gate común para todo el namespace /api/admin/*), no aquí. Esto evita duplicar
 * protección y mantiene un único punto donde cambiar la auth admin en el futuro.
 *
 * Ubicación: apps/api/src/routes/admin/mantenimiento.routes.ts
 */

import { Router } from 'express';
import {
    getReporteReconcileController,
    postEjecutarReconcileController,
    getReconcileLogController,
    getSaludController,
    getLogsController,
    getCronsController,
    getPreviewCronController,
    postEjecutarCronController,
    postPurgarCacheController,
    postVaciarLogsController,
} from '../../controllers/admin/mantenimiento.controller.js';

const router: Router = Router();

// ─── R2 Reconcile ─────────────────────────────────────────────────────────────
router.get('/r2-reconcile', getReporteReconcileController);
router.post('/r2-reconcile/ejecutar', postEjecutarReconcileController);
router.get('/r2-reconcile/log', getReconcileLogController);

// ─── Salud del sistema (BD · Redis · R2 · Stripe) ───────────────────────────────
router.get('/salud', getSaludController);

// ─── Ventana de logs recientes (en memoria) ─────────────────────────────────────
router.get('/logs', getLogsController);
router.post('/logs/vaciar', postVaciarLogsController);

// ─── Tareas programadas (catálogo + telemetría) ─────────────────────────────────
router.get('/crons', getCronsController);
router.get('/crons/:id/preview', getPreviewCronController);
router.post('/crons/:id/ejecutar', postEjecutarCronController);

// ─── Caché de configuración ─────────────────────────────────────────────────────
router.post('/cache/purgar', postPurgarCacheController);

export default router;
