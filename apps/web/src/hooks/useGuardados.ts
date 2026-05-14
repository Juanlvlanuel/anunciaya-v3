/**
 * ============================================================================
 * HOOK: useGuardados
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useGuardados.ts
 * 
 * PROPÓSITO:
 * Hook para manejar guardados con actualización optimista
 * Reutilizable para ofertas y servicios (publicaciones de la sección Servicios)
 * 
 * CARACTERÍSTICAS:
 * - Actualización optimista (UI responde instantáneamente)
 * - Reversión automática si falla la petición
 * - Toggle inteligente (guardar/quitar en un solo click)
 * - TypeScript completo
 * - Notificaciones automáticas
 * 
 * USO:
 * ```tsx
 * function TarjetaOferta({ oferta }) {
 *   const { guardado, toggleGuardado } = useGuardados({
 *     entityType: 'oferta',
 *     entityId: oferta.ofertaId,
 *     initialGuardado: oferta.guardado,
 *   });
 *   
 *   return (
 *     <button onClick={toggleGuardado}>
 *       {guardado ? '⭐' : '☆'} Guardar
 *     </button>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useRef } from 'react';
import { useQueryClient, type QueryClient, type InfiniteData } from '@tanstack/react-query';
import { api } from '../services/api';
import { notificar } from '../utils/notificaciones';
import { queryKeys } from '../config/queryKeys';
import type {
  ArticuloFeedInfinito,
  RespuestaFeedInfinito,
  ArticuloMarketplaceDetalle,
  PublicacionesDeVendedor,
  ArticuloMarketplace,
} from '../types/marketplace';

// =============================================================================
// TIPOS
// =============================================================================

type EntityType = 'oferta' | 'servicio' | 'articulo_marketplace';

interface UseGuardadosParams {
  /**
   * Tipo de entidad (oferta, servicio, articulo_marketplace).
   * El backend valida con check constraint sobre `guardados.entity_type`.
   */
  entityType: EntityType;
  
  /**
   * ID único de la entidad
   */
  entityId: string;
  
  /**
   * Estado inicial de guardado (desde backend)
   */
  initialGuardado?: boolean;
  
  /**
   * Callback cuando cambia el estado de guardado
   * Útil para actualizar contadores en el padre
   */
  onGuardadoChange?: (guardado: boolean) => void;
}

interface UseGuardadosResult {
  /**
   * Estado actual de guardado
   */
  guardado: boolean;
  
  /**
   * Indica si hay una petición en curso
   */
  loading: boolean;
  
  /**
   * Toggle guardado (guardar/quitar automáticamente)
   */
  toggleGuardado: () => Promise<void>;
  
  /**
   * Función manual para agregar a guardados
   */
  agregarGuardado: () => Promise<void>;
  
  /**
   * Función manual para quitar de guardados
   */
  quitarGuardado: () => Promise<void>;
}

// =============================================================================
// HELPERS — SINCRONIZACIÓN DE CACHE (articulo_marketplace)
// =============================================================================

/**
 * Optimistic update del cache de React Query cuando un artículo del marketplace
 * cambia su estado de guardado. Mantiene en sync el feed infinito (todos los
 * filtros/órdenes), el detalle del artículo y las publicaciones de vendedor.
 *
 * Sin esto, el `<CardArticuloFeed modoModal />` que vive dentro del modal de
 * detalle (Facebook style) arranca con `articulo.guardado` y
 * `articulo.totalGuardados` stale porque su snapshot viene del cache del feed.
 *
 * Exportado para que vistas que eliminan guardados POR FUERA del hook
 * (ej. `PaginaGuardados.eliminarSeleccionados`, que usa `api.delete` directo
 * en batch) puedan sincronizar el cache de feed/vendedor sin tener que pasar
 * por el hook por cada item.
 */
export function aplicarCambioGuardadoEnCache(
  qc: QueryClient,
  articuloId: string,
  guardadoNuevo: boolean,
  delta: 1 | -1,
): void {
  // Feed infinito — todas las queries con prefix `['marketplace', 'feed-infinito']`.
  // Siempre devolvemos un objeto nuevo para forzar que TanStack Query notifique
  // a los observers, incluso si el artículo está en una página y no en otra.
  qc.setQueriesData<InfiniteData<RespuestaFeedInfinito>>(
    { queryKey: ['marketplace', 'feed-infinito'] },
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          articulos: page.articulos.map((a): ArticuloFeedInfinito =>
            a.id === articuloId
              ? {
                  ...a,
                  guardado: guardadoNuevo,
                  totalGuardados: Math.max(0, a.totalGuardados + delta),
                }
              : a
          ),
        })),
      };
    },
  );

  // Detalle del artículo — exact match.
  qc.setQueryData<ArticuloMarketplaceDetalle | null>(
    queryKeys.marketplace.articulo(articuloId),
    (old) => {
      if (!old) return old;
      return {
        ...old,
        totalGuardados: Math.max(0, old.totalGuardados + delta),
      };
    },
  );

  // Publicaciones del vendedor — todas las queries con prefix
  // `['marketplace', 'vendedor', ..., 'publicaciones', ...]`.
  // IMPORTANTE: actualizar también el flag `guardado` (no solo el contador).
  // Sin esto, al navegar fuera del perfil y volver, el cache aún tiene
  // `guardado=true` y el corazón se ve marcado aunque el usuario lo haya
  // quitado en otra parte.
  qc.setQueriesData<PublicacionesDeVendedor>(
    { queryKey: ['marketplace', 'vendedor'] },
    (old) => {
      if (!old || !Array.isArray(old.data)) return old;
      return {
        ...old,
        data: old.data.map((a): ArticuloMarketplace =>
          a.id === articuloId
            ? {
                ...a,
                guardado: guardadoNuevo,
                totalGuardados: Math.max(0, a.totalGuardados + delta),
              }
            : a
        ),
      };
    },
  );
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

