/**
 * useSuscripcionesAdmin.ts
 * ========================
 * Hooks de React Query para la sección Suscripciones del Panel = la BITÁCORA FINANCIERA
 * (solo lectura). keepPreviousData para no parpadear al filtrar/paginar. Sin mutaciones:
 * los eventos los escriben el webhook y marcarPagado (backend), no esta pantalla.
 *
 * Ubicación: apps/admin/src/hooks/queries/useSuscripcionesAdmin.ts
 */

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../config/queryKeys';
import * as suscripcionesService from '../../services/suscripcionesService';
import type { ParametrosBitacora, EventoDetalle } from '../../services/suscripcionesService';

/** Bitácora paginada (con filtros). */
export function useBitacora(filtros: ParametrosBitacora) {
  return useQuery({
    queryKey: queryKeys.suscripciones.lista(filtros),
    queryFn: () => suscripcionesService.listarEventos(filtros),
    placeholderData: keepPreviousData,
  });
}

/**
 * Detalle de un evento. Acepta un `placeholder` (los datos que ya trae la fila) para
 * que el modal se vea AL INSTANTE y rellene el resto (metadata, ids) al llegar la respuesta.
 */
export function useEventoDetalle(id: string | null, placeholder?: EventoDetalle) {
  return useQuery({
    queryKey: queryKeys.suscripciones.detalle(id ?? ''),
    queryFn: () => suscripcionesService.obtenerDetalleEvento(id as string),
    enabled: !!id,
    placeholderData: placeholder,
  });
}

/** Prefetch de la ficha de un evento (hover/touch) → modal instantáneo. */
export function usePrefetchEvento() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: queryKeys.suscripciones.detalle(id),
        queryFn: () => suscripcionesService.obtenerDetalleEvento(id),
        staleTime: 1000 * 60 * 2,
      });
    },
    [qc],
  );
}
