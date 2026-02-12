/**
 * notificacionesService.ts
 * =========================
 * Llamadas API para el módulo de Notificaciones.
 *
 * UBICACIÓN: apps/web/src/services/notificacionesService.ts
 */

import { get, patch } from './api';
import type { ModoNotificacion, NotificacionesResponse } from '../types/notificaciones';

// =============================================================================
// API CALLS
// =============================================================================

/**
 * GET /api/notificaciones?modo=personal&limit=20&offset=0
 * Obtiene notificaciones paginadas del usuario
 */
export async function getNotificaciones(modo: ModoNotificacion, limit = 20, offset = 0) {
  return get<NotificacionesResponse>(`/notificaciones?modo=${modo}&limit=${limit}&offset=${offset}`);
}

/**
 * GET /api/notificaciones/no-leidas?modo=personal
 * Retorna la cantidad de notificaciones no leídas (para badge)
 */
export async function getConteoNoLeidas(modo: ModoNotificacion) {
  return get<number>(`/notificaciones/no-leidas?modo=${modo}`);
}

/**
 * PATCH /api/notificaciones/:id/leida
 * Marca una notificación como leída
 */
export async function marcarLeida(id: string) {
  return patch<void>(`/notificaciones/${id}/leida`);
}

/**
 * PATCH /api/notificaciones/marcar-todas?modo=personal
 * Marca todas las notificaciones del modo como leídas
 */
export async function marcarTodasLeidas(modo: ModoNotificacion) {
  return patch<void>(`/notificaciones/marcar-todas?modo=${modo}`);
}