/**
 * ============================================================================
 * MÉTRICAS SERVICE - Lógica de Negocio
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/services/metricas.service.ts
 * 
 * PROPÓSITO:
 * Funciones para registrar métricas de vistas, compartidos, clicks y mensajes
 * Utiliza las funciones SQL creadas en los triggers
 * 
 * MÉTRICAS SOPORTADAS:
 * - Views: Vistas del perfil/detalle
 * - Shares: Compartidos en redes sociales o WhatsApp
 * - Clicks: Clicks en enlaces (teléfono, sitio web, etc)
 * - Messages: Mensajes enviados vía ChatYA
 */

import { sql } from 'drizzle-orm';
import { db } from '../db';

// =============================================================================
// TIPOS
// =============================================================================

type EntityType = 'sucursal' | 'articulo' | 'publicacion' | 'oferta' | 'rifa' | 'subasta';

// =============================================================================
// REGISTRAR VISTA
// =============================================================================

/**
 * Registra una vista de una entidad
 * Llama a la función SQL registrar_view() que actualiza metricas_entidad
 */
export async function registrarView(
    entityType: EntityType,
    entityId: string
) {
    try {
        await db.execute(
            sql`SELECT registrar_view(${entityType}, ${entityId})`
        );

        return {
            success: true,
            message: 'Vista registrada',
        };
    } catch (error) {
        console.error('Error al registrar vista:', error);
        throw error;
    }
}

// =============================================================================
// REGISTRAR COMPARTIDO
// =============================================================================

/**
 * Registra un compartido (share) de una entidad
 * Llama a la función SQL registrar_share() que actualiza metricas_entidad
 */
export async function registrarShare(
    entityType: EntityType,
    entityId: string
) {
    try {
        await db.execute(
            sql`SELECT registrar_share(${entityType}, ${entityId})`
        );

        return {
            success: true,
            message: 'Compartido registrado',
        };
    } catch (error) {
        console.error('Error al registrar compartido:', error);
        throw error;
    }
}

// =============================================================================
// REGISTRAR CLICK
// =============================================================================

/**
 * Registra un click en un enlace de una entidad
 * Llama a la función SQL registrar_click() que actualiza metricas_entidad
 * 
 * Ejemplos de uso:
 * - Click en botón "Llamar" (teléfono)
 * - Click en botón "Visitar sitio web"
 * - Click en botón "Ver ubicación"
 * - etc.
 */
export async function registrarClick(
    entityType: EntityType,
    entityId: string
) {
    try {
        await db.execute(
            sql`SELECT registrar_click(${entityType}, ${entityId})`
        );

        return {
            success: true,
            message: 'Click registrado',
        };
    } catch (error) {
        console.error('Error al registrar click:', error);
        throw error;
    }
}

// =============================================================================
// REGISTRAR MENSAJE
// =============================================================================

/**
 * Registra un mensaje enviado a una entidad
 * Llama a la función SQL registrar_message() que actualiza metricas_entidad
 * 
 * Se debe llamar cuando:
 * - Usuario envía mensaje vía ChatYA a un negocio
 * - Usuario contacta a vendedor de publicación
 * - etc.
 */
export async function registrarMessage(
    entityType: EntityType,
    entityId: string
) {
    try {
        await db.execute(
            sql`SELECT registrar_message(${entityType}, ${entityId})`
        );

        return {
            success: true,
            message: 'Mensaje registrado',
        };
    } catch (error) {
        console.error('Error al registrar mensaje:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER MÉTRICAS DE UNA ENTIDAD
// =============================================================================

/**
 * Obtiene todas las métricas de una entidad específica
 */
export async function obtenerMetricas(
    entityType: EntityType,
    entityId: string
) {
    try {
        const resultado = await db.execute(
            sql`
                SELECT 
                    total_likes,
                    total_saves,
                    total_views,
                    total_shares,
                    total_clicks,
                    total_messages,
                    total_ratings,
                    promedio_rating,
                    total_resenas,
                    updated_at
                FROM metricas_entidad
                WHERE entity_type = ${entityType}
                  AND entity_id = ${entityId}
                LIMIT 1
            `
        );

        if (resultado.rows.length === 0) {
            // No hay métricas aún, retornar valores en 0
            return {
                success: true,
                data: {
                    totalLikes: 0,
                    totalSaves: 0,
                    totalViews: 0,
                    totalShares: 0,
                    totalClicks: 0,
                    totalMessages: 0,
                    totalRatings: 0,
                    promedioRating: 0,
                    totalResenas: 0,
                    updatedAt: null,
                },
            };
        }

        const metricas = resultado.rows[0];

        return {
            success: true,
            data: {
                totalLikes: Number(metricas.total_likes) || 0,
                totalSaves: Number(metricas.total_saves) || 0,
                totalViews: Number(metricas.total_views) || 0,
                totalShares: Number(metricas.total_shares) || 0,
                totalClicks: Number(metricas.total_clicks) || 0,
                totalMessages: Number(metricas.total_messages) || 0,
                totalRatings: Number(metricas.total_ratings) || 0,
                promedioRating: Number(metricas.promedio_rating) || 0,
                totalResenas: Number(metricas.total_resenas) || 0,
                updatedAt: metricas.updated_at,
            },
        };
    } catch (error) {
        console.error('Error al obtener métricas:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER MÉTRICAS DE MÚLTIPLES ENTIDADES
// =============================================================================

/**
 * Obtiene métricas de múltiples entidades del mismo tipo
 * Útil para mostrar contadores en listas
 */
export async function obtenerMetricasMultiples(
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

        const resultado = await db.execute(
            sql`
                SELECT 
                    entity_id,
                    total_likes,
                    total_saves,
                    total_views,
                    total_shares
                FROM metricas_entidad
                WHERE entity_type = ${entityType}
                  AND entity_id = ANY(${entityIds})
            `
        );

        // Estructurar respuesta
        const metricas: Record<string, any> = {};

        // Inicializar todos en 0
        entityIds.forEach(id => {
            metricas[id] = {
                totalLikes: 0,
                totalSaves: 0,
                totalViews: 0,
                totalShares: 0,
            };
        });

        // Sobrescribir con datos reales
        resultado.rows.forEach((row: any) => {
            metricas[row.entity_id] = {
                totalLikes: Number(row.total_likes) || 0,
                totalSaves: Number(row.total_saves) || 0,
                totalViews: Number(row.total_views) || 0,
                totalShares: Number(row.total_shares) || 0,
            };
        });

        return {
            success: true,
            data: metricas,
        };
    } catch (error) {
        console.error('Error al obtener métricas múltiples:', error);
        throw error;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    registrarView,
    registrarShare,
    registrarClick,
    registrarMessage,
    obtenerMetricas,
    obtenerMetricasMultiples,
};