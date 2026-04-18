/**
 * routes/admin/index.ts
 * ======================
 * Agregador de todas las rutas del Panel Admin.
 *
 * Hoy aplica el gate `requireAdminSecret` (header x-admin-secret) de forma
 * global a todo `/api/admin/*`. En el futuro, cuando exista Panel Admin con
 * cuentas admin reales, se reemplaza por el middleware de auth correspondiente
 * sin tocar los sub-routers ni los controllers.
 *
 * Cuando se agregue una sección nueva (negocios, usuarios, reportes-globales,
 * suscripciones, etc.), se importa su router acá y se registra con su prefijo.
 *
 * Ubicación: apps/api/src/routes/admin/index.ts
 */

import { Router } from 'express';
import { requireAdminSecret } from '../../middleware/adminSecret.middleware.js';
import mantenimientoRoutes from './mantenimiento.routes.js';

const router: Router = Router();

// Gate común de toda la sección admin
router.use(requireAdminSecret);

// ─── Sub-secciones ────────────────────────────────────────────────────────────
router.use('/mantenimiento', mantenimientoRoutes);

// A futuro, agregar aquí:
// router.use('/negocios', negociosRoutes);
// router.use('/usuarios', usuariosRoutes);
// router.use('/reportes-globales', reportesGlobalesRoutes);
// router.use('/suscripciones', suscripcionesRoutes);
// router.use('/auditoria', auditoriaRoutes);

export default router;
