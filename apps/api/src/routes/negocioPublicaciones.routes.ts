/**
 * ============================================================================
 * NEGOCIO PUBLICACIONES ROUTES - Rutas de la API
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/routes/negocioPublicaciones.routes.ts
 *
 * PROPÓSITO:
 * Feed de publicaciones libres de negocio (Negocios). Calca la estructura de
 * `ofertas.routes.ts`:
 *   1. Feed público: /feed, /:id (verificarTokenOpcional)
 *   2. CRUD Business Studio: verificarToken + verificarNegocio [+ validarAccesoSucursal]
 *   3. Comentarios: verificarToken (cualquier modo, a diferencia de MarketPlace)
 */

import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import {
    getFeed,
    getPublicacion,
    postRegistrarVista,
    postCrearPublicacion,
    putActualizarPublicacion,
    deletePublicacion,
    postUploadImagen,
    deleteFotoHuerfana,
    getComentarios,
    postCrearComentario,
    putEditarComentario,
    deleteComentario,
} from '../controllers/negocioPublicaciones.controller.js';
import { verificarToken } from '../middleware/auth.js';
import { verificarTokenOpcional } from '../middleware/authOpcional.middleware.js';
import { verificarNegocio } from '../middleware/negocio.middleware.js';
import { validarAccesoSucursal } from '../middleware/sucursal.middleware.js';

const router: ExpressRouter = Router();

// =============================================================================
// RUTAS PÚBLICAS
// =============================================================================

/**
 * GET /api/negocio-publicaciones/feed
 * Query: ciudadId?, sucursalId?, pagina, limite
 */
router.get('/feed', verificarTokenOpcional, getFeed);

/**
 * POST /api/negocio-publicaciones/upload-imagen
 * IMPORTANTE: debe ir ANTES de GET/PUT/DELETE /:id para evitar colisiones.
 */
router.post(
    '/upload-imagen',
    verificarToken,
    verificarNegocio,
    postUploadImagen
);

/**
 * DELETE /api/negocio-publicaciones/foto-huerfana
 */
router.delete(
    '/foto-huerfana',
    verificarToken,
    verificarNegocio,
    deleteFotoHuerfana
);

/**
 * GET /api/negocio-publicaciones/:id/comentarios
 * IMPORTANTE: declarada ANTES de `GET /:id` para evitar colisión con Express.
 */
router.get('/:id/comentarios', verificarTokenOpcional, getComentarios);

/**
 * POST /api/negocio-publicaciones/:id/comentarios
 * Cualquier usuario autenticado, cualquier modo (Personal o Comercial).
 */
router.post('/:id/comentarios', verificarToken, postCrearComentario);

/**
 * PUT /api/negocio-publicaciones/comentarios/:id
 * Declarada ANTES de `PUT /:id` para evitar colisión.
 */
router.put('/comentarios/:id', verificarToken, putEditarComentario);

/**
 * DELETE /api/negocio-publicaciones/comentarios/:id
 */
router.delete('/comentarios/:id', verificarToken, deleteComentario);

/**
 * POST /api/negocio-publicaciones/:id/vista
 * Sin auth requerida.
 */
router.post('/:id/vista', postRegistrarVista);

/**
 * GET /api/negocio-publicaciones/:id
 * Detalle público.
 */
router.get('/:id', verificarTokenOpcional, getPublicacion);

// =============================================================================
// RUTAS BUSINESS STUDIO (REQUIEREN AUTH + MODO COMERCIAL + SUCURSAL)
// =============================================================================

/**
 * POST /api/negocio-publicaciones
 * Crear nueva publicación.
 * Query: sucursalId (agregado automáticamente por interceptor Axios en modo comercial)
 */
router.post(
    '/',
    verificarToken,
    verificarNegocio,
    validarAccesoSucursal,
    postCrearPublicacion
);

/**
 * PUT /api/negocio-publicaciones/:id
 */
router.put(
    '/:id',
    verificarToken,
    verificarNegocio,
    validarAccesoSucursal,
    putActualizarPublicacion
);

/**
 * DELETE /api/negocio-publicaciones/:id
 * Archiva (soft-delete manual, sin TTL).
 */
router.delete(
    '/:id',
    verificarToken,
    verificarNegocio,
    validarAccesoSucursal,
    deletePublicacion
);

// =============================================================================
// EXPORTS
// =============================================================================

export default router;
