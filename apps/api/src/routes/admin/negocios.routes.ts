/**
 * routes/admin/negocios.routes.ts
 * ===============================
 * Rutas de la sección Negocios del Panel Admin: lectura (tabla/ficha/sucursales/
 * pagos/filtros), acciones de escritura (pausar/reactivar/reasignar/registrar
 * pago/cancelar/editar correo) y alta manual en efectivo.
 *
 * Cada ruta trae su propio `requierePanel([roles])` porque la sección la usan
 * los 3 roles con distinto alcance (el alcance fino lo aplica el service). Por
 * eso este router se monta ANTES del gate global de superadmin en
 * `routes/admin/index.ts` (igual que /yo y /2fa).
 *
 *   GET   /            → los 3 roles (tabla, con alcance por rol)
 *   GET   /vendedores  → superadmin + gerente (filtro "por vendedor")
 *   GET   /:id         → los 3 roles (ficha, con alcance por rol)
 *   POST  /:id/{marcar-pagado,suspender,reactivar,reasignar-vendedor}
 *                      → superadmin + gerente (alcance de región en el service)
 *   POST  /:id/cancelar       → solo superadmin
 *   PATCH /:id/correo-dueno   → superadmin + gerente
 *   POST  /alta-manual        → los 3 roles (vendedor se auto-atribuye)
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
    catalogoCiudadesController,
    altaManualController,
    listarPagosNegocioController,
    existeCorreoController,
    cambiarCorreoDuenoController,
    editarPagoController,
    contarNegociosController,
} from '../../controllers/admin/negocios.controller.js';

const router: Router = Router();

router.get('/', requierePanel(['superadmin', 'gerente', 'vendedor']), listarNegociosController);

router.get('/vendedores', requierePanel(['superadmin', 'gerente']), listarVendedoresFiltroController);

router.get('/ciudades', requierePanel(['superadmin', 'gerente', 'vendedor']), listarCiudadesController);

// Catálogo de ciudades para el SELECTOR del alta (catálogo completo por región, no solo las
// que ya son sede). Antes de /:id para que "catalogo-ciudades" no caiga en el comodín del id.
router.get('/catalogo-ciudades', requierePanel(['superadmin', 'gerente', 'vendedor']), catalogoCiudadesController);

// Chequeo de existencia de correo (aviso temprano del alta): solo booleano, sin datos del usuario.
// Antes de /:id para que "existe-correo" no caiga en el comodín del id.
router.get('/existe-correo', requierePanel(['superadmin', 'gerente', 'vendedor']), existeCorreoController);

// Total de negocios del alcance (contador del menú). Antes de /:id para que "conteo" no caiga en el comodín.
router.get('/conteo', requierePanel(['superadmin', 'gerente', 'vendedor']), contarNegociosController);

router.get('/:id', requierePanel(['superadmin', 'gerente', 'vendedor']), obtenerDetalleNegocioController);

// Sucursales del negocio (lista para expandir la fila + detalle para el modal).
router.get('/:id/sucursales', requierePanel(['superadmin', 'gerente', 'vendedor']), listarSucursalesNegocioController);
router.get('/:id/sucursales/:sucursalId', requierePanel(['superadmin', 'gerente', 'vendedor']), obtenerDetalleSucursalController);

// Historial de pagos de membresía (bitácora) — para la ficha del método manual.
router.get('/:id/pagos', requierePanel(['superadmin', 'gerente', 'vendedor']), listarPagosNegocioController);

// ─── Acciones (Entrega 2) — escritura ───────────────────────────────────────────
// Pausar (suspender) y Reasignar: superadmin + gerente (alcance de región en el service).
// Pausar/Reactivar además accionan Stripe (Parada 2).
router.post('/:id/suspender', requierePanel(['superadmin', 'gerente']), suspenderNegocioController);
router.post('/:id/reactivar', requierePanel(['superadmin', 'gerente']), reactivarNegocioController);
router.post('/:id/reasignar-vendedor', requierePanel(['superadmin', 'gerente']), reasignarVendedorController);
// Marcar pagado: superadmin + gerente (alcance de region en el service). Cancelar: SOLO superadmin (Parada 2).
// Registrar pago: super + gerente (cualquier negocio de su alcance). El VENDEDOR también, pero
// SOLO en sus negocios MANUALES (sin tarjeta) y sin cortesía — el service lo blinda.
router.post('/:id/marcar-pagado', requierePanel(['superadmin', 'gerente', 'vendedor']), marcarPagadoController);
router.post('/:id/cancelar', requierePanel(['superadmin']), cancelarNegocioController);
// Editar el correo del dueño (rescate de alta manual): superadmin + gerente (alcance en el service).
router.patch('/:id/correo-dueno', requierePanel(['superadmin', 'gerente']), cambiarCorreoDuenoController);
// Editar una fila del historial de pagos (corregir concepto/monto/meses): superadmin + gerente.
router.patch('/:id/pagos/:pagoId', requierePanel(['superadmin', 'gerente']), editarPagoController);

// Alta MANUAL de negocio en efectivo/transferencia (sin Stripe): los 3 roles, con alcance
// de región en el service (vendedor se auto-atribuye; gerente acotado a su región).
router.post('/alta-manual', requierePanel(['superadmin', 'gerente', 'vendedor']), altaManualController);

export default router;
