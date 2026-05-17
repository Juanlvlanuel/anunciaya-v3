/**
 * ============================================================================
 * VALIDACIONES ZOD — Servicios (Sprint 1)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/validations/servicios.schema.ts
 *
 * Schemas Zod para los endpoints de la sección pública "Servicios" v1
 * (servicios e intangibles + empleos, en modo Personal).
 *
 * Doc maestro pendiente: docs/arquitectura/Servicios.md (Sprint 7).
 * Visión: docs/VISION_ESTRATEGICA_AnunciaYA.md §3.2.
 * Handoff de diseño: design_handoff_servicios/README.md.
 *
 * Patrón calcado de `marketplace.schema.ts`. Diferencias clave:
 *   - `precio` es discriminated union (5 variantes) en lugar de número plano.
 *   - Discriminadores `modo` + `tipo` con coherencia validada por refine.
 *   - Campos condicionales (skills/requisitos/horario/dias/presupuesto)
 *     según `tipo`.
 *   - Sin estado 'vendida' (servicios no se agotan).
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
    .min(30, 'La descripción debe tener al menos 30 caracteres')
    .max(500, 'La descripción no puede exceder 500 caracteres');

const campoCiudad = z
    .string()
    .trim()
    .min(2, 'La ciudad es obligatoria')
    .max(100, 'La ciudad no puede exceder 100 caracteres');

const campoLatitud = z
    .number({ message: 'La latitud debe ser un número' })
    .min(-90, 'La latitud debe estar entre -90 y 90')
    .max(90, 'La latitud debe estar entre -90 y 90');

const campoLongitud = z
    .number({ message: 'La longitud debe ser un número' })
    .min(-180, 'La longitud debe estar entre -180 y 180')
    .max(180, 'La longitud debe estar entre -180 y 180');

const campoUUID = z
    .string()
    .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        'El ID debe ser un UUID válido'
    );

const campoModo = z.enum(['ofrezco', 'solicito'], {
    message: 'modo debe ser "ofrezco" o "solicito"',
});

const campoTipo = z.enum(
    ['servicio-persona', 'vacante-empresa', 'solicito'],
    {
        message: 'tipo debe ser "servicio-persona", "vacante-empresa" o "solicito"',
    }
);

const campoSubtipo = z.enum(
    ['servicio-personal', 'busco-empleo', 'servicio-puntual', 'vacante-empresa'],
    {
        message: 'subtipo no es válido',
    }
);

const campoModalidad = z.enum(['presencial', 'remoto', 'hibrido'], {
    message: 'modalidad debe ser "presencial", "remoto" o "hibrido"',
});

/**
 * Categorías de clasificado v2 — solo aplican a `modo='solicito'`. Set
 * consolidado de 5 macro + Otros, pensado para Peñasco beta.
 *
 *   - hogar             → plomería, electricidad, A/C, jardín, mudanzas, etc.
 *   - cuidados          → niñeras, tutorías, ancianos, mascotas
 *   - eventos           → bodas, XV, catering, fotografía, música
 *   - belleza-bienestar → estilismo, masajes, manicura, depilación
 *   - empleo            → "busco trabajo" / "busco empleado"
 *   - otros             → fallback
 *
 * Valores en lowercase, kebab-case para BD. La UI mapea a labels con tildes
 * ("Belleza y bienestar", "Cuidados", etc.) vía `labelCategoria()`.
 *
 * "Urgente" NO va aquí — es un boolean independiente (`urgente`) que se
 * combina con cualquier categoría.
 */
export const CATEGORIAS_CLASIFICADO = [
    'hogar',
    'cuidados',
    'eventos',
    'belleza-bienestar',
    'empleo',
    'otros',
] as const;

const campoCategoria = z.enum(CATEGORIAS_CLASIFICADO, {
    message:
        'categoria debe ser hogar, cuidados, eventos, belleza-bienestar, empleo u otros',
});

const campoDiaSemana = z.enum(['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']);

const campoZona = z
    .string()
    .trim()
    .min(1, 'La zona no puede estar vacía')
    .max(150, 'La zona no puede exceder 150 caracteres');

const campoSkill = z
    .string()
    .trim()
    .min(1, 'El skill no puede estar vacío')
    .max(50, 'Cada skill no puede exceder 50 caracteres');

const campoRequisito = z
    .string()
    .trim()
    .min(3, 'Cada requisito debe tener al menos 3 caracteres')
    .max(200, 'Cada requisito no puede exceder 200 caracteres');

