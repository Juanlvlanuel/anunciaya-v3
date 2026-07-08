/**
 * useRecibosAdmin.ts
 * ==================
 * Hooks de React Query del módulo "Recibos" del Panel:
 *   - useRecibos(filtros)    → lista paginada (alcance por rol en el backend), keepPreviousData.
 *   - useDescargarRecibo()   → genera el PDF y lo abre en una pestaña.
 *   - useReenviarRecibo()    → reenvía el comprobante a 1+ correos.
 *
 * Ubicación: apps/admin/src/hooks/queries/useRecibosAdmin.ts
 */

import { useQuery, keepPreviousData, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import * as recibosService from '../../services/recibosService';
import type { ParametrosRecibos, OrigenRecibo } from '../../services/recibosService';
import { toast } from '../../stores/useToastPanel';

function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/** Lista paginada de recibos (con filtros). No tiembla al filtrar (keepPreviousData). */
export function useRecibos(filtros: ParametrosRecibos) {
  return useQuery({
    queryKey: queryKeys.recibos.lista(filtros),
    queryFn: () => recibosService.listarRecibos(filtros),
    placeholderData: keepPreviousData,
  });
}

/** Total de recibos del alcance (badge del menú). `enabled` lo gatea por acceso. */
export function useConteoRecibos(enabled = true) {
  return useQuery({
    queryKey: queryKeys.recibos.conteo(),
    queryFn: () => recibosService.contarRecibos(),
    enabled,
  });
}

/** Genera/regenera el PDF del recibo y lo abre en una pestaña nueva. */
export function useDescargarRecibo() {
  return useMutation({
    mutationFn: ({ id, origen }: { id: string; origen: OrigenRecibo }) => recibosService.descargarRecibo(id, origen),
    onSuccess: (url) => window.open(url, '_blank', 'noopener'),
    onError: (e) => toast.error(mensajeError(e, 'No se pudo descargar el recibo')),
  });
}

/** Reenvía el comprobante a una lista de correos. */
export function useReenviarRecibo() {
  return useMutation({
    mutationFn: ({ id, correos, origen }: { id: string; correos: string[]; origen: OrigenRecibo }) => recibosService.reenviarRecibo(id, correos, origen),
    onSuccess: (enviados) => toast.exito(`Comprobante enviado a ${enviados} correo${enviados === 1 ? '' : 's'}`),
    onError: (e) => toast.error(mensajeError(e, 'No se pudo reenviar el comprobante')),
  });
}
