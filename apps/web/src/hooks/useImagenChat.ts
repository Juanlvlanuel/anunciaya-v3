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

/** Tamaño máximo permitido del archivo original: 10MB (alineado con backend) */
const MAX_TAMANO_BYTES = 10 * 1024 * 1024;

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
  /**
   * Vacía el strip de preview SIN revocar los blob URLs — usar cuando el
   * envío optimista va a reutilizar `blobUrl` en la burbuja del chat
   * mientras sube a R2 en background. Quien llama es responsable de
   * revocar cada blobUrl cuando ya no se necesite.
   */
  limpiarSinRevocar: () => void;
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
      reject(new Error('No pudimos procesar esta imagen. Intenta con otra.'));
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
        reject(new Error('No pudimos procesar esta imagen. Intenta con otra.'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      // Exportar como WebP
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('No pudimos comprimir la imagen. Intenta con una imagen más pequeña.'));
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
      reject(new Error('No pudimos procesar esta imagen. Intenta con otra.'));
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
  return new Promise((resolve, _reject) => {
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
        console.error('No se pudo crear canvas para LQIP');
        resolve('');
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);

      // Exportar como data URL base64
      const dataUrl = canvas.toDataURL('image/webp', calidadLQIP);
      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      console.error('Error al generar LQIP');
      resolve('');
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
  // Procesar UNA imagen: agregar placeholder crudo AL INSTANTE (preview
  // inmediato en el strip) y optimizar (resize + WebP + LQIP) en background,
  // reemplazando el placeholder cuando termina.
  // ---------------------------------------------------------------------------
  const procesarImagen = useCallback(async (archivo: File) => {
    // ── Validar que no se exceda el máximo ──
    if (imagenesListas.length >= MAX_IMAGENES) {
      setError(`Máximo ${MAX_IMAGENES} imágenes por envío.`);
      return;
    }

    // ── Validar formato ──
    if (!FORMATOS_PERMITIDOS.includes(archivo.type)) {
      setError('Formato no soportado. Usa JPG, PNG, WebP o GIF.');
      return;
    }

    // ── Validar tamaño ──
    if (archivo.size > MAX_TAMANO_BYTES) {
      const maxMB = (MAX_TAMANO_BYTES / (1024 * 1024)).toFixed(0);
      setError(`La imagen no puede pesar más de ${maxMB}MB.`);
      return;
    }

    setError(null);
    setProcesando(true);

    // ── Preview instantáneo: placeholder con el archivo crudo (sin optimizar) ──
    const idLocal = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    let blobUrlCrudo: string;
    try {
      blobUrlCrudo = URL.createObjectURL(archivo);
      blobUrlsRef.current.push(blobUrlCrudo);
      const { ancho, alto } = await leerDimensiones(archivo);

      setImagenesListas((prev) => [...prev, {
        archivo, blobUrl: blobUrlCrudo, ancho, alto, peso: archivo.size, miniatura: '', _idLocal: idLocal,
      }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar imagen';
      setError(msg);
      setProcesando(false);
      return;
    }

    // ── Optimizar en background: redimensionar + WebP + LQIP, luego reemplazar el placeholder ──
    try {
      const { archivo: archivoOptimizado, ancho, alto } = await optimizarImagen(archivo);
      const miniatura = await generarLQIP(archivoOptimizado);
      const blobUrlOptimizado = URL.createObjectURL(archivoOptimizado);
      blobUrlsRef.current.push(blobUrlOptimizado);

      setImagenesListas((prev) => prev.map((img) =>
        img._idLocal === idLocal
          ? { archivo: archivoOptimizado, blobUrl: blobUrlOptimizado, ancho, alto, peso: archivoOptimizado.size, miniatura, caption: img.caption, _idLocal: idLocal }
          : img
      ));
    } catch (err) {
      // La optimización falló: quitar el placeholder crudo, no dejar una imagen a medias
      setImagenesListas((prev) => prev.filter((img) => img._idLocal !== idLocal));
      const msg = err instanceof Error ? err.message : 'Error al procesar imagen';
      setError(msg);
    } finally {
      URL.revokeObjectURL(blobUrlCrudo);
      blobUrlsRef.current = blobUrlsRef.current.filter((u) => u !== blobUrlCrudo);
      setProcesando(false);
    }
  }, [imagenesListas.length]);

  // ---------------------------------------------------------------------------
  // Procesar MÚLTIPLES imágenes (desde input multiple o drop): agregar un
  // placeholder crudo por archivo AL INSTANTE (en orden) y optimizar cada
  // una en paralelo en background, reemplazando su placeholder al terminar.
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
    let primerErrorLote = lote.length < imagenes.length
      ? `Se agregaron ${lote.length} de ${imagenes.length} (máximo ${MAX_IMAGENES}).`
      : null;

    setProcesando(true);

    // ── Preview instantáneo: un placeholder crudo por archivo, en orden ──
    const pendientes: { idLocal: string; archivo: File; blobUrlCrudo: string }[] = [];
    for (const [i, archivo] of lote.entries()) {
      if (archivo.size > MAX_TAMANO_BYTES) {
        if (!primerErrorLote) primerErrorLote = `${archivo.name} excede el límite de tamaño.`;
        continue;
      }
      try {
        const idLocal = `${Date.now()}_${Math.random().toString(36).slice(2)}_${i}`;
        const blobUrlCrudo = URL.createObjectURL(archivo);
        blobUrlsRef.current.push(blobUrlCrudo);
        const { ancho, alto } = await leerDimensiones(archivo);
        pendientes.push({ idLocal, archivo, blobUrlCrudo });
        setImagenesListas((prev) => [...prev, {
          archivo, blobUrl: blobUrlCrudo, ancho, alto, peso: archivo.size, miniatura: '', _idLocal: idLocal,
        }]);
      } catch {
        if (!primerErrorLote) primerErrorLote = 'No pudimos procesar una de las imágenes.';
      }
    }

    // ── Optimizar cada una en paralelo y reemplazar su placeholder al terminar ──
    const resultados = await Promise.allSettled(
      pendientes.map(async ({ idLocal, archivo, blobUrlCrudo }) => {
        const { archivo: archivoOptimizado, ancho, alto } = await optimizarImagen(archivo);
        const miniatura = await generarLQIP(archivoOptimizado);
        const blobUrlOptimizado = URL.createObjectURL(archivoOptimizado);
        blobUrlsRef.current.push(blobUrlOptimizado);

        setImagenesListas((prev) => prev.map((img) =>
          img._idLocal === idLocal
            ? { archivo: archivoOptimizado, blobUrl: blobUrlOptimizado, ancho, alto, peso: archivoOptimizado.size, miniatura, caption: img.caption, _idLocal: idLocal }
            : img
        ));

        URL.revokeObjectURL(blobUrlCrudo);
        blobUrlsRef.current = blobUrlsRef.current.filter((u) => u !== blobUrlCrudo);
      })
    );

    // Si alguna falló al optimizar, quitar su placeholder crudo
    resultados.forEach((r, i) => {
      if (r.status === 'rejected') {
        const { idLocal, blobUrlCrudo } = pendientes[i];
        setImagenesListas((prev) => prev.filter((img) => img._idLocal !== idLocal));
        URL.revokeObjectURL(blobUrlCrudo);
        blobUrlsRef.current = blobUrlsRef.current.filter((u) => u !== blobUrlCrudo);
        if (!primerErrorLote) {
          primerErrorLote = r.reason instanceof Error ? r.reason.message : 'Error al procesar algunas imágenes';
        }
      }
    });

    if (primerErrorLote && !error) {
      setError(primerErrorLote);
    } else if (!primerErrorLote) {
      setError(null);
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
  // Limpiar solo el strip de preview: NO revoca blob URLs (el caller los
  // reutiliza en la burbuja optimista mientras sube a R2)
  // ---------------------------------------------------------------------------
  const limpiarSinRevocar = useCallback(() => {
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
    limpiarSinRevocar,
    puedeAgregarMas,
    maxImagenes: MAX_IMAGENES,
  };
}

export default useImagenChat;