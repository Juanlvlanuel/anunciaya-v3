/**
 * routes/admin/vendedores.routes.ts
 * =================================
 * Rutas de la sección "Vendedores y comisiones" del Panel Admin — pieza A: la CARTERA (Fase 1 · VER).
 *
 * Cada ruta trae su propio `requierePanel([roles])` porque la sección la usan los 3 roles con distinto
 * alcance (el alcance fino lo aplica el service). Por eso este router se monta ANTES del gate global de
 * superadmin en `routes/admin/index.ts` (igual que /negocios, /usuarios, /equipo).
 *
 *   GET /          → super + gerente + vendedor (lista de la red; el vendedor solo se ve a sí mismo)
 *   GET /conteo    → super + gerente + vendedor (badge del menú)
 *   GET /:id       → super + gerente + vendedor (ficha; :id = usuarios.id del vendedor)
 *   GET /:id/cartera → super + gerente + vendedor (negocios atribuidos al vendedor)
 *
 * Nota de orden: /conteo se declara ANTES de /:id para que "conteo" no caiga en el comodín del id.
 *
 * Ubicación: apps/api/src/routes/admin/vendedores.routes.ts
 */

import { Router } from 'express';
import { requierePanel } from '../../middleware/panel.middleware.js';
import {
    listarVendedoresController,
    contarVendedoresController,
    obtenerVendedorController,
    listarCarteraController,
    listarComisionesVendedorController,
    recalcularComisionesController,
} from '../../controllers/admin/vendedores.controller.js';

const router: Router = Router();

router.get('/', requierePanel(['superadmin', 'gerente', 'vendedor']), listarVendedoresController);

// Total del alcance (contador del menú). Antes de /:id para que "conteo" no caiga en el comodín.
router.get('/conteo', requierePanel(['superadmin', 'gerente', 'vendedor']), contarVendedoresController);

// Recalcular/devengar las comisiones recurrentes del periodo (solo super; el dinero lo mueve el super).
router.post('/comisiones/recalcular', requierePanel(['superadmin']), recalcularComisionesController);

router.get('/:id', requierePanel(['superadmin', 'gerente', 'vendedor']), obtenerVendedorController);

// Cartera del vendedor (sus negocios atribuidos, con estado de membresía).
router.get('/:id/cartera', requierePanel(['superadmin', 'gerente', 'vendedor']), listarCarteraController);

// Estado de cuenta de comisiones del vendedor (devengado / pagado / pendiente).
router.get('/:id/comisiones', requierePanel(['superadmin', 'gerente', 'vendedor']), listarComisionesVendedorController);

export default router;
