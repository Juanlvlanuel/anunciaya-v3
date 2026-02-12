/**
 * resenas.schema.ts
 * ==================
 * Validaciones Zod para el módulo de reseñas.
 *
 * UBICACIÓN: apps/api/src/validations/resenas.schema.ts
 */

import { z } from 'zod';

// =============================================================================
// CREAR RESEÑA
// =============================================================================

export const crearResenaSchema = z.object({
    sucursalId: z.string().uuid('sucursalId debe ser un UUID válido'),
    rating: z.number().int().min(1).max(5).optional(),
    texto: z.string().max(500, 'Máximo 500 caracteres').optional(),
}).refine(
    (data) => data.rating !== undefined || (data.texto !== undefined && data.texto.trim().length > 0),
    { message: 'Debes incluir al menos una calificación o un comentario' }
);

export type CrearResenaInput = z.infer<typeof crearResenaSchema>;