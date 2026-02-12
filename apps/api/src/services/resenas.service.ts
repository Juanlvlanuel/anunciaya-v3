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
import type { CrearResenaInput } from '../validations/resenas.schema.js';

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
                ) as autor
            FROM resenas r
            INNER JOIN usuarios u ON u.id = r.autor_id
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
              AND negocio_id = ${sucursal.negocioId}
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

        // 4. Actualizar métricas de la sucursal (total_resenas + promedio_rating)
        await db.execute(sql`
            INSERT INTO metricas_entidad (entity_type, entity_id, total_resenas, promedio_rating, updated_at)
            VALUES (
                'sucursal', ${datos.sucursalId},
                (SELECT COUNT(*)::int FROM resenas WHERE sucursal_id = ${datos.sucursalId}),
                (SELECT COALESCE(AVG(rating), 0) FROM resenas WHERE sucursal_id = ${datos.sucursalId} AND rating IS NOT NULL),
                NOW()
            )
            ON CONFLICT (entity_type, entity_id) DO UPDATE SET
                total_resenas = (SELECT COUNT(*)::int FROM resenas WHERE sucursal_id = ${datos.sucursalId}),
                promedio_rating = (
                    SELECT COALESCE(AVG(rating), 0)
                    FROM resenas
                    WHERE sucursal_id = ${datos.sucursalId}
                      AND rating IS NOT NULL
                ),
                updated_at = NOW()
        `);

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