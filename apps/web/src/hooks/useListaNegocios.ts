/**
 * ============================================================================
 * HOOK: useListaNegocios
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/hooks/useListaNegocios.ts
 * 
 * PROPÓSITO:
 * Hook para obtener la LISTA de negocios cercanos con filtros
 * 
 * CARACTERÍSTICAS:
 * - Fetch automático al montar el componente
 * - Lee filtros del store useFiltrosNegociosStore
 * - Maneja loading, error, data
 * - Función refetch manual
 * - TypeScript completo
 * - ✅ keepPreviousData: Mantiene datos mientras carga (evita parpadeo)
 * - ✅ GPS con useRef: Evita re-fetches cuando cambian las coordenadas
 * 
 * USO:
 * ```tsx
 * function ListaNegocios() {
 *   const { negocios, loading, isRefetching, error, refetch } = useListaNegocios();
 *   
 *   // loading = true solo en carga inicial (sin datos previos)
 *   // isRefetching = true cuando hay datos previos y se están actualizando
 *   
 *   if (loading) return <Spinner />;
 *   if (error) return <Error mensaje={error} />;
 *   
 *   return negocios.map(n => <TarjetaNegocio key={n.sucursalId} negocio={n} />);
 * }
 * ```
 */

import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useFiltrosNegociosStore } from '../stores/useFiltrosNegociosStore';
import { useGpsStore } from '../stores/useGpsStore';
import { useNegociosCacheStore } from '../stores/useNegociosCacheStore';
import type { NegocioResumen, RespuestaListaNegocios } from '../types/negocios';

// =============================================================================
// TIPOS
// =============================================================================

