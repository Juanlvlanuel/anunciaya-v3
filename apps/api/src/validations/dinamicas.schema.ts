/**
 * ============================================================================
 * VALIDACIONES ZOD — Dinámicas
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/validations/dinamicas.schema.ts
 *
 * PROPÓSITO:
 * Schemas Zod para el ciclo de vida de una Dinámica (Fase 1 — solo capa de
 * datos, sin motor de sorteo ni reserva pública de boletos todavía).
 *
 * Doc de producto: docs/kit-dinamicas/Contexto_Dinamicas.md
 */

import { z } from 'zod';
import { archivoFotoSchema, MIME_FOTO_O_VIDEO } from './archivoFoto.schema.js';

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

/** Evidencia del premio — al menos 1 foto/video, sin restricciones sobre cómo
 *  debe verse (decisión de producto: la responsabilidad de que el premio sea
 *  real es del organizador, no de AnunciaYA). */
const campoFotosPremio = z
    .array(archivoFotoSchema)
    .min(1, 'Agrega al menos 1 foto o video del premio')
    .max(12, 'No puedes incluir más de 12 fotos/videos');

const campoTipoPremio = z.enum(['fisico', 'efectivo'], {
    message: 'El tipo de premio debe ser físico o efectivo',
});

const campoMetodoSorteo = z.enum(['tombola', 'carta_unica', 'tabla_completa'], {
    message: 'El método de sorteo debe ser tombola, carta_unica o tabla_completa',
});

const campoReglaDesempate = z.enum(
    ['sorteo_instantaneo', 'repartir_premio', 'ronda_extra', 'orden_inscripcion'],
    { message: 'Regla de desempate no válida' },
);

const campoNumeroTotalBoletos = z
    .number({ message: 'El número total de boletos debe ser un número' })
    .int('El número total de boletos debe ser un entero')
    .positive('El número total de boletos debe ser mayor a cero');

/** Número con el que arranca la numeración (default 1 si no se manda) — el
 *  organizador puede elegir empezar en cualquier número; el final se
 *  calcula siempre como `numeroBoletoInicial + numeroTotalBoletos - 1`. */
const campoNumeroBoletoInicial = z
    .number({ message: 'El número de boleto inicial debe ser un número' })
    .int('El número de boleto inicial debe ser un entero')
    .positive('El número de boleto inicial debe ser mayor a cero');

/** No puede ser $0 — una Dinámica gratuita no filtra participación real. */
const campoPrecioBoleto = z
    .number({ message: 'El precio del boleto debe ser un número' })
    .positive('El precio del boleto debe ser mayor a cero');

const campoFechaLimiteInscripcion = z
    .string()
    .datetime({ message: 'Fecha límite de inscripción inválida' })
    .refine((v) => new Date(v).getTime() > Date.now(), {
        message: 'La fecha límite de inscripción debe ser futura',
    });

/**
 * Checklist legal — se exige completo al PUBLICAR (no al crear el borrador).
 * Las 3 deben ser `true` (no solo boolean): el Zod mismo rechaza si falta
 * aceptar alguna, igual de estricto que el checklist de MarketPlace pero sin
 * depender de una validación aparte en el service. `aceptadasAt` lo agrega el
 * backend al publicar, nunca lo manda el cliente.
 */
const campoConfirmaciones = z.object({
    premioReal: z.literal(true, { message: 'Debes confirmar que el premio es real' }),
    pagoFueraApp: z.literal(true, { message: 'Debes confirmar que el cobro ocurre fuera de AnunciaYA' }),
    resultadoHonesto: z.literal(true, { message: 'Debes confirmar que respetarás el resultado del sorteo' }),
    version: z.string().trim().min(1).max(50),
});

export type ConfirmacionesDinamicaInput = z.infer<typeof campoConfirmaciones>;

/** Texto de ciudad (nombre) — el backend resuelve el `ciudad_id` real vía
 *  `resolverCiudadId`, mismo patrón que MarketPlace/Servicios. Obligatorio:
 *  sin ciudad, la Dinámica no aparecería en ningún feed filtrado por ciudad. */
const campoCiudad = z
    .string()
    .trim()
    .min(1, 'Selecciona tu ciudad');

// Espejo del CHECK `dinamicas_regla_desempate_metodo_check`: solo
// tabla_completa puede tener empates (tómbola y carta única asignan un
// boleto/carta único por persona, no hay forma de empatar). Compartido entre
// el schema laxo (crear/editar borrador) y el estricto (publicar) para no
// duplicar la regla.
function validarReglaDesempateCondMetodo(
    data: { reglaDesempate?: string | null; metodoSorteo?: string | null },
    ctx: z.RefinementCtx,
) {
    if (data.reglaDesempate && data.metodoSorteo !== 'tabla_completa') {
        ctx.addIssue({
            code: 'custom',
            path: ['reglaDesempate'],
            message: 'La regla de desempate solo aplica al método "tabla_completa"',
        });
    }
}

