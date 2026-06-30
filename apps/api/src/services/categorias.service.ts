import { and, eq, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { categoriasNegocio, subcategoriasNegocio } from '../db/schemas/schema';
import { sql } from 'drizzle-orm';

// =============================================================================
// FILTRO DE DISPONIBILIDAD POR CIUDAD
// =============================================================================
// Regla: una categoría/subcategoría es visible en la ciudad C si NO tiene filas en
// su tabla de disponibilidad (es global) O tiene una fila con esa ciudad. Sin
// ciudadId, no se filtra (comportamiento global histórico, retrocompatible).

/** Condición SQL: la categoría `categorias_negocio.id` es visible en `ciudadId`. */
function categoriaVisibleEn(ciudadId?: string): SQL | undefined {
    if (!ciudadId) return undefined;
    return sql`(
        NOT EXISTS (SELECT 1 FROM categoria_ciudades cc WHERE cc.categoria_id = ${categoriasNegocio.id})
        OR EXISTS (SELECT 1 FROM categoria_ciudades cc WHERE cc.categoria_id = ${categoriasNegocio.id} AND cc.ciudad_id = ${ciudadId})
    )`;
}

/** Condición SQL: la subcategoría `subcategorias_negocio.id` es visible en `ciudadId`. */
function subcategoriaVisibleEn(ciudadId?: string): SQL | undefined {
    if (!ciudadId) return undefined;
    return sql`(
        NOT EXISTS (SELECT 1 FROM subcategoria_ciudades sc WHERE sc.subcategoria_id = ${subcategoriasNegocio.id})
        OR EXISTS (SELECT 1 FROM subcategoria_ciudades sc WHERE sc.subcategoria_id = ${subcategoriasNegocio.id} AND sc.ciudad_id = ${ciudadId})
    )`;
}

// ============================================
// OBTENER TODAS LAS CATEGORÍAS
// ============================================

/**
 * Obtiene las categorías de negocios activas. Si se pasa `ciudadId`, devuelve solo
 * las disponibles en esa ciudad (globales + asignadas a la ciudad).
 * @returns Array de categorías con id, nombre, orden
 */
export const obtenerTodasCategorias = async (ciudadId?: string) => {
  try {
    const categorias = await db
      .select({
        id: categoriasNegocio.id,
        nombre: categoriasNegocio.nombre,
        orden: categoriasNegocio.orden,
      })
      .from(categoriasNegocio)
      .where(and(eq(categoriasNegocio.activa, true), categoriaVisibleEn(ciudadId)))
      .orderBy(categoriasNegocio.orden);

    return categorias;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw new Error('Error al obtener categorías');
  }
};

// ============================================
// OBTENER SUBCATEGORÍAS POR CATEGORÍA
// ============================================

/**
 * Obtiene las subcategorías de una categoría específica
 * @param categoriaId - ID de la categoría
 * @returns Array de subcategorías con id, nombre, orden
 */
export const obtenerSubcategoriasPorCategoria = async (categoriaId: number, ciudadId?: string) => {
  try {
    // Verificar que la categoría existe
    const categoria = await db
      .select()
      .from(categoriasNegocio)
      .where(eq(categoriasNegocio.id, categoriaId))
      .limit(1);

    if (categoria.length === 0) {
      // Retornar array vacío en lugar de lanzar error
      return [];
    }

    // Obtener subcategorías (filtradas por ciudad si se pasa ciudadId)
    const subcategorias = await db
      .select({
        id: subcategoriasNegocio.id,
        nombre: subcategoriasNegocio.nombre,
        orden: subcategoriasNegocio.orden,
      })
      .from(subcategoriasNegocio)
      .where(and(eq(subcategoriasNegocio.categoriaId, categoriaId), subcategoriaVisibleEn(ciudadId)))
      .orderBy(subcategoriasNegocio.orden);

    return subcategorias;
  } catch (error) {
    console.error('Error al obtener subcategorías:', error);
    throw error;
  }
};

// ============================================
// OBTENER TODAS LAS SUBCATEGORÍAS
// ============================================

/**
 * Obtiene TODAS las 117 subcategorías (para búsqueda/filtros)
 * @returns Array de subcategorías con categoría padre
 */
export const obtenerTodasSubcategorias = async (ciudadId?: string) => {
  try {
    const subcategorias = await db
      .select({
        id: subcategoriasNegocio.id,
        nombre: subcategoriasNegocio.nombre,
        orden: subcategoriasNegocio.orden,
        categoriaId: subcategoriasNegocio.categoriaId,
        categoriaNombre: categoriasNegocio.nombre,
      })
      .from(subcategoriasNegocio)
      .innerJoin(
        categoriasNegocio,
        eq(subcategoriasNegocio.categoriaId, categoriasNegocio.id)
      )
      // Visible = subcategoría disponible en la ciudad Y su categoría también.
      .where(and(
        eq(subcategoriasNegocio.activa, true),
        categoriaVisibleEn(ciudadId),
        subcategoriaVisibleEn(ciudadId),
      ))
      .orderBy(categoriasNegocio.orden, subcategoriasNegocio.orden);

    return subcategorias;
  } catch (error) {
    console.error('Error al obtener todas las subcategorías:', error);
    throw new Error('Error al obtener subcategorías');
  }
};

// ============================================
// VALIDAR SUBCATEGORÍAS (para onboarding)
// ============================================

/**
 * Valida que los IDs de subcategorías existen en la BD
 * @param subcategoriasIds - Array de IDs a validar
 * @returns true si todas existen, false si alguna no existe
 */
export const validarSubcategoriasExisten = async (
  subcategoriasIds: number[]
): Promise<boolean> => {
  try {
    const subcategorias = await db
      .select({ id: subcategoriasNegocio.id })
      .from(subcategoriasNegocio)
      .where(eq(subcategoriasNegocio.activa, true));

    const idsExistentes = subcategorias.map((s) => s.id);

    // Verificar que todos los IDs solicitados existen
    return subcategoriasIds.every((id) => idsExistentes.includes(id));
  } catch (error) {
    console.error('Error al validar subcategorías:', error);
    return false;
  }
};