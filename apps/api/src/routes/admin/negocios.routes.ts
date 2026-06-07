/**
 * routes/admin/negocios.routes.ts
 * ===============================
 * Rutas de la sección Negocios del Panel Admin (Entrega 1 — solo lectura).
 *
 * Cada ruta trae su propio `requierePanel([roles])` porque la sección la usan
 * los 3 roles con distinto alcance (el alcance fino lo aplica el service). Por
 * eso este router se monta ANTES del gate global de superadmin en
 * `routes/admin/index.ts` (igual que /yo y /2fa).
 *
 *   GET /            → los 3 roles (tabla, con alcance por rol)
 *   GET /vendedores  → superadmin + gerente (filtro "por vendedor")
 *   GET /:id         → los 3 roles (ficha, con alcance por rol)
 *
 * Nota de orden: /vendedores se declara ANTES de /:id para que "vendedores" no
 * caiga en el comodín del id.
 *
 * Ubicación: apps/api/src/routes/admin/negocios.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
    listarNegociosController,
    listarVendedoresFiltroController,
    listarCiudadesController,
    obtenerDetalleNegocioController,
    listarSucursalesNegocioController,
    obtenerDetalleSucursalController,
    suspenderNegocioController,
    reactivarNegocioController,
    reasignarVendedorController,
    marcarPagadoController,
    cancelarNegocioController,
} from '../../controllers/admin/negocios.controller.js';

const router: Router = Router();

router.get('/', requierePanel(['superadmin', 'gerente', 'vendedor']), listarNegociosController);

router.get('/vendedores', requierePanel(['superadmin', 'gerente']), listarVendedoresFiltroController);

router.get('/ciudades', requierePanel(['superadmin', 'gerente', 'vendedor']), listarCiudadesController);

router.get('/:id', requierePanel(['superadmin', 'gerente', 'vendedor']), obtenerDetalleNegocioController);

// Sucursales del negocio (lista para expandir la fila + detalle para el modal).
router.get('/:id/sucursales', requierePanel(['superadmin', 'gerente', 'vendedor']), listarSucursalesNegocioController);
router.get('/:id/sucursales/:sucursalId', requierePanel(['superadmin', 'gerente', 'vendedor']), obtenerDetalleSucursalController);

// ─── Acciones (Entrega 2) — escritura ───────────────────────────────────────────
// Pausar (suspender) y Reasignar: superadmin + gerente (alcance de región en el service).
// Pausar/Reactivar además accionan Stripe (Parada 2).
router.post('/:id/suspender', requierePanel(['superadmin', 'gerente']), suspenderNegocioController);
router.post('/:id/reactivar', requierePanel(['superadmin', 'gerente']), reactivarNegocioController);
router.post('/:id/reasignar-vendedor', requierePanel(['superadmin', 'gerente']), reasignarVendedorController);
// Marcar pagado y Cancelar: SOLO superadmin (Parada 2).
router.post('/:id/marcar-pagado', requierePanel(['superadmin']), marcarPagadoController);
router.post('/:id/cancelar', requierePanel(['superadmin']), cancelarNegocioController);

export default router;
