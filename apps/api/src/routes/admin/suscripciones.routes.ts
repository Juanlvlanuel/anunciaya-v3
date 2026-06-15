/**
 * routes/admin/suscripciones.routes.ts
 * ====================================
 * Rutas de la sección Suscripciones del Panel Admin = la BITÁCORA FINANCIERA global
 * (libro mayor de la membresía). Solo LECTURA.
 *
 *   GET /            → superadmin + gerente (bitácora paginada, alcance por región en el service)
 *   GET /:id         → superadmin + gerente (detalle de un evento)
 *
 * El VENDEDOR no accede en V1. Cada ruta trae su propio `requierePanel([roles])` y este
 * router se monta ANTES del gate global de superadmin en `routes/admin/index.ts` (porque
 * la sección la consulta también el gerente, acotado a su región).
 *
 * Ubicación: apps/api/src/routes/admin/suscripciones.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
    listarEventosController,
    obtenerDetalleEventoController,
    eliminarEventoController,
} from '../../controllers/admin/suscripciones.controller.js';

const router: Router = Router();

router.get('/', requierePanel(['superadmin', 'gerente']), listarEventosController);
router.get('/:id', requierePanel(['superadmin', 'gerente']), obtenerDetalleEventoController);
// Borrar un movimiento (pago manual anulado) — SOLO superadmin.
router.delete('/:id', requierePanel(['superadmin']), eliminarEventoController);

export default router;
