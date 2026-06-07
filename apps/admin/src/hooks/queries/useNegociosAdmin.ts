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

/**
 * Avisa el resultado de una acción que toca Stripe (§4.3): éxito normal si Stripe se
 * completó, o ADVERTENCIA visible si el cambio en BD se aplicó pero Stripe NO se cortó/
 * pausó (para que el admin lo corrija a mano). Nunca se entierra en un log.
 */
function avisarResultado(res: { advertenciaStripe: string | null }, mensajeExito: string) {
  if (res.advertenciaStripe) {
    toast.advertencia(`${mensajeExito}. ${res.advertenciaStripe} Revísalo a mano en Stripe.`);
  } else {
    toast.exito(mensajeExito);
  }
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

/** Sucursales de un negocio (al expandir la fila). `habilitado` = solo se pide al abrir. */
export function useSucursalesNegocio(id: string, habilitado: boolean) {
  return useQuery({
    queryKey: queryKeys.negocios.sucursales(id),
    queryFn: () => negociosService.listarSucursalesNegocio(id),
    enabled: habilitado,
    staleTime: 1000 * 60 * 5,
  });
}

/** Detalle de una sucursal (modal). `placeholder` muestra el modal al instante. */
export function useSucursalDetalle(
  id: string | null,
  sucursalId: string | null,
  placeholder?: negociosService.SucursalDetalle,
) {
  return useQuery({
    queryKey: queryKeys.negocios.sucursal(id ?? '', sucursalId ?? ''),
    queryFn: () => negociosService.obtenerDetalleSucursal(id as string, sucursalId as string),
    enabled: !!id && !!sucursalId,
    placeholderData: placeholder,
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
    onSuccess: (res, { id }) => {
      refrescar(id);
      avisarResultado(res, 'Membresía pausada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo pausar la membresía')),
  });
}

export function useReactivarNegocio() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo?: string }) =>
      negociosService.reactivarNegocio(id, motivo),
    onSuccess: (res, { id }) => {
      refrescar(id);
      avisarResultado(res, 'Membresía reactivada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reactivar la membresía')),
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

/** Marcar pagado (SOLO superadmin). `hasta` = fecha ISO; `pausarStripe` = toggle del diálogo. */
export function useMarcarPagado() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ id, hasta, pausarStripe }: { id: string; hasta: string; pausarStripe: boolean }) =>
      negociosService.marcarPagado(id, hasta, pausarStripe),
    onSuccess: (res, { id }) => {
      refrescar(id);
      avisarResultado(res, 'Membresía marcada como pagada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo marcar como pagada')),
  });
}

/** Cancelar (SOLO superadmin · motivo obligatorio). Corta Stripe + degrada al dueño. */
export function useCancelarNegocio() {
  const refrescar = useRefrescarNegocio();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      negociosService.cancelarNegocio(id, motivo),
    onSuccess: (res, { id }) => {
      refrescar(id);
      avisarResultado(res, 'Negocio cancelado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo cancelar el negocio')),
  });
}
