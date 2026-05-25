/**
 * preguntasComunidadService.ts
 * =============================
 * Llamadas al backend para el feed "Pregúntale a [ciudad]" (Home).
 *
 * Endpoints consumidos:
 *   POST /api/preguntas-comunidad
 *   GET  /api/preguntas-comunidad?ciudad=<nombre>&limit=<n>&offset=<n>
 *
 * No requiere mappers — el middleware del backend ya entrega camelCase.
 *
 * Ubicación: apps/web/src/services/preguntasComunidadService.ts
 */

import { get, post } from './api';
import type {
    PreguntaComunidad,
    CrearPreguntaInput,
    ListarPreguntasPorCiudadInput,
    EstadoCoyoResponse,
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
// EXPORT DEFAULT
// =============================================================================

export default {
    crearPregunta,
    listarPreguntasPorCiudad,
    obtenerEstadoCoyo,
};
