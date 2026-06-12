/**
 * altaManualNegocio.schema.ts
 * ===========================
 * Validación (Zod v4) del alta manual de negocios en efectivo/transferencia desde el Panel.
 * Para: POST /api/admin/negocios/alta-manual
 *
 * El backend recibe la CIUDAD como `ciudadId` (uuid del catálogo) y la valida contra la
 * tabla `ciudades` (existencia + activa + región del solicitante). El correo se captura dos
 * veces y se revalida aquí con un refine cross-campo.
 *
 * Ubicación: apps/api/src/validations/admin/altaManualNegocio.schema.ts
 */

import { z } from 'zod';

const correo = z
  .string()
  .min(1, 'El correo es requerido')
  .email('El correo debe tener un formato válido')
  .max(255, 'El correo no puede exceder 255 caracteres')
  .trim()
  .toLowerCase();

export const altaManualNegocioSchema = z
  .object({
    // Negocio
    nombreNegocio: z
      .string()
      .trim()
      .min(2, 'El nombre del negocio debe tener al menos 2 caracteres')
      .max(120, 'El nombre del negocio no puede exceder 120 caracteres'),

    // Ubicación: id de ciudad del catálogo (el backend valida existencia/región).
    ciudadId: z.string().uuid('La ciudad seleccionada es inválida'),

    // Dueño
    nombre: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede exceder 100 caracteres'),
    apellidos: z
      .string()
      .trim()
      .min(2, 'Los apellidos deben tener al menos 2 caracteres')
      .max(100, 'Los apellidos no pueden exceder 100 caracteres'),
    correo,
    confirmarCorreo: z
      .string()
      .min(1, 'Confirma el correo')
      .email('El correo de confirmación debe tener un formato válido')
      .max(255, 'El correo no puede exceder 255 caracteres')
      .trim()
      .toLowerCase(),
    telefono: z
      .string()
      .trim()
      .regex(/^\+52\d{10}$/, 'El teléfono debe tener formato +52XXXXXXXXXX (10 dígitos)'),

    // Primer pago (membresía). Cortesía no lleva monto (gratis por el periodo elegido).
    concepto: z.enum(['efectivo', 'transferencia', 'cortesia'], {
      message: 'El concepto debe ser efectivo, transferencia o cortesía',
    }),
    monto: z
      .number()
      .min(0, 'El monto debe ser mayor o igual a 0')
      .max(999999.99, 'El monto es demasiado alto')
      .optional(),
    // Periodo cubierto: por MESES (1–36) o por una FECHA exacta de vencimiento (ISO). Uno u otro.
    meses: z
      .number()
      .int('Los meses deben ser un número entero')
      .min(1, 'Debe cubrir al menos 1 mes')
      .max(36, 'No puede exceder 36 meses')
      .optional(),
    hasta: z.string().trim().min(1).optional(),

    // Atribución del vendedor: gerente/superadmin lo eligen de la lista; el vendedor se
    // auto-atribuye en el backend (este campo se ignora para el rol vendedor).
    embajadorId: z.string().uuid('El vendedor seleccionado es inválido').nullable().optional(),
  })
  .refine((d) => d.correo === d.confirmarCorreo, {
    message: 'Los correos no coinciden',
    path: ['confirmarCorreo'],
  })
  // El monto es obligatorio (mayor a 0) salvo en cortesía (gratis).
  .refine((d) => d.concepto === 'cortesia' || (typeof d.monto === 'number' && d.monto > 0), {
    message: 'El monto es obligatorio y mayor a 0 (salvo cortesía)',
    path: ['monto'],
  })
  // Debe venir el periodo: meses O una fecha exacta.
  .refine((d) => typeof d.meses === 'number' || (typeof d.hasta === 'string' && d.hasta.length > 0), {
    message: 'Indica el periodo cubierto: meses o una fecha exacta',
    path: ['meses'],
  })
  // Si es fecha exacta: válida, futura y dentro de 2 años (tope de Stripe a futuro).
  .refine(
    (d) => {
      if (!d.hasta) return true;
      const t = new Date(d.hasta).getTime();
      if (Number.isNaN(t)) return false;
      const ahora = Date.now();
      return t > ahora && t <= ahora + 730 * 24 * 60 * 60 * 1000;
    },
    { message: 'La fecha debe ser futura y dentro de 2 años', path: ['hasta'] },
  );

export type AltaManualNegocioInput = z.infer<typeof altaManualNegocioSchema>;

/** Convierte los errores de Zod v4 en un array de strings legibles (issues, no errors). */
export function formatearErroresZod(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const campo = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${campo}${issue.message}`;
  });
}
