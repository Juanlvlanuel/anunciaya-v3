/**
 * categorias.service.ts (MarketPlace)
 * ====================================
 * Lectura de las categorías de MarketPlace (1 nivel, globales). Tabla propia
 * `categorias_marketplace` — ver docs/arquitectura/Marketplace_Categorias.md.
 *
 * El CRUD de administración vive en `services/admin/` (Panel). Este service
 * solo expone la lista pública (categorías activas) para el composer y el
 * filtro del feed.
 *
 * Ubicación: apps/api/src/services/marketplace/categorias.service.ts
 */

import { asc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { categoriasMarketplace } from '../../db/schemas/schema.js';

export interface CategoriaMarketplace {
    id: number;
    nombre: string;
    orden: number;
}

/**
 * Devuelve las categorías ACTIVAS ordenadas por `orden` (y nombre como
 * desempate). Cacheable en el frontend con staleTime alto — cambian poco.
 */
export async function obtenerCategoriasMarketplace(): Promise<CategoriaMarketplace[]> {
    const filas = await db
        .select({
            id: categoriasMarketplace.id,
            nombre: categoriasMarketplace.nombre,
            orden: categoriasMarketplace.orden,
        })
        .from(categoriasMarketplace)
        .where(eq(categoriasMarketplace.activa, true))
        .orderBy(asc(categoriasMarketplace.orden), asc(categoriasMarketplace.nombre));

    return filas;
}
