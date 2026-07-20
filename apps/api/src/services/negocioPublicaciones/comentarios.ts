/**
 * comentarios.ts
 * ==============
 * Service de COMENTARIOS del feed de publicaciones de Negocio. Espejo de
 * `services/marketplace/comentarios.ts`, con una diferencia de permisos:
 *
 * Permisos:
 *  - Crear: cualquier usuario autenticado, en cualquier modo (Personal o
 *    Comercial) — a diferencia de MarketPlace, que exige modo Personal.
 *  - Editar: SOLO el autor del comentario, SIN límite de tiempo.
 *  - Eliminar: el autor del comentario, O cualquier usuario que pertenezca
 *    al negocio dueño de la publicación (dueño o gerente/empleado) —
 *    moderación de cualquier comentario en cualquiera de sus posts, no solo
 *    en la publicación puntual (más laxo que MP a propósito: es su feed).
 *
 * Moderación: solo rechazo duro (severidad='rechazo'), mismo criterio que MP.
 *
 * Notificaciones: espejo 1:1 del patrón de MarketPlace
 * (`services/marketplace/comentarios.ts`) — comentario raíz notifica al
 * autor de la publicación, respuesta notifica al autor del comentario
 * tocado (+ fan-out al autor de la publicación si es una 3ra persona). Un
 * solo destinatario por notificación, sin fan-out al equipo de la sucursal
 * (decisión de producto — a diferencia de `notificarSucursal()`).
 *
 * Doc maestro: docs/arquitectura/Negocios.md
 *
 * UBICACIÓN: apps/api/src/services/negocioPublicaciones/comentarios.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { validarTextoPublicacion } from '../marketplace/filtros.js';
import { crearNotificacion } from '../notificaciones.service.js';
import { armarArbolComentarios, type ComentarioNodo, type ComentarioPlano } from '../comentarios/arbol.js';

export { armarArbolComentarios };
export type { ComentarioNodo, ComentarioPlano };

// =============================================================================
// HELPERS PRIVADOS
// =============================================================================

/**
 * Obtiene un comentario con el negocio dueño de la publicación, para validar
 * propiedad/permisos.
 */
