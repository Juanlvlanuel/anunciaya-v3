/**
 * useR2Upload.ts
 * ==============
 * Hook para subir imágenes directamente a Cloudflare R2 via presigned URL.
 *
 * Flujo:
 *  1. Usuario elige imagen → preview local inmediato (blob URL)
 *  2. Solicita presigned URL al backend (POST /articulos/upload-imagen)
 *  3. Sube el archivo directamente a R2 con PUT sobre la presigned URL
 *  4. Reemplaza el blob URL con la URL pública de R2
 *
 * UBICACIÓN: apps/web/src/hooks/useR2Upload.ts
 */

import { useState, useCallback } from 'react';
import { generarUrlUploadImagenArticulo } from '../services/articulosService';
import { eliminarImagenHuerfana } from '../services/r2Service';
import { optimizarImagen as optimizarImagenUtil } from '../utils/optimizarImagen';

// =============================================================================
// TIPOS
// =============================================================================

interface OpcionesR2Upload {
  /** Callback después de upload exitoso, recibe la URL pública de R2 */
  onSuccess?: (url: string) => void;
  /** Callback si ocurre un error */
  onError?: (error: Error) => void;
  /** Ancho máximo para redimensionar (default: 1920) */
  maxWidth?: number;
  /** Calidad de compresión 0-1 (default: 0.85) */
  quality?: number;
  /** Función personalizada para generar la presigned URL (default: usa endpoint de artículos) */
  generarUrl?: (nombreArchivo: string, contentType: string) => Promise<{
    success: boolean;
    data?: { uploadUrl: string; publicUrl: string; key?: string; expiresIn?: number };
    message?: string;
  }>;
}

interface ResultadoR2Upload {
  /** URL actual de la imagen (blob durante upload, R2 después) */
  imageUrl: string | null;
  /** URL definitiva en R2 (null hasta completar el upload) */
  r2Url: string | null;
  /** true mientras está subiendo */
  isUploading: boolean;
  /** Mensaje de error o null */
  error: string | null;
  /** Inicia el proceso de subida con el archivo seleccionado */
  uploadImage: (file: File) => Promise<void>;
  /** Resetea todo el estado */
  reset: () => void;
  /** Setea manualmente la URL (para edición con imagen existente) */
  setImageUrl: (url: string | null) => void;
  /** Setea manualmente la URL de R2 (para edición con imagen existente) */
  setR2Url: (url: string | null) => void;
}

// El helper de optimización vive en `apps/web/src/utils/optimizarImagen.ts`
// y es compartido por este hook y por `useSubirFotoMarketplace` para
// mantener un único lugar con la lógica de redimensión + WebP.

// =============================================================================
// HOOK
// =============================================================================

export function useR2Upload({
  onSuccess,
  onError,
  maxWidth = 1920,
  quality = 0.85,
  generarUrl,
}: OpcionesR2Upload = {}): ResultadoR2Upload {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [r2Url, setR2Url] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // true solo cuando la imagen fue subida en esta sesión (no preexistente de BD)
  const [esSubidaNueva, setEsSubidaNueva] = useState(false);

  const uploadImage = useCallback(async (file: File) => {
    setError(null);
    setIsUploading(true);

    // 1. Preview local inmediato
    const blobUrl = URL.createObjectURL(file);
    setImageUrl(blobUrl);

    try {
      // 2. Optimizar imagen (helper compartido)
      const blob = await optimizarImagenUtil(file, { maxWidth, quality });
      const nombreArchivo = file.name.replace(/\.[^.]+$/, '.webp');
      const contentType = 'image/webp';

      // 3. Solicitar presigned URL al backend
      const generarFn = generarUrl || generarUrlUploadImagenArticulo;
      const respuesta = await generarFn(nombreArchivo, contentType);

      if (!respuesta.success || !respuesta.data) {
        throw new Error(respuesta.message || 'Error al obtener URL de subida');
      }

      const { uploadUrl, publicUrl } = respuesta.data;

      // 4. Subir directamente a R2 con PUT
      const putRespuesta = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': contentType },
      });

      if (!putRespuesta.ok) {
        throw new Error(`Error al subir imagen a R2: ${putRespuesta.status}`);
      }

      // 5. Reemplazar blob URL con URL pública de R2
      URL.revokeObjectURL(blobUrl);
      setImageUrl(publicUrl);
      setR2Url(publicUrl);
      setEsSubidaNueva(true);
      onSuccess?.(publicUrl);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido al subir imagen');
      setError(error.message);
      // Mantener el preview local aunque falle el upload
      onError?.(error);
    } finally {
      setIsUploading(false);
    }
  }, [maxWidth, quality, onSuccess, onError, generarUrl]);

  const reset = useCallback(() => {
    if (imageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(imageUrl);
    }
    // Capturar antes de limpiar el estado
    const urlHuerfana = esSubidaNueva ? r2Url : null;
    setImageUrl(null);
    setR2Url(null);
    setEsSubidaNueva(false);
    setIsUploading(false);
    setError(null);
    // Fire-and-forget: eliminar de R2 solo si fue subida en esta sesión
    if (urlHuerfana) {
      eliminarImagenHuerfana(urlHuerfana).catch(() => { /* silencioso */ });
    }
  }, [imageUrl, r2Url, esSubidaNueva]);

  return {
    imageUrl,
    r2Url,
    isUploading,
    error,
    uploadImage,
    reset,
    setImageUrl,
    setR2Url,
  };
}

export default useR2Upload;
