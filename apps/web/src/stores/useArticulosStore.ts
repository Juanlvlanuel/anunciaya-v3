/**
 * ============================================================================
 * STORE: Artículos Cache (Zustand)
 * ============================================================================
 * 
 * PROPÓSITO:
 * Store global para cachear artículos del catálogo
 * Evita fetch repetidos al navegar entre páginas
 * 
 * FEATURES:
 * - Caché de artículos por sucursal
 * - Invalidación automática después de 30 minutos
 * - Invalidación manual en CRUD
 * - Actualizaciones optimistas
 * 
 * UBICACIÓN: apps/web/src/stores/useArticulosStore.ts
 */

import { create } from 'zustand';
import type { Articulo } from '../types/articulos';

// =============================================================================
// TIPOS
// =============================================================================

interface CacheData {
    articulos: Articulo[];
    timestamp: number; // Cuándo se cargaron
}

interface ArticulosState {
    // Cache por sucursal (key: sucursalId, value: datos + timestamp)
    cache: Record<string, CacheData>;
    
    // Estado de carga actual
    loading: boolean;
    
    // =======================================================================
    // GETTERS
    // =======================================================================
    
    /**
     * Obtener artículos de la caché (si existen y no están vencidos)
     * @param sucursalId - ID de la sucursal
     * @param maxAge - Tiempo máximo de vida del caché en ms (default: 30 min)
     * @returns Artículos o null si no hay caché válida
     */
    getArticulos: (sucursalId: string, maxAge?: number) => Articulo[] | null;
    
    /**
     * Verificar si hay caché válida para una sucursal
     * @param sucursalId - ID de la sucursal
     * @param maxAge - Tiempo máximo de vida del caché en ms (default: 30 min)
     */
    tieneCache: (sucursalId: string, maxAge?: number) => boolean;
    
    // =======================================================================
    // SETTERS
    // =======================================================================
    
    /**
     * Guardar artículos en la caché
     * @param sucursalId - ID de la sucursal
     * @param articulos - Array de artículos
     */
    setArticulos: (sucursalId: string, articulos: Articulo[]) => void;
    
    /**
     * Actualizar un artículo específico en la caché (actualización optimista)
     * @param sucursalId - ID de la sucursal
     * @param articuloId - ID del artículo
     * @param actualizacion - Datos parciales para actualizar
     */
    actualizarArticulo: (
        sucursalId: string,
        articuloId: string,
        actualizacion: Partial<Articulo>
    ) => void;
    
    /**
     * Agregar un nuevo artículo a la caché (actualización optimista)
     * @param sucursalId - ID de la sucursal
     * @param articulo - Artículo nuevo
     */
    agregarArticulo: (sucursalId: string, articulo: Articulo) => void;
    
    /**
     * Eliminar un artículo de la caché (actualización optimista)
     * @param sucursalId - ID de la sucursal
     * @param articuloId - ID del artículo a eliminar
     */
    eliminarArticulo: (sucursalId: string, articuloId: string) => void;
    
    /**
     * Invalidar caché de una sucursal específica
     * @param sucursalId - ID de la sucursal
     */
    invalidarCache: (sucursalId: string) => void;
    
    /**
     * Invalidar toda la caché (útil al cambiar de negocio)
     */
    invalidarTodo: () => void;
    
    /**
     * Setear estado de loading
     */
    setLoading: (loading: boolean) => void;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutos en milisegundos

// =============================================================================
// STORE
// =============================================================================

export const useArticulosStore = create<ArticulosState>((set, get) => ({
    cache: {},
    loading: false,
    
    // =========================================================================
    // GETTERS
    // =========================================================================
    
    getArticulos: (sucursalId: string, maxAge = CACHE_MAX_AGE) => {
        const { cache } = get();
        const cacheData = cache[sucursalId];
        
        if (!cacheData) return null;
        
        const ahora = Date.now();
        const edad = ahora - cacheData.timestamp;
        
        // Si el caché es muy viejo, retornar null
        if (edad > maxAge) {
            return null;
        }
        
        return cacheData.articulos;
    },
    
    tieneCache: (sucursalId: string, maxAge = CACHE_MAX_AGE) => {
        const articulos = get().getArticulos(sucursalId, maxAge);
        return articulos !== null;
    },
    
    // =========================================================================
    // SETTERS
    // =========================================================================
    
    setArticulos: (sucursalId: string, articulos: Articulo[]) => {
        set((state) => ({
            cache: {
                ...state.cache,
                [sucursalId]: {
                    articulos,
                    timestamp: Date.now(),
                },
            },
        }));
    },
    
    actualizarArticulo: (
        sucursalId: string,
        articuloId: string,
        actualizacion: Partial<Articulo>
    ) => {
        set((state) => {
            const cacheData = state.cache[sucursalId];
            if (!cacheData) return state;
            
            const articulosActualizados = cacheData.articulos.map((art) =>
                art.id === articuloId ? { ...art, ...actualizacion } : art
            );
            
            return {
                cache: {
                    ...state.cache,
                    [sucursalId]: {
                        articulos: articulosActualizados,
                        timestamp: cacheData.timestamp, // Mantener timestamp original
                    },
                },
            };
        });
    },
    
    agregarArticulo: (sucursalId: string, articulo: Articulo) => {
        set((state) => {
            const cacheData = state.cache[sucursalId];
            if (!cacheData) return state;
            
            return {
                cache: {
                    ...state.cache,
                    [sucursalId]: {
                        articulos: [articulo, ...cacheData.articulos],
                        timestamp: cacheData.timestamp,
                    },
                },
            };
        });
    },
    
    eliminarArticulo: (sucursalId: string, articuloId: string) => {
        set((state) => {
            const cacheData = state.cache[sucursalId];
            if (!cacheData) return state;
            
            const articulosFiltrados = cacheData.articulos.filter(
                (art) => art.id !== articuloId
            );
            
            return {
                cache: {
                    ...state.cache,
                    [sucursalId]: {
                        articulos: articulosFiltrados,
                        timestamp: cacheData.timestamp,
                    },
                },
            };
        });
    },
    
    invalidarCache: (sucursalId: string) => {
        set((state) => {
            const newCache = { ...state.cache };
            delete newCache[sucursalId];
            return { cache: newCache };
        });
    },
    
    invalidarTodo: () => {
        set({ cache: {} });
    },
    
    setLoading: (loading: boolean) => {
        set({ loading });
    },
}));