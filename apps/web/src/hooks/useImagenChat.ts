/**
 * useImagenChat.ts
 * ==================
 * Hook especializado para el pipeline zero-flicker de imágenes en ChatYA.
 * Soporta selección múltiple: hasta MAX_IMAGENES por envío.
 *
 * UBICACIÓN: apps/web/src/hooks/useImagenChat.ts
 *
 * QUÉ HACE:
 * 1. Lee dimensiones de cada imagen seleccionada (Pilar 1: anti layout-shift)
 * 2. Optimiza: redimensiona a max 1920px + comprime a WebP calidad 0.85
 * 3. Genera micro-thumbnail LQIP de 16px en base64 (Pilar 2: placeholder borroso)
 * 4. Crea blob URL local para preview instantáneo
 * 5. Empaqueta todo en MetadatosImagen[] listo para enviar
 *
 * MÚLTIPLES IMÁGENES:
 * - procesarImagen() AGREGA al array (no reemplaza)
 * - procesarImagenes() procesa un lote de archivos en paralelo
 * - removerImagen(index) quita una imagen específica del array
 * - caption es GLOBAL (aplica a la primera imagen, estilo WhatsApp)
 * - limpiar() vacía todo el array y revoca todos los blob URLs
 *
 * NO HACE:
 * - No sube a R2 (eso lo maneja InputMensaje al enviar)
 * - No gestiona el estado del chat (eso es del store)
 *
 * POR QUÉ ES HOOK SEPARADO:
 * Separa la responsabilidad de "procesar imagen" de "enviar mensaje".
 * El InputMensaje llama al hook, obtiene MetadatosImagen[], y se lo pasa
 * al store para que haga el envío con la burbuja optimista.
 */

import { useState, useCallback, useRef } from 'react';
import type { MetadatosImagen } from '../types/chatya';

// =============================================================================
// CONSTANTES
// =============================================================================

/** Ancho máximo después de optimización */
const MAX_ANCHO = 1920;

/** Calidad WebP (0-1) */
const CALIDAD_WEBP = 0.85;

/** Ancho del micro-thumbnail LQIP en píxeles */
const LQIP_ANCHO = 16;

/** Calidad del micro-thumbnail (baja, porque se muestra con blur) */
const LQIP_CALIDAD = 0.2;

/** Tamaño máximo permitido del archivo original: 15MB */
const MAX_TAMANO_BYTES = 15 * 1024 * 1024;

/** Máximo de imágenes por envío */
const MAX_IMAGENES = 10;

/** Formatos de imagen aceptados */
const FORMATOS_PERMITIDOS = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

// =============================================================================
// TIPOS
// =============================================================================

interface UseImagenChatResult {
  /** Array de imágenes procesadas listas para enviar */
  imagenesListas: MetadatosImagen[];
  /** Alias: primera imagen del array (compatibilidad con código existente) */
  imagenLista: MetadatosImagen | null;
  /** true mientras se procesa alguna imagen (optimizar + LQIP) */
  procesando: boolean;
  /** Mensaje de error si algo falló */
  error: string | null;
  /** Procesar un archivo de imagen y AGREGAR al array */
  procesarImagen: (archivo: File) => Promise<void>;
  /** Procesar múltiples archivos en paralelo (desde input multiple o drop) */
  procesarImagenes: (archivos: File[]) => Promise<void>;
  /** Remover una imagen del array por índice */
  removerImagen: (index: number) => void;
  /** Actualizar el caption global (aplica a primera imagen) */
  setCaption: (caption: string) => void;
  /** Cancelar/limpiar TODAS las imágenes seleccionadas */
  limpiar: () => void;
  /** ¿Se pueden agregar más imágenes? */
  puedeAgregarMas: boolean;
  /** Máximo de imágenes por envío (constante exportada para UI) */
  maxImagenes: number;
}

// =============================================================================
// FUNCIONES PURAS (fuera del hook, no se recrean)
// =============================================================================

/**
 * Lee las dimensiones de una imagen desde un File.
 * Usa un Image() temporal que carga el blob URL.
 */
