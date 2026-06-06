/**
 * useNegociosAdmin.ts
 * ====================
 * Hooks de React Query para la sección Negocios del Panel (Entrega 1 — lectura).
 * Patrón calcado de apps/web (useQuery + keepPreviousData para no parpadear al
 * filtrar/paginar). Solo lecturas; las mutaciones llegan en la Entrega 2.
 *
 * Ubicación: apps/admin/src/hooks/queries/useNegociosAdmin.ts
 */

import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../config/queryKeys';
import * as negociosService from '../../services/negociosService';
import type { ParametrosLista, NegocioDetalle } from '../../services/negociosService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/** Tabla paginada de negocios (con filtros). */
export function useNegociosLista(filtros: ParametrosLista) {
  return useQuery({
    queryKey: queryKeys.negocios.lista(filtros),
    queryFn: () => negociosService.listarNegocios(filtros),
    placeholderData: keepPreviousData,
  });
}

/**
 * Ficha administrativa de un negocio. Acepta un `placeholder` (datos parciales
 * que ya trae la fila de la lista) para que el modal se vea AL INSTANTE y rellene
 * el resto cuando llega la respuesta — sin pantalla de "Cargando…".
 */
export function useNegocioDetalle(id: string | null, placeholder?: NegocioDetalle) {
  return useQuery({
    queryKey: queryKeys.negocios.detalle(id ?? ''),
    queryFn: () => negociosService.obtenerDetalleNegocio(id as string),
    enabled: !!id,
    placeholderData: placeholder,
  });
}

/**
 * Devuelve una función para PREFETCHEAR la ficha de un negocio (al pasar el mouse
 * o tocar la fila), de modo que al abrir el modal los datos ya estén en caché.
 */
export function usePrefetchNegocio() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: queryKeys.negocios.detalle(id),
        queryFn: () => negociosService.obtenerDetalleNegocio(id),
        staleTime: 1000 * 60 * 2,
      });
    },
    [qc],
  );
}

/**
 * Vendedores para el filtro "por vendedor". Solo superadmin/gerente lo usan; el
 * vendedor ve únicamente su cartera, así que se deshabilita para ese rol.
 */
export function useVendedoresFiltro(habilitado: boolean) {
  return useQuery({
    queryKey: queryKeys.negocios.vendedores(),
    queryFn: () => negociosService.listarVendedoresFiltro(),
    enabled: habilitado,
    staleTime: 1000 * 60 * 10, // cambia poco
  });
}

/** Ciudades para el filtro "por ciudad" (dentro del alcance del rol). */
export function useCiudadesFiltro() {
  return useQuery({
    queryKey: queryKeys.negocios.ciudades(),
    queryFn: () => negociosService.listarCiudades(),
    staleTime: 1000 * 60 * 10, // cambia poco
  });
}

// =============================================================================
// MUTACIONES (Entrega 2 · Parada 1) — refrescan tabla + ficha e informan por toast
// =============================================================================

/** Invalida la lista (todas las variantes) y la ficha del negocio afectado. */
function useRefrescarNegocio() {
  const qc = useQueryClient();
  return (id: string) => {
    qc.invalidateQueries({ queryKey: queryKeys.negocios.all() });
    qc.invalidateQueries({ queryKey: queryKeys.negocios.detalle(id) });
  };
}

export function useSuspenderNegocio() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      negociosService.suspenderNegocio(id, motivo),
    onSuccess: (_d, { id }) => {
      refrescar(id);
      toast.exito('Negocio suspendido');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo suspender el negocio')),
  });
}

export function useReactivarNegocio() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      negociosService.reactivarNegocio(id, motivo),
    onSuccess: (_d, { id }) => {
      refrescar(id);
      toast.exito('Negocio reactivado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reactivar el negocio')),
  });
}

export function useReasignarVendedor() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ id, embajadorId, motivo }: { id: string; embajadorId: string | null; motivo?: string }) =>
      negociosService.reasignarVendedor(id, embajadorId, motivo),
    onSuccess: (_d, { id, embajadorId }) => {
      refrescar(id);
      toast.exito(embajadorId ? 'Vendedor reasignado' : 'Vendedor quitado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reasignar el vendedor')),
  });
}
