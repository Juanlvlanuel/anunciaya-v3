/**
 * ============================================================================
 * CLOUDINARY.TS - Helper de Upload de Imágenes
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/utils/cloudinary.ts
 * 
 * PROPÓSITO:
 * Proporciona funciones para subir imágenes directamente a Cloudinary desde
 * el frontend, sin pasar por el backend.
 * 
 * CARACTERÍSTICAS:
 * - Upload directo desde el navegador
 * - Organización automática en carpetas
 * - Validación de archivos (tipo y tamaño)
 * - Preview local instantáneo
 * - Manejo de errores
 * 
 * USO:
 * import { uploadToCloudinary, crearPreview } from '@/utils/cloudinary';
 * 
 * const url = await uploadToCloudinary(file, 'logos');
 * ============================================================================
 */


import { api } from '@/services/api';
// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Verificar que las variables de entorno existan
if (!CLOUD_NAME || !UPLOAD_PRESET) {
  console.error('❌ ERROR: Faltan variables de entorno de Cloudinary');
  console.error('VITE_CLOUDINARY_CLOUD_NAME:', CLOUD_NAME);
  console.error('VITE_CLOUDINARY_UPLOAD_PRESET:', UPLOAD_PRESET);
  console.error('Revisa tu archivo apps/web/.env');
}

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Información detallada de la imagen subida
 */
export interface ResultadoUpload {
  url: string;           // URL pública de la imagen
  publicId: string;      // ID único en Cloudinary
  width: number;         // Ancho en píxeles
  height: number;        // Alto en píxeles
  format: string;        // Formato (jpg, png, webp, etc.)
  bytes: number;         // Tamaño en bytes
}

/**
 * Opciones de configuración para el upload
 */
export interface OpcionesUpload {
  carpeta?: string;      // Subcarpeta dentro de 'anunciaya/'
  maxSize?: number;      // Tamaño máximo en bytes (default: 5MB)
}

// =============================================================================
// CONSTANTES
// =============================================================================

// Tamaño máximo por defecto: 5MB
const MAX_SIZE_DEFAULT = 5 * 1024 * 1024;

// Formatos de imagen permitidos
const FORMATOS_PERMITIDOS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

// =============================================================================
// FUNCIÓN PRINCIPAL DE UPLOAD
// =============================================================================

/**
 * Sube una imagen a Cloudinary y devuelve la URL
 * 
 * CÓMO FUNCIONA:
 * 1. Valida que sea una imagen válida
 * 2. Valida el tamaño del archivo
 * 3. Crea un FormData con el archivo y configuración
 * 4. Hace POST a Cloudinary
 * 5. Devuelve la URL pública de la imagen
 * 
 * POR QUÉ DIRECTO A CLOUDINARY:
 * - Más rápido (no pasa por nuestro backend)
 * - No consume recursos de nuestro servidor
 * - Cloudinary maneja la optimización automáticamente
 * 
 * @param file - Archivo de imagen del input file
 * @param carpeta - Nombre de subcarpeta (ej: 'logos', 'productos', 'chat')
 * @returns URL pública de la imagen en Cloudinary
 * 
 * @example
 * const url = await uploadToCloudinary(file, 'logos');
 * // url = "https://res.cloudinary.com/dwrzdhrmg/image/upload/v1234/anunciaya/logos/mi-logo.jpg"
 */