/** K = cuántos lugares premiados hay. Default 1 en BD — aquí opcional para
 *  no romper el patrón laxo de borrador. */
const campoNumeroLugaresGanadores = z
    .number({ message: 'El número de lugares premiados debe ser un número' })
    .int('El número de lugares premiados debe ser un entero')
    .positive('Debe haber al menos 1 lugar premiado');

/** N = a qué intento (bola sin reemplazo) sale el ganador DE CADA lugar —
 *  cada lugar premiado corre su propia ronda de N bolas (las primeras N-1
 *  "no ganan", la N-ésima es la ganadora de esa ronda). Las rondas se
 *  revelan en orden de lugar descendente (K, K-1, ..., 1) para que el
 *  premio mayor (lugar #1) salga en la última ronda — mismo criterio de
 *  suspenso que antes, ahora aplicado por ronda en vez de a un solo
 *  cascada global (confirmado con el usuario, ago-2026). */
const campoNumeroIntentosSorteo = z
    .number({ message: 'El número de intentos del sorteo debe ser un número' })
    .int('El número de intentos del sorteo debe ser un entero')
    .positive('El número de intentos debe ser mayor a cero');

/** Cruza K y N contra `numeroTotalBoletos` — mismo criterio que
 *  `validarReglaDesempateCondMetodo`: un CHECK de BD no puede condicionar
 *  sobre `numeroTotalBoletos`, que es nullable en borrador. Con N por
 *  ronda, el total de bolas que se van a sacar es K × N (sin reemplazo en
 *  todo el sorteo), así que ese producto es el que no puede exceder el
 *  total de boletos — no N por sí solo. */
function validarConfigSorteo(
    data: {
        numeroLugaresGanadores?: number;
        numeroIntentosSorteo?: number;
        numeroTotalBoletos?: number;
    },
    ctx: z.RefinementCtx,
) {
    const K = data.numeroLugaresGanadores;
    const N = data.numeroIntentosSorteo;
    const total = data.numeroTotalBoletos;

    if (total !== undefined) {
        if (K !== undefined && K > total) {
            ctx.addIssue({
                code: 'custom',
                path: ['numeroLugaresGanadores'],
                message: 'No puede haber más lugares premiados que boletos totales',
            });
        }
        if (K !== undefined && N !== undefined && K * N > total) {
            ctx.addIssue({
                code: 'custom',
                path: ['numeroIntentosSorteo'],
                message: 'Lugares premiados × intentos por lugar no puede exceder el total de boletos',
            });
        }
    }
}

function validarSorteoDinamica(
    data: {
        reglaDesempate?: string | null;
        metodoSorteo?: string | null;
        numeroLugaresGanadores?: number;
        numeroIntentosSorteo?: number;
        numeroTotalBoletos?: number;
    },
    ctx: z.RefinementCtx,
) {
    validarReglaDesempateCondMetodo(data, ctx);
    validarConfigSorteo(data, ctx);
}

// =============================================================================
// CREAR / EDITAR (borrador) — LAXO: solo título + ciudad obligatorios
// =============================================================================
//
// Un borrador debe servir para "anotar el título y volver después" — exigir
// aquí los mismos campos que para publicar (como en la Fase 1 original)
// dejaba "borrador" sin diferencia real frente a "activa" salvo el checklist
// legal. La validación de que SÍ esté todo completo se hace aparte, solo al
// momento de publicar (`camposCompletosDinamicaSchema` más abajo).

export const crearDinamicaSchema = z
    .object({
        titulo: campoTitulo,
        ciudad: campoCiudad,
        descripcion: campoDescripcion.optional(),
        fotosPremio: campoFotosPremio.optional(),
        tipoPremio: campoTipoPremio.optional(),
        metodoSorteo: campoMetodoSorteo.optional(),
        numeroTotalBoletos: campoNumeroTotalBoletos.optional(),
        numeroBoletoInicial: campoNumeroBoletoInicial.optional(),
        precioBoleto: campoPrecioBoleto.optional(),
        fechaLimiteInscripcion: campoFechaLimiteInscripcion.optional(),
        reglaDesempate: campoReglaDesempate.optional(),
        numeroLugaresGanadores: campoNumeroLugaresGanadores.optional(),
        numeroIntentosSorteo: campoNumeroIntentosSorteo.optional(),
    })
    .superRefine(validarSorteoDinamica);

export type CrearDinamicaInput = z.infer<typeof crearDinamicaSchema>;

/** Editar borrador: mismos campos, todos opcionales (no se puede editar fuera
 *  de estado 'borrador' — lo valida el service, no este schema). */
