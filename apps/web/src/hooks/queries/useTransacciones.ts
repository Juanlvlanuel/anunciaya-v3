/**
 * useTransacciones.ts
 * ====================
 * Hooks de React Query para el módulo Transacciones de Business Studio.
 *
 * PATRÓN:
 *   - useQuery         → KPIs y operadores (datos simples con caché)
 *   - useInfiniteQuery → Historial con paginación offset-based
 *   - useMutation      → Revocar transacción con update optimista + rollback
 *
 * Ubicación: apps/web/src/hooks/queries/useTransacciones.ts
 */

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import * as transaccionesService from '../../services/transaccionesService';
import type { PeriodoEstadisticas, TransaccionPuntos } from '../../types/puntos';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';

const LIMIT = 20;

// =============================================================================
// TIPOS DE FILTROS
// =============================================================================

export interface FiltrosVentas {
  tipo: 'ventas';
  periodo: PeriodoEstadisticas;
  busqueda: string;
  operadorId: string;
  estadoFiltro: string;
}

export interface FiltrosCupones {
  tipo: 'cupones';
  periodo: PeriodoEstadisticas;
  busqueda: string;
  operadorIdCupones: string;
  estadoFiltro: string;
}

export interface FiltrosCanjes {
  periodo: PeriodoEstadisticas;
  estadoFiltroCanjes: string;
  busquedaCanjes: string;
  operadorIdCanjes: string;
}

// =============================================================================
// KPIs — VENTAS
// =============================================================================

export function useTransaccionesKPIs(periodo: PeriodoEstadisticas) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.transacciones.kpis(sucursalId, periodo),
    queryFn: () =>
      transaccionesService.getKPIsTransacciones(periodo).then((r) => r.data ?? null),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// KPIs — CUPONES
// =============================================================================

export function useTransaccionesCuponesKPIs(periodo: PeriodoEstadisticas) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.transacciones.kpisCupones(sucursalId, periodo),
    queryFn: () =>
      transaccionesService.getKPIsCupones(periodo).then((r) => r.data ?? null),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// KPIs — CANJES
// =============================================================================

export function useTransaccionesCanjesKPIs(periodo: PeriodoEstadisticas) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.transacciones.kpisCanjes(sucursalId, periodo),
    queryFn: () =>
      transaccionesService.getKPIsCanjes(periodo).then((r) => r.data ?? null),
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// OPERADORES (para dropdown de filtro)
// =============================================================================

export function useTransaccionesOperadores() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.transacciones.operadores(sucursalId),
    queryFn: () =>
      transaccionesService.getOperadores().then((r) => r.data ?? []),
    enabled: habilitado,
    staleTime: 5 * 60 * 1000, // los operadores cambian poco
  });
}

// =============================================================================
// HISTORIAL — VENTAS (paginación infinita)
// =============================================================================

export function useTransaccionesHistorial(filtros: FiltrosVentas) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useInfiniteQuery({
    queryKey: queryKeys.transacciones.historial(
      sucursalId,
      filtros as unknown as Record<string, unknown>
    ),
    queryFn: ({ pageParam }) =>
      transaccionesService
        .getHistorial(
          filtros.periodo,
          LIMIT,
          pageParam as number,
          filtros.busqueda || undefined,
          filtros.operadorId || undefined,
          filtros.estadoFiltro || undefined,
          'sin_cupon'
        )
        .then((r) => r.data ?? { historial: [], total: 0 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.historial.length < LIMIT) return undefined;
      return allPages.reduce((acc, p) => acc + p.historial.length, 0);
    },
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// HISTORIAL — CUPONES (paginación infinita)
// =============================================================================

export function useTransaccionesCuponesHistorial(filtros: FiltrosCupones) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useInfiniteQuery({
    queryKey: queryKeys.transacciones.historial(
      sucursalId,
      filtros as unknown as Record<string, unknown>
    ),
    queryFn: ({ pageParam }) =>
      transaccionesService
        .getHistorial(
          filtros.periodo,
          LIMIT,
          pageParam as number,
          filtros.busqueda || undefined,
          filtros.operadorIdCupones || undefined,
          filtros.estadoFiltro || undefined,
          'con_cupon'
        )
        .then((r) => r.data ?? { historial: [], total: 0 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.historial.length < LIMIT) return undefined;
      return allPages.reduce((acc, p) => acc + p.historial.length, 0);
    },
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// HISTORIAL — CANJES (paginación infinita)
// =============================================================================

export function useTransaccionesCanjesHistorial(filtros: FiltrosCanjes) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useInfiniteQuery({
    queryKey: queryKeys.transacciones.canjes(
      sucursalId,
      filtros as unknown as Record<string, unknown>
    ),
    queryFn: ({ pageParam }) =>
      transaccionesService
        .getHistorialCanjes(
          filtros.periodo,
          LIMIT,
          pageParam as number,
          filtros.estadoFiltroCanjes || undefined,
          filtros.busquedaCanjes || undefined,
          filtros.operadorIdCanjes || undefined
        )
        .then((r) => r.data ?? { canjes: [], total: 0 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.canjes.length < LIMIT) return undefined;
      return allPages.reduce((acc, p) => acc + p.canjes.length, 0);
    },
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// MUTACIÓN: Revocar transacción (update optimista + rollback automático)
// =============================================================================

export function useRevocarTransaccion() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      transaccionesService.revocarTransaccion(id, motivo),

    onMutate: async ({ id }) => {
      // Cancelar fetches en curso para evitar sobreescritura del update optimista
      await queryClientInstance.cancelQueries({
        queryKey: ['transacciones', 'historial', sucursalId],
      });

      // Guardar snapshot para rollback
      const snapshot = queryClientInstance.getQueriesData<{
        pages: { historial: TransaccionPuntos[]; total: number }[];
        pageParams: number[];
      }>({ queryKey: ['transacciones', 'historial', sucursalId] });

      // Marcar como cancelado en todas las páginas del historial en caché
      queryClientInstance.setQueriesData<{
        pages: { historial: TransaccionPuntos[]; total: number }[];
        pageParams: number[];
      }>(
        { queryKey: ['transacciones', 'historial', sucursalId] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              historial: page.historial.map((t) =>
                t.id === id ? { ...t, estado: 'cancelado' as const } : t
              ),
            })),
          };
        }
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      // Rollback al snapshot anterior
      if (context?.snapshot) {
        context.snapshot.forEach(([key, value]) => {
          queryClientInstance.setQueryData(key, value);
        });
      }
    },

    onSuccess: () => {
      // Invalidar KPIs de ventas para reflejar la revocación
      queryClientInstance.invalidateQueries({
        queryKey: ['transacciones', 'kpis', sucursalId],
      });
      // Invalidar Dashboard — los KPIs y gráfica de ventas cambian con una revocación
      queryClientInstance.invalidateQueries({
        queryKey: queryKeys.dashboard.all(),
      });
    },
  });
}

// =============================================================================
// REFRESH MANUAL
// =============================================================================

export function useTransaccionesRefresh() {
  const queryClientInstance = useQueryClient();
  return {
    refetchTodo: () =>
      queryClientInstance.invalidateQueries({
        queryKey: queryKeys.transacciones.all(),
      }),
  };
}
