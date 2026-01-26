/**
 * ============================================================================
 * CLOUDINARY SERVICE - Servicio de Gestión de Imágenes
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/services/cloudinary.service.ts
 * 
 * PROPÓSITO:
 * Proporciona funciones para gestionar imágenes en Cloudinary desde el backend.
 * Principalmente para ELIMINAR imágenes de forma segura.
 * 
 * FUNCIONES:
 * - eliminarImagen(): Elimina una imagen de Cloudinary
 * - eliminarMultiples(): Elimina varias imágenes a la vez
 * - extraerPublicId(): Extrae el public_id de una URL
 * 
 * USO:
 * import { eliminarImagen } from '@/services/cloudinary.service';
 * await eliminarImagen('anunciaya/logos/mi-logo-123');
 * ============================================================================
 */

import { cloudinary } from '../config/cloudinary';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Resultado de la eliminación
 */
interface ResultadoEliminacion {
  success: boolean;
  publicId: string;
  resultado?: string; // 'ok', 'not found', etc.
  message?: string;
}

// =============================================================================
// HELPER: EXTRAER PUBLIC ID DE URL
// =============================================================================

/**
 * Extrae el public_id de una URL completa de Cloudinary
 * 
 * EJEMPLOS:
 * https://res.cloudinary.com/dwrzdhrmg/image/upload/v1234/anunciaya/logos/foto.jpg
 * → anunciaya/logos/foto
 * 
 * https://res.cloudinary.com/dwrzdhrmg/image/upload/anunciaya/productos/item.png
 * → anunciaya/productos/item
 * 
 * @param url - URL completa de Cloudinary
 * @returns public_id sin extensión
 */
export function extraerPublicId(url: string): string {
  try {
    // Si ya es un public_id (no tiene http), devolverlo directamente
    if (!url.startsWith('http')) {
      // Quitar extensión si la tiene
      return url.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    }

    // URL completa de Cloudinary
    // Formato: https://res.cloudinary.com/{cloud_name}/image/upload/{transformaciones}/{public_id}.{ext}
    
    // Buscar la parte después de '/upload/'
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) {
      throw new Error('URL de Cloudinary inválida');
    }

    // Obtener la parte después de /upload/
    let path = url.substring(uploadIndex + 8); // 8 = length of '/upload/'

    // Si tiene versión (v1234567890/), quitarla
    path = path.replace(/^v\d+\//, '');

    // Quitar la extensión del archivo
    path = path.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');

    return path;
    
  } catch (error) {
    console.error('❌ Error extrayendo public_id:', error);
    throw new Error(`No se pudo extraer el public_id de: ${url}`);
  }
}

// =============================================================================
// FUNCIÓN PRINCIPAL: ELIMINAR IMAGEN
// =============================================================================

/**
 * Elimina una imagen de Cloudinary
 * 
 * CÓMO FUNCIONA:
 * 1. Recibe URL o public_id
 * 2. Si es URL, extrae el public_id
 * 3. Llama a cloudinary.uploader.destroy()
 * 4. Devuelve resultado
 * 
 * CASOS DE USO:
 * - Usuario borra su logo
 * - Usuario elimina producto
 * - Usuario cambia avatar
 * - Administrador modera contenido
 * - Limpieza automática de imágenes antiguas
 * 
 * @param identificador - URL completa o public_id
 * @returns Resultado de la eliminación
 * 
 * @example
 * // Con URL completa
 * await eliminarImagen('https://res.cloudinary.com/.../anunciaya/logos/foto.jpg');
 * 
 * @example
 * // Con public_id directo
 * await eliminarImagen('anunciaya/logos/foto');
 */
export async function eliminarImagen(
  identificador: string
): Promise<ResultadoEliminacion> {
  try {

    // 1. EXTRAER PUBLIC ID (si es URL)
    const publicId = extraerPublicId(identificador);

    // 2. ELIMINAR DE CLOUDINARY
    const resultado = await cloudinary.uploader.destroy(publicId, {
      invalidate: true, // Invalida cache de CDN inmediatamente
    });

    // 3. VERIFICAR RESULTADO
    if (resultado.result === 'ok') {
      return {
        success: true,
        publicId,
        resultado: resultado.result,
        message: 'Imagen eliminada correctamente',
      };
    } else if (resultado.result === 'not found') {
      return {
        success: false,
        publicId,
        resultado: resultado.result,
        message: 'La imagen no existe en Cloudinary',
      };
    } else {
      return {
        success: false,
        publicId,
        resultado: resultado.result,
        message: 'Error al eliminar imagen',
      };
    }
    
  } catch (error) {
    console.error('❌ Error eliminando imagen:', error);
    
    return {
      success: false,
      publicId: identificador,
      message: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// =============================================================================
// FUNCIÓN AVANZADA: ELIMINAR MÚLTIPLES
// =============================================================================

/**
 * Elimina múltiples imágenes a la vez
 * 
 * ÚTIL PARA:
 * - Usuario elimina negocio completo (logo + portada + galería)
 * - Usuario borra producto con múltiples fotos
 * - Limpieza masiva de imágenes
 * 
 * @param identificadores - Array de URLs o public_ids
 * @returns Array de resultados
 * 
 * @example
 * const urls = [
 *   'https://res.cloudinary.com/.../logo.jpg',
 *   'https://res.cloudinary.com/.../portada.jpg',
 *   'anunciaya/galeria/foto1',
 * ];
 * const resultados = await eliminarMultiples(urls);
 */
export async function eliminarMultiples(
  identificadores: string[]
): Promise<ResultadoEliminacion[]> {

  // Eliminar todas en paralelo (más rápido)
  const promesas = identificadores.map((id) => eliminarImagen(id));
  const resultados = await Promise.all(promesas);

  const exitosos = resultados.filter((r) => r.success).length;
  const fallidos = resultados.filter((r) => !r.success).length;

  return resultados;
}

// =============================================================================
// FUNCIÓN DE UTILIDAD: VALIDAR URL
// =============================================================================

/**
 * Valida si una URL es de Cloudinary
 * 
 * @param url - URL a validar
 * @returns true si es URL válida de Cloudinary
 */
export function esUrlCloudinary(url: string): boolean {
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
}

// =============================================================================
// FUNCIÓN: DUPLICAR IMAGEN
// =============================================================================

/**
 * Duplica una imagen existente en Cloudinary creando una copia independiente
 * Usa la funcionalidad de upload desde URL
 * 
 * @param urlOriginal - URL de la imagen a duplicar
 * @param carpeta - Carpeta destino (ej: 'articulos')
 * @returns Nueva URL de la imagen duplicada o null si falla
 */
export async function duplicarImagen(
  urlOriginal: string,
  carpeta: string = 'articulos'
): Promise<string | null> {
  try {
    if (!urlOriginal || !esUrlCloudinary(urlOriginal)) {
      return null;
    }

    // Subir desde URL (Cloudinary crea una copia)
    const resultado = await cloudinary.uploader.upload(urlOriginal, {
      folder: `anunciaya/${carpeta}`,
      resource_type: 'image',
    });

    return resultado.secure_url;

  } catch (error) {
    console.error('❌ Error duplicando imagen:', error);
    return null;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  eliminarImagen,
  eliminarMultiples,
  extraerPublicId,
  esUrlCloudinary,
  duplicarImagen, // ← Agregar
};