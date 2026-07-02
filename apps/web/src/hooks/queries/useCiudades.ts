/**
 * useCiudades.ts
 * ==============
 * Hook que HIDRATA el catálogo de ciudades del front desde la BD (GET /api/ciudades).
 * Se monta UNA vez en RootLayout: al recibir las ciudades activas, reemplaza el
 * catálogo activo de `data/ciudadesPopulares` (que usan las funciones de búsqueda,
 * el selector de ubicación y `useGpsStore`). Si la API falla, queda la semilla
 * hardcodeada (fallback) — la app nunca se queda sin selector de ciudad.
 *
 * Además RE-SINCRONIZA la ciudad seleccionada (persistida en useGpsStore por nombre)
 * con el catálogo recién hidratado: si su nombre ya no existe (p. ej. se renombró en el
 * Panel de Ciudades) pero conservamos sus coordenadas, la reasigna al nombre actual de
 * la ciudad más cercana. Así un rename no deja al usuario mandando un nombre obsoleto al
 * backend (resolverCiudadId → null → feed vacío en silencio).
 *
 * Cambia rara vez → staleTime largo (igual que useConfigPublica).
 *
 * Ubicación: apps/web/src/hooks/queries/useCiudades.ts
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { obtenerCiudadesPublicas } from '../../services/ciudadesService';
import {
  setCatalogoCiudades,
  obtenerCatalogoCiudades,
  buscarCiudadCercana,
} from '../../data/ciudadesPopulares';
import { useGpsStore } from '../../stores/useGpsStore';

/**
 * Re-ancla la ciudad seleccionada al catálogo recién hidratado. Solo actúa si el nombre
 * guardado ya NO existe en el catálogo (un rename en el Panel) y tenemos coordenadas para
 * re-anclar; en cualquier otro caso no toca nada (caso normal: el nombre sigue vigente).
 */
function resincronizarCiudadSeleccionada(): void {
  const { ciudad, setCiudad } = useGpsStore.getState();
  if (!ciudad?.coordenadas) return; // sin selección o sin coords → nada que re-anclar

  const norm = (s: string) => s.trim().toLowerCase();
  const sigueVigente = obtenerCatalogoCiudades().some(
    (c) => norm(c.nombre) === norm(ciudad.nombre) && norm(c.estado) === norm(ciudad.estado),
  );
  if (sigueVigente) return; // el nombre sigue en el catálogo → todo bien

  // Nombre obsoleto (la ciudad se renombró): re-anclar por las coordenadas guardadas a la
  // ciudad del catálogo más cercana, y reescribir el nombre/estado actuales.
  const cercana = buscarCiudadCercana(ciudad.coordenadas.lat, ciudad.coordenadas.lng);
  if (cercana && norm(cercana.nombre) !== norm(ciudad.nombre)) {
    setCiudad(cercana.nombre, cercana.estado, cercana.coordenadas);
  }
}

/**
 * Modo "ciudad única": si el catálogo activo trae EXACTAMENTE una ciudad, se fija
 * SIEMPRE esa ciudad en el store — sin importar el GPS ni lo que hubiera guardado
 * antes. Resuelve el arranque de la beta (Puerto Peñasco): el usuario que rechaza
 * los permisos de ubicación igual queda anclado a la única ciudad, y el selector
 * del Navbar se bloquea (ver `useEsCiudadUnica`). Devuelve `true` si aplicó, para
 * que el caller omita la resincronización por coordenadas (no hay a dónde re-anclar).
 */
function forzarCiudadUnicaSiAplica(
  ciudades: { nombre: string; estado: string; coordenadas: { lat: number; lng: number } }[],
): boolean {
  if (ciudades.length !== 1) return false;
  const unica = ciudades[0];
  const { ciudad, setCiudad } = useGpsStore.getState();
  const norm = (s: string) => s.trim().toLowerCase();
  const yaFijada =
    !!ciudad &&
    norm(ciudad.nombre) === norm(unica.nombre) &&
    norm(ciudad.estado) === norm(unica.estado);
  if (!yaFijada) {
    setCiudad(unica.nombre, unica.estado, unica.coordenadas);
  }
  return true;
}

export function useCiudades() {
  const query = useQuery({
    queryKey: ['ciudades-publicas'],
    queryFn: obtenerCiudadesPublicas,
    staleTime: 1000 * 60 * 30, // 30 min: el catálogo cambia poco
    gcTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    if (query.data && query.data.length) {
      setCatalogoCiudades(query.data);
      // Si solo hay 1 ciudad activa, se fija siempre y se omite la
      // resincronización por coordenadas (no hay otra ciudad a la cual re-anclar).
      if (!forzarCiudadUnicaSiAplica(query.data)) {
        resincronizarCiudadSeleccionada();
      }
    }
  }, [query.data]);

  return query;
}

/**
 * `true` cuando el catálogo activo tiene una sola ciudad. Lee del MISMO cache de
 * React Query que `useCiudades` (misma queryKey) → no dispara un fetch extra. El
 * Navbar lo usa para bloquear el selector de ubicación y omitir la petición de GPS.
 */
export function useEsCiudadUnica(): boolean {
  const { data } = useQuery({
    queryKey: ['ciudades-publicas'],
    queryFn: obtenerCiudadesPublicas,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });
  return (data?.length ?? 0) === 1;
}
