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
 *   - KPIs de la página Transacciones
 *   - Revocar transacciones con motivo obligatorio
 *   - Exportar transacciones a CSV
 *
 * ⚡ sucursalId NO se pasa manualmente.
 *    El interceptor Axios lo agrega automáticamente en modo comercial.
 *    - Dueños: ven todas las sucursales (o filtran por la seleccionada)
 *    - Gerentes: backend fuerza filtro por su sucursal asignada
 */

import { get, post, api } from './api';
import type {
  TransaccionPuntos,
  PeriodoEstadisticas,
} from '../types/puntos';
import type { KPIsTransacciones, KPIsCanjes, VoucherCanje } from '../types/transacciones';

// =============================================================================
// HISTORIAL DE TRANSACCIONES
// =============================================================================

/**
 * Obtiene el historial de transacciones de puntos con paginación.
 * GET /api/transacciones/historial?periodo=semana&limit=50&offset=0
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
  offset?: number,
  busqueda?: string,
  operadorId?: string,
  estado?: string
) {
  const params = new URLSearchParams();
  if (periodo) params.set('periodo', periodo);
  if (limit !== undefined) params.set('limit', limit.toString());
  if (offset !== undefined) params.set('offset', offset.toString());
  if (busqueda) params.set('busqueda', busqueda);
  if (operadorId) params.set('operadorId', operadorId);
  if (estado) params.set('estado', estado);
  const query = params.toString() ? `?${params.toString()}` : '';
  return get<{ historial: TransaccionPuntos[], total: number }>(`/transacciones/historial${query}`);
}

// =============================================================================
// OPERADORES (dropdown filtro)
// =============================================================================

export interface Operador {
  id: string;
  nombre: string;
  tipo: string;
}

/**
 * Obtiene lista de operadores que han registrado ventas.
 * GET /api/transacciones/operadores
 */
export async function getOperadores() {
  return get<Operador[]>('/transacciones/operadores');
}

// =============================================================================
// KPIs TRANSACCIONES (Página Transacciones BS)
// =============================================================================

/**
 * Obtiene 4 KPIs: total ventas, # transacciones, ticket promedio, revocadas.
 * GET /api/transacciones/kpis?periodo=semana
 *
 * @param periodo - Período temporal (por defecto 'todo')
 */
export async function getKPIsTransacciones(periodo?: PeriodoEstadisticas) {
  const params = periodo ? `?periodo=${periodo}` : '';
  return get<KPIsTransacciones>(`/transacciones/kpis${params}`);
}

// =============================================================================
// REVOCAR TRANSACCIÓN (con motivo obligatorio)
// =============================================================================

/**
 * Revoca una transacción de puntos (devuelve puntos al cliente).
 * POST /api/transacciones/:id/revocar
 * Body: { motivo: string }
 *
 * Permisos:
 *   - Dueños: pueden revocar cualquier transacción
 *   - Gerentes: solo transacciones de su sucursal (backend valida)
 *
 * @param id     - UUID de la transacción a revocar
 * @param motivo - Motivo obligatorio de la revocación
 */
export async function revocarTransaccion(id: string, motivo: string) {
  return post(`/transacciones/${id}/revocar`, { motivo });
}

// =============================================================================
// EXPORTAR CSV
// =============================================================================

/**
 * Descarga las transacciones del periodo como archivo CSV.
 * Usa Axios (con interceptor) para enviar token y sucursalId automáticamente.
 *
 * @param periodo    - Período temporal para filtrar
 * @param busqueda   - Búsqueda por nombre o teléfono
 * @param operadorId - Filtrar por operador específico
 * @param estado     - Filtrar por estado (confirmado/cancelado)
 */
export async function descargarCSV(
  periodo?: PeriodoEstadisticas,
  busqueda?: string,
  operadorId?: string,
  estado?: string
): Promise<void> {
  const params = new URLSearchParams();
  if (periodo) params.set('periodo', periodo);
  if (busqueda) params.set('busqueda', busqueda);
  if (operadorId) params.set('operadorId', operadorId);
  if (estado) params.set('estado', estado);
  const query = params.toString() ? `?${params.toString()}` : '';

  const respuesta = await api.get(`/transacciones/exportar${query}`, {
    responseType: 'blob',
  });

  // Crear blob y disparar descarga
  const blob = new Blob([respuesta.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `transacciones_${periodo || 'todo'}_${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// =============================================================================
// TAB CANJES - KPIs
// =============================================================================

/**
 * Obtiene 4 KPIs: pendientes, usados, vencidos, total canjes.
 * GET /api/transacciones/canjes/kpis?periodo=semana
 *
 * @param periodo - Período temporal (por defecto 'todo')
 */
export async function getKPIsCanjes(periodo?: PeriodoEstadisticas) {
  const params = periodo ? `?periodo=${periodo}` : '';
  return get<KPIsCanjes>(`/transacciones/canjes/kpis${params}`);
}

// =============================================================================
// TAB CANJES - HISTORIAL
// =============================================================================

/**
 * Obtiene el historial de canjes (vouchers) con paginación.
 * GET /api/transacciones/canjes?periodo=semana&limit=20&offset=0&estado=pendiente
 *
 * @param periodo  - Período temporal (por defecto 'todo')
 * @param limit    - Cantidad máxima de resultados (por defecto 20)
 * @param offset   - Cantidad de registros a saltar para paginación
 * @param estado   - Filtro por estado: 'pendiente' | 'usado' | 'expirado' | 'todos'
 * @param busqueda - Búsqueda por nombre o teléfono del cliente
 */
export async function getHistorialCanjes(
  periodo?: PeriodoEstadisticas,
  limit?: number,
  offset?: number,
  estado?: string,
  busqueda?: string
) {
  const params = new URLSearchParams();
  if (periodo) params.set('periodo', periodo);
  if (limit !== undefined) params.set('limit', limit.toString());
  if (offset !== undefined) params.set('offset', offset.toString());
  if (estado) params.set('estado', estado);
  if (busqueda) params.set('busqueda', busqueda);
  const query = params.toString() ? `?${params.toString()}` : '';
  return get<{ canjes: VoucherCanje[]; total: number }>(`/transacciones/canjes${query}`);
}