async function obtenerComentarioConNegocio(comentarioId: string): Promise<{
    id: string;
    autorId: string;
    publicacionId: string;
    parentId: string | null;
    negocioId: string;
    /** Modo en el que se escribió ESTE comentario — para que la notificación
     *  de respuesta le llegue a su autor en el mismo contexto (Personal o
     *  Comercial) en el que comentó. */
    modo: 'personal' | 'comercial';
} | null> {
    const resultado = await db.execute(sql`
        SELECT
            c.id,
            c.autor_id       AS autor_id,
            c.publicacion_id AS publicacion_id,
            c.parent_id      AS parent_id,
            c.modo,
            p.negocio_id     AS negocio_id
        FROM negocio_publicaciones_comentarios c
        INNER JOIN negocio_publicaciones p ON p.id = c.publicacion_id
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
        negocioId: row.negocio_id as string,
        modo: row.modo as 'personal' | 'comercial',
    };
}

/** ¿El usuario es dueño o gerente/empleado del negocio dado? */
async function usuarioPerteneceNegocio(usuarioId: string, negocioId: string): Promise<boolean> {
    const resultado = await db.execute(sql`
        SELECT 1
        FROM usuarios u
        LEFT JOIN negocios n ON n.usuario_id = u.id
        WHERE u.id = ${usuarioId}
          AND (n.id = ${negocioId} OR u.negocio_id = ${negocioId})
        LIMIT 1
    `);
    return resultado.rows.length > 0;
}

// =============================================================================
// LISTAR COMENTARIOS (público)
// =============================================================================

/**
 * Devuelve TODOS los comentarios vivos de una publicación, en árbol de 1
 * nivel. `esVendedor` = el autor es dueño/gerente del negocio de la publicación.
 *
 * Cuando `modo='comercial'`, el nombre/avatar mostrados son los del NEGOCIO
 * que el autor representa (el suyo propio — dueño vía `negocios.usuario_id`,
 * o gerente/empleado vía `usuarios.negocio_id`), NO su nombre/foto personal.
 * Puede ser un negocio DISTINTO al dueño de la publicación (alguien
 * comentando "como su negocio" en el post de otro) — en ese caso `esVendedor`
 * sigue en false porque esa condición sí exige ser específicamente el
 * negocio dueño DE ESTA publicación.
 */
export async function listarComentarios(publicacionId: string): Promise<ComentarioNodo[]> {
    const resultado = await db.execute(sql`
        SELECT
            c.id,
            c.autor_id    AS autor_id,
            CASE WHEN c.modo = 'comercial' AND neg_autor.id IS NOT NULL THEN neg_autor.nombre ELSE u.nombre END AS autor_nombre,
            CASE WHEN c.modo = 'comercial' AND neg_autor.id IS NOT NULL THEN '' ELSE u.apellidos END AS autor_apellidos,
            CASE WHEN c.modo = 'comercial' AND neg_autor.id IS NOT NULL THEN neg_autor.logo_url ELSE u.avatar_url END AS autor_avatar_url,
            c.parent_id   AS parent_id,
            c.texto,
            -- "Negocio" solo si comentó desde Modo Comercial (respeta el modo
            -- activo real al momento de comentar) Y de hecho pertenece al
            -- negocio dueño de la publicación (dueño o gerente/empleado) —
            -- ambas condiciones, no solo la estructural.
            (c.modo = 'comercial' AND (n.usuario_id = c.autor_id OR u.negocio_id = p.negocio_id)) AS es_vendedor,
            c.editado_at  AS editado_at,
            c.created_at  AS created_at
        FROM negocio_publicaciones_comentarios c
        INNER JOIN usuarios u ON u.id = c.autor_id
        INNER JOIN negocio_publicaciones p ON p.id = c.publicacion_id
        LEFT JOIN negocios n ON n.id = p.negocio_id
        -- Negocio que el AUTOR del comentario representa (no necesariamente
        -- el dueño de esta publicación): dueño primero, si no gerente/empleado.
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
            editadoAt: r.editado_at as string | null,
            createdAt: r.created_at as string,
        };
    });

    return armarArbolComentarios(planos);
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
): Promise<{ success: boolean; message: string; data?: { id: string } }> {
    // Verificar publicación y obtener autor + texto (para el mensaje de la notificación).
    const publicacionResult = await db.execute(sql`
        SELECT autor_usuario_id, texto
        FROM negocio_publicaciones
        WHERE id = ${publicacionId}
          AND deleted_at IS NULL
          AND estado = 'activa'
        LIMIT 1
    `);

    if (publicacionResult.rows.length === 0) {
        return { success: false, message: 'Publicación no encontrada' };
    }
    const publicacion = publicacionResult.rows[0] as { autor_usuario_id: string; texto: string };
    const duenoId = publicacion.autor_usuario_id;

    const validacion = validarTextoPublicacion(texto, '');
    if (!validacion.valido && validacion.severidad === 'rechazo') {
        return { success: false, message: validacion.mensaje };
    }

    // Si es respuesta: validar el comentario padre y resolver el raíz real.
    let parentRealId: string | null = null;
    let autorComentarioTocado: string | null = null;
    // Modo con el que el autor tocado escribió SU comentario — la notificación
    // de "te respondieron" le llega en ese mismo contexto (Personal o
    // Comercial), no en el modo de quien está respondiendo ahora.
    let modoComentarioTocado: 'personal' | 'comercial' = 'personal';
    if (parentId) {
        const padre = await obtenerComentarioConNegocio(parentId);
        if (!padre || padre.publicacionId !== publicacionId) {
            return { success: false, message: 'El comentario al que respondes no existe' };
        }
        // 1 nivel: si el padre ya es respuesta, cuelga del raíz (su parent).
        parentRealId = padre.parentId ?? padre.id;
        autorComentarioTocado = padre.autorId;
        modoComentarioTocado = padre.modo;
    }

    const insertResult = await db.execute(sql`
        INSERT INTO negocio_publicaciones_comentarios (publicacion_id, autor_id, parent_id, texto, modo)
        VALUES (${publicacionId}, ${autorId}, ${parentRealId}, ${texto}, ${modo})
        RETURNING id
    `);
    const nuevo = insertResult.rows[0] as { id: string };

    // ── Notificaciones ───────────────────────────────────────────────────────
    // Un solo destinatario por notificación (autor de la publicación o autor
    // del comentario tocado) — sin fan-out al equipo de la sucursal.
    const extracto = publicacion.texto.length > 60
        ? `${publicacion.texto.slice(0, 60)}...`
        : publicacion.texto;

    // Avatar/nombre de quien COMENTA (no del destinatario) — así el panel de
    // notificaciones muestra la foto de la persona que comentó, en vez del
    // ícono genérico de la familia "comunidad". Si comentó en Modo Comercial,
    // usa el nombre/logo del NEGOCIO que representa (mismo criterio que
    // `listarComentarios`), no su nombre/foto personal.
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

    if (!parentId) {
        // Comentario raíz → avisar al autor de la publicación. Siempre en
        // Modo Comercial: la publicación es actividad de su negocio, sin
        // importar en qué modo esté el destinatario ahora mismo.
        if (duenoId !== autorId) {
            await crearNotificacion({
                usuarioId: duenoId,
                modo: 'comercial',
                tipo: 'negocio_publicacion_nuevo_comentario',
                titulo: 'Nuevo comentario',
                mensaje: `Comentaron tu publicación: "${extracto}"`,
                referenciaId: publicacionId,
                referenciaTipo: 'negocio_publicacion',
                comentarioId: nuevo.id,
                actorNombre: autorComentario?.nombre,
                actorImagenUrl: autorComentario?.avatar_url ?? undefined,
            }).catch(() => { /* notificación no crítica */ });
        }
    } else {
        // Respuesta → avisar al autor del comentario respondido, en el
        // mismo modo con el que ESE comentario se escribió.
        if (autorComentarioTocado && autorComentarioTocado !== autorId) {
            await crearNotificacion({
                usuarioId: autorComentarioTocado,
                modo: modoComentarioTocado,
                tipo: 'negocio_publicacion_respuesta_comentario',
                titulo: 'Te respondieron',
                mensaje: `Respondieron tu comentario en: "${extracto}"`,
                referenciaId: publicacionId,
                referenciaTipo: 'negocio_publicacion',
                comentarioId: nuevo.id,
                actorNombre: autorComentario?.nombre,
                actorImagenUrl: autorComentario?.avatar_url ?? undefined,
            }).catch(() => { /* notificación no crítica */ });
        }
        // …y al autor de la publicación si es otra persona (actividad en su
        // post) — siempre Comercial, mismo criterio que el comentario raíz.
        if (duenoId !== autorId && duenoId !== autorComentarioTocado) {
            await crearNotificacion({
                usuarioId: duenoId,
                modo: 'comercial',
                tipo: 'negocio_publicacion_nuevo_comentario',
                titulo: 'Nuevo comentario',
                mensaje: `Comentaron tu publicación: "${extracto}"`,
                referenciaId: publicacionId,
                referenciaTipo: 'negocio_publicacion',
                comentarioId: nuevo.id,
                actorNombre: autorComentario?.nombre,
                actorImagenUrl: autorComentario?.avatar_url ?? undefined,
            }).catch(() => { /* notificación no crítica */ });
        }
    }

    return { success: true, message: 'Comentario publicado', data: { id: nuevo.id } };
}

