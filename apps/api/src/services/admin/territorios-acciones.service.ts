/**
 * admin/territorios-acciones.service.ts
 * =====================================
 * Acciones de ESCRITURA del módulo Territorios (Panel · Fase 2): crear / editar / asignar /
 * borrar zonas del mapa. Super + gerente (el vendedor no actúa). El gerente solo opera sobre
 * ciudades de SU región; el super, sobre cualquiera.
 *
 * La LECTURA (listar zonas) vive en `territorios.service.ts`.
 *
 * Pendiente (siguiente sub-paso de Fase 2): validación de NO-TRASLAPE entre zonas de la misma
 * ciudad (requiere turf.js) y el "pegado a calles" (snapping) del dibujo.
 *
 * Ubicación: apps/api/src/services/admin/territorios-acciones.service.ts
 */

import { eq } from 'drizzle-orm';
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

/** Carga una zona y verifica que su ciudad esté en el alcance del rol (fuera → 404). */
async function cargarZonaConAlcance(
    panel: UsuarioPanel,
    id: string,
): Promise<ResultadoAccion<{ id: string; ciudadId: string; embajadorId: string | null }>> {
    const [z] = await db
        .select({ id: territorioZonas.id, ciudadId: territorioZonas.ciudadId, embajadorId: territorioZonas.embajadorId })
        .from(territorioZonas)
        .where(eq(territorioZonas.id, id))
        .limit(1);
    if (!z) return { ok: false, status: 404, mensaje: 'Zona no encontrada.' };
    if (!(await ciudadEnAlcance(panel, z.ciudadId))) return { ok: false, status: 404, mensaje: 'Zona no encontrada.' };
    return { ok: true, data: z };
}

/** ¿Existe el embajador (vendedor)? */
async function embajadorExiste(embajadorId: string): Promise<boolean> {
    const [e] = await db.select({ id: embajadores.id }).from(embajadores).where(eq(embajadores.id, embajadorId)).limit(1);
    return !!e;
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
