import { eq } from 'drizzle-orm';
import { db } from '../db';
import { categoriasNegocio, subcategoriasNegocio } from '../db/schemas/schema';

// ============================================
// OBTENER TODAS LAS CATEGORÍAS
// ============================================

/**
 * Obtiene las 11 categorías de negocios
 * @returns Array de categorías con id, nombre, icono, orden
 */
export const obtenerTodasCategorias = async () => {
  try {
    const categorias = await db
      .select({
        id: categoriasNegocio.id,
        nombre: categoriasNegocio.nombre,
        icono: categoriasNegocio.icono,
        orden: categoriasNegocio.orden,
      })
      .from(categoriasNegocio)
      .where(eq(categoriasNegocio.activa, true))
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
export const obtenerSubcategoriasPorCategoria = async (categoriaId: number) => {
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

    // Obtener subcategorías
    const subcategorias = await db
      .select({
        id: subcategoriasNegocio.id,
        nombre: subcategoriasNegocio.nombre,
        icono: subcategoriasNegocio.icono,
        orden: subcategoriasNegocio.orden,
      })
      .from(subcategoriasNegocio)
      .where(eq(subcategoriasNegocio.categoriaId, categoriaId))
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
 * Obtiene TODAS las 109 subcategorías (para búsqueda/filtros)
 * @returns Array de subcategorías con categoría padre
 */
export const obtenerTodasSubcategorias = async () => {
  try {
    const subcategorias = await db
      .select({
        id: subcategoriasNegocio.id,
        nombre: subcategoriasNegocio.nombre,
        icono: subcategoriasNegocio.icono,
        orden: subcategoriasNegocio.orden,
        categoriaId: subcategoriasNegocio.categoriaId,
        categoriaNombre: categoriasNegocio.nombre,
      })
      .from(subcategoriasNegocio)
      .innerJoin(
        categoriasNegocio,
        eq(subcategoriasNegocio.categoriaId, categoriasNegocio.id)
      )
      .where(eq(subcategoriasNegocio.activa, true))
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