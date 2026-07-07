/**
 * ayuda.service.ts
 * =================
 * Servicio del Centro de Ayuda ("Ayuda y Tutoriales").
 * Lectura del contenido publicado, agrupado por categoría y filtrado
 * por app + audiencia.
 *
 * UBICACIÓN: apps/api/src/services/ayuda.service.ts
 */

import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { ayudaCategorias, ayudaArticulos } from '../db/schemas/schema.js';

// =============================================================================
// TIPOS
// =============================================================================

export type AppAyuda = 'anunciaya' | 'scanya';
export type AudienciaAyuda = 'cliente' | 'comerciante';

interface ArticuloAyuda {
    id: string;
    categoriaId: string;
    slug: string;
    pregunta: string;
    respuesta: string | null;
    videoUrl: string | null;
    posterUrl: string | null;
    duracionSeg: number | null;
    videoVertical: boolean | null;
    orden: number;
    compartiblePublico: boolean;
    vistas: number;
}

interface CategoriaAyuda {
    id: string;
    nombre: string;
    icono: string | null;
    orden: number;
    articulos: ArticuloAyuda[];
}

interface RespuestaServicio<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    code?: number;
}

// =============================================================================
// OBTENER EL CENTRO DE AYUDA (categorías + artículos por app/audiencia)
// =============================================================================

/**
 * Devuelve las categorías activas de una (app, audiencia) con sus artículos
 * publicados anidados, todo ordenado por `orden`.
 */
export async function obtenerCentroAyuda(
    app: AppAyuda,
    audiencia: AudienciaAyuda
): Promise<RespuestaServicio<CategoriaAyuda[]>> {
    try {
        // 1) Categorías activas de esta app + audiencia.
        const categorias = await db
            .select({
                id: ayudaCategorias.id,
                nombre: ayudaCategorias.nombre,
                icono: ayudaCategorias.icono,
                orden: ayudaCategorias.orden,
            })
            .from(ayudaCategorias)
            .where(
                and(
                    eq(ayudaCategorias.app, app),
                    eq(ayudaCategorias.audiencia, audiencia),
                    eq(ayudaCategorias.activo, true)
                )
            )
            .orderBy(asc(ayudaCategorias.orden));

        if (categorias.length === 0) {
            return { success: true, message: 'Sin categorías', data: [] };
        }

        // 2) Artículos publicados de esas categorías.
        const idsCategorias = categorias.map((c) => c.id);

        const articulos = await db
            .select({
                id: ayudaArticulos.id,
                categoriaId: ayudaArticulos.categoriaId,
                slug: ayudaArticulos.slug,
                pregunta: ayudaArticulos.pregunta,
                respuesta: ayudaArticulos.respuesta,
                videoUrl: ayudaArticulos.videoUrl,
                posterUrl: ayudaArticulos.posterUrl,
                duracionSeg: ayudaArticulos.duracionSeg,
                videoVertical: ayudaArticulos.videoVertical,
                orden: ayudaArticulos.orden,
                compartiblePublico: ayudaArticulos.compartiblePublico,
                vistas: ayudaArticulos.vistas,
            })
            .from(ayudaArticulos)
            .where(
                and(
                    inArray(ayudaArticulos.categoriaId, idsCategorias),
                    eq(ayudaArticulos.publicado, true)
                )
            )
            .orderBy(asc(ayudaArticulos.orden));

        // 3) Anidar cada artículo dentro de su categoría.
        const porCategoria = new Map<string, ArticuloAyuda[]>();
        for (const art of articulos) {
            const lista = porCategoria.get(art.categoriaId) ?? [];
            lista.push(art);
            porCategoria.set(art.categoriaId, lista);
        }

        const data: CategoriaAyuda[] = categorias.map((cat) => ({
            ...cat,
            articulos: porCategoria.get(cat.id) ?? [],
        }));

        return { success: true, message: 'Centro de ayuda obtenido', data };
    } catch (error) {
        console.error('Error en obtenerCentroAyuda:', error);
        return { success: false, message: 'Error al obtener el centro de ayuda', code: 500 };
    }
}

