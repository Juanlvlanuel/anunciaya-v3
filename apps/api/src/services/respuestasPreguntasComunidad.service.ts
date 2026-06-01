/**
 * respuestasPreguntasComunidad.service.ts
 * ========================================
 * Service para las respuestas de la comunidad a las preguntas del Home.
 *
 * Operaciones:
 *   - crearRespuesta              → un vecino responde a una pregunta
 *   - listarRespuestasPorPregunta → lista respuestas activas de una pregunta
 *   - borrarMiRespuesta           → soft-delete, solo el autor puede borrarla
 *
 * Diseño:
 *   - SIN threads (sin respuestas a respuestas) — los textos del feed no
 *     pueden ramificarse para mantener orden visual.
 *   - Solo el autor de la RESPUESTA puede borrarla. El autor de la pregunta
 *     NO cura su tablón (decisión de producto: confiar en la comunidad).
 *   - Soft-delete (estado='borrada') para conservar orden cronológico
 *     estable; las activas se devuelven en orden cronológico ascendente
 *     (la más vieja primero, conversación natural).
 *
 * UBICACIÓN: apps/api/src/services/respuestasPreguntasComunidad.service.ts
 */

import { db } from '../db/index.js';
import {
    respuestasPreguntasComunidad,
    preguntasComunidad,
    usuarios,
} from '../db/schemas/schema.js';
import { eq, and, asc, sql } from 'drizzle-orm';
import type {
    CrearRespuestaInput,
    ListarRespuestasInput,
    RespuestaPreguntaComunidadResponse,
    RespuestaServicio,
    EstadoRespuesta,
} from '../types/preguntasComunidad.types.js';
import { crearNotificacion } from './notificaciones.service.js';

// =============================================================================
// CONSTANTES
// =============================================================================

const TEXTO_MAX = 1000;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 50;

// =============================================================================
// CREAR RESPUESTA
// =============================================================================

/**
 * Crea una respuesta a una pregunta. Valida que:
 *   - El texto no esté vacío y no exceda 1000 caracteres.
 *   - La pregunta exista y esté en estado_pregunta='activa' (no se puede
 *     responder a preguntas cerradas ni ocultas).
 *
 * Devuelve la respuesta creada con los datos básicos del autor (mismo
 * patrón que `crearPregunta`).
 */
export async function crearRespuesta(
    input: CrearRespuestaInput,
): Promise<RespuestaServicio<RespuestaPreguntaComunidadResponse>> {
    try {
        const texto = (input.texto ?? '').trim();

        if (texto.length === 0) {
            return {
                success: false,
                message: 'El texto de la respuesta no puede estar vacío',
                code: 400,
            };
        }
        if (texto.length > TEXTO_MAX) {
            return {
                success: false,
                message: `El texto excede el máximo de ${TEXTO_MAX} caracteres`,
                code: 400,
            };
        }

        // Verificar que la pregunta existe y está activa (no cerrada ni
        // oculta). Las preguntas oculta/cerrada NO aceptan nuevas respuestas.
        // También se trae `usuarioId` (autor de la pregunta) y `texto` para
        // disparar la notificación al autor después del INSERT.
        const [pregunta] = await db
            .select({
                id: preguntasComunidad.id,
                usuarioId: preguntasComunidad.usuarioId,
                texto: preguntasComunidad.texto,
                estadoPregunta: preguntasComunidad.estadoPregunta,
            })
            .from(preguntasComunidad)
            .where(eq(preguntasComunidad.id, input.preguntaId))
            .limit(1);

        if (!pregunta) {
            return {
                success: false,
                message: 'La pregunta no existe',
                code: 404,
            };
        }
        if (pregunta.estadoPregunta !== 'activa') {
            return {
                success: false,
                message: 'Esta pregunta ya no acepta respuestas',
                code: 409,
            };
        }

        // Insert — estado queda en el default 'activa'
        const [nueva] = await db
            .insert(respuestasPreguntasComunidad)
            .values({
                preguntaId: input.preguntaId,
                usuarioId: input.usuarioId,
                texto,
            })
            .returning();

        // Cargar datos del autor para el response
        const [autor] = await db
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
                avatarUrl: usuarios.avatarUrl,
            })
            .from(usuarios)
            .where(eq(usuarios.id, input.usuarioId))
            .limit(1);

        if (!autor) {
            return {
                success: false,
                message: 'Respuesta creada pero no se pudieron cargar los datos del autor',
                code: 500,
            };
        }

        const respuestaFormateada: RespuestaPreguntaComunidadResponse = {
            id: nueva.id,
            preguntaId: nueva.preguntaId,
            texto: nueva.texto,
            estado: nueva.estado as EstadoRespuesta,
            createdAt: nueva.createdAt ?? new Date().toISOString(),
            updatedAt: nueva.updatedAt ?? new Date().toISOString(),
            autorId: autor.id,
            autorNombre: autor.nombre,
            autorApellidos: autor.apellidos,
            autorAvatarUrl: autor.avatarUrl ?? null,
        };

        // Notificación al autor de la pregunta — solo si quien responde es
        // DISTINTO del autor (no auto-notificación cuando el autor responde
        // a su propia pregunta). Fire-and-forget: si falla, se loguea pero
        // NO bloqueamos la respuesta del usuario.
        if (pregunta.usuarioId !== input.usuarioId) {
            const nombreCompletoAutor = `${autor.nombre} ${autor.apellidos}`.trim();
            const preview = nueva.texto.length > 100
                ? `${nueva.texto.slice(0, 100)}…`
                : nueva.texto;
            crearNotificacion({
                usuarioId: pregunta.usuarioId,
                modo: 'personal',
                tipo: 'pregunta_comunidad_respondida',
                titulo: 'Respondió tu pregunta',
                mensaje: preview,
                referenciaTipo: 'pregunta_comunidad',
                referenciaId: pregunta.id,
                actorImagenUrl: autor.avatarUrl ?? undefined,
                actorNombre: nombreCompletoAutor || undefined,
            }).catch((err) => {
                console.warn(
                    'No se pudo crear notificación pregunta_comunidad_respondida:',
                    err,
                );
            });
        }

        return {
            success: true,
            message: 'Respuesta creada',
            data: respuestaFormateada,
        };
    } catch (error) {
        console.error('Error en crearRespuesta:', error);
        return {
            success: false,
            message: 'Error al crear respuesta',
            code: 500,
        };
    }
}

