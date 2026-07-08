/**
 * admin/categorias-marketplace.service.ts
 * ========================================
 * LECTURA del catálogo de categorías de MarketPlace para el Panel Admin
 * (incluye inactivas). Devuelve, por categoría, el CONTEO de publicaciones
 * ACTIVAS desglosado por modo (Vendo/Busco) — analítica de oferta vs demanda.
 * Opcionalmente filtrado por ciudad.
 *
 * Las acciones de escritura viven en `categorias-marketplace-acciones.service.ts`.
 *
 * Ubicación: apps/api/src/services/admin/categorias-marketplace.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';

export interface CategoriaMarketplaceAdmin {
    id: number;
    nombre: string;
    orden: number;
    activa: boolean;
    /** Publicaciones activas EN VENTA de esta categoría (en la ciudad si se filtró). */
    totalVendo: number;
    /** Publicaciones activas de BÚSQUEDA (demanda) de esta categoría. */
    totalBusco: number;
}

/**
 * @param ciudadId - Si se pasa, los conteos se limitan a esa ciudad. Sin él,
 *   cuenta todas las ciudades. El filtro va en el ON del LEFT JOIN para no
 *   perder categorías con 0 publicaciones en la ciudad.
 */
export async function listarCatalogo(
    ciudadId?: string,
): Promise<CategoriaMarketplaceAdmin[]> {
    const filtroCiudad = ciudadId ? sql`AND a.ciudad_id = ${ciudadId}` : sql``;

    const resultado = await db.execute(sql`
        SELECT
            c.id, c.nombre, c.orden, c.activa,
            COALESCE(SUM(CASE WHEN a.modo = 'vendo' THEN 1 ELSE 0 END), 0)::int AS total_vendo,
            COALESCE(SUM(CASE WHEN a.modo = 'busco' THEN 1 ELSE 0 END), 0)::int AS total_busco
        FROM categorias_marketplace c
        LEFT JOIN articulos_marketplace a
            ON a.categoria_id = c.id
            AND a.estado = 'activa'
            AND a.deleted_at IS NULL
            ${filtroCiudad}
        GROUP BY c.id, c.nombre, c.orden, c.activa
        ORDER BY c.orden ASC, c.nombre ASC
    `);

    return (resultado.rows as Array<{
        id: number;
        nombre: string;
        orden: number;
        activa: boolean;
        total_vendo: number;
        total_busco: number;
    }>).map((r) => ({
        id: r.id,
        nombre: r.nombre,
        orden: r.orden,
        activa: r.activa,
        totalVendo: r.total_vendo,
        totalBusco: r.total_busco,
    }));
}

/**
 * Publicaciones activas DISTINTAS por ciudad, para el badge del dropdown (independiente del filtro
 * de ciudad seleccionado). Cada artículo tiene una ciudad, así que las plazas particionan y la
 * entrada '' (todas) es la suma. Solo publicaciones activas y no borradas.
 */
export async function contarPublicacionesPorCiudad(): Promise<Array<{ ciudadId: string; total: number }>> {
    const resultado = await db.execute(sql`
        SELECT a.ciudad_id AS ciudad_id, COUNT(*)::int AS total
        FROM articulos_marketplace a
        WHERE a.estado = 'activa' AND a.deleted_at IS NULL AND a.ciudad_id IS NOT NULL
        GROUP BY a.ciudad_id
    `);
    const filas = resultado.rows as Array<{ ciudad_id: string; total: number }>;
    const total = filas.reduce((s, r) => s + r.total, 0);
    return [
        { ciudadId: '', total },
        ...filas.map((r) => ({ ciudadId: r.ciudad_id, total: r.total })),
    ];
}
