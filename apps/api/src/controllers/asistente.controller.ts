/**
 * asistente.controller.ts
 * ========================
 * Controller del Asistente Coyo (FAB global). Solo valida y llama al
 * service — la lógica de decidir qué hacer con la interpretación de Gemini
 * vive en `services/asistente/asistente.service.ts`.
 *
 * UBICACIÓN: apps/api/src/controllers/asistente.controller.ts
 */

import type { Request, Response } from 'express';
import { ejecutarPeticionAsistente } from '../services/asistente/asistente.service.js';
import {
    interpretarAsistenteSchema,
    formatearErroresZod,
} from '../validations/asistente.schema.js';

// =============================================================================
// POST /api/asistente/interpretar
// =============================================================================

export async function postInterpretarAsistente(req: Request, res: Response) {
    try {
        const validacion = interpretarAsistenteSchema.safeParse(req.body);
        if (!validacion.success) {
            return res.status(400).json({
                success: false,
                message: 'Petición inválida',
                errores: formatearErroresZod(validacion.error),
            });
        }

        const { texto, audioBase64, audioMimeType, historial, rutaActual, modoComercial, nombreNegocio, ciudad, lat, lng } =
            validacion.data;
        const usuarioId = req.usuario?.usuarioId ?? null;

        const resultado = await ejecutarPeticionAsistente(
            { texto, audioBase64, audioMimeType },
            historial,
            { rutaActual, modoComercial, nombreNegocio },
            { ciudad: ciudad ?? null, lat, lng, usuarioId },
        );

        return res.json({ success: true, resultado });
    } catch (error) {
        console.error('Error en postInterpretarAsistente:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al procesar la petición del asistente',
        });
    }
}
