/**
 * useNegocios.ts
 * ===============
 * Hooks de React Query para la sección pública de Negocios.
 *
 * PATRÓN:
 *   - useQuery → lista de negocios (con filtros+GPS), perfil individual, ofertas, catálogo
 *   - prefetch → queryClient.prefetchQuery para pre-cargar perfil en hover/visible
 *
 * Reemplaza: useListaNegocios.ts, usePerfilNegocio.ts, useNegociosCacheStore.ts
 *
 * Ubicación: apps/web/src/hooks/queries/useNegocios.ts
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api } from '../../services/api';
import { useGpsStore } from '../../stores/useGpsStore';
import { useFiltrosNegociosStore } from '../../stores/useFiltrosNegociosStore';
import { queryKeys } from '../../config/queryKeys';
import type { NegocioResumen, NegocioCompleto } from '../../types/negocios';

// =============================================================================
// LISTA DE NEGOCIOS (con filtros + GPS)
// =============================================================================

export function useNegociosLista() {
  const {
    categoria, subcategorias, distancia, cercaDeMi,
    metodosPago, soloCardya, conEnvio, conServicioDomicilio, busqueda,
  } = useFiltrosNegociosStore();
  const { latitud, longitud } = useGpsStore();

  const filtros = {
    categoria, subcategorias, distancia, cercaDeMi,
    metodosPago, soloCardya, conEnvio, conServicioDomicilio, busqueda,
    latitud, longitud,
  };

  return useQuery({
    queryKey: queryKeys.negocios.lista(filtros as unknown as Record<string, unknown>),
    queryFn: async () => {
      const params: Record<string, unknown> = { limite: 20, offset: 0 };

      if (latitud && longitud) {
        params.latitud = latitud;
        params.longitud = longitud;
        if (cercaDeMi) params.distanciaMaxKm = distancia;
      }
      if (categoria) params.categoriaId = categoria;
      if (subcategorias.length > 0) params.subcategoriaIds = subcategorias.join(',');
      if (metodosPago.length > 0) params.metodosPago = metodosPago.join(',');
      if (soloCardya) params.aceptaCardYA = true;
      if (conEnvio) params.tieneEnvio = true;
      if (conServicioDomicilio) params.tieneServicioDomicilio = true;
      if (busqueda.trim()) params.busqueda = busqueda.trim();

      const response = await api.get<{ success: boolean; data: NegocioResumen[] }>(
        '/negocios', { params }
      );
      return response.data.success ? response.data.data : [];
    },
    // keepPreviousData equivalente — mantener datos mientras cambian filtros
    placeholderData: (prev) => prev,
  });
}

// =============================================================================
// PERFIL COMPLETO DE NEGOCIO (por sucursalId)
// =============================================================================

export function useNegocioPerfil(sucursalId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.negocios.detalle(sucursalId ?? ''),
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: NegocioCompleto }>(
        `/negocios/sucursal/${sucursalId}`
      );
      return response.data.success ? response.data.data : null;
    },
    enabled: !!sucursalId,
    staleTime: 5 * 60 * 1000, // 5 min — perfil cambia poco
  });
}

// =============================================================================
// OFERTAS DE UN NEGOCIO (sección pública)
// =============================================================================

export function useNegocioOfertas(sucursalId: string | undefined) {
  return useQuery({
    queryKey: ['negocios', 'ofertas', sucursalId] as const,
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: unknown[] }>(
        '/ofertas/feed', { params: { sucursalId } }
      );
      return response.data.success ? response.data.data : [];
    },
    enabled: !!sucursalId,
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// CATÁLOGO DE UN NEGOCIO (sección pública)
// =============================================================================

export function useNegocioCatalogo(negocioId: string | undefined) {
  return useQuery({
    queryKey: ['negocios', 'catalogo', negocioId] as const,
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: unknown[] }>(
        `/articulos/negocio/${negocioId}`
      );
      return response.data.success ? response.data.data : [];
    },
    enabled: !!negocioId,
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// RESEÑAS DE UN NEGOCIO (sección pública)
// =============================================================================

export function useNegocioResenas(sucursalId: string | undefined) {
  return useQuery({
    queryKey: ['negocios', 'resenas', sucursalId] as const,
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: unknown[] }>(
        `/resenas/sucursal/${sucursalId}`
      );
      return response.data.success ? response.data.data : [];
    },
    enabled: !!sucursalId,
    staleTime: 5 * 60 * 1000,
  });
}

// =============================================================================
// PREFETCH — para pre-cargar perfil + ofertas + catálogo en hover/visible
// =============================================================================

export function useNegocioPrefetch() {
  const qc = useQueryClient();

  const prefetch = useCallback((sucursalId: string, negocioId: string) => {
    // Pre-cargar perfil
    qc.prefetchQuery({
      queryKey: queryKeys.negocios.detalle(sucursalId),
      queryFn: async () => {
        const response = await api.get<{ success: boolean; data: NegocioCompleto }>(
          `/negocios/sucursal/${sucursalId}`
        );
        return response.data.success ? response.data.data : null;
      },
      staleTime: 5 * 60 * 1000,
    });

    // Pre-cargar ofertas
    qc.prefetchQuery({
      queryKey: ['negocios', 'ofertas', sucursalId] as const,
      queryFn: async () => {
        const response = await api.get<{ success: boolean; data: unknown[] }>(
          '/ofertas/feed', { params: { sucursalId } }
        );
        return response.data.success ? response.data.data : [];
      },
      staleTime: 5 * 60 * 1000,
    });

    // Pre-cargar catálogo
    qc.prefetchQuery({
      queryKey: ['negocios', 'catalogo', negocioId] as const,
      queryFn: async () => {
        const response = await api.get<{ success: boolean; data: unknown[] }>(
          `/articulos/negocio/${negocioId}`
        );
        return response.data.success ? response.data.data : [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [qc]);

  // Pre-cargar lista de negocios (para Navbar hover)
  const prefetchLista = useCallback(() => {
    const { latitud, longitud } = useGpsStore.getState();
    qc.prefetchQuery({
      queryKey: queryKeys.negocios.lista({} as Record<string, unknown>),
      queryFn: async () => {
        const params: Record<string, unknown> = { limite: 20, offset: 0 };
        if (latitud && longitud) {
          params.latitud = latitud;
          params.longitud = longitud;
          params.distanciaMaxKm = 5;
        }
        const response = await api.get<{ success: boolean; data: NegocioResumen[] }>(
          '/negocios', { params }
        );
        return response.data.success ? response.data.data : [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }, [qc]);

  return { prefetch, prefetchLista };
}
