/**
 * preguntasComunidadService.ts
 * =============================
 * Llamadas al backend para el feed "Pregúntale a [ciudad]" (Home).
 *
 * Endpoints consumidos:
 *   GET    /api/preguntas-comunidad?ciudad=<nombre>&limit=<n>&offset=<n>
 *   POST   /api/preguntas-comunidad
 *   GET    /api/preguntas-comunidad/mis-preguntas
 *   GET    /api/preguntas-comunidad/:id/coyo
 *
 *   POST   /api/preguntas-comunidad/:preguntaId/respuestas
 *   GET    /api/preguntas-comunidad/:preguntaId/respuestas
 *   DELETE /api/preguntas-comunidad/respuestas/:respuestaId
 *
 *   POST   /api/preguntas-comunidad/:preguntaId/interes
 *   DELETE /api/preguntas-comunidad/:preguntaId/interes
 *
 *   POST   /api/preguntas-comunidad/:preguntaId/cerrar
 *   POST   /api/preguntas-comunidad/:preguntaId/resolver
 *   DELETE /api/preguntas-comunidad/:preguntaId
 *   PATCH  /api/preguntas-comunidad/:preguntaId
 *
 * No requiere mappers — el middleware del backend ya entrega camelCase.
 *
 * Ubicación: apps/web/src/services/preguntasComunidadService.ts
 */

import { del, get, patch, post } from './api';
import type {
    PreguntaComunidad,
    CrearPreguntaInput,
    ListarPreguntasPorCiudadInput,
    EstadoCoyoResponse,
    RespuestaPreguntaComunidad,
    CrearRespuestaInput,
    ListarRespuestasInput,
    EditarPreguntaInput,
} from '../types/preguntasComunidad';

// =============================================================================
// CREAR PREGUNTA
// =============================================================================

/**
 * POST /api/preguntas-comunidad
 *
 * El backend toma el `usuarioId` del JWT (no se envía en el body).
 * Devuelve la pregunta creada ya con los datos del autor incluidos
 * (autorNombre, autorApellidos, autorAvatarUrl) para evitar un round-trip
 * extra al pintar la card en la UI.
 */
export async function crearPregunta(datos: CrearPreguntaInput) {
    return post<PreguntaComunidad>('/preguntas-comunidad', datos);
}

// =============================================================================
// LISTAR PREGUNTAS POR CIUDAD
// =============================================================================

/**
 * GET /api/preguntas-comunidad?ciudad=...&limit=...&offset=...
 *
 * Devuelve el feed paginado de la ciudad indicada, más recientes primero,
 * solo con `estadoPregunta='activa'`. El backend limita `limit` a 50.
 */
export async function listarPreguntasPorCiudad({
    ciudad,
    limit,
    offset,
}: ListarPreguntasPorCiudadInput) {
    const params = new URLSearchParams();
    params.set('ciudad', ciudad);
    if (typeof limit === 'number') params.set('limit', String(limit));
    if (typeof offset === 'number') params.set('offset', String(offset));
    return get<PreguntaComunidad[]>(`/preguntas-comunidad?${params.toString()}`);
}

// =============================================================================
// SONDEO: estado de Coyo de una pregunta
// =============================================================================

/**
 * GET /api/preguntas-comunidad/:id/coyo
 *
 * Devuelve solo los 4 campos de Coyo de una pregunta:
 * { estadoCoyo, respuestaCoyo, resultadosCoyo, coyoProcesadoAt }.
 *
 * El hook `useEstadoCoyo` lo llama cada ~2s hasta que `estadoCoyo` sea
 * final ('listo' | 'sin_respuesta' | 'no_aplica').
 */
export async function obtenerEstadoCoyo(preguntaId: string) {
    return get<EstadoCoyoResponse>(`/preguntas-comunidad/${preguntaId}/coyo`);
}

// =============================================================================
// RESPUESTAS DE LA COMUNIDAD (Sprint 1)
// =============================================================================

/**
 * POST /api/preguntas-comunidad/:preguntaId/respuestas
 *
 * Crea una respuesta a una pregunta. El backend toma el `usuarioId` del JWT.
 * Devuelve la respuesta creada con los datos del autor incluidos.
 *
 * Reglas backend (relevantes para UX):
 *   - 400 si texto vacío o > 1000 chars.
 *   - 404 si la pregunta no existe.
 *   - 409 si la pregunta no está 'activa' (cerrada/oculta no aceptan).
 */
export async function crearRespuesta({ preguntaId, texto }: CrearRespuestaInput) {
    return post<RespuestaPreguntaComunidad>(
        `/preguntas-comunidad/${preguntaId}/respuestas`,
        { texto },
    );
}

/**
 * GET /api/preguntas-comunidad/:preguntaId/respuestas?limit=...&offset=...
 *
 * Lista respuestas activas (estado='activa') de una pregunta, en orden
 * cronológico ascendente (la más vieja primero — flujo natural de
 * conversación). Backend limita a 50 por página.
 */
