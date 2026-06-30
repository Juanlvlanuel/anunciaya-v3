/**
 * comentariosComunidad.service.ts
 * ===============================
 * Comentarios con hilos de 1 nivel para las preguntas del Home/Coyo
 * (reemplaza `respuestasPreguntasComunidad.service.ts`). Espejo de
 * `services/marketplace/comentarios.ts` pero con las reglas propias de Coyo.
 *
 * Reglas de Coyo (NO cambian):
 *   - El AUTOR DE LA PREGUNTA no puede comentar en su propio hilo (403).
 *   - Solo el AUTOR de un comentario puede borrarlo (el autor de la pregunta
 *     NO modera respuestas ajenas — decisión de producto). Soft-delete +
 *     cascada a respuestas.
 *   - Editar: solo el autor, sin límite de tiempo.
 *
 * Notificaciones:
 *   - Comentario raíz → al autor de la pregunta (`pregunta_comunidad_respondida`)
 *     y a los interesados ("yo también", `pregunta_comunidad_seguida_respondida`).
 *   - Respuesta en hilo → al autor del comentario respondido
 *     (`comunidad_respuesta_comentario`).
 *
 * Coyo (IA), "yo también", resuelta, expiración y deep-link viven en
 * `preguntasComunidad.service.ts` y NO se tocan aquí.
 *
 * UBICACIÓN: apps/api/src/services/comentariosComunidad.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { crearNotificacion } from './notificaciones.service.js';
import { armarArbolComentarios, type ComentarioNodo, type ComentarioPlano } from './comentarios/arbol.js';

interface Resultado<T = undefined> {
    success: boolean;
    code: number;
    message?: string;
    data?: T;
}

/** Trunca el texto para el preview de la notificación (100 chars + …). */
function previewTexto(texto: string): string {
    return texto.length > 100 ? `${texto.slice(0, 100)}…` : texto;
}

// =============================================================================
// LISTAR COMENTARIOS (público — árbol de 1 nivel)
// =============================================================================

export async function listarComentarios(
    preguntaId: string
): Promise<Resultado<ComentarioNodo[]>> {
    try {
        const resultado = await db.execute(sql`
            SELECT
                c.id,
                c.autor_id    AS autor_id,
                u.nombre      AS autor_nombre,
                u.apellidos   AS autor_apellidos,
                u.avatar_url  AS autor_avatar_url,
                c.parent_id   AS parent_id,
                c.texto,
                (c.autor_id = p.usuario_id) AS es_vendedor,
                c.editado_at  AS editado_at,
                c.created_at  AS created_at
            FROM comunidad_comentarios c
            INNER JOIN usuarios u ON u.id = c.autor_id
            INNER JOIN preguntas_comunidad p ON p.id = c.pregunta_id
            WHERE c.pregunta_id = ${preguntaId}
              AND c.deleted_at IS NULL
            ORDER BY c.created_at ASC
        `);

        const planos: ComentarioPlano[] = resultado.rows.map((row) => {
            const r = row as Record<string, unknown>;
            return {
                id: r.id as string,
                autorId: r.autor_id as string,
                autorNombre: r.autor_nombre as string,
                autorApellidos: r.autor_apellidos as string,
                autorAvatarUrl: r.autor_avatar_url as string | null,
                parentId: r.parent_id as string | null,
                texto: r.texto as string,
                esVendedor: r.es_vendedor as boolean,
                editadoAt: r.editado_at as string | null,
                createdAt: r.created_at as string,
            };
        });

        return { success: true, code: 200, data: armarArbolComentarios(planos) };
    } catch (error) {
        console.error('Error en listarComentarios (comunidad):', error);
        return { success: false, code: 500, message: 'Error al obtener los comentarios' };
    }
}

// =============================================================================
// CREAR COMENTARIO
// =============================================================================

