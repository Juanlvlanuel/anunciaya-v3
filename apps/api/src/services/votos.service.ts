/**
 * ============================================================================
 * VOTOS SERVICE - Lógica de Negocio
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/services/votos.service.ts
 * 
 * PROPÓSITO:
 * Funciones para manejar likes y follows (seguir)
 * Sistema reutilizable para todas las secciones de AnunciaYA
 * 
 * ENTITY TYPES SOPORTADOS:
 * - sucursal (Directorio de negocios)
 * - articulo (Productos/Servicios)
 * - publicacion (Marketplace)
 * - oferta (Ofertas/Cupones)
 * - rifa (Dinámicas - Rifas/Sorteos)
 * - subasta (Dinámicas - Subastas)
 * - empleo (Empleos/Servicios)
 * 
 * VOTANTE:
 * - Si votanteSucursalId es NULL → Usuario votó como persona
 * - Si votanteSucursalId tiene valor → Usuario votó como negocio/sucursal
 */

import { eq, and, isNull, sql } from 'drizzle-orm';
import { db } from '../db';
import { votos } from '../db/schemas/schema';

// =============================================================================
// TIPOS
// =============================================================================

type EntityType = 'sucursal' | 'articulo' | 'publicacion' | 'oferta' | 'rifa' | 'subasta' | 'empleo';
type TipoAccion = 'like' | 'follow';

interface CrearVotoParams {
    userId: string;
    entityType: EntityType;
    entityId: string;
    tipoAccion: TipoAccion;
    votanteSucursalId?: string | null; // Si votó como negocio
}

// =============================================================================
// CREAR VOTO (Like o Follow)
// =============================================================================

/**
 * Crea un voto (like o follow)
 * El trigger SQL actualiza automáticamente la tabla metricas_entidad
 */
export async function crearVoto(params: CrearVotoParams) {
    try {
        const { userId, entityType, entityId, tipoAccion, votanteSucursalId } = params;

        // Verificar si ya existe el voto (considerando votanteSucursalId)
        // Un usuario puede votar como persona (null) Y como negocio (uuid)
        const votoExistenteQuery = votanteSucursalId
            ? db
                .select()
                .from(votos)
                .where(
                    and(
                        eq(votos.userId, userId),
                        eq(votos.entityType, entityType),
                        eq(votos.entityId, entityId),
                        eq(votos.tipoAccion, tipoAccion),
                        eq(votos.votanteSucursalId, votanteSucursalId)
                    )
                )
                .limit(1)
            : db
                .select()
                .from(votos)
                .where(
                    and(
                        eq(votos.userId, userId),
                        eq(votos.entityType, entityType),
                        eq(votos.entityId, entityId),
                        eq(votos.tipoAccion, tipoAccion),
                        isNull(votos.votanteSucursalId)
                    )
                )
                .limit(1);

        const [votoExistente] = await votoExistenteQuery;

        if (votoExistente) {
            return {
                success: false,
                message: tipoAccion === 'like' 
                    ? 'Ya diste like a esta entidad' 
                    : 'Ya sigues esta entidad',
            };
        }

        // Crear nuevo voto
        const [nuevoVoto] = await db
            .insert(votos)
            .values({
                userId,
                entityType,
                entityId,
                tipoAccion,
                votanteSucursalId: votanteSucursalId || null,
            })
            .returning();

        return {
            success: true,
            message: tipoAccion === 'like' 
                ? 'Like registrado correctamente' 
                : '¡Siguiendo!',
            data: {
                id: nuevoVoto.id.toString(),
                userId: nuevoVoto.userId,
                entityType: nuevoVoto.entityType,
                entityId: nuevoVoto.entityId,
                tipoAccion: nuevoVoto.tipoAccion,
                votanteSucursalId: nuevoVoto.votanteSucursalId,
                createdAt: nuevoVoto.createdAt,
            },
        };
    } catch (error) {
        console.error('Error al crear voto:', error);
        throw error;
    }
}

