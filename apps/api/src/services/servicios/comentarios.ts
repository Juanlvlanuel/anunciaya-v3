/**
 * ============================================================================
 * SERVICIOS — Comentarios con hilos de 1 nivel
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/servicios/comentarios.ts
 *
 * Espejo de `services/marketplace/comentarios.ts`, ahora para Servicios.
 * Reemplaza el Q&A de `servicios_preguntas` por COMENTARIOS públicos al
 * instante, con hilos de 1 nivel (tabla `servicios_comentarios`).
 *
 *   1 fila = 1 mensaje. `parent_id` NULL = raíz; con valor = respuesta a ese
 *   raíz. Responder a una respuesta cuelga del raíz (1 nivel), pero la
 *   notificación va al autor del comentario que se tocó.
 *
 * Permisos:
 *   - Crear: cualquier usuario autenticado, en cualquier modo (Personal o
 *     Comercial) — Servicios acepta publicaciones de negocio (vacante-empresa),
 *     así que también acepta comentarios de negocio. El DUEÑO también puede
 *     comentar/responder en su publicación (etiqueta de autor).
 *   - Editar: SOLO el autor del comentario, SIN límite de tiempo.
 *   - Eliminar: el autor del comentario O el dueño de la publicación. Borrar un
 *     raíz arrastra (soft-delete) sus respuestas.
 *
 * Notificaciones:
 *   - Comentario raíz → al dueño de la publicación ('servicios_nuevo_comentario').
 *   - Respuesta       → al autor del comentario respondido
 *     ('servicios_respuesta_comentario') y, si es otra persona, también al dueño.
 *
 * Identidad Personal/Comercial (columna `modo`, mismo patrón que
 * `negocioPublicaciones/comentarios.ts`): si el autor comentó en Modo
 * Comercial y tiene negocio propio (dueño) o pertenece a uno (gerente/
 * empleado), se muestra el nombre/logo del NEGOCIO en vez de su identidad
 * personal — tanto en `listarComentarios` como en el actor de la notificación.
 * El modo se resuelve server-side desde el JWT (`obtenerModoActual`).
 *
 * (Sin moderación de texto: el Q&A de servicios tampoco la tenía.)
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { crearNotificacion } from '../notificaciones.service.js';
import { armarArbolComentarios, type ComentarioNodo, type ComentarioPlano } from '../comentarios/arbol.js';

// =============================================================================
// HELPERS PRIVADOS
// =============================================================================

/**
 * Obtiene un comentario con el dueño de la publicación, para validar permisos.
 * Devuelve null si no existe o ya está eliminado.
 */
async function obtenerComentarioConDueno(comentarioId: string): Promise<{
    id: string;
    autorId: string;
    publicacionId: string;
    parentId: string | null;
    duenoPublicacionId: string;
    publicacionTitulo: string;
    /** Modo con el que se escribió ESTE comentario — para que la notificación
     *  de respuesta le llegue a su autor en el mismo contexto (Personal o
     *  Comercial) en el que comentó. */
    modo: 'personal' | 'comercial';
} | null> {
    const resultado = await db.execute(sql`
        SELECT
            c.id,
            c.autor_id        AS autor_id,
            c.publicacion_id  AS publicacion_id,
            c.parent_id       AS parent_id,
            c.modo,
            s.usuario_id      AS dueno_publicacion_id,
            s.titulo          AS publicacion_titulo
        FROM servicios_comentarios c
        INNER JOIN servicios_publicaciones s ON s.id = c.publicacion_id
        WHERE c.id = ${comentarioId}
          AND c.deleted_at IS NULL
        LIMIT 1
    `);

    if (resultado.rows.length === 0) return null;
    const row = resultado.rows[0] as Record<string, unknown>;
    return {
        id: row.id as string,
        autorId: row.autor_id as string,
        publicacionId: row.publicacion_id as string,
        parentId: row.parent_id as string | null,
        duenoPublicacionId: row.dueno_publicacion_id as string,
        publicacionTitulo: row.publicacion_titulo as string,
        modo: row.modo as 'personal' | 'comercial',
    };
}

// =============================================================================
// LISTAR COMENTARIOS (público)
// =============================================================================

/**
 * Devuelve TODOS los comentarios vivos de una publicación, en árbol de 1 nivel.
 * Público: sin filtros de visibilidad (ya no hay "pendiente").
 */