interface UseListaNegociosResult {
  negocios: NegocioResumen[];
  /** true solo en la carga inicial (cuando no hay datos previos) */
  loading: boolean;
  /** true cuando se están actualizando datos (pero hay datos previos visibles) */
  isRefetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseListaNegociosOptions {
  /**
   * Si es true, NO hace fetch automático al montar
   * Útil si quieres esperar a que el usuario confirme su ubicación
   */
  manual?: boolean;

  /**
   * Si es true, NO incluye coordenadas GPS en la petición
   * Útil para modo "explorar sin ubicación"
   */
  sinUbicacion?: boolean;
}

// =============================================================================
// HOOK PRINCIPAL
// =============================================================================

/**
 * Hook para obtener lista de negocios cercanos
 * 
 * @param options - Configuración del hook
 * @returns Estado y funciones para manejar la lista
 * 
 * @example
 * // Fetch automático con GPS
 * const { negocios, loading, error } = useListaNegocios();
 * 
 * @example
 * // Fetch manual (esperar acción del usuario)
 * const { negocios, loading, refetch } = useListaNegocios({ manual: true });
 * // Después...
 * await refetch();
 * 
 * @example
 * // Sin usar GPS (orden por likes)
 * const { negocios } = useListaNegocios({ sinUbicacion: true });
 */
export function useListaNegocios(options: UseListaNegociosOptions = {}): UseListaNegociosResult {
  const { manual = false, sinUbicacion = false } = options;

  // ✅ Store de caché para lista de negocios
  const { obtenerListaCache, guardarListaCache } = useNegociosCacheStore();


  // =============================================================================
  // ESTADO LOCAL
  // =============================================================================

  // ✅ Intentar obtener del caché al inicializar (solo si no hay filtros activos)
  const datosIniciales = !manual ? obtenerListaCache() : null;
  const tieneCache = datosIniciales !== null && datosIniciales.length > 0;

  const [negocios, setNegocios] = useState<NegocioResumen[]>(datosIniciales || []);
  const [error, setError] = useState<string | null>(null);

  // Estados separados para carga inicial vs actualización
  // ✅ Si hay caché, no mostrar loading inicial
  const [loading, setLoading] = useState(!manual && !tieneCache);
  const [isRefetching, setIsRefetching] = useState(false);

  // Ref para saber si ya se hizo la primera carga
  // ✅ Si hay caché, marcar como que ya cargó
  const hasLoadedOnce = useRef(tieneCache);

  // ✅ NUEVO: Ref para coordenadas GPS (evita re-renders cuando cambian)
  const coordenadasRef = useRef<{ latitud: number | null; longitud: number | null }>({
    latitud: null,
    longitud: null,
  });

  // =============================================================================
  // STORES GLOBALES
  // =============================================================================

  // Filtros seleccionados por el usuario
  const {
    categoria,
    subcategorias,
    distancia,
    metodosPago,
    soloCardya,
    conEnvio,
    busqueda,
  } = useFiltrosNegociosStore();

  // Ubicación GPS del usuario
  const { latitud, longitud } = useGpsStore();

  // ✅ NUEVO: Actualizar ref cuando cambien las coordenadas (sin causar re-fetch)
  useEffect(() => {
    coordenadasRef.current = { latitud, longitud };
  }, [latitud, longitud]);

  // =============================================================================
  // FUNCIÓN DE FETCH
  // =============================================================================

  /**
   * Realiza la petición al backend para obtener negocios
   * Construye query params dinámicamente según filtros activos
   * 
   * ✅ MEJORA: No limpia los datos previos mientras carga
   * ✅ MEJORA: Lee coordenadas del ref (no causa re-renders)
   */
  const fetchNegocios = async () => {
    try {
      // Si ya hay datos, solo marca isRefetching (no loading)
      if (hasLoadedOnce.current) {
        setIsRefetching(true);
      } else {
        setLoading(true);
      }

      setError(null);

      // ===================================================================
      // CONSTRUIR QUERY PARAMS
      // ===================================================================

      const params: Record<string, any> = {};

      // ✅ CAMBIO: Leer coordenadas del ref en lugar del estado
      const { latitud: lat, longitud: lng } = coordenadasRef.current;

      // Coordenadas GPS (si no está deshabilitado)
      if (!sinUbicacion && lat && lng) {
        params.latitud = lat;
        params.longitud = lng;
        params.distanciaMaxKm = distancia;
      }

      // Categoría principal
      if (categoria) {
        params.categoriaId = categoria;
      }

      // Subcategorías (convertir array a string separado por comas)
      if (subcategorias.length > 0) {
        params.subcategoriaIds = subcategorias.join(',');
      }

      // Métodos de pago (convertir array a string separado por comas)
      if (metodosPago.length > 0) {
        params.metodosPago = metodosPago.join(',');
      }

      // Solo negocios que aceptan CardYA
      if (soloCardya) {
        params.aceptaCardYA = true;
      }

      // Solo negocios con envío a domicilio
      if (conEnvio) {
        params.tieneEnvio = true;
      }

      // Búsqueda por texto
      if (busqueda.trim()) {
        params.busqueda = busqueda.trim();
      }

      // Paginación (por ahora límite fijo, después se puede hacer infinita)
      params.limite = 20;
      params.offset = 0;

      // ===================================================================
      // HACER PETICIÓN
      // ===================================================================


      const response = await api.get<RespuestaListaNegocios>('/negocios', {
        params,
      });

      // ===================================================================
      // PROCESAR RESPUESTA
      // ===================================================================

      if (response.data.success) {
        setNegocios(response.data.data);
        hasLoadedOnce.current = true;

        // ✅ Guardar en caché (solo si no hay filtros activos)
        const hayFiltrosActivos = categoria || subcategorias.length > 0 ||
          metodosPago.length > 0 || soloCardya || conEnvio || busqueda.trim();

        if (!hayFiltrosActivos) {
          guardarListaCache(response.data.data);
        }
      } else {
        throw new Error('Respuesta inválida del servidor');
      }

    } catch (err: any) {
      console.error('❌ Error al obtener negocios:', err);

      // Mensajes de error amigables
      if (err.response?.status === 401) {
        setError('Debes iniciar sesión para ver negocios');
      } else if (err.response?.status === 404) {
        setError('No se encontraron negocios con esos filtros');
      } else if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
        setError('No hay conexión a internet');
      } else {
        setError(err.message || 'Error al cargar negocios');
      }

      // Solo limpiar negocios si es error crítico (401)
      if (err.response?.status === 401) {
        setNegocios([]);
      }
      // Si es otro error, mantener los datos previos

    } finally {
      setLoading(false);
      setIsRefetching(false);
    }
  };

  // =============================================================================
  // EFECTOS
  // =============================================================================

  /**
   * Efecto que ejecuta el fetch cuando cambian los filtros
   * Solo se ejecuta si NO está en modo manual
   * 
   * ✅ CAMBIO: Ya no incluye latitud/longitud en dependencias
   */
  useEffect(() => {
    if (!manual) {
      fetchNegocios();
    }
  }, [
    // Re-fetch cuando cambien estos valores (filtros del usuario)
    categoria,
    subcategorias,
    distancia,
    metodosPago,
    soloCardya,
    conEnvio,
    busqueda,
    sinUbicacion,
    manual,
    // ❌ REMOVIDO: latitud, longitud (ahora se leen del ref)
  ]);

  // =============================================================================
  // RETURN
  // =============================================================================

  return {
    negocios,
    loading,
    isRefetching,
    error,
    refetch: fetchNegocios,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default useListaNegocios;