// =============================================================================
// ELIMINAR VOTO (Quitar Like o Follow)
// =============================================================================

/**
 * Elimina un voto (quita like o follow)
 * El trigger SQL actualiza automáticamente la tabla metricas_entidad
 */
export async function eliminarVoto(
    userId: string,
    entityType: EntityType,
    entityId: string,
    tipoAccion: TipoAccion,
    votanteSucursalId?: string | null
) {
    try {
        // Buscar el voto (considerando votanteSucursalId)
        const votoExistenteQuery = votanteSucursalId
            ? db
                .select()
                .from(votos)
                .where(
                    and(
                        eq(votos.userId, userId),
                        eq(votos.entityType, entityType),
                        eq(votos.entityId, entityId),
                        eq(votos.tipoAccion, tipoAccion),
                        eq(votos.votanteSucursalId, votanteSucursalId)
                    )
                )
                .limit(1)
            : db
                .select()
                .from(votos)
                .where(
                    and(
                        eq(votos.userId, userId),
                        eq(votos.entityType, entityType),
                        eq(votos.entityId, entityId),
                        eq(votos.tipoAccion, tipoAccion),
                        isNull(votos.votanteSucursalId)
                    )
                )
                .limit(1);

        const [votoExistente] = await votoExistenteQuery;

        if (!votoExistente) {
            return {
                success: false,
                message: tipoAccion === 'like' 
                    ? 'No has dado like a esta entidad' 
                    : 'No sigues esta entidad',
            };
        }

        // Eliminar voto
        await db
            .delete(votos)
            .where(eq(votos.id, votoExistente.id));

        return {
            success: true,
            message: tipoAccion === 'like' 
                ? 'Like eliminado correctamente' 
                : 'Dejaste de seguir',
        };
    } catch (error) {
        console.error('Error al eliminar voto:', error);
        throw error;
    }
}

// =============================================================================
// VERIFICAR SI USUARIO DIO VOTO
// =============================================================================

/**
 * Verifica si un usuario ya dio like o siguió una entidad
 * Considera votanteSucursalId para distinguir votos personales vs comerciales
 */
export async function verificarVoto(
    userId: string,
    entityType: EntityType,
    entityId: string,
    tipoAccion: TipoAccion,
    votanteSucursalId?: string | null
): Promise<boolean> {
    try {
        const votoQuery = votanteSucursalId
            ? db
                .select()
                .from(votos)
                .where(
                    and(
                        eq(votos.userId, userId),
                        eq(votos.entityType, entityType),
                        eq(votos.entityId, entityId),
                        eq(votos.tipoAccion, tipoAccion),
                        eq(votos.votanteSucursalId, votanteSucursalId)
                    )
                )
                .limit(1)
            : db
                .select()
                .from(votos)
                .where(
                    and(
                        eq(votos.userId, userId),
                        eq(votos.entityType, entityType),
                        eq(votos.entityId, entityId),
                        eq(votos.tipoAccion, tipoAccion),
                        isNull(votos.votanteSucursalId)
                    )
                )
                .limit(1);

        const [voto] = await votoQuery;

        return !!voto;
    } catch (error) {
        console.error('Error al verificar voto:', error);
        return false;
    }
}

// =============================================================================
// OBTENER SEGUIDOS DEL USUARIO
// =============================================================================

/**
 * Obtiene la lista de entidades seguidas de un usuario
 * Filtrable por tipo de entidad y por modo (personal o comercial)
 * 
 * MEJORA: Cuando entityType='sucursal', hace JOIN completo con datos del negocio
 */
