/**
 * ============================================================================
 * CARDYA SERVICE - Llamadas API (Cliente)
 * ============================================================================
 *
 * UBICACIÓN: apps/web/src/services/cardyaService.ts
 *
 * PROPÓSITO:
 * Funcionalidades del módulo CardYA para usuarios finales:
 *   - Consultar billeteras de puntos por negocio
 *   - Ver recompensas disponibles y canjearlas
 *   - Gestionar vouchers activos
 *   - Consultar historial de compras y canjes
 *
 * AUTENTICACIÓN:
 *   - Todas las rutas requieren usuario autenticado (verificarToken)
 *   - El token se agrega automáticamente por el interceptor de Axios
 *
 * MODO:
 *   - CardYA solo funciona en MODO PERSONAL
 *   - Si el usuario está en modo comercial, debe redirigirse
 */

import { get, post, del } from './api';
import type {
  BilleteraNegocio,
  DetalleNegocioBilletera,
  RecompensaDisponible,
  FiltrosRecompensas,
  CanjearRecompensaInput,
  Voucher,
  FiltrosVouchers,
  HistorialCompra,
  FiltrosHistorialCompras,
  HistorialCanje,
  FiltrosHistorialCanjes,
} from '../types/cardya';

// =============================================================================
// BILLETERAS Y PUNTOS
// =============================================================================

/**
 * Obtiene todas las billeteras de puntos del usuario.
 * GET /api/cardya/mis-puntos
 *
 * Retorna un array con una billetera por cada negocio donde el usuario
 * tiene puntos acumulados o ha realizado transacciones.
 */
export async function getMisPuntos() {
  return get<BilleteraNegocio[]>('/cardya/mis-puntos');
}

/**
 * Obtiene el detalle completo de un negocio en CardYA.
 * GET /api/cardya/negocios/:id
 *
 * Incluye:
 * - Información del negocio
 * - Billetera del usuario en ese negocio
 * - Configuración de puntos
 * - Lista de sucursales
 *
 * @param negocioId - UUID del negocio
 */
export async function getDetalleNegocio(negocioId: string) {
  return get<DetalleNegocioBilletera>(`/cardya/negocio/${negocioId}`);
}

// =============================================================================
// RECOMPENSAS
// =============================================================================

/**
 * Obtiene las recompensas disponibles para el usuario.
 * GET /api/cardya/recompensas
 *
 * Filtros disponibles:
 * - soloDisponibles: true → solo recompensas que puedes canjear
 * - negocioId: filtrar por negocio específico
 * - limit/offset: paginación
 *
 * @param filtros - Filtros opcionales
 */
export async function getRecompensas(filtros?: FiltrosRecompensas) {
  const params = new URLSearchParams();

  if (filtros?.soloDisponibles) {
    params.append('soloDisponibles', 'true');
  }
  if (filtros?.negocioId) {
    params.append('negocioId', filtros.negocioId);
  }

  const query = params.toString();
  const url = query ? `/cardya/recompensas?${query}` : '/cardya/recompensas';

  return get<RecompensaDisponible[]>(url);
}

/**
 * Canjea una recompensa por puntos.
 * POST /api/cardya/recompensas/canjear
 *
 * FLUJO:
 * 1. Backend valida que tengas puntos suficientes
 * 2. Descuenta los puntos de tu billetera
 * 3. Crea un voucher con código único
 * 4. Retorna el voucher generado
 *
 * STOCK:
 * - Si la recompensa tiene stock limitado, se valida disponibilidad
 * - Si requiere aprobación, el voucher queda pendiente
 *
 * @param datos - Datos del canje (recompensaId, sucursalId opcional)
 */
export async function canjearRecompensa(datos: CanjearRecompensaInput) {
  return post<Voucher>('/cardya/canjear', datos);
}

// =============================================================================
// VOUCHERS
// =============================================================================

/**
 * Obtiene los vouchers activos del usuario.
 * GET /api/cardya/mis-vouchers
 *
 * Filtros disponibles:
 * - estado: 'pendiente' | 'usado' | 'cancelado' | 'todos'
 * - negocioId: filtrar por negocio específico
 * - limit/offset: paginación
 *
 * Por defecto retorna solo vouchers pendientes (no usados ni cancelados).
 *
 * @param filtros - Filtros opcionales
 */
export async function getMisVouchers(filtros?: FiltrosVouchers) {
  const params = new URLSearchParams();

  if (filtros?.estado) {
    params.append('estado', filtros.estado);
  }

  const query = params.toString();
  const url = query ? `/cardya/vouchers?${query}` : '/cardya/vouchers';

  return get<Voucher[]>(url);
}

/**
 * Cancela un voucher (soft delete).
 * DELETE /api/cardya/vouchers/:id
 *
 * IMPORTANTE:
 * - Solo se pueden cancelar vouchers en estado 'pendiente'
 * - Los puntos SÍ se regresan al usuario
 * - El stock se regresa a la recompensa
 * - Acción registrada en base de datos
 *
 * CASOS DE USO:
 * - Usuario canjeó por error
 * - Usuario ya no quiere la recompensa
 * - Usuario cambió de opinión
 *
 * @param id - UUID del voucher
 */
export async function cancelarVoucher(id: string) {
  return del<void>(`/cardya/vouchers/${id}`);
}

// =============================================================================
// HISTORIAL
// =============================================================================

/**
 * Obtiene el historial de compras (puntos otorgados).
 * GET /api/cardya/historial/compras
 *
 * Filtros disponibles:
 * - negocioId: filtrar por negocio específico
 * - limit/offset: paginación
 *
 * Retorna las transacciones donde se otorgaron puntos al usuario,
 * ordenadas de más reciente a más antigua.
 *
 * @param filtros - Filtros opcionales
 */
export async function getHistorialCompras(filtros?: FiltrosHistorialCompras) {
  const params = new URLSearchParams();

  if (filtros?.negocioId) {
    params.append('negocioId', filtros.negocioId);
  }
  if (filtros?.limit) {
    params.append('limit', filtros.limit.toString());
  }
  if (filtros?.offset) {
    params.append('offset', filtros.offset.toString());
  }

  const query = params.toString();
  const url = query ? `/cardya/historial/compras?${query}` : '/cardya/historial/compras';

  return get<HistorialCompra[]>(url);
}

/**
 * Obtiene el historial de canjes (recompensas canjeadas).
 * GET /api/cardya/historial/canjes
 *
 * Filtros disponibles:
 * - estado: 'usado' | 'cancelado' | 'todos'
 * - negocioId: filtrar por negocio específico
 * - limit/offset: paginación
 *
 * Retorna los vouchers generados al canjear recompensas,
 * ordenados de más reciente a más antiguo.
 *
 * @param filtros - Filtros opcionales
 */
export async function getHistorialCanjes(filtros?: FiltrosHistorialCanjes) {
  const params = new URLSearchParams();

  if (filtros?.estado) {
    params.append('estado', filtros.estado);
  }
  if (filtros?.negocioId) {
    params.append('negocioId', filtros.negocioId);
  }
  if (filtros?.limit) {
    params.append('limit', filtros.limit.toString());
  }
  if (filtros?.offset) {
    params.append('offset', filtros.offset.toString());
  }

  const query = params.toString();
  const url = query ? `/cardya/historial/canjes?${query}` : '/cardya/historial/canjes';

  return get<HistorialCanje[]>(url);
}