/**
 * Hook para manejar guardados con actualización optimista
 * 
 * @param params - Configuración del hook
 * @returns Estado y funciones para manejar guardados
 * 
 * @example
 * // Uso básico con toggle
 * const { guardado, toggleGuardado } = useGuardados({
 *   entityType: 'oferta',
 *   entityId: oferta.ofertaId,
 *   initialGuardado: oferta.guardado,
 * });
 * 
 * @example
 * // Con callback para actualizar UI padre
 * const { guardado, toggleGuardado } = useGuardados({
 *   entityType: 'oferta',
 *   entityId: oferta.ofertaId,
 *   initialGuardado: oferta.guardado,
 *   onGuardadoChange: (guardado) => {
 *     console.log('Estado cambió:', guardado);
 *   }
 * });
 */
export function useGuardados(params: UseGuardadosParams): UseGuardadosResult {
  const {
    entityType,
    entityId,
    initialGuardado = false,
    onGuardadoChange,
  } = params;

  const qc = useQueryClient();

  // =============================================================================
  // ESTADO LOCAL
  // =============================================================================

  const [guardado, setGuardado] = useState(initialGuardado);
  const [loading, setLoading] = useState(false);

  // Ref para trackear el entityId anterior
  const prevEntityIdRef = useRef(entityId);

  // =============================================================================
  // SINCRONIZACIÓN CON BACKEND
  // =============================================================================
  
  /**
   * Sincroniza cuando:
   * 1. Cambia el entityId (navegas a otra entidad) → resetea todo
   * 2. Llegan datos del backend (initialGuardado cambia) → actualiza
   */
  useEffect(() => {
    // Si cambió la entidad, resetear completamente
    if (prevEntityIdRef.current !== entityId) {
      prevEntityIdRef.current = entityId;
      setGuardado(initialGuardado ?? false);
      return;
    }

    // Si es la misma entidad, solo sincronizar valor
    setGuardado(initialGuardado ?? false);
  }, [entityId, initialGuardado]);

  // =============================================================================
  // FUNCIONES DE GUARDADOS
  // =============================================================================
  
  /**
   * Agrega la entidad a guardados
   */
  const agregarGuardado = async () => {
    // Actualización optimista
    const estadoAnterior = guardado;
    setGuardado(true);
    onGuardadoChange?.(true);
    if (entityType === 'articulo_marketplace') {
      aplicarCambioGuardadoEnCache(qc, entityId, true, +1);
    }

    try {
      setLoading(true);

      await api.post('/guardados', {
        entityType,
        entityId,
      });

      qc.invalidateQueries({ queryKey: ['guardados'] });
      notificar.exito('¡Guardado!');

    } catch (error: unknown) {
      console.error('❌ Error al agregar a guardados:', error);

      // Reversión: volver al estado anterior
      setGuardado(estadoAnterior);
      onGuardadoChange?.(estadoAnterior);
      if (entityType === 'articulo_marketplace') {
        aplicarCambioGuardadoEnCache(qc, entityId, estadoAnterior, -1);
      }

      // Notificar error
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 400) {
        notificar.info('Ya está en guardados');
      } else if (axiosError.response?.status === 401) {
        notificar.error('Debes iniciar sesión para guardar');
      } else {
        notificar.error('Error al guardar');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Quita la entidad de guardados
   */
  const quitarGuardado = async () => {
    // Actualización optimista
    const estadoAnterior = guardado;
    setGuardado(false);
    onGuardadoChange?.(false);
    if (entityType === 'articulo_marketplace') {
      aplicarCambioGuardadoEnCache(qc, entityId, false, -1);
    }

    try {
      setLoading(true);

      await api.delete(`/guardados/${entityType}/${entityId}`);

      qc.invalidateQueries({ queryKey: ['guardados'] });
      notificar.info('Quitado de guardados');

    } catch (error: unknown) {
      console.error('❌ Error al quitar de guardados:', error);

      // Reversión: volver al estado anterior
      setGuardado(estadoAnterior);
      onGuardadoChange?.(estadoAnterior);
      if (entityType === 'articulo_marketplace') {
        aplicarCambioGuardadoEnCache(qc, entityId, estadoAnterior, +1);
      }

      // Notificar error
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 404) {
        notificar.info('No está en guardados');
      } else if (axiosError.response?.status === 401) {
        notificar.error('Debes iniciar sesión');
      } else {
        notificar.error('Error al quitar de guardados');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle guardado (agregar si no está, quitar si ya está)
   */
  const toggleGuardado = async () => {
    if (guardado) {
      await quitarGuardado();
    } else {
      await agregarGuardado();
    }
  };

  // =============================================================================
  // RETURN
  // =============================================================================
  
  return {
    guardado,
    loading,
    toggleGuardado,
    agregarGuardado,
    quitarGuardado,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useGuardados;