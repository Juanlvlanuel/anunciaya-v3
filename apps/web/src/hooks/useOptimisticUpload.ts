/**
 * ============================================================================
 * useOptimisticUpload.ts - Hook de Upload Optimista
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useOptimisticUpload.ts
 * 
 * PROPÓSITO:
 * Hook personalizado que encapsula toda la lógica de upload optimista de
 * imágenes a Cloudinary.
 * 
 * QUÉ ES "OPTIMISTIC UI":
 * En lugar de mostrar un spinner mientras sube la imagen, mostramos la imagen
 * INMEDIATAMENTE usando un preview local, y en segundo plano la subimos a
 * Cloudinary. El usuario ve la imagen al instante, sin esperas.
 * 
 * CARACTERÍSTICAS:
 * - Preview local instantáneo (0ms de delay)
 * - Upload a Cloudinary en segundo plano
 * - Optimización automática (redimensionar + comprimir + WebP)
 * - Manejo automático de estados (uploading, error, success)
 * - Limpieza automática de memoria
 * - Callbacks personalizables
 * - Reutilizable en toda la app
 * - Modo single y modo multiple
 * 
 * USO:
 * const { imageUrl, isUploading, uploadImage } = useOptimisticUpload({
 *   carpeta: 'logos',
 *   onSuccess: (url) => console.log('Subido:', url)
 * });
 * 
 * CASOS DE USO:
 * - Onboarding: logos, portadas, productos
 * - ChatYA: imágenes en mensajes
 * - Perfil: avatar de usuario
 * - Cualquier upload de imagen en la app
 * ============================================================================
 */

import { useState, useCallback, useEffect } from 'react';
import { uploadToCloudinary, uploadToCloudinaryDetallado } from '@/utils/cloudinary';

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Opciones de configuración del hook
 */
interface OpcionesUpload {
  /**
   * Carpeta en Cloudinary donde se guardará la imagen
   * Ejemplos: 'logos', 'productos', 'chat', 'avatares'
   * La ruta final será: anunciaya/{carpeta}/
   */
  carpeta?: string;

  /**
   * Callback que se ejecuta cuando el upload termina exitosamente
   * Recibe la URL de Cloudinary como parámetro (string para single, array para multiple)
   */
  onSuccess?: (url: string | string[] | Array<{ url: string, publicId: string }>) => void | Promise<void>;

  /**
   * Callback que se ejecuta si hay un error en el upload
   * Recibe el objeto Error como parámetro
   */
  onError?: (error: Error) => void;

  /**
   * Callback que se ejecuta cuando una imagen se elimina exitosamente
   * Recibe la URL de la imagen eliminada como parámetro
   * Útil para eliminar el registro de BD después de eliminar de Cloudinary
   */
  onDelete?: (url: string) => void | Promise<void>;

  /**
   * Modo múltiple: permite subir y manejar arrays de imágenes
   * Default: false (modo single)
   */
  multiple?: boolean;

  /**
   * Máximo de imágenes permitidas (solo para modo multiple)
   * Default: 10
   */
  maxImages?: number;

  /**
   * Si debe optimizar imágenes antes de subir (redimensionar + comprimir + convertir a WebP)
   * Default: true
   */
  optimizar?: boolean;

  /**
   * Ancho máximo para redimensionar (solo si optimizar: true)
   * Default: 1920
   */
  maxWidth?: number;

  /**
   * Calidad de compresión 0-1 (solo si optimizar: true)
   * Default: 0.85 (85% de calidad)
   */
  quality?: number;
}

/**
 * Valores que devuelve el hook
 */
interface ResultadoUpload {
  /**
   * URL actual de la imagen
   * - Puede ser URL local (blob:...) mientras sube
   * - Cambia a URL de Cloudinary cuando termina
   */
  imageUrl: string | null;

  /**
   * URL de Cloudinary (null hasta que el upload termine)
   */
  cloudinaryUrl: string | null;

  /**
   * Indica si el upload está en progreso
   */
  isUploading: boolean;

  /**
   * Mensaje de error si algo salió mal
   */
  error: string | null;

