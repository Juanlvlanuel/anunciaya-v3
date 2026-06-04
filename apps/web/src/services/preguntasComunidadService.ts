/**
 * preguntasComunidadService.ts
 * =============================
 * Llamadas al backend para el feed "Pregúntale a [ciudad]" (Home).
 *
 * Endpoints consumidos:
 *   GET    /api/preguntas-comunidad?ciudad=<nombre>&limit=<n>&offset=<n>
 *   POST   /api/preguntas-comunidad
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

import { api, del, get, patch, post } from './api';
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
}: ListarPreguntasPorCiudadInput): Promise<{ preguntas: PreguntaComunidad[]; total: number }> {
    const params = new URLSearchParams();
    params.set('ciudad', ciudad);
    if (typeof limit === 'number') params.set('limit', String(limit));
    if (typeof offset === 'number') params.set('offset', String(offset));
    // Usa `api.get` directo (no el helper `get<T>`, que solo expone `data`)
    // para leer también `paginacion.total` — el feed lo necesita para el
    // scroll infinito (saber si hay más) y el badge contador del toggle.
    const resp = await api.get<{
        success: boolean;
        data?: PreguntaComunidad[];
        paginacion?: { total: number; limit: number; offset: number };
    }>(`/preguntas-comunidad?${params.toString()}`);
    return {
        preguntas: resp.data.data ?? [],
        total: resp.data.paginacion?.total ?? 0,
    };
}

// =============================================================================
// OBTENER UNA PREGUNTA POR ID (deep-link de notificaciones)
// =============================================================================

/**
 * GET /api/preguntas-comunidad/:id
 *
 * Devuelve UNA pregunta 'activa' por su id, con el mismo shape que el feed.
 * El Home la usa para destacar la pregunta a la que apunta una notificación
 * (`/inicio?preguntaId=<id>`). Responde 404 si ya no está activa.
 */
export async function obtenerPregunta(preguntaId: string) {
    return get<PreguntaComunidad>(`/preguntas-comunidad/${preguntaId}`);
}

// =============================================================================
// MIS PREGUNTAS (historial del autor — todos los estados, paginado)
// =============================================================================

/**
 * GET /api/preguntas-comunidad/mis-preguntas?limit=&offset=
 *
 * Historial completo del usuario autenticado (activas + cerradas + ocultas),
 * paginado. Mismo shape `{ preguntas, total }` que el feed por ciudad. El
 * `usuarioId` lo toma el backend del JWT.
 */
export async function listarMisPreguntas({
    limit,
    offset,
}: {
    limit?: number;
    offset?: number;
}): Promise<{ preguntas: PreguntaComunidad[]; total: number }> {
    const params = new URLSearchParams();
    if (typeof limit === 'number') params.set('limit', String(limit));
    if (typeof offset === 'number') params.set('offset', String(offset));
    const qs = params.toString();
    const resp = await api.get<{
        success: boolean;
        data?: PreguntaComunidad[];
        paginacion?: { total: number; limit: number; offset: number };
    }>(`/preguntas-comunidad/mis-preguntas${qs ? `?${qs}` : ''}`);
    return {
        preguntas: resp.data.data ?? [],
        total: resp.data.paginacion?.total ?? 0,
    };
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
 * POST /api/preguntas-comunidad/:preguntaId/reintentar
 *
 * Sprint 2.D — reintenta a Coyo cuando cayó en `sin_respuesta`. Solo el
 * autor y solo si `estado_coyo === 'sin_respuesta'` (backend valida).
 * Resetea los campos de Coyo y re-dispara el orquestador.
 */
export async function reintentarMiPregunta(preguntaId: string) {
    return post<{ reintentado: boolean }>(
        `/preguntas-comunidad/${preguntaId}/reintentar`,
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
 * DELETE /api/preguntas-comunidad/:preguntaId/permanente — borrado PERMANENTE.
 * Solo aplica a preguntas ya eliminadas (estado='oculta'). Irreversible.
 */
export async function eliminarPermanenteMiPregunta(preguntaId: string) {
    return del<{ eliminada: boolean }>(`/preguntas-comunidad/${preguntaId}/permanente`);
}

/**
 * PATCH /api/preguntas-comunidad/:preguntaId — autor edita el texto.
 * Solo permitido si la pregunta tiene 0 respuestas activas.
 * Backend re-dispara Coyo con el texto nuevo (fire-and-forget).
 */
export async function editarMiPregunta({ preguntaId, textoNuevo }: EditarPreguntaInput) {
    // El backend espera el campo `texto` en el body (no `textoNuevo`).
    return patch<{ editada: boolean }>(`/preguntas-comunidad/${preguntaId}`, {
        texto: textoNuevo,
    });
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
    crearPregunta,
    listarPreguntasPorCiudad,
    listarMisPreguntas,
    obtenerPregunta,
    obtenerEstadoCoyo,
    crearRespuesta,
    listarRespuestas,
    borrarMiRespuesta,
    marcarInteres,
    quitarInteres,
    cerrarMiPregunta,
    marcarResuelta,
    reintentarMiPregunta,
    borrarMiPregunta,
    editarMiPregunta,
};
