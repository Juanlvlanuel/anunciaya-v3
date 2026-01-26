/**
 * ============================================================================
 * RESEÑAS SERVICE - Obtener Reseñas de Sucursales
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/services/resenas.service.ts
 * 
 * PROPÓSITO:
 * Obtener las reseñas de una sucursal específica con datos del autor
 * 
 * CREADO: Fase 5.3 - Sistema de Reseñas
 */

import { sql } from 'drizzle-orm';
import { db } from '../db';

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

// =============================================================================
// OBTENER RESEÑAS DE UNA SUCURSAL
// =============================================================================

/**
 * Obtiene todas las reseñas de una sucursal con datos del autor
 * 
 * - Ordenadas por fecha (más recientes primero)
 * - Incluye nombre y foto del autor
 * - Solo reseñas de tipo cliente → negocio
 * 
 * @param sucursalId - UUID de la sucursal
 * @returns Lista de reseñas con datos del autor
 */
export async function obtenerResenasSucursal(sucursalId: string) {
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

        // Mapear resultados
        const resenas: ResenaConAutor[] = resultado.rows.map((row: any) => ({
            id: row.id,
            rating: row.rating,
            texto: row.texto,
            createdAt: row.created_at,
            autor: row.autor,
        }));

        return {
            success: true,
            data: resenas,
        };
    } catch (error) {
        console.error('Error al obtener reseñas:', error);
        throw error;
    }
}

/**
 * Obtiene el promedio de calificación de una sucursal
 * 
 * @param sucursalId - UUID de la sucursal
 * @returns Promedio y total de reseñas
 */
export async function obtenerPromedioResenas(sucursalId: string) {
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
        const row = resultado.rows[0] as any;

        return {
            success: true,
            data: {
                promedio: parseFloat(row.promedio) || 0,
                total: row.total || 0,
            },
        };
    } catch (error) {
        console.error('Error al obtener promedio de reseñas:', error);
        throw error;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    obtenerResenasSucursal,
    obtenerPromedioResenas,
};