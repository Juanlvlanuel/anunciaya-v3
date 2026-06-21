/**
 * routes/admin/auditoria.routes.ts
 * ================================
 * Rutas de la sección Auditoría del Panel Admin: lectura de la bitácora de acciones
 * del equipo (`admin_auditoria`). Solo lectura — la ESCRITURA la hace cada módulo vía
 * `registrarAuditoria`.
 *
 * Cada ruta trae su propio `requierePanel(['superadmin','gerente'])` porque la usan
 * super y gerente (el vendedor NO). El alcance fino (super = todo · gerente = su
 * equipo) lo aplica el service. Por eso este router se monta ANTES del gate global de
 * superadmin en `routes/admin/index.ts` (igual que Negocios / Suscripciones).
 *
 *   GET /          → super + gerente (bitácora paginada, con alcance por rol)
 *   GET /actores   → super + gerente (actores presentes, para el filtro)
 *   GET /:id       → super + gerente (detalle de un registro)
 *
 * Nota de orden: /actores se declara ANTES de /:id para que "actores" no caiga en el
 * comodín del id.
 *
 * Ubicación: apps/api/src/routes/admin/auditoria.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
    listarAuditoriaController,
    listarActoresAuditoriaController,
    obtenerDetalleAuditoriaController,
    eliminarAuditoriaController,
    vaciarAuditoriaController,
} from '../../controllers/admin/auditoria.controller.js';

const router: Router = Router();

router.get('/', requierePanel(['superadmin', 'gerente']), listarAuditoriaController);

// Antes de /:id para que "actores" no caiga en el comodín del id.
router.get('/actores', requierePanel(['superadmin', 'gerente']), listarActoresAuditoriaController);

router.get('/:id', requierePanel(['superadmin', 'gerente']), obtenerDetalleAuditoriaController);

// ─── Borrado (SOLO superadmin) — limpieza de staging; la auditoría es inmutable en principio ──
// Vaciar TODO va sin id; borrar uno va con id. Ambos exigen superadmin.
router.delete('/', requierePanel(['superadmin']), vaciarAuditoriaController);
router.delete('/:id', requierePanel(['superadmin']), eliminarAuditoriaController);

export default router;
