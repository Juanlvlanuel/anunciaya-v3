/**
 * ciudadesService.ts
 * ==================
 * Lee el catálogo PÚBLICO de ciudades activas (GET /api/ciudades, sin auth) para el
 * selector de ubicación. Reemplaza el array hardcodeado `ciudadesPopulares` como
 * fuente de verdad: lo que el SuperAdmin habilita en el Panel aparece en la app.
 *
 * Devuelve la misma forma `Ciudad` que el resto del front ya consume (+ id/slug),
 * para que las funciones de búsqueda y el selector no cambien.
 *
 * Ubicación: apps/web/src/services/ciudadesService.ts
 */

import { get } from './api';
import type { Ciudad } from '../data/ciudadesPopulares';

interface CiudadApi {
  id: string;
  nombre: string;
  estado: string;
  slug: string;
  coordenadas: { lat: number | null; lng: number | null };
  alias: string[];
  importancia: number;
}

export async function obtenerCiudadesPublicas(): Promise<Ciudad[]> {
  const res = await get<CiudadApi[]>('/ciudades');
  const filas = res.data ?? [];
  // El selector geo necesita coordenadas; descartamos las que (raro) no las tengan.
  return filas
    .filter((c) => c.coordenadas?.lat != null && c.coordenadas?.lng != null)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      nombre: c.nombre,
      estado: c.estado,
      coordenadas: { lat: c.coordenadas.lat as number, lng: c.coordenadas.lng as number },
      alias: c.alias ?? [],
      importancia: c.importancia,
    }));
}
