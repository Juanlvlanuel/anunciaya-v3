/**
 * adminSecret.middleware.ts
 * ==========================
 * Middleware TEMPORAL de protección para endpoints de mantenimiento administrativo.
 *
 * Hoy: valida un header `x-admin-secret` contra `env.ADMIN_SECRET`. Es el mecanismo
 * más simple para proteger herramientas como el reconcile de R2 mientras no exista
 * un sistema de roles admin completo.
 *
 * Futuro: cuando se construya el Panel Admin con cuentas admin reales, este
 * middleware se reemplaza por uno que valide el JWT + rol. Los endpoints protegidos
 * seguirán funcionando sin cambios (solo cambia el middleware que los cubre).
 *
 * Ubicación: apps/api/src/middleware/adminSecret.middleware.ts
 */

import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

/**
 * Exige header `x-admin-secret` con valor exacto a `env.ADMIN_SECRET`.
 *
 * Respuestas:
 *  - 503 si `ADMIN_SECRET` no está configurado en el entorno
 *  - 401 si el header no se envía o no matchea
 *  - next() si matchea
 */
export function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
    const esperado = env.ADMIN_SECRET;
    if (!esperado) {
        res.status(503).json({
            success: false,
            message: 'Endpoint admin deshabilitado: ADMIN_SECRET no está configurado en el servidor',
        });
        return;
    }

    const recibido = req.header('x-admin-secret');
    if (!recibido || recibido !== esperado) {
        res.status(401).json({
            success: false,
            message: 'Acceso denegado: header x-admin-secret inválido',
        });
        return;
    }

    next();
}