  /**
   * Función para subir una imagen
   * @param file - Archivo de imagen del input
   */
  uploadImage: (file: File) => Promise<void>;

  /**
   * ✨ NUEVO: Función para eliminar la imagen (optimista)
   * @returns true si se eliminó correctamente, false si falló
   */
  deleteImage: () => Promise<boolean>;

  /**
   * Función para resetear todo el estado
   */
  reset: () => void;

  /**
   * Indica si la URL actual es local (preview) o de Cloudinary
   * - true: Es preview local (todavía subiendo)
   * - false: Es URL de Cloudinary (ya subió)
   */
  isLocal: boolean;

  /**
   * Función para setear imagen URL manualmente (útil para cargar datos existentes)
   */
  setImageUrl: (url: string | null) => void;

  /**
   * Función para setear Cloudinary URL manualmente (útil para cargar datos existentes)
   */
  setCloudinaryUrl: (url: string | null) => void;

  /**
   * Función para setear isLocal manualmente (útil para cargar datos existentes)
   */
  setIsLocal: (isLocal: boolean) => void;

  // =========================================================================
  // PROPIEDADES PARA MODO MULTIPLE (solo disponibles si multiple: true)
  // =========================================================================

  /**
   * Array de URLs de imágenes (solo modo multiple)
   */
  images?: string[];

  /**
   * Función para subir múltiples imágenes (solo modo multiple)
   */
  uploadImages?: (files: File[]) => Promise<void>;

  /**
   * Función para eliminar imagen por índice (solo modo multiple)
   */
  deleteImageAt?: (index: number) => Promise<boolean>;

  /**
   * Función para setear imágenes manualmente (solo modo multiple)
   */
  setImages?: (urls: string[]) => void;