// =============================================================================
// LISTAR RESPUESTAS POR PREGUNTA
// =============================================================================

/**
 * Devuelve las respuestas activas de una pregunta, ordenadas cronológicamente
 * (la más vieja primero — flujo natural de conversación). Incluye datos
 * básicos del autor (left join con usuarios).
 */
export async function listarRespuestasPorPregunta(
    input: ListarRespuestasInput,
): Promise<RespuestaServicio<RespuestaPreguntaComunidadResponse[]>> {
    try {
        const limitRaw = input.limit ?? LIMIT_DEFAULT;
        const offsetRaw = input.offset ?? 0;
        const limit = Math.min(Math.max(1, Math.floor(limitRaw)), LIMIT_MAX);
        const offset = Math.max(0, Math.floor(offsetRaw));

        const filas = await db
            .select({
                id: respuestasPreguntasComunidad.id,
                preguntaId: respuestasPreguntasComunidad.preguntaId,
                texto: respuestasPreguntasComunidad.texto,
                estado: respuestasPreguntasComunidad.estado,
                createdAt: respuestasPreguntasComunidad.createdAt,
                updatedAt: respuestasPreguntasComunidad.updatedAt,
                autorId: usuarios.id,
                autorNombre: usuarios.nombre,
                autorApellidos: usuarios.apellidos,
                autorAvatarUrl: usuarios.avatarUrl,
            })
            .from(respuestasPreguntasComunidad)
            .leftJoin(
                usuarios,
                eq(respuestasPreguntasComunidad.usuarioId, usuarios.id),
            )
            .where(
                and(
                    eq(respuestasPreguntasComunidad.preguntaId, input.preguntaId),
                    eq(respuestasPreguntasComunidad.estado, 'activa'),
                ),
            )
            .orderBy(asc(respuestasPreguntasComunidad.createdAt))
            .limit(limit)
            .offset(offset);

        const respuestas: RespuestaPreguntaComunidadResponse[] = filas.map((f) => ({
            id: f.id,
            preguntaId: f.preguntaId,
            texto: f.texto,
            estado: f.estado as EstadoRespuesta,
            createdAt: f.createdAt ?? new Date().toISOString(),
            updatedAt: f.updatedAt ?? new Date().toISOString(),
            autorId: f.autorId ?? '',
            autorNombre: f.autorNombre ?? '',
            autorApellidos: f.autorApellidos ?? '',
            autorAvatarUrl: f.autorAvatarUrl ?? null,
        }));

        return {
            success: true,
            message: 'Respuestas obtenidas',
            data: respuestas,
        };
    } catch (error) {
        console.error('Error en listarRespuestasPorPregunta:', error);
        return {
            success: false,
            message: 'Error al listar respuestas',
            code: 500,
        };
    }
}

// =============================================================================
// BORRAR MI RESPUESTA (soft-delete)
// =============================================================================

/**
 * Marca una respuesta como `estado='borrada'` (soft-delete). Solo el autor
 * de la respuesta puede borrarla. La fila se conserva en BD para mantener
 * el orden cronológico estable y eventual auditoría.
 *
 * Si la respuesta ya está borrada, devuelve éxito (idempotente).
 */
export async function borrarMiRespuesta(
    respuestaId: string,
    usuarioId: string,
): Promise<RespuestaServicio<{ borrada: boolean }>> {
    try {
        // Verificar que la respuesta existe y es del usuario
        const [respuesta] = await db
            .select({
                id: respuestasPreguntasComunidad.id,
                usuarioId: respuestasPreguntasComunidad.usuarioId,
                estado: respuestasPreguntasComunidad.estado,
            })
            .from(respuestasPreguntasComunidad)
            .where(eq(respuestasPreguntasComunidad.id, respuestaId))
            .limit(1);

        if (!respuesta) {
            return {
                success: false,
                message: 'La respuesta no existe',
                code: 404,
            };
        }
        if (respuesta.usuarioId !== usuarioId) {
            return {
                success: false,
                message: 'Solo el autor de la respuesta puede borrarla',
                code: 403,
            };
        }

        // Si ya está borrada, idempotente
        if (respuesta.estado === 'borrada') {
            return {
                success: true,
                message: 'Respuesta ya estaba borrada',
                data: { borrada: true },
            };
        }

        await db
            .update(respuestasPreguntasComunidad)
            .set({
                estado: 'borrada',
                updatedAt: sql`NOW()`,
            })
            .where(eq(respuestasPreguntasComunidad.id, respuestaId));

        return {
            success: true,
            message: 'Respuesta borrada',
            data: { borrada: true },
        };
    } catch (error) {
        console.error('Error en borrarMiRespuesta:', error);
        return {
            success: false,
            message: 'Error al borrar respuesta',
            code: 500,
        };
    }
}
