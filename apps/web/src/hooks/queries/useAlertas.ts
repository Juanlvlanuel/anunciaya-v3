/**
 * useAlertas.ts
 * ==============
 * Hooks de React Query para el módulo Alertas de Business Studio.
 *
 * PATRÓN:
 *   - useInfiniteQuery → lista con paginación por páginas (Cargar más)
 *   - useQuery         → KPIs (staleTime 30s) y configuración
 *   - useMutation      → marcar leída/resuelta, eliminar, actualizar config
 *
 * Ubicación: apps/web/src/hooks/queries/useAlertas.ts
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as alertasService from '../../services/alertasService';
import type { AlertaCompleta, AlertaKPIs, ConfiguracionAlerta, CategoriaAlerta, SeveridadAlerta, TipoAlerta } from '../../types/alertas';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';

const POR_PAGINA = 20;

// =============================================================================
// TIPOS DE FILTROS (sin pagina/porPagina — los maneja useInfiniteQuery)
// =============================================================================

export interface FiltrosAlertasUI {
  tipo?: TipoAlerta;
  categoria?: CategoriaAlerta;
  severidad?: SeveridadAlerta;
  leida?: boolean;
  resuelta?: boolean;
  busqueda?: string;
}

// =============================================================================
// LISTA DE ALERTAS (paginación por páginas, Cargar más)
// =============================================================================

export function useAlertasLista(filtros: FiltrosAlertasUI) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useInfiniteQuery({
    queryKey: queryKeys.alertas.lista(
      sucursalId,
      filtros as unknown as Record<string, unknown>
    ),
    queryFn: ({ pageParam }) =>
      alertasService
        .obtenerAlertas({ ...filtros, pagina: pageParam as number, porPagina: POR_PAGINA })
        .then((r) => r.data ?? { alertas: [], total: 0, totalPaginas: 1, pagina: 1 }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagina < lastPage.totalPaginas ? lastPage.pagina + 1 : undefined,
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// KPIs (staleTime corto — datos de alta prioridad)
// =============================================================================

export function useAlertasKPIs() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.alertas.kpis(sucursalId),
    queryFn: () => alertasService.obtenerKPIs().then((r) => r.data ?? null),
    enabled: habilitado,
    staleTime: 30 * 1000,
  });
}

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

export function useAlertasConfiguracion() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.alertas.configuracion(sucursalId),
    queryFn: () => alertasService.obtenerConfiguracion().then((r) => r.data ?? []),
    enabled: habilitado,
  });
}

// =============================================================================
// MUTACIÓN: Marcar leída (update optimista en lista y KPIs)
// =============================================================================

export function useMarcarAlertaLeida() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => alertasService.marcarLeida(id),

    onMutate: async (id) => {
      const snapshotLista = queryClientInstance.getQueriesData<{
        pages: { alertas: AlertaCompleta[] }[];
      }>({ queryKey: ['alertas', 'lista', sucursalId] });
      const snapshotKPIs = queryClientInstance.getQueryData<AlertaKPIs>(
        queryKeys.alertas.kpis(sucursalId)
      );

      // Marcar leída en todas las páginas
      queryClientInstance.setQueriesData<{
        pages: { alertas: AlertaCompleta[]; [key: string]: unknown }[];
        pageParams: unknown[];
      }>(
        { queryKey: ['alertas', 'lista', sucursalId] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              alertas: page.alertas.map((a) =>
                a.id === id ? { ...a, leida: true, leidaAt: new Date().toISOString() } : a
              ),
            })),
          };
        }
      );

      // Decrementar noLeidas en KPIs
      queryClientInstance.setQueryData<AlertaKPIs>(
        queryKeys.alertas.kpis(sucursalId),
        (old) => old ? { ...old, noLeidas: Math.max(0, old.noLeidas - 1) } : old
      );

      return { snapshotLista, snapshotKPIs };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshotLista) {
        context.snapshotLista.forEach(([key, value]) => {
          queryClientInstance.setQueryData(key, value);
        });
      }
      if (context?.snapshotKPIs !== undefined) {
        queryClientInstance.setQueryData(queryKeys.alertas.kpis(sucursalId), context.snapshotKPIs);
      }
    },
  });
}

// =============================================================================
// MUTACIÓN: Marcar resuelta (update optimista + invalidar KPIs)
// =============================================================================

export function useMarcarAlertaResuelta() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => alertasService.marcarResuelta(id),

    onMutate: async (id) => {
      const snapshotLista = queryClientInstance.getQueriesData<{
        pages: { alertas: AlertaCompleta[] }[];
      }>({ queryKey: ['alertas', 'lista', sucursalId] });

      queryClientInstance.setQueriesData<{
        pages: { alertas: AlertaCompleta[]; [key: string]: unknown }[];
        pageParams: unknown[];
      }>(
        { queryKey: ['alertas', 'lista', sucursalId] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              alertas: page.alertas.map((a) =>
                a.id === id
                  ? { ...a, resuelta: true, resueltaAt: new Date().toISOString(), leida: true }
                  : a
              ),
            })),
          };
        }
      );

      return { snapshotLista };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshotLista) {
        context.snapshotLista.forEach(([key, value]) => {
          queryClientInstance.setQueryData(key, value);
        });
      }
    },

    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.alertas.kpis(sucursalId) });
    },
  });
}

// =============================================================================
// MUTACIÓN: Marcar todas leídas
// =============================================================================

export function useMarcarTodasLeidas() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: () => alertasService.marcarTodasLeidas(),

    onSuccess: () => {
      // Actualizar lista en caché
      queryClientInstance.setQueriesData<{
        pages: { alertas: AlertaCompleta[]; [key: string]: unknown }[];
        pageParams: unknown[];
      }>(
        { queryKey: ['alertas', 'lista', sucursalId] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              alertas: page.alertas.map((a) => ({
                ...a,
                leida: true,
                leidaAt: a.leidaAt ?? new Date().toISOString(),
              })),
            })),
          };
        }
      );
      queryClientInstance.setQueryData<AlertaKPIs>(
        queryKeys.alertas.kpis(sucursalId),
        (old) => old ? { ...old, noLeidas: 0 } : old
      );
    },
  });
}

// =============================================================================
// MUTACIÓN: Actualizar configuración de alerta
// =============================================================================

export function useActualizarConfiguracionAlerta() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: ({
      tipo,
      activo,
      umbrales,
    }: {
      tipo: string;
      activo: boolean;
      umbrales: Record<string, number>;
    }) => alertasService.actualizarConfiguracion(tipo, activo, umbrales),

    onMutate: async ({ tipo, activo, umbrales }) => {
      const snapshot = queryClientInstance.getQueryData<ConfiguracionAlerta[]>(
        queryKeys.alertas.configuracion(sucursalId)
      );

      queryClientInstance.setQueryData<ConfiguracionAlerta[]>(
        queryKeys.alertas.configuracion(sucursalId),
        (old) =>
          old
            ? old.map((c) =>
                c.tipoAlerta === tipo ? { ...c, activo, umbrales } : c
              )
            : old
      );

      return { snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshot !== undefined) {
        queryClientInstance.setQueryData(
          queryKeys.alertas.configuracion(sucursalId),
          context.snapshot
        );
      }
    },
  });
}

// =============================================================================
// MUTACIÓN: Eliminar alerta individual
// =============================================================================

export function useEliminarAlerta() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => alertasService.eliminarAlerta(id),

    onMutate: async (id) => {
      const snapshotLista = queryClientInstance.getQueriesData<{
        pages: { alertas: AlertaCompleta[] }[];
      }>({ queryKey: ['alertas', 'lista', sucursalId] });

      queryClientInstance.setQueriesData<{
        pages: { alertas: AlertaCompleta[]; [key: string]: unknown }[];
        pageParams: unknown[];
      }>(
        { queryKey: ['alertas', 'lista', sucursalId] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              alertas: page.alertas.filter((a) => a.id !== id),
            })),
          };
        }
      );

      return { snapshotLista };
    },

    onError: (_err, _vars, context) => {
      if (context?.snapshotLista) {
        context.snapshotLista.forEach(([key, value]) => {
          queryClientInstance.setQueryData(key, value);
        });
      }
    },

    onSuccess: () => {
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.alertas.kpis(sucursalId) });
    },
  });
}

// =============================================================================
// MUTACIÓN: Eliminar alertas resueltas
// =============================================================================

export function useEliminarResueltas() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: () => alertasService.eliminarAlertasResueltas(),

    onSuccess: () => {
      // Invalidar lista y KPIs para reflejar la eliminación
      queryClientInstance.invalidateQueries({ queryKey: queryKeys.alertas.all() });
    },
  });
}
