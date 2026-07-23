/**
 * admin/categorias-acciones.service.ts
 * ====================================
 * Acciones de ESCRITURA del módulo Categorías del Panel (solo superadmin, bajo el
 * gate global de routes/admin/index.ts).
 *
 * Categoría:    crearCategoria · editarCategoria · cambiarActivaCategoria ·
 *               reordenarCategorias · asignarCiudadesCategoria · eliminarCategoria.
 * Subcategoría: crearSubcategoria · editarSubcategoria · cambiarActivaSubcategoria ·
 *               reordenarSubcategorias · asignarCiudadesSubcategoria · eliminarSubcategoria.
 *
 * REGLAS:
 *  - "Quitar" = DESACTIVAR (activa=false), nunca DELETE físico (integridad con los
 *    negocios ya asignados en asignacion_subcategorias). Igual que Ciudades/Regiones.
 *  - EXCEPCIÓN CONTROLADA — hard delete: mientras se define el catálogo de giros
 *    para la beta, `eliminarCategoria`/`eliminarSubcategoria` permiten borrado físico,
 *    pero solo si la guardia de integridad lo permite (ver cada función). El
 *    frontend deshabilita el botón preventivamente, pero la guardia real vive aquí.
 *  - Disponibilidad por ciudad con SET SEMANTICS: el body manda la lista COMPLETA de
 *    ciudades; se reemplaza (delete all + insert). Lista vacía = GLOBAL (todas).
 *  - Una subcategoría solo puede estar disponible en ciudades donde su CATEGORÍA
 *    también lo esté: si la categoría está acotada, las ciudades de la subcategoría
 *    deben ser un subconjunto (409 si no).
 *
 * La LECTURA del catálogo vive en `categorias.service.ts`.
 *
 * Ubicación: apps/api/src/services/admin/categorias-acciones.service.ts
 */

