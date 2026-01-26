/**
 * ============================================================================
 * CLOUDINARY ROUTES - Rutas de Gestión de Imágenes
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/routes/cloudinary.routes.ts
 * 
 * PROPÓSITO:
 * Define las rutas HTTP para gestionar imágenes en Cloudinary.
 * 
 * ENDPOINTS DISPONIBLES:
 * - POST /api/cloudinary/delete          - Eliminar una imagen
 * - POST /api/cloudinary/delete-multiple - Eliminar varias imágenes
 * 
 * SEGURIDAD:
 * - Requiere autenticación (JWT)
 * - El usuario solo puede eliminar sus propias imágenes (validar en controlador)
 * 
 * USO EN app.ts:
 * import cloudinaryRoutes from './routes/cloudinary.routes';
 * app.use('/api/cloudinary', cloudinaryRoutes);
 * ============================================================================
 */

import { Router } from 'express';
import {
  eliminarImagenController,
  eliminarMultiplesController,
} from '../controllers/cloudinary.controller';

// Importar middleware de autenticación (cuando esté disponible)
import { verificarToken } from '../middleware/auth';

const router: Router = Router();

// =============================================================================
// RUTAS PÚBLICAS (TEMPORALMENTE - AGREGAR AUTH DESPUÉS)
// =============================================================================

/**
 * @route   POST /api/cloudinary/delete
 * @desc    Eliminar una imagen de Cloudinary
 * @access  Privado (requiere autenticación)
 * @body    { url: string } o { publicId: string }
 * 
 * @example
 * POST /api/cloudinary/delete
 * {
 *   "url": "https://res.cloudinary.com/.../anunciaya/logos/foto.jpg"
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "Imagen eliminada correctamente",
 *   "publicId": "anunciaya/logos/foto"
 * }
 */
router.post('/delete', verificarToken, eliminarImagenController);

/**
 * @route   POST /api/cloudinary/delete-multiple
 * @desc    Eliminar múltiples imágenes de Cloudinary
 * @access  Privado (requiere autenticación)
 * @body    { urls: string[] } o { publicIds: string[] }
 * 
 * @example
 * POST /api/cloudinary/delete-multiple
 * {
 *   "urls": [
 *     "https://res.cloudinary.com/.../logo.jpg",
 *     "https://res.cloudinary.com/.../portada.jpg"
 *   ]
 * }
 * 
 * Response 200:
 * {
 *   "success": true,
 *   "message": "2 imagen(es) eliminada(s)",
 *   "exitosos": 2,
 *   "fallidos": 0,
 *   "resultados": [...]
 * }
 */
router.post('/delete-multiple', verificarToken, eliminarMultiplesController);

// =============================================================================
// RUTAS CON AUTENTICACIÓN (DESCOMENTAR CUANDO SE IMPLEMENTE)
// =============================================================================


// =============================================================================
// EXPORTS
// =============================================================================

export default router;