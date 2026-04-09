/**
 * ============================================================================
 * HOOK: useVotos
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useVotos.ts
 * 
 * PROPÓSITO:
 * Hook para manejar likes y seguidos con actualización optimista
 * Reutilizable para TODAS las secciones (negocios, artículos, ofertas, etc.)
 * 
 * CARACTERÍSTICAS:
 * - Actualización optimista (UI responde instantáneamente)
 * - Reversión automática si falla la petición
 * - Toggle inteligente (dar/quitar en un solo click)
 * - TypeScript completo
 * - Notificaciones automáticas
 * 
 * USO:
 * ```tsx
 * function TarjetaNegocio({ negocio }) {
 *   const { liked, followed, toggleLike, toggleFollow } = useVotos({
 *     entityType: 'sucursal',
 *     entityId: negocio.sucursalId,
 *     initialLiked: negocio.liked,
 *     initialFollowed: negocio.followed,
 *   });
 *   
 *   return (
 *     <div>
 *       <button onClick={toggleLike}>
 *         {liked ? '❤️' : '🤍'} {negocio.totalLikes}
 *       </button>
 *       <button onClick={toggleFollow}>
 *         {followed ? '⭐' : '☆'} Guardar
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { notificar } from '../utils/notificaciones';
import { useAuthStore } from '../stores/useAuthStore';
import { queryKeys } from '../config/queryKeys';
import type { EntityType } from '../types/negocios';

// =============================================================================
// TIPOS
// =============================================================================

interface UseVotosParams {
  /**
   * Tipo de entidad (sucursal, articulo, publicacion, oferta, etc.)
   */
  entityType: EntityType;
  
  /**
   * ID único de la entidad
   */
  entityId: string;
  
  /**
   * Estado inicial de liked (desde backend)
   */
  initialLiked?: boolean;
  
  /**
   * Estado inicial de followed (desde backend)
   */
  initialFollowed?: boolean;
  
  /**
   * Callback cuando cambia el estado de like
   * Útil para actualizar contadores en el padre
   */
  onLikeChange?: (liked: boolean) => void;
  
  /**
   * Callback cuando cambia el estado de follow
   */
  onFollowChange?: (followed: boolean) => void;
}

interface UseVotosResult {
  /**
   * Estado actual de liked
   */
  liked: boolean;
  
  /**
   * Estado actual de followed
   */
  followed: boolean;
  
  /**
   * Indica si hay una petición en curso
   */
  loading: boolean;
  
  /**
   * Toggle like (dar/quitar automáticamente)
   */
  toggleLike: () => Promise<void>;
  
  /**
   * Toggle follow (seguir/quitar automáticamente)
   */
  toggleFollow: () => Promise<void>;
  
  /**
   * Función manual para dar like
   */
  darLike: () => Promise<void>;
  
  /**
   * Función manual para quitar like
   */
  quitarLike: () => Promise<void>;
  
  /**
   * Función manual para seguir
   */
  seguir: () => Promise<void>;
  
