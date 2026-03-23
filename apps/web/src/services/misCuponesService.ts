/**
 * misCuponesService.ts
 * =====================
 * Llamadas API para la vista del cliente: Mis Cupones.
 *
 * UBICACIÓN: apps/web/src/services/misCuponesService.ts
 */

import { get, post } from './api';

// =============================================================================
// TIPOS
// =============================================================================

export interface CuponCliente {
  cuponId: string;
  ofertaId: string;
  codigoPersonal: string | null;
  estado: 'activo' | 'usado' | 'expirado' | 'revocado';
  motivo: string | null;
  asignadoAt: string;
  usadoAt: string | null;
  revocadoAt: string | null;
  motivoRevocacion: string | null;
  titulo: string;
  descripcion: string | null;
  imagen: string | null;
  tipo: string;
  valor: string | null;
  compraMinima: string | null;
  fechaInicio: string;
  fechaFin: string;
  negocioId: string;
  negocioNombre: string;
  negocioLogo: string | null;
  sucursalNombre: string | null;
}

// =============================================================================
// FUNCIONES
// =============================================================================

/**
 * Obtener cupones del usuario
 * GET /api/ofertas/mis-cupones?estado=activo|usado|expirado|revocado
 */
export async function obtenerMisCupones(estado?: string) {
  const query = estado && estado !== 'todos' ? `?estado=${estado}` : '';
  return get<CuponCliente[]>(`/ofertas/mis-cupones${query}`);
}

/**
 * Revelar código personal del cupón
 * POST /api/ofertas/mis-cupones/:id/revelar
 */
export async function revelarCodigo(cuponId: string) {
  return post<{ codigo: string; estado: string }>(`/ofertas/mis-cupones/${cuponId}/revelar`, {});
}

/**
 * Revocar cupón (desde BS)
 * POST /api/ofertas/:ofertaId/revocar
 */
export async function revocarCupon(ofertaId: string, usuarioId: string, motivo?: string) {
  return post(`/ofertas/${ofertaId}/revocar`, { usuarioId, motivo });
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  obtenerMisCupones,
  revelarCodigo,
  revocarCupon,
};
