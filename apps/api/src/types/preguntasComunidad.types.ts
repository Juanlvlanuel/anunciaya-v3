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
