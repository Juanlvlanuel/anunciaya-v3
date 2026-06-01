/**
 * preguntasComunidad.routes.ts
 * =============================
 * Rutas para el feed "Pregúntale a [ciudad]" del Home.
 *
 * UBICACIÓN: apps/api/src/routes/preguntasComunidad.routes.ts
 *
 * RUTAS:
 * POST /api/preguntas-comunidad                                   - Crear pregunta
 * GET  /api/preguntas-comunidad?ciudad=...&limit=20&offset=0      - Feed por ciudad
 */

import { Router, type Router as RouterType } from 'express';
import {
    crearPreguntaController,
    listarPreguntasPorCiudadController,
    obtenerEstadoCoyoController,
    crearRespuestaController,
    listarRespuestasController,
    borrarMiRespuestaController,
} from '../controllers/preguntasComunidad.controller.js';

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
 * POST /api/preguntas-comunidad
 * Crea una nueva pregunta en el feed de la ciudad del usuario.
 * Body: { texto: string, ciudad: string, estado: string }
 * usuarioId se toma del token.
 */
router.post('/', crearPreguntaController);

/**
 * GET /api/preguntas-comunidad?ciudad=Puerto+Peñasco&limit=20&offset=0
 * Devuelve el feed paginado de preguntas 'activa' de la ciudad indicada,
 * más recientes primero, con datos básicos del autor.
 */
router.get('/', listarPreguntasPorCiudadController);

/**
 * GET /api/preguntas-comunidad/:id/coyo
 * Endpoint de SONDEO: devuelve solo el estado actual de Coyo sobre la
 * pregunta. El frontend lo consulta cada N segundos tras publicar, hasta
 * que `estadoCoyo` deje de ser 'pendiente' o 'procesando'.
 */
router.get('/:id/coyo', obtenerEstadoCoyoController);

// =============================================================================
// RESPUESTAS DE LA COMUNIDAD
// =============================================================================
// Sprint 1 — vecinos pueden responder a preguntas del Home. Sin threads
// (no respuestas a respuestas) por diseño. Solo el autor de la respuesta
// puede borrarla. Soft-delete con `estado='borrada'`.

/**
 * POST /api/preguntas-comunidad/:preguntaId/respuestas
 * Crea una respuesta a una pregunta del Home.
 * Body: { texto: string }
 * usuarioId del token.
 */
router.post('/:preguntaId/respuestas', crearRespuestaController);

/**
 * GET /api/preguntas-comunidad/:preguntaId/respuestas?limit=20&offset=0
 * Lista respuestas activas (estado='activa') de una pregunta,
 * ordenadas cronológicamente ascendente (la más vieja primero — flujo
 * natural de conversación).
 */
router.get('/:preguntaId/respuestas', listarRespuestasController);

/**
 * DELETE /api/preguntas-comunidad/respuestas/:respuestaId
 * Soft-delete de una respuesta. Solo el autor de la respuesta puede
 * borrarla — devuelve 403 si otro usuario lo intenta. Idempotente.
 */
router.delete('/respuestas/:respuestaId', borrarMiRespuestaController);

// =============================================================================
// EXPORTAR ROUTER
// =============================================================================

export default router;
