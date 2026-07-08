/**
 * useAuditoriaAdmin.ts
 * ====================
 * Hooks de React Query para la sección Auditoría del Panel = la BITÁCORA DE ACCIONES
 * (solo lectura). keepPreviousData para no parpadear al filtrar/paginar. Sin mutaciones:
 * la bitácora es inmutable (la escribe `registrarAuditoria` desde cada módulo).
 *
 * Ubicación: apps/admin/src/hooks/queries/useAuditoriaAdmin.ts
 */

import { useQuery, useQueryClient, useMutation, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { queryKeys } from '../../config/queryKeys';
import * as auditoriaService from '../../services/auditoriaService';
import type { ParametrosAuditoria, AuditoriaDetalle } from '../../services/auditoriaService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/** Bitácora paginada (con filtros). */
export function useAuditoria(filtros: ParametrosAuditoria) {
  return useQuery({
    queryKey: queryKeys.auditoria.lista(filtros),
    queryFn: () => auditoriaService.listarAuditoria(filtros),
    placeholderData: keepPreviousData,
  });
}

/** Actores presentes en la bitácora (para el filtro "por persona"). */
export function useActoresAuditoria() {
  return useQuery({
    queryKey: queryKeys.auditoria.actores(),
    queryFn: () => auditoriaService.listarActores(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Detalle de un registro. Acepta un `placeholder` (los datos que ya trae la fila) para
 * que el modal se vea AL INSTANTE y rellene el resto (snapshots) al llegar la respuesta.
 */
export function useDetalleAuditoria(id: string | null, placeholder?: AuditoriaDetalle) {
  return useQuery({
    queryKey: queryKeys.auditoria.detalle(id ?? ''),
    queryFn: () => auditoriaService.obtenerDetalleAuditoria(id as string),
    enabled: !!id,
    placeholderData: placeholder,
  });
}

/** Prefetch de la ficha de un registro (hover/touch) → modal instantáneo. */
export function usePrefetchAuditoria() {
  const qc = useQueryClient();
  return useCallback(
    (id: string) => {
      qc.prefetchQuery({
        queryKey: queryKeys.auditoria.detalle(id),
        queryFn: () => auditoriaService.obtenerDetalleAuditoria(id),
        staleTime: 1000 * 60 * 2,
      });
    },
    [qc],
  );
}

/** Borra un registro de la bitácora (solo superadmin). Refresca la lista al terminar. */
export function useEliminarAuditoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => auditoriaService.eliminarAuditoria(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.auditoria.all() });
      toast.exito('Registro eliminado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo eliminar el registro')),
  });
}

/** Vacía la bitácora RESPETANDO los filtros activos (solo superadmin). Refresca al terminar. Irreversible. */
export function useVaciarAuditoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (filtros?: Parameters<typeof auditoriaService.vaciarAuditoria>[0]) => auditoriaService.vaciarAuditoria(filtros),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: queryKeys.auditoria.all() });
      toast.exito(`Bitácora depurada (${r.borradas})`);
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo vaciar la bitácora')),
  });
}
