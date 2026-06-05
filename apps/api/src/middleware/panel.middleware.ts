/**
 * panel.middleware.ts
 * ===================
 * Gate de autenticación/autorización del Panel Admin (/api/admin/*).
 *
 * Reemplaza progresivamente a `requireAdminSecret`. Durante la transición usa un
 * GATE DUAL para no romper lo que ya existe (Mantenimiento R2):
 *   1) x-admin-secret válido → pasa como superadmin "legacy" (scripts/reconcile).
 *   2) JWT válido + rol_equipo (revalidado EN BD) dentro de los roles permitidos.
 *
 * Revalida SIEMPRE el rol contra la BD (no confía solo en el JWT):
 *   - Quitar/cambiar el rol surte efecto al instante (no espera al refresh).
 *   - Los tokens viejos (emitidos sin rol) siguen sirviendo.
 *
 * Región (una fuente por rol, sin duplicar):
 *   - gerente  → usuarios.region_id
 *   - vendedor → embajadores.region_id
 *   - superadmin → null (ve todo)
 *
 * Ubicación: apps/api/src/middleware/panel.middleware.ts
 */

import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';
import { db } from '../db/index.js';
import { usuarios, embajadores } from '../db/schemas/schema.js';
import { verificarAccessToken } from '../utils/jwt.js';

export type RolEquipo = 'superadmin' | 'gerente' | 'vendedor';

export interface UsuarioPanel {
    usuarioId: string | null; // null cuando entra por x-admin-secret (legacy)
    rolEquipo: RolEquipo;
    regionId: string | null;
    viaSecret: boolean;
    panel2faHabilitado: boolean; // el superadmin tiene el 2FA del Panel prendido
    panel2faOk: boolean;         // el token actual ya pasó el 2FA del Panel
}

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface Request {
            usuarioPanel?: UsuarioPanel;
        }
    }
}

/**
 * Protege rutas del Panel Admin revalidando el rol de equipo contra la BD.
 * @param rolesPermitidos roles que pueden pasar (p.ej. ['superadmin'])
 */
export function requierePanel(
    rolesPermitidos: RolEquipo[],
    opciones?: { exigir2FA?: boolean },
) {
    const exigir2FA = opciones?.exigir2FA !== false; // default: sí exige
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // --- Camino legacy: x-admin-secret (Mantenimiento R2 / scripts) ---
        const secreto = env.ADMIN_SECRET;
        const recibido = req.header('x-admin-secret');
        if (secreto && recibido && recibido === secreto) {
            req.usuarioPanel = { usuarioId: null, rolEquipo: 'superadmin', regionId: null, viaSecret: true, panel2faHabilitado: false, panel2faOk: true };
            next();
            return;
        }

        // --- Camino JWT ---
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, message: 'Token de acceso requerido' });
            return;
        }

        const resultado = verificarAccessToken(authHeader.substring(7));
        if (!resultado.valido || !resultado.payload) {
            res.status(401).json({ success: false, message: resultado.error || 'Token inválido' });
            return;
        }

        const usuarioId = resultado.payload.usuarioId;

        // Revalidar rol y estado contra la BD (fuente de verdad).
        const [u] = await db
            .select({ rolEquipo: usuarios.rolEquipo, regionId: usuarios.regionId, estado: usuarios.estado, panel2faHabilitado: usuarios.panel2faHabilitado })
            .from(usuarios)
            .where(eq(usuarios.id, usuarioId))
            .limit(1);

        if (!u) {
            res.status(403).json({ success: false, message: 'Acceso denegado: usuario no encontrado' });
            return;
        }
        // Enforcement de estado: un suspendido/inactivo no entra al Panel (corte al instante).
        if (u.estado !== 'activo') {
            res.status(403).json({ success: false, message: 'Acceso denegado: cuenta no activa' });
            return;
        }
        if (!u.rolEquipo || !rolesPermitidos.includes(u.rolEquipo as RolEquipo)) {
            res.status(403).json({ success: false, message: 'Acceso denegado: rol de equipo insuficiente' });
            return;
        }

        // --- Candado 2FA del Panel (solo superadmin con el 2FA prendido) ---
        // El token solo trae la marca panel2fa tras pasar /api/admin/2fa/verificar.
        // Las rutas exentas (/yo, /2fa/verificar) usan { exigir2FA: false } para poder
        // descubrir y completar el 2FA sin quedar bloqueadas.
        const panel2faOk = resultado.payload.panel2fa === true;
        if (exigir2FA && u.panel2faHabilitado && !panel2faOk) {
            res.status(403).json({
                success: false,
                message: 'Se requiere verificación en dos pasos del Panel',
                errorCode: 'PANEL_2FA_REQUERIDO',
            });
            return;
        }

        // Resolver región según rol (una fuente por rol).
        let regionId: string | null = null;
        if (u.rolEquipo === 'gerente') {
            regionId = u.regionId ?? null;
        } else if (u.rolEquipo === 'vendedor') {
            const [emb] = await db
                .select({ regionId: embajadores.regionId })
                .from(embajadores)
                .where(eq(embajadores.usuarioId, usuarioId))
                .limit(1);
            regionId = emb?.regionId ?? null;
        }

        req.usuarioPanel = {
            usuarioId,
            rolEquipo: u.rolEquipo as RolEquipo,
            regionId,
            viaSecret: false,
            panel2faHabilitado: u.panel2faHabilitado,
            panel2faOk,
        };
        next();
    };
}
