import { useQuery, keepPreviousData } from '@tanstack/react-query';
import * as ayudaService from '../../services/ayudaService';
import { queryKeys } from '../../config/queryKeys';
import type { AppAyuda, AudienciaAyuda } from '../../types/ayuda';

/**
 * Centro de Ayuda para una app + audiencia (según desde dónde se abra:
 * anunciaya/cliente, anunciaya/comerciante o scanya/comerciante).
 */
export function useCentroAyuda(app: AppAyuda, audiencia: AudienciaAyuda) {
  return useQuery({
    queryKey: queryKeys.ayuda.centro(app, audiencia),
    queryFn: () =>
      ayudaService.obtenerCentroAyuda(app, audiencia).then((r) => r.data ?? []),
    placeholderData: keepPreviousData,
  });
}
