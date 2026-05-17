/**
 * ============================================================================
 * SERVICIOS ROUTES — Endpoints v1 (Sprint 1)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/routes/servicios.routes.ts
 *
 * Patrón calcado de `marketplace.routes.ts`. Las rutas más específicas
 * (/upload-imagen, /mis-publicaciones, /buscar, /feed/infinito) van ANTES de
 * las paramétricas (/:id) para que Express no las confunda.
 *
 * Endpoints expuestos en este sprint:
 *
 *   PÚBLICOS (verificarTokenOpcional)
 *   GET    /feed
 *   GET    /feed/infinito
 *   GET    /publicaciones/:id
 *   GET    /publicaciones/:id/preguntas
 *   POST   /publicaciones/:id/vista
 *
 *   PRIVADOS (verificarToken + requiereModoPersonal)
 *   POST   /upload-imagen
 *   GET    /mis-publicaciones
 *   POST   /publicaciones
 *   PUT    /publicaciones/:id
 *   PATCH  /publicaciones/:id/estado
 *   DELETE /publicaciones/:id
 *   POST   /publicaciones/:id/preguntas
 *   POST   /preguntas/:id/responder
 *   PUT    /preguntas/:id/mia
 *   DELETE /preguntas/:id/mia
 *   DELETE /preguntas/:id
 *
 * NO entran en este sprint (futuros):
 *   - /buscar/sugerencias, /buscar/populares, /buscar          → Sprint 6
 *   - /usuario/:id (perfil del prestador) + /resenas/*         → Sprint 5
 *   - /publicaciones/:id/reactivar                              → Sprint 7
 */

import { Router } from 'express';
import {
    getFeed,
    getFeedInfinito,
    getPublicacion,
    postRegistrarVista,
    getPreguntasPublicacion,
    getSugerenciasBuscador,
    postUploadImagen,
    getMisPublicaciones,
    postCrearPublicacion,
    putActualizarPublicacion,
    patchCambiarEstado,
    postReactivarPublicacion,
    deletePublicacion,
    postCrearPregunta,
    postResponderPregunta,
    putEditarPreguntaPropia,
    deletePreguntaPropia,
    deletePreguntaDueno,
    deleteFotoServicioHuerfana,
    getPerfilPrestador,
    getPublicacionesDelPrestador,
    getResenasDelPrestador,
    postCrearResena,
} from '../controllers/servicios.controller.js';
import { verificarToken } from '../middleware/auth.js';
import { verificarTokenOpcional } from '../middleware/authOpcional.middleware.js';
import { requiereModoPersonal } from '../middleware/validarModo.js';

const router: Router = Router();

// =============================================================================
// PÚBLICOS
// =============================================================================

/**
 * GET /api/servicios/feed?ciudad=...&lat=...&lng=...&modo=...
 * Feed inicial: { recientes, cercanos } por ciudad y GPS.
 */
router.get('/feed', verificarTokenOpcional, getFeed);

/**
 * GET /api/servicios/feed/infinito?ciudad=&lat=&lng=&orden=&pagina=&limite=
 * Feed paginado estilo Facebook. Declarado ANTES de /publicaciones/:id.
 */
router.get('/feed/infinito', verificarTokenOpcional, getFeedInfinito);

/**
 * GET /api/servicios/buscar/sugerencias?q=...&ciudad=...
 * Top 5 sugerencias en vivo. Declarado ANTES de /publicaciones/:id para que
 * Express no confunda la ruta con un parámetro.
 */
router.get('/buscar/sugerencias', verificarToken, getSugerenciasBuscador);

/**
 * GET /api/servicios/publicaciones/:id/preguntas
 * IMPORTANTE: declarado ANTES de /publicaciones/:id para que Express no
 * confunda la ruta con el detalle.
 */
router.get(
    '/publicaciones/:id/preguntas',
    verificarTokenOpcional,
    getPreguntasPublicacion
);

/**
 * GET /api/servicios/publicaciones/:id
 * Detalle público. Funciona con o sin login.
 */
router.get('/publicaciones/:id', verificarTokenOpcional, getPublicacion);

/**
 * POST /api/servicios/publicaciones/:id/vista
 * Incrementa total_vistas. Sin auth.
 */
router.post('/publicaciones/:id/vista', postRegistrarVista);

// =============================================================================
// PRIVADOS — RUTAS ESPECÍFICAS PRIMERO
// =============================================================================

/**
 * POST /api/servicios/upload-imagen
 * Genera presigned URL para subir foto a R2 (prefijo `servicios/`).
 */
router.post(
    '/upload-imagen',
    verificarToken,
    requiereModoPersonal,
    postUploadImagen
);

/**
 * DELETE /api/servicios/foto-huerfana
 * Body: { url }. Wizard de publicar dispara esto al cancelar/borrar borrador
 * para limpiar las fotos subidas que aún no están atadas a una publicación.
 * El service valida reference count antes de borrar.
 */
