/**
 * useSuscripcionesAdmin.ts
 * ========================
 * Hooks de React Query para la sección Suscripciones del Panel = la BITÁCORA FINANCIERA
 * (solo lectura). keepPreviousData para no parpadear al filtrar/paginar. Sin mutaciones:
 * los eventos los escriben el webhook y marcarPagado (backend), no esta pantalla.
 *
 * Ubicación: apps/admin/src/hooks/queries/useSuscripcionesAdmin.ts
 */

import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../config/queryKeys';
import * as suscripcionesService from '../../services/suscripcionesService';
import type { ParametrosBitacora, EventoDetalle } from '../../services/suscripcionesService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

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

/**
 * Borra un movimiento de pago manual ANULADO (evento + pago). Solo superadmin (el backend
 * lo blinda). Refresca la bitácora al terminar. Acción irreversible.
 */
export function useEliminarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suscripcionesService.eliminarEvento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.suscripciones.all() });
      toast.exito('Movimiento eliminado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo eliminar el movimiento')),
  });
}
