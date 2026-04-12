/**
 * useResenas.ts
 * ==============
 * Hooks de React Query para el módulo Opiniones de Business Studio.
 *
 * PATRÓN:
 *   - useQuery    → lista de reseñas y KPIs (siempre trae todo, filtrado local)
 *   - useMutation → responder reseña con update optimista + rollback
 *
 * Ubicación: apps/web/src/hooks/queries/useResenas.ts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as resenasService from '../../services/resenasService';
import type { ResenaBS, KPIsResenas } from '../../types/resenas';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';

// =============================================================================
// LISTA DE RESEÑAS
// Siempre trae TODAS — el filtrado (pendientes, estrellas, búsqueda) es local
// =============================================================================

export function useResenasLista() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.resenas.lista(sucursalId),
    queryFn: () => resenasService.obtenerResenas(false).then((r) => r.data ?? []),
    enabled: habilitado,
    // Sin keepPreviousData: los filtros son locales, no cambian el query key
  });
}

// =============================================================================
// KPIs
// =============================================================================

export function useResenasKPIs() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
  const habilitado = !!sucursalId && modoActivo === 'comercial';

  return useQuery({
    queryKey: queryKeys.resenas.kpis(sucursalId),
    queryFn: () => resenasService.obtenerKPIs().then((r) => r.data ?? null),
    enabled: habilitado,
  });
}

// =============================================================================
// MUTACIÓN: Responder reseña (update optimista + rollback)
// =============================================================================

export function useResponderResena() {
  const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
  const queryClientInstance = useQueryClient();

  return useMutation({
    mutationFn: ({ resenaId, texto }: { resenaId: string; texto: string }) =>
      resenasService.responderResena(resenaId, texto),

    onMutate: async ({ resenaId, texto }) => {
      // Cancelar fetches en curso
      await queryClientInstance.cancelQueries({
        queryKey: queryKeys.resenas.lista(sucursalId),
      });

      // Guardar snapshot para rollback
      const snapshotResenas = queryClientInstance.getQueryData<ResenaBS[]>(
        queryKeys.resenas.lista(sucursalId)
      );
      const snapshotKPIs = queryClientInstance.getQueryData<KPIsResenas>(
        queryKeys.resenas.kpis(sucursalId)
      );

      const respuestaTemp = {
        id: `temp-${Date.now()}`,
        texto,
        createdAt: new Date().toISOString(),
      };

      // Update optimista en lista
      queryClientInstance.setQueryData<ResenaBS[]>(
        queryKeys.resenas.lista(sucursalId),
        (old) => {
          if (!old) return old;
          return old.map((r) =>
            r.id === resenaId ? { ...r, respuesta: respuestaTemp } : r
          );
        }
      );

      // Update optimista en KPIs (decrementar pendientes)
      queryClientInstance.setQueryData<KPIsResenas>(
        queryKeys.resenas.kpis(sucursalId),
        (old) => {
          if (!old) return old;
          return { ...old, pendientes: Math.max(0, old.pendientes - 1) };
        }
      );

      return { snapshotResenas, snapshotKPIs };
    },

    onError: (_err, _vars, context) => {
      // Rollback al snapshot anterior
      if (context?.snapshotResenas !== undefined) {
        queryClientInstance.setQueryData(
          queryKeys.resenas.lista(sucursalId),
          context.snapshotResenas
        );
      }
      if (context?.snapshotKPIs !== undefined) {
        queryClientInstance.setQueryData(
          queryKeys.resenas.kpis(sucursalId),
          context.snapshotKPIs
        );
      }
    },

    onSuccess: (resultado, { resenaId }) => {
      // Reemplazar datos temporales con los reales del backend
      if (resultado.data) {
        const respuestaReal = resultado.data;
        queryClientInstance.setQueryData<ResenaBS[]>(
          queryKeys.resenas.lista(sucursalId),
          (old) => {
            if (!old) return old;
            return old.map((r) =>
              r.id === resenaId ? { ...r, respuesta: respuestaReal } : r
            );
          }
        );
      }
      // Invalidación cross-módulo: la sección de reseñas del detalle público
      // del negocio (donde los clientes ven las reseñas con las respuestas
      // del comerciante) usa una query key distinta.
      queryClientInstance.invalidateQueries({
        queryKey: ['negocios', 'resenas', sucursalId],
      });
      // Tab de reseñas del módulo Reportes BS (% respondidas, etc.)
      queryClientInstance.invalidateQueries({
        queryKey: ['reportes', 'resenas'],
      });
    },
  });
}
