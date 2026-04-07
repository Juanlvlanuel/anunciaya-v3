/**
 * useDashboard.ts
 * ================
 * Hooks de React Query para el Dashboard de Business Studio.
 * Reemplaza el fetching que antes vivía en useDashboardStore.
 *
 * PATRÓN:
 *   - useQuery  → lectura de datos (con caché automático)
 *   - useMutation → escritura (con invalidación de caché)
 *   - queryKeys → keys centralizadas en config/queryKeys.ts
 *
 * Ubicación: apps/web/src/hooks/queries/useDashboard.ts
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as dashboardService from '../../services/dashboardService';
import type { Periodo } from '../../services/dashboardService';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';

// =============================================================================
// HOOK PRINCIPAL — agrupa todas las queries del Dashboard
// =============================================================================

export function useDashboard(periodo: Periodo) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  const kpisQuery = useQuery({
    queryKey: queryKeys.dashboard.kpis(sucursalId, periodo),
    queryFn: () => dashboardService.obtenerKPIs(periodo).then((r) => r.data ?? null),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });

  const ventasQuery = useQuery({
    queryKey: queryKeys.dashboard.ventas(sucursalId, periodo),
    queryFn: () => dashboardService.obtenerVentas(periodo).then((r) => r.data ?? null),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });

  const campanasQuery = useQuery({
    queryKey: queryKeys.dashboard.campanas(sucursalId),
    queryFn: () => dashboardService.obtenerCampanas(5).then((r) => r.data ?? []),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });

  const interaccionesQuery = useQuery({
    queryKey: queryKeys.dashboard.interacciones(sucursalId, periodo),
    queryFn: () =>
      dashboardService.obtenerInteracciones(10, periodo).then((r) => r.data ?? []),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });

  const alertasQuery = useQuery({
    queryKey: queryKeys.dashboard.alertas(sucursalId),
    queryFn: () => dashboardService.obtenerAlertas(5).then((r) => r.data ?? null),
    enabled: habilitado,
    // Alertas se consideran stale más rápido — son datos de alta prioridad
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  return {
    // Datos
    kpis: kpisQuery.data ?? null,
    ventas: ventasQuery.data ?? null,
    campanas: campanasQuery.data ?? [],
    interacciones: interaccionesQuery.data ?? [],
    alertas: alertasQuery.data ?? null,
    // Estado de carga — isPending = true solo en la carga inicial (sin datos previos)
    cargandoKpis: kpisQuery.isPending,
  };
}

// =============================================================================
// HOOK DE REFRESH MANUAL
// =============================================================================

export function useDashboardRefresh() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const queryClientInstance = useQueryClient();

  const refetchTodo = async () => {
    await queryClientInstance.invalidateQueries({
      queryKey: queryKeys.dashboard.all(),
    });
  };

  return { refetchTodo };
}

// =============================================================================
// MUTACIONES
// =============================================================================

export function useDashboardMutaciones() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const queryClientInstance = useQueryClient();

  const marcarAlertaLeida = useMutation({
    mutationFn: (alertaId: string) => dashboardService.marcarAlertaLeida(alertaId),
    onSuccess: () => {
      queryClientInstance.invalidateQueries({
        queryKey: queryKeys.dashboard.alertas(sucursalId),
      });
    },
  });

  const marcarTodasLeidas = useMutation({
    mutationFn: (alertaIds: string[]) =>
      Promise.all(alertaIds.map((id) => dashboardService.marcarAlertaLeida(id))),
    onSuccess: () => {
      queryClientInstance.invalidateQueries({
        queryKey: queryKeys.dashboard.alertas(sucursalId),
      });
    },
  });

  return { marcarAlertaLeida, marcarTodasLeidas };
}
