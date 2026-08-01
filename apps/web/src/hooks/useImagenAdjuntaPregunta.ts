/**
 * useImagenAdjuntaPregunta.ts
 * =============================
 * Sube (a R2) la foto opcional que el vecino adjunta a una pregunta de Coyo
 * desde el composer del Home. Una sola imagen — no es un uploader de galería
 * como el de MarketPlace/Servicios.
 *
 * Calca el flujo de `useR2Upload.ts` (preview local inmediato con blob URL →
 * presigned URL → PUT a R2) pero con semántica de "borrador" explícita, que
 * `useR2Upload` no separa:
 *   - `quitar()`      → el vecino descartó la foto ANTES de publicar. Borra
 *                        de R2 (fire-and-forget, reference-counted).
 *   - `confirmarUsada()` → la pregunta se publicó con esta foto. Limpia el
 *                        estado local SIN borrar de R2 (ya quedó referenciada
 *                        en `preguntas_comunidad.imagen_url`).
 *
 * Ubicación: apps/web/src/hooks/useImagenAdjuntaPregunta.ts
 */

import { useCallback, useRef, useState } from 'react';
import {
    eliminarFotoPreguntaHuerfana,
    generarUrlUploadImagenPregunta,
} from '../services/preguntasComunidadService';
import { notificar } from '../utils/notificaciones';
import { optimizarImagen } from '../utils/optimizarImagen';

const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function useImagenAdjuntaPregunta() {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [r2Url, setR2Url] = useState<string | null>(null);
    const [subiendo, setSubiendo] = useState(false);
    // Ref (no state) porque `quitar()` puede dispararse desde un cierre viejo
    // (ej. el usuario borra la foto justo cuando termina de subir).
    const r2UrlRef = useRef<string | null>(null);

    const limpiarLocal = useCallback(() => {
        setPreviewUrl((actual) => {
            if (actual?.startsWith('blob:')) URL.revokeObjectURL(actual);
            return null;
        });
        setR2Url(null);
        r2UrlRef.current = null;
        setSubiendo(false);
    }, []);

    const seleccionar = useCallback(async (file: File) => {
        if (!TIPOS_PERMITIDOS.has(file.type.toLowerCase())) {
            notificar.advertencia('Formato no soportado. Usa JPG, PNG o WebP.');
            return;
        }
        if (file.size > MAX_BYTES) {
            notificar.advertencia('La foto pesa más de 5 MB.');
            return;
        }

        const blobUrl = URL.createObjectURL(file);
        setPreviewUrl(blobUrl);
        setSubiendo(true);

        try {
            const blob = await optimizarImagen(file, { maxWidth: 1600, quality: 0.85 });
            const nombreArchivo = file.name.replace(/\.[^.]+$/, '.webp');
            const respuesta = await generarUrlUploadImagenPregunta(nombreArchivo, 'image/webp');
            if (!respuesta.success || !respuesta.data) {
                throw new Error(respuesta.message || 'No se pudo preparar la subida.');
            }
            await fetch(respuesta.data.uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': 'image/webp' },
            });
            setR2Url(respuesta.data.publicUrl);
            r2UrlRef.current = respuesta.data.publicUrl;
        } catch (error) {
            notificar.error(
                error instanceof Error ? error.message : 'No se pudo subir la foto.',
            );
            limpiarLocal();
        } finally {
            setSubiendo(false);
        }
    }, [limpiarLocal]);

    /** El vecino quitó la foto (o cambió de opinión) antes de publicar. */
    const quitar = useCallback(() => {
        const urlABorrar = r2UrlRef.current;
        limpiarLocal();
        if (urlABorrar) {
            eliminarFotoPreguntaHuerfana(urlABorrar).catch(() => { /* best-effort */ });
        }
    }, [limpiarLocal]);

    /** La pregunta se publicó con esta foto — limpia SIN borrar de R2. */
    const confirmarUsada = useCallback(() => {
        limpiarLocal();
    }, [limpiarLocal]);

    return {
        /** blob local mientras sube, o la URL final de R2 — lista para <img src>. */
        previewUrl,
        /** URL final de R2, solo cuando terminó de subir (null mientras sube). */
        r2Url,
        subiendo,
        seleccionar,
        quitar,
        confirmarUsada,
    };
}

export default useImagenAdjuntaPregunta;
