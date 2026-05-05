/**
 * preguntas.ts
 * =============
 * Service de Preguntas y Respuestas del MarketPlace (Sprint 9.2).
 *
 * Compradores preguntan sobre artículos; solo el vendedor responde.
 * Las respuestas quedan visibles públicamente. Sin hilos, sin edición,
 * sin likes — filosofía "no es foro" del documento maestro.
 *
 * Moderación: solo rechazo duro (severidad='rechazo'). Las sugerencias
 * de servicio/búsqueda no aplican a preguntas de compradores.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md
 * Plan: docs/reportes/Sprint-9.2-Plan-Implementacion.md
 *
 * UBICACIÓN: apps/api/src/services/marketplace/preguntas.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { validarTextoPublicacion } from './filtros.js';
import { crearNotificacion } from '../notificaciones.service.js';

// =============================================================================
// TIPOS INTERNOS
// =============================================================================

interface PreguntaPublicaRow {
    id: string;
    compradorNombre: string;
    pregunta: string;
    respuesta: string;
    respondidaAt: string;
    createdAt: string;
}

interface PreguntaVendedorRow {
    id: string;
    compradorId: string;
    compradorNombre: string;
    pregunta: string;
    respuesta: string | null;
    respondidaAt: string | null;
    createdAt: string;
}

interface PreguntaConArticuloRow {
    id: string;
    compradorId: string;
    articuloId: string;
    articuloUsuarioId: string;
    pregunta: string;
    respuesta: string | null;
    respondidaAt: string | null;
    deletedAt: string | null;
}

interface DatosCompradorRow {
    compradorId: string;
    compradorNombre: string;
    compradorApellidos: string;
    compradorAvatarUrl: string | null;
}

// =============================================================================
// HELPERS PRIVADOS
// =============================================================================

/**
 * Obtiene una pregunta con los datos del artículo para verificar propiedad.
 * Devuelve null si no existe o ya está eliminada.
 */
async function obtenerPreguntaConArticulo(
    preguntaId: string
): Promise<PreguntaConArticuloRow | null> {
    const resultado = await db.execute(sql`
        SELECT
            p.id,
            p.comprador_id    AS comprador_id,
            p.articulo_id     AS articulo_id,
            a.usuario_id      AS articulo_usuario_id,
            p.pregunta,
            p.respuesta,
            p.respondida_at   AS respondida_at,
            p.deleted_at      AS deleted_at
        FROM marketplace_preguntas p
        INNER JOIN articulos_marketplace a ON a.id = p.articulo_id
        WHERE p.id = ${preguntaId}
          AND p.deleted_at IS NULL
        LIMIT 1
    `);

    if (resultado.rows.length === 0) return null;
    const row = resultado.rows[0] as Record<string, unknown>;
    return {
        id: row.id as string,
        compradorId: row.comprador_id as string,
        articuloId: row.articulo_id as string,
        articuloUsuarioId: row.articulo_usuario_id as string,
        pregunta: row.pregunta as string,
        respuesta: row.respuesta as string | null,
        respondidaAt: row.respondida_at as string | null,
        deletedAt: row.deleted_at as string | null,
    };
}

// =============================================================================
// CREAR PREGUNTA
// =============================================================================

/**
 * El comprador hace una pregunta pública sobre un artículo.
 * Verifica: artículo existe, comprador ≠ dueño, una sola pregunta por artículo,
 * moderación rechazo duro. Notifica al vendedor.
 */
export async function crearPregunta(
    articuloId: string,
    compradorId: string,
    texto: string
): Promise<{ success: boolean; message: string; data?: { id: string } }> {
    // Verificar artículo y obtener dueño
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

    if (articulo.usuario_id === compradorId) {
        return { success: false, message: 'No puedes preguntar sobre tu propio artículo' };
    }

    // Moderación — solo rechazo duro
    const validacion = validarTextoPublicacion(texto, '');
    if (!validacion.valido && validacion.severidad === 'rechazo') {
        return { success: false, message: validacion.mensaje };
    }

    // INSERT — el UNIQUE constraint lanza error si ya tiene pregunta
    try {
        const insertResult = await db.execute(sql`
            INSERT INTO marketplace_preguntas (articulo_id, comprador_id, pregunta)
            VALUES (${articuloId}, ${compradorId}, ${texto})
            RETURNING id
        `);

        const nueva = insertResult.rows[0] as { id: string };

        // Notificar al vendedor
        await crearNotificacion({
            usuarioId: articulo.usuario_id,
            modo: 'personal',
            tipo: 'marketplace_nueva_pregunta',
            titulo: 'Nueva pregunta en tu artículo',
            mensaje: `Alguien preguntó sobre "${articulo.titulo}"`,
            referenciaId: articuloId,
            referenciaTipo: 'marketplace',
        }).catch(() => { /* notificación no crítica */ });

        return { success: true, message: 'Pregunta enviada', data: { id: nueva.id } };
    } catch (error: unknown) {
        const pgError = error as { code?: string; cause?: { code?: string } };
        if (pgError?.code === '23505' || pgError?.cause?.code === '23505') {
            return { success: false, message: 'Ya tienes una pregunta en esta publicación' };
        }
        throw error;
    }
}

