/**
 * preguntasComunidad.types.ts
 * ============================
 * Tipos para el módulo "Pregúntale a [ciudad]" (feed del Home).
 *
 * UBICACIÓN: apps/api/src/types/preguntasComunidad.types.ts
 */

export type EstadoPregunta = 'activa' | 'cerrada' | 'oculta';

/**
 * Estado de procesamiento de Coyo sobre la pregunta:
 *   - `pendiente`     → recién creada, Coyo aún no la toca.
 *   - `procesando`    → Coyo está trabajando.
 *   - `listo`         → Coyo respondió (hay respuestaCoyo + resultadosCoyo).
 *   - `sin_respuesta` → Coyo corrió pero no encontró nada / IA no disponible.
 *   - `no_aplica`     → la pregunta no era búsqueda local (Coyo redirigió).
 */
export type EstadoCoyo = 'pendiente' | 'procesando' | 'listo' | 'sin_respuesta' | 'no_aplica';

// =============================================================================
// INPUT
// =============================================================================

export interface CrearPreguntaInput {
    usuarioId: string;
    texto: string;
    ciudad: string;
    estado: string;
}

export interface ListarPreguntasPorCiudadInput {
    ciudad: string;
    limit?: number;
    offset?: number;
    /**
     * UUID del usuario que pide el feed. Si está presente, se pobla
     * `yoTambienInteresado` por pregunta con un EXISTS sobre
     * `preguntas_interesados`. Si no está, ese campo vuelve `false` para
     * todas. Lo provee el controller a partir del JWT.
     */
    usuarioId?: string;
}

// =============================================================================
// RESPONSE
// =============================================================================

/**
 * Datos básicos del autor que el feed necesita para pintar
 * la card de la pregunta (avatar + nombre / iniciales).
 */
export interface PreguntaComunidadResponse {
    id: string;
    texto: string;
    ciudad: string;
    estado: string;
    estadoPregunta: EstadoPregunta;
    createdAt: string;
    updatedAt: string;

    // Datos del autor (flatten — mismo patrón que notificaciones.actorNombre)
    autorId: string;
    autorNombre: string;
    autorApellidos: string;
    autorAvatarUrl: string | null;

    // Respuesta de Coyo (asíncrona; en la creación viene en 'pendiente')
    estadoCoyo: EstadoCoyo;
    respuestaCoyo: string | null;
    /**
     * Shape: { negocios, ofertas, marketplace, servicios } cada uno con
     * { items: ItemUnificado[], total: number, error?: string }. Tipado
     * como `unknown` para no acoplar este módulo con el shape exacto del
     * buscador unificado — el frontend lo tipa al consumir.
     */
    resultadosCoyo: unknown | null;
    coyoProcesadoAt: string | null;

    /**
     * Si el autor marcó la pregunta como resuelta, fecha en ISO. `null` si
     * no está resuelta. La pregunta sigue siendo `estadoPregunta='activa'`
     * (puede recibir más respuestas) — el frontend la trata distinto.
     */
    resueltaAt: string | null;

    // ── Métricas del feed agregadas para esta pregunta ────────────────────
    /** Cantidad de respuestas activas (no borradas) que tiene la pregunta. */
    totalRespuestas: number;
    /** Cantidad de vecinos sumados con "yo también quiero saber". */
    totalInteresados: number;
    /** Si el usuario actual ya marcó interés en esta pregunta. */
    yoTambienInteresado: boolean;
}

// =============================================================================
// "YO TAMBIÉN QUIERO SABER" (Sprint 1 — 2026-06-01)
// =============================================================================

export interface MarcarInteresInput {
    preguntaId: string;
    usuarioId: string;
}

// =============================================================================
// CONTROL DEL AUTOR (Sprint 1 — 2026-06-01)
// =============================================================================

export interface EditarPreguntaInput {
    preguntaId: string;
    usuarioId: string;
    textoNuevo: string;
}

export interface AccionAutorInput {
    preguntaId: string;
    usuarioId: string;
}

// =============================================================================
// RESPUESTA GENÉRICA DEL SERVICE
// =============================================================================

export interface RespuestaServicio<T = unknown> {
    success: boolean;
    message: string;
    data?: T;
    code?: number;
}
