/**
 * routes/admin/recibos.routes.ts
 * ==============================
 * Rutas del módulo "Recibos" del Panel Admin: lista de recibos de pago de membresía, descarga del
 * PDF y reenvío del comprobante por correo. Los 3 roles acceden con ALCANCE por rol (resuelto en el
 * service): super = todos · gerente = su región · vendedor = sus negocios atribuidos.
 *
 *   GET  /              → lista paginada (busca por folio o negocio)
 *   GET  /:id/pdf       → genera/regenera el PDF y devuelve su URL en R2
 *   POST /:id/reenviar  → envía el comprobante a 1+ correos
 *
 * Cada ruta trae su propio `requierePanel([roles])`; el router se monta ANTES del gate global de
 * superadmin en `routes/admin/index.ts` (porque lo usan también gerente y vendedor).
 *
 * Ubicación: apps/api/src/routes/admin/recibos.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
    listarRecibosController,
    contarRecibosController,
    descargarReciboController,
    reenviarReciboController,
} from '../../controllers/admin/recibos.controller.js';

const router: Router = Router();

router.get('/', requierePanel(['superadmin', 'gerente', 'vendedor']), listarRecibosController);
router.get('/conteo', requierePanel(['superadmin', 'gerente', 'vendedor']), contarRecibosController);
router.get('/:id/pdf', requierePanel(['superadmin', 'gerente', 'vendedor']), descargarReciboController);
router.post('/:id/reenviar', requierePanel(['superadmin', 'gerente', 'vendedor']), reenviarReciboController);

export default router;
