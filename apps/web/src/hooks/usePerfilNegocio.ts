/**
 * ============================================================================
 * HOOK: usePerfilNegocio
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/usePerfilNegocio.ts
 * 
 * PROPÓSITO:
 * Hook para obtener el PERFIL COMPLETO de una sucursal específica
 * Incluye todos los datos para mostrar en la página de detalle
 * 
 * CARACTERÍSTICAS:
 * - Fetch automático al montar (si se proporciona ID)
 * - Obtiene perfil completo con todas las relaciones
 * - Maneja loading, error, data
 * - Función refetch manual
 * - TypeScript completo
 * - Detección automática de cambios en liked/saved
 * 
 * USO:
 * ```tsx
 * function PerfilNegocio() {
 *   const { sucursalId } = useParams();
 *   const { negocio, loading, error, refetch } = usePerfilNegocio(sucursalId);
 *   
 *   if (loading) return <Spinner />;
 *   if (error) return <Error mensaje={error} />;
 *   if (!negocio) return <NotFound />;
 *   
 *   return <DetalleNegocio negocio={negocio} />;
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { NegocioCompleto, RespuestaPerfilNegocio } from '../types/negocios';

// =============================================================================
// TIPOS
// =============================================================================

interface UsePerfilNegocioResult {
  negocio: NegocioCompleto | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UsePerfilNegocioOptions {
  /**
   * Si es true, NO hace fetch automático al montar
   * Útil si quieres esperar alguna confirmación del usuario
   */
  manual?: boolean;
  
  /**
   * Callback que se ejecuta cuando se carga exitosamente el negocio
   * Útil para analytics, registrar vista, etc.
   */
  onSuccess?: (negocio: NegocioCompleto) => void;
  
  /**
   * Callback que se ejecuta cuando hay un error
   */
  onError?: (error: string) => void;
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

/**
 * Hook para obtener perfil completo de una sucursal
 * 
 * @param sucursalId - UUID de la sucursal a obtener
 * @param options - Configuración del hook
 * @returns Estado y funciones para manejar el perfil
 * 
 * @example
 * // Uso básico con react-router
 * const { sucursalId } = useParams();
 * const { negocio, loading, error } = usePerfilNegocio(sucursalId);
 * 
 * @example
 * // Con callback para registrar vista
 * const { negocio } = usePerfilNegocio(sucursalId, {
 *   onSuccess: (negocio) => {
 *     // Registrar vista en métricas
 *     api.post('/metricas/view', {
 *       entityType: 'sucursal',
 *       entityId: negocio.sucursalId
 *     });
 *   }
 * });
 * 
 * @example
 * // Fetch manual
 * const { negocio, refetch } = usePerfilNegocio(sucursalId, { manual: true });
 * // Después...
 * await refetch();
 */
export function usePerfilNegocio(
  sucursalId: string | undefined,
  options: UsePerfilNegocioOptions = {}
): UsePerfilNegocioResult {
  const { manual = false, onSuccess, onError } = options;

  // =============================================================================
  // ESTADO LOCAL
  // =============================================================================
  
  const [negocio, setNegocio] = useState<NegocioCompleto | null>(null);
  const [loading, setLoading] = useState(!manual && !!sucursalId);
  const [error, setError] = useState<string | null>(null);

  // =============================================================================
  // FUNCIÓN DE FETCH
  // =============================================================================
  
  /**
   * Realiza la petición al backend para obtener el perfil completo
   */
  const fetchNegocio = async () => {
    // Validar que existe el ID
    if (!sucursalId) {
      const errorMsg = 'ID de sucursal no proporcionado';
      setError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
      return;
    }

    try {
      setLoading(true);
      setError(null);


      // ===================================================================
      // HACER PETICIÓN
      // ===================================================================
      
      const response = await api.get<RespuestaPerfilNegocio>(
        `/negocios/sucursal/${sucursalId}`
      );

      // ===================================================================
      // PROCESAR RESPUESTA
      // ===================================================================
      
      if (response.data.success && response.data.data) {
        const negocioData = response.data.data;
        setNegocio(negocioData);
        
        
        // Ejecutar callback de éxito
        onSuccess?.(negocioData);
      } else {
        throw new Error('Respuesta inválida del servidor');
      }

    } catch (err: any) {
      console.error('❌ Error al obtener perfil de negocio:', err);
      
      // Mensajes de error amigables
      let errorMsg: string;
      
      // NOTA: Ya no manejamos 401 porque el endpoint /sucursal/:id
      // funciona con auth opcional (verificarTokenOpcional)
      if (err.response?.status === 404) {
        errorMsg = 'Negocio no encontrado';
      } else if (err.response?.status === 403) {
        errorMsg = 'No tienes permiso para ver este negocio';
      } else if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        errorMsg = 'No hay conexión a internet';
      } else {
        errorMsg = err.response?.data?.message || err.message || 'Error al cargar negocio';
      }
      
      setError(errorMsg);
      setNegocio(null);
      
      // Ejecutar callback de error
      onError?.(errorMsg);
      
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // EFECTOS
  // =============================================================================
  
  /**
   * Efecto que ejecuta el fetch cuando cambia el ID
   * Solo se ejecuta si NO está en modo manual Y el ID existe
   */
  useEffect(() => {
    if (!manual && sucursalId) {
      fetchNegocio();
    }
  }, [sucursalId, manual]);

  // =============================================================================
  // RETURN
  // =============================================================================
  
  return {
    negocio,
    loading,
    error,
    refetch: fetchNegocio,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default usePerfilNegocio;