/**
 * comentarios.ts
 * ==============
 * Service de COMENTARIOS del MarketPlace (reemplaza el Q&A `preguntas.ts`).
 *
 * Modelo: comentarios públicos al instante, con HILOS de 1 nivel.
 *  - 1 fila = 1 mensaje (tabla `marketplace_comentarios`).
 *  - `parent_id` NULL = comentario raíz; con valor = respuesta a ese raíz.
 *  - Solo 1 nivel: responder a una respuesta cuelga del mismo raíz (se
 *    resuelve aquí subiendo el `parentId` al raíz), pero la notificación va
 *    al autor del comentario que el usuario realmente tocó.
 *
 * Permisos:
 *  - Crear: cualquier usuario autenticado en modo personal. El DUEÑO también
 *    puede comentar/responder en su propio artículo (sus comentarios llevan la
 *    etiqueta "Vendedor"); es justo el caso de "el vendedor responde dudas".
 *  - Editar: SOLO el autor del comentario, SIN límite de tiempo.
 *  - Eliminar: el autor del comentario O el dueño del artículo. Borrar un
 *    raíz arrastra (soft-delete) sus respuestas.
 *
 * Moderación: solo rechazo duro (severidad='rechazo'), igual que el Q&A viejo.
 *
 * Notificaciones:
 *  - Comentario raíz   → al dueño del artículo ('marketplace_nuevo_comentario').
 *  - Respuesta         → al autor del comentario respondido
 *    ('marketplace_respuesta_comentario') y, si es otra persona, también al
 *    dueño del artículo ('marketplace_nuevo_comentario').
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md
 *
 * UBICACIÓN: apps/api/src/services/marketplace/comentarios.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { validarTextoPublicacion } from './filtros.js';
import { crearNotificacion } from '../notificaciones.service.js';
import { armarArbolComentarios, type ComentarioNodo, type ComentarioPlano } from '../comentarios/arbol.js';

// Re-export para no romper a quienes ya importan estos símbolos desde aquí
// (ej. marketplace.service.ts). El armado vive ahora en services/comentarios/arbol.ts.
export { armarArbolComentarios };
export type { ComentarioNodo, ComentarioPlano };

// =============================================================================
// HELPERS PRIVADOS
// =============================================================================

/**
 * Obtiene un comentario con el dueño del artículo, para validar propiedad/permisos.
 * Devuelve null si no existe o ya está eliminado.
 */
async function obtenerComentarioConDueno(comentarioId: string): Promise<{
    id: string;
    autorId: string;
    articuloId: string;
    parentId: string | null;
    duenoArticuloId: string;
    articuloTitulo: string;
} | null> {
    const resultado = await db.execute(sql`
        SELECT
            c.id,
            c.autor_id    AS autor_id,
            c.articulo_id AS articulo_id,
            c.parent_id   AS parent_id,
            a.usuario_id  AS dueno_articulo_id,
            a.titulo      AS articulo_titulo
        FROM marketplace_comentarios c
        INNER JOIN articulos_marketplace a ON a.id = c.articulo_id
        WHERE c.id = ${comentarioId}
          AND c.deleted_at IS NULL
        LIMIT 1
    `);

    if (resultado.rows.length === 0) return null;
    const row = resultado.rows[0] as Record<string, unknown>;
    return {
        id: row.id as string,
        autorId: row.autor_id as string,
        articuloId: row.articulo_id as string,
        parentId: row.parent_id as string | null,
        duenoArticuloId: row.dueno_articulo_id as string,
        articuloTitulo: row.articulo_titulo as string,
    };
}

// =============================================================================
// LISTAR COMENTARIOS (público)
// =============================================================================

/**
 * Devuelve TODOS los comentarios vivos de un artículo, en árbol de 1 nivel.
 * Público: sin filtros de visibilidad (ya no hay "pendiente").
 *
 * Orden: raíces más recientes primero (DESC); respuestas en orden cronológico
 * (ASC) dentro de cada hilo.
 */
