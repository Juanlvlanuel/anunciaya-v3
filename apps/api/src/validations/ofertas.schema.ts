/**
 * ============================================================================
 * VALIDACIONES ZOD - Ofertas
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/validations/ofertas.schema.ts
 * 
 * PROPÓSITO:
 * Validar datos de entrada para operaciones CRUD de ofertas
 * Usando Zod v4 (sintaxis actualizada)
 * 
 * CREADO: Fase 5.4.2 - Sistema Completo de Ofertas
 */

import { z } from 'zod';

// =============================================================================
// CAMPOS REUTILIZABLES
// =============================================================================

/**
 * Campo: tipo de oferta
 * Debe ser uno de los tipos permitidos
 */
const campoTipo = z.enum(
  ['porcentaje', 'monto_fijo', '2x1', '3x2', 'envio_gratis', 'otro'],
  {
    message: 'El tipo debe ser: porcentaje, monto_fijo, 2x1, 3x2, envio_gratis u otro',
  }
);

/**
 * Campo: título de la oferta
 * Mínimo 5 caracteres, máximo 150
 */
const campoTitulo = z
  .string()
  .trim()
  .min(5, 'El título debe tener al menos 5 caracteres')
  .max(150, 'El título no puede exceder 150 caracteres');

/**
 * Campo: descripción (opcional)
 * Máximo 500 caracteres
 */
const campoDescripcion = z
  .string()
  .trim()
  .max(500, 'La descripción no puede exceder 500 caracteres')
  .optional()
  .nullable();

/**
 * Campo: imagen (opcional)
 * URL de Cloudinary, máximo 500 caracteres
 */
const campoImagen = z
  .string()
  .url('La imagen debe ser una URL válida')
  .max(500, 'La URL de la imagen no puede exceder 500 caracteres')
  .optional()
  .nullable();

/**
 * Campo: valor del descuento
 * Opcional, acepta string (para tipo "otro") o number (para porcentaje/monto_fijo)
 */
const campoValor = z
  .union([
    z.string().max(100, 'El texto no puede exceder 100 caracteres'),
    z.number().positive('El valor debe ser mayor a 0').max(100000, 'El valor no puede exceder $100,000')
  ])
  .optional()
  .nullable();

/**
 * Campo: compra mínima
 * Opcional, debe ser 0 o mayor
 */
const campoCompraMinima = z
  .number()
  .min(0, 'La compra mínima debe ser 0 o mayor')
  .max(999999.99, 'La compra mínima no puede exceder $999,999.99')
  .optional()
  .default(0);

/**
 * Campo: fecha (ISO string)
 */
const campoFecha = z
  .string()
  .datetime({ message: 'Debe ser una fecha válida en formato ISO' });

/**
 * Campo: límite de usos (opcional)
 * NULL = ilimitado
 */
const campoLimiteUsos = z
  .number()
  .int('El límite de usos debe ser un número entero')
  .positive('El límite de usos debe ser mayor a 0')
  .optional()
  .nullable();

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
// SCHEMA 1: CREAR OFERTA
// =============================================================================
// Para: POST /api/ofertas