// =============================================================================
// TUTORIAL PÚBLICO (landing compartible /p/tutorial/:slug)
// =============================================================================

interface TutorialPublico {
    id: string;
    slug: string;
    pregunta: string;
    respuesta: string | null;
    videoUrl: string | null;
    posterUrl: string | null;
    duracionSeg: number | null;
    videoVertical: boolean | null;
    categoriaNombre: string;
}

/**
 * Devuelve un tutorial por slug para la landing pública. Solo si está
 * publicado y marcado como compartible.
 */
export async function obtenerTutorialPublico(
    slug: string,
): Promise<RespuestaServicio<TutorialPublico>> {
    try {
        const filas = await db
            .select({
                id: ayudaArticulos.id,
                slug: ayudaArticulos.slug,
                pregunta: ayudaArticulos.pregunta,
                respuesta: ayudaArticulos.respuesta,
                videoUrl: ayudaArticulos.videoUrl,
                posterUrl: ayudaArticulos.posterUrl,
                duracionSeg: ayudaArticulos.duracionSeg,
                videoVertical: ayudaArticulos.videoVertical,
                categoriaNombre: ayudaCategorias.nombre,
            })
            .from(ayudaArticulos)
            .innerJoin(ayudaCategorias, eq(ayudaArticulos.categoriaId, ayudaCategorias.id))
            .where(
                and(
                    eq(ayudaArticulos.slug, slug),
                    eq(ayudaArticulos.publicado, true),
                    eq(ayudaArticulos.compartiblePublico, true),
                ),
            )
            .limit(1);

        if (filas.length === 0) {
            return { success: false, message: 'Tutorial no encontrado', code: 404 };
        }

        return { success: true, message: 'Tutorial obtenido', data: filas[0] };
    } catch (error) {
        console.error('Error en obtenerTutorialPublico:', error);
        return { success: false, message: 'Error al obtener el tutorial', code: 500 };
    }
}

// =============================================================================
// MÉTRICAS — vistas + "¿Te sirvió?" (contadores agregados, sin identidad)
// =============================================================================

/** Suma 1 a las vistas del artículo. */
export async function incrementarVista(articuloId: string): Promise<RespuestaServicio<null>> {
    try {
        await db
            .update(ayudaArticulos)
            .set({ vistas: sql`${ayudaArticulos.vistas} + 1` })
            .where(eq(ayudaArticulos.id, articuloId));
        return { success: true, message: 'Vista registrada' };
    } catch (error) {
        console.error('Error en incrementarVista:', error);
        return { success: false, message: 'Error al registrar la vista', code: 500 };
    }
}

/** Suma 1 al contador 👍 (util=true) o 👎 (util=false) del artículo. */
export async function registrarFeedback(
    articuloId: string,
    util: boolean,
    votoPrevio?: boolean | null,
): Promise<RespuestaServicio<null>> {
    try {
        // Mismo voto que antes → nada que hacer (idempotente).
        if (votoPrevio === util) {
            return { success: true, message: 'Feedback sin cambios' };
        }
        // Suma el voto nuevo y, si había uno distinto, resta el anterior (sin
        // bajar de 0). Así el usuario puede cambiar de opinión sin inflar los
        // contadores agregados.
        const cambios = util
            ? {
                  utilSi: sql`${ayudaArticulos.utilSi} + 1`,
                  ...(votoPrevio === false
                      ? { utilNo: sql`GREATEST(${ayudaArticulos.utilNo} - 1, 0)` }
                      : {}),
              }
            : {
                  utilNo: sql`${ayudaArticulos.utilNo} + 1`,
                  ...(votoPrevio === true
                      ? { utilSi: sql`GREATEST(${ayudaArticulos.utilSi} - 1, 0)` }
                      : {}),
              };
        await db.update(ayudaArticulos).set(cambios).where(eq(ayudaArticulos.id, articuloId));
        return { success: true, message: 'Feedback registrado' };
    } catch (error) {
        console.error('Error en registrarFeedback:', error);
        return { success: false, message: 'Error al registrar el feedback', code: 500 };
    }
}
