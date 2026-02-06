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
  // Configuración básica (NUEVO: se envían valores originales en vez de ratio)
  pesosPor: z
    .number()
    .positive('Los pesos deben ser mayores a 0')
    .optional(),
  
  puntosGanados: z
    .number()
    .positive('Los puntos ganados deben ser mayores a 0')
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
  
  // Nivel Bronce — min siempre 0, max editable
  nivelBronceMin: z
    .number()
    .int('Bronce mínimo debe ser entero')
    .min(0)
    .optional(),
  nivelBronceMax: z
    .number()
    .int('Bronce máximo debe ser entero')
    .min(1, 'Bronce máximo debe ser al menos 1')
    .optional(),
  nivelBronceMultiplicador: z
    .number()
    .min(1.0, 'El multiplicador mínimo es 1.0')
    .max(10, 'El multiplicador máximo es 10')
    .optional(),
  
  // Nivel Plata — min auto-calculado (bronce max + 1), max editable
  nivelPlataMin: z
    .number()
    .int('Plata mínimo debe ser entero')
    .min(1)
    .optional(),
  nivelPlataMax: z
    .number()
    .int('Plata máximo debe ser entero')
    .min(2, 'Plata máximo debe ser al menos 2')
    .optional(),
  nivelPlataMultiplicador: z
    .number()
    .min(1.0, 'El multiplicador mínimo es 1.0')
    .max(10, 'El multiplicador máximo es 10')
    .optional(),
  
  // Nivel Oro — min auto-calculado (plata max + 1), sin máximo (∞)
  nivelOroMin: z
    .number()
    .int('Oro mínimo debe ser entero')
    .min(2)
    .optional(),
  nivelOroMultiplicador: z
    .number()
    .min(1.0, 'El multiplicador mínimo es 1.0')
    .max(10, 'El multiplicador máximo es 10')
    .optional(),
})
// =============================================================================
// VALIDACIONES CRUZADAS — solo aplican cuando vienen todos los campos de niveles
// (el FAB siempre envía la config completa)
// =============================================================================
.refine((d) => {
  // Bronce min siempre debe ser 0
  if (d.nivelBronceMin === undefined) return true;
  return d.nivelBronceMin === 0;
}, { message: 'Bronce mínimo debe ser 0', path: ['nivelBronceMin'] })

.refine((d) => {
  if (d.nivelBronceMax === undefined || d.nivelPlataMin === undefined) return true;
  // Plata min debe ser exactamente Bronce max + 1 (sin huecos ni solapamientos)
  return d.nivelPlataMin === d.nivelBronceMax + 1;
}, { message: 'Plata mínimo debe ser Bronce máximo + 1', path: ['nivelPlataMin'] })

.refine((d) => {
  if (d.nivelPlataMax === undefined || d.nivelOroMin === undefined) return true;
  // Oro min debe ser exactamente Plata max + 1 (sin huecos ni solapamientos)
  return d.nivelOroMin === d.nivelPlataMax + 1;
}, { message: 'Oro mínimo debe ser Plata máximo + 1', path: ['nivelOroMin'] })

.refine((d) => {
  if (d.nivelPlataMin === undefined || d.nivelPlataMax === undefined) return true;
  // Plata max debe ser mayor que Plata min (rango válido)
  return d.nivelPlataMax > d.nivelPlataMin;
}, { message: 'Plata máximo debe ser mayor que Plata mínimo', path: ['nivelPlataMax'] })

.refine((d) => {
  if (d.nivelBronceMax === undefined || d.nivelPlataMax === undefined) return true;
  // Plata max debe ser mayor que Bronce max (progresión lógica)
  return d.nivelPlataMax > d.nivelBronceMax;
}, { message: 'Plata máximo debe ser mayor que Bronce máximo', path: ['nivelPlataMax'] })

.refine((d) => {
  // Multiplicadores en orden ascendente: Bronce ≤ Plata ≤ Oro
  const mb = d.nivelBronceMultiplicador;
  const mp = d.nivelPlataMultiplicador;
  const mo = d.nivelOroMultiplicador;
  if (mb === undefined || mp === undefined || mo === undefined) return true;
  return mb < mp && mp < mo;
}, { message: 'Los multiplicadores deben ser ascendentes: Bronce < Plata < Oro', path: ['nivelOroMultiplicador'] })

.refine((d) => {
  // Multiplicadores con máximo 2 decimales
  const tieneMax2Decimales = (n: number | undefined) => {
    if (n === undefined) return true;
    return Math.abs(Math.round(n * 100) - n * 100) < 0.001;
  };
  return tieneMax2Decimales(d.nivelBronceMultiplicador)
    && tieneMax2Decimales(d.nivelPlataMultiplicador)
    && tieneMax2Decimales(d.nivelOroMultiplicador);
}, { message: 'Los multiplicadores permiten máximo 2 decimales', path: ['nivelBronceMultiplicador'] });

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