export const crearOfertaSchema = z
  .object({
    titulo: campoTitulo,
    descripcion: campoDescripcion,
    imagen: campoImagen,
    tipo: campoTipo,
    valor: campoValor,
    compraMinima: campoCompraMinima,
    fechaInicio: campoFecha,
    fechaFin: campoFecha,
    limiteUsos: campoLimiteUsos,
    articuloId: campoUUID.optional().nullable(),
    activo: z.boolean().optional().default(true),
  })
  .refine(
    (data) => {
      // Validación: fechaFin debe ser mayor o igual a fechaInicio
      const inicio = new Date(data.fechaInicio);
      const fin = new Date(data.fechaFin);
      return fin >= inicio;
    },
    {
      message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      path: ['fechaFin'],
    }
  )
  .refine(
    (data) => {
      // Validación: si tipo es 'porcentaje', valor debe estar entre 1 y 100
      if (data.tipo === 'porcentaje' && typeof data.valor === 'number') {
        return data.valor >= 1 && data.valor <= 100;
      }
      return true;
    },
    {
      message: 'Para descuento por porcentaje, el valor debe estar entre 1 y 100',
      path: ['valor'],
    }
  )
  .refine(
    (data) => {
      // Validación: si tipo es 'monto_fijo', valor debe estar presente y ser número
      if (data.tipo === 'monto_fijo') {
        return typeof data.valor === 'number' && data.valor > 0;
      }
      return true;
    },
    {
      message: 'Para descuento por monto fijo, debes especificar el valor',
      path: ['valor'],
    }
  )
  .refine(
    (data) => {
      // Validación: si tipo es 'otro', valor debe estar presente y ser string
      if (data.tipo === 'otro') {
        return typeof data.valor === 'string' && data.valor.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Para tipo otro, debes especificar el concepto',
      path: ['valor'],
    }
  );

export type CrearOfertaInput = z.infer<typeof crearOfertaSchema>;

// =============================================================================
// SCHEMA 2: ACTUALIZAR OFERTA
// =============================================================================
// Para: PUT /api/ofertas/:id
// Todos los campos son opcionales (PATCH)

export const actualizarOfertaSchema = z
  .object({
    titulo: campoTitulo.optional(),
    descripcion: campoDescripcion,
    imagen: campoImagen,
    tipo: campoTipo.optional(),
    valor: campoValor,
    compraMinima: campoCompraMinima.optional(),
    fechaInicio: campoFecha.optional(),
    fechaFin: campoFecha.optional(),
    limiteUsos: campoLimiteUsos,
    articuloId: campoUUID.optional().nullable(),
    activo: z.boolean().optional(),
  })
  .refine(
    // Validación: al menos un campo debe estar presente
    (data) => Object.keys(data).length > 0,
    {
      message: 'Debes proporcionar al menos un campo para actualizar',
    }
  )
  .refine(
    (data) => {
      // Validación: si se actualizan fechas, fechaFin >= fechaInicio
      if (data.fechaInicio && data.fechaFin) {
        const inicio = new Date(data.fechaInicio);
        const fin = new Date(data.fechaFin);
        return fin >= inicio;
      }
      return true;
    },
    {
      message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      path: ['fechaFin'],
    }
  )
  .refine(
    (data) => {
      // Validación: si tipo es 'porcentaje', validar valor
      if (data.tipo === 'porcentaje' && typeof data.valor === 'number') {
        return data.valor >= 1 && data.valor <= 100;
      }
      return true;
    },
    {
      message: 'Para descuento por porcentaje, el valor debe estar entre 1 y 100',
      path: ['valor'],
    }
  )
  .refine(
    (data) => {
      // Validación: si tipo es 'monto_fijo', valor debe ser número positivo
      if (data.tipo === 'monto_fijo') {
        return typeof data.valor === 'number' && data.valor > 0;
      }
      return true;
    },
    {
      message: 'Para descuento por monto fijo, debes especificar el valor',
      path: ['valor'],
    }
  )
  .refine(
    (data) => {
      // Validación: si tipo es 'otro', valor debe ser string no vacío
      if (data.tipo === 'otro') {
        return typeof data.valor === 'string' && data.valor.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Para tipo otro, debes especificar el concepto',
      path: ['valor'],
    }
  );

export type ActualizarOfertaInput = z.infer<typeof actualizarOfertaSchema>;

// =============================================================================
// SCHEMA 3: DUPLICAR OFERTA A SUCURSALES
// =============================================================================
// Para: POST /api/ofertas/:id/duplicar
// Solo DUEÑOS pueden usar esta función

export const duplicarOfertaSchema = z.object({
  sucursalesIds: z
    .array(campoUUID)
    .min(1, 'Debes seleccionar al menos una sucursal')
    .max(50, 'No puedes duplicar a más de 50 sucursales a la vez'),
});

export type DuplicarOfertaInput = z.infer<typeof duplicarOfertaSchema>;

// =============================================================================
// SCHEMA 4: FILTROS FEED (Query params)
// =============================================================================
// Para: GET /api/ofertas/feed
// Nota: Si viene sucursalId, filtra por esa sucursal específica (para perfil de negocio)

export const filtrosFeedSchema = z.object({
  sucursalId: campoUUID.optional(),
  latitud: z.coerce.number().optional(),
  longitud: z.coerce.number().optional(),
  distanciaMaxKm: z.coerce.number().int().positive().max(500).optional().default(50),
  categoriaId: z.coerce.number().int().positive().optional(),
  tipo: campoTipo.optional(),
  busqueda: z.string().trim().max(100).optional(),
  limite: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  fechaLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato debe ser YYYY-MM-DD').optional(),
});

export type FiltrosFeedInput = z.infer<typeof filtrosFeedSchema>;

// =============================================================================
// FUNCIÓN HELPER: Formatear errores de Zod v4
// =============================================================================

export function formatearErroresZod(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const campo = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
    return `${campo}${issue.message}`;
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  crearOfertaSchema,
  actualizarOfertaSchema,
  duplicarOfertaSchema,
  filtrosFeedSchema,
  formatearErroresZod,
};