// =============================================================================
// OBTENER PREGUNTAS PÚBLICAS
// =============================================================================

/**
 * Devuelve las preguntas respondidas de un artículo para visitantes.
 * Nombre del comprador: "Nombre I." (inicial del primer apellido).
 */
export async function obtenerPreguntasPublicas(
    articuloId: string
): Promise<PreguntaPublicaRow[]> {
    const resultado = await db.execute(sql`
        SELECT
            p.id,
            CONCAT(u.nombre, ' ', LEFT(u.apellidos, 1), '.') AS comprador_nombre,
            p.pregunta,
            p.respuesta,
            p.respondida_at  AS respondida_at,
            p.created_at     AS created_at
        FROM marketplace_preguntas p
        INNER JOIN usuarios u ON u.id = p.comprador_id
        WHERE p.articulo_id = ${articuloId}
          AND p.respondida_at IS NOT NULL
          AND p.deleted_at IS NULL
        ORDER BY p.respondida_at DESC
    `);

    return resultado.rows.map((row) => {
        const r = row as Record<string, unknown>;
        return {
            id: r.id as string,
            compradorNombre: r.comprador_nombre as string,
            pregunta: r.pregunta as string,
            respuesta: r.respuesta as string,
            respondidaAt: r.respondida_at as string,
            createdAt: r.created_at as string,
        };
    });
}

// =============================================================================
// OBTENER PREGUNTAS PARA VENDEDOR
// =============================================================================

/**
 * Devuelve todas las preguntas (pendientes + respondidas) del artículo
 * para el vendedor dueño. Dos arrays separados. Sin eliminadas.
 */
export async function obtenerPreguntasParaVendedor(
    articuloId: string,
    vendedorId: string
): Promise<{
    success: boolean;
    message?: string;
    data?: { pendientes: PreguntaVendedorRow[]; respondidas: PreguntaVendedorRow[] };
}> {
    // Verificar propiedad
    const articuloResult = await db.execute(sql`
        SELECT usuario_id FROM articulos_marketplace
        WHERE id = ${articuloId} AND deleted_at IS NULL
        LIMIT 1
    `);

    if (articuloResult.rows.length === 0) {
        return { success: false, message: 'Artículo no encontrado' };
    }

    const art = articuloResult.rows[0] as { usuario_id: string };
    if (art.usuario_id !== vendedorId) {
        return { success: false, message: 'No tienes acceso a este artículo' };
    }

    const resultado = await db.execute(sql`
        SELECT
            p.id,
            p.comprador_id   AS comprador_id,
            CONCAT(u.nombre, ' ', LEFT(u.apellidos, 1), '.') AS comprador_nombre,
            p.pregunta,
            p.respuesta,
            p.respondida_at  AS respondida_at,
            p.created_at     AS created_at
        FROM marketplace_preguntas p
        INNER JOIN usuarios u ON u.id = p.comprador_id
        WHERE p.articulo_id = ${articuloId}
          AND p.deleted_at IS NULL
        ORDER BY p.created_at ASC
    `);

    const pendientes: PreguntaVendedorRow[] = [];
    const respondidas: PreguntaVendedorRow[] = [];

    for (const row of resultado.rows) {
        const r = row as Record<string, unknown>;
        const pregunta: PreguntaVendedorRow = {
            id: r.id as string,
            compradorId: r.comprador_id as string,
            compradorNombre: r.comprador_nombre as string,
            pregunta: r.pregunta as string,
            respuesta: r.respuesta as string | null,
            respondidaAt: r.respondida_at as string | null,
            createdAt: r.created_at as string,
        };
        if (pregunta.respondidaAt === null) {
            pendientes.push(pregunta);
        } else {
            respondidas.push(pregunta);
        }
    }

    return { success: true, data: { pendientes, respondidas } };
}

// =============================================================================
// RESPONDER PREGUNTA
// =============================================================================

/**
 * El vendedor responde una pregunta pendiente.
 * Verifica: propiedad del artículo, pregunta sin respuesta previa,
 * moderación rechazo duro. Notifica al comprador.
 */
