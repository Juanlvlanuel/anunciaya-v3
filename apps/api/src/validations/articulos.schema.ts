/**
 * ============================================================================
 * VALIDACIONES ZOD - Artículos (Productos y Servicios)
 * ============================================================================
 * 
 * UBICACIÓN: apps/api/src/validations/articulos.schema.ts
 * 
 * PROPÓSITO:
 * Validar datos de entrada para operaciones CRUD de artículos
 * Usando Zod v4 (sintaxis actualizada)
 * 
 * CREADO: Fase 5.4.1 - Catálogo CRUD
 */

import { z } from 'zod';

// =============================================================================
// CAMPOS REUTILIZABLES
// =============================================================================

/**
 * Campo: tipo de artículo
 * Debe ser 'producto' o 'servicio'
 */
const campoTipo = z.enum(['producto', 'servicio'], {
    message: 'El tipo debe ser "producto" o "servicio"',
});

/**
 * Campo: nombre del artículo
 * Mínimo 2 caracteres, máximo 150
 */
const campoNombre = z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(150, 'El nombre no puede exceder 150 caracteres');

/**
 * Campo: descripción (opcional)
 * Máximo 1000 caracteres
 */
const campoDescripcion = z
    .string()
    .trim()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional()
    .nullable();

/**
 * Campo: categoría (opcional)
 * Texto libre inventado por el usuario
 * Máximo 100 caracteres, default 'General'
 */
const campoCategoria = z
    .string()
    .trim()
    .min(1, 'La categoría no puede estar vacía')
    .max(100, 'La categoría no puede exceder 100 caracteres')
    .optional();

/**
 * Campo: precio base
 * Debe ser mayor a 0
 */
const campoPrecioBase = z
    .number()
    .positive('El precio base debe ser mayor a 0')
    .max(999999.99, 'El precio base no puede exceder $999,999.99');

/**
 * Campo: imagen principal (URL de Cloudinary)
 * Opcional
 */
const campoImagenPrincipal = z
    .string()
    .url('La imagen debe ser una URL válida')
    .optional()
    .nullable();

/**
 * Campo: UUID (para validar IDs)
 */
const campoUUID = z
    .string()
    .uuid('El ID debe ser un UUID válido');

// =============================================================================
// SCHEMA 1: CREAR ARTÍCULO
// =============================================================================
// Para: POST /api/articulos

export const crearArticuloSchema = z.object({
    tipo: campoTipo,
    nombre: campoNombre,
    descripcion: campoDescripcion,
    categoria: campoCategoria,
    precioBase: campoPrecioBase,
    precioDesde: z.boolean().optional().default(false),
    imagenPrincipal: campoImagenPrincipal,
    disponible: z.boolean().optional().default(true),
    destacado: z.boolean().optional().default(false),
});

export type CrearArticuloInput = z.infer<typeof crearArticuloSchema>;

// =============================================================================
// SCHEMA 2: ACTUALIZAR ARTÍCULO
// =============================================================================
// Para: PUT /api/articulos/:id
// Todos los campos son opcionales (PATCH)

export const actualizarArticuloSchema = z.object({
    nombre: campoNombre.optional(),
    descripcion: campoDescripcion,
    categoria: campoCategoria,
    precioBase: campoPrecioBase.optional(),
    precioDesde: z.boolean().optional(),
    imagenPrincipal: campoImagenPrincipal,
    disponible: z.boolean().optional(),
    destacado: z.boolean().optional(),
    orden: z.number().int().min(0).optional(),
}).refine(
    // Validación: al menos un campo debe estar presente
    (data) => Object.keys(data).length > 0,
    {
        message: 'Debes proporcionar al menos un campo para actualizar',
    }
);

export type ActualizarArticuloInput = z.infer<typeof actualizarArticuloSchema>;

// =============================================================================
// SCHEMA 3: DUPLICAR ARTÍCULO A SUCURSALES
// =============================================================================
// Para: POST /api/articulos/:id/duplicar
// Solo DUEÑOS pueden usar esta función

export const duplicarArticuloSchema = z.object({
    sucursalesIds: z
        .array(campoUUID)
        .min(1, 'Debes seleccionar al menos una sucursal')
        .max(50, 'No puedes duplicar a más de 50 sucursales a la vez'),
});

export type DuplicarArticuloInput = z.infer<typeof duplicarArticuloSchema>;

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
    crearArticuloSchema,
    actualizarArticuloSchema,
    duplicarArticuloSchema,
    formatearErroresZod,
};