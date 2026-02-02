/**
 * puntos.routes.ts
 * =================
 * Rutas para el módulo de Puntos (Configuración, Recompensas, Estadísticas)
 * 
 * Ubicación: apps/api/src/routes/puntos.routes.ts
 * 
 * RUTAS:
 * GET    /api/puntos/configuracion              - Obtener configuración
 * PUT    /api/puntos/configuracion              - Actualizar configuración
 * GET    /api/puntos/recompensas                - Listar recompensas
 * GET    /api/puntos/recompensas/:id            - Obtener recompensa
 * POST   /api/puntos/recompensas                - Crear recompensa
 * PUT    /api/puntos/recompensas/:id            - Actualizar recompensa
 * DELETE /api/puntos/recompensas/:id            - Eliminar recompensa
 * GET    /api/puntos/estadisticas               - Obtener KPIs
 * 
 * NOTA: Historial y Revocar → transacciones.routes.ts
 *       Top Clientes → clientes.routes.ts
 */

import { Router, type Router as RouterType } from 'express';
import {
  obtenerConfigPuntosController,
  actualizarConfigPuntosController,
  obtenerRecompensasController,
  obtenerRecompensaPorIdController,
  crearRecompensaController,
  actualizarRecompensaController,
  eliminarRecompensaController,
  obtenerEstadisticasController,
} from '../controllers/puntos.controller.js';

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
// RUTAS: CONFIGURACIÓN DE PUNTOS
// =============================================================================

/**
 * GET /api/puntos/configuracion
 * Obtiene la configuración de puntos del negocio
 * Acceso: Dueños y Gerentes
 */
router.get('/configuracion', obtenerConfigPuntosController);

/**
 * PUT /api/puntos/configuracion
 * Actualiza la configuración de puntos
 * Acceso: SOLO DUEÑOS
 */
router.put('/configuracion', actualizarConfigPuntosController);

// =============================================================================
// RUTAS: RECOMPENSAS
// =============================================================================

/**
 * GET /api/puntos/recompensas?soloActivas=true
 * Lista todas las recompensas del negocio
 * Acceso: Dueños y Gerentes
 */
router.get('/recompensas', obtenerRecompensasController);

/**
 * GET /api/puntos/recompensas/:id
 * Obtiene una recompensa específica
 * Acceso: Dueños y Gerentes
 */
router.get('/recompensas/:id', obtenerRecompensaPorIdController);

/**
 * POST /api/puntos/recompensas
 * Crea una nueva recompensa
 * Acceso: SOLO DUEÑOS
 */
router.post('/recompensas', crearRecompensaController);

/**
 * PUT /api/puntos/recompensas/:id
 * Actualiza una recompensa existente
 * Acceso: SOLO DUEÑOS
 */
router.put('/recompensas/:id', actualizarRecompensaController);

/**
 * DELETE /api/puntos/recompensas/:id
 * Elimina (soft delete) una recompensa
 * Acceso: SOLO DUEÑOS
 */
router.delete('/recompensas/:id', eliminarRecompensaController);

// =============================================================================
// RUTAS: ESTADÍSTICAS
// =============================================================================

/**
 * GET /api/puntos/estadisticas?periodo=semana
 * Obtiene KPIs de puntos con filtros de periodo
 * Acceso: Dueños y Gerentes
 */
router.get('/estadisticas', obtenerEstadisticasController);

// =============================================================================
// EXPORTAR ROUTER
// =============================================================================

export default router;