/**
 * admin/categorias.service.ts
 * ===========================
 * Lecturas del módulo Categorías del Panel Admin (catálogo de negocios:
 * categorías + subcategorías + su DISPONIBILIDAD por ciudad).
 *
 * Solo SuperAdmin (lo protege el gate global de routes/admin/index.ts). No hay
 * alcance por rol: el catálogo es estructura de plataforma.
 *
 * Una lectura principal: `listarCatalogoAdmin()` — todas las categorías (activas e
 * inactivas) con sus subcategorías anidadas, las ciudades asignadas a cada una
 * (vacío = global) y cuántos negocios usan cada subcategoría (para advertir antes
 * de desactivar).
 *
 * Las ACCIONES (crear/editar/activar/asignar ciudades) viven en
 * `categorias-acciones.service.ts`.
 *
 * Ubicación: apps/api/src/services/admin/categorias.service.ts
 */

import { asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    categoriasNegocio,
    subcategoriasNegocio,
    categoriaCiudades,
    subcategoriaCiudades,
    ciudades,
    asignacionSubcategorias,
} from '../../db/schemas/schema.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface CiudadRef {
    id: string;
    nombre: string;
}

export interface SubcategoriaAdmin {
    id: number;
    categoriaId: number;
    nombre: string;
    orden: number;
    activa: boolean;
    /** Ciudades donde aparece. Vacío = global (todas). */
    ciudades: CiudadRef[];
    /** Cuántos negocios tienen asignada esta subcategoría. */
    totalNegocios: number;
}

export interface CategoriaAdmin {
    id: number;
    nombre: string;
    orden: number;
    activa: boolean;
    /** Ciudades donde aparece. Vacío = global (todas). */
    ciudades: CiudadRef[];
    subcategorias: SubcategoriaAdmin[];
    /** Suma de asignaciones de sus subcategorías (informativo; el conteo exacto
     *  para advertir antes de desactivar es el `totalNegocios` por subcategoría). */
    totalNegocios: number;
}

// =============================================================================
// LECTURA
// =============================================================================

/**
 * Catálogo completo para el Panel: categorías ordenadas, con sus subcategorías
 * ordenadas, las ciudades asignadas a cada nivel y los conteos de negocios.
 * Hace pocas queries (una por dimensión) y ensambla en memoria.
 */
export async function listarCatalogoAdmin(): Promise<CategoriaAdmin[]> {
    const [cats, subs, catCiu, subCiu, conteoSub] = await Promise.all([
        db
            .select({
                id: categoriasNegocio.id,
                nombre: categoriasNegocio.nombre,
                orden: categoriasNegocio.orden,
                activa: categoriasNegocio.activa,
            })
            .from(categoriasNegocio)
            .orderBy(asc(categoriasNegocio.orden), asc(categoriasNegocio.nombre)),
        db
            .select({
                id: subcategoriasNegocio.id,
                categoriaId: subcategoriasNegocio.categoriaId,
                nombre: subcategoriasNegocio.nombre,
                orden: subcategoriasNegocio.orden,
                activa: subcategoriasNegocio.activa,
            })
            .from(subcategoriasNegocio)
            .orderBy(asc(subcategoriasNegocio.orden), asc(subcategoriasNegocio.nombre)),
        db
            .select({
                categoriaId: categoriaCiudades.categoriaId,
                ciudadId: ciudades.id,
                ciudadNombre: ciudades.nombre,
            })
            .from(categoriaCiudades)
            .innerJoin(ciudades, eq(ciudades.id, categoriaCiudades.ciudadId)),
        db
            .select({
                subcategoriaId: subcategoriaCiudades.subcategoriaId,
                ciudadId: ciudades.id,
                ciudadNombre: ciudades.nombre,
            })
            .from(subcategoriaCiudades)
            .innerJoin(ciudades, eq(ciudades.id, subcategoriaCiudades.ciudadId)),
        db
            .select({
                subcategoriaId: asignacionSubcategorias.subcategoriaId,
                total: sql<number>`count(*)::int`,
            })
            .from(asignacionSubcategorias)
            .groupBy(asignacionSubcategorias.subcategoriaId),
    ]);

    // Índices auxiliares
    const ciudadesPorCat = new Map<number, CiudadRef[]>();
    for (const r of catCiu) {
        const arr = ciudadesPorCat.get(r.categoriaId) ?? [];
        arr.push({ id: r.ciudadId, nombre: r.ciudadNombre });
        ciudadesPorCat.set(r.categoriaId, arr);
    }
    const ciudadesPorSub = new Map<number, CiudadRef[]>();
    for (const r of subCiu) {
        const arr = ciudadesPorSub.get(r.subcategoriaId) ?? [];
        arr.push({ id: r.ciudadId, nombre: r.ciudadNombre });
        ciudadesPorSub.set(r.subcategoriaId, arr);
    }
    const negociosPorSub = new Map<number, number>();
    for (const r of conteoSub) negociosPorSub.set(r.subcategoriaId, r.total);

    const ordenarCiudades = (arr: CiudadRef[]) =>
        arr.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

    const subsPorCat = new Map<number, SubcategoriaAdmin[]>();
    for (const s of subs) {
        const sub: SubcategoriaAdmin = {
            id: s.id,
            categoriaId: s.categoriaId,
            nombre: s.nombre,
            orden: s.orden ?? 0,
            activa: s.activa ?? true,
            ciudades: ordenarCiudades(ciudadesPorSub.get(s.id) ?? []),
            totalNegocios: negociosPorSub.get(s.id) ?? 0,
        };
        const arr = subsPorCat.get(s.categoriaId) ?? [];
        arr.push(sub);
        subsPorCat.set(s.categoriaId, arr);
    }

    return cats.map((c) => {
        const subcategorias = subsPorCat.get(c.id) ?? [];
        return {
            id: c.id,
            nombre: c.nombre,
            orden: c.orden ?? 0,
            activa: c.activa ?? true,
            ciudades: ordenarCiudades(ciudadesPorCat.get(c.id) ?? []),
            subcategorias,
            totalNegocios: subcategorias.reduce((acc, s) => acc + s.totalNegocios, 0),
        };
    });
}
