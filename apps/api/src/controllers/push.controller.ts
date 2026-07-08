/**
 * push.controller.ts
 * ===================
 * Controllers del módulo Web Push. Solo orquestan: validan el body y llaman
 * a push.service. Sin lógica de negocio aquí.
 *
 * UBICACIÓN: apps/api/src/controllers/push.controller.ts
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import { guardarSuscripcion, eliminarSuscripcion } from '../services/push.service.js';

function obtenerUsuarioId(req: Request): string {
    return req.usuario!.usuarioId;
}

// Suscripción que emite el navegador (pushManager.subscribe → .toJSON()).
const suscripcionSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
    }),
});

const desuscribirSchema = z.object({
    endpoint: z.string().url(),
});

// =============================================================================
// POST /api/push/suscribir
// =============================================================================

export async function suscribirController(req: Request, res: Response) {
    try {
        const parseo = suscripcionSchema.safeParse(req.body);
        if (!parseo.success) {
            return res.status(400).json({ success: false, message: 'Suscripción inválida' });
        }

        const usuarioId = obtenerUsuarioId(req);
        const userAgent = req.headers['user-agent'] ?? null;
        await guardarSuscripcion(usuarioId, parseo.data, userAgent);

        return res.status(200).json({ success: true, message: 'Suscripción registrada' });
    } catch (error) {
        console.error('[push] Error al suscribir:', error);
        return res.status(500).json({ success: false, message: 'No se pudo registrar la suscripción' });
    }
}

// =============================================================================
// POST /api/push/desuscribir
// =============================================================================

export async function desuscribirController(req: Request, res: Response) {
    try {
        const parseo = desuscribirSchema.safeParse(req.body);
        if (!parseo.success) {
            return res.status(400).json({ success: false, message: 'Endpoint inválido' });
        }

        await eliminarSuscripcion(parseo.data.endpoint);

        return res.status(200).json({ success: true, message: 'Suscripción eliminada' });
    } catch (error) {
        console.error('[push] Error al desuscribir:', error);
        return res.status(500).json({ success: false, message: 'No se pudo eliminar la suscripción' });
    }
}
