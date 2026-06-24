/**
 * territoriosService.ts
 * =====================
 * Llamadas a la API del Panel para el módulo "Territorios" (mapa de la red de ventas).
 * Reusa el axios del Panel (`api`). Los 3 roles entran; el backend acota por rol.
 *
 * Endpoints (Fase 1 · VER):
 *   GET /admin/territorios/zonas   → zonas visibles para el rol (filtro ?ciudadId opcional)
 *
 * Ubicación: apps/admin/src/services/territoriosService.ts
 */

import { api, type RespuestaAPI } from './api';

export interface PoligonoGeoJSON {
  type: 'Polygon';
  coordinates: number[][][];
}

/** Una zona del territorio (partición de una ciudad asignada a un vendedor). */
export interface ZonaTerritorio {
  id: string;
  ciudadId: string;
  ciudadNombre: string | null;
  embajadorId: string | null;    // null = sin asignar
  vendedorNombre: string | null; // nombre del vendedor asignado (si hay)
  nombre: string;
  poligono: PoligonoGeoJSON;
  color: string | null;
  createdAt: string | null;
}

export interface FiltrosZonas {
  ciudadId?: string;
}

/** Zonas visibles para el rol (con filtro de ciudad opcional). */
export async function listarZonas(filtros: FiltrosZonas = {}): Promise<ZonaTerritorio[]> {
  const { data } = await api.get<RespuestaAPI<ZonaTerritorio[]>>('/admin/territorios/zonas', {
    params: { ciudadId: filtros.ciudadId || undefined },
  });
  return data.data ?? [];
}
