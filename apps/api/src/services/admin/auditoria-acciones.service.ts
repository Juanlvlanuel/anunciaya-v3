/**
 * admin/auditoria-acciones.service.ts
 * ===================================
 * Acciones de ESCRITURA de la sección Auditoría: borrar registros de la bitácora.
 *
 * ⚠️ Borrar auditoría va contra su propósito (es un registro de responsabilidad). Se permite
 * SOLO al SuperAdmin y está pensado para LIMPIEZA en staging/desarrollo (depurar datos de
 * prueba). El gate de rol vive en la ruta; aquí solo el borrado.
 *
 * Ubicación: apps/api/src/services/admin/auditoria-acciones.service.ts
 */

import { and, eq, gte, lte, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { adminAuditoria } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { condicionAlcance, type FiltrosAuditoria } from './auditoria-consulta.service.js';

/** Borra un registro de auditoría por id. Devuelve si existía. */
export async function eliminarAuditoria(id: string): Promise<{ ok: boolean }> {
    const borradas = await db.delete(adminAuditoria).where(eq(adminAuditoria.id, id)).returning({ id: adminAuditoria.id });
    return { ok: borradas.length > 0 };
}

/** Filtros que respeta el vaciado: los MISMOS de la lista, sin paginación ni orden. */
export type FiltrosVaciar = Pick<FiltrosAuditoria, 'actorId' | 'accion' | 'entidadTipo' | 'entidadId' | 'desde' | 'hasta'>;

/**
 * Vacía la bitácora RESPETANDO los filtros activos (acción / persona / periodo) y el alcance del
 * panel: construye EXACTAMENTE el mismo WHERE que `listarAuditoria`, para borrar solo lo que se ve.
 * Sin ningún filtro → borra todo. Devuelve cuántas borró.
 */
export async function vaciarAuditoria(panel: UsuarioPanel, filtros: FiltrosVaciar = {}): Promise<{ borradas: number }> {
    const alcance = await condicionAlcance(panel);
    if (alcance === 'vacio') return { borradas: 0 };
    const cond: SQL[] = [];
    if (alcance) cond.push(alcance);
    if (filtros.actorId) cond.push(eq(adminAuditoria.actorId, filtros.actorId));
    if (filtros.accion) cond.push(eq(adminAuditoria.accion, filtros.accion));
    if (filtros.entidadTipo) cond.push(eq(adminAuditoria.entidadTipo, filtros.entidadTipo));
    if (filtros.entidadId) cond.push(eq(adminAuditoria.entidadId, filtros.entidadId));
    if (filtros.desde) cond.push(gte(adminAuditoria.createdAt, filtros.desde));
    if (filtros.hasta) cond.push(lte(adminAuditoria.createdAt, filtros.hasta));
    const where = cond.length ? and(...cond) : undefined;
    const borradas = await db.delete(adminAuditoria).where(where).returning({ id: adminAuditoria.id });
    return { borradas: borradas.length };
}
