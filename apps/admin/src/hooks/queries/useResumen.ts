/**
 * useResumen.ts
 * =============
 * Hook de React Query del módulo "Resumen / inicio" (solo lectura). Una sola llamada agregada
 * (KPIs + pendientes). Lo consumen la SeccionResumen y la BandejaPendientes (campana), que así
 * comparten la misma caché. Se invalida al cambiar la lente de región (ver useFiltroRegion).
 *
 * Ubicación: apps/admin/src/hooks/queries/useResumen.ts
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import { obtenerResumen } from '../../services/resumenService';

export function useResumen() {
  return useQuery({
    queryKey: queryKeys.resumen.all(),
    queryFn: obtenerResumen,
    staleTime: 1000 * 60, // 1 min — el tablero de inicio se mantiene fresco sin refetch agresivo.
    // Sin Socket.io en el Panel: polling ligero para que el contador de la campana (incluye los
    // "pagos por verificar") se actualice sin refrescar. Solo con la pestaña visible. La campana
    // vive app-wide, por eso un intervalo más laxo que la cola de "Por verificar".
    refetchInterval: () => (document.visibilityState === 'visible' ? 1000 * 45 : false),
    refetchOnWindowFocus: true,
  });
}
