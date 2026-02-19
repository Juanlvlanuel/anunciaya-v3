/**
 * ============================================================================
 * CLIENTES SERVICE - Llamadas API
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/services/clientesService.ts
 *
 * PROPÓSITO:
 * Funcionalidades del módulo Clientes en Business Studio:
 *   - Top clientes por puntos disponibles
 *   - KPIs de la página Clientes
 *   - Lista de clientes con filtros y paginación
 *   - Detalle completo de un cliente
 *   - Historial de transacciones de un cliente
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
import type { ClienteConPuntos, TransaccionPuntos } from '../types/puntos';
import type { KPIsClientes, ClienteCompleto, ClienteDetalle, NivelCardYA } from '../types/clientes';

// =============================================================================
// TOP CLIENTES (usado por Dashboard)
// =============================================================================

/**
 * Obtiene los clientes con más puntos disponibles.
 * GET /api/clientes/top?limit=10
 */
export async function getTopClientes(limit?: number) {
  const params = limit !== undefined ? `?limit=${limit}` : '';
  return get<ClienteConPuntos[]>(`/clientes/top${params}`);
}

// =============================================================================
// KPIs CLIENTES (Página Clientes BS)
// =============================================================================

/**
 * Obtiene 4 KPIs: total clientes, distribución nivel, nuevos mes, inactivos.
 * GET /api/clientes/kpis
 */
export async function getKPIsClientes() {
  return get<KPIsClientes>('/clientes/kpis');
}

// =============================================================================
// LISTA DE CLIENTES (Página Clientes BS)
// =============================================================================

/**
 * Lista clientes con filtros y paginación.
 * GET /api/clientes?busqueda=xxx&nivel=oro&limit=20&offset=0
 *
 * @param busqueda - Texto para buscar por nombre o teléfono
 * @param nivel    - Filtro por nivel CardYA (bronce, plata, oro)
 * @param limit    - Cantidad máxima de resultados (por defecto 20, máximo 100)
 * @param offset   - Cantidad de registros a saltar para paginación
 */
export async function getClientes(
  busqueda?: string,
  nivel?: NivelCardYA,
  limit?: number,
  offset?: number
) {
  const params = new URLSearchParams();
  if (busqueda) params.set('busqueda', busqueda);
  if (nivel) params.set('nivel', nivel);
  if (limit !== undefined) params.set('limit', limit.toString());
  if (offset !== undefined) params.set('offset', offset.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return get<ClienteCompleto[]>(`/clientes${query}`);
}

// =============================================================================
// DETALLE DE CLIENTE (Modal Clientes BS)
// =============================================================================

/**
 * Obtiene datos completos de un cliente: puntos, vouchers, estadísticas.
 * GET /api/clientes/:id
 *
 * @param id - UUID del cliente
 */
export async function getDetalleCliente(id: string) {
  return get<ClienteDetalle>(`/clientes/${id}`);
}

// =============================================================================
// HISTORIAL DE UN CLIENTE (Modal Clientes BS)
// =============================================================================

/**
 * Obtiene transacciones de un cliente específico.
 * GET /api/clientes/:id/historial?limit=20&offset=0
 *
 * @param id     - UUID del cliente
 * @param limit  - Cantidad máxima de resultados (por defecto 20)
 * @param offset - Cantidad de registros a saltar
 */
export async function getHistorialCliente(
  id: string,
  limit?: number,
  offset?: number
) {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', limit.toString());
  if (offset !== undefined) params.set('offset', offset.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return get<TransaccionPuntos[]>(`/clientes/${id}/historial${query}`);
}