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

import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { adminAuditoria } from '../../db/schemas/schema.js';

/** Borra un registro de auditoría por id. Devuelve si existía. */
export async function eliminarAuditoria(id: string): Promise<{ ok: boolean }> {
    const borradas = await db.delete(adminAuditoria).where(eq(adminAuditoria.id, id)).returning({ id: adminAuditoria.id });
    return { ok: borradas.length > 0 };
}

/** Vacía TODA la bitácora de auditoría. Devuelve cuántas borró. */
export async function vaciarAuditoria(): Promise<{ borradas: number }> {
    const borradas = await db.delete(adminAuditoria).returning({ id: adminAuditoria.id });
    return { borradas: borradas.length };
}
