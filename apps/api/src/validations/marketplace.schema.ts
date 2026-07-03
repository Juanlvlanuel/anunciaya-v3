/**
 * ============================================================================
 * VALIDACIONES ZOD — MarketPlace
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/validations/marketplace.schema.ts
 *
 * PROPÓSITO:
 * Schemas Zod para los endpoints de la sección MarketPlace v1
 * (compra-venta P2P de objetos físicos entre usuarios en modo Personal).
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§13)
 * Sprint:      docs/prompts Marketplace/Sprint-1-Backend-Base.md
 */

import { z } from 'zod';

// =============================================================================
// CAMPOS REUTILIZABLES
// =============================================================================

const campoTitulo = z
    .string()
    .trim()
    .min(10, 'El título debe tener al menos 10 caracteres')
    .max(80, 'El título no puede exceder 80 caracteres');

const campoDescripcion = z
    .string()
    .trim()
    .min(20, 'La descripción debe tener al menos 20 caracteres')
    .max(1000, 'La descripción no puede exceder 1000 caracteres');

const campoPrecio = z
    .number({ message: 'El precio debe ser un número' })
    .int('El precio debe ser un número entero')
    .positive('El precio debe ser mayor a cero')
    .max(999999, 'El precio máximo permitido es $999,999');

const campoCondicion = z.enum(['nuevo', 'seminuevo', 'usado', 'para_reparar'], {
    message: 'La condición debe ser nuevo, seminuevo, usado o para_reparar',
});

/**
 * Unidad de venta opcional. El wizard sugiere chips (c/u, por kg, por docena,
 * por litro, por metro, por porción) pero también acepta texto libre para
 * casos no cubiertos por la lista. Validamos solo la longitud máxima.
 */
const campoUnidadVenta = z
    .string()
    .trim()
    .min(1, 'La unidad de venta no puede estar vacía')
    .max(30, 'La unidad de venta no puede exceder 30 caracteres');

/**
 * Confirmaciones del checklist legal del wizard de publicar (Paso 3).
 * Se persisten como JSONB en `articulos_marketplace.confirmaciones` para
 * servir de evidencia ante denuncias (artículo robado, falsificado, fraude).
 *
 * - `licito`:   El artículo es de mi propiedad y de procedencia lícita.
 * - `enPoder`:  Lo tengo en mi poder y está disponible para entregar.
 * - `honesto`:  Las fotos, la descripción y el precio reflejan honestamente.
 * - `seguro`:   Coordinaré la entrega y el pago en un lugar público y seguro.
 * - `version`:  Identifica la versión del texto del checklist. Si los
 *               compromisos cambian, sabremos a qué redacción aceptó el
 *               vendedor. Formato: `v<n>-YYYY-MM-DD`.
 *
 * `aceptadasAt` lo agrega el backend al insertar (no lo manda el cliente)
 * para tener un timestamp confiable y no manipulable.
 */
const campoConfirmaciones = z.object({
    licito: z.boolean(),
    enPoder: z.boolean(),
    honesto: z.boolean(),
    seguro: z.boolean(),
    version: z.string().trim().min(1).max(50),
});

export type ConfirmacionesInput = z.infer<typeof campoConfirmaciones>;

// Fotos: el mínimo depende del modo (vendo exige >=1, busco permite 0). El
// mínimo se aplica en el `superRefine` de crearArticuloSchema, no aquí, para
// poder reutilizar el mismo campo en ambos modos y en actualizar.
const campoFotos = z
    .array(z.string().url('Cada foto debe ser una URL válida'))
    .max(12, 'No puedes incluir más de 12 fotos');

/** Modo de la publicación (doble sentido, calcado de Servicios). */
const campoModo = z.enum(['vendo', 'busco'], {
    message: 'El modo debe ser vendo o busco',
});

/** ID de categoría de MarketPlace (serial en BD). */
const campoCategoriaId = z
    .number({ message: 'La categoría es obligatoria' })
    .int('La categoría debe ser un entero')
    .positive('La categoría debe ser válida');

