/**
 * useVacantesBS.ts
 * =================
 * Hooks React Query del módulo Vacantes en Business Studio (Sprint 8).
 *
 * Los hooks toman la `sucursalActiva` del `useAuthStore` para filtrar las
 * queries — el interceptor de Axios manda `?sucursalId=` automáticamente y el
 * middleware backend `validarAccesoSucursal` ya validó el permiso.
 *
 * Patrón calcado de `useTransacciones.ts` (mismas convenciones de modo
 * comercial, sucursal activa, keepPreviousData).
 *
 * Ubicación: apps/web/src/hooks/queries/useVacantesBS.ts
 */

import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import { useAuthStore } from '../../stores/useAuthStore';
import type {
    Vacante,
    KpisVacantes,
    CrearVacanteInput,
    ActualizarVacanteInput,
    RespuestaVacantes,
} from '../../types/servicios';

// =============================================================================
// FILTROS
// =============================================================================

export interface FiltrosVacantes {
    estado?: 'activa' | 'pausada' | 'cerrada';
    busqueda?: string;
    limit?: number;
    offset?: number;
}

// =============================================================================
// 1) LISTAR VACANTES
// =============================================================================

/**
 * `GET /api/business-studio/vacantes?estado=&busqueda=&limit=&offset=`
 * Lista filtrada por la sucursal activa del usuario.
 */
export function useVacantesBS(filtros: FiltrosVacantes = {}) {
    const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
    const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
    const habilitado = !!sucursalId && modoActivo === 'comercial';

    const limit = filtros.limit ?? 50;
    const offset = filtros.offset ?? 0;

    return useQuery({
        queryKey: queryKeys.vacantes.lista(sucursalId, {
            estado: filtros.estado,
            busqueda: filtros.busqueda,
            limit,
            offset,
        }),
        queryFn: async (): Promise<RespuestaVacantes> => {
            const response = await api.get<{
                success: boolean;
                data?: Vacante[];
                paginacion?: RespuestaVacantes['paginacion'];
            }>('/business-studio/vacantes', {
                params: {
                    ...(filtros.estado ? { estado: filtros.estado } : {}),
                    ...(filtros.busqueda ? { busqueda: filtros.busqueda } : {}),
                    limit,
                    offset,
                },
            });
            if (response.data.success && response.data.data) {
                return {
                    data: response.data.data,
                    paginacion:
                        response.data.paginacion ?? {
                            limit,
                            offset,
                            total: response.data.data.length,
                        },
                };
            }
            return { data: [], paginacion: { limit, offset, total: 0 } };
        },
        enabled: habilitado,
        staleTime: 30 * 1000,
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// 2) KPIs DEL DASHBOARD
// =============================================================================

/**
 * `GET /api/business-studio/vacantes/kpis`
 * Las 4 métricas del header de la página (Total/Activas/Por expirar/Conversaciones).
 */
export function useKpisVacantesBS() {
    const sucursalId = useAuthStore((s) => s.usuario?.sucursalActiva ?? '');
    const modoActivo = useAuthStore((s) => s.usuario?.modoActivo);
    const habilitado = !!sucursalId && modoActivo === 'comercial';

    return useQuery({
        queryKey: queryKeys.vacantes.kpis(sucursalId),
        queryFn: async (): Promise<KpisVacantes> => {
            const response = await api.get<{
                success: boolean;
                data?: KpisVacantes;
            }>('/business-studio/vacantes/kpis');
            return (
                response.data.data ?? {
                    total: 0,
                    activas: 0,
                    porExpirar: 0,
                    conversaciones: 0,
                }
            );
        },
        enabled: habilitado,
        staleTime: 30 * 1000,
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// 3) CREAR VACANTE
// =============================================================================

interface RespuestaCrearVacante {
    success: boolean;
    code?: number;
    data?: { id: string };
    message?: string;
}

export function useCrearVacanteBS() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (input: CrearVacanteInput): Promise<RespuestaCrearVacante> => {
            const response = await api.post<RespuestaCrearVacante>(
                '/business-studio/vacantes',
                input,
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.vacantes.all() });
        },
    });
}

// =============================================================================
// 4) ACTUALIZAR VACANTE
// =============================================================================

interface RespuestaSimple {
    success: boolean;
    code?: number;
    message?: string;
}

export function useActualizarVacanteBS() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            cambios,
        }: {
            id: string;
            cambios: ActualizarVacanteInput;
        }): Promise<RespuestaSimple> => {
            const response = await api.put<RespuestaSimple>(
                `/business-studio/vacantes/${id}`,
                cambios,
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.vacantes.all() });
        },
    });
}

// =============================================================================
// 5) CAMBIAR ESTADO (pausar/reactivar)
// =============================================================================

export function useCambiarEstadoVacanteBS() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            estado,
        }: {
            id: string;
            estado: 'activa' | 'pausada';
        }): Promise<RespuestaSimple> => {
            const response = await api.patch<RespuestaSimple>(
                `/business-studio/vacantes/${id}/estado`,
                { estado },
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.vacantes.all() });
        },
    });
}

// =============================================================================
// 6) CERRAR VACANTE (puesto cubierto)
// =============================================================================

export function useCerrarVacanteBS() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string): Promise<RespuestaSimple> => {
            const response = await api.patch<RespuestaSimple>(
                `/business-studio/vacantes/${id}/cerrar`,
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.vacantes.all() });
        },
    });
}

// =============================================================================
// 7) ELIMINAR VACANTE
// =============================================================================

export function useEliminarVacanteBS() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string): Promise<RespuestaSimple> => {
            const response = await api.delete<RespuestaSimple>(
                `/business-studio/vacantes/${id}`,
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.vacantes.all() });
        },
    });
}
