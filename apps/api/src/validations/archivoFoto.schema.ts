/**
 * ============================================================================
 * VALIDACIONES ZOD — ArchivoFoto (foto o video en publicaciones)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/validations/archivoFoto.schema.ts
 *
 * PROPÓSITO:
 * Schema compartido por MarketPlace, Servicios y Publicaciones de Negocio
 * para el elemento del arreglo `fotos` (columna JSONB). Fotos y videos
 * conviven en el mismo arreglo — no hay un campo separado.
 *
 * Doc maestro: docs/arquitectura/Video_En_Publicaciones.md
 */

import { z } from 'zod';

/** MIME types de imagen aceptados en las 3 secciones. */
export const MIME_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * MIME types de video aceptados. Sin transcodificación (no hay ffmpeg en el
 * repo): se acepta tal cual lo graba el navegador. Se descarta
 * `video/quicktime` (.mov de iPhone) por riesgo de no reproducir en
 * Chrome/Android.
 */
export const MIME_VIDEO = ['video/mp4', 'video/webm'] as const;

export const MIME_FOTO_O_VIDEO = [...MIME_IMAGEN, ...MIME_VIDEO] as const;

export const archivoFotoSchema = z.object({
    url: z.string().url('Cada foto/video debe ser una URL válida'),
    tipo: z.enum(['imagen', 'video'], {
        message: 'El tipo debe ser imagen o video',
    }),
    /** Solo presente cuando tipo === 'video'. Poster generado en frontend. */
    posterUrl: z.string().url('El poster debe ser una URL válida').optional(),
});

export type ArchivoFotoInput = z.infer<typeof archivoFotoSchema>;
