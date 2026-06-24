/**
 * useTerritoriosAdmin.ts
 * ======================
 * Hooks de React Query para el módulo "Territorios" del Panel (mapa de zonas).
 *   - useZonas(filtros) → zonas visibles para el rol. keepPreviousData.
 *
 * Los 3 roles entran; el backend acota por rol. Las mutaciones (crear/editar/asignar/
 * borrar zona) se agregan en la Fase 2.
 *
 * Ubicación: apps/admin/src/hooks/queries/useTerritoriosAdmin.ts
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import * as territoriosService from '../../services/territoriosService';
import type { FiltrosZonas } from '../../services/territoriosService';

/** Zonas del territorio (con filtro de ciudad opcional). */
export function useZonas(filtros: FiltrosZonas = {}) {
  return useQuery({
    queryKey: queryKeys.territorios.zonas(filtros.ciudadId),
    queryFn: () => territoriosService.listarZonas(filtros),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60,
  });
}
