/**
 * ayuda.service.ts (admin)
 * ========================
 * CRUD del Centro de Ayuda para el Panel (solo superadmin): categorías y
 * artículos (tutoriales). La lectura devuelve TODO (borradores incluidos) +
 * métricas (vistas, util_si, util_no) para que el equipo gestione contenido.
 *
 * Ubicación: apps/api/src/services/admin/ayuda.service.ts
 */

import { and, asc, eq, ne, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { ayudaCategorias, ayudaArticulos } from '../../db/schemas/schema.js';
import { eliminarArchivo, esUrlR2, extraerKeyDeUrl } from '../r2.service.js';

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
    videoVertical?: boolean | null;
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

/**
 * Borra un archivo de R2 (video/poster de tutorial) SOLO si ningún artículo lo
 * referencia ya (ni en video_url ni en poster_url). `excluirId` omite un artículo
 * del conteo (el que se acaba de editar, que ya guardó la URL nueva). Best-effort:
 * si el borrado en R2 falla, se registra pero no rompe la operación.
 */
async function borrarArchivoSiHuerfano(url: string | null | undefined, excluirId?: string): Promise<void> {
    if (!url || !esUrlR2(url)) return;
    const enUso = await db
        .select({ id: ayudaArticulos.id })
        .from(ayudaArticulos)
        .where(
            and(
                or(eq(ayudaArticulos.videoUrl, url), eq(ayudaArticulos.posterUrl, url)),
                excluirId ? ne(ayudaArticulos.id, excluirId) : undefined,
            ),
        )
        .limit(1);
    if (enUso.length > 0) return; // lo usa otro tutorial → no tocar
    await eliminarArchivo(url).catch((err) => console.warn('No se pudo borrar archivo de ayuda en R2:', err));
}

/**
 * Borra un archivo recién subido a R2 (carpeta `ayuda_articulos`) que NO llegó a
 * guardarse en ningún tutorial — p. ej. cuando el usuario sube video/poster y
 * cancela el modal. Valida la carpeta y que sea huérfano por seguridad.
 */
export async function borrarArchivoSubido(url: string): Promise<void> {
    if (!esUrlR2(url)) return;
    const key = extraerKeyDeUrl(url);
    if (!key || !key.startsWith('ayuda_articulos/')) return; // solo esa carpeta
    await borrarArchivoSiHuerfano(url);
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
            videoVertical: input.videoVertical ?? null,
            orden: input.orden ?? 0,
            publicado: input.publicado ?? false,
            compartiblePublico: input.compartiblePublico ?? true,
        })
        .returning({ id: ayudaArticulos.id });
    return fila;
}

export async function editarArticulo(id: string, input: Partial<ArticuloAdminInput>) {
    if (input.slug !== undefined && (await slugEnUso(input.slug, id))) throw new Error('SLUG_EXISTE');
    // Capturar las URLs actuales para limpiar R2 si el video/poster se reemplaza.
    const [previo] = await db
        .select({ videoUrl: ayudaArticulos.videoUrl, posterUrl: ayudaArticulos.posterUrl })
        .from(ayudaArticulos)
        .where(eq(ayudaArticulos.id, id))
        .limit(1);
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
            ...(input.videoVertical !== undefined ? { videoVertical: input.videoVertical } : {}),
            ...(input.orden !== undefined ? { orden: input.orden } : {}),
            ...(input.publicado !== undefined ? { publicado: input.publicado } : {}),
            ...(input.compartiblePublico !== undefined ? { compartiblePublico: input.compartiblePublico } : {}),
            updatedAt: sql`now()`,
        })
        .where(eq(ayudaArticulos.id, id));

    // Limpiar de R2 el video/poster anterior si se reemplazó (queda huérfano).
    if (previo) {
        if (input.videoUrl !== undefined && input.videoUrl !== previo.videoUrl) {
            await borrarArchivoSiHuerfano(previo.videoUrl, id);
        }
        if (input.posterUrl !== undefined && input.posterUrl !== previo.posterUrl) {
            await borrarArchivoSiHuerfano(previo.posterUrl, id);
        }
    }
}

/**
 * Borra el artículo y limpia de R2 su video y poster (si ya no los usa nadie).
 * El recolector de huérfanos sigue siendo la red de seguridad para lo que falle.
 */
export async function borrarArticulo(id: string) {
    const [previo] = await db
        .select({ videoUrl: ayudaArticulos.videoUrl, posterUrl: ayudaArticulos.posterUrl })
        .from(ayudaArticulos)
        .where(eq(ayudaArticulos.id, id))
        .limit(1);
    await db.delete(ayudaArticulos).where(eq(ayudaArticulos.id, id));
    if (previo) {
        await borrarArchivoSiHuerfano(previo.videoUrl);
        await borrarArchivoSiHuerfano(previo.posterUrl);
    }
}
