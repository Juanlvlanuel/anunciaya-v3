/**
 * routes/admin/territorios.routes.ts
 * ==================================
 * Rutas del módulo Territorios del Panel Admin (sección "Red de ventas").
 *
 * Los 3 roles entran, con alcance por rol resuelto en el service:
 *   - superadmin / gerente → ven el mapa de la ciudad con sus zonas (gerente: su región).
 *   - vendedor             → ve solo su(s) zona(s) asignada(s).
 * Se montan ANTES del gate global de superadmin en `routes/admin/index.ts`.
 *
 * Fase 1 (VER): solo lectura. Las acciones (crear/editar/asignar/borrar) llegan en Fase 2.
 *
 * Ubicación: apps/api/src/routes/admin/territorios.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import { listarZonasController } from '../../controllers/admin/territorios.controller.js';

const router: Router = Router();

// Listar zonas (los 3 roles; el service acota por rol).
router.get('/zonas', requierePanel(['superadmin', 'gerente', 'vendedor']), listarZonasController);

export default router;
