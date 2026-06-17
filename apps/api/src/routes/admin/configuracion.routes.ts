/**
 * routes/admin/configuracion.routes.ts
 * ====================================
 * Rutas de la sección "Configuración" del Panel Admin (módulo 9) — los valores dinámicos del negocio.
 *
 * SOLO SuperAdmin. Por eso este router se monta DESPUÉS del gate global `requierePanel(['superadmin'])`
 * en `routes/admin/index.ts` (igual que /mantenimiento y /regiones), y no necesita su propio requierePanel.
 *
 *   GET   /        → listar los valores editables (catálogo + valor actual)
 *   PATCH /:clave  → editar un valor (escalera, trial o gracia)
 *
 * Ubicación: apps/api/src/routes/admin/configuracion.routes.ts
 */

import { Router } from 'express';
import {
    listarConfiguracionController,
    actualizarConfiguracionController,
} from '../../controllers/admin/configuracion.controller.js';

const router: Router = Router();

router.get('/', listarConfiguracionController);
router.patch('/:clave', actualizarConfiguracionController);

export default router;
