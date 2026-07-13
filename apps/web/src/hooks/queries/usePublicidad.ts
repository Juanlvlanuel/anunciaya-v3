/**
 * usePublicidad.ts
 * ================
 * Anuncios vigentes para la columna derecha, filtrados por la CIUDAD ACTIVA del usuario.
 * La ciudad activa vive en `useGpsStore` por nombre+estado (no UUID); el UUID se resuelve
 * del catálogo de ciudades (hidratado desde la BD por `useCiudades` en el RootLayout).
 *
 * Ubicación: apps/web/src/hooks/queries/usePublicidad.ts
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useGpsStore } from '../../stores/useGpsStore';
import { obtenerCatalogoCiudades } from '../../data/ciudadesPopulares';
import { queryKeys } from '../../config/queryKeys';
import { obtenerPublicidadPorCiudad } from '../../services/publicidadService';
import { escucharEvento } from '../../services/socketService';

/** UUID de la ciudad activa (del catálogo, por nombre + estado). undefined si no se resuelve. */
function resolverCiudadId(nombre: string, estado: string): string | undefined {
  if (!nombre) return undefined;
  const catalogo = obtenerCatalogoCiudades();
  const match = catalogo.find(
    (c) =>
      c.nombre.toLowerCase() === nombre.toLowerCase() &&
      (!estado || c.estado.toLowerCase() === estado.toLowerCase()),
  );
  return match?.id;
}

export function usePublicidad() {
  const ciudad = useGpsStore((s) => s.ciudad);
  const ciudadId = resolverCiudadId(ciudad?.nombre ?? '', ciudad?.estado ?? '');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.publicidad.porCiudad(ciudadId ?? ''),
    queryFn: () => obtenerPublicidadPorCiudad(ciudadId as string),
    enabled: !!ciudadId,
    staleTime: 1000 * 60 * 5,
  });

  // ── Realtime: el backend hace broadcast 'publicidad:cambio' cuando la publicidad de cualquier
  //    ciudad cambia (alta manual, self-service, renovación, pausar/reactivar/editar/cancelar,
  //    vencimiento, fundador). Invalidamos ['publicidad'] → refetch al instante, sin recargar.
  useEffect(() => {
    const dejarDeEscuchar = escucharEvento('publicidad:cambio', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.publicidad.all() });
    });
    return dejarDeEscuchar;
  }, [queryClient]);

  // ── Vencimiento al segundo: timer hasta el expira_at más próximo de lo mostrado. Al dispararse,
  //    invalidamos y el refetch (backend filtra expira_at > now) quita la pieza justo al vencer.
  //    Clamp a 6h: evita el overflow de setTimeout (>~24.8 días → dispararía de inmediato) y
  //    re-evalúa cada tanto; cuando el vencimiento está cerca, el timer es exacto. +1s de margen
  //    para garantizar que al refetchear la pieza ya quedó fuera de vigencia.
  const proximaExpiracion = query.data?.proximaExpiracion ?? null;
  useEffect(() => {
    if (!proximaExpiracion) return;
    const MAX = 6 * 60 * 60 * 1000;
    const restante = new Date(proximaExpiracion).getTime() - Date.now();
    const delay = Math.min(Math.max(restante, 0), MAX) + 1000;
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.publicidad.all() });
    }, delay);
    return () => clearTimeout(timer);
  }, [proximaExpiracion, queryClient]);

  return query;
}
