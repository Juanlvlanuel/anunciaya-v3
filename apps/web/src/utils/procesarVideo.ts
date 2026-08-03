/**
 * procesarVideo.ts
 * =================
 * Helper compartido para validar duración y generar el poster (thumbnail) de
 * un video antes de subirlo a Cloudflare R2. Espejo estructural de
 * `optimizarImagen.ts` (Promise + cleanup de blob URLs).
 *
 * El video NO se comprime ni se transcodifica — se sube tal cual lo grabó el
 * navegador (no hay ffmpeg en el repo). Solo el poster se genera en canvas.
 *
 * Reutilizado por:
 *  - `useFotosUploaderMarketplace`
 *  - `useFotosUploaderServicios`
 *  - `useFotosUploaderNegocioPublicacion`
 *
 * Doc maestro: docs/arquitectura/Video_En_Publicaciones.md
 *
 * Ubicación: apps/web/src/utils/procesarVideo.ts
 */

/** Límite de tamaño por video, validado en frontend antes de subir. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Límite de duración por video, validado en frontend antes de subir. */
export const MAX_VIDEO_DURACION_SEG = 60;

export interface ResultadoProcesarVideo {
    /** Poster/thumbnail del video, en WebP. */
    poster: Blob;
    /** Duración real del video en segundos (para mostrarla en UI si hace falta). */
    duracionSeg: number;
}

export interface OpcionesProcesarVideo {
    /** Calidad WebP del poster entre 0 y 1. Default: 0.85. */
    quality?: number;
}

/**
 * Valida la duración de un video y genera su poster capturando un frame a
 * canvas.
 *
 * @throws si el video excede `MAX_VIDEO_DURACION_SEG`, o si el navegador no
 *         puede leer/decodificar el archivo.
 */
export async function procesarVideo(
    file: File,
    opciones: OpcionesProcesarVideo = {}
): Promise<ResultadoProcesarVideo> {
    const quality = opciones.quality ?? 0.85;

    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        const blobUrl = URL.createObjectURL(file);

        const limpiar = () => {
            URL.revokeObjectURL(blobUrl);
            video.removeAttribute('src');
            video.load();
        };

        video.onloadedmetadata = () => {
            if (video.duration > MAX_VIDEO_DURACION_SEG) {
                limpiar();
                reject(
                    new Error(
                        `El video dura más de ${MAX_VIDEO_DURACION_SEG} segundos. Recorta el clip o graba uno más corto.`
                    )
                );
                return;
            }
            // Frame representativo: 10% de la duración (evita frames negros del
            // primer instante), acotado a la duración total.
            video.currentTime = Math.min(video.duration * 0.1, video.duration);
        };

        video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                limpiar();
                reject(new Error('No se pudo crear contexto canvas'));
                return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const duracionSeg = video.duration;

            canvas.toBlob(
                (blob) => {
                    limpiar();
                    if (blob) resolve({ poster: blob, duracionSeg });
                    else reject(new Error('Error al generar el poster del video'));
                },
                'image/webp',
                quality
            );
        };

        video.onerror = () => {
            limpiar();
            reject(new Error('Error al cargar el video para procesarlo'));
        };

        video.src = blobUrl;
    });
}
