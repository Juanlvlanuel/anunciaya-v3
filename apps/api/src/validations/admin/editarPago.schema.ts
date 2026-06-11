/**
 * editarPago.schema.ts
 * ====================
 * Validación (Zod v4) de la edición de una fila del historial de pagos manuales.
 * Para: PATCH /api/admin/negocios/:id/pagos/:pagoId
 *
 * Solo corrige el REGISTRO contable de un pago ya capturado: cómo pagó (concepto),
 * cuánto (monto) y cuántos meses cubrió. NO recalcula la vigencia del negocio ni toca
 * Stripe. Mismo refine de cortesía que el alta manual (cortesía ⇒ sin monto; ingreso ⇒
 * monto > 0); la regla "cortesía ⇒ monto NULL" la blinda además el CHECK de la tabla.
 *
 * Ubicación: apps/api/src/validations/admin/editarPago.schema.ts
 */

import { z } from 'zod';

export const editarPagoSchema = z
  .object({
    // Cómo pagó. Cortesía no lleva monto (gratis).
    concepto: z.enum(['efectivo', 'transferencia', 'cortesia'], {
      message: 'El concepto debe ser efectivo, transferencia o cortesía',
    }),
    monto: z
      .number()
      .min(0, 'El monto debe ser mayor o igual a 0')
      .max(999999.99, 'El monto es demasiado alto')
      .optional(),
    meses: z
      .number({ message: 'Los meses son requeridos' })
      .int('Los meses deben ser un número entero')
      .min(1, 'Debe cubrir al menos 1 mes')
      .max(36, 'No puede exceder 36 meses'),
  })
  // El monto es obligatorio (mayor a 0) salvo en cortesía (gratis).
  .refine((d) => d.concepto === 'cortesia' || (typeof d.monto === 'number' && d.monto > 0), {
    message: 'El monto es obligatorio y mayor a 0 (salvo cortesía)',
    path: ['monto'],
  });

export type EditarPagoInput = z.infer<typeof editarPagoSchema>;
