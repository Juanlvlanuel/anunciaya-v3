/**
 * useMantenimiento.ts
 * ===================
 * Hooks de React Query del módulo "Mantenimiento" (Panel Admin). Solo lectura.
 *
 * - useSalud      → semáforos; autorefresh prudente (~45s) para no abusar de Stripe.
 * - useLogs       → ventana de logs; autorefresh ágil (~8s, en memoria) con pausa.
 * - useCrons      → estado de tareas programadas.
 * - useReconcile  → escaneo del recolector R2; BAJO DEMANDA (enabled) porque es pesado.
 * - useReconcileLog → histórico de ejecuciones del recolector (rápido).
 *
 * Ubicación: apps/admin/src/hooks/queries/useMantenimiento.ts
 */

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import { toast } from '../../stores/useToastPanel';
import {
  obtenerSalud,
  obtenerLogs,
  obtenerCrons,
  obtenerReconcile,
  obtenerReconcileLog,
  obtenerPreviewCron,
  ejecutarLimpiezaR2,
  ejecutarCronManual,
  purgarCache,
  vaciarLogs,
  type NivelLog,
} from '../../services/mantenimientoService';

/** Extrae el mensaje del backend en un error (p. ej. el 409 de limpieza bloqueada). */
function mensajeError(e: unknown, fallback: string): string {
  const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return typeof m === 'string' ? m : fallback;
}

export function useSalud() {
  return useQuery({
    queryKey: queryKeys.mantenimiento.salud(),
    queryFn: obtenerSalud,
    staleTime: 1000 * 20,
    refetchInterval: 1000 * 45,
  });
}

export function useLogs(opciones: { nivel?: NivelLog; autorefrescar: boolean }) {
  const { nivel, autorefrescar } = opciones;
  return useQuery({
    queryKey: queryKeys.mantenimiento.logs(nivel ?? 'todos'),
    queryFn: () => obtenerLogs(nivel),
    staleTime: 1000 * 5,
    refetchInterval: autorefrescar ? 1000 * 8 : false,
    placeholderData: keepPreviousData,
  });
}

export function useCrons() {
  return useQuery({
    queryKey: queryKeys.mantenimiento.crons(),
    queryFn: obtenerCrons,
    staleTime: 1000 * 30,
  });
}

/** Preview de un cron (qué procesaría ahora). Solo corre cuando hay id (diálogo abierto). */
export function usePreviewCron(id: string | null) {
  return useQuery({
    queryKey: queryKeys.mantenimiento.cronPreview(id ?? ''),
    queryFn: () => obtenerPreviewCron(id!),
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useReconcile(habilitado: boolean) {
  return useQuery({
    queryKey: queryKeys.mantenimiento.reconcile(),
    queryFn: obtenerReconcile,
    enabled: habilitado,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

export function useReconcileLog() {
  return useQuery({
    queryKey: queryKeys.mantenimiento.reconcileLog(),
    queryFn: obtenerReconcileLog,
    staleTime: 1000 * 30,
    // Si la tabla r2_reconcile_log no existe aún el backend responde 503: no reintentar en bucle.
    retry: false,
  });
}

// =============================================================================
// MUTACIONES (acciones)
// =============================================================================

export function useEjecutarLimpiezaR2() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ejecutarLimpiezaR2,
    onSuccess: (r) => {
      toast.exito(`Limpieza completada: ${r.eliminadas} eliminadas${r.fallidas ? `, ${r.fallidas} fallidas` : ''}.`);
      qc.invalidateQueries({ queryKey: queryKeys.mantenimiento.reconcile() });
      qc.invalidateQueries({ queryKey: queryKeys.mantenimiento.reconcileLog() });
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo ejecutar la limpieza.')),
  });
}

export function useEjecutarCron() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ejecutarCronManual(id),
    onSuccess: (cron) => {
      toast.exito(`"${cron.nombre}" ejecutada${cron.resultado ? `: ${cron.resultado}` : ''}.`);
      qc.invalidateQueries({ queryKey: queryKeys.mantenimiento.crons() });
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo ejecutar la tarea.')),
  });
}

export function usePurgarCache() {
  return useMutation({
    mutationFn: purgarCache,
    onSuccess: () => toast.exito('Caché de configuración purgado.'),
    onError: (e) => toast.error(mensajeError(e, 'No se pudo purgar el caché.')),
  });
}

export function useVaciarLogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vaciarLogs,
    onSuccess: () => {
      toast.exito('Logs vaciados.');
      qc.invalidateQueries({ queryKey: ['mantenimiento', 'logs'] });
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudieron vaciar los logs.')),
  });
}