  /**
   * Función manual para dejar de seguir
   */
  dejarDeSeguir: () => Promise<void>;
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

/**
 * Hook para manejar likes y seguidos con actualización optimista
 * 
 * @param params - Configuración del hook
 * @returns Estado y funciones para manejar votos
 * 
 * @example
 * // Uso básico con toggle
 * const { liked, toggleLike } = useVotos({
 *   entityType: 'sucursal',
 *   entityId: negocio.sucursalId,
 *   initialLiked: negocio.liked,
 * });
 * 
 * @example
 * // Con callbacks para actualizar contadores
 * const { liked, toggleLike } = useVotos({
 *   entityType: 'sucursal',
 *   entityId: negocio.sucursalId,
 *   initialLiked: negocio.liked,
 *   onLikeChange: (liked) => {
 *     setTotalLikes(prev => liked ? prev + 1 : prev - 1);
 *   }
 * });
 */
export function useVotos(params: UseVotosParams): UseVotosResult {
  const {
    entityType,
    entityId,
    initialLiked = false,
    initialFollowed = false,
    onLikeChange,
    onFollowChange,
  } = params;

  // Obtener sucursalActiva si está en modo comercial
  const sucursalActiva = useAuthStore((state) => state.usuario?.sucursalActiva);
  const qc = useQueryClient();

  // Invalidar queries relacionados para sincronizar liked/followed entre vistas
  const invalidarCaches = () => {
    if (entityType === 'sucursal') {
      qc.invalidateQueries({ queryKey: queryKeys.negocios.detalle(entityId) });
      qc.invalidateQueries({ queryKey: ['negocios', 'lista'] });
      qc.invalidateQueries({ queryKey: ['guardados', 'negocios'] });
    } else if (entityType === 'oferta') {
      qc.invalidateQueries({ queryKey: ['guardados', 'ofertas'] });
    }
  };

  // =============================================================================
  // ESTADO LOCAL
  // =============================================================================
  
  const [liked, setLiked] = useState(initialLiked);
  const [followed, setFollowed] = useState(initialFollowed);
  const [loading, setLoading] = useState(false);

  // Ref para trackear el entityId anterior
  const prevEntityIdRef = useRef(entityId);

  // =============================================================================
  // SINCRONIZACIÓN CON BACKEND
  // =============================================================================
  
  /**
   * Sincroniza cuando:
   * 1. Cambia el entityId (navegas a otro negocio) → resetea todo
   * 2. Llegan datos del backend (initialLiked/initialFollowed cambian) → actualiza
   */
  useEffect(() => {
    // Si cambió la entidad, resetear completamente
    if (prevEntityIdRef.current !== entityId) {
      prevEntityIdRef.current = entityId;
      setLiked(initialLiked ?? false);
      setFollowed(initialFollowed ?? false);
      return;
    }

    // Si es la misma entidad, solo sincronizar valores que cambiaron
    setLiked(initialLiked ?? false);
    setFollowed(initialFollowed ?? false);
  }, [entityId, initialLiked, initialFollowed]);

  // =============================================================================
  // FUNCIONES DE LIKE
  // =============================================================================
  
  /**
   * Da like a la entidad
   */
  const darLike = async () => {
    // Actualización optimista
    const estadoAnterior = liked;
    setLiked(true);
    onLikeChange?.(true);

    try {
      setLoading(true);

      await api.post('/votos', {
        entityType,
        entityId,
        tipoAccion: 'like',
        votanteSucursalId: sucursalActiva || null,
      });

      invalidarCaches();
    } catch (error: any) {
      console.error('❌ Error al dar like:', error);
      
      // Reversión: volver al estado anterior
      setLiked(estadoAnterior);
      onLikeChange?.(estadoAnterior);
      
      // Notificar error
      if (error.response?.status === 400) {
        // Ya existe el like (no debería pasar por la validación optimista)
        notificar.info('Ya diste like a esto');
      } else if (error.response?.status === 401) {
        notificar.error('Debes iniciar sesión para dar like');
      } else {
        notificar.error('Error al dar like');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Quita el like de la entidad
   */
  const quitarLike = async () => {
    // Actualización optimista
    const estadoAnterior = liked;
    setLiked(false);
    onLikeChange?.(false);

    try {
      setLoading(true);

      // votanteSucursalId se agrega automáticamente por el interceptor en modo comercial
      await api.delete(`/votos/${entityType}/${entityId}/like`);

      invalidarCaches();
    } catch (error: any) {
      console.error('❌ Error al quitar like:', error);
      
      // Reversión: volver al estado anterior
      setLiked(estadoAnterior);
      onLikeChange?.(estadoAnterior);
      
      // Notificar error
      if (error.response?.status === 404) {
        // No existe el like (no debería pasar por la validación optimista)
        notificar.info('No has dado like a esto');
      } else if (error.response?.status === 401) {
        notificar.error('Debes iniciar sesión');
      } else {
        notificar.error('Error al quitar like');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle like (dar si no tiene, quitar si ya tiene)
   */
  const toggleLike = async () => {
    if (liked) {
      await quitarLike();
    } else {
      await darLike();
    }
  };

  // =============================================================================
  // FUNCIONES DE SAVE (SEGUIDOS)
  // =============================================================================
  
  /**
   * Guarda la entidad en seguidos
   */
  const seguir = async () => {
    // Actualización optimista
    const estadoAnterior = followed;
    setFollowed(true);
    onFollowChange?.(true);

    try {
      setLoading(true);

      await api.post('/votos', {
        entityType,
        entityId,
        tipoAccion: 'follow',
        votanteSucursalId: sucursalActiva || null,
      });

      notificar.exito('¡Siguiendo!');
      invalidarCaches();
    } catch (error: any) {
      console.error('❌ Error al seguir:', error);
      
      // Reversión: volver al estado anterior
      setFollowed(estadoAnterior);
      onFollowChange?.(estadoAnterior);
      
      // Notificar error
      if (error.response?.status === 400) {
        notificar.info('Ya sigues este negocio');
      } else if (error.response?.status === 401) {
        notificar.error('Debes iniciar sesión para seguir');
      } else {
        notificar.error('Error al seguir');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Quita la entidad de seguidos
   */
  const dejarDeSeguir = async () => {
    // Actualización optimista
    const estadoAnterior = followed;
    setFollowed(false);
    onFollowChange?.(false);

    try {
      setLoading(true);

      // votanteSucursalId se agrega automáticamente por el interceptor en modo comercial
      await api.delete(`/votos/${entityType}/${entityId}/follow`);

      notificar.info('Dejaste de seguir');
      invalidarCaches();
    } catch (error: any) {
      console.error('❌ Error al quitar de guardados:', error);
      
      // Reversión: volver al estado anterior
      setFollowed(estadoAnterior);
      onFollowChange?.(estadoAnterior);
      
      // Notificar error
      if (error.response?.status === 404) {
        notificar.info('No está en seguidos');
      } else if (error.response?.status === 401) {
        notificar.error('Debes iniciar sesión');
      } else {
        notificar.error('Error al quitar de seguidos');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle follow (seguir si no está, quitar si ya está)
   */
  const toggleFollow = async () => {
    if (followed) {
      await dejarDeSeguir();
    } else {
      await seguir();
    }
  };

  // =============================================================================
  // RETURN
  // =============================================================================
  
  return {
    liked,
    followed,
    loading,
    toggleLike,
    toggleFollow,
    darLike,
    quitarLike,
    seguir,
    dejarDeSeguir,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useVotos;