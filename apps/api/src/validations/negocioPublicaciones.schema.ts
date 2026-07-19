/**
 * ============================================================================
 * VALIDACIONES ZOD — Feed de Publicaciones de Negocio
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/validations/negocioPublicaciones.schema.ts
 *
 * PROPÓSITO:
 * Schemas Zod para el feed de publicaciones libres de negocio (Negocios).
 * Contenido "todo tipo, libre" — a diferencia de MarketPlace, sin modo
 * vendo/busco, sin categoría estructurada, sin límite de fotos de producto
 * (solo tope técnico anti-abuso).
 *
 * Doc maestro: docs/arquitectura/Negocios.md
 */

import { z } from 'zod';

// =============================================================================
// CAMPOS REUTILIZABLES
// =============================================================================

const campoTexto = z
    .string()
    .trim()
    .min(1, 'Escribe algo para tu publicación')
    .max(2000, 'El texto no puede exceder 2000 caracteres');

const campoPrecio = z
    .number({ message: 'El precio debe ser un número' })
    .nonnegative('El precio no puede ser negativo')
    .max(999999, 'El precio máximo permitido es $999,999')
    .optional()
    .nullable();

// Sin límite de producto — 40 es un tope TÉCNICO de seguridad anti-abuso,
// no una restricción de negocio (el negocio puede publicar tantas fotos
// como quiera hasta este guardarraíl).
const campoFotos = z
    .array(z.string().url('Cada foto debe ser una URL válida'))
    .max(40, 'No puedes incluir más de 40 fotos');

const campoFotoPortadaIndex = z
    .number()
    .int('El índice de portada debe ser un entero')
    .min(0, 'El índice de portada no puede ser negativo')
    .optional();

export const campoUUID = z.string().uuid('ID inválido');

// =============================================================================
// CREAR / ACTUALIZAR PUBLICACIÓN
// =============================================================================

export const crearPublicacionSchema = z.object({
    texto: campoTexto,
    precio: campoPrecio,
    fotos: campoFotos.default([]),
    fotoPortadaIndex: campoFotoPortadaIndex,
});

export type CrearPublicacionInput = z.infer<typeof crearPublicacionSchema>;

export const actualizarPublicacionSchema = z.object({
    texto: campoTexto.optional(),
    precio: campoPrecio,
    fotos: campoFotos.optional(),
    fotoPortadaIndex: campoFotoPortadaIndex,
});

export type ActualizarPublicacionInput = z.infer<typeof actualizarPublicacionSchema>;

// =============================================================================
// FEED
// =============================================================================

const campoBooleanoQuery = z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true'));

export const feedQuerySchema = z.object({
    // Nombre de ciudad (mismo patrón que MarketPlace/Servicios) — el backend
    // resuelve el ciudad_id vía resolverCiudadId, el frontend no necesita el UUID.
    ciudad: z.string().trim().optional(),
    sucursalId: z.string().uuid('sucursalId inválido').optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(20).default(10),
    // Mismos filtros que `GET /api/negocios` (listarSucursalesController) —
    // una publicación hereda los filtros del negocio/sucursal que la hizo.
    latitud: z.coerce.number().min(-90).max(90).optional(),
    longitud: z.coerce.number().min(-180).max(180).optional(),
    distanciaMaxKm: z.coerce.number().positive().optional(),
    categoriaId: z.coerce.number().int().positive().optional(),
    subcategoriaIds: z
        .string()
        .optional()
        .transform((v) =>
            v
                ? v
                      .split(',')
                      .map((id) => parseInt(id, 10))
                      .filter((n) => !Number.isNaN(n))
                : undefined
        ),
    aceptaCardYA: campoBooleanoQuery,
    aDomicilio: campoBooleanoQuery,
});

export type FeedQueryInput = z.infer<typeof feedQuerySchema>;

// =============================================================================
// DETALLE — GPS opcional para calcular distancia (mismo criterio que el feed)
// =============================================================================

export const detalleQuerySchema = z.object({
    latitud: z.coerce.number().min(-90).max(90).optional(),
    longitud: z.coerce.number().min(-180).max(180).optional(),
});

export type DetalleQueryInput = z.infer<typeof detalleQuerySchema>;

// =============================================================================
// UPLOAD DE IMAGEN
// =============================================================================

export const uploadImagenSchema = z.object({
    nombreArchivo: z
        .string()
        .trim()
        .min(1, 'El nombre del archivo es obligatorio')
        .max(255, 'El nombre del archivo no puede exceder 255 caracteres'),
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
        message: 'El tipo de archivo debe ser image/jpeg, image/png o image/webp',
    }),
});

export type UploadImagenInput = z.infer<typeof uploadImagenSchema>;

// =============================================================================
// SCHEMAS DE COMENTARIOS (hilos de 1 nivel — mismo patrón que MarketPlace)
// =============================================================================

export const crearComentarioSchema = z.object({
    texto: z
        .string()
        .trim()
        .min(2, 'El comentario debe tener al menos 2 caracteres')
        .max(500, 'El comentario no puede exceder 500 caracteres'),
    parentId: z.string().uuid('parentId inválido').optional().nullable(),
});

export type CrearComentarioInput = z.infer<typeof crearComentarioSchema>;

export const editarComentarioSchema = z.object({
    texto: z
        .string()
        .trim()
        .min(2, 'El comentario debe tener al menos 2 caracteres')
        .max(500, 'El comentario no puede exceder 500 caracteres'),
});

export type EditarComentarioInput = z.infer<typeof editarComentarioSchema>;

// =============================================================================
// HELPER: Formatear errores de Zod v4
// =============================================================================

export function formatearErroresZod(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const campo = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${campo}${issue.message}`;
    });
}

export default {
    crearPublicacionSchema,
    actualizarPublicacionSchema,
    feedQuerySchema,
    uploadImagenSchema,
    crearComentarioSchema,
    editarComentarioSchema,
    formatearErroresZod,
    campoUUID,
};
