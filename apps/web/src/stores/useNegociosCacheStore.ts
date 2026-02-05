/**
 * ============================================================================
 * STORE: useNegociosCacheStore (v3 - COMPLETO + LISTA)
 * ============================================================================
 * 
 * UBICACIÓN: apps/web/src/stores/useNegociosCacheStore.ts
 * 
 * PROPÓSITO:
 * Caché completo de negocios para carga instantánea
 * Incluye: lista de negocios, perfil, ofertas y catálogo
 * 
 * CARACTERÍSTICAS:
 * - Pre-fetch de lista de negocios (desde Navbar)
 * - Pre-fetch completo de perfil (perfil + ofertas + catálogo)
 * - Usa requestIdleCallback para no bloquear UI
 * - Caché con expiración (5 minutos)
 * - Evita requests duplicados
 * - Limpieza automática de caché antiguo
 * 
 * USO:
 * ```tsx
 * // Pre-fetch de lista (en hover del botón Negocios)
 * const { prefetchListaNegocios } = useNegociosCacheStore();
 * onMouseEnter={() => prefetchListaNegocios()}
 * 
 * // Pre-fetch completo de perfil (en hover de tarjeta)
 * const { prefetchCompleto } = useNegociosCacheStore();
 * onMouseEnter={() => prefetchCompleto(sucursalId)}
 * ```
 */

import { create } from 'zustand';
import { api } from '../services/api';
import { useGpsStore } from './useGpsStore';
import type { NegocioCompleto, NegocioResumen, RespuestaPerfilNegocio, RespuestaListaNegocios } from '../types/negocios';

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

/** Tiempo de vida del caché en milisegundos (5 minutos) */
const CACHE_TTL = 5 * 60 * 1000;

/** Máximo de negocios en caché (evita uso excesivo de memoria) */
const MAX_CACHE_SIZE = 20;

// =============================================================================
// TIPOS
// =============================================================================

interface Oferta {
  id: string;
  titulo: string;
  descripcion?: string;
  imagen?: string;
  tipo: 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'otro';
  valor?: number | string;
  fechaFin?: string;
}

interface ItemCatalogo {
  id: string;
  tipo: string;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  precioBase: string;
  precioDesde?: boolean | null;
  imagenPrincipal?: string | null;
  requiereCita?: boolean | null;
  duracionEstimada?: number | null;
  disponible?: boolean | null;
  destacado?: boolean | null;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface ListaCacheEntry {
  data: NegocioResumen[];
  timestamp: number;
  /** Coordenadas usadas para esta lista (para validar si cambió la ubicación) */
  coordenadas: { latitud: number | null; longitud: number | null };
}

interface NegociosCacheState {
  // =========================================================================
  // CACHÉ DE LISTA DE NEGOCIOS
  // =========================================================================
  
  /** Lista de negocios cacheada (sin filtros, ubicación actual) */
  listaNegocios: ListaCacheEntry | null;
  
  /** Flag para saber si está cargando la lista */
  loadingLista: boolean;
  
  // =========================================================================
  // CACHÉ DE PERFILES INDIVIDUALES
  // =========================================================================
  
  /** Caché de perfiles indexado por sucursalId */
  perfiles: Record<string, CacheEntry<NegocioCompleto>>;
  
  /** Caché de ofertas indexado por sucursalId */
  ofertas: Record<string, CacheEntry<Oferta[]>>;
  
  /** Caché de catálogo indexado por sucursalId */
  catalogo: Record<string, CacheEntry<ItemCatalogo[]>>;
  
  /** IDs que están siendo cargados (evita duplicados) */
  loading: Set<string>;
  
  // =========================================================================
  // FUNCIONES: LISTA DE NEGOCIOS
  // =========================================================================
  
  /** 
   * Pre-carga la lista de negocios en background
   * Usar en onMouseEnter del botón "Negocios" en el Navbar
   */
  prefetchListaNegocios: () => void;
  
  /**
   * Obtiene lista del caché si existe, no ha expirado y la ubicación coincide
   */
  obtenerListaCache: () => NegocioResumen[] | null;
  
  /**
   * Guarda lista en el caché manualmente
   */
  guardarListaCache: (data: NegocioResumen[]) => void;
  
