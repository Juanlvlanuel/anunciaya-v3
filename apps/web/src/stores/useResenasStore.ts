/**
 * ============================================================================
 * STORE: Reseñas / Opiniones Cache (Zustand)
 * ============================================================================
 *
 * PROPÓSITO:
 * Store global para cachear reseñas y KPIs del módulo Opiniones de Business Studio.
 * Evita fetch repetidos al navegar entre páginas.
 *
 * FEATURES:
 * - Caché de reseñas + KPIs por sucursal
 * - Invalidación automática después de 30 minutos
 * - Respuesta optimista al responder reseña (actualiza UI antes de confirmar backend)
 *
 * PATRÓN: Mismo que useOfertasStore / useArticulosStore
 *
 * UBICACIÓN: apps/web/src/stores/useResenasStore.ts
 */

import { create } from 'zustand';
import type { ResenaBS, KPIsResenas } from '../types/resenas';

// =============================================================================
// TIPOS
// =============================================================================

interface CacheData {
    resenas: ResenaBS[];
    kpis: KPIsResenas | null;
    timestamp: number;
}

interface ResenasState {
    // Caché por sucursal (key: sucursalId, value: datos + timestamp)
    cache: Record<string, CacheData>;

    // Estado de carga
    loading: boolean;

    // ─── GETTERS ───

    /** Obtener reseñas de la caché (si existen y no están vencidas) */
    getResenas: (sucursalId: string, maxAge?: number) => ResenaBS[] | null;

    /** Obtener KPIs de la caché (si existen y no están vencidos) */
    getKPIs: (sucursalId: string, maxAge?: number) => KPIsResenas | null;

    /** Verificar si hay caché válida para una sucursal */
    tieneCache: (sucursalId: string, maxAge?: number) => boolean;

    // ─── SETTERS ───

    /** Guardar reseñas y KPIs en la caché */
    setDatos: (sucursalId: string, resenas: ResenaBS[], kpis: KPIsResenas) => void;

    /** Actualizar una reseña específica en la caché (respuesta optimista) */
    actualizarResena: (
        sucursalId: string,
        resenaId: string,
        actualizacion: Partial<ResenaBS>
    ) => void;

    /** Actualizar KPIs en la caché (optimista) */
    actualizarKPIs: (
        sucursalId: string,
        actualizacion: Partial<KPIsResenas>
    ) => void;

    /** Invalidar caché de una sucursal */
    invalidarCache: (sucursalId: string) => void;

    /** Invalidar toda la caché */
    invalidarTodo: () => void;

    /** Setear estado de loading */
    setLoading: (loading: boolean) => void;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutos

// =============================================================================
// STORE
// =============================================================================

export const useResenasStore = create<ResenasState>((set, get) => ({
    cache: {},
    loading: false,

    // ─── GETTERS ───

    getResenas: (sucursalId: string, maxAge = CACHE_MAX_AGE) => {
        const cacheData = get().cache[sucursalId];
        if (!cacheData) return null;
        if (Date.now() - cacheData.timestamp > maxAge) return null;
        return cacheData.resenas;
    },

    getKPIs: (sucursalId: string, maxAge = CACHE_MAX_AGE) => {
        const cacheData = get().cache[sucursalId];
        if (!cacheData) return null;
        if (Date.now() - cacheData.timestamp > maxAge) return null;
        return cacheData.kpis;
    },

    tieneCache: (sucursalId: string, maxAge = CACHE_MAX_AGE) => {
        return get().getResenas(sucursalId, maxAge) !== null;
    },

    // ─── SETTERS ───

    setDatos: (sucursalId: string, resenas: ResenaBS[], kpis: KPIsResenas) => {
        set((state) => ({
            cache: {
                ...state.cache,
                [sucursalId]: {
                    resenas,
                    kpis,
                    timestamp: Date.now(),
                },
            },
        }));
    },

    actualizarResena: (sucursalId: string, resenaId: string, actualizacion: Partial<ResenaBS>) => {
        set((state) => {
            const cacheData = state.cache[sucursalId];
            if (!cacheData) return state;

            return {
                cache: {
                    ...state.cache,
                    [sucursalId]: {
                        ...cacheData,
                        resenas: cacheData.resenas.map((r) =>
                            r.id === resenaId ? { ...r, ...actualizacion } : r
                        ),
                    },
                },
            };
        });
    },

    actualizarKPIs: (sucursalId: string, actualizacion: Partial<KPIsResenas>) => {
        set((state) => {
            const cacheData = state.cache[sucursalId];
            if (!cacheData || !cacheData.kpis) return state;

            return {
                cache: {
                    ...state.cache,
                    [sucursalId]: {
                        ...cacheData,
                        kpis: { ...cacheData.kpis, ...actualizacion },
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