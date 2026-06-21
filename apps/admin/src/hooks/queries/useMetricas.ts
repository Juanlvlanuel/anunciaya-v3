/**
 * useMetricas.ts
 * ==============
 * Hooks de React Query del módulo "Métricas" (solo lectura). Una llamada por pestaña; el front carga
 * solo la activa. El periodo (preset por meses o rango por fechas) viaja en la queryKey vía
 * `clavePeriodo`. `placeholderData: keepPreviousData` evita el temblor al cambiar el periodo (regla del
 * proyecto). Se invalidan al cambiar la lente de región (ver useFiltroRegion).
 *
 * Ubicación: apps/admin/src/hooks/queries/useMetricas.ts
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import {
  obtenerCrecimiento, obtenerAdopcion, obtenerUsuariosMetricas, clavePeriodo, type PeriodoSel,
} from '../../services/metricasService';

const STALE = 1000 * 60; // 1 min

export function useMetricasCrecimiento(periodo: PeriodoSel) {
  return useQuery({
    queryKey: queryKeys.metricas.crecimiento(clavePeriodo(periodo)),
    queryFn: () => obtenerCrecimiento(periodo),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

export function useMetricasAdopcion(periodo: PeriodoSel) {
  return useQuery({
    queryKey: queryKeys.metricas.adopcion(clavePeriodo(periodo)),
    queryFn: () => obtenerAdopcion(periodo),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}

export function useMetricasUsuarios(periodo: PeriodoSel) {
  return useQuery({
    queryKey: queryKeys.metricas.usuarios(clavePeriodo(periodo)),
    queryFn: () => obtenerUsuariosMetricas(periodo),
    staleTime: STALE,
    placeholderData: keepPreviousData,
  });
}
