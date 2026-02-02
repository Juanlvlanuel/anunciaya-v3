/**
 * puntos.schema.ts
 * =================
 * Validaciones Zod para los endpoints de Configuración de Puntos y Recompensas.
 * 
 * Ubicación: apps/api/src/validations/puntos.schema.ts
 * 
 * CAMBIOS EN ESTA VERSIÓN:
 * - diasExpiracionPuntos ahora permite NULL (puntos nunca expiran)
 * - Eliminado minimoCompra (no se usa en MVP)
 * - Eliminados validarHorario, horarioInicio, horarioFin (irán en Seguridad futura)
 * - Eliminados nivel*Nombre (nombres siempre fijos: Bronce/Plata/Oro)
 * - Agregados schemas para CRUD de recompensas
 * - PATRÓN: Frontend sube a Cloudinary, backend recibe URL
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
  
  // IMPORTANTE: Ahora permite NULL para "nunca expiran"
  diasExpiracionPuntos: z
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 día de expiración')
    .max(365, 'Máximo 365 días de expiración')
    .nullable()
    .optional(),
  
  diasExpiracionVoucher: z
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 día de expiración')
    .max(365, 'Máximo 365 días de expiración')
    .optional(),
  
  // Estado
  activo: z
    .boolean()
    .optional(),
  
  // Sistema de niveles
  nivelesActivos: z
    .boolean()
    .optional(),
  
  // Nivel Bronce (rangos configurables, nombre fijo "Bronce" en frontend)
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
  
  // Nivel Plata (rangos configurables, nombre fijo "Plata" en frontend)
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
  
  // Nivel Oro (rangos configurables, nombre fijo "Oro" en frontend)
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
});

// =============================================================================
// SCHEMA: CREAR RECOMPENSA
// =============================================================================

/**
 * Crear nueva recompensa
 * NOTA: Frontend sube imagen a Cloudinary primero, luego envía URL
 */
export const crearRecompensaSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede tener más de 200 caracteres'),
  
  descripcion: z
    .string()
    .max(1000, 'La descripción no puede tener más de 1000 caracteres')
    .optional()
    .nullable(),
  
  puntosRequeridos: z
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 punto requerido'),
  
  // URL de Cloudinary (ya subida desde frontend)
  imagenUrl: z
    .string()
    .url('Debe ser una URL válida')
    .optional()
    .nullable(),
  
  stock: z
    .number()
    .int('Debe ser un número entero')
    .positive('El stock debe ser positivo')
    .nullable()
    .optional(), // NULL = ilimitado
  
  requiereAprobacion: z
    .boolean()
    .default(false),
  
  activa: z
    .boolean()
    .default(true),
  
  orden: z
    .number()
    .int('Debe ser un número entero')
    .min(0)
    .default(0)
    .optional(),
});

// =============================================================================
// SCHEMA: ACTUALIZAR RECOMPENSA
// =============================================================================

/**
 * Actualizar recompensa existente
 */
export const actualizarRecompensaSchema = z.object({
  nombre: z
    .string()
    .min(1, 'El nombre es requerido')
    .max(200, 'El nombre no puede tener más de 200 caracteres')
    .optional(),
  
  descripcion: z
    .string()
    .max(1000, 'La descripción no puede tener más de 1000 caracteres')
    .optional()
    .nullable(),
  
  puntosRequeridos: z
    .number()
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 punto requerido')
    .optional(),
  
  // Nueva URL de Cloudinary (si se cambió la imagen)
  imagenUrl: z
    .string()
    .url('Debe ser una URL válida')
    .optional()
    .nullable(),
  
  // Flag para eliminar imagen actual
  eliminarImagen: z
    .boolean()
    .optional(),
  
  stock: z
    .number()
    .int('Debe ser un número entero')
    .positive('El stock debe ser positivo')
    .nullable()
    .optional(), // NULL = ilimitado
  
  requiereAprobacion: z
    .boolean()
    .optional(),
  
  activa: z
    .boolean()
    .optional(),
  
  orden: z
    .number()
    .int('Debe ser un número entero')
    .min(0)
    .optional(),
});

// =============================================================================
// TIPOS EXPORTADOS
// =============================================================================

export type ActualizarConfigPuntosInput = z.infer<typeof actualizarConfigPuntosSchema>;
export type CrearRecompensaInput = z.infer<typeof crearRecompensaSchema>;
export type ActualizarRecompensaInput = z.infer<typeof actualizarRecompensaSchema>;

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