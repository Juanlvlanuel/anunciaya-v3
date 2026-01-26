/**
 * ============================================================================
 * RESEÑAS ROUTES - Rutas de Reseñas
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/routes/resenas.routes.ts
 * 
 * ENDPOINTS:
 * - GET /api/resenas/sucursal/:sucursalId → Reseñas de una sucursal
 * - GET /api/resenas/sucursal/:sucursalId/promedio → Promedio de calificación
 * 
 * CREADO: Fase 5.3 - Sistema de Reseñas
 */

import { Router } from 'express';
import { getResenasSucursal, getPromedioResenas } from '../controllers/resenas.controller.js';

const router: Router = Router();

// =============================================================================
// RUTAS PÚBLICAS (no requieren autenticación)
// =============================================================================

/**
 * GET /api/resenas/sucursal/:sucursalId
 * 
 * Obtiene las reseñas de una sucursal
 * Incluye datos del autor (nombre, foto)
 * Ordenadas por fecha (más recientes primero)
 */
router.get('/sucursal/:sucursalId', getResenasSucursal);

/**
 * GET /api/resenas/sucursal/:sucursalId/promedio
 * 
 * Obtiene el promedio de calificación y total de reseñas
 */
router.get('/sucursal/:sucursalId/promedio', getPromedioResenas);

// =============================================================================
// EXPORTS
// =============================================================================

export default router;