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
import { urlEstaEnUso } from '../services/admin/mantenimiento.service.js';

// =============================================================================
// ELIMINAR IMAGEN HUÉRFANA
// =============================================================================

/**
 * Elimina una imagen huérfana de R2.
 *
 * ENDPOINT: DELETE /api/r2/imagen
 *
 * Defensa en profundidad (regla obligatoria de CLAUDE.md "Gestión de
 * Archivos R2"): antes de borrar, verifica con `urlEstaEnUso` que la URL
 * NO esté referenciada por ninguna fila de ninguna tabla del
 * `IMAGE_REGISTRY`. Si lo está, responde 200 con un mensaje informativo
 * sin tocar R2 — esto protege contra bugs del frontend que pudieran
 * llamar el endpoint con una URL en uso (ej. retry mal disparado).
 *
 * BODY:
 * {
 *   "url": "https://pub-xxx.r2.dev/articulos/1744123456789-abc12345.webp"
 * }
 *
 * RESPONSE 200 (borrada):
 * { "success": true, "message": "Imagen eliminada correctamente" }
 *
 * RESPONSE 200 (en uso, NO borrada — comportamiento seguro):
 * { "success": true, "message": "Imagen conservada (sigue en uso)", "enUso": true }
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

        // Reference count contra IMAGE_REGISTRY antes de borrar.
        // Si la URL sigue referenciada por alguna fila de alguna tabla, NO
        // tocamos R2 — responder éxito con flag `enUso: true` para que el
        // frontend sepa que el archivo se mantuvo intencionalmente.
        const enUso = await urlEstaEnUso(url);
        if (enUso) {
            console.log(`ℹ️ Imagen R2 conservada (sigue en uso): ${url}`);
            res.status(200).json({
                success: true,
                message: 'Imagen conservada (sigue en uso por otra entidad)',
                enUso: true,
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
