/**
 * useCiudades.ts
 * ==============
 * Hook que HIDRATA el catálogo de ciudades del front desde la BD (GET /api/ciudades).
 * Se monta UNA vez en RootLayout: al recibir las ciudades activas, reemplaza el
 * catálogo activo de `data/ciudadesPopulares` (que usan las funciones de búsqueda,
 * el selector de ubicación y `useGpsStore`). Si la API falla, queda la semilla
 * hardcodeada (fallback) — la app nunca se queda sin selector de ciudad.
 *
 * Cambia rara vez → staleTime largo (igual que useConfigPublica).
 *
 * Ubicación: apps/web/src/hooks/queries/useCiudades.ts
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerCiudadesPublicas } from '../../services/ciudadesService';
import { setCatalogoCiudades } from '../../data/ciudadesPopulares';

export function useCiudades() {
  const query = useQuery({
    queryKey: ['ciudades-publicas'],
    queryFn: obtenerCiudadesPublicas,
    staleTime: 1000 * 60 * 30, // 30 min: el catálogo cambia poco
    gcTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (query.data && query.data.length) setCatalogoCiudades(query.data);
  }, [query.data]);

  return query;
}
