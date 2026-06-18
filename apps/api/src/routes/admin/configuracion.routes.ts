/**
 * routes/admin/configuracion.routes.ts
 * ====================================
 * Rutas de la sección "Configuración" del Panel Admin (módulo 9) — los valores dinámicos del negocio.
 *
 * SOLO SuperAdmin. Por eso este router se monta DESPUÉS del gate global `requierePanel(['superadmin'])`
 * en `routes/admin/index.ts` (igual que /mantenimiento y /regiones), y no necesita su propio requierePanel.
 *
 *   GET   /                   → listar los valores editables (catálogo + valor actual)
 *   PUT   /precio-membresia    → cambiar el precio MENSUAL (crea el Price nuevo en Stripe + reapunta config)
 *   PUT   /plan-anual          → activar/desactivar el plan anual (crea/archiva el Price anual)
 *   PATCH /:clave             → editar un valor (escalera, trial o gracia)
 *
 * Ubicación: apps/api/src/routes/admin/configuracion.routes.ts
 */

import { Router } from 'express';
import {
    listarConfiguracionController,
    actualizarConfiguracionController,
    cambiarPrecioMensualController,
    planAnualController,
} from '../../controllers/admin/configuracion.controller.js';

const router: Router = Router();

router.get('/', listarConfiguracionController);
// Antes de PATCH /:clave para que estas rutas no se interpreten como una clave.
router.put('/precio-membresia', cambiarPrecioMensualController);
router.put('/plan-anual', planAnualController);
router.patch('/:clave', actualizarConfiguracionController);

export default router;