// =============================================================================
// PRECIO — Discriminated Union (5 variantes)
// =============================================================================
//
// Coincide con el `Precio` del handoff:
//   - { kind: 'fijo',       monto, moneda? } — pago único
//   - { kind: 'hora',       monto, moneda? } — por hora
//   - { kind: 'mensual',    monto, moneda? } — salario mensual (vacantes)
//   - { kind: 'rango',      min, max, moneda? } — rango "$X–$Y"
//   - { kind: 'a-convenir' } — sin precio fijado
//
// El refine de `rango` asegura que `max >= min`.

export const precioSchema = z.discriminatedUnion('kind', [
    z.object({
        kind: z.literal('fijo'),
        monto: z
            .number()
            .int('El monto debe ser un número entero')
            .positive('El monto debe ser mayor a cero')
            .max(999999, 'El monto máximo permitido es $999,999'),
        moneda: z.literal('MXN').optional(),
    }),
    z.object({
        kind: z.literal('hora'),
        monto: z
            .number()
            .int()
            .positive()
            .max(99999, 'El monto por hora máximo permitido es $99,999'),
        moneda: z.literal('MXN').optional(),
    }),
    z.object({
        kind: z.literal('mensual'),
        monto: z.number().int().positive().max(999999),
        moneda: z.literal('MXN').optional(),
    }),
    z
        .object({
            kind: z.literal('rango'),
            min: z.number().int().positive().max(999999),
            max: z.number().int().positive().max(999999),
            moneda: z.literal('MXN').optional(),
        })
        .refine((p) => p.max >= p.min, {
            message: 'El máximo del rango debe ser >= que el mínimo',
            path: ['max'],
        }),
    z.object({ kind: z.literal('a-convenir') }),
]);

export type PrecioInput = z.infer<typeof precioSchema>;

// =============================================================================
// CONFIRMACIONES DEL CHECKLIST LEGAL (Paso 4 del wizard)
// =============================================================================
//
// Las 3 confirmaciones obligatorias del wizard (handoff §3 / Paso 4). Se
// persisten como JSONB en `servicios_publicaciones.confirmaciones`.
//
// `aceptadasAt` lo agrega el backend al insertar (no lo manda el cliente).

const campoConfirmaciones = z.object({
    legal: z.boolean(),
    verdadera: z.boolean(),
    coordinacion: z.boolean(),
    version: z.string().trim().min(1).max(50),
});

export type ConfirmacionesInput = z.infer<typeof campoConfirmaciones>;

// =============================================================================
// FOTOS
// =============================================================================

const campoFotos = z
    .array(z.string().url('Cada foto debe ser una URL válida'))
    .max(6, 'No puedes incluir más de 6 fotos')
    .default([]);

const campoFotoPortadaIndex = z
    .number()
    .int('El índice de portada debe ser un entero')
    .min(0, 'El índice de portada no puede ser negativo')
    .max(5, 'El índice de portada no puede ser mayor a 5');

// =============================================================================
// PRESUPUESTO (solo aplica a tipo='solicito')
// =============================================================================

const campoPresupuesto = z
    .object({
        min: z.number().int().positive().max(999999),
        max: z.number().int().positive().max(999999),
    })
    .refine((p) => p.max >= p.min, {
        message: 'El máximo del presupuesto debe ser >= que el mínimo',
        path: ['max'],
    });

// =============================================================================
// SCHEMA 1: CREAR PUBLICACIÓN
// =============================================================================
// POST /api/servicios/publicaciones
//
// Reglas de coherencia (refines abajo):
//   - modo='ofrezco'  ↔ tipo='servicio-persona'
//   - modo='solicito' ↔ tipo IN ('solicito', 'vacante-empresa')
//   - `presupuesto` solo cuando tipo='solicito'
//   - Las 3 confirmaciones deben ser `true`
//   - fotoPortadaIndex < fotos.length cuando hay fotos

