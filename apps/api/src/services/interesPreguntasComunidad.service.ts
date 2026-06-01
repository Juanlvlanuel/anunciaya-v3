/**
 * interesPreguntasComunidad.service.ts
 * =====================================
 * Service para "Yo también quiero saber" — cuando un vecino se suma a una
 * pregunta existente sin republicarla.
 *
 * Operaciones:
 *   - marcarInteres(preguntaId, usuarioId)   → toggle ON  (INSERT idempotente)
 *   - quitarInteres(preguntaId, usuarioId)   → toggle OFF (DELETE idempotente)
 *
 * Diseño:
 *   - La tabla `preguntas_interesados` tiene PRIMARY KEY compuesta
 *     `(pregunta_id, usuario_id)`, así un mismo usuario no puede sumarse
 *     dos veces a la misma pregunta. INSERT ... ON CONFLICT DO NOTHING.
 *   - Ambas operaciones son idempotentes — el frontend puede llamarlas
 *     sin verificar primero si el usuario ya está sumado.
 *
 * UBICACIÓN: apps/api/src/services/interesPreguntasComunidad.service.ts
 */

import { db } from '../db/index.js';
import {
    preguntasInteresados,
    preguntasComunidad,
} from '../db/schemas/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import type {
    MarcarInteresInput,
    RespuestaServicio,
} from '../types/preguntasComunidad.types.js';

// =============================================================================
// MARCAR INTERÉS — "yo también quiero saber"
// =============================================================================

/**
 * Marca a un usuario como interesado en una pregunta. Idempotente: si ya
 * está marcado, no hace nada (ON CONFLICT DO NOTHING gracias a la PK
 * compuesta).
 *
 * Valida que la pregunta exista y esté en `estado_pregunta='activa'` —
 * no tiene sentido marcar interés en preguntas cerradas u ocultas.
 */
export async function marcarInteres(
    input: MarcarInteresInput,
): Promise<RespuestaServicio<{ marcado: boolean; totalInteresados: number }>> {
    try {
        // Verificar pregunta activa
        const [pregunta] = await db
            .select({
                id: preguntasComunidad.id,
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
                message: 'Esta pregunta ya no acepta marcas de interés',
                code: 409,
            };
        }

        // INSERT idempotente — la PK compuesta evita duplicados.
        await db
            .insert(preguntasInteresados)
            .values({
                preguntaId: input.preguntaId,
                usuarioId: input.usuarioId,
            })
            .onConflictDoNothing();

        // Contar total actualizado (incluye el recién insertado)
        const [conteo] = await db
            .select({
                total: sql<number>`COUNT(*)::int`,
            })
            .from(preguntasInteresados)
            .where(eq(preguntasInteresados.preguntaId, input.preguntaId));

        return {
            success: true,
            message: 'Interés marcado',
            data: {
                marcado: true,
                totalInteresados: Number(conteo?.total) || 0,
            },
        };
    } catch (error) {
        console.error('Error en marcarInteres:', error);
        return {
            success: false,
            message: 'Error al marcar interés',
            code: 500,
        };
    }
}

// =============================================================================
// QUITAR INTERÉS — "ya no quiero saber"
// =============================================================================

/**
 * Quita la marca de interés. Idempotente: si no estaba marcado, no hace
 * nada. Devuelve el conteo actualizado de interesados.
 */
export async function quitarInteres(
    input: MarcarInteresInput,
): Promise<RespuestaServicio<{ marcado: boolean; totalInteresados: number }>> {
    try {
        await db
            .delete(preguntasInteresados)
            .where(
                and(
                    eq(preguntasInteresados.preguntaId, input.preguntaId),
                    eq(preguntasInteresados.usuarioId, input.usuarioId),
                ),
            );

        // Contar total actualizado
        const [conteo] = await db
            .select({
                total: sql<number>`COUNT(*)::int`,
            })
            .from(preguntasInteresados)
            .where(eq(preguntasInteresados.preguntaId, input.preguntaId));

        return {
            success: true,
            message: 'Interés quitado',
            data: {
                marcado: false,
                totalInteresados: Number(conteo?.total) || 0,
            },
        };
    } catch (error) {
        console.error('Error en quitarInteres:', error);
        return {
            success: false,
            message: 'Error al quitar interés',
            code: 500,
        };
    }
}
