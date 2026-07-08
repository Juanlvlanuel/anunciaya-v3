/**
 * categoriasService.ts
 * ====================
 * Llamadas a la API del Panel para el módulo "Categorías" (catálogo de negocios:
 * categorías + subcategorías + disponibilidad por ciudad). Reusa el axios del
 * Panel (`api`). Solo superadmin (lo garantiza el gate del backend).
 *
 * Ubicación: apps/admin/src/services/categoriasService.ts
 */

import { api, type RespuestaAPI } from './api';

/** Una ciudad donde aplica una categoría/subcategoría. */
export interface CiudadRef {
  id: string;
  nombre: string;
}

export interface SubcategoriaAdmin {
  id: number;
  categoriaId: number;
  nombre: string;
  orden: number;
  activa: boolean;
  /** Ciudades donde aparece. Vacío = global (todas). */
  ciudades: CiudadRef[];
  totalNegocios: number;
}

export interface CategoriaAdmin {
  id: number;
  nombre: string;
  orden: number;
  activa: boolean;
  /** Ciudades donde aparece. Vacío = global (todas). */
  ciudades: CiudadRef[];
  subcategorias: SubcategoriaAdmin[];
  totalNegocios: number;
}

export interface CatalogoAdminResp {
  categorias: CategoriaAdmin[];
  /** Negocios reales activos DISTINTOS con ≥1 subcategoría (en la ciudad filtrada, o todas). */
  totalNegocios: number;
  /** Categorías disponibles por ciudad (badge del dropdown). '' = total de categorías; una plaza solo
   *  aparece si tiene categorías RESTRINGIDAS (global + específicas). Las demás usan `catGlobal`. */
  porCiudad: Array<{ ciudadId: string; total: number }>;
  /** Categorías GLOBALES (en toda plaza): default del badge para ciudades sin restricciones. */
  catGlobal: number;
}

// =============================================================================
// LECTURA
// =============================================================================

/**
 * Catálogo completo (categorías → subcategorías + ciudades) + total de negocios
 * clasificados. @param ciudadId - Filtra los conteos de negocios por ciudad. Sin él, cuenta todas.
 */
export async function listarCatalogo(ciudadId?: string): Promise<CatalogoAdminResp> {
  const { data } = await api.get<RespuestaAPI<CatalogoAdminResp>>('/admin/categorias', {
    params: ciudadId ? { ciudadId } : undefined,
  });
  return data.data ?? { categorias: [], totalNegocios: 0, porCiudad: [], catGlobal: 0 };
}

// =============================================================================
// ACCIONES · CATEGORÍA
// =============================================================================

export async function crearCategoria(datos: { nombre: string; ciudadIds?: string[] }): Promise<{ id: number }> {
  const { data } = await api.post<RespuestaAPI<{ id: number }>>('/admin/categorias', datos);
  if (!data.data) throw new Error(data.message || 'Respuesta inválida del servidor');
  return data.data;
}

export async function editarCategoria(id: number, datos: { nombre?: string }): Promise<{ id: number }> {
  const { data } = await api.patch<RespuestaAPI<{ id: number }>>(`/admin/categorias/${id}`, datos);
  return data.data ?? { id };
}

export async function cambiarActivaCategoria(id: number, activa: boolean): Promise<{ id: number; activa: boolean }> {
  const { data } = await api.patch<RespuestaAPI<{ id: number; activa: boolean }>>(`/admin/categorias/${id}/activa`, { activa });
  return data.data ?? { id, activa };
}

export async function asignarCiudadesCategoria(id: number, ciudadIds: string[]): Promise<{ id: number; total: number }> {
  const { data } = await api.patch<RespuestaAPI<{ id: number; total: number }>>(`/admin/categorias/${id}/ciudades`, { ciudadIds });
  return data.data ?? { id, total: ciudadIds.length };
}

export async function reordenarCategorias(ids: number[]): Promise<{ total: number }> {
  const { data } = await api.post<RespuestaAPI<{ total: number }>>('/admin/categorias/reordenar', { ids });
  return data.data ?? { total: 0 };
}

// =============================================================================
// ACCIONES · SUBCATEGORÍA
// =============================================================================

export async function crearSubcategoria(datos: { categoriaId: number; nombre: string; ciudadIds?: string[] }): Promise<{ id: number }> {
  const { data } = await api.post<RespuestaAPI<{ id: number }>>('/admin/categorias/subcategorias', datos);
  if (!data.data) throw new Error(data.message || 'Respuesta inválida del servidor');
  return data.data;
}

export async function editarSubcategoria(id: number, datos: { nombre?: string }): Promise<{ id: number }> {
  const { data } = await api.patch<RespuestaAPI<{ id: number }>>(`/admin/categorias/subcategorias/${id}`, datos);
  return data.data ?? { id };
}

export async function cambiarActivaSubcategoria(id: number, activa: boolean): Promise<{ id: number; activa: boolean }> {
  const { data } = await api.patch<RespuestaAPI<{ id: number; activa: boolean }>>(`/admin/categorias/subcategorias/${id}/activa`, { activa });
  return data.data ?? { id, activa };
}

export async function asignarCiudadesSubcategoria(id: number, ciudadIds: string[]): Promise<{ id: number; total: number }> {
  const { data } = await api.patch<RespuestaAPI<{ id: number; total: number }>>(`/admin/categorias/subcategorias/${id}/ciudades`, { ciudadIds });
  return data.data ?? { id, total: ciudadIds.length };
}

export async function reordenarSubcategorias(categoriaId: number, ids: number[]): Promise<{ total: number }> {
  const { data } = await api.post<RespuestaAPI<{ total: number }>>('/admin/categorias/subcategorias/reordenar', { categoriaId, ids });
  return data.data ?? { total: 0 };
}
