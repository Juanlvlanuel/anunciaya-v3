/**
 * ============================================================================
 * GUARDADOS SERVICE - Lógica de Negocio
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/guardados.service.ts
 *
 * PROPÓSITO:
 * Funciones para manejar guardados (ofertas y publicaciones de Servicios)
 * Sistema reutilizable para guardar contenido
 *
 * ENTITY TYPES SOPORTADOS:
 * - oferta (Ofertas/Cupones)
 * - servicio (publicaciones de la sección pública Servicios)
 *
 * DIFERENCIA CON VOTOS:
 * - Votos = Interacciones sociales públicas (like/follow de negocios)
 * - Guardados = Lista personal privada (guardar contenido para después)
 *
 * CAMBIOS EN ESTA VERSIÓN:
 * ✅ JOIN con tabla ofertas cuando entityType='oferta'
 * ✅ Retorna datos completos de la oferta
 * ✅ JOIN con negocio_sucursales para obtener whatsapp de la sucursal
 */

import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import {
    guardados,
    ofertas,
    negocioSucursales,
    negocios,
    articulosMarketplace,
} from '../db/schemas/schema';

// =============================================================================
// TIPOS
// =============================================================================

type EntityType = 'oferta' | 'servicio' | 'articulo_marketplace';

interface AgregarGuardadoParams {
    userId: string;
    entityType: EntityType;
    entityId: string;
}

// =============================================================================
// AGREGAR A GUARDADOS
// =============================================================================

/**
 * Agrega una entidad a guardados del usuario
 */
export async function agregarGuardado(params: AgregarGuardadoParams) {
    try {
        const { userId, entityType, entityId } = params;

        // Verificar si ya existe
        const [guardadoExistente] = await db
            .select()
            .from(guardados)
            .where(
                and(
                    eq(guardados.usuarioId, userId),
                    eq(guardados.entityType, entityType),
                    eq(guardados.entityId, entityId)
                )
            )
            .limit(1);

        if (guardadoExistente) {
            return {
                success: false,
                message: 'Ya está en guardados',
            };
        }

        // Crear nuevo guardado
        const [nuevoGuardado] = await db
            .insert(guardados)
            .values({
                usuarioId: userId,
                entityType,
                entityId,
            })
            .returning();

        // Incrementar el contador denormalizado del artículo de MarketPlace.
        // Las ofertas y servicios tienen sus propios contadores manejados
        // en otros services — solo articulo_marketplace requiere update aquí.
        if (entityType === 'articulo_marketplace') {
            await db
                .update(articulosMarketplace)
                .set({ totalGuardados: sql`${articulosMarketplace.totalGuardados} + 1` })
                .where(eq(articulosMarketplace.id, entityId));
        }

        return {
            success: true,
            message: '¡Guardado!',
            data: {
                id: nuevoGuardado.id,
                usuarioId: nuevoGuardado.usuarioId,
                entityType: nuevoGuardado.entityType,
                entityId: nuevoGuardado.entityId,
                createdAt: nuevoGuardado.createdAt,
            },
        };
    } catch (error) {
        console.error('Error al agregar a guardados:', error);
        throw error;
    }
}

// =============================================================================
// QUITAR DE GUARDADOS
// =============================================================================

/**
 * Quita una entidad de guardados del usuario
 */
export async function quitarGuardado(
    userId: string,
    entityType: EntityType,
    entityId: string
) {
    try {
        // Buscar el guardado
        const [guardadoExistente] = await db
            .select()
            .from(guardados)
            .where(
                and(
                    eq(guardados.usuarioId, userId),
                    eq(guardados.entityType, entityType),
                    eq(guardados.entityId, entityId)
                )
            )
            .limit(1);

        if (!guardadoExistente) {
            return {
                success: false,
                message: 'No está en guardados',
            };
        }

        // Eliminar guardado
        await db
            .delete(guardados)
            .where(eq(guardados.id, guardadoExistente.id));

        // Decrementar el contador denormalizado del artículo de MarketPlace.
        // GREATEST evita valores negativos si el contador queda desfasado.
        if (entityType === 'articulo_marketplace') {
            await db
                .update(articulosMarketplace)
                .set({
                    totalGuardados: sql`GREATEST(${articulosMarketplace.totalGuardados} - 1, 0)`,
                })
                .where(eq(articulosMarketplace.id, entityId));
        }

        return {
            success: true,
            message: 'Quitado de guardados',
        };
    } catch (error) {
        console.error('Error al quitar de guardados:', error);
        throw error;
    }
}

// =============================================================================
// VERIFICAR SI ESTÁ EN GUARDADOS
// =============================================================================

/**
 * Verifica si una entidad está en guardados del usuario
 */
export async function verificarGuardado(
    userId: string,
    entityType: EntityType,
    entityId: string
): Promise<boolean> {
    try {
        const [guardado] = await db
            .select()
            .from(guardados)
            .where(
                and(
                    eq(guardados.usuarioId, userId),
                    eq(guardados.entityType, entityType),
                    eq(guardados.entityId, entityId)
                )
            )
            .limit(1);

        return !!guardado;
    } catch (error) {
        console.error('Error al verificar guardado:', error);
        return false;
    }
}

