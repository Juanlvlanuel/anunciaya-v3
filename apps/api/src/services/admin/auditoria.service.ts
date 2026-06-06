/**
 * admin/auditoria.service.ts
 * ==========================
 * Helper para registrar acciones sensibles del Panel en `admin_auditoria`
 * (quién/cuándo/qué + snapshots antes/después + motivo). Reutilizable por
 * cualquier sección del Panel.
 *
 * Regla: la auditoría NUNCA debe romper la acción principal — si el insert falla,
 * se loggea y se sigue.
 *
 * Ubicación: apps/api/src/services/admin/auditoria.service.ts
 */

import { db } from '../../db/index.js';
import { adminAuditoria } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';

export interface RegistroAuditoria {
    accion: string;          // p.ej. 'negocio_suspender'
    entidadTipo: string;     // p.ej. 'negocio'
    entidadId: string;
    datosPrevios?: unknown;  // snapshot antes
    datosNuevos?: unknown;   // snapshot después
    motivo?: string | null;
}

export async function registrarAuditoria(
    panel: UsuarioPanel,
    reg: RegistroAuditoria,
): Promise<void> {
    try {
        await db.insert(adminAuditoria).values({
            actorId: panel.usuarioId, // null si entró por x-admin-secret (legacy)
            actorRol: panel.rolEquipo,
            accion: reg.accion,
            entidadTipo: reg.entidadTipo,
            entidadId: reg.entidadId,
            datosPrevios: reg.datosPrevios ?? null,
            datosNuevos: reg.datosNuevos ?? null,
            motivo: reg.motivo ?? null,
        });
    } catch (error) {
        console.error('[Auditoría] No se pudo registrar la acción:', reg.accion, error);
    }
}