/**
 * Presupuesto deseado del comprador — solo modo='busco', opcional.
 * Calca `presupuesto` de servicios_publicaciones (Solicito).
 */
const campoPresupuesto = z
    .object({
        min: z
            .number({ message: 'El presupuesto mínimo debe ser un número' })
            .int('El presupuesto debe ser entero')
            .positive('El presupuesto debe ser mayor a cero')
            .max(999999, 'El presupuesto máximo permitido es $999,999'),
        max: z
            .number({ message: 'El presupuesto máximo debe ser un número' })
            .int('El presupuesto debe ser entero')
            .positive('El presupuesto debe ser mayor a cero')
            .max(999999, 'El presupuesto máximo permitido es $999,999'),
    })
    .refine((p) => p.max >= p.min, {
        message: 'El presupuesto máximo debe ser mayor o igual al mínimo',
        path: ['max'],
    });

/**
 * Confirmaciones del checklist legal en modo='busco'. Difiere de la venta:
 * no existe "en mi poder" (no tienes el objeto). Ver Marketplace_Busco.md §6.
 * - `licito`: Mi búsqueda es lícita (no pido nada ilegal ni robado).
 * - `real`:   Es una búsqueda real.
 * - `seguro`: Coordinaré la compra en un lugar seguro.
 */
const campoConfirmacionesBusco = z.object({
    licito: z.boolean(),
    real: z.boolean(),
    seguro: z.boolean(),
    version: z.string().trim().min(1).max(50),
});

export type ConfirmacionesBuscoInput = z.infer<typeof campoConfirmacionesBusco>;

const campoFotoPortadaIndex = z
    .number()
    .int('El índice de portada debe ser un entero')
    .min(0, 'El índice de portada no puede ser negativo')
    .max(7, 'El índice de portada no puede ser mayor a 7');

const campoLatitud = z
    .number({ message: 'La latitud debe ser un número' })
    .min(-90, 'La latitud debe estar entre -90 y 90')
    .max(90, 'La latitud debe estar entre -90 y 90');

const campoLongitud = z
    .number({ message: 'La longitud debe ser un número' })
    .min(-180, 'La longitud debe estar entre -180 y 180')
    .max(180, 'La longitud debe estar entre -180 y 180');

const campoCiudad = z
    .string()
    .trim()
    .min(2, 'La ciudad es obligatoria')
    .max(100, 'La ciudad no puede exceder 100 caracteres');

// Zona aproximada: OPCIONAL en ambos modos (Vendo y Busco). Solo se valida
// el máximo; una cadena vacía es válida (el service la persiste como '').
const campoZonaAproximada = z
    .string()
    .trim()
    .max(150, 'La zona aproximada no puede exceder 150 caracteres');

const campoUUID = z
    .string()
    .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        'El ID debe ser un UUID válido'
    );

// =============================================================================
// SCHEMA 1: CREAR ARTÍCULO
// =============================================================================
// POST /api/marketplace/articulos

