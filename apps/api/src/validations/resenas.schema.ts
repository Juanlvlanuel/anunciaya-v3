/**
 * resenas.schema.ts
 * ==================
 * Validaciones Zod para el módulo de reseñas.
 *
 * UBICACIÓN: apps/api/src/validations/resenas.schema.ts
 */

import { z } from 'zod';

// =============================================================================
// CAMPOS REUTILIZABLES
// =============================================================================

/**
 * Campo: UUID (para validar IDs)
 * Permisivo: acepta cualquier formato UUID (incluyendo UUIDs de testing)
 */
const campoUUID = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'El ID debe ser un UUID válido'
  );

// =============================================================================
// CREAR RESEÑA
// =============================================================================

export const crearResenaSchema = z.object({
    sucursalId: campoUUID,
    rating: z.number().int().min(1).max(5).optional(),
    texto: z.string().max(500, 'Máximo 500 caracteres').optional(),
}).refine(
    (data) => data.rating !== undefined || (data.texto !== undefined && data.texto.trim().length > 0),
    { message: 'Debes incluir al menos una calificación o un comentario' }
);

export type CrearResenaInput = z.infer<typeof crearResenaSchema>;

// =============================================================================
// RESPONDER RESEÑA (desde negocio: ScanYA o Business Studio)
// =============================================================================

export const responderResenaSchema = z.object({
    resenaId: z.string().regex(/^\d+$/, 'resenaId debe ser un número válido'),
    texto: z.string()
        .min(1, 'La respuesta no puede estar vacía')
        .max(500, 'Máximo 500 caracteres'),
});

export type ResponderResenaInput = z.infer<typeof responderResenaSchema>;

// =============================================================================
// EDITAR RESEÑA (cliente edita su propia reseña)
// =============================================================================

export const editarResenaSchema = z.object({
    resenaId: z.string().regex(/^\d+$/, 'resenaId debe ser un número válido'),
    texto: z.string().max(500, 'Máximo 500 caracteres').optional(),
    rating: z.number().int().min(1).max(5).optional(),
}).refine(
    (data) => data.texto !== undefined || data.rating !== undefined,
    { message: 'Debes incluir al menos texto o rating para editar' }
);

export type EditarResenaInput = z.infer<typeof editarResenaSchema>;