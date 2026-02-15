/**
 * resenas.service.ts
 * ====================
 * Servicio para el módulo de Reseñas.
 * Gestiona lectura, creación y verificación de compras.
 *
 * UBICACIÓN: apps/api/src/services/resenas.service.ts
 */

import { sql, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
    usuarios,
    negocioSucursales,
    negocios,
} from '../db/schemas/schema.js';
import { crearNotificacion } from './notificaciones.service.js';
import type { CrearResenaInput, ResponderResenaInput } from '../validations/resenas.schema.js';

// =============================================================================
// TIPOS
// =============================================================================

interface ResenaConAutor {
    id: string;
    rating: number | null;
    texto: string | null;
    createdAt: string | null;
    autor: {
        id: string;
        nombre: string;
        avatarUrl: string | null;
    };
    respuestaNegocio?: {
        texto: string;
        fecha: string;
        negocioNombre: string;
        negocioLogo: string | null;
    } | null;
}

interface RespuestaServicio<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    code?: number;
}

// =============================================================================
// OBTENER RESEÑAS DE UNA SUCURSAL
// =============================================================================

/**
 * Obtiene todas las reseñas de una sucursal con datos del autor.
 * Ordenadas por fecha (más recientes primero).
 */
export async function obtenerResenasSucursal(
    sucursalId: string
): Promise<RespuestaServicio<ResenaConAutor[]>> {
    try {
        const query = sql`
            SELECT 
                r.id::text as id,
                r.rating,
                r.texto,
                r.created_at,
                json_build_object(
                    'id', u.id,
                    'nombre', u.nombre,
                    'avatarUrl', u.avatar_url
                ) as autor,
                CASE
                    WHEN resp.id IS NOT NULL THEN
                        json_build_object(
                            'texto',  resp.texto,
                            'fecha',  resp.created_at,
                            'negocioNombre', n.nombre,
                            'negocioLogo',   n.logo_url
                        )
                    ELSE NULL
                END AS respuesta_negocio
            FROM resenas r
            INNER JOIN usuarios u ON u.id = r.autor_id
            LEFT JOIN resenas resp
                ON  resp.autor_tipo       = 'negocio'
                AND resp.interaccion_tipo = 'scanya'
                AND resp.interaccion_id   = r.interaccion_id
                AND resp.destino_id       = r.autor_id
            LEFT JOIN negocio_sucursales ns ON ns.id = r.sucursal_id
            LEFT JOIN negocios n ON n.id = ns.negocio_id
            WHERE r.sucursal_id = ${sucursalId}
              AND r.autor_tipo = 'cliente'
              AND r.destino_tipo = 'negocio'
            ORDER BY r.created_at DESC
        `;

        const resultado = await db.execute(query);

        const resenasFormateadas: ResenaConAutor[] = (resultado.rows as Record<string, unknown>[]).map((row) => ({
            id: row.id as string,
            rating: row.rating as number | null,
            texto: row.texto as string | null,
            createdAt: row.created_at as string | null,
            autor: row.autor as { id: string; nombre: string; avatarUrl: string | null },
            respuestaNegocio: row.respuesta_negocio as {
                texto: string;
                fecha: string;
                negocioNombre: string;
                negocioLogo: string | null;
            } | null,
        }));

        return {
            success: true,
            message: 'Reseñas obtenidas',
            data: resenasFormateadas,
        };
    } catch (error) {
        console.error('Error en obtenerResenasSucursal:', error);
        return { success: false, message: 'Error al obtener reseñas', code: 500 };
    }
}

// =============================================================================
// OBTENER PROMEDIO DE RESEÑAS
// =============================================================================

/**
 * Obtiene el promedio de calificación y total de reseñas de una sucursal.
 */
