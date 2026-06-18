/**
 * usePrecioMembresia.ts
 * =====================
 * Devuelve el precio mensual de la membresía comercial (MXN), leído de la config pública del sistema
 * (lo ajusta el SuperAdmin). Devuelve SIEMPRE un número (el default mientras carga o si falla), así
 * los diálogos de pago lo usan como monto sugerido sin manejar `undefined`.
 *
 * Ubicación: apps/admin/src/hooks/queries/usePrecioMembresia.ts
 */

import { useQuery } from '@tanstack/react-query';
import { obtenerConfigPublica, CONFIG_PUBLICA_DEFAULT, type ConfigPublica } from '../../services/configuracionPublicaService';

/** Config pública del sistema (precio mensual + anual + trial). Devuelve SIEMPRE un objeto (default si carga/falla). */
export function useConfigPublica(): ConfigPublica {
  const { data } = useQuery({
    queryKey: ['configuracion-publica'],
    queryFn: obtenerConfigPublica,
    staleTime: 1000 * 60 * 30, // 30 min: el precio cambia muy de vez en cuando
    gcTime: 1000 * 60 * 60,
  });
  return data ?? CONFIG_PUBLICA_DEFAULT;
}

/** Precio mensual de la membresía (MXN) — atajo para los diálogos de pago. */
export function usePrecioMembresia(): number {
  return useConfigPublica().precioMembresia;
}