export const crearArticuloSchema = z
    .object({
        /**
         * Doble sentido: 'vendo' (venta, default histórico) | 'busco'
         * (demanda de compra). Ramifica qué campos son requeridos abajo.
         */
        modo: campoModo.optional().default('vendo'),
        /** Categoría obligatoria (ambos modos). */
        categoriaId: campoCategoriaId,
        titulo: campoTitulo,
        descripcion: campoDescripcion,
        /** Requerido solo en modo='vendo' (ver superRefine). */
        precio: campoPrecio.optional(),
        /** Presupuesto opcional — solo modo='busco'. */
        presupuesto: campoPresupuesto.optional(),
        /** Pin al top del feed de búsquedas — solo modo='busco'. */
        urgente: z.boolean().optional().default(false),
        /**
         * Condición opcional desde 2026-05-13. Solo aplica a modo='vendo'.
         * En modo='busco' se ignora (se persiste NULL).
         */
        condicion: campoCondicion.nullish(),
        /**
         * "Acepta ofertas" opcional desde 2026-05-13. Solo modo='vendo'.
         */
        aceptaOfertas: z.boolean().nullish(),
        /**
         * Unidad de venta opcional (c/u, por kg, etc.). Solo modo='vendo'.
         */
        unidadVenta: campoUnidadVenta.nullish(),
        /**
         * Confirmaciones del checklist legal. En modo='vendo' usa el checklist
         * de venta (licito/enPoder/honesto/seguro); en modo='busco' el de
         * búsqueda (licito/real/seguro). Se validan por modo en el superRefine
         * y se persisten como evidencia.
         */
        confirmaciones: z
            .union([campoConfirmaciones, campoConfirmacionesBusco])
            .optional(),
        fotos: campoFotos.optional().default([]),
        fotoPortadaIndex: campoFotoPortadaIndex.optional().default(0),
        latitud: campoLatitud,
        longitud: campoLongitud,
        ciudad: campoCiudad,
        /** Opcional en ambos modos (Vendo y Busco). */
        zonaAproximada: campoZonaAproximada.optional(),
        /**
         * Moderación: si el wizard detectó una sugerencia (servicio o
         * búsqueda) y el usuario eligió "Continuar de todos modos", reenvía
         * con este flag en true para que el backend acepte la publicación.
         */
        confirmadoPorUsuario: z.boolean().optional(),
    })
    // La portada debe apuntar a una foto existente (o no haber fotos).
    .refine(
        (data) => data.fotos.length === 0 || data.fotoPortadaIndex < data.fotos.length,
        {
            message: 'fotoPortadaIndex debe ser menor que la cantidad de fotos',
            path: ['fotoPortadaIndex'],
        }
    )
    // Reglas cruzadas por modo (calca el superRefine de Servicios).
    .superRefine((data, ctx) => {
        if (data.modo === 'vendo') {
            if (data.precio === undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'El precio es obligatorio para vender',
                    path: ['precio'],
                });
            }
            if (data.fotos.length < 1) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Debes incluir al menos 1 foto para vender',
                    path: ['fotos'],
                });
            }
            if (data.presupuesto !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'El presupuesto solo aplica a búsquedas',
                    path: ['presupuesto'],
                });
            }
        } else {
            // modo === 'busco'
            if (data.precio !== undefined) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Una búsqueda no lleva precio (usa presupuesto)',
                    path: ['precio'],
                });
            }
            if (
                data.condicion !== undefined &&
                data.condicion !== null
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'La condición no aplica a una búsqueda',
                    path: ['condicion'],
                });
            }
        }
    });

export type CrearArticuloInput = z.infer<typeof crearArticuloSchema>;

// =============================================================================
// SCHEMA 2: ACTUALIZAR ARTÍCULO
// =============================================================================
// PUT /api/marketplace/articulos/:id
//
// Todos los campos son opcionales. NO incluye `expira_at` — se setea SOLO al
// crear (NOW() + 30 días). Solo el endpoint futuro de "Reactivar" (Sprint 7)
// lo puede modificar. NO incluye `estado` — eso va por PATCH /:id/estado.

