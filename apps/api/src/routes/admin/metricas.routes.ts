/**
 * routes/admin/metricas.routes.ts
 * ===============================
 * Rutas del módulo "Métricas" del Panel Admin = la vista de análisis (tendencias + desgloses). Solo
 * LECTURA. Cada pestaña es un endpoint propio (el front carga solo la pestaña activa).
 *
 *   GET /crecimiento  → superadmin + gerente + vendedor (alcance por rol en el service)
 *   GET /adopcion     → superadmin + gerente + vendedor (alcance por rol en el service)
 *   GET /usuarios     → superadmin + gerente (el vendedor NO entra, igual que el módulo Usuarios)
 *
 * Este router se monta ANTES del gate global de superadmin en `routes/admin/index.ts` porque también
 * lo usan gerente y vendedor; cada ruta trae su propio `requierePanel([roles])`.
 *
 * Ubicación: apps/api/src/routes/admin/metricas.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
    metricasCrecimientoController,
    metricasAdopcionController,
    metricasUsuariosController,
} from '../../controllers/admin/metricas.controller.js';

const router: Router = Router();

router.get('/crecimiento', requierePanel(['superadmin', 'gerente', 'vendedor']), metricasCrecimientoController);
router.get('/adopcion', requierePanel(['superadmin', 'gerente', 'vendedor']), metricasAdopcionController);
router.get('/usuarios', requierePanel(['superadmin', 'gerente']), metricasUsuariosController);

export default router;