export async function crearComentario(
    preguntaId: string,
    autorId: string,
    texto: string,
    parentId?: string | null
): Promise<Resultado<{ id: string }>> {
    try {
        // Verificar pregunta: existe, activa, y obtener su autor.
        const pregRes = await db.execute<{ usuario_id: string; estado_pregunta: string }>(sql`
            SELECT usuario_id, estado_pregunta
            FROM preguntas_comunidad
            WHERE id = ${preguntaId}
            LIMIT 1
        `);
        if (pregRes.rows.length === 0) {
            return { success: false, code: 404, message: 'La pregunta no existe' };
        }
        const pregunta = pregRes.rows[0] as { usuario_id: string; estado_pregunta: string };
        if (pregunta.estado_pregunta !== 'activa') {
            return { success: false, code: 409, message: 'Esta pregunta ya no acepta comentarios' };
        }
        // Regla de Coyo: el autor de la pregunta NO comenta en su propio hilo.
        if (pregunta.usuario_id === autorId) {
            return { success: false, code: 403, message: 'No puedes comentar en tu propia pregunta' };
        }

        // Si es respuesta: validar el padre y resolver el raíz (1 nivel).
        let parentRealId: string | null = null;
        let autorComentarioTocado: string | null = null;
        if (parentId) {
            const padreRes = await db.execute(sql`
                SELECT id, parent_id, autor_id, pregunta_id
                FROM comunidad_comentarios
                WHERE id = ${parentId} AND deleted_at IS NULL
                LIMIT 1
            `);
            if (padreRes.rows.length === 0) {
                return { success: false, code: 404, message: 'El comentario al que respondes no existe' };
            }
            const padre = padreRes.rows[0] as { id: string; parent_id: string | null; autor_id: string; pregunta_id: string };
            if (padre.pregunta_id !== preguntaId) {
                return { success: false, code: 404, message: 'El comentario al que respondes no existe' };
            }
            parentRealId = padre.parent_id ?? padre.id;
            autorComentarioTocado = padre.autor_id;
        }

        const insert = await db.execute<{ id: string }>(sql`
            INSERT INTO comunidad_comentarios (pregunta_id, autor_id, parent_id, texto)
            VALUES (${preguntaId}, ${autorId}, ${parentRealId}, ${texto})
            RETURNING id
        `);
        const id = (insert.rows[0] as { id: string }).id;

        // Datos del autor (para actor de las notificaciones).
        const autorRes = await db.execute(sql`
            SELECT nombre, apellidos, avatar_url FROM usuarios WHERE id = ${autorId} LIMIT 1
        `);
        const autor = (autorRes.rows[0] ?? {}) as { nombre?: string; apellidos?: string; avatar_url?: string | null };
        const actorNombre = `${autor.nombre ?? ''} ${autor.apellidos ?? ''}`.trim() || undefined;
        const actorImagenUrl = autor.avatar_url ?? undefined;
        const preview = previewTexto(texto);

        // ── Notificaciones (fire-and-forget) ─────────────────────────────────
        if (!parentId) {
            // Comentario raíz → autor de la pregunta + interesados ("yo también").
            crearNotificacion({
                usuarioId: pregunta.usuario_id,
                modo: 'personal',
                tipo: 'pregunta_comunidad_respondida',
                titulo: 'Respondió tu pregunta',
                mensaje: preview,
                referenciaTipo: 'pregunta_comunidad',
                referenciaId: preguntaId,
                actorImagenUrl,
                actorNombre,
            }).catch(() => { /* no crítica */ });

            try {
                const interesados = await db.execute<{ usuario_id: string }>(sql`
                    SELECT usuario_id FROM preguntas_interesados
                    WHERE pregunta_id = ${preguntaId}
                      AND usuario_id != ${autorId}
                      AND usuario_id != ${pregunta.usuario_id}
                `);
                for (const row of interesados.rows) {
                    const interesadoId = (row as { usuario_id: string }).usuario_id;
                    crearNotificacion({
                        usuarioId: interesadoId,
                        modo: 'personal',
                        tipo: 'pregunta_comunidad_seguida_respondida',
                        titulo: 'Respondieron una pregunta que sigues',
                        mensaje: preview,
                        referenciaTipo: 'pregunta_comunidad',
                        referenciaId: preguntaId,
                        actorImagenUrl,
                        actorNombre,
                    }).catch(() => { /* no crítica */ });
                }
            } catch (err) {
                console.warn('No se pudo notificar a interesados (comunidad):', err);
            }
        } else if (autorComentarioTocado && autorComentarioTocado !== autorId) {
            // Respuesta en hilo → al autor del comentario respondido.
            crearNotificacion({
                usuarioId: autorComentarioTocado,
                modo: 'personal',
                tipo: 'comunidad_respuesta_comentario',
                titulo: 'Respondió tu comentario',
                mensaje: preview,
                referenciaTipo: 'pregunta_comunidad',
                referenciaId: preguntaId,
                actorImagenUrl,
                actorNombre,
            }).catch(() => { /* no crítica */ });
        }

        return { success: true, code: 201, data: { id } };
    } catch (error) {
        console.error('Error en crearComentario (comunidad):', error);
        return { success: false, code: 500, message: 'No pudimos publicar el comentario' };
    }
}

// =============================================================================
// EDITAR COMENTARIO (solo autor, sin límite de tiempo)
// =============================================================================

export async function editarComentario(
    comentarioId: string,
    autorId: string,
    nuevoTexto: string
): Promise<Resultado> {
    try {
        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE comunidad_comentarios
            SET texto = ${nuevoTexto}, editado_at = NOW()
            WHERE id = ${comentarioId}
              AND autor_id = ${autorId}
              AND deleted_at IS NULL
            RETURNING id
        `);
        if (resultado.rows.length === 0) {
            return { success: false, code: 403, message: 'No puedes editar este comentario' };
        }
        return { success: true, code: 200 };
    } catch (error) {
        console.error('Error en editarComentario (comunidad):', error);
        return { success: false, code: 500, message: 'No pudimos editar el comentario' };
    }
}

// =============================================================================
// ELIMINAR COMENTARIO (SOLO el autor del comentario — el autor de la pregunta NO modera)
// =============================================================================

export async function eliminarComentario(
    comentarioId: string,
    usuarioId: string
): Promise<Resultado> {
    try {
        const res = await db.execute(sql`
            SELECT autor_id FROM comunidad_comentarios
            WHERE id = ${comentarioId} AND deleted_at IS NULL
            LIMIT 1
        `);
        if (res.rows.length === 0) {
            return { success: false, code: 404, message: 'Comentario no encontrado' };
        }
        const autorId = (res.rows[0] as { autor_id: string }).autor_id;
        if (autorId !== usuarioId) {
            return { success: false, code: 403, message: 'Solo el autor puede borrar su comentario' };
        }

        // Soft-delete + cascada a respuestas (si es raíz).
        await db.execute(sql`
            UPDATE comunidad_comentarios
            SET deleted_at = NOW()
            WHERE deleted_at IS NULL
              AND (id = ${comentarioId} OR parent_id = ${comentarioId})
        `);

        return { success: true, code: 200 };
    } catch (error) {
        console.error('Error en eliminarComentario (comunidad):', error);
        return { success: false, code: 500, message: 'No pudimos eliminar el comentario' };
    }
}
