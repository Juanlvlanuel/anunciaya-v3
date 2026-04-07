/**
 * useGuardados.ts
 * ================
 * Hooks de React Query para la sección Mis Guardados.
 *
 * PATRÓN:
 *   - useQuery → ofertas guardadas, negocios seguidos
 *
 * Ubicación: apps/web/src/hooks/queries/useGuardados.ts
 */

import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGpsStore } from '../../stores/useGpsStore';

// =============================================================================
// OFERTAS GUARDADAS
// =============================================================================

export function useOfertasGuardadas() {
  const usuarioId = useAuthStore((s) => s.usuario?.id ?? '');
  const habilitado = !!usuarioId;

  return useQuery({
    queryKey: ['guardados', 'ofertas', usuarioId] as const,
    queryFn: async () => {
      const response = await api.get('/guardados', {
        params: { entityType: 'oferta', pagina: 1, limite: 50 },
      });
      return response.data.success ? response.data.data.guardados ?? [] : [];
    },
    enabled: habilitado,
  });
}

// =============================================================================
// NEGOCIOS SEGUIDOS
// =============================================================================

export function useNegociosSeguidos() {
  const usuarioId = useAuthStore((s) => s.usuario?.id ?? '');
  const { latitud, longitud } = useGpsStore();
  const habilitado = !!usuarioId;

  return useQuery({
    queryKey: ['guardados', 'negocios', usuarioId, latitud, longitud] as const,
    queryFn: async () => {
      const params: Record<string, string | number> = {
        entityType: 'sucursal', pagina: 1, limite: 50,
      };
      if (latitud && longitud) {
        params.latitud = latitud;
        params.longitud = longitud;
      }
      const response = await api.get('/seguidos', { params });
      return response.data.success ? response.data.data.seguidos ?? [] : [];
    },
    enabled: habilitado,
  });
}
