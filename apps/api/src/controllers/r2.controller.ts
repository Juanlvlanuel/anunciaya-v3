/**
 * ============================================================================
 * R2 CONTROLLER - Controlador de Imágenes en Cloudflare R2
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/controllers/r2.controller.ts
 *
 * PROPÓSITO:
 * Eliminar imágenes huérfanas de R2 (subidas pero nunca guardadas en BD).
 * Se llama desde el frontend cuando el usuario cancela un formulario o
 * hace reset() después de haber subido una imagen.
 *
 * ENDPOINTS:
 * - DELETE /api/r2/imagen - Eliminar una imagen huérfana
 * ============================================================================
 */

import { Request, Response } from 'express';
import { eliminarArchivo, esUrlR2 } from '../services/r2.service.js';

// =============================================================================
// ELIMINAR IMAGEN HUÉRFANA
// =============================================================================

/**
 * Elimina una imagen huérfana de R2.
 *
 * ENDPOINT: DELETE /api/r2/imagen
 *
 * BODY:
 * {
 *   "url": "https://pub-xxx.r2.dev/articulos/1744123456789-abc12345.webp"
 * }
 *
 * RESPONSE 200:
 * { "success": true, "message": "Imagen eliminada correctamente" }
 *
 * RESPONSE 400:
 * { "success": false, "message": "URL inválida o no pertenece a R2" }
 */
export async function eliminarImagenR2Controller(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { url } = req.body;

        if (!url || typeof url !== 'string' || !url.trim()) {
            res.status(400).json({
                success: false,
                message: 'Debes proporcionar una "url" válida',
            });
            return;
        }

        // Seguridad: solo aceptar URLs del bucket propio del proyecto
        if (!esUrlR2(url)) {
            res.status(400).json({
                success: false,
                message: 'La URL no pertenece al bucket de R2 del proyecto',
            });
            return;
        }

        const resultado = await eliminarArchivo(url);

        res.status(resultado.success ? 200 : 500).json({
            success: resultado.success,
            message: resultado.message,
        });

    } catch (error) {
        console.error('❌ Error en eliminarImagenR2Controller:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno al eliminar imagen de R2',
        });
    }
}