export const crearPublicacionSchema = z
    .object({
        modo: campoModo,
        tipo: campoTipo,
        subtipo: campoSubtipo.nullish(),

        titulo: campoTitulo,
        descripcion: campoDescripcion,

        fotos: campoFotos,
        fotoPortadaIndex: campoFotoPortadaIndex.optional().default(0),

        precio: precioSchema,
        modalidad: campoModalidad,

        latitud: campoLatitud,
        longitud: campoLongitud,
        ciudad: campoCiudad,
        zonasAproximadas: z.array(campoZona).max(10, 'Máximo 10 zonas').default([]),

        // Condicionales
        skills: z.array(campoSkill).max(8, 'Máximo 8 especialidades').default([]),
        requisitos: z.array(campoRequisito).max(20, 'Máximo 20 requisitos').default([]),
        horario: z.string().trim().max(150).optional(),
        diasSemana: z.array(campoDiaSemana).max(7).default([]),
        presupuesto: campoPresupuesto.optional(),

        // Solo aplican a modo='solicito' (Clasificados). El refine de abajo lo
        // garantiza para `categoria`. `urgente` es libre pero la UI solo lo
        // renderiza en el widget.
        categoria: campoCategoria.optional(),
        urgente: z.boolean().optional().default(false),

        confirmaciones: campoConfirmaciones,

        // Moderación: si el wizard detectó una sugerencia suave (servicio en
        // sección equivocada, etc.) y el usuario eligió "Continuar de todos
        // modos", reenvía con este flag en true.
        confirmadoPorUsuario: z.boolean().optional(),
    })
    .refine(
        (data) =>
            (data.modo === 'ofrezco' && data.tipo === 'servicio-persona') ||
            (data.modo === 'solicito' &&
                (data.tipo === 'solicito' || data.tipo === 'vacante-empresa')),
        {
            message:
                'modo y tipo no son coherentes: "ofrezco" requiere tipo="servicio-persona"; "solicito" requiere tipo="solicito" o "vacante-empresa"',
            path: ['tipo'],
        }
    )
    .refine((data) => data.presupuesto === undefined || data.tipo === 'solicito', {
        message: 'presupuesto solo aplica a tipo="solicito"',
        path: ['presupuesto'],
    })
    .refine((data) => data.categoria === undefined || data.modo === 'solicito', {
        message: 'categoria solo aplica a modo="solicito" (Clasificados)',
        path: ['categoria'],
    })
    .refine(
        (data) =>
            data.confirmaciones.legal &&
            data.confirmaciones.verdadera &&
            data.confirmaciones.coordinacion,
        {
            message: 'Debes aceptar las 3 confirmaciones del checklist legal',
            path: ['confirmaciones'],
        }
    )
    .refine(
        (data) => data.fotos.length === 0 || data.fotoPortadaIndex < data.fotos.length,
        {
            message: 'fotoPortadaIndex debe ser menor que la cantidad de fotos',
            path: ['fotoPortadaIndex'],
        }
    );

export type CrearPublicacionInput = z.infer<typeof crearPublicacionSchema>;

// =============================================================================
// SCHEMA 2: ACTUALIZAR PUBLICACIÓN
// =============================================================================
// PUT /api/servicios/publicaciones/:id
//
// Campos opcionales. NO incluye `expira_at` (solo /reactivar lo modifica en
// Sprint 7). NO incluye `estado` (eso va por PATCH /:id/estado). NO incluye
// `modo` ni `tipo` (cambiar el tipo de una publicación rompe la coherencia
// del feed — si lo necesitas, elimina y vuelve a publicar).

