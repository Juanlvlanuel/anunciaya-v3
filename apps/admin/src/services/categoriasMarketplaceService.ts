/**
 * categoriasMarketplaceService.ts
 * ===============================
 * Llamadas a la API del Panel para las categorías de MarketPlace (catálogo
 * simple: 1 nivel, sin subcategorías ni ciudades). Reusa el axios del Panel
 * (`api`). Solo superadmin (lo garantiza el gate del backend).
 *
 * Ubicación: apps/admin/src/services/categoriasMarketplaceService.ts
 */

import { api, type RespuestaAPI } from './api';

export interface CategoriaMarketplaceAdmin {
  id: number;
  nombre: string;
  orden: number;
  activa: boolean;
  /** Publicaciones activas EN VENTA (en la ciudad filtrada, o todas). */
  totalVendo: number;
  /** Publicaciones activas de BÚSQUEDA/demanda. */
  totalBusco: number;
}

/** @param ciudadId - Filtra los conteos por ciudad. Sin él, cuenta todas. */
export async function listarCatalogo(ciudadId?: string): Promise<CategoriaMarketplaceAdmin[]> {
  const { data } = await api.get<RespuestaAPI<CategoriaMarketplaceAdmin[]>>(
    '/admin/categorias-marketplace',
    { params: ciudadId ? { ciudadId } : undefined },
  );
  return data.data ?? [];
}

export async function crearCategoria(datos: { nombre: string }): Promise<{ id: number }> {
  const { data } = await api.post<RespuestaAPI<{ id: number }>>(
    '/admin/categorias-marketplace',
    datos,
  );
  if (!data.data) throw new Error(data.message || 'Respuesta inválida del servidor');
  return data.data;
}

export async function editarCategoria(
  id: number,
  datos: { nombre?: string },
): Promise<{ id: number }> {
  const { data } = await api.patch<RespuestaAPI<{ id: number }>>(
    `/admin/categorias-marketplace/${id}`,
    datos,
  );
  return data.data ?? { id };
}

export async function cambiarActivaCategoria(
  id: number,
  activa: boolean,
): Promise<{ id: number; activa: boolean }> {
  const { data } = await api.patch<RespuestaAPI<{ id: number; activa: boolean }>>(
    `/admin/categorias-marketplace/${id}/activa`,
    { activa },
  );
  return data.data ?? { id, activa };
}

export async function reordenarCategorias(ids: number[]): Promise<{ total: number }> {
  const { data } = await api.post<RespuestaAPI<{ total: number }>>(
    '/admin/categorias-marketplace/reordenar',
    { ids },
  );
  return data.data ?? { total: 0 };
}
