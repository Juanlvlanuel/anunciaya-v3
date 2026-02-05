/**
 * ============================================================================
 * HOOK: usePerfilNegocio (v2 - CON CACHÉ)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/usePerfilNegocio.ts
 * 
 * PROPÓSITO:
 * Hook para obtener el PERFIL COMPLETO de una sucursal específica
 * Ahora con soporte para caché - carga instantánea si hay pre-fetch
 * 
 * CARACTERÍSTICAS:
 * - ✅ Busca en caché primero (instantáneo si existe)
 * - ✅ Fetch automático al montar (si se proporciona ID)
 * - ✅ Guarda resultado en caché para futuras visitas
 * - ✅ Obtiene perfil completo con todas las relaciones
 * - ✅ Maneja loading, error, data
 * - ✅ Función refetch manual
 * - ✅ TypeScript completo
 * 
 * FLUJO:
 * 1. ¿Existe en caché? → Mostrar inmediato (loading=false)
 * 2. ¿No existe? → Mostrar loading, hacer fetch
 * 3. Al recibir datos → Guardar en caché
 * 
 * USO:
 * ```tsx
 * function PerfilNegocio() {
 *   const { sucursalId } = useParams();
 *   const { negocio, loading, error, refetch } = usePerfilNegocio(sucursalId);
 *   
 *   // Si hubo pre-fetch, loading será false desde el inicio
 *   if (loading) return <Spinner />;
 *   if (error) return <Error mensaje={error} />;
 *   if (!negocio) return <NotFound />;
 *   
 *   return <DetalleNegocio negocio={negocio} />;
 * }
 * ```
 */

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useNegociosCacheStore } from '../stores/useNegociosCacheStore';
import type { NegocioCompleto, RespuestaPerfilNegocio } from '../types/negocios';

// =============================================================================
// TIPOS
// =============================================================================

interface UsePerfilNegocioResult {
  negocio: NegocioCompleto | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Indica si los datos vinieron del caché (para debug) */
  fromCache: boolean;
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
  
  /**
   * Si es true, siempre hace fetch aunque exista en caché
   * Útil para forzar datos frescos
   * Default: false
   */
  skipCache?: boolean;
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
 */
export function usePerfilNegocio(
  sucursalId: string | undefined,
  options: UsePerfilNegocioOptions = {}
): UsePerfilNegocioResult {
  const { manual = false, onSuccess, onError, skipCache = false } = options;

  // Store de caché
  const { obtenerPerfilCache, guardarPerfilCache } = useNegociosCacheStore();

  // =============================================================================
  // VERIFICAR CACHÉ INICIAL
  // =============================================================================
  
  // Intentar obtener del caché al inicializar
  const datosIniciales = !skipCache && sucursalId ? obtenerPerfilCache(sucursalId) : null;
  const tieneCache = datosIniciales !== null;

  // =============================================================================
  // ESTADO LOCAL
  // =============================================================================
  
  const [negocio, setNegocio] = useState<NegocioCompleto | null>(datosIniciales);
  const [loading, setLoading] = useState(!manual && !!sucursalId && !tieneCache);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(tieneCache);
  
  // Ref para evitar callbacks duplicados
  const callbackEjecutado = useRef(false);

  // =============================================================================
  // FUNCIÓN DE FETCH
  // =============================================================================
  
  /**
   * Realiza la petición al backend para obtener el perfil completo
   */
  const fetchNegocio = async (forzar = false) => {
    // Validar que existe el ID
    if (!sucursalId) {
      const errorMsg = 'ID de sucursal no proporcionado';
      setError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
      return;
    }

    // Si no forzamos y ya tenemos datos del caché, no hacer fetch
    if (!forzar && negocio && fromCache) {
      // Solo ejecutar callback si no se ha ejecutado
      if (!callbackEjecutado.current) {
        callbackEjecutado.current = true;
        onSuccess?.(negocio);
      }
      return;
    }

    try {
      // Solo mostrar loading si no tenemos datos del caché
      if (!negocio) {
        setLoading(true);
      }
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
        setFromCache(false);
        
        // Guardar en caché para futuras visitas
        guardarPerfilCache(sucursalId, negocioData);
        
        // Ejecutar callback de éxito
        if (!callbackEjecutado.current) {
          callbackEjecutado.current = true;
          onSuccess?.(negocioData);
        }
      } else {
        throw new Error('Respuesta inválida del servidor');
      }

    } catch (err: any) {
      console.error('❌ Error al obtener perfil de negocio:', err);
      
      // Mensajes de error amigables
      let errorMsg: string;
      
      if (err.response?.status === 404) {
        errorMsg = 'Negocio no encontrado';
      } else if (err.response?.status === 403) {
        errorMsg = 'No tienes permiso para ver este negocio';
      } else if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        errorMsg = 'No hay conexión a internet';
      } else {
        errorMsg = err.response?.data?.message || err.message || 'Error al cargar negocio';
      }
      
      // Solo mostrar error si no tenemos datos del caché
      if (!negocio) {
        setError(errorMsg);
        setNegocio(null);
      }
      
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
   * Si hay datos en caché, los usa inmediatamente
   */
  useEffect(() => {
    // Reset del ref cuando cambia el ID
    callbackEjecutado.current = false;
    
    if (!manual && sucursalId) {
      // Verificar caché nuevamente (por si cambió el ID)
      const cacheado = !skipCache ? obtenerPerfilCache(sucursalId) : null;
      
      if (cacheado) {
        // Tenemos datos en caché - mostrar inmediato
        setNegocio(cacheado);
        setLoading(false);
        setFromCache(true);
        setError(null);
        
        // Ejecutar callback
        if (!callbackEjecutado.current) {
          callbackEjecutado.current = true;
          onSuccess?.(cacheado);
        }
      } else {
        // No hay caché - hacer fetch normal
        setFromCache(false);
        fetchNegocio();
      }
    }
  }, [sucursalId, manual, skipCache]);

  // =============================================================================
  // RETURN
  // =============================================================================
  
  return {
    negocio,
    loading,
    error,
    refetch: () => fetchNegocio(true), // Forzar fetch ignorando caché
    fromCache,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default usePerfilNegocio;