export async function obtenerPromedioResenas(
    sucursalId: string
): Promise<RespuestaServicio<{ promedio: number; total: number }>> {
    try {
        const query = sql`
            SELECT 
                COALESCE(AVG(rating), 0) as promedio,
                COUNT(*)::int as total
            FROM resenas
            WHERE sucursal_id = ${sucursalId}
              AND rating IS NOT NULL
        `;

        const resultado = await db.execute(query);
        const row = resultado.rows[0] as Record<string, unknown>;

        return {
            success: true,
            message: 'Promedio obtenido',
            data: {
                promedio: parseFloat(row.promedio as string) || 0,
                total: (row.total as number) || 0,
            },
        };
    } catch (error) {
        console.error('Error en obtenerPromedioResenas:', error);
        return { success: false, message: 'Error al obtener promedio', code: 500 };
    }
}

// =============================================================================
// VERIFICAR SI PUEDE RESEÑAR (tiene compra reciente en el negocio)
// =============================================================================

/**
 * Verifica si el usuario tiene al menos una transacción (compra verificada)
 * en el negocio de esa sucursal en los últimos 90 días.
 *
 * Retorna la transacción más reciente (para usarla como interaccion_id).
 * También verifica que no haya una reseña existente con esa transacción.
 */
export async function verificarPuedeResenar(
    usuarioId: string,
    sucursalId: string
): Promise<RespuestaServicio<{
    puedeResenar: boolean;
    razon?: string;
    transaccionId?: string;
}>> {
    try {
        // 1. Obtener negocioId de la sucursal
        const [sucursal] = await db
            .select({ negocioId: negocioSucursales.negocioId })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.id, sucursalId))
            .limit(1);

        if (!sucursal) {
            return {
                success: true,
                message: 'Sucursal no encontrada',
                data: { puedeResenar: false, razon: 'Sucursal no encontrada' },
            };
        }

        // 2. Buscar transacciones del usuario en este negocio (últimos 90 días)
        const hace90Dias = new Date();
        hace90Dias.setDate(hace90Dias.getDate() - 90);

        const transacciones = await db.execute(sql`
            SELECT id::text
            FROM puntos_transacciones
            WHERE cliente_id = ${usuarioId}
              AND sucursal_id = ${sucursalId}
              AND created_at >= ${hace90Dias.toISOString()}
            ORDER BY created_at DESC
        `);

        if (transacciones.rows.length === 0) {
            return {
                success: true,
                message: 'Sin compras recientes',
                data: { puedeResenar: false, razon: 'sin_compra' },
            };
        }

        // 3. Verificar si ya existe una reseña del usuario para este negocio
        //    con alguna de esas transacciones
        for (const tx of transacciones.rows) {
            const transaccionId = (tx as Record<string, unknown>).id as string;

            const resenaExistente = await db.execute(sql`
                SELECT id FROM resenas
                WHERE autor_id = ${usuarioId}
                  AND destino_tipo = 'negocio'
                  AND destino_id = ${sucursal.negocioId}
                  AND interaccion_id = ${transaccionId}
                LIMIT 1
            `);

            // Si no hay reseña con esta transacción, puede reseñar
            if (resenaExistente.rows.length === 0) {
                return {
                    success: true,
                    message: 'Puede reseñar',
                    data: { puedeResenar: true, transaccionId },
                };
            }
        }

        // Todas las transacciones ya tienen reseña
        return {
            success: true,
            message: 'Ya reseñaste todas tus compras recientes',
            data: { puedeResenar: false, razon: 'ya_reseno' },
        };

    } catch (error) {
        console.error('Error en verificarPuedeResenar:', error);
        return { success: false, message: 'Error al verificar', code: 500 };
    }
}

// =============================================================================
// CREAR RESEÑA
// =============================================================================

/**
 * Crea una reseña verificada.
 * 
 * Flujo:
 * 1. Verificar que puede reseñar (compra reciente + no duplicada)
 * 2. Obtener negocioId de la sucursal
 * 3. Insertar reseña
 * 4. Actualizar métricas del negocio
 * 5. Notificar al dueño + empleados de la sucursal
 */
