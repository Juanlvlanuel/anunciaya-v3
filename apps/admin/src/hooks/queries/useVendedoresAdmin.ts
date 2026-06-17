/**
 * useVendedoresAdmin.ts
 * =====================
 * Hooks de React Query para la sección "Vendedores y comisiones" del Panel — pieza A: la CARTERA
 * (Fase 1 · VER, solo lectura). Patrón calcado de useEquipoAdmin: useQuery + keepPreviousData para
 * no parpadear al filtrar/paginar; ficha con placeholder + prefetch en hover.
 *
 * Ubicación: apps/admin/src/hooks/queries/useVendedoresAdmin.ts
 */

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../config/queryKeys';
import * as vendedoresService from '../../services/vendedoresService';
import type { ParametrosVendedores, ParametrosCartera, VendedorDetalle } from '../../services/vendedoresService';

/** Tabla paginada de la red de ventas (con filtros). */
export function useVendedoresLista(filtros: ParametrosVendedores) {
  return useQuery({
    queryKey: queryKeys.vendedores.lista(filtros),
    queryFn: () => vendedoresService.listarVendedores(filtros),
    placeholderData: keepPreviousData,
  });
}

/** Total de vendedores del alcance (badge del menú). Carga al abrir el Panel. */
export function useConteoVendedores() {
  return useQuery({
    queryKey: queryKeys.vendedores.conteo(),
    queryFn: () => vendedoresService.contarVendedores(),
    staleTime: 1000 * 60,
  });
}

/**
 * Ficha de un vendedor. Acepta un `placeholder` (lo que ya trae la fila de la lista) para que la
 * ficha se vea AL INSTANTE y rellene el resto cuando llega la respuesta.
 */
export function useVendedor(id: string | null, placeholder?: VendedorDetalle) {
  return useQuery({
    queryKey: queryKeys.vendedores.detalle(id ?? ''),
    queryFn: () => vendedoresService.obtenerVendedor(id as string),
    enabled: !!id,
    placeholderData: placeholder,
  });
}

/** Prefetch de la ficha de un vendedor (al pasar el mouse o tocar la fila). */
export function usePrefetchVendedor() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: queryKeys.vendedores.detalle(id),
        queryFn: () => vendedoresService.obtenerVendedor(id),
        staleTime: 1000 * 60 * 2,
      });
    },
    [qc],
  );
}

/** Cartera de un vendedor (sus negocios atribuidos, con estado de membresía). */
export function useCartera(id: string | null, filtros: ParametrosCartera) {
  return useQuery({
    queryKey: queryKeys.vendedores.cartera(id ?? '', filtros),
    queryFn: () => vendedoresService.listarCartera(id as string, filtros),
    enabled: !!id,
    placeholderData: keepPreviousData,
  });
}