export async function uploadToCloudinary(
  file: File,
  carpeta?: string
): Promise<string> {
  try {
    // 1. VALIDAR QUE SEA UNA IMAGEN
    if (!FORMATOS_PERMITIDOS.includes(file.type)) {
      throw new Error(
        `Formato no permitido. Solo se aceptan: ${FORMATOS_PERMITIDOS.join(', ')}`
      );
    }

    // 2. VALIDAR TAMAÑO
    if (file.size > MAX_SIZE_DEFAULT) {
      const sizeMB = (MAX_SIZE_DEFAULT / (1024 * 1024)).toFixed(0);
      throw new Error(`La imagen no puede pesar más de ${sizeMB}MB`);
    }

    // 3. CREAR FORMDATA CON CONFIGURACIÓN
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    // Si se especifica carpeta, agregarla
    // Estructura: anunciaya/logos/, anunciaya/productos/, etc.
    if (carpeta) {
      formData.append('folder', `anunciaya/${carpeta}`);
    } else {
      formData.append('folder', 'anunciaya');
    }

    // 4. CONSTRUIR URL DEL ENDPOINT
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    // 5. HACER LA PETICIÓN
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    // 6. MANEJAR ERRORES DE RESPUESTA
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al subir imagen a Cloudinary');
    }

    // 7. OBTENER DATOS DE LA RESPUESTA
    const data = await response.json();


    // 8. DEVOLVER URL SEGURA (HTTPS)
    return data.secure_url;

  } catch (error) {
    console.error('❌ Error subiendo imagen a Cloudinary:', error);

    // Re-lanzar el error para que el componente lo maneje
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Error desconocido al subir imagen');
    }
  }
}

// =============================================================================
// FUNCIÓN CON INFORMACIÓN DETALLADA
// =============================================================================

/**
 * Versión extendida que devuelve más información sobre la imagen
 * 
 * CUÁNDO USAR:
 * Usa esta función cuando necesites información adicional como dimensiones,
 * formato, tamaño, etc. Para uso normal, usa uploadToCloudinary()
 * 
 * @param file - Archivo de imagen
 * @param carpeta - Subcarpeta opcional
 * @returns Objeto con URL y datos detallados de la imagen
 * 
 * @example
 * const resultado = await uploadToCloudinaryDetallado(file, 'productos');
 */
export async function uploadToCloudinaryDetallado(
  file: File,
  carpeta?: string
): Promise<ResultadoUpload> {
  try {
    // Validaciones (igual que función anterior)
    if (!FORMATOS_PERMITIDOS.includes(file.type)) {
      throw new Error('Formato de imagen no permitido');
    }

    if (file.size > MAX_SIZE_DEFAULT) {
      const sizeMB = (MAX_SIZE_DEFAULT / (1024 * 1024)).toFixed(0);
      throw new Error(`La imagen no puede pesar más de ${sizeMB}MB`);
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    if (carpeta) {
      formData.append('folder', `anunciaya/${carpeta}`);
    } else {
      formData.append('folder', 'anunciaya');
    }

    // Upload
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error al subir imagen');
    }

    const data = await response.json();

    // Devolver información completa
    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
    };

  } catch (error) {
    console.error('❌ Error subiendo imagen:', error);
    throw error;
  }
}

// =============================================================================
// HELPERS PARA PREVIEW LOCAL
// =============================================================================

/**
 * Crea una URL temporal para mostrar preview de la imagen ANTES de subirla
 * 
 * CÓMO FUNCIONA:
 * Usa la API del navegador URL.createObjectURL() para crear una URL temporal
 * que apunta al archivo local del usuario.
 * 
 * POR QUÉ ES IMPORTANTE:
 * Permite mostrar la imagen INMEDIATAMENTE sin esperar el upload a Cloudinary.
 * Esto hace que la app se sienta más rápida y fluida.
 * 
 * IMPORTANTE:
 * Debes llamar a limpiarPreview() cuando ya no necesites la URL para liberar
 * memoria del navegador.
 * 
 * @param file - Archivo de imagen
 * @returns URL temporal local (ej: "blob:http://localhost:5173/abc-123")
 * 
 * @example
 * const previewUrl = crearPreview(file);
 * setImageUrl(previewUrl);  // Mostrar inmediatamente
 * // Usuario ve la imagen al instante, sin esperar upload
 */
export function crearPreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Limpia la URL temporal del preview para liberar memoria
 * 
 * CUÁNDO LLAMAR:
 * - Cuando el upload a Cloudinary termine (ya tienes la URL real)
 * - Cuando el componente se desmonte
 * - Cuando el usuario cancele/cambie la imagen
 * 
 * POR QUÉ ES NECESARIO:
 * Los blob URLs ocupan memoria. Si no los limpias, causarás memory leaks.
 * 
 * @param url - URL temporal creada con crearPreview()
 * 
 * @example
 * const preview = crearPreview(file);
 * // ... usar preview ...
 * limpiarPreview(preview);  // Limpiar cuando termine
 */