  // =========================================================================
  // FUNCIONES: PERFIL INDIVIDUAL
  // =========================================================================
  
  /** 
   * Pre-carga TODO el contenido de un negocio en background
   * Optimizado para no bloquear UI
   */
  prefetchCompleto: (sucursalId: string) => void;
  
  /**
   * Obtiene perfil del caché si existe y no ha expirado
   */
  obtenerPerfilCache: (sucursalId: string) => NegocioCompleto | null;
  
  /**
   * Obtiene ofertas del caché si existen y no han expirado
   */
  obtenerOfertasCache: (sucursalId: string) => Oferta[] | null;
  
  /**
   * Obtiene catálogo del caché si existe y no ha expirado
   */
  obtenerCatalogoCache: (sucursalId: string) => ItemCatalogo[] | null;
  
  /**
   * Guarda perfil en el caché manualmente
   */
  guardarPerfilCache: (sucursalId: string, data: NegocioCompleto) => void;
  
  /**
   * Guarda ofertas en el caché manualmente
   */
  guardarOfertasCache: (sucursalId: string, data: Oferta[]) => void;
  
  /**
   * Guarda catálogo en el caché manualmente
   */
  guardarCatalogoCache: (sucursalId: string, data: ItemCatalogo[]) => void;
  
  // =========================================================================
  // FUNCIONES: UTILIDADES
  // =========================================================================
  
  /**
   * Invalida todo el caché de un negocio
   */
  invalidar: (sucursalId: string) => void;
  
  /**
   * Invalida la lista de negocios
   */
  invalidarLista: () => void;
  
  /**
   * Limpia todo el caché
   */
  limpiarCache: () => void;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Ejecuta función cuando el navegador está idle
 * Evita bloquear UI durante pre-fetch
 */
const ejecutarEnIdle = (fn: () => void) => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(fn, { timeout: 100 });
  } else {
    // Fallback para Safari
    setTimeout(fn, 1);
  }
};

/**
 * Limpia entradas antiguas del caché si excede el límite
 */
const limpiarCacheAntiguo = <T>(cache: Record<string, CacheEntry<T>>): Record<string, CacheEntry<T>> => {
  const keys = Object.keys(cache);
  if (keys.length < MAX_CACHE_SIZE) return cache;
  
  // Encontrar y eliminar el más antiguo
  let oldestKey = keys[0];
  let oldestTime = cache[keys[0]].timestamp;
  
  keys.forEach((key) => {
    if (cache[key].timestamp < oldestTime) {
      oldestTime = cache[key].timestamp;
      oldestKey = key;
    }
  });
  
  const nuevoCache = { ...cache };
  delete nuevoCache[oldestKey];
  return nuevoCache;
};

/**
 * Verifica si una entrada del caché es válida (no expirada)
 */
const esValido = <T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
};

// =============================================================================
// STORE
// =============================================================================

