/**
 * ============================================================================
 * HOOK: useGuardados
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useGuardados.ts
 * 
 * PROPÓSITO:
 * Hook para manejar guardados con actualización optimista
 * Reutilizable para ofertas, rifas y empleos
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
import { api } from '../services/api';
import { notificar } from '../utils/notificaciones';

// =============================================================================
// TIPOS
// =============================================================================

type EntityType = 'oferta' | 'rifa' | 'empleo';

interface UseGuardadosParams {
  /**
   * Tipo de entidad (oferta, rifa, empleo)
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

    try {
      setLoading(true);

      await api.post('/guardados', {
        entityType,
        entityId,
      });

      notificar.exito('¡Guardado!');

    } catch (error: unknown) {
      console.error('❌ Error al agregar a guardados:', error);
      
      // Reversión: volver al estado anterior
      setGuardado(estadoAnterior);
      onGuardadoChange?.(estadoAnterior);
      
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

    try {
      setLoading(true);

      await api.delete(`/guardados/${entityType}/${entityId}`);

      notificar.info('Quitado de guardados');

    } catch (error: unknown) {
      console.error('❌ Error al quitar de guardados:', error);
      
      // Reversión: volver al estado anterior
      setGuardado(estadoAnterior);
      onGuardadoChange?.(estadoAnterior);
      
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