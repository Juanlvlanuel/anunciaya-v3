/**
 * resenasService.ts
 * ==================
 * Servicio de llamadas API para el módulo Opiniones de Business Studio.
 *
 * UBICACIÓN: apps/web/src/services/resenasService.ts
 *
 * ENDPOINTS:
 * - GET  /api/resenas/business-studio       → Lista reseñas del negocio
 * - GET  /api/resenas/business-studio/kpis  → KPIs (promedio, distribución)
 * - POST /api/resenas/business-studio/responder → Responder reseña
 *
 * NOTA: El interceptor de Axios agrega ?sucursalId=XXX automáticamente
 *       cuando el usuario está en modo comercial.
 *
 * ⚡ Ya viene en camelCase gracias al middleware del backend
 */

import { get, post } from './api';
import type { ResenaBS, KPIsResenas } from '../types/resenas';

// =============================================================================
// OBTENER RESEÑAS
// =============================================================================

/**
 * Obtiene las reseñas del negocio para Business Studio.
 * GET /api/resenas/business-studio
 *
 * Query automático: ?sucursalId=XXX (interceptor Axios)
 *
 * @param pendientes - Si true, trae solo reseñas sin respuesta
 */
export async function obtenerResenas(pendientes: boolean = false) {
    const queryPendientes = pendientes ? '?pendientes=true' : '';
    return get<ResenaBS[]>(`/resenas/business-studio${queryPendientes}`);
}

// =============================================================================
// OBTENER KPIs
// =============================================================================

/**
 * Obtiene KPIs de reseñas para la página Opiniones.
 * GET /api/resenas/business-studio/kpis
 *
 * Query automático: ?sucursalId=XXX (interceptor Axios)
 *
 * Retorna: promedio, total, pendientes, distribución por estrellas
 */
export async function obtenerKPIs() {
    return get<KPIsResenas>('/resenas/business-studio/kpis');
}

// =============================================================================
// RESPONDER RESEÑA
// =============================================================================

/**
 * Responde a una reseña de cliente desde Business Studio.
 * POST /api/resenas/business-studio/responder
 *
 * @param resenaId - UUID de la reseña a responder
 * @param texto    - Texto de la respuesta del negocio
 */
export async function responderResena(resenaId: string, texto: string) {
    return post<{ id: string; texto: string; createdAt: string }>(
        '/resenas/business-studio/responder',
        { resenaId, texto }
    );
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
    obtenerResenas,
    obtenerKPIs,
    responderResena,
};