function leerDimensiones(archivo: File): Promise<{ ancho: number; alto: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      resolve({ ancho: img.naturalWidth, alto: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

/**
 * Optimiza una imagen: redimensiona a max ancho y comprime a WebP.
 * Devuelve el File optimizado + dimensiones reales resultantes.
 *
 * PROCESO:
 * 1. Carga la imagen en un canvas invisible
 * 2. Si excede MAX_ANCHO, la redimensiona manteniendo aspect ratio
 * 3. Exporta como WebP con calidad 0.85
 * 4. Convierte el blob a File
 */
function optimizarImagen(
  archivo: File,
  maxAncho: number = MAX_ANCHO,
  calidad: number = CALIDAD_WEBP,
): Promise<{ archivo: File; ancho: number; alto: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { naturalWidth: w, naturalHeight: h } = img;

      // Redimensionar si excede el máximo
      if (w > maxAncho) {
        const ratio = maxAncho / w;
        w = maxAncho;
        h = Math.round(h * ratio);
      }

      // Crear canvas y dibujar
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      // Exportar como WebP
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Error al comprimir imagen'));
            return;
          }

          const nombre = archivo.name.replace(/\.[^.]+$/, '') + '.webp';
          const archivoOptimizado = new File([blob], nombre, { type: 'image/webp' });

          resolve({ archivo: archivoOptimizado, ancho: w, alto: h });
        },
        'image/webp',
        calidad,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error al cargar imagen para optimizar'));
    };

    img.src = url;
  });
}

/**
 * Genera un micro-thumbnail LQIP en base64.
 *
 * PROCESO:
 * 1. Redimensiona la imagen a ~16px de ancho (mantiene aspect ratio)
 * 2. Exporta como WebP con calidad 0.2 (~300-500 bytes)
 * 3. Convierte a data URL base64
 *
 * El resultado se muestra con CSS filter: blur(20px) como placeholder
 * mientras la imagen real carga. Es la misma técnica que usa Facebook/Medium.
 */
function generarLQIP(
  archivo: File,
  anchoLQIP: number = LQIP_ANCHO,
  calidadLQIP: number = LQIP_CALIDAD,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calcular dimensiones del thumbnail manteniendo aspect ratio
      const ratio = anchoLQIP / img.naturalWidth;
      const w = anchoLQIP;
      const h = Math.round(img.naturalHeight * ratio);

      // Crear mini canvas
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No se pudo crear canvas para LQIP'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      // Exportar como data URL base64
      const dataUrl = canvas.toDataURL('image/webp', calidadLQIP);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error al generar LQIP'));
    };

    img.src = url;
  });
}

// =============================================================================
// HOOK
// =============================================================================

