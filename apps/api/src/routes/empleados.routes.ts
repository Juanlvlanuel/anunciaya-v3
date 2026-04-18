/**
 * empleados.routes.ts
 * ====================
 * Rutas del módulo de Empleados — Business Studio.
 * Base: /api/business/empleados
 *
 * Ubicación: apps/api/src/routes/empleados.routes.ts
 */

import { Router } from 'express';
import * as empleadosController from '../controllers/empleados.controller.js';
import { verificarToken } from '../middleware/auth.js';
import { verificarNegocio } from '../middleware/negocio.middleware.js';

const router: Router = Router();

// Middleware global
router.use(verificarToken);
router.use(verificarNegocio);

// --- Lectura ---
router.get('/kpis', empleadosController.obtenerKPIsController);
router.get('/verificar-nick', empleadosController.verificarNickController);
router.get('/', empleadosController.obtenerEmpleadosController);
router.get('/:id', empleadosController.obtenerDetalleController);

// --- Escritura ---
router.post('/', empleadosController.crearEmpleadoController);
router.put('/:id', empleadosController.actualizarEmpleadoController);
router.patch('/:id/activo', empleadosController.toggleActivoController);
router.delete('/:id', empleadosController.eliminarEmpleadoController);
router.put('/:id/horarios', empleadosController.actualizarHorariosController);
router.post('/:id/revocar-sesion', empleadosController.revocarSesionController);

export default router;
