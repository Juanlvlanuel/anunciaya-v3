/**
 * useConfigPublica.ts
 * ===================
 * Hook de React Query para los valores públicos del negocio (trial, etc.) que la landing/registro
 * muestran. Cambia rara vez → staleTime largo. Devuelve SIEMPRE un objeto (el default mientras carga
 * o si falla), así los componentes nunca tienen que manejar `undefined`.
 *
 * Ubicación: apps/web/src/hooks/queries/useConfigPublica.ts
 */

import { useQuery } from '@tanstack/react-query';
import { obtenerConfigPublica, CONFIG_PUBLICA_DEFAULT, type ConfigPublica } from '../../services/configuracionPublicaService';

export function useConfigPublica(): ConfigPublica {
  const { data } = useQuery({
    queryKey: ['configuracion-publica'],
    queryFn: obtenerConfigPublica,
    staleTime: 1000 * 60 * 30, // 30 min: el trial cambia muy de vez en cuando
    gcTime: 1000 * 60 * 60,
  });
  return data ?? CONFIG_PUBLICA_DEFAULT;
}
