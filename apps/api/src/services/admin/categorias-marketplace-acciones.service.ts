/**
 * admin/categorias-marketplace-acciones.service.ts
 * =================================================
 * Acciones de ESCRITURA del CRUD de categorías de MarketPlace (solo superadmin,
 * bajo el gate global de routes/admin/index.ts). Modelo simple: 1 nivel, sin
 * subcategorías ni ciudades.
 *
 * "Quitar" = DESACTIVAR (activa=false), nunca DELETE físico (integridad con
 * los artículos ya categorizados: articulos_marketplace.categoria_id).
 *
 * La LECTURA vive en `categorias-marketplace.service.ts`.
 *
 * Ubicación: apps/api/src/services/admin/categorias-marketplace-acciones.service.ts
 */

import { and, eq, ne, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { categoriasMarketplace } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';

export type ResultadoAccion<T = unknown> =
    | { ok: true; data: T }
    | { ok: false; status: number; mensaje: string };

async function siguienteOrden(): Promise<number> {
    const [r] = await db
        .select({ max: sql<number>`coalesce(max(${categoriasMarketplace.orden}), 0)::int` })
        .from(categoriasMarketplace);
    return (r?.max ?? 0) + 1;
}

// ─ CREAR ─
export async function crearCategoria(
    panel: UsuarioPanel,
    datos: { nombre: string },
): Promise<ResultadoAccion<{ id: number }>> {
    const nombre = datos.nombre.trim();
    const [choca] = await db
        .select({ id: categoriasMarketplace.id })
        .from(categoriasMarketplace)
        .where(sql`lower(${categoriasMarketplace.nombre}) = lower(${nombre})`)
        .limit(1);
    if (choca) {
        return { ok: false, status: 409, mensaje: `Ya existe una categoría llamada "${nombre}".` };
    }

    const orden = await siguienteOrden();
    const [creada] = await db
        .insert(categoriasMarketplace)
        .values({ nombre, orden, activa: true })
        .returning({ id: categoriasMarketplace.id });

    // entidad_id es null: los ids del catálogo son serial (no uuid). El id real
    // va en datosNuevos (patrón de Categorías de negocios / Configuración).
    await registrarAuditoria(panel, {
        accion: 'categoria_marketplace_crear',
        entidadTipo: 'categoria_marketplace',
        entidadId: null,
        datosNuevos: { id: creada.id, nombre },
    });

    return { ok: true, data: { id: creada.id } };
}

// ─ EDITAR ─
export async function editarCategoria(
    panel: UsuarioPanel,
    id: number,
    datos: { nombre?: string },
): Promise<ResultadoAccion<{ id: number }>> {
    const [actual] = await db
        .select({ id: categoriasMarketplace.id, nombre: categoriasMarketplace.nombre })
        .from(categoriasMarketplace)
        .where(eq(categoriasMarketplace.id, id))
        .limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Categoría no encontrada.' };

    const set: Partial<typeof categoriasMarketplace.$inferInsert> = {};
    if (datos.nombre !== undefined && datos.nombre.trim() !== actual.nombre) {
        const nombre = datos.nombre.trim();
        const [choca] = await db
            .select({ id: categoriasMarketplace.id })
            .from(categoriasMarketplace)
            .where(
                and(
                    sql`lower(${categoriasMarketplace.nombre}) = lower(${nombre})`,
                    ne(categoriasMarketplace.id, id),
                ),
            )
            .limit(1);
        if (choca) {
            return { ok: false, status: 409, mensaje: `Ya existe otra categoría llamada "${nombre}".` };
        }
        set.nombre = nombre;
    }

    if (Object.keys(set).length === 0) return { ok: true, data: { id } };

    await db.update(categoriasMarketplace).set(set).where(eq(categoriasMarketplace.id, id));

    await registrarAuditoria(panel, {
        accion: 'categoria_marketplace_editar',
        entidadTipo: 'categoria_marketplace',
        entidadId: null,
        datosPrevios: { id, nombre: actual.nombre },
        datosNuevos: { id, ...set },
    });

    return { ok: true, data: { id } };
}

// ─ CAMBIAR ACTIVA ─
export async function cambiarActivaCategoria(
    panel: UsuarioPanel,
    id: number,
    activa: boolean,
): Promise<ResultadoAccion<{ id: number; activa: boolean }>> {
    const [actual] = await db
        .select({ id: categoriasMarketplace.id, activa: categoriasMarketplace.activa })
        .from(categoriasMarketplace)
        .where(eq(categoriasMarketplace.id, id))
        .limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Categoría no encontrada.' };
    if (actual.activa === activa) return { ok: true, data: { id, activa } };

    await db.update(categoriasMarketplace).set({ activa }).where(eq(categoriasMarketplace.id, id));

    await registrarAuditoria(panel, {
        accion: activa ? 'categoria_marketplace_activar' : 'categoria_marketplace_desactivar',
        entidadTipo: 'categoria_marketplace',
        entidadId: null,
        datosPrevios: { id, activa: actual.activa },
        datosNuevos: { id, activa },
    });

    return { ok: true, data: { id, activa } };
}

// ─ REORDENAR ─
export async function reordenarCategorias(
    panel: UsuarioPanel,
    ids: number[],
): Promise<ResultadoAccion<{ total: number }>> {
    const existentes = await db
        .select({ id: categoriasMarketplace.id })
        .from(categoriasMarketplace);
    const validos = new Set(existentes.map((e) => e.id));
    let i = 0;
    for (const id of ids) {
        if (!validos.has(id)) continue;
        i += 1;
        await db.update(categoriasMarketplace).set({ orden: i }).where(eq(categoriasMarketplace.id, id));
    }

    await registrarAuditoria(panel, {
        accion: 'categoria_marketplace_reordenar',
        entidadTipo: 'categoria_marketplace',
        entidadId: null,
        datosNuevos: { orden: ids },
    });

    return { ok: true, data: { total: i } };
}