// =============================================================================
// EDITAR COMENTARIO (solo autor, sin límite de tiempo)
// =============================================================================

export async function editarComentario(
    comentarioId: string,
    autorId: string,
    nuevoTexto: string
): Promise<{ success: boolean; message: string }> {
    const comentario = await obtenerComentarioConNegocio(comentarioId);
    if (!comentario) {
        return { success: false, message: 'Comentario no encontrado' };
    }
    if (comentario.autorId !== autorId) {
        return { success: false, message: 'No puedes editar este comentario' };
    }

    const validacion = validarTextoPublicacion(nuevoTexto, '');
    if (!validacion.valido && validacion.severidad === 'rechazo') {
        return { success: false, message: validacion.mensaje };
    }

    await db.execute(sql`
        UPDATE negocio_publicaciones_comentarios
        SET texto = ${nuevoTexto},
            editado_at = NOW()
        WHERE id = ${comentarioId}
          AND autor_id = ${autorId}
          AND deleted_at IS NULL
    `);

    return { success: true, message: 'Comentario actualizado' };
}

// =============================================================================
// ELIMINAR COMENTARIO (autor, O dueño/gerente del negocio de la publicación)
// =============================================================================

/**
 * Soft-delete. Permitido al autor del comentario o a cualquier
 * dueño/gerente del negocio dueño de la publicación (moderación de
 * cualquiera de sus posts). Si el comentario es raíz, arrastra
 * (soft-delete) sus respuestas.
 */
export async function eliminarComentario(
    comentarioId: string,
    usuarioId: string
): Promise<{ success: boolean; message: string }> {
    const comentario = await obtenerComentarioConNegocio(comentarioId);
    if (!comentario) {
        return { success: false, message: 'Comentario no encontrado' };
    }

    const esAutor = comentario.autorId === usuarioId;
    const esNegocio = esAutor ? false : await usuarioPerteneceNegocio(usuarioId, comentario.negocioId);
    if (!esAutor && !esNegocio) {
        return { success: false, message: 'No puedes eliminar este comentario' };
    }

    await db.execute(sql`
        UPDATE negocio_publicaciones_comentarios
        SET deleted_at = NOW()
        WHERE deleted_at IS NULL
          AND (id = ${comentarioId} OR parent_id = ${comentarioId})
    `);

    return { success: true, message: 'Comentario eliminado' };
}