export const actualizarPublicacionSchema = z
    .object({
        titulo: campoTitulo.optional(),
        descripcion: campoDescripcion.optional(),

        fotos: campoFotos.optional(),
        fotoPortadaIndex: campoFotoPortadaIndex.optional(),

        precio: precioSchema.optional(),
        modalidad: campoModalidad.optional(),

        latitud: campoLatitud.optional(),
        longitud: campoLongitud.optional(),
        ciudad: campoCiudad.optional(),
        zonasAproximadas: z.array(campoZona).max(10).optional(),

        skills: z.array(campoSkill).max(8).optional(),
        requisitos: z.array(campoRequisito).max(20).optional(),
        horario: z.string().trim().max(150).nullish(),
        diasSemana: z.array(campoDiaSemana).max(7).optional(),
        presupuesto: campoPresupuesto.nullish(),

        // Clasificados (solo aplica a publicaciones modo='solicito').
        categoria: campoCategoria.nullish(),
        urgente: z.boolean().optional(),

        confirmadoPorUsuario: z.boolean().optional(),
    })
    .refine(
        (data) => {
            const sinMeta = { ...data };
            delete (sinMeta as Record<string, unknown>).confirmadoPorUsuario;
            return Object.keys(sinMeta).length > 0;
        },
        { message: 'Debes proporcionar al menos un campo para actualizar' }
    )
    .refine(
        (data) =>
            data.fotoPortadaIndex === undefined ||
            data.fotos === undefined ||
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

export type ActualizarPublicacionInput = z.infer<typeof actualizarPublicacionSchema>;

// =============================================================================
// SCHEMA 3: CAMBIAR ESTADO
// =============================================================================
// PATCH /api/servicios/publicaciones/:id/estado
//
// Solo `activa` ↔ `pausada`. 'eliminada' va por DELETE. NO existe 'vendida'.

export const cambiarEstadoSchema = z.object({
    estado: z.enum(['activa', 'pausada'], {
        message: 'El estado debe ser "activa" o "pausada"',
    }),
});

export type CambiarEstadoInput = z.infer<typeof cambiarEstadoSchema>;

// =============================================================================
// SCHEMA 4: QUERY DEL FEED
// =============================================================================
// GET /api/servicios/feed?ciudad=...&lat=...&lng=...&modo=...

export const feedQuerySchema = z.object({
    ciudad: campoCiudad,
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    /**
     * Filtro opcional por modo. Si se omite devuelve mezcla. La FE típicamente
     * lo manda según el tab activo del toggle Ofrezco/Solicito.
     */
    modo: campoModo.optional(),
});

export type FeedQueryInput = z.infer<typeof feedQuerySchema>;

// =============================================================================
// SCHEMA 4b: QUERY DE FEED INFINITO (estilo Facebook, paginado)
// =============================================================================
// GET /api/servicios/feed/infinito?ciudad=...&lat=...&lng=...
//                                  &modo=&tipo=&modalidad=&orden=&pagina=&limite=

export const feedInfinitoQuerySchema = z.object({
    ciudad: campoCiudad,
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    modo: campoModo.optional(),
    tipo: campoTipo.optional(),
    modalidad: campoModalidad.optional(),
    /** Filtro del widget Clasificados — solo tiene sentido con modo='solicito'. */
    categoria: campoCategoria.optional(),
    /** Si true, devuelve solo pedidos marcados como urgentes (modo='solicito'). */
    soloUrgente: z.coerce.boolean().optional(),
    orden: z.enum(['recientes', 'cerca']).optional().default('recientes'),
    pagina: z.coerce.number().int().min(1).optional().default(1),
    limite: z.coerce.number().int().min(1).max(20).optional().default(10),
});

export type FeedInfinitoQueryInput = z.infer<typeof feedInfinitoQuerySchema>;

// =============================================================================
// SCHEMA 5: QUERY DE MIS PUBLICACIONES
// =============================================================================
// GET /api/servicios/mis-publicaciones?estado=...&limit=...&offset=...

export const misPublicacionesQuerySchema = z.object({
    estado: z.enum(['activa', 'pausada']).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
});

export type MisPublicacionesQueryInput = z.infer<typeof misPublicacionesQuerySchema>;

// =============================================================================
// SCHEMA — CREAR RESEÑA (Sprint 7.6)
// =============================================================================
// POST /api/servicios/publicaciones/:publicacionId/resenas
//
// Reglas:
//   - rating 1-5 (entero)
//   - texto opcional, max 200 chars
//   - autor != destinatario (validado por CHECK BD)
//   - 1 reseña por (publicacion + autor) (UNIQUE BD)
//
// El backend extrae `destinatarioId` de la publicación (el dueño), así
// que el cliente NO lo manda.

export const crearResenaSchema = z.object({
    rating: z
        .number()
        .int('La calificación debe ser un entero')
        .min(1, 'Mínimo 1 estrella')
        .max(5, 'Máximo 5 estrellas'),
    texto: z
        .string()
        .trim()
        .max(200, 'El texto no puede exceder 200 caracteres')
        .nullish()
        .transform((v) => (v && v.length > 0 ? v : null)),
});

export type CrearResenaInput = z.infer<typeof crearResenaSchema>;

// =============================================================================
// SCHEMA 6: UPLOAD DE IMAGEN (presigned URL R2 prefijo `servicios/`)
// =============================================================================
// POST /api/servicios/upload-imagen

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
// SCHEMAS DE PREGUNTAS Y RESPUESTAS
// =============================================================================

export const crearPreguntaSchema = z.object({
    pregunta: z
        .string()
        .trim()
        .min(10, 'La pregunta debe tener al menos 10 caracteres')
        .max(200, 'La pregunta no puede exceder 200 caracteres'),
});

export type CrearPreguntaInput = z.infer<typeof crearPreguntaSchema>;

/** Misma validación que crearPregunta — el autor edita su pregunta pendiente. */
export const editarPreguntaSchema = crearPreguntaSchema;
export type EditarPreguntaInput = z.infer<typeof editarPreguntaSchema>;

export const responderPreguntaSchema = z.object({
    respuesta: z
        .string()
        .trim()
        .min(5, 'La respuesta debe tener al menos 5 caracteres')
        .max(500, 'La respuesta no puede exceder 500 caracteres'),
});

export type ResponderPreguntaInput = z.infer<typeof responderPreguntaSchema>;

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

export default {
    precioSchema,
    crearPublicacionSchema,
    actualizarPublicacionSchema,
    cambiarEstadoSchema,
    feedQuerySchema,
    feedInfinitoQuerySchema,
    misPublicacionesQuerySchema,
    uploadImagenSchema,
    crearPreguntaSchema,
    editarPreguntaSchema,
    responderPreguntaSchema,
    formatearErroresZod,
    campoUUID,
};
