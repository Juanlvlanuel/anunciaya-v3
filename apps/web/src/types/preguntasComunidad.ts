/**
 * preguntasComunidad.ts (frontend)
 * =================================
 * Tipos del feed "Pregúntale a [ciudad]" (Home).
 *
 * El backend ya devuelve estos campos en camelCase gracias al middleware
 * de transformación — aquí los modelamos tal como llegan.
 *
 * Ubicación: apps/web/src/types/preguntasComunidad.ts
 */

export type EstadoPregunta = 'activa' | 'cerrada' | 'oculta';

/**
 * Pregunta tal como la devuelve el backend en GET y POST.
 * Incluye los datos del autor flatten (mismo patrón que las notificaciones
 * con actorNombre / actorImagenUrl).
 */
export interface PreguntaComunidad {
    id: string;
    texto: string;
    ciudad: string;
    estado: string;
    estadoPregunta: EstadoPregunta;
    createdAt: string;
    updatedAt: string;

    // Datos del autor
    autorId: string;
    autorNombre: string;
    autorApellidos: string;
    autorAvatarUrl: string | null;
}

// =============================================================================
// INPUTS
// =============================================================================

export interface CrearPreguntaInput {
    texto: string;
    ciudad: string;
    estado: string;
}

export interface ListarPreguntasPorCiudadInput {
    ciudad: string;
    limit?: number;
    offset?: number;
}
