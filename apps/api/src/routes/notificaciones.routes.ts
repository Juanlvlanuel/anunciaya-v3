/**
 * notificaciones.routes.ts
 * =========================
 * Rutas para el módulo de Notificaciones.
 *
 * UBICACIÓN: apps/api/src/routes/notificaciones.routes.ts
 *
 * RUTAS:
 * GET   /api/notificaciones?modo=personal&limit=20&offset=0  - Obtener notificaciones
 * GET   /api/notificaciones/no-leidas?modo=personal          - Contar no leídas (badge)
 * PATCH /api/notificaciones/marcar-todas?modo=personal       - Marcar todas como leídas
 * PATCH /api/notificaciones/:id/leida                        - Marcar una como leída
 */

import { Router, type Router as RouterType } from 'express';
import {
  obtenerNotificacionesController,
  contarNoLeidasController,
  marcarTodasLeidasController,
  marcarLeidaController,
} from '../controllers/notificaciones.controller.js';

// Importar middlewares
import { verificarToken } from '../middleware/auth.js';

// =============================================================================
// CREAR ROUTER
// =============================================================================

const router: RouterType = Router();

// =============================================================================
// MIDDLEWARE: Todas las rutas requieren autenticación
// =============================================================================
router.use(verificarToken);

// =============================================================================
// RUTAS
// =============================================================================

/**
 * GET /api/notificaciones?modo=personal&limit=20&offset=0
 * Obtiene notificaciones paginadas del usuario
 */
router.get('/', obtenerNotificacionesController);

/**
 * GET /api/notificaciones/no-leidas?modo=personal
 * Retorna la cantidad de notificaciones no leídas (para el badge)
 */
router.get('/no-leidas', contarNoLeidasController);

/**
 * PATCH /api/notificaciones/marcar-todas?modo=personal
 * Marca todas las notificaciones del modo como leídas
 */
router.patch('/marcar-todas', marcarTodasLeidasController);

/**
 * PATCH /api/notificaciones/:id/leida
 * Marca una notificación específica como leída
 */
router.patch('/:id/leida', marcarLeidaController);

// =============================================================================
// EXPORTAR ROUTER
// =============================================================================

export default router;