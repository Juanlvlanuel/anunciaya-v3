/**
 * ============================================================================
 * ARTICULOS SERVICE - Llamadas API (SIN MAPPERS)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/services/articulosService.ts
 * 
 * PROPÓSITO:
 * Funciones para comunicarse con el backend de artículos
 * Centraliza todas las llamadas API del módulo de catálogo
 * 
 * ⚡ OPTIMIZADO: Ya no necesita mappers porque el backend tiene middleware
 *    que transforma automáticamente snake_case → camelCase
 * 
 * CREADO: Fase 5.4.1 - Catálogo CRUD Frontend
 * ACTUALIZADO: Enero 2026 - Eliminados mappers gracias al middleware global
 */

import { get, post, put, del } from './api';
import type {
  Articulo,
  CrearArticuloInput,
  ActualizarArticuloInput,
  DuplicarArticuloInput,
  ArticuloDuplicado,
} from '../types/articulos';

// =============================================================================
// FUNCIONES BUSINESS STUDIO (CRUD)
// =============================================================================

/**
 * Obtiene todos los artículos de la sucursal activa
 * GET /api/articulos
 * 
 * Middlewares backend: verificarToken, verificarNegocio, validarAccesoSucursal
 * Query automático: ?sucursalId=XXX (interceptor Axios)
 * 
 * ⚡ Ya viene en camelCase gracias al middleware del backend
 */
export async function obtenerArticulos() {
  return get<Articulo[]>('/articulos');
}

/**
 * Obtiene un artículo específico por ID
 * GET /api/articulos/:id
 * 
 * @param id - UUID del artículo
 * 
 * ⚡ Ya viene en camelCase gracias al middleware del backend
 */
export async function obtenerArticulo(id: string) {
  return get<Articulo>(`/articulos/${id}`);
}

/**
 * Crea un nuevo artículo en la sucursal activa
 * POST /api/articulos
 * 
 * @param datos - Datos del artículo a crear
 */
export async function crearArticulo(datos: CrearArticuloInput) {
  return post<{ id: string; tipo: string; nombre: string }>('/articulos', datos);
}

/**
 * Actualiza un artículo existente
 * PUT /api/articulos/:id
 * 
 * @param id - UUID del artículo
 * @param datos - Datos a actualizar
 */
export async function actualizarArticulo(id: string, datos: ActualizarArticuloInput) {
  return put<{ id: string; nombre: string; precioBase: string }>(`/articulos/${id}`, datos);
}

/**
 * Elimina un artículo completamente
 * DELETE /api/articulos/:id
 * 
 * @param id - UUID del artículo
 */
export async function eliminarArticulo(id: string) {
  return del(`/articulos/${id}`);
}

/**
 * Duplica un artículo a otras sucursales (SOLO DUEÑOS)
 * POST /api/articulos/:id/duplicar
 *
 * @param id - UUID del artículo original
 * @param datos - IDs de sucursales destino
 */
export async function duplicarArticulo(id: string, datos: DuplicarArticuloInput) {
  return post<ArticuloDuplicado[]>(`/articulos/${id}/duplicar`, datos);
}

/**
 * Genera una presigned URL para subir imagen de artículo directamente a R2.
 * POST /api/articulos/upload-imagen
 *
 * @param nombreArchivo - Nombre original del archivo (ej: 'foto.jpg')
 * @param contentType   - MIME type (ej: 'image/jpeg')
 * @returns uploadUrl (para hacer PUT) + publicUrl (URL final de la imagen)
 */
export async function generarUrlUploadImagenArticulo(nombreArchivo: string, contentType: string) {
  return post<{ uploadUrl: string; publicUrl: string; key: string; expiresIn: number }>(
    '/articulos/upload-imagen',
    { nombreArchivo, contentType }
  );
}

// =============================================================================
// FUNCIONES PÚBLICAS (SIN AUTENTICACIÓN)
// =============================================================================

/**
 * Obtiene el catálogo público de un negocio
 * GET /api/articulos/negocio/:negocioId
 * 
 * @param negocioId - UUID del negocio
 * @param sucursalId - UUID de la sucursal (opcional)
 * 
 * ⚡ Ya viene en camelCase gracias al middleware del backend
 */
export async function obtenerCatalogoPublico(negocioId: string, sucursalId?: string) {
  const params = sucursalId ? `?sucursalId=${sucursalId}` : '';
  return get<Articulo[]>(`/articulos/negocio/${negocioId}${params}`);
}

/**
 * Obtiene un artículo público para enlaces compartidos
 * GET /api/articulos/publico/:articuloId
 *
 * @param articuloId - UUID del artículo
 *
 * ⚡ Ya viene en camelCase gracias al middleware del backend
 */
export async function obtenerArticuloPublico(articuloId: string) {
  return get<{
    articulo: Articulo;
    negocio: {
      id: string;
      nombre: string;
      logoUrl: string | null;
    };
  }>(`/articulos/publico/${articuloId}`);
}

/**
 * Obtiene el detalle completo de un artículo (item de catálogo) con
 * datos del negocio y sucursal principal — útil para abrir el modal
 * `ModalDetalleItem` desde contextos donde solo se tiene el `articuloId`
 * (ej. card del chat con subtipo `articulo_negocio`).
 *
 * GET /api/articulos/detalle/:articuloId
 */
export async function obtenerDetalleArticulo(articuloId: string) {
  return get<{
    id: string;
    tipo: string;
    nombre: string;
    descripcion: string | null;
    categoria: string | null;
    precioBase: string;
    precioDesde: boolean | null;
    imagenPrincipal: string | null;
    disponible: boolean;
    destacado: boolean;
    requiereCita: boolean | null;
    duracionEstimada: number | null;
    negocio: {
      id: string;
      nombre: string;
      logoUrl: string | null;
      sitioWeb: string | null;
      sucursalId: string | null;
      sucursalNombre: string | null;
      ciudad: string | null;
      direccion: string | null;
      whatsapp: string | null;
    };
  }>(`/articulos/detalle/${articuloId}`);
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  // CRUD Business Studio
  obtenerArticulos,
  obtenerArticulo,
  crearArticulo,
  actualizarArticulo,
  eliminarArticulo,
  duplicarArticulo,
  generarUrlUploadImagenArticulo,

  // Público
  obtenerCatalogoPublico,
  obtenerArticuloPublico,
};