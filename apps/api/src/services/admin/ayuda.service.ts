/**
 * ayuda.service.ts (admin)
 * ========================
 * CRUD del Centro de Ayuda para el Panel (solo superadmin): categorías y
 * artículos (tutoriales). La lectura devuelve TODO (borradores incluidos) +
 * métricas (vistas, util_si, util_no) para que el equipo gestione contenido.
 *
 * Ubicación: apps/api/src/services/admin/ayuda.service.ts
 */

import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { ayudaCategorias, ayudaArticulos } from '../../db/schemas/schema.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface CategoriaAdminInput {
    nombre: string;
    icono?: string | null;
    app: 'anunciaya' | 'scanya';
    audiencia: 'cliente' | 'comerciante';
    orden?: number;
    activo?: boolean;
}

export interface ArticuloAdminInput {
    categoriaId: string;
    slug: string;
    pregunta: string;
    respuesta?: string | null;
    videoUrl?: string | null;
    posterUrl?: string | null;
    duracionSeg?: number | null;
    orden?: number;
    publicado?: boolean;
    compartiblePublico?: boolean;
}

// =============================================================================
// LECTURA
// =============================================================================

/** Todas las categorías (activas e inactivas) con sus artículos + métricas. */
export async function listarAyudaAdmin() {
    const categorias = await db
        .select()
        .from(ayudaCategorias)
        .orderBy(asc(ayudaCategorias.app), asc(ayudaCategorias.audiencia), asc(ayudaCategorias.orden));

    const articulos = await db.select().from(ayudaArticulos).orderBy(asc(ayudaArticulos.orden));

    return categorias.map((cat) => ({
        ...cat,
        articulos: articulos.filter((a) => a.categoriaId === cat.id),
    }));
}

/** True si el slug ya existe en otro artículo (para validar unicidad). */
async function slugEnUso(slug: string, excluirId?: string): Promise<boolean> {
    const filas = await db
        .select({ id: ayudaArticulos.id })
        .from(ayudaArticulos)
        .where(eq(ayudaArticulos.slug, slug))
        .limit(1);
    if (filas.length === 0) return false;
    return excluirId ? filas[0].id !== excluirId : true;
}

// =============================================================================
// CATEGORÍAS
// =============================================================================

export async function crearCategoria(input: CategoriaAdminInput) {
    const [fila] = await db
        .insert(ayudaCategorias)
        .values({
            nombre: input.nombre,
            icono: input.icono ?? null,
            app: input.app,
            audiencia: input.audiencia,
            orden: input.orden ?? 0,
            activo: input.activo ?? true,
        })
        .returning({ id: ayudaCategorias.id });
    return fila;
}

export async function editarCategoria(id: string, input: Partial<CategoriaAdminInput>) {
    await db
        .update(ayudaCategorias)
        .set({
            ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
            ...(input.icono !== undefined ? { icono: input.icono } : {}),
            ...(input.app !== undefined ? { app: input.app } : {}),
            ...(input.audiencia !== undefined ? { audiencia: input.audiencia } : {}),
            ...(input.orden !== undefined ? { orden: input.orden } : {}),
            ...(input.activo !== undefined ? { activo: input.activo } : {}),
            updatedAt: sql`now()`,
        })
        .where(eq(ayudaCategorias.id, id));
}

/** Borra la categoría; sus artículos caen por ON DELETE CASCADE. */
export async function borrarCategoria(id: string) {
    await db.delete(ayudaCategorias).where(eq(ayudaCategorias.id, id));
}

// =============================================================================
// ARTÍCULOS
// =============================================================================

export async function crearArticulo(input: ArticuloAdminInput) {
    if (await slugEnUso(input.slug)) throw new Error('SLUG_EXISTE');
    const [fila] = await db
        .insert(ayudaArticulos)
        .values({
            categoriaId: input.categoriaId,
            slug: input.slug,
            pregunta: input.pregunta,
            respuesta: input.respuesta ?? null,
            videoUrl: input.videoUrl ?? null,
            posterUrl: input.posterUrl ?? null,
            duracionSeg: input.duracionSeg ?? null,
            orden: input.orden ?? 0,
            publicado: input.publicado ?? false,
            compartiblePublico: input.compartiblePublico ?? true,
        })
        .returning({ id: ayudaArticulos.id });
    return fila;
}

export async function editarArticulo(id: string, input: Partial<ArticuloAdminInput>) {
    if (input.slug !== undefined && (await slugEnUso(input.slug, id))) throw new Error('SLUG_EXISTE');
    await db
        .update(ayudaArticulos)
        .set({
            ...(input.categoriaId !== undefined ? { categoriaId: input.categoriaId } : {}),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.pregunta !== undefined ? { pregunta: input.pregunta } : {}),
            ...(input.respuesta !== undefined ? { respuesta: input.respuesta } : {}),
            ...(input.videoUrl !== undefined ? { videoUrl: input.videoUrl } : {}),
            ...(input.posterUrl !== undefined ? { posterUrl: input.posterUrl } : {}),
            ...(input.duracionSeg !== undefined ? { duracionSeg: input.duracionSeg } : {}),
            ...(input.orden !== undefined ? { orden: input.orden } : {}),
            ...(input.publicado !== undefined ? { publicado: input.publicado } : {}),
            ...(input.compartiblePublico !== undefined ? { compartiblePublico: input.compartiblePublico } : {}),
            updatedAt: sql`now()`,
        })
        .where(eq(ayudaArticulos.id, id));
}

/**
 * Borra el artículo. Las URLs de R2 (video/poster) quedan referenciadas en
 * IMAGE_REGISTRY, así que el recolector de huérfanos las limpia luego.
 */
export async function borrarArticulo(id: string) {
    await db.delete(ayudaArticulos).where(eq(ayudaArticulos.id, id));
}