export const useNegociosCacheStore = create<NegociosCacheState>((set, get) => ({
  // Estado inicial
  listaNegocios: null,
  loadingLista: false,
  perfiles: {},
  ofertas: {},
  catalogo: {},
  loading: new Set(),

  // ===========================================================================
  // PRE-FETCH LISTA DE NEGOCIOS
  // ===========================================================================
  
  prefetchListaNegocios: () => {
    const state = get();
    
    // Si ya está cargando, no duplicar
    if (state.loadingLista) return;
    
    // Obtener coordenadas actuales del GPS store
    const { latitud, longitud } = useGpsStore.getState();
    
    // Verificar si el caché es válido
    if (state.listaNegocios) {
      const { timestamp, coordenadas } = state.listaNegocios;
      const noExpirado = Date.now() - timestamp < CACHE_TTL;
      const mismaUbicacion = 
        coordenadas.latitud === latitud && 
        coordenadas.longitud === longitud;
      
      // Si no ha expirado y es la misma ubicación, no hacer nada
      if (noExpirado && mismaUbicacion) return;
    }
    
    // Ejecutar en idle para no bloquear UI
    ejecutarEnIdle(async () => {
      set({ loadingLista: true });
      
      try {
        // Construir params (sin filtros, solo ubicación)
        const params: Record<string, any> = {
          limite: 20,
          offset: 0,
        };
        
        if (latitud && longitud) {
          params.latitud = latitud;
          params.longitud = longitud;
          params.distanciaMaxKm = 10; // Distancia por defecto
        }
        
        const response = await api.get<RespuestaListaNegocios>('/negocios', { params });
        
        if (response.data.success) {
          set({
            listaNegocios: {
              data: response.data.data,
              timestamp: Date.now(),
              coordenadas: { latitud, longitud },
            },
          });
        }
      } catch (error) {
        console.debug('[Cache] Error prefetch lista negocios');
      } finally {
        set({ loadingLista: false });
      }
    });
  },
  
  obtenerListaCache: () => {
    const state = get();
    if (!state.listaNegocios) return null;
    
    const { timestamp, coordenadas, data } = state.listaNegocios;
    
    // Verificar expiración
    if (Date.now() - timestamp > CACHE_TTL) {
      set({ listaNegocios: null });
      return null;
    }
    
    // Verificar que la ubicación no haya cambiado significativamente
    const { latitud, longitud } = useGpsStore.getState();
    if (coordenadas.latitud !== latitud || coordenadas.longitud !== longitud) {
      // Ubicación cambió, invalidar caché
      set({ listaNegocios: null });
      return null;
    }
    
    return data;
  },
  
  guardarListaCache: (data: NegocioResumen[]) => {
    const { latitud, longitud } = useGpsStore.getState();
    set({
      listaNegocios: {
        data,
        timestamp: Date.now(),
        coordenadas: { latitud, longitud },
      },
    });
  },

  // ===========================================================================
  // PRE-FETCH COMPLETO (Perfil + Ofertas + Catálogo)
  // ===========================================================================
  
  prefetchCompleto: (sucursalId: string) => {
    // Validar ID
    if (!sucursalId) return;
    
    const state = get();
    
    // Si ya está cargando, no duplicar
    if (state.loading.has(sucursalId)) return;
    
    // Si todo está en caché y válido, no hacer nada
    const perfilValido = esValido(state.perfiles[sucursalId]);
    const ofertasValido = esValido(state.ofertas[sucursalId]);
    const catalogoValido = esValido(state.catalogo[sucursalId]);
    
    if (perfilValido && ofertasValido && catalogoValido) return;
    
    // Ejecutar en idle para no bloquear UI
    ejecutarEnIdle(async () => {
      // Marcar como cargando
      set((s) => ({
        loading: new Set([...s.loading, sucursalId]),
      }));
      
      try {
        // =====================================================================
        // PASO 1: Fetch del perfil (si no está en caché)
        // =====================================================================
        
        let perfil: NegocioCompleto | null = null;
        
        if (!perfilValido) {
          try {
            const response = await api.get<RespuestaPerfilNegocio>(
              `/negocios/sucursal/${sucursalId}`
            );
            
            if (response.data.success && response.data.data) {
              perfil = response.data.data;
              
              // Guardar en caché
              set((s) => ({
                perfiles: limpiarCacheAntiguo({
                  ...s.perfiles,
                  [sucursalId]: { data: perfil!, timestamp: Date.now() },
                }),
              }));
            }
          } catch (error) {
            console.debug('[Cache] Error prefetch perfil:', sucursalId);
          }
        } else {
          perfil = state.perfiles[sucursalId].data;
        }
        
        // Si no tenemos perfil, no podemos continuar
        if (!perfil) {
          return;
        }
        
        // =====================================================================
        // PASO 2: Fetch de ofertas y catálogo en PARALELO
        // =====================================================================
        
        const promesas: Promise<void>[] = [];
        
        // Ofertas (si no está en caché)
        if (!ofertasValido) {
          promesas.push(
            (async () => {
              try {
                const fechaLocal = new Date().toLocaleDateString('en-CA');
                const response = await api.get('/ofertas/feed', {
                  params: { sucursalId, limite: 50, fechaLocal }
                });
                
                if (response.data.success && response.data.data) {
                  const ofertasMapeadas: Oferta[] = response.data.data.map((o: any) => ({
                    id: o.ofertaId,
                    titulo: o.titulo,
                    descripcion: o.descripcion,
                    imagen: o.imagen,
                    tipo: o.tipo,
                    valor: o.valor != null ? (isNaN(Number(o.valor)) ? o.valor : Number(o.valor)) : undefined,
                    fechaFin: o.fechaFin,
                  }));
                  
                  set((s) => ({
                    ofertas: limpiarCacheAntiguo({
                      ...s.ofertas,
                      [sucursalId]: { data: ofertasMapeadas, timestamp: Date.now() },
                    }),
                  }));
                }
              } catch (error) {
                console.debug('[Cache] Error prefetch ofertas:', sucursalId);
              }
            })()
          );
        }
        
        // Catálogo (si no está en caché)
        if (!catalogoValido && perfil.negocioId) {
          promesas.push(
            (async () => {
              try {
                const response = await api.get(`/articulos/negocio/${perfil!.negocioId}`);
                
                if (response.data.success) {
                  set((s) => ({
                    catalogo: limpiarCacheAntiguo({
                      ...s.catalogo,
                      [sucursalId]: { data: response.data.data || [], timestamp: Date.now() },
                    }),
                  }));
                }
              } catch (error) {
                console.debug('[Cache] Error prefetch catálogo:', sucursalId);
              }
            })()
          );
        }
        
        // Esperar que terminen en paralelo
        await Promise.all(promesas);
        
      } finally {
        // Quitar de loading
        set((s) => {
          const newLoading = new Set(s.loading);
          newLoading.delete(sucursalId);
          return { loading: newLoading };
        });
      }
    });
  },

  // ===========================================================================
  // OBTENER DEL CACHÉ
  // ===========================================================================
  
  obtenerPerfilCache: (sucursalId: string) => {
    if (!sucursalId) return null;
    const entry = get().perfiles[sucursalId];
    return esValido(entry) ? entry.data : null;
  },
  
  obtenerOfertasCache: (sucursalId: string) => {
    if (!sucursalId) return null;
    const entry = get().ofertas[sucursalId];
    return esValido(entry) ? entry.data : null;
  },
  
  obtenerCatalogoCache: (sucursalId: string) => {
    if (!sucursalId) return null;
    const entry = get().catalogo[sucursalId];
    return esValido(entry) ? entry.data : null;
  },

  // ===========================================================================
  // GUARDAR EN CACHÉ (manual)
  // ===========================================================================
  
  guardarPerfilCache: (sucursalId: string, data: NegocioCompleto) => {
    if (!sucursalId || !data) return;
    set((s) => ({
      perfiles: limpiarCacheAntiguo({
        ...s.perfiles,
        [sucursalId]: { data, timestamp: Date.now() },
      }),
    }));
  },
  
  guardarOfertasCache: (sucursalId: string, data: Oferta[]) => {
    if (!sucursalId) return;
    set((s) => ({
      ofertas: limpiarCacheAntiguo({
        ...s.ofertas,
        [sucursalId]: { data, timestamp: Date.now() },
      }),
    }));
  },
  
  guardarCatalogoCache: (sucursalId: string, data: ItemCatalogo[]) => {
    if (!sucursalId) return;
    set((s) => ({
      catalogo: limpiarCacheAntiguo({
        ...s.catalogo,
        [sucursalId]: { data, timestamp: Date.now() },
      }),
    }));
  },

  // ===========================================================================
  // INVALIDAR
  // ===========================================================================
  
  invalidar: (sucursalId: string) => {
    set((s) => {
      const nuevosPerfiles = { ...s.perfiles };
      const nuevasOfertas = { ...s.ofertas };
      const nuevoCatalogo = { ...s.catalogo };
      
      delete nuevosPerfiles[sucursalId];
      delete nuevasOfertas[sucursalId];
      delete nuevoCatalogo[sucursalId];
      
      return {
        perfiles: nuevosPerfiles,
        ofertas: nuevasOfertas,
        catalogo: nuevoCatalogo,
      };
    });
  },
  
  invalidarLista: () => {
    set({ listaNegocios: null });
  },

  // ===========================================================================
  // LIMPIAR TODO
  // ===========================================================================
  
  limpiarCache: () => {
    set({ 
      listaNegocios: null,
      loadingLista: false,
      perfiles: {}, 
      ofertas: {}, 
      catalogo: {}, 
      loading: new Set() 
    });
  },
}));

// =============================================================================
// EXPORTS
// =============================================================================

export default useNegociosCacheStore;

// Re-export tipos para uso externo
export type { Oferta, ItemCatalogo };