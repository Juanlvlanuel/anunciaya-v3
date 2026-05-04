/**
 * ============================================================================
 * MARKETPLACE ROUTES — Endpoints v1
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/routes/marketplace.routes.ts
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§12)
 * Sprint:      docs/prompts Marketplace/Sprint-1-Backend-Base.md
 *
 * Patrón: idéntico a `articulos.routes.ts`. Las rutas más específicas (como
 * /upload-imagen y /mis-articulos) van ANTES de las paramétricas (/:id) para
 * que Express no las confunda.
 *
 * Endpoints expuestos en este sprint:
 *
 *   PÚBLICOS (verificarTokenOpcional)
 *   GET    /feed
 *   GET    /articulos/:id
 *   POST   /articulos/:id/vista
 *
 *   PRIVADOS (verificarToken + requiereModoPersonal)
 *   POST   /upload-imagen
 *   GET    /mis-articulos
 *   POST   /articulos
 *   PUT    /articulos/:id
 *   PATCH  /articulos/:id/estado
 *   DELETE /articulos/:id
 *
 * NO entran en este sprint (futuros):
 *   - /buscar/sugerencias, /buscar/populares, /buscar           → Sprint 6
 *   - /vendedor/:usuarioId                                       → Sprint 5
 *   - /articulos/:id/marcar-vendida, /articulos/:id/confirmar-compra → Sprint 8
 */

import { Router } from 'express';
import {
    getFeed,
    getArticulo,
    postRegistrarVista,
    postCrearArticulo,
    putActualizarArticulo,
    patchCambiarEstado,
    deleteArticulo,
    getMisArticulos,
    postUploadImagen,
    getVendedorMarketplace,
    getPublicacionesDeVendedor,
    getSugerenciasBuscador,
    getPopularesBuscador,
    getBuscarArticulos,
    postReactivarArticulo,
} from '../controllers/marketplace.controller.js';
import { verificarToken } from '../middleware/auth.js';
import { verificarTokenOpcional } from '../middleware/authOpcional.middleware.js';
import { requiereModoPersonal } from '../middleware/validarModo.js';

const router: Router = Router();

// =============================================================================
// PÚBLICOS
// =============================================================================

/**
 * GET /api/marketplace/feed?ciudad=...&lat=...&lng=...
 * Feed inicial: { recientes, cercanos } por ciudad y GPS del usuario.
 */
router.get('/feed', verificarTokenOpcional, getFeed);

/**
 * GET /api/marketplace/articulos/:id
 * Detalle público para link compartido. Funciona con o sin login.
 */
router.get('/articulos/:id', verificarTokenOpcional, getArticulo);

/**
 * POST /api/marketplace/articulos/:id/vista
 * Incrementa total_vistas. Sin auth requerida.
 */
router.post('/articulos/:id/vista', postRegistrarVista);

/**
 * GET /api/marketplace/buscar/sugerencias?q=...&ciudad=...
 * Top 5 títulos de artículos activos cuyo FTS matchea el query.
 * IMPORTANTE: declarado ANTES de las rutas paramétricas para que Express no
 * lo confunda con `/:id`.
 */
router.get('/buscar/sugerencias', getSugerenciasBuscador);

/**
 * GET /api/marketplace/buscar/populares?ciudad=...
 * Top 6 términos más buscados en la ciudad en los últimos 7 días.
 */
router.get('/buscar/populares', getPopularesBuscador);

/**
 * GET /api/marketplace/buscar?q=...&ciudad=...&filtros...
 * Búsqueda completa con filtros, orden y paginado.
 */
router.get('/buscar', getBuscarArticulos);

/**
 * GET /api/marketplace/vendedor/:usuarioId
 * Perfil público del vendedor con KPIs. Acepta token opcional para detectar
 * bloqueo (vendedor → usuario actual) y devolver 404 sin revelar el motivo.
 */
router.get('/vendedor/:usuarioId', verificarTokenOpcional, getVendedorMarketplace);

/**
 * GET /api/marketplace/vendedor/:usuarioId/publicaciones?estado=&limit=&offset=
 * Listado paginado de artículos del vendedor por estado (activa | vendida).
 */
router.get('/vendedor/:usuarioId/publicaciones', verificarTokenOpcional, getPublicacionesDeVendedor);

// =============================================================================
// PRIVADOS — RUTAS ESPECÍFICAS PRIMERO (para que no las traguen las :id)
// =============================================================================

/**
 * POST /api/marketplace/upload-imagen
 * Genera presigned URL para subir foto a R2 (prefijo `marketplace/`).
 * Body: { nombreArchivo, contentType }
 */
router.post(
    '/upload-imagen',
    verificarToken,
    requiereModoPersonal,
    postUploadImagen
);

/**
 * GET /api/marketplace/mis-articulos?estado=&limit=&offset=
 * Lista paginada de los artículos del usuario actual.
 */
router.get(
    '/mis-articulos',
    verificarToken,
    requiereModoPersonal,
    getMisArticulos
);

// =============================================================================
// PRIVADOS — CRUD DE ARTÍCULOS
// =============================================================================

/**
 * POST /api/marketplace/articulos
 * Crea un artículo (estado='activa', expira_at=NOW()+30d).
 */
router.post(
    '/articulos',
    verificarToken,
    requiereModoPersonal,
    postCrearArticulo
);

/**
 * PUT /api/marketplace/articulos/:id
 * Actualiza campos editables. Solo el dueño. NUNCA modifica expira_at.
 */
router.put(
    '/articulos/:id',
    verificarToken,
    requiereModoPersonal,
    putActualizarArticulo
);

/**
 * PATCH /api/marketplace/articulos/:id/estado
 * Cambia estado (activa | pausada | vendida) según matriz de transiciones.
 */
router.patch(
    '/articulos/:id/estado',
    verificarToken,
    requiereModoPersonal,
    patchCambiarEstado
);

/**
 * DELETE /api/marketplace/articulos/:id
 * Soft delete (estado='eliminada' + deleted_at).
 */
router.delete(
    '/articulos/:id',
    verificarToken,
    requiereModoPersonal,
    deleteArticulo
);

/**
 * POST /api/marketplace/articulos/:id/reactivar
 * El dueño reactiva un artículo `pausada` (extiende +30 días + estado=activa).
 * Sprint 7.
 */
router.post(
    '/articulos/:id/reactivar',
    verificarToken,
    requiereModoPersonal,
    postReactivarArticulo
);

// =============================================================================
// EXPORTS
// =============================================================================

export default router;
