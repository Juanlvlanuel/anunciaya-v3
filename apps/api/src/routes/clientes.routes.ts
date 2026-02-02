/**
 * clientes.routes.ts
 * ====================
 * Rutas para el módulo de Clientes (Sistema de Lealtad)
 * 
 * Ubicación: apps/api/src/routes/clientes.routes.ts
 * 
 * RUTAS:
 * GET    /api/clientes/top                     - Top clientes con puntos
 * 
 * NOTA: Consume controllers de clientes.controller.ts
 *       La lógica vive en puntos.service.ts (service compartido)
 */

import { Router, type Router as RouterType } from 'express';
import {
  obtenerTopClientesController,
} from '../controllers/clientes.controller.js';

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
// RUTAS: TOP CLIENTES
// =============================================================================

/**
 * GET /api/clientes/top?limit=10
 * Obtiene los clientes con más puntos disponibles
 * Acceso: Dueños y Gerentes
 */
router.get('/top', obtenerTopClientesController);

// =============================================================================
// EXPORTAR ROUTER
// =============================================================================

export default router;