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

/**
 * Genera una presigned URL para subir imagen de oferta directamente a R2.
 * POST /api/ofertas/upload-imagen
 *
 * @param nombreArchivo - Nombre original del archivo (ej: 'foto.jpg')
 * @param contentType   - MIME type (ej: 'image/jpeg')
 * @returns uploadUrl (para hacer PUT) + publicUrl (URL final de la imagen)
 */
export async function generarUrlUploadImagenOferta(nombreArchivo: string, contentType: string) {
  return post<{ uploadUrl: string; publicUrl: string; key: string; expiresIn: number }>(
    '/ofertas/upload-imagen',
    { nombreArchivo, contentType }
  );
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
  if (filtros?.orden) params.append('orden', filtros.orden);
  if (filtros?.soloCardya) params.append('soloCardya', 'true');
  if (filtros?.creadasUltimasHoras) params.append('creadasUltimasHoras', filtros.creadasUltimasHoras.toString());

  // Siempre enviar fecha local del usuario para filtrar ofertas activas correctamente
  // Esto garantiza que las ofertas se muestren según la medianoche local, no UTC
  const fechaLocal = filtros?.fechaLocal || new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD
  params.append('fechaLocal', fechaLocal);

  const query = params.toString() ? `?${params.toString()}` : '';
  return get<OfertaFeed[]>(`/ofertas/feed${query}`);
}

/**
 * Obtiene la oferta destacada del día (Hero del feed editorial).
 * GET /api/ofertas/destacada-del-dia
 *
 * El backend devuelve `data: null` cuando no hay nada destacado — NO es
 * error. El frontend lo maneja ocultando el bloque Hero silenciosamente.
 *
 * Caso especial: la "Oferta del día" NO se filtra por ciudad (es contenido
 * editorial global), pero sí acepta `lat/lng` opcionales para CALCULAR la
 * distancia y mostrarla en la card. Sin GPS, `distanciaKm` viene null.
 */
