/**
 * admin/sesion.controller.ts
 * ===========================
 * "¿Quién soy yo en el Panel?" — datos de la sesión del Panel Admin.
 *
 * Reusa lo que ya resolvió `requierePanel` (en `req.usuarioPanel`): rol de equipo
 * y región (gerente → usuarios.region_id, vendedor → embajadores.region_id,
 * superadmin → null). Aquí solo se agregan los datos básicos del usuario para
 * pintar el avatar/nombre en el shell. Forma de respuesta camelCase, igual que
 * el resto de la API.
 *
 * Ubicación: apps/api/src/controllers/admin/sesion.controller.ts
 */

import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { usuarios } from '../../db/schemas/schema.js';

// =============================================================================
// GET /api/admin/yo
// =============================================================================

/**
 * Devuelve la identidad del miembro de equipo en sesión: datos básicos + rol de
 * equipo + región. El gate `requierePanel` ya validó el acceso; si llegamos aquí
 * es porque la cuenta tiene un rol de equipo permitido.
 */
export async function getYoPanelController(req: Request, res: Response): Promise<void> {
    try {
        const panel = req.usuarioPanel;
        if (!panel) {
            res.status(401).json({ success: false, message: 'Sesión del Panel no encontrada' });
            return;
        }

        // Datos básicos del usuario (omitidos en el camino legacy x-admin-secret,
        // que no tiene usuarioId).
        let datos: { nombre: string; apellidos: string; correo: string; avatarUrl: string | null } | null = null;
        if (panel.usuarioId) {
            const [u] = await db
                .select({
                    nombre: usuarios.nombre,
                    apellidos: usuarios.apellidos,
                    correo: usuarios.correo,
                    avatarUrl: usuarios.avatarUrl,
                })
                .from(usuarios)
                .where(eq(usuarios.id, panel.usuarioId))
                .limit(1);
            datos = u ?? null;
        }

        res.status(200).json({
            success: true,
            message: 'Sesión del Panel',
            data: {
                usuarioId: panel.usuarioId,
                nombre: datos?.nombre ?? null,
                apellidos: datos?.apellidos ?? null,
                correo: datos?.correo ?? null,
                avatarUrl: datos?.avatarUrl ?? null,
                rolEquipo: panel.rolEquipo,
                regionId: panel.regionId,
                // El frontend usa esto para saber si debe pedir el TOTP del Panel:
                // superadmin con 2FA prendido cuyo token aún no pasó la verificación.
                panel2faPendiente: panel.panel2faHabilitado && !panel.panel2faOk,
            },
        });
    } catch (error) {
        console.error('Error en getYoPanelController:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la sesión del Panel',
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
