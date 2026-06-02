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
    marcarInteresController,
    quitarInteresController,
    cerrarMiPreguntaController,
    borrarMiPreguntaController,
    marcarResueltaController,
    editarMiPreguntaController,
    reintentarMiPreguntaController,
    listarMisPreguntasController,
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
 * GET /api/preguntas-comunidad/mis-preguntas?limit=20&offset=0
 * Devuelve TODAS las preguntas del usuario actual (activas, cerradas y
 * ocultas), ordenadas de más reciente a más vieja. A diferencia del feed
 * público, NO filtra por estado_pregunta — el autor ve su histórico
 * completo.
 *
 * IMPORTANTE: esta ruta DEBE ir declarada ANTES de cualquier ruta con
 * `:preguntaId` para que Express no intente interpretarla como UUID.
 */
router.get('/mis-preguntas', listarMisPreguntasController);

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
// "YO TAMBIÉN QUIERO SABER" — toggle de interés en una pregunta
// =============================================================================

/**
 * POST /api/preguntas-comunidad/:preguntaId/interes
 * Marca al usuario actual como interesado en la pregunta. Idempotente.
 */
router.post('/:preguntaId/interes', marcarInteresController);

/**
 * DELETE /api/preguntas-comunidad/:preguntaId/interes
 * Quita la marca de interés del usuario actual. Idempotente.
 */
router.delete('/:preguntaId/interes', quitarInteresController);

// =============================================================================
// CONTROL DEL AUTOR — solo el autor de la pregunta puede llamar estas
// =============================================================================

/**
 * POST /api/preguntas-comunidad/:preguntaId/cerrar
 * Cierra la pregunta (sale del feed, no acepta más respuestas).
 * Solo el autor; idempotente.
 */
router.post('/:preguntaId/cerrar', cerrarMiPreguntaController);

/**
 * POST /api/preguntas-comunidad/:preguntaId/resolver
 * Marca la pregunta como resuelta (resuelta_at = NOW()). La pregunta
 * sigue activa pero el frontend la trata distinto (ícono ✓). Solo el
 * autor; idempotente.
 */
router.post('/:preguntaId/resolver', marcarResueltaController);

/**
 * DELETE /api/preguntas-comunidad/:preguntaId
 * Soft-delete de la pregunta (estado_pregunta = 'oculta'). Solo el
 * autor; idempotente. Las respuestas se conservan en BD.
 */
router.delete('/:preguntaId', borrarMiPreguntaController);

/**
 * PATCH /api/preguntas-comunidad/:preguntaId
 * Edita el texto de la pregunta. SOLO permitido si tiene 0 respuestas
 * activas. Al editar se re-dispara Coyo para actualizar su respuesta.
 * Solo el autor.
 * Body: { texto: string }
 */
router.patch('/:preguntaId', editarMiPreguntaController);

/**
 * POST /api/preguntas-comunidad/:preguntaId/reintentar
 * Sprint 2.D — reintenta a Coyo cuando cayó en `sin_respuesta` (típicamente
 * por errores transitorios de Gemini tras los 6 intentos automáticos).
 * Resetea los 4 campos de Coyo y dispara el orquestador fire-and-forget.
 * Solo el autor; solo si `estado_coyo === 'sin_respuesta'`.
 */
router.post('/:preguntaId/reintentar', reintentarMiPreguntaController);

// =============================================================================
// EXPORTAR ROUTER
// =============================================================================

export default router;
