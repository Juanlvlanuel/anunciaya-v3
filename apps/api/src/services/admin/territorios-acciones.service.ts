/**
 * admin/territorios-acciones.service.ts
 * =====================================
 * Acciones de ESCRITURA del módulo Territorios (Panel · Fase 2): crear / editar / asignar /
 * borrar zonas del mapa. Super + gerente (el vendedor no actúa). El gerente solo opera sobre
 * ciudades de SU región; el super, sobre cualquiera.
 *
 * La LECTURA (listar zonas) vive en `territorios.service.ts`.
 *
 * No-traslape: crear/editar valida con turf que el polígono no se solape EN ÁREA con otra zona de
 * la misma ciudad (compartir un borde = OK). El "pegado a calles" (snapping) del dibujo es del front.
 *
 * Ubicación: apps/api/src/services/admin/territorios-acciones.service.ts
 */

import { and, eq, ne } from 'drizzle-orm';
import { polygon as turfPolygon, featureCollection, intersect, area } from '@turf/turf';
import { db } from '../../db/index.js';
import { territorioZonas, ciudades, embajadores } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import type { CrearZonaInput, EditarZonaInput } from '../../validations/admin/territorios.schema.js';

export type ResultadoAccion<T = unknown> =
    | { ok: true; data: T }
    | { ok: false; status: number; mensaje: string };

// =============================================================================
// HELPERS DE ALCANCE
// =============================================================================

/** ¿La ciudad cae en el alcance del rol? (super = cualquiera · gerente = su región). */
async function ciudadEnAlcance(panel: UsuarioPanel, ciudadId: string): Promise<boolean> {
    if (panel.rolEquipo === 'superadmin') return true;
    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return false;
        const [c] = await db.select({ regionId: ciudades.regionId }).from(ciudades).where(eq(ciudades.id, ciudadId)).limit(1);
        return !!c && c.regionId === panel.regionId;
    }
    return false;
}

/**
 * Carga una zona y verifica que el rol pueda gestionarla (fuera → 404/403):
 *   - super   → SOLO las zonas que él mismo creó (no toca las de los gerentes).
 *   - gerente → cualquier zona de su región.
 */
async function cargarZonaConAlcance(
    panel: UsuarioPanel,
    id: string,
): Promise<ResultadoAccion<{ id: string; ciudadId: string; embajadorId: string | null; creadaPor: string | null }>> {
    const [z] = await db
        .select({ id: territorioZonas.id, ciudadId: territorioZonas.ciudadId, embajadorId: territorioZonas.embajadorId, creadaPor: territorioZonas.creadaPor })
        .from(territorioZonas)
        .where(eq(territorioZonas.id, id))
        .limit(1);
    if (!z) return { ok: false, status: 404, mensaje: 'Zona no encontrada.' };
    if (panel.rolEquipo === 'superadmin') {
        if (z.creadaPor !== panel.usuarioId) return { ok: false, status: 403, mensaje: 'Solo puedes editar las zonas que tú creaste.' };
        return { ok: true, data: z };
    }
    if (!(await ciudadEnAlcance(panel, z.ciudadId))) return { ok: false, status: 404, mensaje: 'Zona no encontrada.' };
    return { ok: true, data: z };
}

/** ¿Existe el embajador (vendedor)? */
async function embajadorExiste(embajadorId: string): Promise<boolean> {
    const [e] = await db.select({ id: embajadores.id }).from(embajadores).where(eq(embajadores.id, embajadorId)).limit(1);
    return !!e;
}

// =============================================================================
// NO-TRASLAPE (turf)
// =============================================================================

/** Asegura que cada anillo esté cerrado (primer punto = último) para que turf no falle. */
function cerrarAnillos(coords: number[][][]): number[][][] {
    return coords.map((anillo) => {
        if (anillo.length < 3) return anillo;
        const a = anillo[0];
        const b = anillo[anillo.length - 1];
        return a[0] === b[0] && a[1] === b[1] ? anillo : [...anillo, a];
    });
}

/**
 * ¿El polígono nuevo se solapa EN ÁREA con otra zona de la misma ciudad? Compartir solo un borde
 * (zonas adyacentes) NO cuenta: se exige que el área de intersección supere el 1% de la zona más
 * chica (tolera "slivers" por bordes dibujados a mano que no coinciden al milímetro).
 */
async function seSolapaConOtraZona(ciudadId: string, poligono: { coordinates: number[][][] }, excluirId?: string): Promise<boolean> {
    const cond = excluirId
        ? and(eq(territorioZonas.ciudadId, ciudadId), ne(territorioZonas.id, excluirId))
        : eq(territorioZonas.ciudadId, ciudadId);
    const otras = await db.select({ poligono: territorioZonas.poligono }).from(territorioZonas).where(cond);
    if (otras.length === 0) return false;

    let nuevo;
    try {
        nuevo = turfPolygon(cerrarAnillos(poligono.coordinates));
    } catch {
        return false; // polígono inválido → no bloqueamos por traslape (el Zod/insert lo atajan)
    }
    const areaNuevo = area(nuevo);

    for (const o of otras) {
        const geo = o.poligono as { type?: string; coordinates?: number[][][] } | null;
        if (!geo || geo.type !== 'Polygon' || !geo.coordinates) continue;
        try {
            const otro = turfPolygon(cerrarAnillos(geo.coordinates));
            const inter = intersect(featureCollection([nuevo, otro]));
            if (!inter) continue;
            const areaMin = Math.min(areaNuevo, area(otro)) || 1;
            if (area(inter) > areaMin * 0.01) return true;
        } catch {
            continue;
        }
    }
    return false;
}