export async function responderPregunta(
    preguntaId: string,
    vendedorId: string,
    textoRespuesta: string
): Promise<{ success: boolean; message: string }> {
    const pregunta = await obtenerPreguntaConArticulo(preguntaId);

    if (!pregunta) {
        return { success: false, message: 'Pregunta no encontrada' };
    }

    if (pregunta.articuloUsuarioId !== vendedorId) {
        return { success: false, message: 'No tienes acceso a esta pregunta' };
    }

    if (pregunta.respondidaAt !== null) {
        return { success: false, message: 'Esta pregunta ya tiene respuesta' };
    }

    // Moderación — solo rechazo duro
    const validacion = validarTextoPublicacion(textoRespuesta, '');
    if (!validacion.valido && validacion.severidad === 'rechazo') {
        return { success: false, message: validacion.mensaje };
    }

    await db.execute(sql`
        UPDATE marketplace_preguntas
        SET respuesta = ${textoRespuesta},
            respondida_at = NOW()
        WHERE id = ${preguntaId}
    `);

    // Notificar al comprador
    await crearNotificacion({
        usuarioId: pregunta.compradorId,
        modo: 'personal',
        tipo: 'marketplace_pregunta_respondida',
        titulo: 'Tu pregunta fue respondida',
        mensaje: `El vendedor respondió tu pregunta`,
        referenciaId: pregunta.articuloId,
        referenciaTipo: 'marketplace',
    }).catch(() => { /* notificación no crítica */ });

    return { success: true, message: 'Respuesta publicada' };
}

// =============================================================================
// ELIMINAR PREGUNTA (VENDEDOR)
// =============================================================================

/**
 * El vendedor elimina una pregunta (respondida o pendiente) de su artículo.
 * Soft delete.
 */
export async function eliminarPregunta(
    preguntaId: string,
    vendedorId: string
): Promise<{ success: boolean; message: string }> {
    const pregunta = await obtenerPreguntaConArticulo(preguntaId);

    if (!pregunta) {
        return { success: false, message: 'Pregunta no encontrada' };
    }

    if (pregunta.articuloUsuarioId !== vendedorId) {
        return { success: false, message: 'No tienes acceso a esta pregunta' };
    }

    await db.execute(sql`
        UPDATE marketplace_preguntas
        SET deleted_at = NOW()
        WHERE id = ${preguntaId}
    `);

    return { success: true, message: 'Pregunta eliminada' };
}

// =============================================================================
// ELIMINAR PREGUNTA (COMPRADOR)
// =============================================================================

/**
 * El comprador retira su propia pregunta, pero solo si aún no tiene respuesta.
 */
export async function eliminarPreguntaComprador(
    preguntaId: string,
    compradorId: string
): Promise<{ success: boolean; message: string }> {
    const resultado = await db.execute(sql`
        SELECT id, comprador_id, respondida_at
        FROM marketplace_preguntas
        WHERE id = ${preguntaId}
          AND deleted_at IS NULL
        LIMIT 1
    `);

    if (resultado.rows.length === 0) {
        return { success: false, message: 'Pregunta no encontrada' };
    }

    const row = resultado.rows[0] as { id: string; comprador_id: string; respondida_at: string | null };

    if (row.comprador_id !== compradorId) {
        return { success: false, message: 'No puedes eliminar esta pregunta' };
    }

    if (row.respondida_at !== null) {
        return { success: false, message: 'No puedes retirar una pregunta que ya fue respondida' };
    }

    await db.execute(sql`
        UPDATE marketplace_preguntas
        SET deleted_at = NOW()
        WHERE id = ${preguntaId}
    `);

    return { success: true, message: 'Pregunta retirada' };
}

// =============================================================================
// DERIVAR A CHAT
// =============================================================================

/**
 * El vendedor abre un chat privado con el comprador para responder fuera del
 * Q&A público. Devuelve los datos del comprador para que el frontend abra
 * ChatYA con abrirChatTemporal + abrirChatYA. El vendedor escribe el mensaje
 * manualmente — no hay mensaje precargado en v1.
 *
 * NOTA: la pregunta pública NO se elimina al derivar a chat. El vendedor
 * puede usar el chat para conversar privado y aún así responder la pregunta
 * pública por separado si quiere. La pregunta solo se elimina con el botón
 * explícito "Eliminar".
 */
export async function derivarPreguntaAChat(
    preguntaId: string,
    vendedorId: string
): Promise<{
    success: boolean;
    message: string;
    data?: DatosCompradorRow & { articuloId: string };
}> {
    const pregunta = await obtenerPreguntaConArticulo(preguntaId);

    if (!pregunta) {
        return { success: false, message: 'Pregunta no encontrada' };
    }

    if (pregunta.articuloUsuarioId !== vendedorId) {
        return { success: false, message: 'No tienes acceso a esta pregunta' };
    }

    // Obtener datos del comprador para el ChatTemporal
    const compradorResult = await db.execute(sql`
        SELECT id, nombre, apellidos, avatar_url
        FROM usuarios
        WHERE id = ${pregunta.compradorId}
        LIMIT 1
    `);

    if (compradorResult.rows.length === 0) {
        return { success: false, message: 'Comprador no encontrado' };
    }

    const comprador = compradorResult.rows[0] as {
        id: string;
        nombre: string;
        apellidos: string;
        avatar_url: string | null;
    };

    return {
        success: true,
        message: 'Chat abierto',
        data: {
            compradorId: comprador.id,
            compradorNombre: comprador.nombre,
            compradorApellidos: comprador.apellidos,
            compradorAvatarUrl: comprador.avatar_url,
            articuloId: pregunta.articuloId,
        },
    };
}