import { and, eq, ne, inArray, notInArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import {
    categoriasNegocio,
    subcategoriasNegocio,
    categoriaCiudades,
    subcategoriaCiudades,
    ciudades,
    asignacionSubcategorias,
} from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';

export type ResultadoAccion<T = unknown> =
    | { ok: true; data: T }
    | { ok: false; status: number; mensaje: string };

// =============================================================================
// HELPERS
// =============================================================================

/** Valida que todos los ids de ciudad existan. Devuelve los que faltan. */
async function ciudadesInexistentes(ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const filas = await db
        .select({ id: ciudades.id })
        .from(ciudades)
        .where(inArray(ciudades.id, ids));
    const existen = new Set(filas.map((f) => f.id));
    return ids.filter((id) => !existen.has(id));
}

/** Ciudades asignadas a una categoría (vacío = global). */
async function ciudadesDeCategoria(categoriaId: number): Promise<Set<string>> {
    const filas = await db
        .select({ ciudadId: categoriaCiudades.ciudadId })
        .from(categoriaCiudades)
        .where(eq(categoriaCiudades.categoriaId, categoriaId));
    return new Set(filas.map((f) => f.ciudadId));
}

/** Siguiente `orden` (max + 1) de las subcategorías de una categoría, o de las categorías. */
async function siguienteOrdenCategoria(): Promise<number> {
    const [r] = await db
        .select({ max: sql<number>`coalesce(max(${categoriasNegocio.orden}), 0)::int` })
        .from(categoriasNegocio);
    return (r?.max ?? 0) + 1;
}

async function siguienteOrdenSubcategoria(categoriaId: number): Promise<number> {
    const [r] = await db
        .select({ max: sql<number>`coalesce(max(${subcategoriasNegocio.orden}), 0)::int` })
        .from(subcategoriasNegocio)
        .where(eq(subcategoriasNegocio.categoriaId, categoriaId));
    return (r?.max ?? 0) + 1;
}

// =============================================================================
// CATEGORÍA
// =============================================================================

export async function crearCategoria(
    panel: UsuarioPanel,
    datos: { nombre: string; ciudadIds?: string[] },
): Promise<ResultadoAccion<{ id: number }>> {
    const nombre = datos.nombre.trim();
    const [choca] = await db
        .select({ id: categoriasNegocio.id })
        .from(categoriasNegocio)
        .where(sql`lower(${categoriasNegocio.nombre}) = lower(${nombre})`)
        .limit(1);
    if (choca) return { ok: false, status: 409, mensaje: `Ya existe una categoría llamada "${nombre}".` };

    const ciudadIds = datos.ciudadIds ?? [];
    const faltan = await ciudadesInexistentes(ciudadIds);
    if (faltan.length) return { ok: false, status: 404, mensaje: 'Alguna de las ciudades indicadas no existe.' };

    const orden = await siguienteOrdenCategoria();
    const [creada] = await db
        .insert(categoriasNegocio)
        .values({ nombre, orden, activa: true })
        .returning({ id: categoriasNegocio.id });

    if (ciudadIds.length) {
        await db.insert(categoriaCiudades).values(ciudadIds.map((ciudadId) => ({ categoriaId: creada.id, ciudadId })));
    }

    // entidad_id de admin_auditoria es uuid; los ids del catálogo son serial (integer),
    // así que va null y el id real se guarda en los datos (patrón de Configuración).
    await registrarAuditoria(panel, {
        accion: 'categoria_crear',
        entidadTipo: 'categoria',
        entidadId: null,
        datosNuevos: { id: creada.id, nombre, ciudades: ciudadIds.length || 'global' },
    });

    return { ok: true, data: { id: creada.id } };
}

export async function editarCategoria(
    panel: UsuarioPanel,
    id: number,
    datos: { nombre?: string },
): Promise<ResultadoAccion<{ id: number }>> {
    const [actual] = await db
        .select({ id: categoriasNegocio.id, nombre: categoriasNegocio.nombre })
        .from(categoriasNegocio)
        .where(eq(categoriasNegocio.id, id))
        .limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Categoría no encontrada.' };

    const set: Partial<typeof categoriasNegocio.$inferInsert> = {};
    if (datos.nombre !== undefined && datos.nombre.trim() !== actual.nombre) {
        const nombre = datos.nombre.trim();
        const [choca] = await db
            .select({ id: categoriasNegocio.id })
            .from(categoriasNegocio)
            .where(and(sql`lower(${categoriasNegocio.nombre}) = lower(${nombre})`, ne(categoriasNegocio.id, id)))
            .limit(1);
        if (choca) return { ok: false, status: 409, mensaje: `Ya existe otra categoría llamada "${nombre}".` };
        set.nombre = nombre;
    }

    if (Object.keys(set).length === 0) return { ok: true, data: { id } };

    await db.update(categoriasNegocio).set(set).where(eq(categoriasNegocio.id, id));

    await registrarAuditoria(panel, {
        accion: 'categoria_editar',
        entidadTipo: 'categoria',
        entidadId: null,
        datosPrevios: { id, nombre: actual.nombre },
        datosNuevos: set,
    });

    return { ok: true, data: { id } };
}

export async function cambiarActivaCategoria(
    panel: UsuarioPanel,
    id: number,
    activa: boolean,
): Promise<ResultadoAccion<{ id: number; activa: boolean }>> {
    const [actual] = await db
        .select({ id: categoriasNegocio.id, activa: categoriasNegocio.activa })
        .from(categoriasNegocio)
        .where(eq(categoriasNegocio.id, id))
        .limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Categoría no encontrada.' };
    if (actual.activa === activa) return { ok: true, data: { id, activa } };

    await db.update(categoriasNegocio).set({ activa }).where(eq(categoriasNegocio.id, id));

    await registrarAuditoria(panel, {
        accion: activa ? 'categoria_activar' : 'categoria_desactivar',
        entidadTipo: 'categoria',
        entidadId: null,
        datosPrevios: { id, activa: actual.activa },
        datosNuevos: { id, activa },
    });

    return { ok: true, data: { id, activa } };
}

export async function reordenarCategorias(
    panel: UsuarioPanel,
    ids: number[],
): Promise<ResultadoAccion<{ total: number }>> {
    // El índice en el array = nuevo orden (1-based). Solo toca las que existen.
    const existentes = await db.select({ id: categoriasNegocio.id }).from(categoriasNegocio);
    const validos = new Set(existentes.map((e) => e.id));
    let i = 0;
    for (const id of ids) {
        if (!validos.has(id)) continue;
        i += 1;
        await db.update(categoriasNegocio).set({ orden: i }).where(eq(categoriasNegocio.id, id));
    }

    await registrarAuditoria(panel, {
        accion: 'categoria_reordenar',
        entidadTipo: 'categoria',
        entidadId: null,
        datosNuevos: { orden: ids },
    });

    return { ok: true, data: { total: i } };
}

export async function asignarCiudadesCategoria(
    panel: UsuarioPanel,
    id: number,
    ciudadIds: string[],
): Promise<ResultadoAccion<{ id: number; total: number }>> {
    const [actual] = await db
        .select({ id: categoriasNegocio.id })
        .from(categoriasNegocio)
        .where(eq(categoriasNegocio.id, id))
        .limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Categoría no encontrada.' };

    const faltan = await ciudadesInexistentes(ciudadIds);
    if (faltan.length) return { ok: false, status: 404, mensaje: 'Alguna de las ciudades indicadas no existe.' };

    // Set semantics: reemplaza el conjunto completo.
    await db.delete(categoriaCiudades).where(eq(categoriaCiudades.categoriaId, id));
    if (ciudadIds.length) {
        await db.insert(categoriaCiudades).values(ciudadIds.map((ciudadId) => ({ categoriaId: id, ciudadId })));

        // Coherencia descendente: si la categoría queda ACOTADA, recorta las ciudades de
        // sus subcategorías al nuevo conjunto (una sub no puede vivir fuera de su categoría).
        const subs = await db
            .select({ id: subcategoriasNegocio.id })
            .from(subcategoriasNegocio)
            .where(eq(subcategoriasNegocio.categoriaId, id));
        const subIds = subs.map((s) => s.id);
        if (subIds.length) {
            await db
                .delete(subcategoriaCiudades)
                .where(
                    and(
                        inArray(subcategoriaCiudades.subcategoriaId, subIds),
                        notInArray(subcategoriaCiudades.ciudadId, ciudadIds),
                    ),
                );
        }
    }

    await registrarAuditoria(panel, {
        accion: 'categoria_asignar_ciudades',
        entidadTipo: 'categoria',
        entidadId: null,
        datosNuevos: { id, ciudades: ciudadIds.length || 'global' },
    });

    return { ok: true, data: { id, total: ciudadIds.length } };
}

/**
 * Hard delete de una categoría — excepción controlada al patrón "quitar = desactivar".
 * Guardia: la FK subcategorias_negocio.categoria_id NO declara cascade en el schema
 * (schema.ts ~línea 900), así que borrar con subcategorías vivas (activas o inactivas)
 * las dejaría huérfanas. Bloquea si tiene ≥1, sin importar su estado.
 */
export async function eliminarCategoria(
    panel: UsuarioPanel,
    id: number,
): Promise<ResultadoAccion<{ id: number }>> {
    const [actual] = await db
        .select({ id: categoriasNegocio.id, nombre: categoriasNegocio.nombre })
        .from(categoriasNegocio)
        .where(eq(categoriasNegocio.id, id))
        .limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Categoría no encontrada.' };

    const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(subcategoriasNegocio)
        .where(eq(subcategoriasNegocio.categoriaId, id));
    if (total > 0) {
        return {
            ok: false,
            status: 409,
            mensaje: `Tiene ${total} subcategoría${total === 1 ? '' : 's'}, bórralas primero.`,
        };
    }

    await registrarAuditoria(panel, {
        accion: 'categoria_eliminar',
        entidadTipo: 'categoria',
        entidadId: null,
        datosPrevios: { id: actual.id, nombre: actual.nombre },
    });

    await db.delete(categoriasNegocio).where(eq(categoriasNegocio.id, id));

    return { ok: true, data: { id } };
}

// =============================================================================
// SUBCATEGORÍA
// =============================================================================

export async function crearSubcategoria(
    panel: UsuarioPanel,
    datos: { categoriaId: number; nombre: string; ciudadIds?: string[] },
): Promise<ResultadoAccion<{ id: number }>> {
    const [cat] = await db
        .select({ id: categoriasNegocio.id })
        .from(categoriasNegocio)
        .where(eq(categoriasNegocio.id, datos.categoriaId))
        .limit(1);
    if (!cat) return { ok: false, status: 404, mensaje: 'La categoría indicada no existe.' };

    const nombre = datos.nombre.trim();
    const [choca] = await db
        .select({ id: subcategoriasNegocio.id })
        .from(subcategoriasNegocio)
        .where(and(eq(subcategoriasNegocio.categoriaId, datos.categoriaId), sql`lower(${subcategoriasNegocio.nombre}) = lower(${nombre})`))
        .limit(1);
    if (choca) return { ok: false, status: 409, mensaje: `Ya existe una subcategoría llamada "${nombre}" en esta categoría.` };

    const ciudadIds = datos.ciudadIds ?? [];
    const faltan = await ciudadesInexistentes(ciudadIds);
    if (faltan.length) return { ok: false, status: 404, mensaje: 'Alguna de las ciudades indicadas no existe.' };

    // La subcategoría no puede vivir fuera de las ciudades de su categoría (si está acotada).
    const ciudadesCat = await ciudadesDeCategoria(datos.categoriaId);
    if (ciudadesCat.size && ciudadIds.some((c) => !ciudadesCat.has(c))) {
        return { ok: false, status: 409, mensaje: 'La subcategoría solo puede estar en ciudades donde su categoría también esté disponible.' };
    }

    const orden = await siguienteOrdenSubcategoria(datos.categoriaId);
    const [creada] = await db
        .insert(subcategoriasNegocio)
        .values({ categoriaId: datos.categoriaId, nombre, orden, activa: true })
        .returning({ id: subcategoriasNegocio.id });

    if (ciudadIds.length) {
        await db.insert(subcategoriaCiudades).values(ciudadIds.map((ciudadId) => ({ subcategoriaId: creada.id, ciudadId })));
    }

    await registrarAuditoria(panel, {
        accion: 'subcategoria_crear',
        entidadTipo: 'subcategoria',
        entidadId: null,
        datosNuevos: { id: creada.id, categoriaId: datos.categoriaId, nombre, ciudades: ciudadIds.length || 'global' },
    });

    return { ok: true, data: { id: creada.id } };
}

export async function editarSubcategoria(
    panel: UsuarioPanel,
    id: number,
    datos: { nombre?: string },
): Promise<ResultadoAccion<{ id: number }>> {
    const [actual] = await db
        .select({ id: subcategoriasNegocio.id, categoriaId: subcategoriasNegocio.categoriaId, nombre: subcategoriasNegocio.nombre })
        .from(subcategoriasNegocio)
        .where(eq(subcategoriasNegocio.id, id))
        .limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Subcategoría no encontrada.' };

    const set: Partial<typeof subcategoriasNegocio.$inferInsert> = {};
    if (datos.nombre !== undefined && datos.nombre.trim() !== actual.nombre) {
        const nombre = datos.nombre.trim();
        const [choca] = await db
            .select({ id: subcategoriasNegocio.id })
            .from(subcategoriasNegocio)
            .where(and(eq(subcategoriasNegocio.categoriaId, actual.categoriaId), sql`lower(${subcategoriasNegocio.nombre}) = lower(${nombre})`, ne(subcategoriasNegocio.id, id)))
            .limit(1);
        if (choca) return { ok: false, status: 409, mensaje: `Ya existe otra subcategoría llamada "${nombre}" en esta categoría.` };
        set.nombre = nombre;
    }

    if (Object.keys(set).length === 0) return { ok: true, data: { id } };

    await db.update(subcategoriasNegocio).set(set).where(eq(subcategoriasNegocio.id, id));

    await registrarAuditoria(panel, {
        accion: 'subcategoria_editar',
        entidadTipo: 'subcategoria',
        entidadId: null,
        datosPrevios: { id, nombre: actual.nombre },
        datosNuevos: set,
    });

    return { ok: true, data: { id } };
}

export async function cambiarActivaSubcategoria(
    panel: UsuarioPanel,
    id: number,
    activa: boolean,
): Promise<ResultadoAccion<{ id: number; activa: boolean }>> {
    const [actual] = await db
        .select({ id: subcategoriasNegocio.id, activa: subcategoriasNegocio.activa })
        .from(subcategoriasNegocio)
        .where(eq(subcategoriasNegocio.id, id))
        .limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Subcategoría no encontrada.' };
    if (actual.activa === activa) return { ok: true, data: { id, activa } };

    await db.update(subcategoriasNegocio).set({ activa }).where(eq(subcategoriasNegocio.id, id));

    await registrarAuditoria(panel, {
        accion: activa ? 'subcategoria_activar' : 'subcategoria_desactivar',
        entidadTipo: 'subcategoria',
        entidadId: null,
        datosPrevios: { id, activa: actual.activa },
        datosNuevos: { id, activa },
    });

    return { ok: true, data: { id, activa } };
}

export async function reordenarSubcategorias(
    panel: UsuarioPanel,
    categoriaId: number,
    ids: number[],
): Promise<ResultadoAccion<{ total: number }>> {
    const existentes = await db
        .select({ id: subcategoriasNegocio.id })
        .from(subcategoriasNegocio)
        .where(eq(subcategoriasNegocio.categoriaId, categoriaId));
    const validos = new Set(existentes.map((e) => e.id));
    let i = 0;
    for (const id of ids) {
        if (!validos.has(id)) continue;
        i += 1;
        await db.update(subcategoriasNegocio).set({ orden: i }).where(eq(subcategoriasNegocio.id, id));
    }

    await registrarAuditoria(panel, {
        accion: 'subcategoria_reordenar',
        entidadTipo: 'subcategoria',
        entidadId: null,
        datosNuevos: { categoriaId, orden: ids },
    });

    return { ok: true, data: { total: i } };
}

export async function asignarCiudadesSubcategoria(
    panel: UsuarioPanel,
    id: number,
    ciudadIds: string[],
): Promise<ResultadoAccion<{ id: number; total: number }>> {
    const [actual] = await db
        .select({ id: subcategoriasNegocio.id, categoriaId: subcategoriasNegocio.categoriaId })
        .from(subcategoriasNegocio)
        .where(eq(subcategoriasNegocio.id, id))
        .limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Subcategoría no encontrada.' };

    const faltan = await ciudadesInexistentes(ciudadIds);
    if (faltan.length) return { ok: false, status: 404, mensaje: 'Alguna de las ciudades indicadas no existe.' };

    // No puede vivir fuera de las ciudades de su categoría (si está acotada).
    const ciudadesCat = await ciudadesDeCategoria(actual.categoriaId);
    if (ciudadesCat.size && ciudadIds.some((c) => !ciudadesCat.has(c))) {
        return { ok: false, status: 409, mensaje: 'La subcategoría solo puede estar en ciudades donde su categoría también esté disponible.' };
    }

    await db.delete(subcategoriaCiudades).where(eq(subcategoriaCiudades.subcategoriaId, id));
    if (ciudadIds.length) {
        await db.insert(subcategoriaCiudades).values(ciudadIds.map((ciudadId) => ({ subcategoriaId: id, ciudadId })));
    }

    await registrarAuditoria(panel, {
        accion: 'subcategoria_asignar_ciudades',
        entidadTipo: 'subcategoria',
        entidadId: null,
        datosNuevos: { id, ciudades: ciudadIds.length || 'global' },
    });

    return { ok: true, data: { id, total: ciudadIds.length } };
}

/**
 * Hard delete de una subcategoría — excepción controlada al patrón "quitar = desactivar".
 * Guardia CRUDA: cualquier fila en asignacion_subcategorias con este subcategoriaId
 * bloquea el borrado (409), sin filtrar por negocio real/demo/borrador — esa FK sí
 * tiene onDelete: 'cascade' hacia acá, así que un borrado se propagaría en cascada
 * sin aviso y desclasificaría negocios (incluso demo o en borrador).
 */
export async function eliminarSubcategoria(
    panel: UsuarioPanel,
    id: number,
): Promise<ResultadoAccion<{ id: number }>> {
    const [actual] = await db
        .select({ id: subcategoriasNegocio.id, categoriaId: subcategoriasNegocio.categoriaId, nombre: subcategoriasNegocio.nombre })
        .from(subcategoriasNegocio)
        .where(eq(subcategoriasNegocio.id, id))
        .limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Subcategoría no encontrada.' };

    const [{ total }] = await db
        .select({ total: sql<number>`count(*)::int` })
        .from(asignacionSubcategorias)
        .where(eq(asignacionSubcategorias.subcategoriaId, id));
    if (total > 0) {
        return {
            ok: false,
            status: 409,
            mensaje: `Tiene ${total} negocio${total === 1 ? '' : 's'} clasificado${total === 1 ? '' : 's'}, desactívala en su lugar.`,
        };
    }

    await registrarAuditoria(panel, {
        accion: 'subcategoria_eliminar',
        entidadTipo: 'subcategoria',
        entidadId: null,
        datosPrevios: { id: actual.id, categoriaId: actual.categoriaId, nombre: actual.nombre },
    });

    await db.delete(subcategoriasNegocio).where(eq(subcategoriasNegocio.id, id));

    return { ok: true, data: { id } };
}
