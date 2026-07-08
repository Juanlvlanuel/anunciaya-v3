/**
 * ciudadesService.ts
 * ==================
 * Llamadas a la API del Panel para el módulo "Ciudades" (catálogo de ciudades + regiones).
 * Reusa el axios del Panel (`api`). Solo superadmin (lo garantiza el gate del backend).
 *
 * Endpoints (Fase 1 · VER):
 *   GET /admin/ciudades          → catálogo de ciudades (con filtros)
 *   GET /admin/ciudades/regiones → regiones con su # de ciudades
 *
 * Ubicación: apps/admin/src/services/ciudadesService.ts
 */

import { api, type RespuestaAPI } from './api';

/** Una ciudad del catálogo con su región resuelta. */
export interface CiudadCatalogo {
  id: string;
  nombre: string;
  estado: string;
  pais: string;
  slug: string;
  lat: number | null;
  lng: number | null;
  alias: string[] | null;
  importancia: number;
  activa: boolean;
  regionId: string | null;
  regionNombre: string | null;
}

/** Una región con cuántas ciudades agrupa. */
export interface RegionConConteo {
  id: string;
  nombre: string;
  activa: boolean;
  totalCiudades: number;
}

/** Filtro especial: ciudades sin región asignada. */
export const REGION_SIN = '__none';

/** Estado de actividad para filtrar la lista. */
export type FiltroActiva = 'todas' | 'activas' | 'inactivas';

export interface FiltrosCiudades {
  busqueda?: string;
  regionId?: string; // uuid | REGION_SIN | undefined (todas)
  estado?: string;
  activa?: FiltroActiva;
}

/** Catálogo de ciudades (con filtros opcionales). */
export async function listarCiudades(filtros: FiltrosCiudades = {}): Promise<CiudadCatalogo[]> {
  const { data } = await api.get<RespuestaAPI<CiudadCatalogo[]>>('/admin/ciudades', {
    params: {
      busqueda: filtros.busqueda || undefined,
      regionId: filtros.regionId || undefined,
      estado: filtros.estado || undefined,
      activa: filtros.activa && filtros.activa !== 'todas' ? filtros.activa : undefined,
    },
  });
  return data.data ?? [];
}

/** Regiones con su # de ciudades. */
export async function listarRegiones(): Promise<RegionConConteo[]> {
  const { data } = await api.get<RespuestaAPI<RegionConConteo[]>>('/admin/ciudades/regiones');
  return data.data ?? [];
}

/** Total de ciudades del catálogo (badge del menú). */
export async function contarCiudades(): Promise<number> {
  const { data } = await api.get<RespuestaAPI<{ total: number }>>('/admin/ciudades/conteo');
  return data.data?.total ?? 0;
}

// =============================================================================
// ACCIONES (Fase 2)
// =============================================================================

/** Datos de una ciudad para darla de alta. */
export interface CiudadAlta {
  nombre: string;
  estado: string;
  lat: number;
  lng: number;
  pais?: string;
  regionId?: string | null;
  importancia?: number;
  alias?: string[];
}

export interface DatosCiudadEditar {
  nombre?: string;
  estado?: string;
  lat?: number;
  lng?: number;
  importancia?: number;
  alias?: string[];
}

/** Alta de una ciudad. */
export async function crearCiudad(datos: CiudadAlta): Promise<{ id: string }> {
  const { data } = await api.post<RespuestaAPI<{ id: string }>>('/admin/ciudades', datos);
  if (!data.data) throw new Error(data.message || 'Respuesta inválida del servidor');
  return data.data;
}

/** Alta de varias ciudades de un jalón (desde el mapa); región común opcional. */
export async function crearCiudadesMultiple(
  ciudades: CiudadAlta[],
  regionId?: string | null,
): Promise<{ creadas: number; omitidas: string[] }> {
  const { data } = await api.post<RespuestaAPI<{ creadas: number; omitidas: string[] }>>(
    '/admin/ciudades/multiple',
    { ciudades, regionId: regionId ?? null },
  );
  return data.data ?? { creadas: 0, omitidas: [] };
}

/** Editar una ciudad. */
export async function editarCiudad(id: string, datos: DatosCiudadEditar): Promise<{ id: string }> {
  const { data } = await api.patch<RespuestaAPI<{ id: string }>>(`/admin/ciudades/${id}`, datos);
  return data.data ?? { id };
}

/** Activar/desactivar una ciudad. */
export async function cambiarActivaCiudad(id: string, activa: boolean): Promise<{ id: string; activa: boolean }> {
  const { data } = await api.patch<RespuestaAPI<{ id: string; activa: boolean }>>(`/admin/ciudades/${id}/activa`, { activa });
  return data.data ?? { id, activa };
}

/** Asignar/quitar región de una ciudad (null = quitar). */
export async function asignarRegionCiudad(id: string, regionId: string | null): Promise<{ id: string }> {
  const { data } = await api.patch<RespuestaAPI<{ id: string }>>(`/admin/ciudades/${id}/region`, { regionId });
  return data.data ?? { id };
}

/** Agrupar varias ciudades en una región (desde el mapa). */
export async function asignarRegionMultiple(
  ciudadIds: string[],
  regionId: string | null,
): Promise<{ asignadas: number; bloqueadas: Array<{ id: string; motivo: string }> }> {
  const { data } = await api.post<RespuestaAPI<{ asignadas: number; bloqueadas: Array<{ id: string; motivo: string }> }>>(
    '/admin/ciudades/asignar-region',
    { ciudadIds, regionId },
  );
  return data.data ?? { asignadas: 0, bloqueadas: [] };
}

/** Crear una región. */
export async function crearRegion(nombre: string): Promise<{ id: string }> {
  const { data } = await api.post<RespuestaAPI<{ id: string }>>('/admin/ciudades/regiones', { nombre });
  if (!data.data) throw new Error(data.message || 'Respuesta inválida del servidor');
  return data.data;
}

/** Editar una región (renombrar/activar/desactivar). */
export async function editarRegion(id: string, datos: { nombre?: string; activa?: boolean }): Promise<{ id: string }> {
  const { data } = await api.patch<RespuestaAPI<{ id: string }>>(`/admin/ciudades/regiones/${id}`, datos);
  return data.data ?? { id };
}
