/**
 * categoriasCatalogo.service.ts (Coyo)
 * =====================================
 * Carga el catálogo de categorías + subcategorías de la app para inyectarlo
 * al prompt de Gemini. Cuando Gemini conoce las categorías REALES del
 * catálogo, puede extraer la CATEGORÍA PRINCIPAL en `terminos` cuando el
 * vecino pregunta por un dominio amplio (comida, salud, belleza, etc.) —
 * eso permite encontrar TODOS los negocios del dominio, no solo los que
 * matchean por palabra específica.
 *
 * Cache en memoria con TTL de 1 hora porque:
 *  - Las categorías cambian raramente (solo cuando el Panel Admin agrega o
 *    elimina una).
 *  - 1 hora de stale es aceptable: si agregas una categoría, Coyo la
 *    aprende en máximo 1 hora.
 *  - Evita consultar BD en cada pregunta a Coyo (1 query/hora vs 1
 *    query/pregunta).
 *
 * Resiliencia: si la consulta a BD falla, devuelve el último cache válido
 * (graceful degradation). Si nunca se cargó, devuelve array vacío y el
 * prompt funciona sin la sección del catálogo (Gemini cae al comportamiento
 * previo basado solo en sus reglas internas).
 *
 * Ubicación: apps/api/src/services/coyo/categoriasCatalogo.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';

export interface CategoriaCatalogo {
    /** Nombre de la categoría principal (ej. "Comida", "Salud", "Belleza"). */
    nombre: string;
    /** Subcategorías ordenadas alfabéticamente (ej. ["Mariscos", "Restaurantes"]). */
    subcategorias: string[];
}

// =============================================================================
// CACHE EN MEMORIA
// =============================================================================

let cache: CategoriaCatalogo[] | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

// Cache separado para las categorías de MarketPlace (tabla propia de 1 nivel).
let cacheMP: string[] | null = null;
let cacheMPExpiresAt = 0;

/**
 * Reset manual del cache (útil para tests o para forzar recarga después
 * de cambios en BD). No expuesto en runtime — solo para tests.
 */
export function resetearCacheCatalogo(): void {
    cache = null;
    cacheExpiresAt = 0;
    cacheMP = null;
    cacheMPExpiresAt = 0;
}

// =============================================================================
// CARGA DEL CATÁLOGO
// =============================================================================

/**
 * Devuelve las categorías + subcategorías del catálogo, usando cache de 1h.
 *
 * Si la consulta a BD falla:
 *   - Si hay cache previo (aunque expirado), lo devuelve para no romper
 *     el flujo de Coyo (mejor stale que nada).
 *   - Si nunca se cargó, devuelve array vacío y el caller continúa sin
 *     la sección del catálogo en el prompt.
 */
export async function obtenerCatalogoCategorias(): Promise<CategoriaCatalogo[]> {
    const now = Date.now();
    if (cache && cacheExpiresAt > now) {
        return cache;
    }

    try {
        const result = await db.execute(sql`
            SELECT
                c.nombre AS categoria,
                array_agg(DISTINCT sc.nombre ORDER BY sc.nombre) AS subcategorias
            FROM categorias_negocio c
            JOIN subcategorias_negocio sc ON sc.categoria_id = c.id
            GROUP BY c.id, c.nombre
            ORDER BY c.nombre
        `);

        const categorias: CategoriaCatalogo[] = (
            result.rows as Array<{
                categoria: string;
                subcategorias: string[] | null;
            }>
        ).map((r) => ({
            nombre: r.categoria,
            subcategorias: r.subcategorias ?? [],
        }));

        cache = categorias;
        cacheExpiresAt = now + CACHE_TTL_MS;
        return categorias;
    } catch (error) {
        console.error(
            'Coyo: error cargando catálogo de categorías. Usando cache previo si existe.',
            error,
        );
        return cache ?? [];
    }
}

// =============================================================================
// FORMATEO PARA EL PROMPT
// =============================================================================

/**
 * Formatea el catálogo como texto markdown listo para inyectar al prompt
 * de Gemini. Devuelve cadena vacía si el catálogo está vacío (Gemini
 * trabajará sin la sección del catálogo, como antes).
 *
 * Formato:
 *   - Comida: Mariscos, Restaurantes, Panaderías
 *   - Salud: Farmacias, Médicos
 */
export function formatearCatalogoParaPrompt(
    catalogo: CategoriaCatalogo[],
): string {
    if (catalogo.length === 0) return '';
    return catalogo
        .map((c) => `- ${c.nombre}: ${c.subcategorias.join(', ')}`)
        .join('\n');
}

// =============================================================================
// CATÁLOGO DE MARKETPLACE (categorías propias de 1 nivel)
// =============================================================================

/**
 * Nombres de las categorías ACTIVAS de MarketPlace (`categorias_marketplace`,
 * 1 nivel, sin subcategorías). Mismo cache de 1h + degradación que el catálogo
 * de negocios. Se inyecta al prompt para que Gemini extraiga la categoría MP
 * cuando el vecino busca un PRODUCTO/COSA (compra o venta).
 */
export async function obtenerCatalogoMarketplace(): Promise<string[]> {
    const now = Date.now();
    if (cacheMP && cacheMPExpiresAt > now) {
        return cacheMP;
    }

    try {
        const result = await db.execute(sql`
            SELECT nombre
            FROM categorias_marketplace
            WHERE activa = true
            ORDER BY orden, nombre
        `);

        const nombres = (result.rows as Array<{ nombre: string }>).map(
            (r) => r.nombre,
        );

        cacheMP = nombres;
        cacheMPExpiresAt = now + CACHE_TTL_MS;
        return nombres;
    } catch (error) {
        console.error(
            'Coyo: error cargando catálogo de MarketPlace. Usando cache previo si existe.',
            error,
        );
        return cacheMP ?? [];
    }
}

/**
 * Formatea las categorías de MarketPlace como lista en línea para el prompt.
 * Devuelve cadena vacía si no hay ninguna (Gemini trabaja sin esa sección).
 *
 * Formato: "Vehículos, Electrónica, Hogar, Muebles, Ropa y calzado, …"
 */
export function formatearCatalogoMarketplaceParaPrompt(cats: string[]): string {
    if (cats.length === 0) return '';
    return cats.join(', ');
}
