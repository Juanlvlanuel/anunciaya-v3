/**
 * ============================================================================
 * SERVICIOS — Preguntas y Respuestas (Q&A público)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/servicios/preguntas.ts
 *
 * Submódulo de Servicios que maneja el Q&A público en la pantalla de detalle.
 * Mismo patrón que `services/marketplace/preguntas.ts`.
 *
 * Reglas críticas:
 *   - Las pendientes ajenas son PRIVADAS: solo el autor y el dueño de la
 *     publicación las pueden ver. Filtro en `obtenerPreguntasPublicas`.
 *   - El autor puede hacer múltiples preguntas en la misma publicación.
 *   - El autor solo puede editar/eliminar su propia pregunta si NO tiene
 *     respuesta todavía.
 *   - El dueño de la publicación puede eliminar cualquier pregunta de su
 *     publicación (soft delete con `deleted_at`).
 *
 * NO se incluye en este sprint:
 *   - Derivar pregunta a chat (lo hace MP; en Servicios el botón directo
 *     "Contactar por ChatYA" cubre el caso).
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface PreguntaRow {
    id: string;
    publicacionId: string;
    autor: {
        id: string;
        nombre: string;
        apellidos: string;
        avatarUrl: string | null;
    };
    pregunta: string;
    respuesta: string | null;
    respondidaAt: string | null;
    editadaAt: string | null;
    createdAt: string;
    /** Solo true para el autor y el dueño cuando la pregunta no tiene respuesta. */
    pendiente: boolean;
}

// Intersección con Record<string, unknown> para satisfacer el constraint de
// `db.execute<T>`. Mismo patrón que en `servicios.service.ts`.
type RawPreguntaDb = {
    id: string;
    publicacion_id: string;
    autor_id: string;
    autor_nombre: string;
    autor_apellidos: string;
    autor_avatar_url: string | null;
    pregunta: string;
    respuesta: string | null;
    respondida_at: string | null;
    editada_at: string | null;
    created_at: string;
} & Record<string, unknown>;

// =============================================================================
// OBTENER PREGUNTAS PÚBLICAS (con privacidad de pendientes)
// =============================================================================

/**
 * Devuelve las preguntas visibles para `usuarioActualId`:
 *
 *   - Respondidas: visibles para TODOS (incluido visitante anónimo).
 *   - Pendientes propias: visibles para el autor.
 *   - Pendientes ajenas: visibles SOLO para el dueño de la publicación.
 *
 * `usuarioActualId === null` = visitante anónimo → solo respondidas.
 */
export async function obtenerPreguntasPublicas(
    publicacionId: string,
    usuarioActualId: string | null
) {
    try {
        // 1. Recuperar el dueño de la publicación para saber si el caller lo es.
        const duenoRes = await db.execute<{ usuario_id: string }>(sql`
            SELECT usuario_id
            FROM servicios_publicaciones
            WHERE id = ${publicacionId}
              AND deleted_at IS NULL
            LIMIT 1
        `);
        if (duenoRes.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'Publicación no encontrada.',
            };
        }
        const duenoId = (duenoRes.rows[0] as { usuario_id: string }).usuario_id;
        const esDueno = usuarioActualId !== null && usuarioActualId === duenoId;

        // 2. Filtro de privacidad:
        //    - Si es el dueño: todas (respondidas + pendientes).
        //    - Si hay usuario: respondidas + pendientes propias.
        //    - Visitante anónimo: solo respondidas.
        const filtroPrivacidad = esDueno
            ? sql``
            : usuarioActualId
              ? sql`AND (p.respuesta IS NOT NULL OR p.autor_id = ${usuarioActualId})`
              : sql`AND p.respuesta IS NOT NULL`;

        const filasRes = await db.execute<RawPreguntaDb>(sql`
            SELECT
                p.id,
                p.publicacion_id,
                p.autor_id,
                p.pregunta,
                p.respuesta,
                p.respondida_at,
                p.editada_at,
                p.created_at,
                u.nombre        AS autor_nombre,
                u.apellidos     AS autor_apellidos,
                u.avatar_url    AS autor_avatar_url
            FROM servicios_preguntas p
            INNER JOIN usuarios u ON u.id = p.autor_id
            WHERE p.publicacion_id = ${publicacionId}
              AND p.deleted_at IS NULL
              ${filtroPrivacidad}
            ORDER BY p.created_at DESC
        `);

        const data: PreguntaRow[] = (filasRes.rows as RawPreguntaDb[]).map((r) => ({
            id: r.id,
            publicacionId: r.publicacion_id,
            autor: {
                id: r.autor_id,
                nombre: r.autor_nombre,
                apellidos: r.autor_apellidos,
                avatarUrl: r.autor_avatar_url,
            },
            pregunta: r.pregunta,
            respuesta: r.respuesta,
            respondidaAt: r.respondida_at,
            editadaAt: r.editada_at,
            createdAt: r.created_at,
            pendiente: r.respuesta === null,
        }));

        return { success: true as const, code: 200, data };
    } catch (error) {
        console.error('Error en obtenerPreguntasPublicas:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar las preguntas.',
        };
    }
}