export async function obtenerSeguidos(
    userId: string,
    entityType?: EntityType,
    pagina: number = 1,
    limite: number = 20,
    votanteSucursalId?: string | null,
    latitud?: number,
    longitud?: number
) {
    try {
        const offset = (pagina - 1) * limite;

        // Construir condiciones base
        const condiciones = [
            eq(votos.userId, userId),
            eq(votos.tipoAccion, 'follow'),
        ];

        if (entityType) {
            condiciones.push(eq(votos.entityType, entityType));
        }

        // Agregar condición de votanteSucursalId
        // - Si votanteSucursalId tiene valor UUID → Filtrar por ese UUID (modo comercial específico)
        // - Si votanteSucursalId es null → Filtrar solo personales (votante_sucursal_id IS NULL)
        // - Si votanteSucursalId es undefined → NO filtrar (traer TODOS: personales + comerciales)
        if (votanteSucursalId !== undefined) {
            if (votanteSucursalId) {
                condiciones.push(eq(votos.votanteSucursalId, votanteSucursalId));
            } else {
                condiciones.push(isNull(votos.votanteSucursalId));
            }
        }
        // Si es undefined, no agregamos ninguna condición = traer todos

        // =====================================================================
        // CASO 1: entityType === 'sucursal' → JOIN completo con datos
        // =====================================================================
        if (entityType === 'sucursal') {
            // Query SQL raw para JOIN completo
            const query = sql`
                SELECT 
                    v.id as voto_id,
                    v.entity_id as sucursal_id,
                    v.votante_sucursal_id,
                    v.created_at as seguido_desde,
                    n.id as negocio_id,
                    n.nombre as nombre,
                    s.nombre as sucursal_nombre,
                    s.direccion,
                    s.ciudad,
                    s.telefono,
                    s.whatsapp,
                    s.tiene_envio_domicilio,
                    s.activa,
                    n.logo_url as imagen_perfil,
                    -- Galería (array de imágenes)
                    COALESCE(
                        json_agg(
                            jsonb_build_object(
                                'url', g.url,
                                'titulo', g.titulo,
                                'orden', g.orden
                            ) ORDER BY g.orden
                        ) FILTER (WHERE g.id IS NOT NULL),
                        '[]'::json
                    ) as galeria,
                    -- Subcategorías (array de subcategorías)
                    COALESCE(
                        json_agg(
                            DISTINCT jsonb_build_object(
                                'id', sc.id,
                                'nombre', sc.nombre
                            )
                        ) FILTER (WHERE sc.id IS NOT NULL),
                        '[]'::json
                    ) as subcategorias,
                    -- Métricas
                    COALESCE(m.total_likes, 0) as total_likes,
                    COALESCE(m.total_views, 0) as total_visitas,
                    -- Calificaciones
                    COALESCE(m.promedio_rating, 0) as calificacion_promedio,
                    COALESCE(m.total_resenas, 0) as total_calificaciones,
                    -- Estado abierto/cerrado (calcula según horarios)
                    (
                        SELECT 
                            CASE 
                                WHEN nh.abierto = false THEN false
                                WHEN nh.hora_cierre < nh.hora_apertura THEN 
                                    -- Horario que cruza medianoche (ej: 22:00 - 02:00)
                                    (CURRENT_TIME AT TIME ZONE s.zona_horaria)::time >= nh.hora_apertura 
                                    OR (CURRENT_TIME AT TIME ZONE s.zona_horaria)::time <= nh.hora_cierre
                                ELSE 
                                    -- Horario normal
                                    (CURRENT_TIME AT TIME ZONE s.zona_horaria)::time 
                                    BETWEEN nh.hora_apertura AND nh.hora_cierre
                            END
                        FROM negocio_horarios nh
                        WHERE nh.sucursal_id = s.id
                        AND nh.dia_semana = EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE s.zona_horaria))::INTEGER
                        LIMIT 1
                    ) as esta_abierto,
                    -- Estado de like del usuario actual
                    EXISTS(
                        SELECT 1 FROM votos v2
                        WHERE v2.user_id = ${userId}
                        AND v2.entity_type = 'sucursal'
                        AND v2.entity_id = v.entity_id
                        AND v2.tipo_accion = 'like'
                        ${votanteSucursalId !== undefined
                            ? (votanteSucursalId 
                                ? sql`AND v2.votante_sucursal_id = ${votanteSucursalId}`
                                : sql`AND v2.votante_sucursal_id IS NULL`)
                            : sql`` // Sin filtro = buscar like en CUALQUIER modo
                        }
                    ) as liked,
                    -- Distancia (si se proporcionan coordenadas)
                    ${latitud && longitud 
                        ? sql`
                            CASE 
                                WHEN s.ubicacion IS NOT NULL THEN
                                    ST_Distance(
                                        s.ubicacion::geography,
                                        ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography
                                    ) / 1000
                                ELSE NULL
                            END as distancia_km
                        `
                        : sql`NULL as distancia_km`
                    }
                FROM votos v
                INNER JOIN negocio_sucursales s ON v.entity_id = s.id
                INNER JOIN negocios n ON s.negocio_id = n.id
                LEFT JOIN negocio_galeria g ON g.sucursal_id = s.id
                LEFT JOIN metricas_entidad m ON m.entity_type = 'sucursal' AND m.entity_id = s.id
                LEFT JOIN asignacion_subcategorias asub ON asub.negocio_id = n.id
                LEFT JOIN subcategorias_negocio sc ON sc.id = asub.subcategoria_id
                WHERE v.user_id = ${userId}
                AND v.tipo_accion = 'follow'
                AND v.entity_type = 'sucursal'
                ${votanteSucursalId !== undefined
                    ? (votanteSucursalId 
                        ? sql`AND v.votante_sucursal_id = ${votanteSucursalId}`
                        : sql`AND v.votante_sucursal_id IS NULL`)
                    : sql`` // Sin filtro = traer TODOS
                }
                GROUP BY 
                    v.id, v.entity_id, v.votante_sucursal_id, v.created_at,
                    n.id, n.nombre, n.logo_url,
                    s.id, s.nombre, s.direccion, s.ciudad, s.telefono, s.whatsapp,
                    s.tiene_envio_domicilio, s.activa, s.ubicacion, s.zona_horaria,
                    m.total_likes, m.total_views, m.promedio_rating, m.total_resenas
                ORDER BY v.created_at DESC
                LIMIT ${limite}
                OFFSET ${offset}
            `;

            const resultado = await db.execute(query);
            
            // Convertir resultado a formato esperado
            const seguidos = resultado.rows.map((row: any) => ({
                id: row.voto_id.toString(),
                sucursalId: row.sucursal_id,
                votanteSucursalId: row.votante_sucursal_id, // Para saber cómo eliminar
                nombre: row.nombre,
                categoria: row.subcategorias?.[0]?.nombre || 'Negocios',
                imagen_perfil: row.imagen_perfil,
                galeria: row.galeria || [],
                estaAbierto: row.esta_abierto, // Calculado desde horarios
                distanciaKm: row.distancia_km,
                calificacionPromedio: row.calificacion_promedio?.toString(),
                totalCalificaciones: Number(row.total_calificaciones) || 0,
                whatsapp: row.whatsapp,
                liked: row.liked,
            }));

            // Contar total
            const countQuery = sql`
                SELECT COUNT(*) as total
                FROM votos v
                WHERE v.user_id = ${userId}
                AND v.tipo_accion = 'follow'
                AND v.entity_type = 'sucursal'
                ${votanteSucursalId !== undefined
                    ? (votanteSucursalId 
                        ? sql`AND v.votante_sucursal_id = ${votanteSucursalId}`
                        : sql`AND v.votante_sucursal_id IS NULL`)
                    : sql`` // Sin filtro = traer TODOS
                }
            `;

            const countResult = await db.execute(countQuery);
            const total = Number(countResult.rows[0]?.total) || 0;
            const totalPaginas = Math.ceil(total / limite);

            return {
                success: true,
                data: {
                    seguidos,
                    total,
                    pagina,
                    limite,
                    totalPaginas,
                },
            };
        }

        // =====================================================================
        // CASO 2: Otros entityTypes → Comportamiento original (solo IDs)
        // =====================================================================
        else {
            // Obtener seguidos (comportamiento original)
            const seguidosRaw = await db
                .select({
                    id: votos.id,
                    entityType: votos.entityType,
                    entityId: votos.entityId,
                    createdAt: votos.createdAt,
                })
                .from(votos)
                .where(and(...condiciones))
                .orderBy(votos.createdAt)
                .limit(limite)
                .offset(offset);

            // Convertir BigInt a string
            const seguidos = seguidosRaw.map(seg => ({
                id: seg.id.toString(),
                entityType: seg.entityType,
                entityId: seg.entityId,
                createdAt: seg.createdAt,
            }));

            // Contar total
            const [{ count }] = await db
                .select({ count: votos.id })
                .from(votos)
                .where(and(...condiciones));

            const total = Number(count);
            const totalPaginas = Math.ceil(total / limite);

            return {
                success: true,
                data: {
                    seguidos,
                    total,
                    pagina,
                    limite,
                    totalPaginas,
                },
            };
        }
    } catch (error) {
        console.error('Error al obtener seguidos:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER CONTADORES DE UNA ENTIDAD
// =============================================================================

/**
 * Obtiene los contadores de likes y follows de una entidad específica
 */
export async function obtenerContadoresVotos(
    entityType: EntityType,
    entityId: string
) {
    try {
        // Contar likes
        const [{ likesCount }] = await db
            .select({ likesCount: votos.id })
            .from(votos)
            .where(
                and(
                    eq(votos.entityType, entityType),
                    eq(votos.entityId, entityId),
                    eq(votos.tipoAccion, 'like')
                )
            );

        // Contar follows
        const [{ followsCount }] = await db
            .select({ followsCount: votos.id })
            .from(votos)
            .where(
                and(
                    eq(votos.entityType, entityType),
                    eq(votos.entityId, entityId),
                    eq(votos.tipoAccion, 'follow')
                )
            );

        return {
            success: true,
            data: {
                totalLikes: Number(likesCount) || 0,
                totalFollows: Number(followsCount) || 0,
            },
        };
    } catch (error) {
        console.error('Error al obtener contadores:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER VOTOS DE MÚLTIPLES ENTIDADES PARA UN USUARIO
// =============================================================================

/**
 * Obtiene el estado de votos (liked/followed) para múltiples entidades
 * Útil para mostrar correctamente los botones en listas
 */
export async function obtenerVotosMultiples(
    userId: string,
    entityType: EntityType,
    entityIds: string[]
) {
    try {
        if (entityIds.length === 0) {
            return {
                success: true,
                data: {},
            };
        }

        // Obtener todos los votos del usuario para estas entidades
        const votosUsuario = await db
            .select({
                entityId: votos.entityId,
                tipoAccion: votos.tipoAccion,
            })
            .from(votos)
            .where(
                and(
                    eq(votos.userId, userId),
                    eq(votos.entityType, entityType),
                    // entityIds como array
                )
            );

        // Estructurar respuesta
        const resultado: Record<string, { liked: boolean; followed: boolean }> = {};

        entityIds.forEach(id => {
            resultado[id] = { liked: false, followed: false };
        });

        votosUsuario.forEach(voto => {
            if (voto.tipoAccion === 'like') {
                resultado[voto.entityId].liked = true;
            } else if (voto.tipoAccion === 'follow') {
                resultado[voto.entityId].followed = true;
            }
        });

        return {
            success: true,
            data: resultado,
        };
    } catch (error) {
        console.error('Error al obtener votos múltiples:', error);
        throw error;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    crearVoto,
    eliminarVoto,
    verificarVoto,
    obtenerSeguidos,
    obtenerContadoresVotos,
    obtenerVotosMultiples,
};