// =============================================================================
// ACCIONES
// =============================================================================

/** Crear una zona (polígono) en una ciudad, opcionalmente asignada a un vendedor. */
export async function crearZona(panel: UsuarioPanel, datos: CrearZonaInput): Promise<ResultadoAccion<{ id: string }>> {
    if (!(await ciudadEnAlcance(panel, datos.ciudadId))) {
        return { ok: false, status: 403, mensaje: 'No puedes crear zonas en esta ciudad.' };
    }
    if (datos.embajadorId && !(await embajadorExiste(datos.embajadorId))) {
        return { ok: false, status: 404, mensaje: 'El vendedor indicado no existe.' };
    }
    if (await seSolapaConOtraZona(datos.ciudadId, datos.poligono)) {
        return { ok: false, status: 409, mensaje: 'La zona se traslapa con otra de la misma ciudad. Ajusta el contorno.' };
    }

    const [creada] = await db
        .insert(territorioZonas)
        .values({
            ciudadId: datos.ciudadId,
            embajadorId: datos.embajadorId ?? null,
            nombre: datos.nombre.trim(),
            poligono: datos.poligono,
            color: datos.color ?? null,
            creadaPor: panel.usuarioId,
        })
        .returning({ id: territorioZonas.id });

    await registrarAuditoria(panel, {
        accion: 'territorio_crear_zona',
        entidadTipo: 'territorio_zona',
        entidadId: creada.id,
        datosPrevios: null,
        datosNuevos: { ciudadId: datos.ciudadId, nombre: datos.nombre.trim(), embajadorId: datos.embajadorId ?? null },
        motivo: null,
    });

    return { ok: true, data: { id: creada.id } };
}

/** Editar una zona (nombre / polígono / color). */
export async function editarZona(panel: UsuarioPanel, id: string, datos: EditarZonaInput): Promise<ResultadoAccion<{ id: string }>> {
    const cargada = await cargarZonaConAlcance(panel, id);
    if (!cargada.ok) return cargada;

    if (datos.poligono !== undefined && (await seSolapaConOtraZona(cargada.data.ciudadId, datos.poligono, id))) {
        return { ok: false, status: 409, mensaje: 'La zona se traslapa con otra de la misma ciudad. Ajusta el contorno.' };
    }

    const cambios: Partial<typeof territorioZonas.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (datos.nombre !== undefined) cambios.nombre = datos.nombre.trim();
    if (datos.poligono !== undefined) cambios.poligono = datos.poligono;
    if (datos.color !== undefined) cambios.color = datos.color;

    await db.update(territorioZonas).set(cambios).where(eq(territorioZonas.id, id));

    await registrarAuditoria(panel, {
        accion: 'territorio_editar_zona',
        entidadTipo: 'territorio_zona',
        entidadId: id,
        datosPrevios: null,
        datosNuevos: { nombre: datos.nombre, recorto: datos.poligono !== undefined, color: datos.color },
        motivo: null,
    });

    return { ok: true, data: { id } };
}

/** Asignar / reasignar / quitar (null) el vendedor de una zona. */
export async function asignarZona(panel: UsuarioPanel, id: string, embajadorId: string | null): Promise<ResultadoAccion<{ id: string }>> {
    const cargada = await cargarZonaConAlcance(panel, id);
    if (!cargada.ok) return cargada;
    if (embajadorId && !(await embajadorExiste(embajadorId))) {
        return { ok: false, status: 404, mensaje: 'El vendedor indicado no existe.' };
    }

    await db.update(territorioZonas).set({ embajadorId, updatedAt: new Date().toISOString() }).where(eq(territorioZonas.id, id));

    await registrarAuditoria(panel, {
        accion: 'territorio_asignar_zona',
        entidadTipo: 'territorio_zona',
        entidadId: id,
        datosPrevios: { embajadorId: cargada.data.embajadorId },
        datosNuevos: { embajadorId },
        motivo: null,
    });

    return { ok: true, data: { id } };
}

/** Borrar una zona (definitivo). */
export async function borrarZona(panel: UsuarioPanel, id: string): Promise<ResultadoAccion<{ id: string }>> {
    const cargada = await cargarZonaConAlcance(panel, id);
    if (!cargada.ok) return cargada;

    await db.delete(territorioZonas).where(eq(territorioZonas.id, id));

    await registrarAuditoria(panel, {
        accion: 'territorio_borrar_zona',
        entidadTipo: 'territorio_zona',
        entidadId: id,
        datosPrevios: { ciudadId: cargada.data.ciudadId, embajadorId: cargada.data.embajadorId },
        datosNuevos: null,
        motivo: null,
    });

    return { ok: true, data: { id } };
}