export async function listarComentarios(articuloId: string): Promise<ComentarioNodo[]> {
    const resultado = await db.execute(sql`
        SELECT
            c.id,
            c.autor_id    AS autor_id,
            u.nombre      AS autor_nombre,
            u.apellidos   AS autor_apellidos,
            u.avatar_url  AS autor_avatar_url,
            c.parent_id   AS parent_id,
            c.texto,
            (c.autor_id = a.usuario_id) AS es_vendedor,
            c.editado_at  AS editado_at,
            c.created_at  AS created_at
        FROM marketplace_comentarios c
        INNER JOIN usuarios u ON u.id = c.autor_id
        INNER JOIN articulos_marketplace a ON a.id = c.articulo_id
        WHERE c.articulo_id = ${articuloId}
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

/**
 * Crea un comentario (raíz o respuesta) público al instante.
 *
 * @param parentId  Si se pasa, es el id del comentario al que se responde. Si
 *   ese comentario ya es una respuesta, el nuevo comentario cuelga de SU raíz
 *   (se mantiene 1 nivel), pero la notificación va al autor del comentario
 *   tocado.
 */
export async function crearComentario(
    articuloId: string,
    autorId: string,
    texto: string,
    parentId?: string | null
): Promise<{ success: boolean; message: string; data?: { id: string } }> {
    // Verificar artículo y obtener dueño + título.
    const articuloResult = await db.execute(sql`
        SELECT usuario_id, titulo
        FROM articulos_marketplace
        WHERE id = ${articuloId}
          AND deleted_at IS NULL
          AND estado = 'activa'
        LIMIT 1
    `);

    if (articuloResult.rows.length === 0) {
        return { success: false, message: 'Artículo no encontrado' };
    }
    const articulo = articuloResult.rows[0] as { usuario_id: string; titulo: string };
    const duenoId = articulo.usuario_id;

    // El dueño SÍ puede comentar/responder en su artículo (etiqueta "Vendedor").

    // Moderación — solo rechazo duro.
    const validacion = validarTextoPublicacion(texto, '');
    if (!validacion.valido && validacion.severidad === 'rechazo') {
        return { success: false, message: validacion.mensaje };
    }

    // Si es respuesta: validar el comentario padre y resolver el raíz real.
    let parentRealId: string | null = null;
    let autorComentarioTocado: string | null = null;
    if (parentId) {
        const padre = await obtenerComentarioConDueno(parentId);
        if (!padre || padre.articuloId !== articuloId) {
            return { success: false, message: 'El comentario al que respondes no existe' };
        }
        // 1 nivel: si el padre ya es respuesta, cuelga del raíz (su parent).
        parentRealId = padre.parentId ?? padre.id;
        autorComentarioTocado = padre.autorId;
    }

    const insertResult = await db.execute(sql`
        INSERT INTO marketplace_comentarios (articulo_id, autor_id, parent_id, texto)
        VALUES (${articuloId}, ${autorId}, ${parentRealId}, ${texto})
        RETURNING id
    `);
    const nuevo = insertResult.rows[0] as { id: string };

    // ── Notificaciones ───────────────────────────────────────────────────────
    if (!parentId) {
        // Comentario raíz → avisar al dueño del artículo.
        if (duenoId !== autorId) {
            await crearNotificacion({
                usuarioId: duenoId,
                modo: 'personal',
                tipo: 'marketplace_nuevo_comentario',
                titulo: 'Nuevo comentario',
                mensaje: `Comentaron en "${articulo.titulo}"`,
                referenciaId: articuloId,
                referenciaTipo: 'marketplace',
            }).catch(() => { /* notificación no crítica */ });
        }
    } else {
        // Respuesta → avisar al autor del comentario respondido.
        if (autorComentarioTocado && autorComentarioTocado !== autorId) {
            await crearNotificacion({
                usuarioId: autorComentarioTocado,
                modo: 'personal',
                tipo: 'marketplace_respuesta_comentario',
                titulo: 'Te respondieron',
                mensaje: `Respondieron tu comentario en "${articulo.titulo}"`,
                referenciaId: articuloId,
                referenciaTipo: 'marketplace',
            }).catch(() => { /* notificación no crítica */ });
        }
        // …y al dueño del artículo si es otra persona (actividad en su publicación).
        if (duenoId !== autorId && duenoId !== autorComentarioTocado) {
            await crearNotificacion({
                usuarioId: duenoId,
                modo: 'personal',
                tipo: 'marketplace_nuevo_comentario',
                titulo: 'Nuevo comentario',
                mensaje: `Comentaron en "${articulo.titulo}"`,
                referenciaId: articuloId,
                referenciaTipo: 'marketplace',
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
    const comentario = await obtenerComentarioConDueno(comentarioId);
    if (!comentario) {
        return { success: false, message: 'Comentario no encontrado' };
    }
    if (comentario.autorId !== autorId) {
        return { success: false, message: 'No puedes editar este comentario' };
    }

    // Moderación — mismo criterio que crear.
    const validacion = validarTextoPublicacion(nuevoTexto, '');
    if (!validacion.valido && validacion.severidad === 'rechazo') {
        return { success: false, message: validacion.mensaje };
    }

    await db.execute(sql`
        UPDATE marketplace_comentarios
        SET texto = ${nuevoTexto},
            editado_at = NOW()
        WHERE id = ${comentarioId}
          AND autor_id = ${autorId}
          AND deleted_at IS NULL
    `);

    return { success: true, message: 'Comentario actualizado' };
}

// =============================================================================
// ELIMINAR COMENTARIO (autor O dueño del artículo)
// =============================================================================

/**
 * Soft-delete. Permitido al autor del comentario o al dueño del artículo.
 * Si el comentario es raíz, arrastra (soft-delete) sus respuestas.
 */
export async function eliminarComentario(
    comentarioId: string,
    usuarioId: string
): Promise<{ success: boolean; message: string }> {
    const comentario = await obtenerComentarioConDueno(comentarioId);
    if (!comentario) {
        return { success: false, message: 'Comentario no encontrado' };
    }

    const esAutor = comentario.autorId === usuarioId;
    const esDuenoArticulo = comentario.duenoArticuloId === usuarioId;
    if (!esAutor && !esDuenoArticulo) {
        return { success: false, message: 'No puedes eliminar este comentario' };
    }

    // Soft-delete del comentario + cascada a sus respuestas (si es raíz).
    await db.execute(sql`
        UPDATE marketplace_comentarios
        SET deleted_at = NOW()
        WHERE deleted_at IS NULL
          AND (id = ${comentarioId} OR parent_id = ${comentarioId})
    `);

    return { success: true, message: 'Comentario eliminado' };
}
