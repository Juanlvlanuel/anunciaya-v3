/**
 * ============================================================================
 * VALIDACIONES ZOD — Asistente Coyo (FAB global)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/validations/asistente.schema.ts
 *
 * Schema para POST /api/asistente/interpretar — un turno de chat (texto y/o
 * audio) + historial reciente + contexto de la app.
 */

import { z } from 'zod';

const turnoChatSchema = z.object({
    rol: z.enum(['usuario', 'coyo']),
    texto: z.string().trim().min(1).max(2000),
});

export const interpretarAsistenteSchema = z
    .object({
        texto: z.string().trim().min(1).max(1000).optional(),
        audioBase64: z.string().min(1).optional(),
        // Tipos que produce MediaRecorder en navegadores (mismo catálogo que ChatYA) —
        // Gemini documenta soporte oficial para wav/mp3/aiff/aac/ogg/flac, NO para
        // webm explícitamente. Verificar con un envío real antes de asumir que
        // audio/webm (el más común en Chrome/Android) funciona tal cual.
        audioMimeType: z.enum(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']).optional(),
        historial: z.array(turnoChatSchema).max(20).default([]),
        rutaActual: z.string().trim().min(1).max(200),
        modoComercial: z.boolean().optional(),
        // Nombre real del negocio (modo comercial) — evita que Gemini invente uno
        // al redactar descripciones/textos cuando no tiene con qué anclarse.
        nombreNegocio: z.string().trim().min(1).max(200).optional(),
        // Contexto de ubicación — solo se usa si Gemini decide ejecutar
        // buscar_informacion (mismo requisito que GET /api/coyo/buscar).
        ciudad: z.string().trim().min(2).max(100).optional(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
    })
    .refine((data) => Boolean(data.texto) || Boolean(data.audioBase64), {
        message: 'Se requiere texto o audio',
        path: ['texto'],
    })
    .refine((data) => !data.audioBase64 || Boolean(data.audioMimeType), {
        message: 'audioMimeType es obligatorio cuando se manda audioBase64',
        path: ['audioMimeType'],
    });

export type InterpretarAsistenteInput = z.infer<typeof interpretarAsistenteSchema>;

export function formatearErroresZod(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const campo = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${campo}${issue.message}`;
    });
}
