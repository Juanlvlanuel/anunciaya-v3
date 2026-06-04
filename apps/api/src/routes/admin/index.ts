/**
 * routes/admin/index.ts
 * ======================
 * Agregador de todas las rutas del Panel Admin.
 *
 * Aplica el gate `requierePanel(['superadmin'])` de forma global a todo
 * `/api/admin/*`. Es un gate DUAL durante la transición: acepta el header
 * x-admin-secret (legacy, p.ej. reconcile R2) O un JWT con rol_equipo de equipo
 * revalidado en BD. Reemplaza a requireAdminSecret sin tocar sub-routers ni
 * controllers. El x-admin-secret se retirará cuando todo migre al rol.
 *
 * Cuando se agregue una sección nueva (negocios, usuarios, reportes-globales,
 * suscripciones, etc.), se importa su router acá y se registra con su prefijo.
 *
 * Ubicación: apps/api/src/routes/admin/index.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import mantenimientoRoutes from './mantenimiento.routes.js';

const router: Router = Router();

// Gate común de toda la sección admin.
// Dual durante la transición: acepta x-admin-secret (legacy, p.ej. reconcile R2)
// O un JWT con rol_equipo='superadmin' (revalidado en BD). Reemplaza a
// requireAdminSecret sin romper Mantenimiento.
router.use(requierePanel(['superadmin']));

// ─── Sub-secciones ────────────────────────────────────────────────────────────
router.use('/mantenimiento', mantenimientoRoutes);

// A futuro, agregar aquí:
// router.use('/negocios', negociosRoutes);
// router.use('/usuarios', usuariosRoutes);
// router.use('/reportes-globales', reportesGlobalesRoutes);
// router.use('/suscripciones', suscripcionesRoutes);
// router.use('/auditoria', auditoriaRoutes);

export default router;
