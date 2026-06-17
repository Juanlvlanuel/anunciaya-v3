/**
 * useConfiguracionAdmin.ts
 * ========================
 * Hooks de React Query para la sección "Configuración" del Panel (módulo 9).
 *   - useConfiguracion()            → lista los valores editables (catálogo + valor actual).
 *   - useActualizarConfiguracion()  → edita un valor (escalera, trial o gracia). Solo super.
 *
 * Ubicación: apps/admin/src/hooks/queries/useConfiguracionAdmin.ts
 */

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { queryKeys } from '../../config/queryKeys';
import * as configuracionService from '../../services/configuracionService';
import { toast } from '../../stores/useToastPanel';

/** Extrae el mensaje de error del backend (o uno por defecto). */
function mensajeError(error: unknown, porDefecto: string): string {
  const e = error as { response?: { data?: { message?: string } } };
  return e?.response?.data?.message ?? porDefecto;
}

/** Lista los valores editables del negocio (catálogo + valor actual). Solo super. */
export function useConfiguracion() {
  return useQuery({
    queryKey: queryKeys.configuracion.lista(),
    queryFn: () => configuracionService.listarConfiguracion(),
    staleTime: 1000 * 60,
  });
}

/** Edita un valor de configuración. Invalida la lista e informa por toast. */
export function useActualizarConfiguracion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ clave, valor }: { clave: string; valor: string }) =>
      configuracionService.actualizarConfiguracion(clave, valor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.configuracion.all() });
      toast.exito('Cambio guardado');
    },
    onError: (e) => toast.error(mensajeError(e, 'No se pudo guardar el cambio')),
  });
}