router.delete(
    '/foto-huerfana',
    verificarToken,
    requiereModoPersonal,
    deleteFotoServicioHuerfana
);

/**
 * GET /api/servicios/mis-publicaciones?estado=&limit=&offset=
 * Lista paginada de las publicaciones del usuario actual.
 */
router.get(
    '/mis-publicaciones',
    verificarToken,
    requiereModoPersonal,
    getMisPublicaciones
);

// =============================================================================
// PRIVADOS — CRUD DE PUBLICACIONES
// =============================================================================

/**
 * POST /api/servicios/publicaciones
 * Crea una publicación nueva (estado='activa', expira_at=NOW()+30d).
 */
router.post(
    '/publicaciones',
    verificarToken,
    requiereModoPersonal,
    postCrearPublicacion
);

/**
 * PUT /api/servicios/publicaciones/:id
 * Actualiza campos editables. Solo el dueño. NUNCA modifica expira_at.
 */
router.put(
    '/publicaciones/:id',
    verificarToken,
    requiereModoPersonal,
    putActualizarPublicacion
);

/**
 * PATCH /api/servicios/publicaciones/:id/estado
 * Cambia estado (activa ↔ pausada). 'eliminada' va por DELETE.
 */
router.patch(
    '/publicaciones/:id/estado',
    verificarToken,
    requiereModoPersonal,
    patchCambiarEstado
);

/**
 * POST /api/servicios/publicaciones/:id/reactivar
 * Reactiva una publicación pausada (estado→activa + expira_at→NOW()+30d).
 */
router.post(
    '/publicaciones/:id/reactivar',
    verificarToken,
    requiereModoPersonal,
    postReactivarPublicacion
);

/**
 * DELETE /api/servicios/publicaciones/:id
 * Soft delete (estado='eliminada' + deleted_at).
 */
router.delete(
    '/publicaciones/:id',
    verificarToken,
    requiereModoPersonal,
    deletePublicacion
);

// =============================================================================
// PREGUNTAS Y RESPUESTAS
// =============================================================================

/**
 * POST /api/servicios/publicaciones/:id/preguntas
 * El autor hace una pregunta pública sobre la publicación.
 */
router.post(
    '/publicaciones/:id/preguntas',
    verificarToken,
    requiereModoPersonal,
    postCrearPregunta
);

/**
 * POST /api/servicios/preguntas/:id/responder
 * El dueño responde una pregunta pendiente.
 */
router.post(
    '/preguntas/:id/responder',
    verificarToken,
    requiereModoPersonal,
    postResponderPregunta
);

/**
 * PUT /api/servicios/preguntas/:id/mia
 * El autor edita el texto de su propia pregunta (solo si pendiente).
 */
router.put(
    '/preguntas/:id/mia',
    verificarToken,
    requiereModoPersonal,
    putEditarPreguntaPropia
);

/**
 * DELETE /api/servicios/preguntas/:id/mia
 * IMPORTANTE: declarado ANTES de /preguntas/:id para evitar conflicto Express.
 * El autor retira su pregunta (solo si pendiente).
 */
router.delete(
    '/preguntas/:id/mia',
    verificarToken,
    requiereModoPersonal,
    deletePreguntaPropia
);

/**
 * DELETE /api/servicios/preguntas/:id
 * El dueño elimina una pregunta de su publicación.
 */
router.delete(
    '/preguntas/:id',
    verificarToken,
    requiereModoPersonal,
    deletePreguntaDueno
);

/**
 * POST /api/servicios/publicaciones/:id/resenas (Sprint 7.6)
 * Autor crea una reseña sobre la publicación. Validaciones: rating 1-5,
 * texto max 200, autor != destinatario, unique (publicacion, autor).
 */
router.post(
    '/publicaciones/:id/resenas',
    verificarToken,
    requiereModoPersonal,
    postCrearResena
);

// =============================================================================
// PERFIL DEL PRESTADOR + RESEÑAS (Sprint 5)
// =============================================================================
// Rutas específicas (/usuarios/:usuarioId/publicaciones, /resenas) ANTES de
// la genérica (/usuarios/:usuarioId) por la regla de Express.

/**
 * GET /api/servicios/usuarios/:usuarioId/publicaciones?estado=&limit=&offset=
 * Listado de publicaciones del prestador (default: solo activas).
 */
router.get(
    '/usuarios/:usuarioId/publicaciones',
    verificarTokenOpcional,
    getPublicacionesDelPrestador
);

/**
 * GET /api/servicios/usuarios/:usuarioId/resenas?limit=&offset=
 * Listado de reseñas recibidas por el prestador.
 */
router.get(
    '/usuarios/:usuarioId/resenas',
    verificarTokenOpcional,
    getResenasDelPrestador
);

/**
 * GET /api/servicios/usuarios/:usuarioId
 * Perfil base del prestador con KPIs agregados.
 */
router.get(
    '/usuarios/:usuarioId',
    verificarTokenOpcional,
    getPerfilPrestador
);

// =============================================================================
// EXPORTS
// =============================================================================

export default router;