export function useImagenChat(): UseImagenChatResult {
  const [imagenesListas, setImagenesListas] = useState<MetadatosImagen[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Ref con todos los blob URLs activos para revocarlos al limpiar */
  const blobUrlsRef = useRef<string[]>([]);

  // ---------------------------------------------------------------------------
  // Procesar UNA imagen: validar → optimizar → LQIP → agregar al array
  // ---------------------------------------------------------------------------
  const procesarImagen = useCallback(async (archivo: File) => {
    try {
      setError(null);

      // ── Validar que no se exceda el máximo ──
      if (imagenesListas.length >= MAX_IMAGENES) {
        setError(`Máximo ${MAX_IMAGENES} imágenes por envío.`);
        return;
      }

      setProcesando(true);

      // ── Validar formato ──
      if (!FORMATOS_PERMITIDOS.includes(archivo.type)) {
        throw new Error('Formato no soportado. Usa JPG, PNG, WebP o GIF.');
      }

      // ── Validar tamaño ──
      if (archivo.size > MAX_TAMANO_BYTES) {
        const maxMB = (MAX_TAMANO_BYTES / (1024 * 1024)).toFixed(0);
        throw new Error(`La imagen no puede pesar más de ${maxMB}MB.`);
      }

      // ── Leer dimensiones originales (para validar que sea imagen real) ──
      await leerDimensiones(archivo);

      // ── Optimizar: redimensionar + comprimir WebP ──
      const { archivo: archivoOptimizado, ancho, alto } = await optimizarImagen(archivo);

      // ── Generar LQIP (micro-thumbnail base64 ~400 bytes) ──
      const miniatura = await generarLQIP(archivoOptimizado);

      // ── Crear blob URL para preview instantáneo ──
      const blobUrl = URL.createObjectURL(archivoOptimizado);
      blobUrlsRef.current.push(blobUrl);

      // ── Agregar al array ──
      const nuevaImagen: MetadatosImagen = {
        archivo: archivoOptimizado,
        blobUrl,
        ancho,
        alto,
        peso: archivoOptimizado.size,
        miniatura,
      };

      setImagenesListas((prev) => [...prev, nuevaImagen]);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar imagen';
      setError(msg);
    } finally {
      setProcesando(false);
    }
  }, [imagenesListas.length]);

  // ---------------------------------------------------------------------------
  // Procesar MÚLTIPLES imágenes en paralelo (desde input multiple o drop)
  // ---------------------------------------------------------------------------
  const procesarImagenes = useCallback(async (archivos: File[]) => {
    // Filtrar solo imágenes válidas
    const imagenes = archivos.filter((f) => FORMATOS_PERMITIDOS.includes(f.type));
    if (imagenes.length === 0) return;

    // Calcular cuántas caben antes del máximo
    const espacioDisponible = MAX_IMAGENES - imagenesListas.length;
    if (espacioDisponible <= 0) {
      setError(`Máximo ${MAX_IMAGENES} imágenes por envío.`);
      return;
    }

    // Recortar al espacio disponible
    const lote = imagenes.slice(0, espacioDisponible);
    if (lote.length < imagenes.length) {
      setError(`Se agregaron ${lote.length} de ${imagenes.length} (máximo ${MAX_IMAGENES}).`);
    } else {
      setError(null);
    }

    setProcesando(true);

    // Procesar todas en paralelo
    const resultados = await Promise.allSettled(
      lote.map(async (archivo) => {
        // Validar tamaño
        if (archivo.size > MAX_TAMANO_BYTES) {
          throw new Error(`${archivo.name} excede el límite de tamaño.`);
        }

        // Validar que sea imagen real
        await leerDimensiones(archivo);

        // Optimizar
        const { archivo: archivoOptimizado, ancho, alto } = await optimizarImagen(archivo);

        // LQIP
        const miniatura = await generarLQIP(archivoOptimizado);

        // Blob URL
        const blobUrl = URL.createObjectURL(archivoOptimizado);
        blobUrlsRef.current.push(blobUrl);

        return {
          archivo: archivoOptimizado,
          blobUrl,
          ancho,
          alto,
          peso: archivoOptimizado.size,
          miniatura,
        } as MetadatosImagen;
      })
    );

    // Recoger las que se procesaron exitosamente
    const exitosas = resultados
      .filter((r): r is PromiseFulfilledResult<MetadatosImagen> => r.status === 'fulfilled')
      .map((r) => r.value);

    if (exitosas.length > 0) {
      setImagenesListas((prev) => [...prev, ...exitosas]);
    }

    // Si hubo errores individuales, mostrar el primero
    const primerError = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    if (primerError && !error) {
      const msg = primerError.reason instanceof Error ? primerError.reason.message : 'Error al procesar algunas imágenes';
      setError(msg);
    }

    setProcesando(false);
  }, [imagenesListas.length, error]);

  // ---------------------------------------------------------------------------
  // Remover imagen por índice
  // ---------------------------------------------------------------------------
  const removerImagen = useCallback((index: number) => {
    setImagenesListas((prev) => {
      if (index < 0 || index >= prev.length) return prev;

      // Revocar el blob URL de la imagen removida
      const removida = prev[index];
      URL.revokeObjectURL(removida.blobUrl);
      blobUrlsRef.current = blobUrlsRef.current.filter((url) => url !== removida.blobUrl);

      // Crear nuevo array sin esa imagen
      return prev.filter((_, i) => i !== index);
    });
    setError(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Caption global (se guarda en la primera imagen del array)
  // ---------------------------------------------------------------------------
  const setCaption = useCallback((caption: string) => {
    setImagenesListas((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((img, i) =>
        i === 0 ? { ...img, caption: caption || undefined } : img
      );
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Limpiar TODO: revocar todos los blob URLs + resetear estado
  // ---------------------------------------------------------------------------
  const limpiar = useCallback(() => {
    // Revocar todos los blob URLs activos
    for (const url of blobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    blobUrlsRef.current = [];

    setImagenesListas([]);
    setError(null);
    setProcesando(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Valores computados
  // ---------------------------------------------------------------------------
  const imagenLista = imagenesListas.length > 0 ? imagenesListas[0] : null;
  const puedeAgregarMas = imagenesListas.length < MAX_IMAGENES;

  return {
    imagenesListas,
    imagenLista,
    procesando,
    error,
    procesarImagen,
    procesarImagenes,
    removerImagen,
    setCaption,
    limpiar,
    puedeAgregarMas,
    maxImagenes: MAX_IMAGENES,
  };
}

export default useImagenChat;