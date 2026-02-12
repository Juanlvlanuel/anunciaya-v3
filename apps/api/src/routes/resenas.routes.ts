/**
 * resenas.routes.ts
 * ===================
 * Rutas de reseñas.
 *
 * ENDPOINTS:
 * - GET  /api/resenas/sucursal/:sucursalId          → Reseñas de una sucursal (público)
 * - GET  /api/resenas/sucursal/:sucursalId/promedio  → Promedio de calificación (público)
 * - GET  /api/resenas/puede-resenar/:sucursalId      → ¿Puede reseñar? (auth)
 * - POST /api/resenas                                → Crear reseña (auth)
 *
 * UBICACIÓN: apps/api/src/routes/resenas.routes.ts
 */

import { Router } from 'express';
import { verificarToken } from '../middleware/auth.js';
import {
    getResenasSucursal,
    getPromedioResenas,
    getPuedeResenar,
    postCrearResena,
} from '../controllers/resenas.controller.js';

const router: Router = Router();

// =============================================================================
// RUTAS PÚBLICAS
// =============================================================================

router.get('/sucursal/:sucursalId', getResenasSucursal);
router.get('/sucursal/:sucursalId/promedio', getPromedioResenas);

// =============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================================================

router.get('/puede-resenar/:sucursalId', verificarToken, getPuedeResenar);
router.post('/', verificarToken, postCrearResena);

export default router;