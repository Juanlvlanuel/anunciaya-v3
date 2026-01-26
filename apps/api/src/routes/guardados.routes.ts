/**
 * ============================================================================
 * GUARDADOS ROUTES - Rutas de Guardados
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/routes/guardados.routes.ts
 * 
 * PROPÓSITO:
 * Define las rutas para el sistema de guardados
 * 
 * ENDPOINTS:
 * POST   /api/guardados                      - Agregar a guardados
 * DELETE /api/guardados/:entityType/:entityId - Quitar de guardados
 * GET    /api/guardados                      - Obtener guardados del usuario
 */


import { Router } from 'express';
import { verificarToken } from '../middleware/auth';
import {
    agregarGuardadoController,
    quitarGuardadoController,
    obtenerGuardadosController,
} from '../controllers/guardados.controller';


const router: Router = Router();

// =============================================================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// =============================================================================

// Agregar a guardados
router.post(
    '/',
    verificarToken,
    agregarGuardadoController
);

// Quitar de guardados
router.delete(
    '/:entityType/:entityId',
    verificarToken,
    quitarGuardadoController
);

// Obtener guardados del usuario
router.get(
    '/',
    verificarToken,
    obtenerGuardadosController
);

// =============================================================================
// EXPORTS
// =============================================================================

export default router;