// =============================================================================
// CREAR PREGUNTA (el autor pregunta sobre una publicación)
// =============================================================================

export async function crearPregunta(
    publicacionId: string,
    autorId: string,
    texto: string
) {
    try {
        // No puede preguntarse a sí mismo (sería pregunta sobre su propia publicación).
        const duenoRes = await db.execute<{ usuario_id: string }>(sql`
            SELECT usuario_id
            FROM servicios_publicaciones
            WHERE id = ${publicacionId}
              AND estado != 'eliminada'
              AND deleted_at IS NULL
            LIMIT 1
        `);
        if (duenoRes.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'Publicación no encontrada.',
            };
        }
        if ((duenoRes.rows[0] as { usuario_id: string }).usuario_id === autorId) {
            return {
                success: false as const,
                code: 400,
                message: 'No puedes preguntar sobre tu propia publicación.',
            };
        }

        const resultado = await db.execute<{ id: string }>(sql`
            INSERT INTO servicios_preguntas (publicacion_id, autor_id, pregunta)
            VALUES (${publicacionId}, ${autorId}, ${texto})
            RETURNING id
        `);

        const id = (resultado.rows[0] as { id: string }).id;
        return { success: true as const, code: 201, data: { id } };
    } catch (error) {
        console.error('Error en crearPregunta:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos enviar tu pregunta.',
        };
    }
}

// =============================================================================
// RESPONDER PREGUNTA (el dueño responde)
// =============================================================================

export async function responderPregunta(
    preguntaId: string,
    usuarioActualId: string,
    respuesta: string
) {
    try {
        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE servicios_preguntas p
            SET respuesta = ${respuesta}, respondida_at = NOW()
            FROM servicios_publicaciones pub
            WHERE p.id = ${preguntaId}
              AND pub.id = p.publicacion_id
              AND pub.usuario_id = ${usuarioActualId}
              AND p.deleted_at IS NULL
              AND p.respuesta IS NULL
            RETURNING p.id
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos esta pregunta, o ya tiene respuesta, o no es tuya.',
            };
        }
        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en responderPregunta:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos enviar tu respuesta.',
        };
    }
}

// =============================================================================
// EDITAR PREGUNTA PROPIA (solo si está pendiente)
// =============================================================================

export async function editarPreguntaPropia(
    preguntaId: string,
    autorId: string,
    nuevoTexto: string
) {
    try {
        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE servicios_preguntas
            SET pregunta = ${nuevoTexto}, editada_at = NOW()
            WHERE id = ${preguntaId}
              AND autor_id = ${autorId}
              AND respuesta IS NULL
              AND deleted_at IS NULL
            RETURNING id
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No puedes editar esta pregunta (ya tiene respuesta o no es tuya).',
            };
        }
        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en editarPreguntaPropia:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos editar la pregunta.',
        };
    }
}

// =============================================================================
// ELIMINAR PREGUNTA PROPIA (el autor retira su pregunta si no tiene respuesta)
// =============================================================================

export async function eliminarPreguntaPropia(
    preguntaId: string,
    autorId: string
) {
    try {
        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE servicios_preguntas
            SET deleted_at = NOW()
            WHERE id = ${preguntaId}
              AND autor_id = ${autorId}
              AND respuesta IS NULL
              AND deleted_at IS NULL
            RETURNING id
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No puedes retirar esta pregunta (ya tiene respuesta o no es tuya).',
            };
        }
        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en eliminarPreguntaPropia:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos retirar la pregunta.',
        };
    }
}

// =============================================================================
// ELIMINAR PREGUNTA (el dueño borra cualquier pregunta de SU publicación)
// =============================================================================

export async function eliminarPreguntaDueno(
    preguntaId: string,
    usuarioDuenoId: string
) {
    try {
        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE servicios_preguntas p
            SET deleted_at = NOW()
            FROM servicios_publicaciones pub
            WHERE p.id = ${preguntaId}
              AND pub.id = p.publicacion_id
              AND pub.usuario_id = ${usuarioDuenoId}
              AND p.deleted_at IS NULL
            RETURNING p.id
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos esta pregunta o no es de tu publicación.',
            };
        }
        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en eliminarPreguntaDueno:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos eliminar la pregunta.',
        };
    }
}
