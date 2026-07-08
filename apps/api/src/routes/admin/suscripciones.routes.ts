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
    contarSuscripcionesActivasController,
    obtenerDetalleEventoController,
    eliminarEventoController,
} from '../../controllers/admin/suscripciones.controller.js';
import {
    listarSolicitudesController,
    aprobarSolicitudController,
    rechazarSolicitudController,
    obtenerDatosCobroController,
    guardarDatosCobroController,
} from '../../controllers/admin/pagos-manuales-cola.controller.js';

const router: Router = Router();

router.get('/', requierePanel(['superadmin', 'gerente']), listarEventosController);
// Conteo de suscripciones activas (badge del menú). Ruta específica ANTES de '/:id'.
router.get('/conteo-activas', requierePanel(['superadmin', 'gerente']), contarSuscripcionesActivasController);

// ─── Cola "Por verificar" (pago manual con comprobante) ──────────────────────
// Rutas específicas ANTES de '/:id' para que no las capture el comodín.
router.get('/solicitudes', requierePanel(['superadmin', 'gerente']), listarSolicitudesController);
router.post('/solicitudes/:solicitudId/aprobar', requierePanel(['superadmin', 'gerente']), aprobarSolicitudController);
router.post('/solicitudes/:solicitudId/rechazar', requierePanel(['superadmin', 'gerente']), rechazarSolicitudController);

// ─── Datos de depósito (los ve el dueño en Mi Perfil; solo super los edita) ──
router.get('/datos-cobro', requierePanel(['superadmin', 'gerente']), obtenerDatosCobroController);
router.put('/datos-cobro', requierePanel(['superadmin']), guardarDatosCobroController);

router.get('/:id', requierePanel(['superadmin', 'gerente']), obtenerDetalleEventoController);
// Borrar un movimiento (pago manual anulado) — SOLO superadmin.
router.delete('/:id', requierePanel(['superadmin']), eliminarEventoController);

export default router;
