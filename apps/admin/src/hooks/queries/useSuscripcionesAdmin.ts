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
import type { ParametrosBitacora, EventoDetalle, DatosCobro } from '../../services/suscripcionesService';
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

// =============================================================================
// COLA "POR VERIFICAR" (pago manual con comprobante)
// =============================================================================

/** Lista de solicitudes pendientes de verificar. `habilitado` la gatea por rol/acceso. */
export function useSolicitudesPendientes(habilitado = true) {
  return useQuery({
    queryKey: queryKeys.suscripciones.solicitudes(),
    queryFn: suscripcionesService.listarSolicitudes,
    enabled: habilitado,
  });
}

/** Aprueba una solicitud (monto/meses opcionales; si faltan, se usan los declarados). */
export function useAprobarSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ solicitudId, monto, meses }: { solicitudId: string; monto?: number; meses?: number }) =>
      suscripcionesService.aprobarSolicitud(solicitudId, { monto, meses }),
    onSuccess: () => {
      // Refresca la cola Y la bitácora (la aprobación registra un movimiento manual).
      qc.invalidateQueries({ queryKey: queryKeys.suscripciones.all() });
      toast.exito('Pago aprobado y registrado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo aprobar la solicitud')),
  });
}

/** Rechaza una solicitud con motivo obligatorio. */
export function useRechazarSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ solicitudId, motivo }: { solicitudId: string; motivo: string }) =>
      suscripcionesService.rechazarSolicitud(solicitudId, motivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.suscripciones.solicitudes() });
      toast.exito('Solicitud rechazada');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo rechazar la solicitud')),
  });
}

// =============================================================================
// DATOS DE DEPÓSITO (cuenta bancaria)
// =============================================================================

/** Lee los datos bancarios de depósito. */
export function useDatosCobro() {
  return useQuery({
    queryKey: queryKeys.suscripciones.datosCobro(),
    queryFn: suscripcionesService.obtenerDatosCobro,
  });
}

/** Guarda los datos bancarios de depósito (solo superadmin). */
export function useGuardarDatosCobro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosCobro) => suscripcionesService.guardarDatosCobro(datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.suscripciones.datosCobro() });
      toast.exito('Datos de depósito guardados');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudieron guardar los datos')),
  });
}