export const actualizarArticuloSchema = z
    .object({
        titulo: campoTitulo.optional(),
        descripcion: campoDescripcion.optional(),
        /** Cambiar la categoría de la publicación. */
        categoriaId: campoCategoriaId.optional(),
        precio: campoPrecio.optional(),
        /** Editar el presupuesto de una búsqueda (modo='busco'). */
        presupuesto: campoPresupuesto.optional(),
        /** Editar el flag urgente de una búsqueda (modo='busco'). */
        urgente: z.boolean().optional(),
        // Permitimos `null` para que el editor pueda LIMPIAR el valor
        // (ej. cambiar un artículo que tenía condición a no tener).
        condicion: campoCondicion.nullish(),
        aceptaOfertas: z.boolean().nullish(),
        unidadVenta: campoUnidadVenta.nullish(),
        fotos: campoFotos.optional(),
        fotoPortadaIndex: campoFotoPortadaIndex.optional(),
        latitud: campoLatitud.optional(),
        longitud: campoLongitud.optional(),
        ciudad: campoCiudad.optional(),
        zonaAproximada: campoZonaAproximada.optional(),
        /** Idéntico al schema de crear: confirma sugerencia suave. */
        confirmadoPorUsuario: z.boolean().optional(),
    })
    .refine(
        (data) => {
            // Considerar confirmadoPorUsuario como meta, no como cambio editable.
            const sinMeta = { ...data };
            delete (sinMeta as Record<string, unknown>).confirmadoPorUsuario;
            return Object.keys(sinMeta).length > 0;
        },
        {
            message: 'Debes proporcionar al menos un campo para actualizar',
        }
    )
    .refine(
        (data) =>
            data.fotoPortadaIndex === undefined ||
            data.fotos === undefined ||
            data.fotos.length === 0 ||
            data.fotoPortadaIndex < data.fotos.length,
        {
            message: 'fotoPortadaIndex debe ser menor que la cantidad de fotos',
            path: ['fotoPortadaIndex'],
        }
    )
    .refine(
        (data) =>
            (data.latitud === undefined && data.longitud === undefined) ||
            (data.latitud !== undefined && data.longitud !== undefined),
        {
            message: 'Si actualizas la ubicación debes enviar latitud y longitud juntos',
            path: ['latitud'],
        }
    );

export type ActualizarArticuloInput = z.infer<typeof actualizarArticuloSchema>;

// =============================================================================
// SCHEMA 3: CAMBIAR ESTADO
// =============================================================================
// PATCH /api/marketplace/articulos/:id/estado
//
// 'eliminada' NO entra aquí — se hace por DELETE.

export const cambiarEstadoSchema = z.object({
    estado: z.enum(['activa', 'pausada', 'vendida'], {
        message: 'El estado debe ser activa, pausada o vendida',
    }),
});

export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>;

// =============================================================================
// SCHEMA 4: QUERY DEL FEED
// =============================================================================
// GET /api/marketplace/feed?ciudad=...&lat=...&lng=...
//
// Los query params llegan como string — coerción y luego validación numérica.

export const feedQuerySchema = z.object({
    ciudad: campoCiudad,
    lat: z.coerce.number().refine((v) => v >= -90 && v <= 90, {
        message: 'lat debe estar entre -90 y 90',
    }),
    lng: z.coerce.number().refine((v) => v >= -180 && v <= 180, {
        message: 'lng debe estar entre -180 y 180',
    }),
    /** 'vendo' (default histórico) | 'busco' (feed de demandas). */
    modo: campoModo.optional().default('vendo'),
    /** Filtro por categoría (opcional) — usado por el KPI del header. */
    categoriaId: z.coerce.number().int().positive().optional(),
});

export type FeedQueryInput = z.infer<typeof feedQuerySchema>;

// =============================================================================
// SCHEMA 4b: QUERY DE FEED INFINITO (estilo Facebook)
// =============================================================================
// GET /api/marketplace/feed/infinito?ciudad=...&lat=...&lng=...
//                                    &orden=recientes&pagina=1&limite=10
//                                    &precioMin=...&precioMax=...

export const feedInfinitoQuerySchema = z.object({
    ciudad: campoCiudad,
    lat: z.coerce.number().refine((v) => v >= -90 && v <= 90, {
        message: 'lat debe estar entre -90 y 90',
    }),
    lng: z.coerce.number().refine((v) => v >= -180 && v <= 180, {
        message: 'lng debe estar entre -180 y 180',
    }),
    orden: z.enum(['recientes', 'vistos', 'cerca']).optional().default('recientes'),
    pagina: z.coerce.number().int().min(1).optional().default(1),
    limite: z.coerce.number().int().min(1).max(20).optional().default(10),
    precioMin: z.coerce.number().min(0).optional(),
    precioMax: z.coerce.number().min(0).optional(),
    /** 'vendo' (default histórico) | 'busco' (feed de demandas). */
    modo: campoModo.optional().default('vendo'),
    /**
     * Solo búsquedas urgentes — aplica cuando modo='busco'. Llega como string
     * del query; NO usar z.coerce.boolean (convierte "false" → true).
     */
    soloUrgente: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === 'true')),
    /** Filtro por categoría (opcional). */
    categoriaId: z.coerce.number().int().positive().optional(),
});

