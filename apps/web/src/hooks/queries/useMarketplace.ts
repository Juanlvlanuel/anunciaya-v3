/**
 * useMarketplace.ts
 * ==================
 * Hooks de React Query para la sección pública del MarketPlace.
 *
 * Sprint 2 expone solo el feed. Detalle individual, mis-articulos, perfil del
 * vendedor y buscador llegan en sprints siguientes (3, 5, 6).
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md
 * Sprint:      docs/prompts Marketplace/Sprint-2-Feed-Frontend.md
 *
 * Ubicación: apps/web/src/hooks/queries/useMarketplace.ts
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import type { FeedMarketplace, ArticuloMarketplaceDetalle } from '../../types/marketplace';

// =============================================================================
// FEED DEL MARKETPLACE (recientes + cercanos)
// =============================================================================

interface UseMarketplaceFeedParams {
    ciudad: string | null | undefined;
    lat: number | null | undefined;
    lng: number | null | undefined;
}

/**
 * Consume `GET /api/marketplace/feed?ciudad=...&lat=...&lng=...`.
 *
 * Decisión de staleTime:
 * - El doc maestro sugería 2 min para "recientes" y 5 min para "cercanos",
 *   pero ambos arrays vienen del mismo endpoint en una sola request.
 *   Diferenciar staleTime requeriría partir el endpoint en dos, sin ganancia
 *   real (la BD es la misma, las queries son rápidas con índice GIST).
 *   Mantengo un único staleTime de 2 min — más conservador que 5, y suficiente
 *   para evitar refetches en tabs/navegación rápida.
 *
 * Decisión de enabled:
 * - Solo dispara cuando hay ciudad + lat + lng. Sin GPS no se pide el feed
 *   (la página muestra mensaje de "activa ubicación").
 *
 * Decisión de placeholderData:
 * - `keepPreviousData` por la regla obligatoria del PATRON_REACT_QUERY: evita
 *   temblor visual cuando cambia la ciudad o el GPS se actualiza.
 */
export function useMarketplaceFeed(params: UseMarketplaceFeedParams) {
    const { ciudad, lat, lng } = params;
    const habilitado = !!ciudad && lat !== null && lat !== undefined && lng !== null && lng !== undefined;

    return useQuery({
        queryKey: queryKeys.marketplace.feed({
            ciudad: ciudad ?? '',
            lat: lat ?? 0,
            lng: lng ?? 0,
        }),
        queryFn: async (): Promise<FeedMarketplace> => {
            const response = await api.get<{ success: boolean; data: FeedMarketplace }>(
                '/marketplace/feed',
                { params: { ciudad, lat, lng } }
            );
            return response.data.success
                ? response.data.data
                : { recientes: [], cercanos: [] };
        },
        enabled: habilitado,
        staleTime: 2 * 60 * 1000,
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// DETALLE DEL ARTÍCULO
// =============================================================================

/**
 * Consume `GET /api/marketplace/articulos/:id`.
 *
 * Devuelve el artículo completo con datos del vendedor (incluye `telefono`
 * para el botón WhatsApp). El backend NO devuelve `ubicacion` exacta, solo
 * `ubicacionAproximada` (decisión de privacidad — círculo de 500m).
 *
 * Se permite `staleTime` corto (1 min) — el detalle cambia poco una vez
 * publicado, pero queremos refrescar `total_vistas` y `total_guardados` con
 * relativa frecuencia para que el vendedor vea sus métricas casi en vivo.
 */
export function useArticuloMarketplace(articuloId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.marketplace.articulo(articuloId ?? ''),
        queryFn: async (): Promise<ArticuloMarketplaceDetalle | null> => {
            const response = await api.get<{
                success: boolean;
                data?: ArticuloMarketplaceDetalle;
                message?: string;
            }>(`/marketplace/articulos/${articuloId}`);
            if (!response.data.success || !response.data.data) return null;
            return response.data.data;
        },
        enabled: !!articuloId,
        staleTime: 60 * 1000,
        // No retry si es 404 — el endpoint devuelve 404 limpio para artículos
        // inexistentes/eliminados, no es un error transitorio.
        retry: (failureCount, error) => {
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status === 404) return false;
            return failureCount < 2;
        },
    });
}

// =============================================================================
// REGISTRAR VISTA (fire-and-forget)
// =============================================================================

const STORAGE_PREFIX_VISTA = 'vista_marketplace_';

/**
 * Registra una vista del artículo en el backend (incrementa `total_vistas`).
 *
 * Reglas de negocio:
 * - El caller decide si llamar (la página filtra `vendedor.id !== usuario.id`
 *   para que el dueño no infle sus propias métricas).
 * - Dedupe por sesión vía `sessionStorage`: un mismo visitante que recarga la
 *   página varias veces no infla el contador. Se resetea al cerrar la pestaña.
 * - Fire-and-forget: errores se silencian (la vista no es crítica para UX).
 */
export async function registrarVistaArticulo(articuloId: string): Promise<void> {
    const key = `${STORAGE_PREFIX_VISTA}${articuloId}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) {
        return;
    }
    try {
        await api.post(`/marketplace/articulos/${articuloId}/vista`);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(key, '1');
        }
    } catch {
        // Silencioso a propósito.
    }
}