export async function listarRespuestas({
    preguntaId,
    limit,
    offset,
}: ListarRespuestasInput) {
    const params = new URLSearchParams();
    if (typeof limit === 'number') params.set('limit', String(limit));
    if (typeof offset === 'number') params.set('offset', String(offset));
    const qs = params.toString();
    return get<RespuestaPreguntaComunidad[]>(
        `/preguntas-comunidad/${preguntaId}/respuestas${qs ? `?${qs}` : ''}`,
    );
}

/**
 * DELETE /api/preguntas-comunidad/respuestas/:respuestaId
 *
 * Soft-delete (estado='borrada'). Solo el AUTOR de la respuesta puede
 * borrarla. El autor de la pregunta NO cura su tablón.
 *
 * Reglas backend:
 *   - 403 si quien llama no es el autor.
 *   - Idempotente si ya estaba borrada.
 */
export async function borrarMiRespuesta(respuestaId: string) {
    return del<{ borrada: boolean }>(`/preguntas-comunidad/respuestas/${respuestaId}`);
}

// =============================================================================
// INTERÉS ("yo también quiero saber") — Sprint 1
// =============================================================================

/**
 * POST /api/preguntas-comunidad/:preguntaId/interes
 *
 * Marca interés del usuario actual en una pregunta. Idempotente: si ya
 * estaba marcado, el backend hace ON CONFLICT DO NOTHING y devuelve OK.
 * Devuelve el conteo actualizado de interesados.
 */
export async function marcarInteres(preguntaId: string) {
    return post<{ totalInteresados: number }>(
        `/preguntas-comunidad/${preguntaId}/interes`,
        {},
    );
}

/**
 * DELETE /api/preguntas-comunidad/:preguntaId/interes
 *
 * Quita el interés del usuario actual. Idempotente. Devuelve el conteo
 * actualizado.
 */
export async function quitarInteres(preguntaId: string) {
    return del<{ totalInteresados: number }>(
        `/preguntas-comunidad/${preguntaId}/interes`,
    );
}

// =============================================================================
// CONTROL DEL AUTOR — Sprint 1.C (acciones sobre la propia pregunta)
// =============================================================================

/** POST /api/preguntas-comunidad/:preguntaId/cerrar — autor cierra su pregunta. */
export async function cerrarMiPregunta(preguntaId: string) {
    return post<{ cerrada: boolean }>(`/preguntas-comunidad/${preguntaId}/cerrar`, {});
}

/** POST /api/preguntas-comunidad/:preguntaId/resolver — autor la marca resuelta. */
export async function marcarResuelta(preguntaId: string) {
    return post<{ resuelta: boolean; resueltaAt: string }>(
        `/preguntas-comunidad/${preguntaId}/resolver`,
        {},
    );
}

/**
 * DELETE /api/preguntas-comunidad/:preguntaId — autor borra su pregunta
 * (soft-delete: estado_pregunta='oculta').
 */
export async function borrarMiPregunta(preguntaId: string) {
    return del<{ borrada: boolean }>(`/preguntas-comunidad/${preguntaId}`);
}

/**
 * PATCH /api/preguntas-comunidad/:preguntaId — autor edita el texto.
 * Solo permitido si la pregunta tiene 0 respuestas activas.
 * Backend re-dispara Coyo con el texto nuevo (fire-and-forget).
 */
export async function editarMiPregunta({ preguntaId, textoNuevo }: EditarPreguntaInput) {
    return patch<{ editada: boolean }>(`/preguntas-comunidad/${preguntaId}`, {
        textoNuevo,
    });
}

// =============================================================================
// MIS PREGUNTAS — vista histórico del autor (sin filtro por estado)
// =============================================================================

/**
 * GET /api/preguntas-comunidad/mis-preguntas?limit=...&offset=...
 *
 * Lista TODAS las preguntas del usuario actual (activa, cerrada y oculta).
 * Útil para una vista "Mis preguntas" donde el autor gestiona su histórico.
 */
export async function listarMisPreguntas(opciones?: {
    limit?: number;
    offset?: number;
}) {
    const params = new URLSearchParams();
    if (typeof opciones?.limit === 'number') params.set('limit', String(opciones.limit));
    if (typeof opciones?.offset === 'number') params.set('offset', String(opciones.offset));
    const qs = params.toString();
    return get<PreguntaComunidad[]>(
        `/preguntas-comunidad/mis-preguntas${qs ? `?${qs}` : ''}`,
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
    crearPregunta,
    listarPreguntasPorCiudad,
    obtenerEstadoCoyo,
    crearRespuesta,
    listarRespuestas,
    borrarMiRespuesta,
    marcarInteres,
    quitarInteres,
    cerrarMiPregunta,
    marcarResuelta,
    borrarMiPregunta,
    editarMiPregunta,
    listarMisPreguntas,
};
