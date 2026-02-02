/**
 * ============================================================================
 * TRANSACCIONES SERVICE - Llamadas API
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/services/transaccionesService.ts
 *
 * PROPÓSITO:
 * Funcionalidades del módulo Transacciones en Business Studio:
 *   - Historial de transacciones de puntos (filtrado por sucursal automáticamente)
 *   - Revocar transacciones (devuelve puntos al cliente)
 *
 * ⚡ sucursalId NO se pasa manualmente.
 *    El interceptor Axios lo agrega automáticamente en modo comercial.
 *    - Dueños: ven todas las sucursales (o filtran por la seleccionada)
 *    - Gerentes: backend fuerza filtro por su sucursal asignada
 */

import { get, post } from './api';
import type {
  TransaccionPuntos,
  PeriodoEstadisticas,
} from '../types/puntos';

// =============================================================================
// HISTORIAL DE TRANSACCIONES
// =============================================================================

/**
 * Obtiene el historial de transacciones de puntos con paginación.
 * GET /api/transacciones/historial?periodo=semana&limit=50&offset=0
 *
 * Filtro de sucursal aplicado automáticamente por el interceptor.
 * Gerentes solo ven transacciones de su sucursal (forzado en backend).
 *
 * PAGINACIÓN: El backend NO retorna un campo `total`.
 * Para saber si hay más datos: si array.length === limit, hay más página.
 *
 * @param periodo - Período temporal (por defecto 'todo')
 * @param limit   - Cantidad máxima de resultados (por defecto 50, máximo 100)
 * @param offset  - Cantidad de registros a saltar para paginación
 */
export async function getHistorial(
  periodo?: PeriodoEstadisticas,
  limit?: number,
  offset?: number
) {
  const params = new URLSearchParams();
  if (periodo) params.set('periodo', periodo);
  if (limit !== undefined) params.set('limit', limit.toString());
  if (offset !== undefined) params.set('offset', offset.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return get<TransaccionPuntos[]>(`/transacciones/historial${query}`);
}

// =============================================================================
// REVOCAR TRANSACCIÓN
// =============================================================================

/**
 * Revoca una transacción de puntos (devuelve puntos al cliente).
 * POST /api/transacciones/:id/revocar
 *
 * Permisos:
 *   - Dueños: pueden revocar cualquier transacción
 *   - Gerentes: solo transacciones de su sucursal (backend valida)
 *
 * Errores posibles del backend:
 *   - 404: Transacción no encontrada
 *   - 400: Ya fue cancelada o cliente sin saldo suficiente
 *   - 403: Gerente intentando revocar de otra sucursal
 *
 * @param id - UUID de la transacción a revocar
 */
export async function revocarTransaccion(id: string) {
  return post(`/transacciones/${id}/revocar`);
}