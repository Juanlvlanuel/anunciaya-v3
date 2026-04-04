/**
 * alertas.routes.ts
 * ==================
 * Rutas del módulo de Alertas — Business Studio.
 * Base: /api/business/alertas
 *
 * Ubicación: apps/api/src/routes/alertas.routes.ts
 */

import { Router } from 'express';
import * as alertasController from '../controllers/alertas.controller.js';
import { verificarToken } from '../middleware/auth.js';
import { verificarNegocio } from '../middleware/negocio.middleware.js';
import { validarAccesoSucursal } from '../middleware/sucursal.middleware.js';

const router: Router = Router();

// Middleware global para todas las rutas de alertas
router.use(verificarToken);
router.use(verificarNegocio);
router.use(validarAccesoSucursal);

// --- Rutas de lectura ---
router.get('/', alertasController.obtenerAlertas);
router.get('/kpis', alertasController.obtenerKPIs);
router.get('/no-leidas', alertasController.contarNoLeidas);
router.get('/configuracion', alertasController.obtenerConfiguracion);
router.get('/:id', alertasController.obtenerAlerta);

// --- Rutas de escritura ---
router.put('/marcar-todas-leidas', alertasController.marcarTodasLeidasController);
router.put('/configuracion/:tipo', alertasController.actualizarConfiguracionController);
router.put('/:id/leida', alertasController.marcarLeida);
router.put('/:id/resuelta', alertasController.marcarResuelta);

// --- Rutas de eliminación ---
router.delete('/resueltas', alertasController.eliminarResueltasController);
router.delete('/:id', alertasController.eliminarAlertaController);

export default router;
