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

import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    categoriasNegocio,
    subcategoriasNegocio,
    categoriaCiudades,
    subcategoriaCiudades,
    ciudades,
    asignacionSubcategorias,
    negocios,
    negocioSucursales,
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
    /** Negocios reales distintos con alguna subcategoría de esta categoría (en la
     *  ciudad filtrada, si se pidió). DISTINCT por negocio: no es la suma de subs. */
    totalNegocios: number;
}

export interface CatalogoAdminResp {
    categorias: CategoriaAdmin[];
    /** Negocios reales activos DISTINTOS con ≥1 subcategoría asignada (en la ciudad
     *  filtrada, si se pidió). Es el KPI "Negocios clasificados". */
    totalNegocios: number;
}

// =============================================================================
// LECTURA
// =============================================================================

/**
 * Catálogo completo para el Panel: categorías ordenadas, con sus subcategorías
 * ordenadas, las ciudades asignadas a cada nivel y los conteos de NEGOCIOS REALES.
 *
 * `ciudadId` (opcional) restringe los conteos a negocios con al menos una sucursal
 * ACTIVA en esa ciudad — la analítica "qué giros funcionan por plaza". Sin él,
 * cuenta en todas las ciudades. Solo cuenta negocios reales publicados (mismos
 * criterios que el directorio público): `activo`, no borrador, `estado_admin='activo'`,
 * no demo, con sucursal activa. El conteo es DISTINCT por negocio en cada nivel
 * (subcategoría, categoría y total), así un negocio con varias subcategorías o
 * sucursales no infla las cifras.
 */
export async function listarCatalogoAdmin(ciudadId?: string): Promise<CatalogoAdminResp> {
    // Criterio de "negocio real y visible" + filtro de ciudad opcional (por sucursal).
    const condicionesNegocio = [
        eq(negocios.activo, true),
        sql`${negocios.esBorrador} IS NOT TRUE`,
        eq(negocios.estadoAdmin, 'activo'),
        eq(negocios.esDemo, false),
        eq(negocioSucursales.activa, true),
    ];
    if (ciudadId) condicionesNegocio.push(eq(negocioSucursales.ciudadId, ciudadId));

    const [cats, subs, catCiu, subCiu, filasNeg] = await Promise.all([
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
        // Una fila por (asignación × sucursal activa) de negocios reales; se
        // deduplica por negocio en memoria (abajo) para el conteo DISTINCT.
        db
            .select({
                subcategoriaId: asignacionSubcategorias.subcategoriaId,
                categoriaId: subcategoriasNegocio.categoriaId,
                negocioId: negocios.id,
            })
            .from(asignacionSubcategorias)
            .innerJoin(
                subcategoriasNegocio,
                eq(subcategoriasNegocio.id, asignacionSubcategorias.subcategoriaId),
            )
            .innerJoin(negocios, eq(negocios.id, asignacionSubcategorias.negocioId))
            .innerJoin(negocioSucursales, eq(negocioSucursales.negocioId, negocios.id))
            .where(and(...condicionesNegocio)),
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
    // Conteos DISTINCT por negocio en cada nivel (dedup en memoria vía Set): un
    // negocio con varias sucursales activas o varias subcategorías cuenta una vez.
    const agregar = (m: Map<number, Set<string>>, k: number, id: string) => {
        let s = m.get(k);
        if (!s) { s = new Set(); m.set(k, s); }
        s.add(id);
    };
    const negPorSub = new Map<number, Set<string>>();
    const negPorCat = new Map<number, Set<string>>();
    const negGlobal = new Set<string>();
    for (const r of filasNeg) {
        agregar(negPorSub, r.subcategoriaId, r.negocioId);
        agregar(negPorCat, r.categoriaId, r.negocioId);
        negGlobal.add(r.negocioId);
    }

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
            totalNegocios: negPorSub.get(s.id)?.size ?? 0,
        };
        const arr = subsPorCat.get(s.categoriaId) ?? [];
        arr.push(sub);
        subsPorCat.set(s.categoriaId, arr);
    }

    const categorias = cats.map((c) => {
        const subcategorias = subsPorCat.get(c.id) ?? [];
        return {
            id: c.id,
            nombre: c.nombre,
            orden: c.orden ?? 0,
            activa: c.activa ?? true,
            ciudades: ordenarCiudades(ciudadesPorCat.get(c.id) ?? []),
            subcategorias,
            // DISTINCT por negocio (no la suma de subs: un negocio con 2 subs de la
            // misma categoría cuenta 1 sola vez).
            totalNegocios: negPorCat.get(c.id)?.size ?? 0,
        };
    });

    return { categorias, totalNegocios: negGlobal.size };
}
