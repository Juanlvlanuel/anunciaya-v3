/**
 * routes/admin/resumen.routes.ts
 * ==============================
 * Ruta del módulo "Resumen / inicio" del Panel Admin = el tablero de bienvenida (KPIs + cola de
 * pendientes). Solo LECTURA.
 *
 *   GET /  → superadmin + gerente + vendedor (alcance por rol en el service)
 *
 * Los 3 roles tienen Resumen (cada uno ve lo suyo). La ruta trae su propio `requierePanel([roles])` y
 * este router se monta ANTES del gate global de superadmin en `routes/admin/index.ts`.
 *
 * Ubicación: apps/api/src/routes/admin/resumen.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import { obtenerResumenController } from '../../controllers/admin/resumen.controller.js';

const router: Router = Router();

router.get('/', requierePanel(['superadmin', 'gerente', 'vendedor']), obtenerResumenController);

export default router;
