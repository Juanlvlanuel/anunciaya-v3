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
} from '../../controllers/admin/mantenimiento.controller.js';

const router: Router = Router();

// ─── R2 Reconcile ─────────────────────────────────────────────────────────────
router.get('/r2-reconcile', getReporteReconcileController);
router.post('/r2-reconcile/ejecutar', postEjecutarReconcileController);
router.get('/r2-reconcile/log', getReconcileLogController);

export default router;
