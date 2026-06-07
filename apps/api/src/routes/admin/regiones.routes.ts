/**
 * routes/admin/regiones.routes.ts
 * ===============================
 * GET /api/admin/regiones — lista de regiones para el filtro global del Panel.
 * Se monta DESPUÉS del gate global de superadmin en routes/admin/index.ts (solo
 * el superadmin filtra por región; gerente/vendedor tienen alcance fijo).
 *
 * Ubicación: apps/api/src/routes/admin/regiones.routes.ts
 */

import { Router } from 'express';
import { listarRegionesController } from '../../controllers/admin/regiones.controller.js';

const router: Router = Router();

router.get('/', listarRegionesController);

export default router;
