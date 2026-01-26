/**
 * puntos.schema.ts
 * =================
 * Validaciones Zod para los endpoints de Configuración de Puntos.
 * 
 * Ubicación: apps/api/src/validations/puntos.schema.ts
 */

import { z } from 'zod';

// =============================================================================
// SCHEMA: ACTUALIZAR CONFIGURACIÓN DE PUNTOS
// =============================================================================

/**
 * Actualizar Configuración de Puntos del Negocio
 */
export const actualizarConfigPuntosSchema = z.object({
  // Configuración básica
  puntosPorPeso: z
    .number()
    .positive('Los puntos por peso deben ser mayores a 0')
    .optional(),
  minimoCompra: z
    .number()
    .min(0, 'El mínimo de compra no puede ser negativo')
    .optional(),
  diasExpiracionPuntos: z
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 día de expiración')
    .max(365, 'Máximo 365 días de expiración')
    .optional(),
  diasExpiracionVoucher: z
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 día de expiración')
    .max(365, 'Máximo 365 días de expiración')
    .optional(),
  
  // Configuración de horario
  validarHorario: z
    .boolean()
    .optional(),
  horarioInicio: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Formato de hora inválido (HH:MM o HH:MM:SS)')
    .optional(),
  horarioFin: z
    .string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, 'Formato de hora inválido (HH:MM o HH:MM:SS)')
    .optional(),
  
  // Estado
  activo: z
    .boolean()
    .optional(),
  
  // Sistema de niveles
  nivelesActivos: z
    .boolean()
    .optional(),
  
  // Nivel Bronce
  nivelBronceMin: z
    .number()
    .int()
    .min(0)
    .optional(),
  nivelBronceMax: z
    .number()
    .int()
    .min(0)
    .optional(),
  nivelBronceMultiplicador: z
    .number()
    .min(0.1, 'El multiplicador mínimo es 0.1')
    .max(10, 'El multiplicador máximo es 10')
    .optional(),
  nivelBronceNombre: z
    .string()
    .max(50, 'El nombre no puede tener más de 50 caracteres')
    .optional(),
  
  // Nivel Plata
  nivelPlataMin: z
    .number()
    .int()
    .min(0)
    .optional(),
  nivelPlataMax: z
    .number()
    .int()
    .min(0)
    .optional(),
  nivelPlataMultiplicador: z
    .number()
    .min(0.1, 'El multiplicador mínimo es 0.1')
    .max(10, 'El multiplicador máximo es 10')
    .optional(),
  nivelPlataNombre: z
    .string()
    .max(50, 'El nombre no puede tener más de 50 caracteres')
    .optional(),
  
  // Nivel Oro
  nivelOroMin: z
    .number()
    .int()
    .min(0)
    .optional(),
  nivelOroMultiplicador: z
    .number()
    .min(0.1, 'El multiplicador mínimo es 0.1')
    .max(10, 'El multiplicador máximo es 10')
    .optional(),
  nivelOroNombre: z
    .string()
    .max(50, 'El nombre no puede tener más de 50 caracteres')
    .optional(),
}).refine(
  (data) => {
    // Si se envían ambos horarios, validar que fin > inicio
    if (data.horarioInicio && data.horarioFin) {
      return data.horarioFin > data.horarioInicio;
    }
    return true;
  },
  { message: 'El horario de fin debe ser mayor al de inicio' }
);

// =============================================================================
// TIPOS EXPORTADOS
// =============================================================================

export type ActualizarConfigPuntosInput = z.infer<typeof actualizarConfigPuntosSchema>;

// =============================================================================
// FUNCIÓN AUXILIAR PARA FORMATEAR ERRORES
// =============================================================================

/**
 * Convierte errores de Zod a un formato más amigable
 */
export function formatearErroresZod(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  
  for (const issue of error.issues) {
    const campo = issue.path.join('.');
    errores[campo] = issue.message;
  }
  
  return errores;
}