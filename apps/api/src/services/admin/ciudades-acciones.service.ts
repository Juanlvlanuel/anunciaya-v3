/**
 * admin/ciudades-acciones.service.ts
 * ==================================
 * Acciones de ESCRITURA del módulo Ciudades del Panel (Fase 2). Solo superadmin
 * (la ruta va bajo el gate global de superadmin en routes/admin/index.ts).
 *
 * Ciudad:  crearCiudad · crearCiudadesMultiple (alta desde el mapa) · editarCiudad ·
 *          cambiarActivaCiudad · asignarRegionCiudad / asignarRegionMultiple (agrupar).
 * Región:  crearRegion · editarRegion (renombrar/activar/desactivar). Sin eliminar.
 *
 * GUARD "una región": un vendedor solo cubre ciudades de una misma región (lo impone
 * un trigger al tocar `embajador_ciudades`, pero NO al mover una ciudad de región). Por
 * eso, antes de cambiar/quitar la región de una ciudad cubierta por vendedores, se
 * verifica que no quede ninguno cubriendo dos regiones.
 *
 * La LECTURA (catálogo + regiones) vive en `ciudades.service.ts`.
 *
 * Ubicación: apps/api/src/services/admin/ciudades-acciones.service.ts
 */

import { and, eq, ne, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { ciudades, regiones } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { slugCiudad } from '../../utils/ciudades.js';

export type ResultadoAccion<T = unknown> =
    | { ok: true; data: T }
    | { ok: false; status: number; mensaje: string };

export interface DatosCiudadAlta {
    nombre: string;
    estado: string;
    lat: number;
    lng: number;
    pais?: string;
    regionId?: string | null;
    importancia?: number;
    activa?: boolean;
    alias?: string[];
}

export interface DatosCiudadEditar {
    nombre?: string;
    estado?: string;
    lat?: number;
    lng?: number;
    importancia?: number;
    alias?: string[];
}

// =============================================================================
// HELPERS
// =============================================================================

/** ¿Existe la región? */
async function regionExiste(regionId: string): Promise<boolean> {
    const [r] = await db.select({ id: regiones.id }).from(regiones).where(eq(regiones.id, regionId)).limit(1);
    return !!r;
}

/**
 * Vendedores (por nombre) que quedarían cubriendo DOS regiones si la ciudad `ciudadId`
 * pasara a `nuevaRegion` (null = quitarle la región). [] si no hay conflicto.
 *   - nuevaRegion = null  → cualquier vendedor que cubra la ciudad entra en conflicto
 *     (no puede cubrir una ciudad sin región).
 *   - nuevaRegion ≠ null  → vendedores que cubren la ciudad Y además cubren otra ciudad
 *     cuya región es distinta de `nuevaRegion`.
 */
async function vendedoresEnConflicto(ciudadId: string, nuevaRegion: string | null): Promise<string[]> {
    const filas = (nuevaRegion === null
        ? await db.execute(sql`
            SELECT DISTINCT u.nombre AS nombre
            FROM embajador_ciudades ec
            JOIN embajadores e ON e.id = ec.embajador_id
            JOIN usuarios u ON u.id = e.usuario_id
            WHERE ec.ciudad_id = ${ciudadId}
          `)
        : await db.execute(sql`
            SELECT DISTINCT u.nombre AS nombre
            FROM embajador_ciudades ec
            JOIN embajadores e ON e.id = ec.embajador_id
            JOIN usuarios u ON u.id = e.usuario_id
            WHERE ec.embajador_id IN (SELECT embajador_id FROM embajador_ciudades WHERE ciudad_id = ${ciudadId})
              AND ec.ciudad_id <> ${ciudadId}
              AND EXISTS (
                SELECT 1 FROM ciudades c
                WHERE c.id = ec.ciudad_id AND c.region_id IS DISTINCT FROM ${nuevaRegion}
              )
          `)
    ).rows as Array<{ nombre: string }>;
    return filas.map((f) => f.nombre);
}

// =============================================================================
// CIUDAD
// =============================================================================

export async function crearCiudad(panel: UsuarioPanel, datos: DatosCiudadAlta): Promise<ResultadoAccion<{ id: string }>> {
    const slug = slugCiudad(datos.nombre);
    if (!slug) return { ok: false, status: 400, mensaje: 'El nombre de la ciudad no es válido.' };

    const [existe] = await db.select({ id: ciudades.id }).from(ciudades).where(eq(ciudades.slug, slug)).limit(1);
    if (existe) return { ok: false, status: 409, mensaje: `Ya existe una ciudad registrada como "${datos.nombre.trim()}".` };

    if (datos.regionId && !(await regionExiste(datos.regionId))) {
        return { ok: false, status: 404, mensaje: 'La región indicada no existe.' };
    }

    const [creada] = await db
        .insert(ciudades)
        .values({
            nombre: datos.nombre.trim(),
            estado: datos.estado.trim(),
            pais: datos.pais?.trim() || 'México',
            slug,
            lat: datos.lat,
            lng: datos.lng,
            alias: datos.alias && datos.alias.length ? datos.alias : null,
            importancia: datos.importancia ?? 0,
            activa: datos.activa ?? true,
            regionId: datos.regionId ?? null,
        })
        .returning({ id: ciudades.id });

    await registrarAuditoria(panel, {
        accion: 'ciudad_crear',
        entidadTipo: 'ciudad',
        entidadId: creada.id,
        datosNuevos: { nombre: datos.nombre.trim(), estado: datos.estado.trim(), slug, regionId: datos.regionId ?? null },
    });

    return { ok: true, data: { id: creada.id } };
}

export async function crearCiudadesMultiple(
    panel: UsuarioPanel,
    lista: DatosCiudadAlta[],
    regionComun?: string | null,
): Promise<ResultadoAccion<{ creadas: number; omitidas: string[] }>> {
    if (regionComun && !(await regionExiste(regionComun))) {
        return { ok: false, status: 404, mensaje: 'La región indicada no existe.' };
    }

    const conSlug = lista
        .map((c) => ({ datos: c, slug: slugCiudad(c.nombre) }))
        .filter((x) => x.slug);

    const slugs = [...new Set(conSlug.map((x) => x.slug))];
    const existentes = slugs.length
        ? await db.select({ slug: ciudades.slug }).from(ciudades).where(inArray(ciudades.slug, slugs))
        : [];
    const yaExisten = new Set(existentes.map((e) => e.slug));

    const vistos = new Set<string>();
    const omitidas: string[] = [];
    const nuevas: typeof ciudades.$inferInsert[] = [];

    for (const { datos, slug } of conSlug) {
        if (yaExisten.has(slug) || vistos.has(slug)) {
            omitidas.push(datos.nombre.trim());
            continue;
        }
        vistos.add(slug);
        nuevas.push({
            nombre: datos.nombre.trim(),
            estado: datos.estado.trim(),
            pais: datos.pais?.trim() || 'México',
            slug,
            lat: datos.lat,
            lng: datos.lng,
            alias: datos.alias && datos.alias.length ? datos.alias : null,
            importancia: datos.importancia ?? 0,
            activa: datos.activa ?? true,
            regionId: regionComun ?? datos.regionId ?? null,
        });
    }

    if (nuevas.length) await db.insert(ciudades).values(nuevas);

    await registrarAuditoria(panel, {
        accion: 'ciudad_crear_multiple',
        entidadTipo: 'ciudad',
        entidadId: null,
        // Guarda los NOMBRES creados (no solo el conteo) para que la auditoría diga QUÉ ciudades.
        datosNuevos: { ciudades: nuevas.map((n) => n.nombre), omitidas, regionComun: regionComun ?? null },
    });

    return { ok: true, data: { creadas: nuevas.length, omitidas } };
}

export async function editarCiudad(panel: UsuarioPanel, id: string, datos: DatosCiudadEditar): Promise<ResultadoAccion<{ id: string }>> {
    const [actual] = await db
        .select({ id: ciudades.id, nombre: ciudades.nombre, estado: ciudades.estado, slug: ciudades.slug })
        .from(ciudades)
        .where(eq(ciudades.id, id))
        .limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Ciudad no encontrada.' };

    const set: Partial<typeof ciudades.$inferInsert> = {};
    let slugNuevo = actual.slug;

    if (datos.nombre !== undefined && datos.nombre.trim() !== actual.nombre) {
        const slug = slugCiudad(datos.nombre);
        if (!slug) return { ok: false, status: 400, mensaje: 'El nombre de la ciudad no es válido.' };
        const [choca] = await db.select({ id: ciudades.id }).from(ciudades).where(and(eq(ciudades.slug, slug), ne(ciudades.id, id))).limit(1);
        if (choca) return { ok: false, status: 409, mensaje: `Ya existe otra ciudad registrada como "${datos.nombre.trim()}".` };
        set.nombre = datos.nombre.trim();
        set.slug = slug;
        slugNuevo = slug;
    }
    if (datos.estado !== undefined) set.estado = datos.estado.trim();
    if (datos.lat !== undefined) set.lat = datos.lat;
    if (datos.lng !== undefined) set.lng = datos.lng;
    if (datos.importancia !== undefined) set.importancia = datos.importancia;
    if (datos.alias !== undefined) set.alias = datos.alias.length ? datos.alias : null;

    if (Object.keys(set).length === 0) return { ok: true, data: { id } };

    await db.update(ciudades).set(set).where(eq(ciudades.id, id));

    await registrarAuditoria(panel, {
        accion: 'ciudad_editar',
        entidadTipo: 'ciudad',
        entidadId: id,
        datosPrevios: { nombre: actual.nombre, estado: actual.estado, slug: actual.slug },
        datosNuevos: { ...set, slug: slugNuevo },
    });

    return { ok: true, data: { id } };
}

export async function cambiarActivaCiudad(panel: UsuarioPanel, id: string, activa: boolean): Promise<ResultadoAccion<{ id: string; activa: boolean }>> {
    const [actual] = await db.select({ id: ciudades.id, activa: ciudades.activa }).from(ciudades).where(eq(ciudades.id, id)).limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Ciudad no encontrada.' };
    if (actual.activa === activa) return { ok: true, data: { id, activa } };

    await db.update(ciudades).set({ activa }).where(eq(ciudades.id, id));

    await registrarAuditoria(panel, {
        accion: activa ? 'ciudad_activar' : 'ciudad_desactivar',
        entidadTipo: 'ciudad',
        entidadId: id,
        datosPrevios: { activa: actual.activa },
        datosNuevos: { activa },
    });

    return { ok: true, data: { id, activa } };
}

export async function asignarRegionCiudad(panel: UsuarioPanel, id: string, regionId: string | null): Promise<ResultadoAccion<{ id: string }>> {
    const [actual] = await db.select({ id: ciudades.id, regionId: ciudades.regionId }).from(ciudades).where(eq(ciudades.id, id)).limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Ciudad no encontrada.' };
    if (regionId && !(await regionExiste(regionId))) return { ok: false, status: 404, mensaje: 'La región indicada no existe.' };
    if (actual.regionId === regionId) return { ok: true, data: { id } };

    const conflicto = await vendedoresEnConflicto(id, regionId);
    if (conflicto.length) {
        const mensaje =
            regionId === null
                ? `No se puede quitar la región: ${conflicto.join(', ')} cubre(n) esta ciudad y cada vendedor debe cubrir una sola región.`
                : `Mover esta ciudad dejaría a ${conflicto.join(', ')} cubriendo dos regiones. Reasigna su cobertura primero.`;
        return { ok: false, status: 409, mensaje };
    }

    await db.update(ciudades).set({ regionId }).where(eq(ciudades.id, id));

    await registrarAuditoria(panel, {
        accion: 'ciudad_asignar_region',
        entidadTipo: 'ciudad',
        entidadId: id,
        datosPrevios: { regionId: actual.regionId },
        datosNuevos: { regionId },
    });

    return { ok: true, data: { id } };
}

export async function asignarRegionMultiple(
    panel: UsuarioPanel,
    ciudadIds: string[],
    regionId: string | null,
): Promise<ResultadoAccion<{ asignadas: number; bloqueadas: Array<{ id: string; motivo: string }> }>> {
    if (regionId && !(await regionExiste(regionId))) return { ok: false, status: 404, mensaje: 'La región indicada no existe.' };

    const bloqueadas: Array<{ id: string; motivo: string }> = [];
    const aAsignar: string[] = [];
    for (const id of ciudadIds) {
        const conflicto = await vendedoresEnConflicto(id, regionId);
        if (conflicto.length) bloqueadas.push({ id, motivo: conflicto.join(', ') });
        else aAsignar.push(id);
    }

    if (aAsignar.length) await db.update(ciudades).set({ regionId }).where(inArray(ciudades.id, aAsignar));

    await registrarAuditoria(panel, {
        accion: 'ciudad_asignar_region_multiple',
        entidadTipo: 'ciudad',
        entidadId: null,
        datosNuevos: { regionId, asignadas: aAsignar.length, bloqueadas: bloqueadas.length },
    });

    return { ok: true, data: { asignadas: aAsignar.length, bloqueadas } };
}

// =============================================================================
// REGIÓN
// =============================================================================

export async function crearRegion(panel: UsuarioPanel, nombre: string): Promise<ResultadoAccion<{ id: string }>> {
    const limpio = nombre.trim();
    const [existe] = await db.select({ id: regiones.id }).from(regiones).where(sql`lower(${regiones.nombre}) = lower(${limpio})`).limit(1);
    if (existe) return { ok: false, status: 409, mensaje: `Ya existe una región llamada "${limpio}".` };

    const [creada] = await db.insert(regiones).values({ nombre: limpio, activa: true }).returning({ id: regiones.id });

    await registrarAuditoria(panel, {
        accion: 'region_crear',
        entidadTipo: 'region',
        entidadId: creada.id,
        datosNuevos: { nombre: limpio },
    });

    return { ok: true, data: { id: creada.id } };
}

export async function editarRegion(panel: UsuarioPanel, id: string, datos: { nombre?: string; activa?: boolean }): Promise<ResultadoAccion<{ id: string }>> {
    const [actual] = await db.select({ id: regiones.id, nombre: regiones.nombre, activa: regiones.activa }).from(regiones).where(eq(regiones.id, id)).limit(1);
    if (!actual) return { ok: false, status: 404, mensaje: 'Región no encontrada.' };

    const set: { nombre?: string; activa?: boolean } = {};
    if (datos.nombre !== undefined && datos.nombre.trim() !== actual.nombre) {
        const limpio = datos.nombre.trim();
        const [choca] = await db.select({ id: regiones.id }).from(regiones).where(and(sql`lower(${regiones.nombre}) = lower(${limpio})`, ne(regiones.id, id))).limit(1);
        if (choca) return { ok: false, status: 409, mensaje: `Ya existe otra región llamada "${limpio}".` };
        set.nombre = limpio;
    }
    if (datos.activa !== undefined) set.activa = datos.activa;

    if (Object.keys(set).length === 0) return { ok: true, data: { id } };

    await db.update(regiones).set(set).where(eq(regiones.id, id));

    await registrarAuditoria(panel, {
        accion: 'region_editar',
        entidadTipo: 'region',
        entidadId: id,
        datosPrevios: { nombre: actual.nombre, activa: actual.activa },
        datosNuevos: set,
    });

    return { ok: true, data: { id } };
}
