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

/**
 * Construye una `Vacante` optimista a partir del payload de creación para
 * insertarla en la tabla al instante (antes de que el POST responda). Los
 * contadores nacen en 0 y el estado en 'activa'; `onSettled` reconcilia con
 * la fila real del backend (que trae id definitivo, expira_at exacto, etc.).
 */
function construirVacanteOptimista(
    input: CrearVacanteInput,
    sucursalNombre: string | null,
    usuarioId: string,
    negocioId: string,
): Vacante {
    const ahora = new Date().toISOString();
    const expira = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return {
        id: `optimistic-${Date.now()}`,
        usuarioId,
        sucursalId: input.sucursalId,
        negocioId,
        negocioNombre: null,
        negocioLogo: null,
        sucursalNombre,
        sucursalPortada: null,
        sucursalFotoPerfil: null,
        modo: 'ofrezco',
        tipo: 'vacante-empresa',
        subtipo: null,
        titulo: input.titulo,
        descripcion: input.descripcion,
        fotos: [],
        fotoPortadaIndex: 0,
        precio: input.precio,
        modalidad: input.modalidad,
        ubicacionAproximada: { lat: input.latitud, lng: input.longitud },
        ciudad: input.ciudad,
        zonasAproximadas: input.zonasAproximadas ?? [],
        skills: [],
        requisitos: input.requisitos,
        horario: input.horario ?? null,
        diasSemana: input.diasSemana ?? [],
        tipoEmpleo: input.tipoEmpleo,
        beneficios: input.beneficios ?? [],
        presupuesto: null,
        categoria: null,
        urgente: false,
        estado: 'activa',
        totalVistas: 0,
        totalMensajes: 0,
        totalGuardados: 0,
        expiraAt: expira,
        createdAt: ahora,
        updatedAt: ahora,
        oferenteResumen: null,
        totalComentarios: 0,
    };
}

/** Contexto del optimismo para poder revertir en caso de error. */
interface ContextoCrearVacante {
    snapshotListas: [readonly unknown[], RespuestaVacantes | undefined][];
    kpisKey: readonly unknown[];
    kpisPrev: KpisVacantes | undefined;
}

export function useCrearVacanteBS() {
    const queryClient = useQueryClient();
    return useMutation<
        RespuestaCrearVacante,
        unknown,
        CrearVacanteInput,
        ContextoCrearVacante
    >({
        mutationFn: async (input: CrearVacanteInput): Promise<RespuestaCrearVacante> => {
            const response = await api.post<RespuestaCrearVacante>(
                '/business-studio/vacantes',
                input,
            );
            return response.data;
        },
        // Optimismo: insertamos la fila en el cache antes de que responda el POST
        // para que la tabla la muestre al instante tras "Publicar vacante".
        onMutate: async (input): Promise<ContextoCrearVacante> => {
            await queryClient.cancelQueries({ queryKey: queryKeys.vacantes.all() });

            const { usuario } = useAuthStore.getState();
            const negocioId = usuario?.negocioId ?? '';
            const sucursales =
                queryClient.getQueryData<{ id: string; nombre: string }[]>(
                    queryKeys.perfil.sucursales(negocioId),
                ) ?? [];
            const sucursalNombre =
                sucursales.find((s) => s.id === input.sucursalId)?.nombre ?? null;

            const optimista = construirVacanteOptimista(
                input,
                sucursalNombre,
                usuario?.id ?? '',
                negocioId,
            );

            // Snapshot de todas las listas de esa sucursal (para rollback).
            const snapshotListas = queryClient.getQueriesData<RespuestaVacantes>({
                queryKey: ['vacantes', 'lista', input.sucursalId],
            });

            // Insertar al inicio en las variantes de lista compatibles con la
            // vacante recién creada (estado activa/todas y que matchee la
            // búsqueda si hay una activa).
            queryClient
                .getQueryCache()
                .findAll({ queryKey: ['vacantes', 'lista', input.sucursalId] })
                .forEach((q) => {
                    const filtros = q.queryKey[3] as FiltrosVacantes | undefined;
                    if (filtros?.estado && filtros.estado !== 'activa') return;
                    if (
                        filtros?.busqueda &&
                        !optimista.titulo
                            .toLowerCase()
                            .includes(filtros.busqueda.toLowerCase())
                    ) {
                        return;
                    }
                    queryClient.setQueryData<RespuestaVacantes>(q.queryKey, (old) =>
                        old
                            ? {
                                  data: [optimista, ...old.data],
                                  paginacion: {
                                      ...old.paginacion,
                                      total: old.paginacion.total + 1,
                                  },
                              }
                            : old,
                    );
                });

            // KPIs: +1 total y +1 activas de forma optimista.
            const kpisKey = queryKeys.vacantes.kpis(input.sucursalId);
            const kpisPrev = queryClient.getQueryData<KpisVacantes>(kpisKey);
            if (kpisPrev) {
                queryClient.setQueryData<KpisVacantes>(kpisKey, {
                    ...kpisPrev,
                    total: kpisPrev.total + 1,
                    activas: kpisPrev.activas + 1,
                });
            }

            return { snapshotListas, kpisKey, kpisPrev };
        },
        onError: (_error, _input, ctx) => {
            // Revertir la inserción optimista.
            ctx?.snapshotListas.forEach(([key, data]) => {
                queryClient.setQueryData(key, data);
            });
            if (ctx?.kpisPrev) {
                queryClient.setQueryData(ctx.kpisKey, ctx.kpisPrev);
            }
        },
        onSettled: () => {
            // Reconciliar con el backend (reemplaza la fila optimista por la real)
            // e invalidar el feed público de Servicios, donde la vacante también
            // aparece (tipo='vacante-empresa').
            queryClient.invalidateQueries({ queryKey: queryKeys.vacantes.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.servicios.all() });
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
            queryClient.invalidateQueries({ queryKey: queryKeys.servicios.all() });
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
            queryClient.invalidateQueries({ queryKey: queryKeys.servicios.all() });
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
            queryClient.invalidateQueries({ queryKey: queryKeys.servicios.all() });
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
            queryClient.invalidateQueries({ queryKey: queryKeys.servicios.all() });
        },
    });
}