export async function crearResena(
    autorId: string,
    datos: CrearResenaInput
): Promise<RespuestaServicio<ResenaConAutor>> {
    try {
        // 1. Verificar que puede reseñar
        const verificacion = await verificarPuedeResenar(autorId, datos.sucursalId);

        if (!verificacion.success || !verificacion.data?.puedeResenar) {
            const mensajes: Record<string, string> = {
                sin_compra: 'Necesitas una compra verificada en los últimos 90 días para dejar una reseña',
                ya_reseno: 'Ya dejaste una reseña por cada compra reciente en este negocio',
            };
            return {
                success: false,
                message: mensajes[verificacion.data?.razon || ''] || 'No puedes reseñar este negocio',
                code: 403,
            };
        }

        const transaccionId = verificacion.data.transaccionId!;

        // 2. Obtener negocioId
        const [sucursal] = await db
            .select({ negocioId: negocioSucursales.negocioId })
            .from(negocioSucursales)
            .where(eq(negocioSucursales.id, datos.sucursalId))
            .limit(1);

        if (!sucursal) {
            return { success: false, message: 'Sucursal no encontrada', code: 404 };
        }

        // 3. Insertar reseña
        const resultado = await db.execute(sql`
            INSERT INTO resenas (
                autor_id, autor_tipo, destino_tipo, destino_id,
                rating, texto, interaccion_tipo, interaccion_id, sucursal_id
            ) VALUES (
                ${autorId}, 'cliente', 'negocio', ${sucursal.negocioId},
                ${datos.rating ?? null}, ${datos.texto?.trim() ?? null},
                'scanya', ${transaccionId}, ${datos.sucursalId}
            )
            RETURNING id::text, rating, texto, created_at
        `);

        const row = resultado.rows[0] as Record<string, unknown>;

        // 4. Rating y total_calificaciones se actualizan automáticamente en
        //    negocio_sucursales vía trigger_actualizar_rating_sucursal (INSERT/UPDATE/DELETE en resenas)

        // 5. Obtener datos del autor para la respuesta
        const [autor] = await db
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                avatarUrl: usuarios.avatarUrl,
            })
            .from(usuarios)
            .where(eq(usuarios.id, autorId))
            .limit(1);

        const resenaFormateada: ResenaConAutor = {
            id: row.id as string,
            rating: row.rating as number | null,
            texto: row.texto as string | null,
            createdAt: row.created_at as string | null,
            autor: {
                id: autor?.id || autorId,
                nombre: autor?.nombre || 'Usuario',
                avatarUrl: autor?.avatarUrl || null,
            },
        };

        // 6. Notificar al dueño del negocio
        const [negocioDueno] = await db
            .select({ usuarioId: negocios.usuarioId, nombre: negocios.nombre })
            .from(negocios)
            .where(eq(negocios.id, sucursal.negocioId))
            .limit(1);

        if (negocioDueno) {
            const estrellas = datos.rating ? '⭐'.repeat(datos.rating) : '';

            crearNotificacion({
                usuarioId: negocioDueno.usuarioId,
                modo: 'comercial',
                tipo: 'nueva_resena',
                titulo: `Nueva reseña ${estrellas}`,
                mensaje: datos.texto
                    ? `${autor?.nombre || 'Un cliente'}: "${datos.texto.slice(0, 80)}${datos.texto.length > 80 ? '...' : ''}"`
                    : `${autor?.nombre || 'Un cliente'} calificó tu negocio`,
                negocioId: sucursal.negocioId,
                sucursalId: datos.sucursalId,
                referenciaId: row.id as string,
                referenciaTipo: 'resena',
                icono: '⭐',
            }).catch((err) => console.error('Error notificación reseña dueño:', err));
        }

        return {
            success: true,
            message: '¡Reseña publicada exitosamente!',
            data: resenaFormateada,
        };

    } catch (error) {
        console.error('Error en crearResena:', error);

        // Manejar error de constraint unique (reseña duplicada)
        if ((error as { code?: string }).code === '23505') {
            return {
                success: false,
                message: 'Ya dejaste una reseña por esta compra',
                code: 409,
            };
        }

        return { success: false, message: 'Error al crear reseña', code: 500 };
    }
}

// =============================================================================
// OBTENER RESEÑAS DESDE PERSPECTIVA DEL NEGOCIO (ScanYA / Business Studio)
// =============================================================================

