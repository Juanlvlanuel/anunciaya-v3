/**
 * clientes.routes.ts
 * ====================
 * Rutas para el módulo de Clientes (Sistema de Lealtad)
 * 
 * Ubicación: apps/api/src/routes/clientes.routes.ts
 * 
 * RUTAS:
 * GET    /api/clientes/top                     - Top clientes con puntos
 * GET    /api/clientes/kpis                    - KPIs para página Clientes BS
 * GET    /api/clientes/:id/historial           - Historial de transacciones de un cliente
 * GET    /api/clientes/:id                     - Detalle completo de un cliente
 * GET    /api/clientes                         - Lista de clientes con filtros
 * 
 * NOTA: Consume controllers de clientes.controller.ts
 *       La lógica vive en puntos.service.ts y clientes.service.ts
 * 
 * IMPORTANTE: Las rutas con parámetros (:id) van DESPUÉS de las estáticas
 *             para evitar que Express interprete "top" o "kpis" como un :id
 */

import { Router, type Router as RouterType } from 'express';
import {
  obtenerTopClientesController,
  obtenerKPIsClientesController,
  obtenerClientesController,
  obtenerDetalleClienteController,
  obtenerHistorialClienteController,
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
// RUTAS ESTÁTICAS (van primero para evitar conflicto con :id)
// =============================================================================

/**
 * GET /api/clientes/top?limit=10
 * Obtiene los clientes con más puntos disponibles
 * Acceso: Dueños y Gerentes
 */
router.get('/top', obtenerTopClientesController);

/**
 * GET /api/clientes/kpis
 * Obtiene 4 KPIs: total clientes, distribución nivel, nuevos mes, inactivos
 * Acceso: Dueños y Gerentes
 */
router.get('/kpis', obtenerKPIsClientesController);

// =============================================================================
// RUTAS CON PARÁMETROS (van después)
// =============================================================================

/**
 * GET /api/clientes/:id/historial?limit=20&offset=0
 * Historial de transacciones de un cliente específico
 * Acceso: Dueños y Gerentes
 */
router.get('/:id/historial', obtenerHistorialClienteController);

/**
 * GET /api/clientes/:id
 * Detalle completo de un cliente
 * Acceso: Dueños y Gerentes
 */
router.get('/:id', obtenerDetalleClienteController);

/**
 * GET /api/clientes?busqueda=xxx&nivel=oro&limit=20&offset=0
 * Lista de clientes con filtros y paginación
 * Acceso: Dueños y Gerentes
 */
router.get('/', obtenerClientesController);

// =============================================================================
// EXPORTAR ROUTER
// =============================================================================

export default router;