/**
 * regionesService.ts
 * ===================
 * Regiones configuradas para el filtro global del Panel (GET /api/admin/regiones).
 * Solo el superadmin lo usa (selector de ámbito en el header).
 *
 * Ubicación: apps/admin/src/services/regionesService.ts
 */

import api, { RespuestaAPI } from './api';

export interface RegionPanel {
  id: string;
  nombre: string;
}

/** Lista de regiones para el selector de ámbito. */
export async function listarRegionesPanel(): Promise<RegionPanel[]> {
  const { data } = await api.get<RespuestaAPI<RegionPanel[]>>('/admin/regiones');
  return data.data ?? [];
}
