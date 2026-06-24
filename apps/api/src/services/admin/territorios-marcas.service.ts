/**
 * admin/territorios-marcas.service.ts
 * ===================================
 * Marcas (pines) PERSONALES del vendedor sobre su pedazo del mapa (Territorios · G.2).
 * El vendedor las gestiona (CRUD); cada marca tiene un estado (tipo) y una nota. Son suyas
 * (ligadas a su `embajador_id`). Super/gerente solo las verán a futuro (no aquí).
 *
 * Ubicación: apps/api/src/services/admin/territorios-marcas.service.ts
 */

import { desc, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { territorioMarcas, embajadores } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import type { CrearMarcaInput, EditarMarcaInput } from '../../validations/admin/territorios.schema.js';

export type ResultadoAccion<T = unknown> =
    | { ok: true; data: T }
    | { ok: false; status: number; mensaje: string };

export interface MarcaTerritorio {
    id: string;
    lat: number;
    lng: number;
    tipo: string;
    nota: string | null;
    createdAt: string | null;
}

/** El embajador (vendedor) ligado al usuario, o null si no es vendedor. */
async function embajadorDelUsuario(usuarioId: string): Promise<string | null> {
    const [e] = await db.select({ id: embajadores.id }).from(embajadores).where(eq(embajadores.usuarioId, usuarioId)).limit(1);
    return e?.id ?? null;
}

/** Las marcas del vendedor (su capa personal). Solo el vendedor; otros roles → []. */
export async function listarMisMarcas(panel: UsuarioPanel): Promise<MarcaTerritorio[]> {
    if (panel.rolEquipo !== 'vendedor' || !panel.usuarioId) return [];
    const embId = await embajadorDelUsuario(panel.usuarioId);
    if (!embId) return [];
    return db
        .select({
            id: territorioMarcas.id,
            lat: territorioMarcas.lat,
            lng: territorioMarcas.lng,
            tipo: territorioMarcas.tipo,
            nota: territorioMarcas.nota,
            createdAt: territorioMarcas.createdAt,
        })
        .from(territorioMarcas)
        .where(eq(territorioMarcas.embajadorId, embId))
        .orderBy(desc(territorioMarcas.createdAt));
}

/** Crear una marca del vendedor. */
export async function crearMarca(panel: UsuarioPanel, datos: CrearMarcaInput): Promise<ResultadoAccion<{ id: string }>> {
    if (panel.rolEquipo !== 'vendedor' || !panel.usuarioId) return { ok: false, status: 403, mensaje: 'Solo el vendedor pone marcas.' };
    const embId = await embajadorDelUsuario(panel.usuarioId);
    if (!embId) return { ok: false, status: 403, mensaje: 'No eres un vendedor.' };

    const [m] = await db
        .insert(territorioMarcas)
        .values({ embajadorId: embId, lat: datos.lat, lng: datos.lng, tipo: datos.tipo, nota: datos.nota?.trim() || null, ciudadId: datos.ciudadId ?? null })
        .returning({ id: territorioMarcas.id });
    return { ok: true, data: { id: m.id } };
}

/** Verifica que la marca exista y sea del vendedor (fuera de alcance → 404). */
async function cargarMarcaPropia(panel: UsuarioPanel, id: string): Promise<ResultadoAccion<{ id: string }>> {
    if (panel.rolEquipo !== 'vendedor' || !panel.usuarioId) return { ok: false, status: 403, mensaje: 'No autorizado.' };
    const embId = await embajadorDelUsuario(panel.usuarioId);
    if (!embId) return { ok: false, status: 403, mensaje: 'No eres un vendedor.' };
    const [m] = await db.select({ embajadorId: territorioMarcas.embajadorId }).from(territorioMarcas).where(eq(territorioMarcas.id, id)).limit(1);
    if (!m || m.embajadorId !== embId) return { ok: false, status: 404, mensaje: 'Marca no encontrada.' };
    return { ok: true, data: { id } };
}

/** Editar el estado y/o la nota de una marca. */
export async function editarMarca(panel: UsuarioPanel, id: string, datos: EditarMarcaInput): Promise<ResultadoAccion<{ id: string }>> {
    const propia = await cargarMarcaPropia(panel, id);
    if (!propia.ok) return propia;
    const cambios: Partial<typeof territorioMarcas.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (datos.lat !== undefined) cambios.lat = datos.lat;
    if (datos.lng !== undefined) cambios.lng = datos.lng;
    if (datos.tipo !== undefined) cambios.tipo = datos.tipo;
    if (datos.nota !== undefined) cambios.nota = datos.nota?.trim() || null;
    await db.update(territorioMarcas).set(cambios).where(eq(territorioMarcas.id, id));
    return { ok: true, data: { id } };
}

/** Borrar una marca. */
export async function borrarMarca(panel: UsuarioPanel, id: string): Promise<ResultadoAccion<{ id: string }>> {
    const propia = await cargarMarcaPropia(panel, id);
    if (!propia.ok) return propia;
    await db.delete(territorioMarcas).where(eq(territorioMarcas.id, id));
    return { ok: true, data: { id } };
}
