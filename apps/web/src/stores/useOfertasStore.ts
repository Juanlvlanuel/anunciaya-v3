/**
 * ============================================================================
 * STORE: Ofertas Cache (Zustand)
 * ============================================================================
 * 
 * PROPÓSITO:
 * Store global para cachear ofertas
 * Evita fetch repetidos al navegar entre páginas
 * 
 * FEATURES:
 * - Caché de ofertas por sucursal
 * - Invalidación automática después de 30 minutos
 * - Invalidación manual en CRUD
 * - Actualizaciones optimistas
 * 
 * UBICACIÓN: apps/web/src/stores/useOfertasStore.ts
 */

import { create } from 'zustand';
import type { Oferta } from '../types/ofertas';

// =============================================================================
// TIPOS
// =============================================================================

interface CacheData {
    ofertas: Oferta[];
    timestamp: number; // Cuándo se cargaron
}

interface OfertasState {
    // Cache por sucursal (key: sucursalId, value: datos + timestamp)
    cache: Record<string, CacheData>;
    
    // Estado de carga actual
    loading: boolean;
    
    // =======================================================================
    // GETTERS
    // =======================================================================
    
    /**
     * Obtener ofertas de la caché (si existen y no están vencidas)
     * @param sucursalId - ID de la sucursal
     * @param maxAge - Tiempo máximo de vida del caché en ms (default: 30 min)
     * @returns Ofertas o null si no hay caché válida
     */
    getOfertas: (sucursalId: string, maxAge?: number) => Oferta[] | null;
    
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
     * Guardar ofertas en la caché
     * @param sucursalId - ID de la sucursal
     * @param ofertas - Array de ofertas
     */
    setOfertas: (sucursalId: string, ofertas: Oferta[]) => void;
    
    /**
     * Actualizar una oferta específica en la caché (actualización optimista)
     * @param sucursalId - ID de la sucursal
     * @param ofertaId - ID de la oferta
     * @param actualizacion - Datos parciales para actualizar
     */
    actualizarOferta: (
        sucursalId: string,
        ofertaId: string,
        actualizacion: Partial<Oferta>
    ) => void;
    
    /**
     * Agregar una nueva oferta a la caché (actualización optimista)
     * @param sucursalId - ID de la sucursal
     * @param oferta - Oferta nueva
     */
    agregarOferta: (sucursalId: string, oferta: Oferta) => void;
    
    /**
     * Eliminar una oferta de la caché (actualización optimista)
     * @param sucursalId - ID de la sucursal
     * @param ofertaId - ID de la oferta a eliminar
     */
    eliminarOferta: (sucursalId: string, ofertaId: string) => void;
    
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

export const useOfertasStore = create<OfertasState>((set, get) => ({
    cache: {},
    loading: false,
    
    // =========================================================================
    // GETTERS
    // =========================================================================
    
    getOfertas: (sucursalId: string, maxAge = CACHE_MAX_AGE) => {
        const { cache } = get();
        const cacheData = cache[sucursalId];
        
        if (!cacheData) return null;
        
        const ahora = Date.now();
        const edad = ahora - cacheData.timestamp;
        
        // Si el caché es muy viejo, retornar null
        if (edad > maxAge) {
            return null;
        }
        
        return cacheData.ofertas;
    },
    
    tieneCache: (sucursalId: string, maxAge = CACHE_MAX_AGE) => {
        const ofertas = get().getOfertas(sucursalId, maxAge);
        return ofertas !== null;
    },
    
    // =========================================================================
    // SETTERS
    // =========================================================================
    
    setOfertas: (sucursalId: string, ofertas: Oferta[]) => {
        set((state) => ({
            cache: {
                ...state.cache,
                [sucursalId]: {
                    ofertas,
                    timestamp: Date.now(),
                },
            },
        }));
    },
    
    actualizarOferta: (
        sucursalId: string,
        ofertaId: string,
        actualizacion: Partial<Oferta>
    ) => {
        set((state) => {
            const cacheData = state.cache[sucursalId];
            if (!cacheData) return state;
            
            const ofertasActualizadas = cacheData.ofertas.map((off) =>
                off.id === ofertaId ? { ...off, ...actualizacion } : off
            );
            
            return {
                cache: {
                    ...state.cache,
                    [sucursalId]: {
                        ofertas: ofertasActualizadas,
                        timestamp: cacheData.timestamp, // Mantener timestamp original
                    },
                },
            };
        });
    },
    
    agregarOferta: (sucursalId: string, oferta: Oferta) => {
        set((state) => {
            const cacheData = state.cache[sucursalId];
            if (!cacheData) return state;
            
            return {
                cache: {
                    ...state.cache,
                    [sucursalId]: {
                        ofertas: [oferta, ...cacheData.ofertas],
                        timestamp: cacheData.timestamp,
                    },
                },
            };
        });
    },
    
    eliminarOferta: (sucursalId: string, ofertaId: string) => {
        set((state) => {
            const cacheData = state.cache[sucursalId];
            if (!cacheData) return state;
            
            const ofertasFiltradas = cacheData.ofertas.filter(
                (off) => off.id !== ofertaId
            );
            
            return {
                cache: {
                    ...state.cache,
                    [sucursalId]: {
                        ofertas: ofertasFiltradas,
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