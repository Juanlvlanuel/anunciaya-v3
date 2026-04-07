/**
 * useMisCupones.ts
 * =================
 * Hook de React Query para la sección Mis Cupones.
 *
 * PATRÓN:
 *   - useQuery → lista de cupones del usuario
 *
 * Ubicación: apps/web/src/hooks/queries/useMisCupones.ts
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { obtenerMisCupones } from '../../services/misCuponesService';
import { escucharEvento } from '../../services/socketService';
import { useAuthStore } from '../../stores/useAuthStore';
import { queryKeys } from '../../config/queryKeys';

// =============================================================================
// LISTA DE CUPONES DEL USUARIO
// =============================================================================

export function useMisCuponesLista() {
  const usuarioId = useAuthStore((s) => s.usuario?.id ?? '');
  const habilitado = !!usuarioId;

  return useQuery({
    queryKey: queryKeys.cupones.lista(usuarioId),
    queryFn: async () => {
      const res = await obtenerMisCupones();
      if (res.success && Array.isArray(res.data)) {
        // Pre-cargar logos e imágenes en background
        const urls = new Set<string>();
        for (const c of res.data) {
          if (c.negocioLogo) urls.add(c.negocioLogo);
          if (c.imagen) urls.add(c.imagen);
        }
        urls.forEach(url => { const img = new Image(); img.src = url; });
        return res.data;
      }
      return [];
    },
    enabled: habilitado,
  });
}

// =============================================================================
// LISTENER SOCKET — invalida caché cuando el backend notifica cambios
// =============================================================================

export function useMisCuponesSocket() {
  const qc = useQueryClient();
  const usuarioId = useAuthStore((s) => s.usuario?.id ?? '');

  useEffect(() => {
    if (!usuarioId) return;
    const detener = escucharEvento('cupon:actualizado', () => {
      qc.invalidateQueries({ queryKey: queryKeys.cupones.lista(usuarioId) });
    });
    return detener;
  }, [usuarioId, qc]);
}
