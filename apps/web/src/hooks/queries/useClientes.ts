/**
 * useClientes.ts
 * ===============
 * Hooks de React Query para el módulo Clientes de Business Studio.
 *
 * PATRÓN:
 *   - useQuery         → KPIs y detalle de cliente
 *   - useInfiniteQuery → Lista con paginación offset-based
 *   - queryKeys        → keys centralizadas en config/queryKeys.ts
 *
 * Ubicación: apps/web/src/hooks/queries/useClientes.ts
 */

import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import * as clientesService from '../../services/clientesService';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';
import type { NivelCardYA } from '../../types/clientes';

const LIMIT = 20;

// =============================================================================
// TIPOS DE FILTROS
// =============================================================================

export interface FiltrosClientes {
  busqueda: string;
  nivelFiltro: NivelCardYA | null;
}

// =============================================================================
// KPIs
// =============================================================================

export function useClientesKPIs() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.clientes.kpis(sucursalId),
    queryFn: () => clientesService.getKPIsClientes().then((r) => r.data ?? null),
    enabled: habilitado,
  });
}

// =============================================================================
// LISTA DE CLIENTES (paginación infinita)
// =============================================================================

export function useClientesLista(filtros: FiltrosClientes) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useInfiniteQuery({
    queryKey: queryKeys.clientes.lista(
      sucursalId,
      filtros as unknown as Record<string, unknown>
    ),
    queryFn: ({ pageParam }) =>
      clientesService
        .getClientes(
          filtros.busqueda || undefined,
          filtros.nivelFiltro || undefined,
          LIMIT,
          pageParam as number
        )
        .then((r) => r.data ?? []),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < LIMIT) return undefined;
      return allPages.reduce((acc, p) => acc + p.length, 0);
    },
    enabled: habilitado,
    placeholderData: keepPreviousData,
  });
}

// =============================================================================
// DETALLE DE CLIENTE (modal)
// =============================================================================

export function useClienteDetalle(clienteId: string | null) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  return useQuery({
    queryKey: queryKeys.clientes.detalle(clienteId ?? '', sucursalId),
    queryFn: () =>
      clientesService.getDetalleCliente(clienteId!).then((r) => r.data ?? null),
    enabled: !!clienteId && !!sucursalId,
    // Sin keepPreviousData: mostrar al cliente anterior mientras carga el nuevo
    // sería confuso en un modal de detalle
  });
}

// =============================================================================
// HISTORIAL DE CLIENTE (modal — solo muestra 5, sin paginación en UI)
// =============================================================================

export function useClienteHistorial(clienteId: string | null) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  return useQuery({
    queryKey: queryKeys.clientes.historial(clienteId ?? '', sucursalId),
    queryFn: () =>
      clientesService.getHistorialCliente(clienteId!, 5, 0).then((r) => r.data ?? []),
    enabled: !!clienteId && !!sucursalId,
  });
}

// =============================================================================
// SELECTOR DE CLIENTES (para asignar cupones — carga todos, staleTime alto)
// =============================================================================

export function useClientesSelector(activo = true) {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial' && activo;

  return useQuery({
    queryKey: queryKeys.clientes.selector(sucursalId),
    queryFn: () =>
      clientesService.getClientes(undefined, undefined, 500).then((r) => r.data ?? []),
    enabled: habilitado,
    staleTime: 5 * 60 * 1000, // 5 min — lista de clientes cambia poco
  });
}
