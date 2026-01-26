/**
 * ============================================================================
 * GUARDADOS SERVICE - Lógica de Negocio
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/services/guardados.service.ts
 * 
 * PROPÓSITO:
 * Funciones para manejar guardados (ofertas, rifas, empleos)
 * Sistema reutilizable para guardar contenido
 * 
 * ENTITY TYPES SOPORTADOS:
 * - oferta (Ofertas/Cupones)
 * - rifa (Dinámicas - Rifas/Sorteos)
 * - empleo (Empleos/Servicios)
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
import { guardados, ofertas, negocioSucursales } from '../db/schemas/schema';

// =============================================================================
// TIPOS
// =============================================================================

type EntityType = 'oferta' | 'rifa' | 'empleo';

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
 * - Si entityType='rifa' o 'empleo': Retorna solo IDs (comportamiento anterior)
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
                    // ✅ NUEVO: Datos de la sucursal (whatsapp, nombre)
                    negocio: {
                        nombre: negocioSucursales.nombre,
                        whatsapp: negocioSucursales.whatsapp,
                        sucursalId: negocioSucursales.id,
                    }
                })
                .from(guardados)
                .leftJoin(ofertas, eq(guardados.entityId, ofertas.id))
                .leftJoin(negocioSucursales, eq(ofertas.sucursalId, negocioSucursales.id))
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
                    guardados: guardadosConOfertas,
                    total,
                    pagina,
                    limite,
                    totalPaginas,
                },
            };
        }

        // =====================================================================
        // CASO 2: entityType === 'rifa' o 'empleo' → Solo IDs
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