/**
 * Lista reseñas de clientes hacia el negocio, incluyendo la respuesta del
 * negocio si existe. Soporta filtro por sucursal y por estado (pendientes/todas).
 *
 * La "respuesta" se identifica como otra fila en `resenas` donde:
 * - autor_tipo = 'negocio'
 * - interaccion_tipo = 'scanya'
 * - interaccion_id = id de la reseña original (como texto)
 *
 * @param negocioId  - UUID del negocio
 * @param sucursalId - Opcional: filtrar por sucursal específica
 * @param soloPendientes - true = solo reseñas sin respuesta
 */
export async function obtenerResenasNegocio(
    negocioId: string,
    sucursalId?: string,
    soloPendientes: boolean = false
): Promise<RespuestaServicio<Array<{
    id: string;
    rating: number | null;
    texto: string | null;
    createdAt: string | null;
    sucursalId: string | null;
    sucursalNombre: string | null;
    autor: {
        id: string;
        nombre: string;
        avatarUrl: string | null;
    };
    respuesta: {
        id: string;
        texto: string | null;
        createdAt: string | null;
    } | null;
}>>> {
    try {
        const filtroSucursal = sucursalId
            ? sql`AND r.sucursal_id = ${sucursalId}`
            : sql``;

        const filtroPendientes = soloPendientes
            ? sql`AND resp.id IS NULL`
            : sql``;

        const query = sql`
            SELECT
                r.id::text        AS id,
                r.rating,
                r.texto,
                r.created_at,
                r.sucursal_id::text AS sucursal_id,
                ns.nombre         AS sucursal_nombre,
                json_build_object(
                    'id',        u.id,
                    'nombre',    u.nombre,
                    'avatarUrl', u.avatar_url
                ) AS autor,
                CASE
                    WHEN resp.id IS NOT NULL THEN
                        json_build_object(
                            'id',        resp.id::text,
                            'texto',     resp.texto,
                            'createdAt', resp.created_at
                        )
                    ELSE NULL
                END AS respuesta
            FROM resenas r
            INNER JOIN usuarios u ON u.id = r.autor_id
            LEFT JOIN negocio_sucursales ns ON ns.id = r.sucursal_id
            LEFT JOIN resenas resp
                ON  resp.autor_tipo       = 'negocio'
                AND resp.interaccion_tipo = 'scanya'
                AND resp.interaccion_id   = r.interaccion_id
                AND resp.destino_id       = r.autor_id
            WHERE r.destino_tipo = 'negocio'
              AND r.destino_id   = ${negocioId}
              AND r.autor_tipo   = 'cliente'
              ${filtroSucursal}
              ${filtroPendientes}
            ORDER BY r.created_at DESC
        `;

        const resultado = await db.execute(query);

        const resenas = (resultado.rows as Record<string, unknown>[]).map((row) => ({
            id: row.id as string,
            rating: row.rating as number | null,
            texto: row.texto as string | null,
            createdAt: row.created_at as string | null,
            sucursalId: row.sucursal_id as string | null,
            sucursalNombre: row.sucursal_nombre as string | null,
            autor: row.autor as { id: string; nombre: string; avatarUrl: string | null },
            respuesta: row.respuesta as { id: string; texto: string | null; createdAt: string | null } | null,
        }));

        return {
            success: true,
            message: `${resenas.length} reseña${resenas.length !== 1 ? 's' : ''} encontrada${resenas.length !== 1 ? 's' : ''}`,
            data: resenas,
        };
    } catch (error) {
        console.error('Error en obtenerResenasNegocio:', error);
        return { success: false, message: 'Error al obtener reseñas', code: 500 };
    }
}

// =============================================================================
// RESPONDER RESEÑA (desde el negocio)
// =============================================================================

/**
 * El negocio responde a una reseña de cliente.
 *
 * Inserta una nueva fila en `resenas` con:
 * - autor_tipo = 'negocio', autor_id = NULL
 * - destino_tipo = 'usuario', destino_id = autorId de la reseña original
 * - interaccion_id = id de la reseña original
 * - rating = NULL (las respuestas no llevan calificación)
 *
 * @param negocioId - UUID del negocio que responde
 * @param datos     - { resenaId, texto }
 */