// =============================================================================
// OBTENER GUARDADOS DEL USUARIO
// =============================================================================

/**
 * Obtiene la lista de entidades guardadas de un usuario
 * Filtrable por tipo de entidad
 * 
 * CAMBIO IMPORTANTE:
 * - Si entityType='oferta': Hace JOIN con ofertas y negocio_sucursales
 * - Retorna datos completos incluyendo whatsapp de la sucursal
 * - Si entityType='servicio' (Servicios): Retorna solo IDs (comportamiento anterior)
 */
export async function obtenerGuardados(
    userId: string,
    entityType?: EntityType,
    pagina: number = 1,
    limite: number = 20
) {
    try {
        const offset = (pagina - 1) * limite;

        // Construir condiciones
        const condiciones = [eq(guardados.usuarioId, userId)];

        if (entityType) {
            condiciones.push(eq(guardados.entityType, entityType));
        }

        // =====================================================================
        // CASO 1: entityType === 'oferta' → JOIN con negocio_sucursales
        // =====================================================================
        if (entityType === 'oferta') {
            // Obtener guardados con datos completos de ofertas + sucursal
            const guardadosConOfertas = await db
                .select({
                    // Datos del guardado
                    id: guardados.id,
                    entityType: guardados.entityType,
                    entityId: guardados.entityId,
                    createdAt: guardados.createdAt,
                    // Datos completos de la oferta
                    oferta: {
                        id: ofertas.id,
                        negocioId: ofertas.negocioId,
                        sucursalId: ofertas.sucursalId,
                        articuloId: ofertas.articuloId,
                        titulo: ofertas.titulo,
                        descripcion: ofertas.descripcion,
                        imagen: ofertas.imagen,
                        tipo: ofertas.tipo,
                        valor: ofertas.valor,
                        compraMinima: ofertas.compraMinima,
                        fechaInicio: ofertas.fechaInicio,
                        fechaFin: ofertas.fechaFin,
                        limiteUsos: ofertas.limiteUsos,
                        usosActuales: ofertas.usosActuales,
                        activo: ofertas.activo,
                        createdAt: ofertas.createdAt,
                        updatedAt: ofertas.updatedAt,
                    },
                    // ✅ NUEVO: Datos de la sucursal (whatsapp, nombre) + usuarioId para ChatYA
                    negocio: {
                        nombre: negocioSucursales.nombre,
                        whatsapp: negocioSucursales.whatsapp,
                        sucursalId: negocioSucursales.id,
                        usuarioId: negocios.usuarioId,
                    }
                })
                .from(guardados)
                .leftJoin(ofertas, eq(guardados.entityId, ofertas.id))
                .leftJoin(negocioSucursales, eq(ofertas.sucursalId, negocioSucursales.id))
                .leftJoin(negocios, eq(negocioSucursales.negocioId, negocios.id))
                .where(and(
                    ...condiciones,
                    eq(ofertas.activo, true),
                    sql`(${ofertas.fechaFin} IS NULL OR ${ofertas.fechaFin} >= CURRENT_DATE)`
                ))
                .orderBy(sql`${guardados.createdAt} DESC`)
                .limit(limite)
                .offset(offset);

            // Contar total
            const [{ count }] = await db
                .select({ count: sql<number>`count(*)` })
                .from(guardados)
                .where(and(...condiciones));

            const total = Number(count);
            const totalPaginas = Math.ceil(total / limite);

            return {
                success: true,
                data: {
                    guardados: guardadosConOfertas,
                    total,
                    pagina,
                    limite,
                    totalPaginas,
                },
            };
        }

        // =====================================================================
        // CASO 2: entityType === 'articulo_marketplace' → JOIN con MarketPlace
        // (Sprint 7 — tab "Artículos" en Mis Guardados)
        // =====================================================================
        else if (entityType === 'articulo_marketplace') {
            // SQL crudo para extraer ubicacion_aproximada con ST_Y/ST_X
            // (Drizzle no tiene tipo geography y la columna está como text).
            const offsetSql = (pagina - 1) * limite;
            const guardadosRaw = await db.execute(sql`
                SELECT
                    g.id,
                    g.entity_type AS "entityType",
                    g.entity_id AS "entityId",
                    g.created_at AS "createdAt",
                    a.id AS "articuloId",
                    a.usuario_id AS "articuloUsuarioId",
                    a.titulo AS "articuloTitulo",
                    a.descripcion AS "articuloDescripcion",
                    a.precio AS "articuloPrecio",
                    a.condicion AS "articuloCondicion",
                    a.acepta_ofertas AS "articuloAceptaOfertas",
                    a.fotos AS "articuloFotos",
                    a.foto_portada_index AS "articuloFotoPortadaIndex",
                    ST_Y(a.ubicacion_aproximada::geometry) AS "articuloLat",
                    ST_X(a.ubicacion_aproximada::geometry) AS "articuloLng",
                    a.ciudad AS "articuloCiudad",
                    a.zona_aproximada AS "articuloZonaAproximada",
                    a.estado AS "articuloEstado",
                    a.total_vistas AS "articuloTotalVistas",
                    a.total_mensajes AS "articuloTotalMensajes",
                    a.total_guardados AS "articuloTotalGuardados",
                    a.expira_at AS "articuloExpiraAt",
                    a.created_at AS "articuloCreatedAt",
                    a.updated_at AS "articuloUpdatedAt",
                    a.vendida_at AS "articuloVendidaAt"
                FROM guardados g
                INNER JOIN articulos_marketplace a ON a.id = g.entity_id
                WHERE g.usuario_id = ${userId}
                  AND g.entity_type = 'articulo_marketplace'
                  AND a.deleted_at IS NULL
                ORDER BY g.created_at DESC
                LIMIT ${limite}
                OFFSET ${offsetSql}
            `);

            interface RawRow {
                id: string;
                entityType: string;
                entityId: string;
                createdAt: string;
                articuloId: string;
                articuloUsuarioId: string;
                articuloTitulo: string;
                articuloDescripcion: string;
                articuloPrecio: string;
                articuloCondicion: string;
                articuloAceptaOfertas: boolean;
                articuloFotos: string[];
                articuloFotoPortadaIndex: number;
                articuloLat: number;
                articuloLng: number;
                articuloCiudad: string;
                articuloZonaAproximada: string;
                articuloEstado: string;
                articuloTotalVistas: number;
                articuloTotalMensajes: number;
                articuloTotalGuardados: number;
                articuloExpiraAt: string;
                articuloCreatedAt: string;
                articuloUpdatedAt: string;
                articuloVendidaAt: string | null;
            }

            const guardadosConArticulo = (guardadosRaw.rows as unknown as RawRow[]).map(
                (r) => ({
                    id: r.id,
                    entityType: r.entityType,
                    entityId: r.entityId,
                    createdAt: r.createdAt,
                    articulo: {
                        id: r.articuloId,
                        usuarioId: r.articuloUsuarioId,
                        titulo: r.articuloTitulo,
                        descripcion: r.articuloDescripcion,
                        precio: r.articuloPrecio,
                        condicion: r.articuloCondicion,
                        aceptaOfertas: r.articuloAceptaOfertas,
                        fotos: r.articuloFotos,
                        fotoPortadaIndex: r.articuloFotoPortadaIndex,
                        ubicacionAproximada: { lat: r.articuloLat, lng: r.articuloLng },
                        ciudad: r.articuloCiudad,
                        zonaAproximada: r.articuloZonaAproximada,
                        estado: r.articuloEstado,
                        totalVistas: r.articuloTotalVistas,
                        totalMensajes: r.articuloTotalMensajes,
                        totalGuardados: r.articuloTotalGuardados,
                        expiraAt: r.articuloExpiraAt,
                        createdAt: r.articuloCreatedAt,
                        updatedAt: r.articuloUpdatedAt,
                        vendidaAt: r.articuloVendidaAt,
                    },
                })
            );

            // Total
            const [{ count }] = await db
                .select({ count: sql<number>`count(*)` })
                .from(guardados)
                .innerJoin(articulosMarketplace, eq(articulosMarketplace.id, guardados.entityId))
                .where(
                    and(
                        eq(guardados.usuarioId, userId),
                        eq(guardados.entityType, 'articulo_marketplace'),
                        sql`${articulosMarketplace.deletedAt} IS NULL`
                    )
                );
            const total = Number(count);
            const totalPaginas = Math.ceil(total / limite);

            return {
                success: true,
                data: {
                    guardados: guardadosConArticulo,
                    total,
                    pagina,
                    limite,
                    totalPaginas,
                },
            };
        }

        // =====================================================================
        // CASO 3: entityType === 'servicio' (Servicios) → Solo IDs
        // =====================================================================
        else {
            // Obtener guardados (comportamiento original)
            const guardadosRaw = await db
                .select({
                    id: guardados.id,
                    entityType: guardados.entityType,
                    entityId: guardados.entityId,
                    createdAt: guardados.createdAt,
                })
                .from(guardados)
                .where(and(...condiciones))
                .orderBy(sql`${guardados.createdAt} DESC`)
                .limit(limite)
                .offset(offset);

            // Contar total
            const [{ count }] = await db
                .select({ count: sql<number>`count(*)` })
                .from(guardados)
                .where(and(...condiciones));

            const total = Number(count);
            const totalPaginas = Math.ceil(total / limite);

            return {
                success: true,
                data: {
                    guardados: guardadosRaw,
                    total,
                    pagina,
                    limite,
                    totalPaginas,
                },
            };
        }
    } catch (error) {
        console.error('Error al obtener guardados:', error);
        throw error;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    agregarGuardado,
    quitarGuardado,
    verificarGuardado,
    obtenerGuardados,
};