export function limpiarPreview(url: string): void {
  URL.revokeObjectURL(url);
}

// =============================================================================
// HELPER DE VALIDACIÓN
// =============================================================================

/**
 * Valida si un archivo es una imagen válida
 * 
 * ÚTIL PARA:
 * - Validar antes de permitir selección
 * - Mostrar mensajes de error específicos
 * - Validar en onChange del input
 * 
 * @param file - Archivo a validar
 * @returns true si es válido, false si no
 * 
 * @example
 * if (!esImagenValida(file)) {
 *   alert('Por favor selecciona una imagen válida');
 *   return;
 * }
 */
export function esImagenValida(file: File): boolean {
  return FORMATOS_PERMITIDOS.includes(file.type);
}

/**
 * Valida si el tamaño del archivo es aceptable
 * 
 * @param file - Archivo a validar
 * @param maxSize - Tamaño máximo en bytes (default: 5MB)
 * @returns true si está dentro del límite
 */
export function esTamañoValido(
  file: File,
  maxSize: number = MAX_SIZE_DEFAULT
): boolean {
  return file.size <= maxSize;
}

/**
 * Obtiene el tamaño del archivo en formato legible
 * 
 * @param bytes - Tamaño en bytes
 * @returns String formateado (ej: "2.5 MB")
 * 
 * @example
 * formatearTamaño(2500000); // "2.38 MB"
 */
export function formatearTamaño(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// =============================================================================
// ELIMINACIÓN DE IMÁGENES
// =============================================================================

/**
 * Elimina una imagen de Cloudinary a través del backend
 * 
 * IMPORTANTE:
 * No se puede eliminar directamente desde el frontend porque requiere
 * el API Secret. Por eso llamamos al endpoint del backend.
 * 
 * FLUJO:
 * Frontend → Backend API → Cloudinary
 * 
 * POR QUÉ:
 * - Seguridad: API Secret nunca se expone
 * - Validación: Backend puede verificar permisos
 * - Auditoría: Backend puede registrar eliminaciones
 * 
 * @param url - URL completa de Cloudinary o public_id
 * @returns true si se eliminó correctamente
 * 
 * @example
 * const exito = await eliminarDeCloudinary(
 *   'https://res.cloudinary.com/.../anunciaya/logos/foto.jpg'
 * );
 * if (exito) {
 * }
 * 
 * @example
 * // También acepta public_id directo
 * await eliminarDeCloudinary('anunciaya/logos/foto');
 */
export async function eliminarDeCloudinary(url: string): Promise<boolean> {
  try {
    const response = await api.post('/cloudinary/delete', { url });
    return response.data.success || false;
  } catch (error) {
    console.error('❌ Error al eliminar de Cloudinary:', error);
    return false;
  }
}

/**
 * Elimina múltiples imágenes de Cloudinary
 * 
 * ÚTIL PARA:
 * - Usuario elimina negocio completo
 * - Usuario elimina producto con galería
 * - Limpieza masiva
 * 
 * @param urls - Array de URLs o public_ids
 * @returns Número de imágenes eliminadas exitosamente
 * 
 * @example
 * const eliminadas = await eliminarMultiplesDeCloudinary([
 *   'https://res.cloudinary.com/.../logo.jpg',
 *   'https://res.cloudinary.com/.../portada.jpg',
 *   'anunciaya/galeria/foto1'
 * ]);
 */
export async function eliminarMultiplesDeCloudinary(
  urls: string[]
): Promise<number> {
  try {
    const response = await api.post('/cloudinary/delete-multiple', { urls });
    return response.data.exitosos || 0;
  } catch (error) {
    console.error('❌ Error al eliminar múltiples imágenes:', error);
    return 0;
  }
}