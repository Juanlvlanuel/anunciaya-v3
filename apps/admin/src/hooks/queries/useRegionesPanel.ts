/**
 * useRegionesPanel.ts
 * ====================
 * Regiones configuradas para el selector de ámbito del Panel (solo superadmin).
 * Cambian poco → staleTime alto.
 *
 * Ubicación: apps/admin/src/hooks/queries/useRegionesPanel.ts
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import { listarRegionesPanel } from '../../services/regionesService';

/** Lista de regiones para el filtro global. `habilitado` = solo el superadmin la pide. */
export function useRegionesPanel(habilitado: boolean) {
  return useQuery({
    queryKey: queryKeys.regiones.all(),
    queryFn: listarRegionesPanel,
    enabled: habilitado,
    staleTime: 1000 * 60 * 10,
  });
}
