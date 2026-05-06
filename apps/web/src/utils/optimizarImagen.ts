/**
 * optimizarImagen.ts
 * ===================
 * Helper compartido para redimensionar y comprimir imágenes antes de subir
 * a Cloudflare R2. Convierte cualquier formato (jpeg/png/heic) a WebP con
 * calidad ajustable y ancho máximo proporcional.
 *
 * Reutilizado por:
 *  - `useR2Upload` (ChatYA, Business Studio perfil, etc.)
 *  - `useSubirFotoMarketplace` (wizard de publicar artículos)
 *
 * Beneficios:
 *  - Reduce 70-90% el tamaño de fotos de cámara móvil (5-10MB → ~500KB)
 *  - Estándar WebP unificado en R2 (menos costos de bandwidth, carga rápida)
 *  - Cliente-side: el server no ve el archivo original (privacidad+performance)
 *
 * Ubicación: apps/web/src/utils/optimizarImagen.ts
 */

export interface OpcionesOptimizar {
    /** Ancho máximo en pixels. Si la imagen es más angosta, no se sube. Default: 1920. */
    maxWidth?: number;
    /** Calidad WebP entre 0 y 1. Default: 0.85 (buen balance peso/visual). */
    quality?: number;
}

/**
 * Redimensiona y comprime una imagen usando canvas. Devuelve un Blob WebP.
 *
 * @throws si el archivo no es una imagen válida o el navegador no soporta canvas.
 */
export async function optimizarImagen(
    file: File,
    opciones: OpcionesOptimizar = {}
): Promise<Blob> {
    const maxWidth = opciones.maxWidth ?? 1920;
    const quality = opciones.quality ?? 0.85;

    return new Promise((resolve, reject) => {
        const img = new Image();
        const blobUrl = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(blobUrl);

            // Calcular dimensiones manteniendo proporción
            let { width, height } = img;
            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('No se pudo crear contexto canvas'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Error al comprimir imagen'));
                },
                'image/webp',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            reject(new Error('Error al cargar imagen para optimización'));
        };

        img.src = blobUrl;
    });
}
