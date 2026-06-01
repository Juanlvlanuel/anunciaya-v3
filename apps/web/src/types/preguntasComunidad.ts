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
 * Estado de procesamiento de Coyo sobre la pregunta. Espejo del backend.
 *   - `pendiente`     → recién creada, Coyo aún no la toca.
 *   - `procesando`    → Coyo está trabajando.
 *   - `listo`         → Coyo respondió (hay respuestaCoyo y resultadosCoyo).
 *   - `sin_respuesta` → Coyo corrió pero no encontró nada / IA no disponible.
 *   - `no_aplica`     → la pregunta no era búsqueda local (Coyo redirigió).
 */
export type EstadoCoyo =
    | 'pendiente'
    | 'procesando'
    | 'listo'
    | 'sin_respuesta'
    | 'no_aplica';

/**
 * Estados finales (Coyo ya no va a cambiar nada). Útil para el hook de
 * sondeo: cuando llega a uno de estos, detenemos el `refetchInterval`.
 */
export const ESTADOS_COYO_FINALES: ReadonlyArray<EstadoCoyo> = [
    'listo',
    'sin_respuesta',
    'no_aplica',
];

export function esEstadoCoyoFinal(estado: EstadoCoyo | null | undefined): boolean {
    if (!estado) return false;
    return ESTADOS_COYO_FINALES.includes(estado);
}

// =============================================================================
// SHAPE de los resultados que Coyo guarda (espejo del buscador unificado)
// =============================================================================

export type TipoItemCoyo = 'negocio' | 'oferta' | 'marketplace' | 'servicio';

/**
 * Item normalizado tal como el buscador unificado del backend lo devuelve.
 * Los 8 campos opcionales son ESPECÍFICOS por tipo — los que no aplican al
 * tipo vienen como `null`:
 *   - `negocio`     usa: rating, totalResenas, verificado, estaAbierto
 *   - `marketplace` usa: condicion, aceptaOfertas
 *   - `oferta`      usa: negocioRating, diasParaVencer
 *   - `servicio`    no usa ninguno (pendiente — su rating es caro)
 */
export interface ItemCoyo {
    id: string;
    tipo: TipoItemCoyo;
    titulo: string;
    subtitulo: string | null;
    imagen: string | null;

    // Ricos opcionales — null cuando no aplican al tipo
    rating: number | null;
    totalResenas: number | null;
    verificado: boolean | null;
    estaAbierto: boolean | null;
    condicion: string | null;
    aceptaOfertas: boolean | null;
    negocioRating: number | null;
    diasParaVencer: number | null;
}

export interface GrupoCoyo {
    items: ItemCoyo[];
    total: number;
    error?: string;
}

export interface ResultadosCoyo {
    negocios: GrupoCoyo;
    ofertas: GrupoCoyo;
    marketplace: GrupoCoyo;
    servicios: GrupoCoyo;
}

/**
 * Forma del endpoint de sondeo:
 *   GET /api/preguntas-comunidad/:id/coyo
 */
export interface EstadoCoyoResponse {
    estadoCoyo: EstadoCoyo;
    respuestaCoyo: string | null;
    resultadosCoyo: ResultadosCoyo | null;
    coyoProcesadoAt: string | null;
}

// =============================================================================
// PREGUNTA (con campos de Coyo ya incluidos)
// =============================================================================

/**
 * Pregunta tal como la devuelve el backend en GET (feed) y POST (crear).
 * Incluye los datos del autor flatten, el estado de Coyo y los conteos
 * de respuestas/interés (Sprint 1).
 *
 * Las preguntas recién creadas vienen con `estadoCoyo='pendiente'` y los
 * demás campos de Coyo en `null` — el frontend sondea hasta que cambien.
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

    // Respuesta de Coyo (asíncrona — sondeada por el cliente)
    estadoCoyo: EstadoCoyo;
    respuestaCoyo: string | null;
    resultadosCoyo: ResultadosCoyo | null;
    coyoProcesadoAt: string | null;

    // ── Sprint 1: respuestas + interés + resuelta ──────────────────────────
    /** Timestamp ISO si el autor la marcó como resuelta; null si no. */
    resueltaAt: string | null;
    /** Conteo de respuestas activas (no borradas). */
    totalRespuestas: number;
    /** Conteo de "yo también quiero saber" (idempotente — uno por usuario). */
    totalInteresados: number;
    /**
     * `true` si el usuario actual ya marcó "yo también" en esta pregunta.
     * `false` si no marcó, o si no hay sesión (el backend devuelve false
     * cuando `usuarioId` no viene en el JWT).
     */
    yoTambienInteresado: boolean;
}

// =============================================================================
// RESPUESTAS DE LA COMUNIDAD (Sprint 1)
// =============================================================================

export type EstadoRespuesta = 'activa' | 'borrada';

/**
 * Respuesta de un vecino a una pregunta del Home. Backend devuelve solo
 * las `estado='activa'` (las borradas no llegan al frontend).
 */
export interface RespuestaPreguntaComunidad {
    id: string;
    preguntaId: string;
    texto: string;
    estado: EstadoRespuesta;
    createdAt: string;
    updatedAt: string;

    // Datos del autor de la respuesta (flatten)
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

export interface CrearRespuestaInput {
    preguntaId: string;
    texto: string;
}

export interface ListarRespuestasInput {
    preguntaId: string;
    limit?: number;
    offset?: number;
}

export interface EditarPreguntaInput {
    preguntaId: string;
    textoNuevo: string;
}