export async function listarComentarios(
    publicacionId: string
): Promise<{ success: true; code: 200; data: ComentarioNodo[] }> {
    const resultado = await db.execute(sql`
        SELECT
            c.id,
            c.autor_id    AS autor_id,
            CASE WHEN c.modo = 'comercial' AND neg_autor.id IS NOT NULL THEN neg_autor.nombre ELSE u.nombre END AS autor_nombre,
            CASE WHEN c.modo = 'comercial' AND neg_autor.id IS NOT NULL THEN '' ELSE u.apellidos END AS autor_apellidos,
            CASE WHEN c.modo = 'comercial' AND neg_autor.id IS NOT NULL THEN neg_autor.logo_url ELSE u.avatar_url END AS autor_avatar_url,
            c.parent_id   AS parent_id,
            c.texto,
            (c.autor_id = s.usuario_id) AS es_vendedor,
            (c.modo = 'comercial' AND neg_autor.id IS NOT NULL) AS es_negocio,
            (
                SELECT ns.id FROM negocio_sucursales ns
                WHERE ns.negocio_id = neg_autor.id AND ns.es_principal = true
                LIMIT 1
            ) AS negocio_sucursal_id,
            c.editado_at  AS editado_at,
            c.created_at  AS created_at
        FROM servicios_comentarios c
        INNER JOIN usuarios u ON u.id = c.autor_id
        INNER JOIN servicios_publicaciones s ON s.id = c.publicacion_id
        -- Negocio que el AUTOR del comentario representa (dueño primero,
        -- si no gerente/empleado) — igual criterio que negocioPublicaciones.
        LEFT JOIN negocios neg_autor ON neg_autor.id = COALESCE(
            (SELECT id FROM negocios WHERE usuario_id = c.autor_id LIMIT 1),
            u.negocio_id
        )
        WHERE c.publicacion_id = ${publicacionId}
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
            esNegocio: r.es_negocio as boolean,
            negocioSucursalId: r.negocio_sucursal_id as string | null,
            editadoAt: r.editado_at as string | null,
            createdAt: r.created_at as string,
        };
    });

    return { success: true, code: 200, data: armarArbolComentarios(planos) };
}

// =============================================================================
// CREAR COMENTARIO
// =============================================================================

export async function crearComentario(
    publicacionId: string,
    autorId: string,
    texto: string,
    parentId?: string | null,
    modo: 'personal' | 'comercial' = 'personal'
): Promise<{ success: boolean; code: number; message?: string; data?: { id: string } }> {
    try {
        // Verificar publicación (no eliminada) + dueño + título para la notif.
        // `sucursal_id` solo va poblado en publicaciones de negocio
        // (vacante-empresa) — determina si el aviso al dueño llega a su
        // bandeja Comercial o Personal.
        const pubRes = await db.execute<{ usuario_id: string; titulo: string; sucursal_id: string | null }>(sql`
            SELECT usuario_id, titulo, sucursal_id
            FROM servicios_publicaciones
            WHERE id = ${publicacionId}
              AND estado != 'eliminada'
              AND deleted_at IS NULL
            LIMIT 1
        `);
        if (pubRes.rows.length === 0) {
            return { success: false, code: 404, message: 'Publicación no encontrada.' };
        }
        const pub = pubRes.rows[0] as { usuario_id: string; titulo: string; sucursal_id: string | null };
        const duenoId = pub.usuario_id;
        const modoDueno: 'personal' | 'comercial' = pub.sucursal_id ? 'comercial' : 'personal';

        // El dueño SÍ puede comentar/responder en su publicación (etiqueta de autor).

        // Si es respuesta: validar el padre y resolver el raíz real (1 nivel).
        let parentRealId: string | null = null;
        let autorComentarioTocado: string | null = null;
        // Modo con el que el autor tocado escribió SU comentario — la
        // notificación de "te respondieron" le llega en ese mismo contexto.
        let modoComentarioTocado: 'personal' | 'comercial' = 'personal';
        if (parentId) {
            const padre = await obtenerComentarioConDueno(parentId);
            if (!padre || padre.publicacionId !== publicacionId) {
                return { success: false, code: 404, message: 'El comentario al que respondes no existe.' };
            }
            parentRealId = padre.parentId ?? padre.id;
            autorComentarioTocado = padre.autorId;
            modoComentarioTocado = padre.modo;
        }

        const insert = await db.execute<{ id: string }>(sql`
            INSERT INTO servicios_comentarios (publicacion_id, autor_id, parent_id, texto, modo)
            VALUES (${publicacionId}, ${autorId}, ${parentRealId}, ${texto}, ${modo})
            RETURNING id
        `);
        const id = (insert.rows[0] as { id: string }).id;

        // Avatar/nombre de quien COMENTA (no del destinatario) — así el panel de
        // notificaciones muestra la foto de la persona que comentó, en vez del
        // ícono genérico de la familia "comunidad". Si comentó en Modo
        // Comercial, usa el nombre/logo del NEGOCIO que representa (mismo
        // criterio que `listarComentarios`), no su nombre/foto personal.
        const autorComentarioResult = await db.execute(sql`
            SELECT
                CASE WHEN ${modo} = 'comercial' AND neg_autor.id IS NOT NULL THEN neg_autor.nombre ELSE u.nombre END AS nombre,
                CASE WHEN ${modo} = 'comercial' AND neg_autor.id IS NOT NULL THEN neg_autor.logo_url ELSE u.avatar_url END AS avatar_url
            FROM usuarios u
            LEFT JOIN negocios neg_autor ON neg_autor.id = COALESCE(
                (SELECT id FROM negocios WHERE usuario_id = u.id LIMIT 1),
                u.negocio_id
            )
            WHERE u.id = ${autorId}
            LIMIT 1
        `);
        const autorComentario = autorComentarioResult.rows[0] as { nombre: string; avatar_url: string | null } | undefined;

        // ── Notificaciones ───────────────────────────────────────────────────
        if (!parentId) {
            if (duenoId !== autorId) {
                await crearNotificacion({
                    usuarioId: duenoId,
                    modo: modoDueno,
                    tipo: 'servicios_nuevo_comentario',
                    titulo: 'Nuevo comentario',
                    mensaje: `Comentaron en "${pub.titulo}"`,
                    referenciaId: publicacionId,
                    referenciaTipo: 'servicio',
                    comentarioId: id,
                    actorNombre: autorComentario?.nombre,
                    actorImagenUrl: autorComentario?.avatar_url ?? undefined,
                }).catch(() => { /* notificación no crítica */ });
            }
        } else {
            if (autorComentarioTocado && autorComentarioTocado !== autorId) {
                await crearNotificacion({
                    usuarioId: autorComentarioTocado,
                    modo: modoComentarioTocado,
                    tipo: 'servicios_respuesta_comentario',
                    titulo: 'Te respondieron',
                    mensaje: `Respondieron tu comentario en "${pub.titulo}"`,
                    referenciaId: publicacionId,
                    referenciaTipo: 'servicio',
                    comentarioId: id,
                    actorNombre: autorComentario?.nombre,
                    actorImagenUrl: autorComentario?.avatar_url ?? undefined,
                }).catch(() => { /* notificación no crítica */ });
            }
            if (duenoId !== autorId && duenoId !== autorComentarioTocado) {
                await crearNotificacion({
                    usuarioId: duenoId,
                    modo: modoDueno,
                    tipo: 'servicios_nuevo_comentario',
                    titulo: 'Nuevo comentario',
                    mensaje: `Comentaron en "${pub.titulo}"`,
                    referenciaId: publicacionId,
                    referenciaTipo: 'servicio',
                    comentarioId: id,
                    actorNombre: autorComentario?.nombre,
                    actorImagenUrl: autorComentario?.avatar_url ?? undefined,
                }).catch(() => { /* notificación no crítica */ });
            }
        }

        return { success: true, code: 201, data: { id } };
    } catch (error) {
        console.error('Error en crearComentario (servicios):', error);
        return { success: false, code: 500, message: 'No pudimos publicar el comentario.' };
    }
}

// =============================================================================
// EDITAR COMENTARIO (solo autor, sin límite de tiempo)
// =============================================================================

export async function editarComentario(
    comentarioId: string,
    autorId: string,
    nuevoTexto: string
): Promise<{ success: boolean; code: number; message?: string }> {
    try {
        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE servicios_comentarios
            SET texto = ${nuevoTexto}, editado_at = NOW()
            WHERE id = ${comentarioId}
              AND autor_id = ${autorId}
              AND deleted_at IS NULL
            RETURNING id
        `);
        if (resultado.rows.length === 0) {
            return { success: false, code: 403, message: 'No puedes editar este comentario.' };
        }
        return { success: true, code: 200 };
    } catch (error) {
        console.error('Error en editarComentario (servicios):', error);
        return { success: false, code: 500, message: 'No pudimos editar el comentario.' };
    }
}

// =============================================================================
// ELIMINAR COMENTARIO (autor O dueño de la publicación)
// =============================================================================

export async function eliminarComentario(
    comentarioId: string,
    usuarioId: string
): Promise<{ success: boolean; code: number; message?: string }> {
    try {
        const comentario = await obtenerComentarioConDueno(comentarioId);
        if (!comentario) {
            return { success: false, code: 404, message: 'Comentario no encontrado.' };
        }
        const esAutor = comentario.autorId === usuarioId;
        const esDuenoPublicacion = comentario.duenoPublicacionId === usuarioId;
        if (!esAutor && !esDuenoPublicacion) {
            return { success: false, code: 403, message: 'No puedes eliminar este comentario.' };
        }

        // Soft-delete del comentario + cascada a sus respuestas (si es raíz).
        await db.execute(sql`
            UPDATE servicios_comentarios
            SET deleted_at = NOW()
            WHERE deleted_at IS NULL
              AND (id = ${comentarioId} OR parent_id = ${comentarioId})
        `);

        return { success: true, code: 200 };
    } catch (error) {
        console.error('Error en eliminarComentario (servicios):', error);
        return { success: false, code: 500, message: 'No pudimos eliminar el comentario.' };
    }
}
