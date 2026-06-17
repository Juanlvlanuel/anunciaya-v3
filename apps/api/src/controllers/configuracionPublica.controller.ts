/**
 * configuracionPublica.controller.ts
 * ==================================
 * Endpoint PÚBLICO (sin auth) para que la app web lea los valores del negocio que se muestran al
 * visitante antes de registrarse — hoy: la duración del trial (días gratis de la cuenta comercial).
 *
 * Lee de `configuracion_sistema` con el mismo helper cacheado que el resto del backend, así que refleja
 * lo que el SuperAdmin configure en el Panel. Nunca expone datos sensibles: solo lo que la landing pinta.
 *
 * Ubicación: apps/api/src/controllers/configuracionPublica.controller.ts
 */

import type { Request, Response } from 'express';
import { obtenerConfigNumero } from '../services/configuracion.service.js';

// =============================================================================
// GET /api/configuracion-publica   (público · valores que pinta la landing)
// =============================================================================

export async function obtenerConfigPublicaController(_req: Request, res: Response): Promise<void> {
    try {
        const trialDias = await obtenerConfigNumero('trial_duracion_dias', 14);
        res.status(200).json({ success: true, data: { trialDias } });
    } catch (error) {
        // La landing nunca debe romperse por esto: ante cualquier fallo, devolver el default.
        console.error('Error en obtenerConfigPublicaController:', error);
        res.status(200).json({ success: true, data: { trialDias: 14 } });
    }
}
