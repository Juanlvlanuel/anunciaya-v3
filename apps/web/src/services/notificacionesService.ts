/**
 * notificacionesService.ts
 * =========================
 * Llamadas API para el módulo de Notificaciones.
 *
 * UBICACIÓN: apps/web/src/services/notificacionesService.ts
 */

import { get, patch, del } from './api';
import type { ModoNotificacion, NotificacionesResponse } from '../types/notificaciones';
import { useAuthStore } from '../stores/useAuthStore';

// =============================================================================
// HELPER: ¿Qué sucursal usar para filtrar notificaciones?
// =============================================================================

/**
 * Determina la sucursal cuyas notificaciones se deben mostrar:
 *
 * - **Gerente**: siempre su sucursal asignada (no puede cambiar).
 * - **Dueño dentro de Business Studio**: la sucursal activa del selector (puede cambiarla).
 * - **Dueño fuera de BS** (inicio, marketplace, ScanYA web): la sucursal principal (Matriz).
 *   Fuera de BS el dueño no tiene selector de sucursal visible — se asume Matriz como
 *   representación global del negocio.
 * - **Modo personal**: sin filtro (undefined).
 */
export function obtenerSucursalIdParaFiltro(): string | undefined {
  if (typeof window === 'undefined') return undefined;

  const state = useAuthStore.getState();
  const usuario = state.usuario;
  if (!usuario || usuario.modoActivo !== 'comercial') return undefined;

  // Gerente: fijo a su sucursal asignada
  if (usuario.sucursalAsignada) return usuario.sucursalAsignada;

  // Dueño: depende de si está navegando dentro de BS o no
  const enBusinessStudio = window.location.pathname.startsWith('/business-studio');
  if (enBusinessStudio) {
    return usuario.sucursalActiva ?? state.sucursalPrincipalId ?? undefined;
  }
  return state.sucursalPrincipalId ?? usuario.sucursalActiva ?? undefined;
}

// =============================================================================
// API CALLS
// =============================================================================

/**
 * GET /api/notificaciones?modo=personal&limit=20&offset=0
 * Obtiene notificaciones paginadas del usuario.
 * El `sucursalId` se calcula según dónde esté navegando (ver helper arriba).
 */
export async function getNotificaciones(modo: ModoNotificacion, limit = 20, offset = 0) {
  const params = new URLSearchParams({ modo, limit: String(limit), offset: String(offset) });
  const sucursalId = obtenerSucursalIdParaFiltro();
  if (sucursalId) params.set('sucursalId', sucursalId);
  return get<NotificacionesResponse>(`/notificaciones?${params.toString()}`);
}

/**
 * GET /api/notificaciones/no-leidas?modo=personal
 * Retorna la cantidad de notificaciones no leídas (para badge)
 */
export async function getConteoNoLeidas(modo: ModoNotificacion) {
  const params = new URLSearchParams({ modo });
  const sucursalId = obtenerSucursalIdParaFiltro();
  if (sucursalId) params.set('sucursalId', sucursalId);
  return get<number>(`/notificaciones/no-leidas?${params.toString()}`);
}

/**
 * PATCH /api/notificaciones/:id/leida
 * Marca una notificación como leída
 */
export async function marcarLeida(id: string) {
  return patch<void>(`/notificaciones/${id}/leida`);
}

/**
 * PATCH /api/notificaciones/marcar-todas?modo=personal&sucursalId=...
 * Marca todas las notificaciones del modo como leídas.
 * En modo comercial respeta el contexto de sucursal activa (BS vs fuera de BS).
 */
export async function marcarTodasLeidas(modo: ModoNotificacion) {
  const params = new URLSearchParams({ modo });
  const sucursalId = obtenerSucursalIdParaFiltro();
  if (sucursalId) params.set('sucursalId', sucursalId);
  return patch<void>(`/notificaciones/marcar-todas?${params.toString()}`);
}

/**
 * DELETE /api/notificaciones/:id
 * Elimina una notificación específica
 */
export async function eliminarNotificacion(id: string) {
  return del<void>(`/notificaciones/${id}`);
}