  /**
   * Indica si se pueden agregar más imágenes (solo modo multiple)
   */
  canAddMore?: boolean;
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

/**
 * Hook personalizado para upload optimista de imágenes
 * 
 * CÓMO FUNCIONA:
 * 
 * 1. Usuario selecciona imagen
 * 2. Hook crea preview local INSTANTÁNEAMENTE (URL.createObjectURL)
 * 3. Hook muestra el preview al usuario (sin esperar)
 * 4. En segundo plano, sube a Cloudinary
 * 5. Cuando termina, reemplaza URL local por URL de Cloudinary
 * 6. Usuario NO nota el cambio (transición invisible)
 * 
 * POR QUÉ ES MEJOR QUE UPLOAD TRADICIONAL:
 * 
 * Upload tradicional:
 *   Usuario selecciona → Spinner 3 seg → Imagen aparece ❌
 * 
 * Upload optimista (este hook):
 *   Usuario selecciona → Imagen aparece INSTANTÁNEAMENTE ✅
 *   (En segundo plano: sube a Cloudinary)
 * 
 * @param options - Configuración del upload
 * @returns Objeto con estados y funciones del upload
 * 
 * @example
 * // Uso en componente de onboarding (logo)
 * function PasoImagenes() {
 *   const logo = useOptimisticUpload({
 *     carpeta: 'logos',
 *     onSuccess: (url) => {
 *       console.log('Logo subido:', url);
 *       // Guardar URL en store o backend
 *     }
 *   });
 * 
 *   const handleFile = (e) => {
 *     const file = e.target.files?.[0];
 *     if (file) logo.uploadImage(file);
 *   };
 * 
 *   return (
 *     <div>
 *       <input type="file" onChange={handleFile} />
 *       {logo.imageUrl && <img src={logo.imageUrl} />}
 *       {logo.isUploading && <span>Guardando...</span>}
 *     </div>
 *   );
 * }
 * 
 * @example
 * // Uso en ChatYA (imagen en mensaje)
 * function ChatInput() {
 *   const imagen = useOptimisticUpload({
 *     carpeta: 'chat',
 *     onSuccess: (url) => {
 *       // Enviar mensaje con imagen
 *       sendMessage({ tipo: 'imagen', url });
 *     }
 *   });
 * 
 *   return (
 *     <div>
 *       {imagen.imageUrl && (
 *         <img src={imagen.imageUrl} />
 *       )}
 *       <input type="file" onChange={(e) => {
 *         const file = e.target.files?.[0];
 *         if (file) imagen.uploadImage(file);
 *       }} />
 *     </div>
 *   );
 * }
 */
export function useOptimisticUpload(
  options: OpcionesUpload = {}
): ResultadoUpload {
  const {
    carpeta,
    onSuccess,
    onError,
    onDelete,
    multiple = false,
    maxImages = 10,
    optimizar = true,
    maxWidth = 1920,
    quality = 0.85
  } = options;

  // =========================================================================
  // ESTADOS
  // =========================================================================

  /**
   * URL de la imagen que se muestra al usuario
   * - Inicia como null (sin imagen)
   * - Cambia a URL local cuando se selecciona archivo
   * - Cambia a URL de Cloudinary cuando termina upload
   */
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  /**
   * URL de Cloudinary (solo se llena cuando el upload termina)
   */
  const [cloudinaryUrl, setCloudinaryUrl] = useState<string | null>(null);

  /**
   * Indica si el upload está en progreso
   */
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Mensaje de error si algo salió mal
   */
  const [error, setError] = useState<string | null>(null);

  /**
   * Guarda la URL local para poder limpiarla después
   */
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  /**
   * Array de imágenes para modo multiple
   * Cada imagen tiene url y flag isLocal
   */
  const [images, setImages] = useState<Array<{ url: string, isLocal: boolean }>>([]);

  // =========================================================================
  // COMPUTED VALUES
  // =========================================================================

  /**
   * Determina si la URL actual es local o de Cloudinary
   * - true: Es preview local (blob:...)
   * - false: Es URL de Cloudinary (https://res.cloudinary.com/...)
   */
  const isLocal = imageUrl !== null && cloudinaryUrl === null;

  // =========================================================================
  // FUNCIÓN DE OPTIMIZACIÓN DE IMÁGENES
  // =========================================================================

  /**
   * Optimiza una imagen: redimensiona, comprime y convierte a WebP
   * 
   * PROCESO:
   * 1. Lee la imagen del archivo
   * 2. Redimensiona si excede maxWidth (mantiene aspect ratio)
   * 3. Convierte a WebP con compresión ajustable
   * 4. Devuelve nuevo File optimizado
   * 
   * RESULTADO TÍPICO:
   * - foto.jpg (4000x3000, 3.2MB) → foto.webp (1200x900, ~180KB)
   * - Reducción: ~94% más ligera
   * 
   * @param file - Archivo original
   * @param maxWidthParam - Ancho máximo (usa this.maxWidth si no se especifica)
   * @param qualityParam - Calidad 0-1 (usa this.quality si no se especifica)
   */
  async function optimizarImagen(
    file: File,
    maxWidthParam?: number,
    qualityParam?: number
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        let width = img.width;
        let height = img.height;
        const targetMaxWidth = maxWidthParam ?? maxWidth;

        // Redimensionar si excede el máximo
        if (width > targetMaxWidth) {
          height = (height * targetMaxWidth) / width;
          width = targetMaxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('No se pudo crear el contexto del canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const targetQuality = qualityParam ?? quality;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al convertir imagen'));
              return;
            }

            // Convertir a .webp
            const fileName = file.name.replace(/\.[^/.]+$/, '.webp');
            const optimizedFile = new File([blob], fileName, {
              type: 'image/webp',
              lastModified: Date.now()
            });

            resolve(optimizedFile);
          },
          'image/webp',
          targetQuality
        );
      };

      img.onerror = () => reject(new Error('Error al cargar la imagen'));
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsDataURL(file);
    });
  }

  // =========================================================================
  // FUNCIÓN PRINCIPAL DE UPLOAD
  // =========================================================================

  /**
   * Sube una imagen con preview optimista
   * 
   * FLUJO COMPLETO:
   * 1. Resetear errores previos
   * 2. Crear preview local con URL.createObjectURL()
   * 3. Mostrar preview al usuario INMEDIATAMENTE
   * 4. Marcar como "uploading"
   * 5. Subir a Cloudinary en segundo plano
   * 6. Cuando termine, reemplazar URL local por Cloudinary
   * 7. Ejecutar callback onSuccess
   * 8. Limpiar URL local de memoria
   * 
   * Si hay error:
   * 1. Guardar mensaje de error
   * 2. Mantener preview local (no lo borramos)
   * 3. Ejecutar callback onError
   */
  const uploadImage = useCallback(async (file: File) => {
    try {
      // 1. RESETEAR ERRORES
      setError(null);
      setIsUploading(true);

      // 2. OPTIMIZAR IMAGEN (si está habilitado)
      const fileToUpload = optimizar
        ? await optimizarImagen(file)
        : file;

      // 3. CREAR PREVIEW LOCAL INSTANTÁNEO
      // Esto es lo que hace que la imagen aparezca inmediatamente
      const preview = URL.createObjectURL(fileToUpload);
      setLocalUrl(preview);
      setImageUrl(preview);

      // 4. UPLOAD A CLOUDINARY EN SEGUNDO PLANO
      // El usuario YA puede ver la imagen, esto pasa "detrás"
      const url = await uploadToCloudinary(fileToUpload, carpeta);

      // 5. REEMPLAZAR URL LOCAL POR CLOUDINARY
      // Este cambio es invisible para el usuario
      setCloudinaryUrl(url);
      setImageUrl(url);
      setIsUploading(false);

      // 6. EJECUTAR CALLBACK DE ÉXITO
      if (onSuccess) {
        onSuccess(url);
      }

      // 7. LIMPIAR PREVIEW LOCAL DE MEMORIA
      // Ya no lo necesitamos, tenemos la URL de Cloudinary
      URL.revokeObjectURL(preview);
      setLocalUrl(null);

    } catch (err) {
      // MANEJO DE ERRORES
      const error = err as Error;

      console.error('❌ Error en upload:', error.message);

      setError(error.message);
      setIsUploading(false);

      // Ejecutar callback de error
      if (onError) {
        onError(error);
      }

      // IMPORTANTE: NO borramos la imagen del preview
      // El usuario ya la vio, sería confuso que desaparezca
      // Mejor mostrar un indicador de error pero mantener la imagen
    }
  }, [carpeta, onSuccess, onError, optimizar, maxWidth, quality]);

  // =========================================================================
  // FUNCIÓN DE RESET
  // =========================================================================

  /**
   * Resetea todo el estado del upload
   * 
   * CUÁNDO USAR:
   * - Cuando el usuario cancele la selección
   * - Cuando quiera cambiar de imagen
   * - Después de enviar un formulario
   * - Al desmontar el componente
   */
  const reset = useCallback(() => {
    // Limpiar preview local si existe
    if (localUrl) {
      URL.revokeObjectURL(localUrl);
    }

    // Resetear todos los estados
    setImageUrl(null);
    setCloudinaryUrl(null);
    setIsUploading(false);
    setError(null);
    setLocalUrl(null);

  }, [localUrl]);

  // =========================================================================
  // CLEANUP AL DESMONTAR
  // =========================================================================

  /**
   * Limpia la URL local cuando el componente se desmonta
   * 
   * POR QUÉ ES IMPORTANTE:
   * Si el componente se desmonta mientras hay una URL local activa,
   * causaría un memory leak. Este useEffect previene eso.
   */
  useEffect(() => {
    return () => {
      if (localUrl) {
        URL.revokeObjectURL(localUrl);
      }
    };
  }, [localUrl]);

  // =========================================================================
  // FUNCIÓN DE ELIMINACIÓN OPTIMISTA
  // =========================================================================

  /**
   * Elimina la imagen con enfoque optimista
   * 
   * FLUJO OPTIMISTA:
   * 1. Ocultar imagen INMEDIATAMENTE (usuario ve cambio al instante)
   * 2. Llamar a backend para eliminar de Cloudinary
   * 3. Si falla, restaurar imagen + mostrar error
   * 4. Si éxito, mantener oculta (confirmación silenciosa)
   * 
   * POR QUÉ OPTIMISTA:
   * El usuario ve el resultado inmediato sin esperar respuesta del servidor.
   * Si falla, lo notificamos, pero la mayoría de las veces funcionará.
   * 
   * @example
   * const { deleteImage } = useOptimisticUpload({ carpeta: 'logos' });
   * 
   * const handleDelete = () => {
   *   deleteImage(); // Imagen desaparece instantáneamente
   * };
   */
  const deleteImage = useCallback(async () => {
    // Solo permitir eliminación si hay una URL de Cloudinary
    if (!cloudinaryUrl) {
      setError('No hay imagen de Cloudinary para eliminar');
      return false;
    }

    // Guardar URL actual por si necesitamos restaurar
    const urlAnterior = imageUrl;
    const cloudinaryUrlAnterior = cloudinaryUrl;

    try {

      // 1. OCULTAR IMAGEN INMEDIATAMENTE (OPTIMISTIC)
      setImageUrl(null);
      setCloudinaryUrl(null);
      setError(null);

      // 2. ELIMINAR DE CLOUDINARY EN SEGUNDO PLANO

      // Importar función de eliminación
      const { eliminarDeCloudinary } = await import('@/utils/cloudinary');
      const exito = await eliminarDeCloudinary(cloudinaryUrlAnterior);

      if (exito) {

        // Ejecutar callback de éxito si existe
        if (onSuccess) {
          onSuccess(''); // URL vacía porque se eliminó
        }

        return true;
      } else {
        // 3. SI FALLA, RESTAURAR IMAGEN
        console.error('❌ Error al eliminar, restaurando imagen...');

        setImageUrl(urlAnterior);
        setCloudinaryUrl(cloudinaryUrlAnterior);
        setError('Error al eliminar imagen');

        // Ejecutar callback de error
        if (onError) {
          onError(new Error('Error al eliminar imagen'));
        }

        return false;
      }

    } catch (err) {
      // MANEJO DE ERRORES - RESTAURAR
      const error = err as Error;

      console.error('❌ Error en eliminación:', error.message);

      // Restaurar imagen
      setImageUrl(urlAnterior);
      setCloudinaryUrl(cloudinaryUrlAnterior);
      setError(error.message);

      if (onError) {
        onError(error);
      }

      return false;
    }
  }, [cloudinaryUrl, imageUrl, onSuccess, onError]);

  // =========================================================================
  // FUNCIONES PARA MODO MULTIPLE
  // =========================================================================

  /**
   * Sube múltiples imágenes con preview optimista
   * Solo funciona si multiple: true
   */
  const uploadImages = useCallback(async (files: File[]) => {
    if (!multiple) return;

    const espacioDisponible = maxImages - images.length;
    if (files.length > espacioDisponible) {
      const error = new Error(`Solo puedes agregar ${espacioDisponible} imagen(es) más`);
      setError(error.message);
      if (onError) onError(error);
      return;
    }

    setIsUploading(true);

    // 1. CREAR TODOS LOS PREVIEWS INMEDIATAMENTE
    const archivosConPreview = await Promise.all(
      files.map(async (file) => {
        const fileToUpload = optimizar ? await optimizarImagen(file) : file;
        const preview = URL.createObjectURL(fileToUpload);
        return { file: fileToUpload, preview };
      })
    );

    // 2. MOSTRAR TODOS LOS PREVIEWS EN LA UI INMEDIATAMENTE
    setImages(prev => [
      ...prev,
      ...archivosConPreview.map(item => ({ url: item.preview, isLocal: true }))
    ]);

    // 3. SUBIR TODAS A CLOUDINARY EN PARALELO
    const resultados = await Promise.allSettled(
      archivosConPreview.map(async ({ file, preview }) => {
        try {
          const resultado = await uploadToCloudinaryDetallado(file, carpeta);

          // Reemplazar preview con URL real
          setImages(prev =>
            prev.map(img =>
              img.url === preview
                ? { url: resultado.url, isLocal: false }
                : img
            )
          );

          URL.revokeObjectURL(preview);

          return { url: resultado.url, publicId: resultado.publicId };
        } catch (err) {
          // Si falla, quitar el preview
          setImages(prev => prev.filter(img => img.url !== preview));
          URL.revokeObjectURL(preview);
          throw err;
        }
      })
    );

    setIsUploading(false);

    // 4. EJECUTAR onSuccess CON LAS IMÁGENES QUE SE SUBIERON EXITOSAMENTE
    const exitosas = resultados
      .filter((r): r is PromiseFulfilledResult<{ url: string; publicId: string }> => r.status === 'fulfilled')
      .map(r => r.value);

    if (onSuccess && exitosas.length > 0) {
      await Promise.resolve(onSuccess(exitosas));
    }

    // Notificar errores si hubo
    const fallidas = resultados.filter(r => r.status === 'rejected').length;
    if (fallidas > 0 && onError) {
      onError(new Error(`${fallidas} imagen(es) no se pudieron subir`));
    }
  }, [multiple, maxImages, images, carpeta, onSuccess, onError, optimizar, maxWidth, quality]);

  /**
   * Elimina una imagen por índice con enfoque optimista
   * Solo funciona si multiple: true
   */
  const deleteImageAt = useCallback(async (index: number) => {
    if (!multiple || !images[index]) return false;

    const imagenAEliminar = images[index];
    const imagesBackup = [...images];

    try {
      // Optimistic: eliminar inmediatamente
      setImages(prev => prev.filter((_, i) => i !== index));

      const { eliminarDeCloudinary } = await import('@/utils/cloudinary');
      const exito = await eliminarDeCloudinary(imagenAEliminar.url);

      if (exito) {
        // 🆕 Ejecutar callback onDelete con la URL eliminada
        if (onDelete) {
          await Promise.resolve(onDelete(imagenAEliminar.url));
        }
        return true;
      }
      else {
        // Restaurar si falla
        setImages(imagesBackup);
        setError('Error al eliminar imagen');
        if (onError) onError(new Error('Error al eliminar imagen'));
        return false;
      }

    } catch (err) {
      const error = err as Error;
      setImages(imagesBackup);
      setError(error.message);
      if (onError) onError(error);
      return false;
    }
  }, [multiple, images, onDelete, onError]);  // ← Agregar onDelete a dependencias

  /**
   * Setea manualmente el array de imágenes
   * Útil para cargar datos existentes
   */
  const setImagesManually = useCallback((urls: string[]) => {
    setImages(urls.map(url => ({ url, isLocal: false })));
  }, []);

  // =========================================================================
  // RETORNO DEL HOOK
  // =========================================================================
  // =========================================================================
  // FUNCIÓN PARA SETEAR isLocal
  // =========================================================================

  const setIsLocalManual = useCallback((value: boolean) => {
    // Para setear isLocal, necesitamos controlar cloudinaryUrl
    if (value) {
      // Si queremos que sea local, limpiamos cloudinaryUrl
      setCloudinaryUrl(null);
    } else {
      // Si no es local, imageUrl debe ser cloudinaryUrl
      if (imageUrl) {
        setCloudinaryUrl(imageUrl);
      }
    }
  }, [imageUrl]);

  // Modo multiple: retorna propiedades para arrays de imágenes
  if (multiple) {
    return {
      imageUrl: null,
      cloudinaryUrl: null,
      isUploading,
      error,
      uploadImage: async () => { },
      deleteImage: async () => false,
      reset,
      isLocal: false,
      setImageUrl,
      setCloudinaryUrl,
      setIsLocal: setIsLocalManual,
      // Propiedades exclusivas de multiple
      images: images.map(img => img.url),
      uploadImages,
      deleteImageAt,
      setImages: setImagesManually,
      canAddMore: images.length < maxImages,
    };
  }

  // Modo single (actual): sin cambios, compatibilidad total
  return {
    imageUrl,
    cloudinaryUrl,     // ← AGREGAR
    isUploading,
    error,
    uploadImage,
    deleteImage,
    reset,
    isLocal,
    setImageUrl,       // ← AGREGAR
    setCloudinaryUrl,  // ← AGREGAR
    setIsLocal: setIsLocalManual, // ← AGREGAR
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useOptimisticUpload;