export async function obtenerOfertaDestacadaDelDia(gps?: { latitud: number; longitud: number }) {
  const params = new URLSearchParams();
  if (gps?.latitud != null && gps?.longitud != null) {
    params.append('latitud', gps.latitud.toString());
    params.append('longitud', gps.longitud.toString());
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  return get<OfertaFeed | null>(`/ofertas/destacada-del-dia${query}`);
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
 * Registra una VISTA (impression) de oferta.
 * Disparado cuando la card aparece en el viewport del usuario.
 * Anti-inflación: 1 vista/usuario/día.
 *
 * POST /api/ofertas/:id/vista
 */
export async function registrarVistaOferta(ofertaId: string) {
  return post(`/ofertas/${ofertaId}/vista`, {});
}

/**
 * Registra un CLICK (engagement) de oferta.
 * Disparado cuando el usuario abre el modal de detalle.
 * Anti-inflación: 1 click/usuario/día.
 *
 * POST /api/ofertas/:id/click
 */
export async function registrarClickOferta(ofertaId: string) {
  return post(`/ofertas/${ofertaId}/click`, {});
}

/**
 * Sucursal donde aplica una oferta multi-sucursal.
 */
export interface SucursalDeOferta {
  ofertaId: string;
  sucursalId: string;
  sucursalNombre: string;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  whatsapp: string | null;
  esPrincipal: boolean;
  latitud: number;
  longitud: number;
  distanciaKm: number | null;
}

/**
 * Obtiene la lista de sucursales donde aplica la MISMA oferta operativa
 * (mismo grupo de partición que la dedup del feed).
 *
 * Solo tiene sentido cuando `oferta.totalSucursales > 1`.
 *
 * GET /api/ofertas/:id/sucursales
 */
export async function obtenerSucursalesDeOferta(
  ofertaId: string,
  gps?: { latitud: number; longitud: number }
) {
  const params = new URLSearchParams();
  if (gps?.latitud != null && gps?.longitud != null) {
    params.append('latitud', gps.latitud.toString());
    params.append('longitud', gps.longitud.toString());
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  return get<SucursalDeOferta[]>(`/ofertas/${ofertaId}/sucursales${query}`);
}

/**
 * Registra un SHARE de oferta.
 * Disparado cuando el usuario comparte la oferta vía WhatsApp,
 * Facebook, X, Copiar link, o Web Share API nativo.
 * Anti-inflación: 1 share/usuario/día.
 *
 * POST /api/ofertas/:id/share
 */
export async function registrarShareOferta(ofertaId: string) {
  return post(`/ofertas/${ofertaId}/share`, {});
}

// =============================================================================
// OFERTAS CON CÓDIGO (ANTES CUPONES)
// =============================================================================

/**
 * Asignar oferta exclusiva a usuarios
 * POST /api/ofertas/:id/asignar
 */
export async function asignarOferta(ofertaId: string, datos: { usuariosIds: string[]; motivo?: string }) {
  return post(`/ofertas/${ofertaId}/asignar`, datos);
}

/**
 * Obtener ofertas exclusivas del usuario
 * GET /api/ofertas/mis-exclusivas
 */
export async function obtenerMisExclusivas() {
  return get('/ofertas/mis-exclusivas');
}

/**
 * Obtener oferta pública por código
 * GET /api/ofertas/publico/:codigo
 */
/**
 * Reenviar cupón a clientes asignados
 * POST /api/ofertas/:id/reenviar
 */
export async function reenviarCupon(ofertaId: string) {
  return post(`/ofertas/${ofertaId}/reenviar`, {});
}

export async function revocarCuponMasivo(ofertaId: string, motivo?: string) {
  return post(`/ofertas/${ofertaId}/revocar-todos`, { motivo });
}

export async function reactivarCuponService(ofertaId: string) {
  return post(`/ofertas/${ofertaId}/reactivar`, {});
}

export interface ClienteAsignado {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  avatarUrl: string | null;
  cuponId: string;
  estado: string;
  codigoPersonal: string | null;
  motivo: string | null;
  asignadoAt: string;
  usadoAt: string | null;
  revocadoAt: string | null;
  motivoRevocacion: string | null;
}

export async function obtenerClientesAsignados(ofertaId: string) {
  return get<ClienteAsignado[]>(`/ofertas/${ofertaId}/clientes-asignados`);
}

export async function obtenerOfertaPublica(codigo: string) {
  return get(`/ofertas/publico/${codigo}`);
}

// =============================================================================
// BUSCADOR (sugerencias en vivo)
// =============================================================================

/** Forma de cada card del overlay del buscador de Ofertas. */
export interface SugerenciaOferta {
  ofertaId: string;
  titulo: string;
  imagen: string | null;
  tipo: string;
  valor: number;
  negocioNombre: string;
  sucursalNombre: string | null;
  ciudad: string;
}

/**
 * Sugerencias en vivo del buscador de Ofertas.
 * GET /api/ofertas/buscar/sugerencias?q=...&ciudad=...
 *
 * Devuelve top 5 ofertas activas en la ciudad cuyo título, descripción o
 * nombre del negocio matchea el query (ILIKE substring). Sin GPS, sin filtros.
 */
export async function obtenerSugerenciasOfertas(q: string, ciudad: string) {
  const params = new URLSearchParams();
  params.append('q', q);
  params.append('ciudad', ciudad);
  return get<SugerenciaOferta[]>(`/ofertas/buscar/sugerencias?${params.toString()}`);
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
  generarUrlUploadImagenOferta,

  // Feed público
  obtenerFeedOfertas,
  obtenerOfertaDestacadaDelDia,
  obtenerDetalleOferta,
  registrarVistaOferta,
  obtenerSugerenciasOfertas,

  // Código de descuento + ofertas exclusivas
  asignarOferta,
  obtenerMisExclusivas,
  obtenerOfertaPublica,
  reenviarCupon,
  revocarCuponMasivo,
  reactivarCuponService,
};