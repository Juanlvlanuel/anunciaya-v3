/**
 * resenas.routes.ts
 * ===================
 * Rutas de reseñas.
 *
 * ENDPOINTS PÚBLICOS:
 * - GET  /api/resenas/sucursal/:sucursalId          → Reseñas de una sucursal
 * - GET  /api/resenas/sucursal/:sucursalId/promedio  → Promedio de calificación
 *
 * ENDPOINTS AUTH NORMAL (clientes):
 * - GET  /api/resenas/puede-resenar/:sucursalId      → ¿Puede reseñar?
 * - POST /api/resenas                                → Crear reseña
 * - PUT  /api/resenas/:id                            → Editar reseña propia
 *
 * ENDPOINTS SCANYA (token ScanYA + permiso):
 * - GET  /api/resenas/negocio                        → Reseñas del negocio
 * - POST /api/resenas/responder                      → Responder reseña
 *
 * ENDPOINTS BUSINESS STUDIO (token normal + negocio + sucursal):
 * - GET  /api/resenas/business-studio                → Reseñas del negocio para BS
 * - GET  /api/resenas/business-studio/kpis           → KPIs (promedio, distribución)
 * - POST /api/resenas/business-studio/responder      → Responder reseña desde BS
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
    getResenasNegocio,
    postResponderResena,
    putEditarResena,
    getResenasBS,
    getKPIsResenasBS,
    postResponderResenaBS,
} from '../controllers/resenas.controller.js';
import { verificarTokenScanYA, verificarPermiso } from '../middleware/scanyaAuth.middleware.js';
import { verificarNegocio } from '../middleware/negocio.middleware.js';
import { validarAccesoSucursal } from '../middleware/sucursal.middleware.js';

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
router.put('/:id', verificarToken, putEditarResena);

// =============================================================================
// RUTAS PROTEGIDAS SCANYA (requieren token ScanYA + permiso responderResenas)
// =============================================================================

router.get('/negocio', verificarTokenScanYA, verificarPermiso('responderResenas'), getResenasNegocio);
router.post('/responder', verificarTokenScanYA, verificarPermiso('responderResenas'), postResponderResena);

// =============================================================================
// RUTAS BUSINESS STUDIO (requieren token normal + negocio + sucursal)
// =============================================================================

router.get('/business-studio', verificarToken, verificarNegocio, validarAccesoSucursal, getResenasBS);
router.get('/business-studio/kpis', verificarToken, verificarNegocio, validarAccesoSucursal, getKPIsResenasBS);
router.post('/business-studio/responder', verificarToken, verificarNegocio, validarAccesoSucursal, postResponderResenaBS);

export default router;