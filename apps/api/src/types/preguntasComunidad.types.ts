/**
 * preguntasComunidad.types.ts
 * ============================
 * Tipos para el módulo "Pregúntale a [ciudad]" (feed del Home).
 *
 * UBICACIÓN: apps/api/src/types/preguntasComunidad.types.ts
 */

export type EstadoPregunta = 'activa' | 'cerrada' | 'oculta';

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
