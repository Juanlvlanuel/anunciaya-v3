/**
 * ============================================================================
 * CLIENTES SERVICE - Llamadas API
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/services/clientesService.ts
 *
 * PROPÓSITO:
 * Funcionalidades del módulo Clientes en Business Studio:
 *   - Top clientes por puntos disponibles (filtrado por sucursal automáticamente)
 *
 * ⚡ sucursalId NO se pasa manualmente.
 *    El interceptor Axios lo agrega automáticamente en modo comercial.
 *    - Dueños: ven clientes de todas las sucursales (o filtran por la seleccionada)
 *    - Gerentes: backend fuerza filtro por su sucursal asignada
 *
 * NOTA: Las billeteras de puntos son globales por negocio (una por usuario-negocio).
 * Cuando hay filtro de sucursal, el backend busca usuarios que tienen
 * transacciones en esa sucursal y filtra las billeteras correspondientes.
 */

import { get } from './api';
import type { ClienteConPuntos } from '../types/puntos';

// =============================================================================
// TOP CLIENTES
// =============================================================================

/**
 * Obtiene los clientes con más puntos disponibles.
 * GET /api/clientes/top?limit=10
 *
 * Filtro de sucursal aplicado automáticamente por el interceptor.
 * Gerentes solo ven clientes de su sucursal (forzado en backend).
 * Solo retorna clientes con puntos disponibles > 0.
 *
 * @param limit - Cantidad máxima de clientes a retornar (por defecto 10, máximo 100)
 */
export async function getTopClientes(limit?: number) {
  const params = limit !== undefined ? `?limit=${limit}` : '';
  return get<ClienteConPuntos[]>(`/clientes/top${params}`);
}