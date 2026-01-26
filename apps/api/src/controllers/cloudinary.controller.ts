/**
 * ============================================================================
 * CLOUDINARY CONTROLLER - Controlador de Imágenes
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/controllers/cloudinary.controller.ts
 * 
 * PROPÓSITO:
 * Maneja las peticiones HTTP relacionadas con Cloudinary.
 * Principalmente eliminación de imágenes.
 * 
 * ENDPOINTS:
 * - POST /api/cloudinary/delete          - Eliminar una imagen
 * - POST /api/cloudinary/delete-multiple - Eliminar varias
 * 
 * USO:
 * import { eliminarImagenController } from '@/controllers/cloudinary.controller';
 * router.post('/delete', eliminarImagenController);
 * ============================================================================
 */

import { Request, Response } from 'express';
import { eliminarImagen, eliminarMultiples } from '../services/cloudinary.service';

// =============================================================================
// ELIMINAR UNA IMAGEN
// =============================================================================

/**
 * Controlador para eliminar una imagen
 * 
 * ENDPOINT: POST /api/cloudinary/delete
 * 
 * BODY:
 * {
 *   "url": "https://res.cloudinary.com/.../anunciaya/logos/foto.jpg"
 * }
 * O:
 * {
 *   "publicId": "anunciaya/logos/foto"
 * }
 * 
 * RESPONSE 200:
 * {
 *   "success": true,
 *   "message": "Imagen eliminada correctamente",
 *   "publicId": "anunciaya/logos/foto"
 * }
 * 
 * RESPONSE 400/500:
 * {
 *   "success": false,
 *   "message": "Error al eliminar imagen"
 * }
 */
export async function eliminarImagenController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { url, publicId } = req.body;

    // Validar que venga url o publicId
    if (!url && !publicId) {
      res.status(400).json({
        success: false,
        message: 'Debes proporcionar "url" o "publicId"',
      });
      return;
    }

    // Usar el que venga (prioridad a publicId)
    const identificador = publicId || url;

    // Llamar al servicio
    const resultado = await eliminarImagen(identificador);

    if (resultado.success) {
      res.status(200).json({
        success: true,
        message: resultado.message,
        publicId: resultado.publicId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: resultado.message,
        publicId: resultado.publicId,
      });
    }
    
  } catch (error) {
    console.error('❌ Error en controlador de eliminación:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error interno al eliminar imagen',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
}

// =============================================================================
// ELIMINAR MÚLTIPLES IMÁGENES
// =============================================================================

/**
 * Controlador para eliminar múltiples imágenes
 * 
 * ENDPOINT: POST /api/cloudinary/delete-multiple
 * 
 * BODY:
 * {
 *   "urls": [
 *     "https://res.cloudinary.com/.../logo.jpg",
 *     "https://res.cloudinary.com/.../portada.jpg"
 *   ]
 * }
 * O:
 * {
 *   "publicIds": [
 *     "anunciaya/logos/logo",
 *     "anunciaya/portadas/portada"
 *   ]
 * }
 * 
 * RESPONSE 200:
 * {
 *   "success": true,
 *   "message": "3 imágenes eliminadas, 1 falló",
 *   "resultados": [...]
 * }
 */
export async function eliminarMultiplesController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { urls, publicIds } = req.body;

    // Validar que venga al menos un array
    if (!urls && !publicIds) {
      res.status(400).json({
        success: false,
        message: 'Debes proporcionar "urls" o "publicIds" como array',
      });
      return;
    }

    const identificadores = publicIds || urls;

    // Validar que sea un array
    if (!Array.isArray(identificadores)) {
      res.status(400).json({
        success: false,
        message: 'Los identificadores deben ser un array',
      });
      return;
    }

    // Validar que no esté vacío
    if (identificadores.length === 0) {
      res.status(400).json({
        success: false,
        message: 'El array no puede estar vacío',
      });
      return;
    }

    // Llamar al servicio
    const resultados = await eliminarMultiples(identificadores);

    // Contar éxitos y fallos
    const exitosos = resultados.filter((r) => r.success).length;
    const fallidos = resultados.filter((r) => !r.success).length;

    res.status(200).json({
      success: true,
      message: `${exitosos} imagen(es) eliminada(s)${fallidos > 0 ? `, ${fallidos} falló(s)` : ''}`,
      exitosos,
      fallidos,
      total: resultados.length,
      resultados,
    });
    
  } catch (error) {
    console.error('❌ Error en controlador de eliminación múltiple:', error);
    
    res.status(500).json({
      success: false,
      message: 'Error interno al eliminar imágenes',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  eliminarImagenController,
  eliminarMultiplesController,
};