export type FeedInfinitoQueryInput = z.infer<typeof feedInfinitoQuerySchema>;

// =============================================================================
// SCHEMA 5: QUERY DE MIS ARTÍCULOS
// =============================================================================
// GET /api/marketplace/mis-articulos?estado=...&limit=...&offset=...

export const misArticulosQuerySchema = z.object({
    estado: z.enum(['activa', 'pausada', 'vendida']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

export type MisArticulosQueryInput = z.infer<typeof misArticulosQuerySchema>;

// =============================================================================
// SCHEMAS DE BUSCADOR (Sprint 6)
// =============================================================================

export const sugerenciasQuerySchema = z.object({
    q: z.string().trim().min(1, 'q es requerido').max(100),
    ciudad: campoCiudad,
});

export const popularesQuerySchema = z.object({
    ciudad: campoCiudad,
});

export const buscarQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    ciudad: campoCiudad,
    /**
     * 'vendo' | 'busco'. Si se omite, la búsqueda es GLOBAL (ventas +
     * búsquedas juntas) — comportamiento del buscador de la UI.
     */
    modo: campoModo.optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    precioMin: z.coerce.number().int().min(0).max(999999).optional(),
    precioMax: z.coerce.number().int().min(0).max(999999).optional(),
    /**
     * Acepta CSV (`condicion=nuevo,seminuevo`). Se transforma a array.
     */
    condicion: z
        .string()
        .optional()
        .transform((val) =>
            val
                ? val
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s): s is 'nuevo' | 'seminuevo' | 'usado' | 'para_reparar' =>
                          ['nuevo', 'seminuevo', 'usado', 'para_reparar'].includes(s)
                      )
                : undefined
        ),
    distanciaMaxKm: z.coerce.number().min(0).max(500).optional(),
    ordenar: z
        .enum(['recientes', 'cercanos', 'precio_asc', 'precio_desc'])
        .optional()
        .default('recientes'),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

export type BuscarQueryInput = z.infer<typeof buscarQuerySchema>;

// =============================================================================
// SCHEMA 6: UPLOAD DE IMAGEN (presigned URL)
// =============================================================================
// POST /api/marketplace/upload-imagen

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
// HELPER: Formatear errores de Zod v4
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

export { campoUUID };

// =============================================================================
// SCHEMAS DE COMENTARIOS (hilos de 1 nivel — reemplaza el Q&A Sprint 9.2)
// =============================================================================

export const crearComentarioSchema = z.object({
    texto: z
        .string()
        .trim()
        .min(2, 'El comentario debe tener al menos 2 caracteres')
        .max(500, 'El comentario no puede exceder 500 caracteres'),
    /** Si se envía, el comentario es una respuesta a ese comentario. */
    parentId: z.string().uuid('parentId inválido').optional().nullable(),
});

export type CrearComentarioInput = z.infer<typeof crearComentarioSchema>;

/** El autor edita su comentario — mismo límite que crear (sin parentId). */
export const editarComentarioSchema = z.object({
    texto: z
        .string()
        .trim()
        .min(2, 'El comentario debe tener al menos 2 caracteres')
        .max(500, 'El comentario no puede exceder 500 caracteres'),
});

export type EditarComentarioInput = z.infer<typeof editarComentarioSchema>;

export default {
    crearArticuloSchema,
    actualizarArticuloSchema,
    cambiarEstadoSchema,
    feedQuerySchema,
    feedInfinitoQuerySchema,
    misArticulosQuerySchema,
    uploadImagenSchema,
    formatearErroresZod,
    campoUUID,
    crearComentarioSchema,
    editarComentarioSchema,
};
