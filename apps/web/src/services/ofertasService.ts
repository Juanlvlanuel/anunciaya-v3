/**
 * ============================================================================
 * OFERTAS SERVICE - Llamadas API (SIN MAPPERS)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/services/ofertasService.ts
 * 
 * PROPÓSITO:
 * Funciones para comunicarse con el backend de ofertas
 * Centraliza todas las llamadas API del módulo de ofertas
 * 
 * ⚡ OPTIMIZADO: Ya no necesita mappers porque el backend tiene middleware
 *    que transforma automáticamente snake_case → camelCase
 * 
 * CREADO: Fase 5.4.2 - Sistema Completo de Ofertas
 */

import { get, post, put, del } from './api';
import type {
  Oferta,
  OfertaFeed,
  CrearOfertaInput,
  ActualizarOfertaInput,
  DuplicarOfertaInput,
  OfertaDuplicada,
  FiltrosFeedOfertas,
} from '../types/ofertas';

// =============================================================================
// FUNCIONES BUSINESS STUDIO (CRUD)
// =============================================================================

/**
 * Obtiene todas las ofertas de la sucursal activa
 * GET /api/ofertas
 * 
 * Middlewares backend: verificarToken, verificarNegocio, validarAccesoSucursal
 * Query automático: ?sucursalId=XXX (interceptor Axios)
 * 
 * ⚡ Ya viene en camelCase gracias al middleware del backend
 */
export async function obtenerOfertas() {
  return get<Oferta[]>('/ofertas');
}

/**
 * Obtiene una oferta específica por ID
 * GET /api/ofertas/:id
 * 
 * @param id - UUID de la oferta
 * 
 * ⚡ Ya viene en camelCase gracias al middleware del backend
 */
export async function obtenerOferta(id: string) {
  return get<Oferta>(`/ofertas/${id}`);
}

/**
 * Crea una nueva oferta en la sucursal activa
 * POST /api/ofertas
 * 
 * @param datos - Datos de la oferta a crear
 */
export async function crearOferta(datos: CrearOfertaInput) {
  return post<{ id: string; titulo: string; tipo: string }>('/ofertas', datos);
}

/**
 * Actualiza una oferta existente
 * PUT /api/ofertas/:id
 * 
 * @param id - UUID de la oferta
 * @param datos - Datos a actualizar
 */
export async function actualizarOferta(id: string, datos: ActualizarOfertaInput) {
  return put<{ id: string; titulo: string }>(`/ofertas/${id}`, datos);
}

/**
 * Elimina una oferta completamente
 * DELETE /api/ofertas/:id
 * 
 * @param id - UUID de la oferta
 */
export async function eliminarOferta(id: string) {
  return del(`/ofertas/${id}`);
}

/**
 * Duplica una oferta a otras sucursales (SOLO DUEÑOS)
 * POST /api/ofertas/:id/duplicar
 * 
 * @param id - UUID de la oferta original
 * @param datos - IDs de sucursales destino
 */
export async function duplicarOferta(id: string, datos: DuplicarOfertaInput) {
  return post<OfertaDuplicada[]>(`/ofertas/${id}/duplicar`, datos);
}

// =============================================================================
// FUNCIONES FEED PÚBLICO (REQUIERE AUTH - AMBOS MODOS)
// =============================================================================

/**
 * Obtiene el feed de ofertas geolocalizadas
 * GET /api/ofertas/feed
 * 
 * @param filtros - Filtros de búsqueda (lat, lng, distancia, categoría, tipo, etc.)
 * 
 * ⚡ Ya viene en camelCase gracias al middleware del backend
 */
export async function obtenerFeedOfertas(filtros?: FiltrosFeedOfertas) {
  const params = new URLSearchParams();

  if (filtros?.latitud) params.append('latitud', filtros.latitud.toString());
  if (filtros?.longitud) params.append('longitud', filtros.longitud.toString());
  if (filtros?.distanciaMaxKm) params.append('distanciaMaxKm', filtros.distanciaMaxKm.toString());
  if (filtros?.categoriaId) params.append('categoriaId', filtros.categoriaId.toString());
  if (filtros?.tipo) params.append('tipo', filtros.tipo);
  if (filtros?.busqueda) params.append('busqueda', filtros.busqueda);
  if (filtros?.limite) params.append('limite', filtros.limite.toString());
  if (filtros?.offset) params.append('offset', filtros.offset.toString());

  // Siempre enviar fecha local del usuario para filtrar ofertas activas correctamente
  // Esto garantiza que las ofertas se muestren según la medianoche local, no UTC
  const fechaLocal = filtros?.fechaLocal || new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
  params.append('fechaLocal', fechaLocal);

  const query = params.toString() ? `?${params.toString()}` : '';
  return get<OfertaFeed[]>(`/ofertas/feed${query}`);
}

/**
 * Obtiene el detalle de una oferta (vista pública)
 * GET /api/ofertas/detalle/:id
 * 
 * @param ofertaId - UUID de la oferta
 * 
 * ⚡ Ya viene en camelCase gracias al middleware del backend
 */
export async function obtenerDetalleOferta(ofertaId: string) {
  return get<OfertaFeed>(`/ofertas/detalle/${ofertaId}`);
}

/**
 * Registra una vista de oferta (métrica)
 * POST /api/ofertas/:id/vista
 * 
 * @param ofertaId - UUID de la oferta
 */
export async function registrarVistaOferta(ofertaId: string) {
  return post(`/ofertas/${ofertaId}/vista`, {});
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  // CRUD Business Studio
  obtenerOfertas,
  obtenerOferta,
  crearOferta,
  actualizarOferta,
  eliminarOferta,
  duplicarOferta,

  // Feed público
  obtenerFeedOfertas,
  obtenerDetalleOferta,
  registrarVistaOferta,
};