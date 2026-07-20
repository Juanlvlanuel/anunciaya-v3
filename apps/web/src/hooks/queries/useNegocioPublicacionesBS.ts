/**
 * useNegocioPublicacionesBS.ts
 * =============================
 * Hooks React Query del módulo Publicaciones en Business Studio: "mis
 * publicaciones" (listado de administración de la sucursal, incluye
 * archivadas) + KPIs. Separado de `useNegocioPublicaciones.ts` (feed público)
 * porque depende de `sucursalActiva`/`modoActivo`, mismo criterio que separar
 * `useVacantesBS.ts` del módulo público de Servicios.
 *
 * Las mutaciones de crear/editar/archivar viven en `useNegocioPublicaciones.ts`
 * (ya reusadas por el composer del feed público) — este archivo solo agrega
 * el listado y los KPIs propios de BS.
 *
 * Ubicación: apps/web/src/hooks/queries/useNegocioPublicacionesBS.ts
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import { useAuthStore } from '../../stores/useAuthStore';
import type {
    KpisPublicacionesNegocio,
    RespuestaListadoPublicacionesBS,
} from '../../types/negocioPublicaciones';

// =============================================================================
// FILTROS
// =============================================================================

export interface FiltrosPublicacionesBS {
    estado?: 'activa' | 'archivada';
    busqueda?: string;
    pagina?: number;
    limite?: number;
}

// =============================================================================
// 1) MIS PUBLICACIONES
// =============================================================================

/**
 * `GET /api/negocio-publicaciones/mias`
 * Lista filtrada por la sucursal activa del usuario, incluye archivadas.
 */
export function useMisPublicacionesNegocioBS(filtros: FiltrosPublicacionesBS = {}) {
    const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
    const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
    const habilitado = !!sucursalId && modoActivo === 'comercial';

    const pagina = filtros.pagina ?? 1;
    const limite = filtros.limite ?? 20;

    return useQuery({
        queryKey: queryKeys.negocioPublicacionesBS.lista(sucursalId, {
            estado: filtros.estado,
            busqueda: filtros.busqueda,
            pagina,
            limite,
        }),
        queryFn: async (): Promise<RespuestaListadoPublicacionesBS> => {
            const response = await api.get<{
                success: boolean;
                data?: RespuestaListadoPublicacionesBS;
            }>('/negocio-publicaciones/mias', {
                params: {
                    ...(filtros.estado ? { estado: filtros.estado } : {}),
                    ...(filtros.busqueda ? { busqueda: filtros.busqueda } : {}),
                    pagina,
                    limite,
                },
            });
            return response.data.data ?? { publicaciones: [], total: 0 };
        },
        enabled: habilitado,
        staleTime: 30 * 1000,
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// 2) KPIs
// =============================================================================

/**
 * `GET /api/negocio-publicaciones/kpis`
 * Las métricas del header: Total / Activas / Archivadas / Vistas / Comentarios.
 */
export function useKpisPublicacionesNegocioBS() {
    const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
    const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
    const habilitado = !!sucursalId && modoActivo === 'comercial';

    return useQuery({
        queryKey: queryKeys.negocioPublicacionesBS.kpis(sucursalId),
        queryFn: async (): Promise<KpisPublicacionesNegocio> => {
            const response = await api.get<{
                success: boolean;
                data?: KpisPublicacionesNegocio;
            }>('/negocio-publicaciones/kpis');
            return (
                response.data.data ?? {
                    total: 0,
                    activas: 0,
                    archivadas: 0,
                    totalVistas: 0,
                    totalComentarios: 0,
                }
            );
        },
        enabled: habilitado,
        staleTime: 30 * 1000,
        placeholderData: keepPreviousData,
    });
}
