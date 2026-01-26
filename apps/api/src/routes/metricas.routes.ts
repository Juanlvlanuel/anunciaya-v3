/**
 * ============================================================================
 * MÉTRICAS ROUTES - Rutas de Métricas
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/routes/metricas.routes.ts
 * 
 * PROPÓSITO:
 * Define las rutas HTTP para registrar y obtener métricas
 * 
 * ENDPOINTS DISPONIBLES:
 * - POST /api/metricas/view         - Registrar vista (requiere auth)
 * - POST /api/metricas/share        - Registrar compartido (requiere auth)
 * - POST /api/metricas/click        - Registrar click (requiere auth)
 * - POST /api/metricas/message      - Registrar mensaje (requiere auth)
 * - POST /api/metricas/public-view  - Registrar vista pública (NO requiere auth)
 * - GET  /api/metricas/:entityType/:entityId - Obtener métricas (requiere auth)
 */

import { Router } from 'express';
import {
    registrarViewController,
    registrarShareController,
    registrarClickController,
    registrarMessageController,
    obtenerMetricasController,
    registrarPublicViewController,
} from '../controllers/metricas.controller';
import { verificarToken } from '../middleware/auth';

const router: Router = Router();

// =============================================================================
// RUTAS PÚBLICAS (Sin autenticación)
// =============================================================================

/**
 * POST /api/metricas/public-view
 * Registra una vista pública de una entidad (sin autenticación)
 * 
 * Body:
 * {
 *   "entityType": "negocio",
 *   "entityId": "uuid-del-negocio"
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Vista registrada"
 * }
 */
router.post('/public-view', registrarPublicViewController);

// =============================================================================
// RUTAS PROTEGIDAS (Requieren autenticación)
// =============================================================================

// Aplicar middleware de autenticación a todas las rutas siguientes
router.use(verificarToken);

/**
 * POST /api/metricas/view
 * Registra una vista de una entidad
 * 
 * Body:
 * {
 *   "entityType": "negocio",
 *   "entityId": "uuid-del-negocio"
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Vista registrada"
 * }
 */
router.post('/view', registrarViewController);

/**
 * POST /api/metricas/share
 * Registra un compartido de una entidad
 * 
 * Body:
 * {
 *   "entityType": "negocio",
 *   "entityId": "uuid-del-negocio"
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Compartido registrado"
 * }
 */
router.post('/share', registrarShareController);

/**
 * POST /api/metricas/click
 * Registra un click en un enlace de una entidad
 * 
 * Body:
 * {
 *   "entityType": "negocio",
 *   "entityId": "uuid-del-negocio"
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Click registrado"
 * }
 */
router.post('/click', registrarClickController);

/**
 * POST /api/metricas/message
 * Registra un mensaje enviado a una entidad
 * 
 * Body:
 * {
 *   "entityType": "negocio",
 *   "entityId": "uuid-del-negocio"
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Mensaje registrado"
 * }
 */
router.post('/message', registrarMessageController);

/**
 * GET /api/metricas/:entityType/:entityId
 * Obtiene todas las métricas de una entidad
 * 
 * Params:
 * - entityType: "negocio" | "articulo" | "publicacion" | etc
 * - entityId: UUID de la entidad
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "data": {
 *     "totalLikes": 150,
 *     "totalSaves": 89,
 *     "totalViews": 1234,
 *     "totalShares": 45,
 *     "totalClicks": 67,
 *     "totalMessages": 23,
 *     "totalRatings": 15,
 *     "promedioRating": 4.5,
 *     "totalResenas": 12,
 *     "updatedAt": "2024-12-26T..."
 *   }
 * }
 */
router.get('/:entityType/:entityId', obtenerMetricasController);

// =============================================================================
// EXPORTS
// =============================================================================

export default router;