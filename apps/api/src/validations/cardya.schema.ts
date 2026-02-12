/**
 * cardya.schema.ts
 * ================
 * Validaciones Zod para los endpoints de CardYA (Cliente)
 * 
 * Ubicación: apps/api/src/validations/cardya.schema.ts
 */

import { z } from 'zod';

// =============================================================================
// SCHEMA: CANJEAR RECOMPENSA
// =============================================================================

export const canjearRecompensaSchema = z.object({
  recompensaId: z
    .string()
    .uuid('El ID de la recompensa debe ser un UUID válido'),

  sucursalId: z
    .string()
    .uuid('El ID de la sucursal debe ser un UUID válido')
    .optional(),
});

// =============================================================================
// SCHEMA: CANCELAR VOUCHER
// =============================================================================

export const cancelarVoucherSchema = z.object({});

// =============================================================================
// SCHEMA: FILTROS HISTORIAL COMPRAS
// =============================================================================

export const filtrosHistorialComprasSchema = z.object({
  negocioId: z
    .string()
    .uuid('El ID del negocio debe ser un UUID válido')
    .optional(),

  limit: z
    .string()
    .optional()
    .transform((val) => val ? Number(val) : undefined)
    .pipe(z.number().int().min(1).optional()),

  offset: z
    .string()
    .optional()
    .default('0')
    .transform(Number)
    .pipe(z.number().int().min(0)),
});

// =============================================================================
// SCHEMA: FILTROS HISTORIAL CANJES
// =============================================================================

export const filtrosHistorialCanjesSchema = z.object({
  negocioId: z
    .string()
    .uuid('El ID del negocio debe ser un UUID válido')
    .optional(),

  estado: z
    .enum(['usado', 'cancelado'], {
      message: 'El estado debe ser "usado" o "cancelado"',
    })
    .optional(),

  limit: z
    .string()
    .optional()
    .transform((val) => val ? Number(val) : undefined)
    .pipe(z.number().int().min(1).optional()),

  offset: z
    .string()
    .optional()
    .default('0')
    .transform(Number)
    .pipe(z.number().int().min(0)),
});

// =============================================================================
// SCHEMA: FILTROS RECOMPENSAS
// =============================================================================

export const filtrosRecompensasSchema = z.object({
  negocioId: z
    .string()
    .uuid('El ID del negocio debe ser un UUID válido')
    .optional(),

  soloDisponibles: z
    .string()
    .optional()
    .default('false')
    .transform((val) => val === 'true')
    .pipe(z.boolean()),
});

// =============================================================================
// SCHEMA: FILTROS VOUCHERS
// =============================================================================

export const filtrosVouchersSchema = z.object({
  estado: z
    .enum(['pendiente', 'usado', 'expirado', 'cancelado'], {
      message: 'El estado debe ser "pendiente", "usado", "expirado" o "cancelado"',
    })
    .optional(),
});

// =============================================================================
// TIPOS EXPORTADOS
// =============================================================================

export type CanjearRecompensaInput = z.infer<typeof canjearRecompensaSchema>;
export type CancelarVoucherInput = z.infer<typeof cancelarVoucherSchema>;
export type FiltrosHistorialComprasInput = z.infer<typeof filtrosHistorialComprasSchema>;
export type FiltrosHistorialCanjesInput = z.infer<typeof filtrosHistorialCanjesSchema>;
export type FiltrosRecompensasInput = z.infer<typeof filtrosRecompensasSchema>;
export type FiltrosVouchersInput = z.infer<typeof filtrosVouchersSchema>;

// =============================================================================
// FUNCIÓN AUXILIAR
// =============================================================================

export function formatearErroresZod(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = issue.path.join('.');
    errores[campo] = issue.message;
  }
  return errores;
}