export const editarBorradorDinamicaSchema = z
    .object({
        titulo: campoTitulo.optional(),
        descripcion: campoDescripcion.optional(),
        fotosPremio: campoFotosPremio.optional(),
        tipoPremio: campoTipoPremio.optional(),
        metodoSorteo: campoMetodoSorteo.optional(),
        numeroTotalBoletos: campoNumeroTotalBoletos.optional(),
        numeroBoletoInicial: campoNumeroBoletoInicial.optional(),
        precioBoleto: campoPrecioBoleto.optional(),
        fechaLimiteInscripcion: campoFechaLimiteInscripcion.optional(),
        reglaDesempate: campoReglaDesempate.optional(),
        ciudad: campoCiudad.optional(),
        numeroLugaresGanadores: campoNumeroLugaresGanadores.optional(),
        numeroIntentosSorteo: campoNumeroIntentosSorteo.optional(),
    })
    .superRefine(validarSorteoDinamica);

export type EditarBorradorDinamicaInput = z.infer<typeof editarBorradorDinamicaSchema>;

// =============================================================================
// TRANSICIONES DE ESTADO
// =============================================================================

export const publicarDinamicaSchema = z.object({
    confirmaciones: campoConfirmaciones,
});

export type PublicarDinamicaInput = z.infer<typeof publicarDinamicaSchema>;

export const posponerDinamicaSchema = z.object({
    nuevaFechaLimiteInscripcion: campoFechaLimiteInscripcion,
});

export type PosponerDinamicaInput = z.infer<typeof posponerDinamicaSchema>;

// Cancelar no pide motivo (no se pidió en el diseño) — cuerpo vacío, se deja
// como schema explícito para que quede documentado el endpoint.
export const cancelarDinamicaSchema = z.object({});

// =============================================================================
// BOLETOS (Fase 3)
// =============================================================================

export const reservarBoletoSchema = z.object({
    numeroBoleto: z
        .number({ message: 'El número de boleto debe ser un número' })
        .int('El número de boleto debe ser un entero')
        .positive('El número de boleto debe ser mayor a cero'),
});

export type ReservarBoletoInput = z.infer<typeof reservarBoletoSchema>;

export const agregarParticipanteManualSchema = z.object({
    numeroBoleto: z
        .number({ message: 'El número de boleto debe ser un número' })
        .int('El número de boleto debe ser un entero')
        .positive('El número de boleto debe ser mayor a cero'),
    nombreManual: z
        .string()
        .trim()
        .min(1, 'El nombre es obligatorio')
        .max(100, 'El nombre no puede exceder 100 caracteres'),
    telefonoManual: z
        .string()
        .trim()
        .min(1, 'El teléfono es obligatorio')
        .max(20, 'El teléfono no puede exceder 20 caracteres'),
    /** Default 'pagado' (comportamiento histórico: el organizador ya cobró
     *  por fuera antes de registrar) — 'reservado' cubre el caso de alguien
     *  que ya apartó el número pero todavía no paga. */
    estado: z.enum(['reservado', 'pagado']).default('pagado'),
});

export type AgregarParticipanteManualInput = z.infer<typeof agregarParticipanteManualSchema>;

export const editarParticipanteManualSchema = z.object({
    numeroBoleto: z
        .number({ message: 'El número de boleto debe ser un número' })
        .int('El número de boleto debe ser un entero')
        .positive('El número de boleto debe ser mayor a cero'),
    nombreManual: z
        .string()
        .trim()
        .min(1, 'El nombre es obligatorio')
        .max(100, 'El nombre no puede exceder 100 caracteres'),
    telefonoManual: z
        .string()
        .trim()
        .min(1, 'El teléfono es obligatorio')
        .max(20, 'El teléfono no puede exceder 20 caracteres'),
});

export type EditarParticipanteManualInput = z.infer<typeof editarParticipanteManualSchema>;

/** Reasignar el número de un boleto CON cuenta AnunciaYA (el nombre/teléfono
 *  son del usuario, no se editan desde aquí — solo el número). Para
 *  participantes manuales "Sin cuenta AY" se usa `editarParticipanteManualSchema`,
 *  que ya incluye el número junto con nombre/teléfono. */
export const reasignarBoletoSchema = z.object({
    numeroBoleto: z
        .number({ message: 'El número de boleto debe ser un número' })
        .int('El número de boleto debe ser un entero')
        .positive('El número de boleto debe ser mayor a cero'),
});

export type ReasignarBoletoInput = z.infer<typeof reasignarBoletoSchema>;

// =============================================================================
// SUBIDA DE IMÁGENES (Fase 2) — mismo patrón que uploadImagenSchema de MP
// =============================================================================

export const uploadImagenDinamicaSchema = z.object({
    nombreArchivo: z
        .string()
        .trim()
        .min(1, 'El nombre del archivo es obligatorio')
        .max(255, 'El nombre del archivo no puede exceder 255 caracteres'),
    contentType: z.enum(MIME_FOTO_O_VIDEO, {
        message: 'El tipo de archivo debe ser image/jpeg, image/png, image/webp, video/mp4 o video/webm',
    }),
});

export type UploadImagenDinamicaInput = z.infer<typeof uploadImagenDinamicaSchema>;

// =============================================================================
// HELPERS
// =============================================================================

export function formatearErroresZod(error: z.ZodError): string[] {
    return error.issues.map((issue) => {
        const campo = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
        return `${campo}${issue.message}`;
    });
}
