/**
 * ============================================================================
 * R2 ROUTES - Rutas de limpieza de imágenes en Cloudflare R2
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/routes/r2.routes.ts
 *
 * PROPÓSITO:
 * Permite al frontend eliminar imágenes huérfanas (subidas pero no guardadas
 * en BD) cuando el usuario cancela un formulario o hace reset().
 *
 * ENDPOINTS:
 * - DELETE /api/r2/imagen - Eliminar una imagen huérfana
 *
 * SEGURIDAD:
 * - Requiere autenticación (JWT)
 * - Valida que la URL pertenezca al bucket R2 del proyecto
 * ============================================================================
 */

import { Router } from 'express';
import { eliminarImagenR2Controller } from '../controllers/r2.controller.js';
import { verificarToken } from '../middleware/auth.js';

const router: Router = Router();

/**
 * @route   DELETE /api/r2/imagen
 * @desc    Eliminar una imagen huérfana de R2
 * @access  Privado (requiere autenticación)
 * @body    { url: string }
 *
 * @example
 * DELETE /api/r2/imagen
 * { "url": "https://pub-xxx.r2.dev/articulos/1744123456789-abc12345.webp" }
 *
 * Response 200:
 * { "success": true, "message": "Imagen eliminada correctamente" }
 */
router.delete('/imagen', verificarToken, eliminarImagenR2Controller);

export default router;
