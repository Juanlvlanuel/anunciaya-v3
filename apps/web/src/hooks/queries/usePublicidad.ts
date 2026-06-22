/**
 * usePublicidad.ts
 * ================
 * Anuncios vigentes para la columna derecha, filtrados por la CIUDAD ACTIVA del usuario.
 * La ciudad activa vive en `useGpsStore` por nombre+estado (no UUID); el UUID se resuelve
 * del catálogo de ciudades (hidratado desde la BD por `useCiudades` en el RootLayout).
 *
 * Ubicación: apps/web/src/hooks/queries/usePublicidad.ts
 */

import { useQuery } from '@tanstack/react-query';
import { useGpsStore } from '../../stores/useGpsStore';
import { obtenerCatalogoCiudades } from '../../data/ciudadesPopulares';
import { queryKeys } from '../../config/queryKeys';
import { obtenerPublicidadPorCiudad } from '../../services/publicidadService';

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

  return useQuery({
    queryKey: queryKeys.publicidad.porCiudad(ciudadId ?? ''),
    queryFn: () => obtenerPublicidadPorCiudad(ciudadId as string),
    enabled: !!ciudadId,
    staleTime: 1000 * 60 * 5,
  });
}