export async function responderResena(
    negocioId: string,
    datos: ResponderResenaInput,
    respondidoPorId: string | null = null,
    respondidoPorEmpleadoId: string | null = null
): Promise<RespuestaServicio<{ id: string; texto: string; createdAt: string }>> {
    try {
        // 1. Obtener la reseña original y verificar que pertenece a este negocio
        const resenaOriginal = await db.execute(sql`
            SELECT r.id, r.autor_id, r.destino_id, r.sucursal_id, r.interaccion_id
            FROM resenas r
            WHERE r.id = ${datos.resenaId}
              AND r.destino_tipo = 'negocio'
              AND r.destino_id   = ${negocioId}
              AND r.autor_tipo   = 'cliente'
            LIMIT 1
        `);

        if (resenaOriginal.rows.length === 0) {
            return {
                success: false,
                message: 'Reseña no encontrada o no pertenece a tu negocio',
                code: 404,
            };
        }

        const original = resenaOriginal.rows[0] as Record<string, unknown>;

        // 2. Verificar si ya existe una respuesta
        // Vinculamos por: mismo interaccion_id + destino = autor original
        const respuestaExistente = await db.execute(sql`
            SELECT id FROM resenas
            WHERE autor_tipo       = 'negocio'
              AND interaccion_tipo = 'scanya'
              AND interaccion_id   = ${original.interaccion_id as string}
              AND destino_id       = ${original.autor_id as string}
            LIMIT 1
        `);

        let row: Record<string, unknown>;

        if (respuestaExistente.rows.length > 0) {
            // Ya existe respuesta → UPDATE (editar)
            const existente = respuestaExistente.rows[0] as Record<string, unknown>;
            const resultado = await db.execute(sql`
                UPDATE resenas
                SET texto = ${datos.texto.trim()},
                    autor_id = ${respondidoPorId},
                    respondido_por_empleado_id = ${respondidoPorEmpleadoId},
                    updated_at = NOW()
                WHERE id = ${existente.id as string}
                RETURNING id::text, texto, created_at
            `);
            row = resultado.rows[0] as Record<string, unknown>;
        } else {
            // No existe → INSERT (nueva respuesta)
            const resultado = await db.execute(sql`
                INSERT INTO resenas (
                    autor_id, autor_tipo, destino_tipo, destino_id,
                    rating, texto, interaccion_tipo, interaccion_id,
                    sucursal_id, respondido_por_empleado_id
                ) VALUES (
                    ${respondidoPorId}, 'negocio', 'usuario', ${original.autor_id as string},
                    NULL, ${datos.texto.trim()}, 'scanya',
                    ${original.interaccion_id as string},
                    ${original.sucursal_id as string},
                    ${respondidoPorEmpleadoId}
                )
                RETURNING id::text, texto, created_at
            `);
            row = resultado.rows[0] as Record<string, unknown>;
        }

        const esEdicion = respuestaExistente.rows.length > 0;

        // 4. Notificar al cliente (solo en respuesta nueva, no en edición)
        if (!esEdicion && original.autor_id) {
            const [negocio] = await db
                .select({ nombre: negocios.nombre })
                .from(negocios)
                .where(eq(negocios.id, negocioId))
                .limit(1);

            crearNotificacion({
                usuarioId: original.autor_id as string,
                modo: 'personal',
                tipo: 'nueva_resena',
                titulo: `${negocio?.nombre || 'Un negocio'} respondió tu reseña`,
                mensaje: datos.texto.length > 80
                    ? `"${datos.texto.slice(0, 80)}..."`
                    : `"${datos.texto}"`,
                negocioId,
                sucursalId: original.sucursal_id as string,
                referenciaId: datos.resenaId,
                referenciaTipo: 'resena',
                icono: '💬',
            }).catch((err) => console.error('Error notificación respuesta reseña:', err));
        }

        return {
            success: true,
            message: esEdicion ? '¡Respuesta actualizada!' : '¡Respuesta publicada!',
            data: {
                id: row.id as string,
                texto: row.texto as string,
                createdAt: row.created_at as string,
            },
        };

    } catch (error) {
        console.error('Error en responderResena:', error);
        return { success: false, message: 'Error al responder reseña', code: 500 };
    }
}

