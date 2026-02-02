/**
 * transacciones.routes.ts
 * =========================
 * Rutas para el módulo de Transacciones (Sistema de Lealtad)
 * 
 * Ubicación: apps/api/src/routes/transacciones.routes.ts
 * 
 * RUTAS:
 * GET    /api/transacciones/historial       - Historial de transacciones de puntos
 * POST   /api/transacciones/:id/revocar     - Revocar transacción
 * 
 * NOTA: Consume controllers de transacciones.controller.ts
 *       La lógica vive en puntos.service.ts (service compartido)
 */

import { Router, type Router as RouterType } from 'express';
import {
  obtenerHistorialController,
  revocarTransaccionController,
} from '../controllers/transacciones.controller.js';

// Importar middlewares
import { verificarToken } from '../middleware/auth.js';
import { verificarNegocio } from '../middleware/negocio.middleware.js';

// =============================================================================
// CREAR ROUTER
// =============================================================================

const router: RouterType = Router();

// =============================================================================
// MIDDLEWARE: Todas las rutas requieren autenticación Y tener negocio
// =============================================================================
router.use(verificarToken);
router.use(verificarNegocio);

// =============================================================================
// RUTAS: HISTORIAL DE TRANSACCIONES
// =============================================================================

/**
 * GET /api/transacciones/historial?periodo=semana&limit=50&offset=0
 * Obtiene historial de transacciones de puntos con filtros
 * Acceso: Dueños y Gerentes
 */
router.get('/historial', obtenerHistorialController);

// =============================================================================
// RUTAS: REVOCAR TRANSACCIÓN
// =============================================================================

/**
 * POST /api/transacciones/:id/revocar
 * Revoca una transacción de puntos
 * Acceso: Dueños y Gerentes
 */
router.post('/:id/revocar', revocarTransaccionController);

// =============================================================================
// EXPORTAR ROUTER
// =============================================================================

export default router;