// =============================================================================
// CONTAR RESEÑAS PENDIENTES DE RESPUESTA
// =============================================================================

/**
 * Cuenta las reseñas de clientes que aún no tienen respuesta del negocio.
 * Usada por obtenerContadores() en scanya.service.ts
 *
 * @param negocioId  - UUID del negocio
 * @param sucursalId - Opcional: filtrar por sucursal (para gerentes/empleados)
 */
export async function contarResenasPendientes(
    negocioId: string,
    sucursalId?: string
): Promise<number> {
    try {
        const filtroSucursal = sucursalId
            ? sql`AND r.sucursal_id = ${sucursalId}`
            : sql``;

        const resultado = await db.execute(sql`
            SELECT COUNT(*)::int AS total
            FROM resenas r
            LEFT JOIN resenas resp
                ON  resp.autor_tipo       = 'negocio'
                AND resp.interaccion_tipo = 'scanya'
                AND resp.interaccion_id   = r.interaccion_id
                AND resp.destino_id       = r.autor_id
            WHERE r.destino_tipo = 'negocio'
              AND r.destino_id   = ${negocioId}
              AND r.autor_tipo   = 'cliente'
              AND resp.id IS NULL
              ${filtroSucursal}
        `);

        const row = resultado.rows[0] as Record<string, unknown>;
        return (row.total as number) || 0;
    } catch (error) {
        console.error('Error en contarResenasPendientes:', error);
        return 0;
    }
}

// =============================================================================
// EDITAR RESEÑA (cliente edita su propia reseña)
// =============================================================================

/**
 * El cliente edita su propia reseña (texto y/o rating).
 * Solo puede editar reseñas donde es el autor.
 *
 * @param autorId  - UUID del usuario que edita
 * @param resenaId - ID numérico de la reseña
 * @param datos    - { texto?, rating? } al menos uno requerido
 */
export async function editarResena(
    autorId: string,
    resenaId: string,
    datos: { texto?: string; rating?: number }
): Promise<RespuestaServicio<{ id: string; texto: string | null; rating: number | null; updatedAt: string }>> {
    try {
        // 1. Verificar que la reseña exista y sea del autor
        const resenaExistente = await db.execute(sql`
            SELECT id, autor_id, sucursal_id
            FROM resenas
            WHERE id = ${resenaId}
              AND autor_id    = ${autorId}
              AND autor_tipo  = 'cliente'
            LIMIT 1
        `);

        if (resenaExistente.rows.length === 0) {
            return {
                success: false,
                message: 'Reseña no encontrada o no tienes permiso para editarla',
                code: 404,
            };
        }

        // 2. Construir campos a actualizar
        const sets: string[] = [];
        const valores: unknown[] = [];

        if (datos.texto !== undefined) {
            sets.push('texto');
            valores.push(datos.texto.trim());
        }
        if (datos.rating !== undefined) {
            sets.push('rating');
            valores.push(datos.rating);
        }

        if (sets.length === 0) {
            return {
                success: false,
                message: 'Debes incluir al menos texto o rating para editar',
                code: 400,
            };
        }

        // 3. UPDATE dinámico
        const resultado = await db.execute(sql`
            UPDATE resenas
            SET
                texto = COALESCE(${datos.texto?.trim() ?? null}, texto),
                rating = COALESCE(${datos.rating ?? null}, rating),
                updated_at = NOW()
            WHERE id = ${resenaId}
              AND autor_id = ${autorId}
            RETURNING id::text, texto, rating, updated_at
        `);

        const row = resultado.rows[0] as Record<string, unknown>;

        // 4. Rating se actualiza automáticamente en negocio_sucursales vía trigger

        return {
            success: true,
            message: '¡Reseña actualizada!',
            data: {
                id: row.id as string,
                texto: row.texto as string | null,
                rating: row.rating as number | null,
                updatedAt: row.updated_at as string,
            },
        };

    } catch (error) {
        console.error('Error en editarResena:', error);
        return { success: false, message: 'Error al editar reseña', code: 500 };
    }
}