/**
 * useNegocioPublicaciones.ts
 * ============================
 * Hooks de React Query para el feed de publicaciones libres de negocio
 * (Negocios). Mismo patrón que `useMarketplace.ts`.
 *
 * Doc maestro: docs/arquitectura/Negocios.md
 * Ubicación: apps/web/src/hooks/queries/useNegocioPublicaciones.ts
 */

import { useEffect } from 'react';
import {
    useQuery,
    useInfiniteQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import { useAuthStore } from '../../stores/useAuthStore';
import type { Comentario } from '../../types/comentarios';
import type {
    PublicacionNegocioFeedItem,
    PublicacionNegocioFeedItemConComentarios,
    PublicacionNegocioDetalle,
    RespuestaFeedPublicacionesNegocio,
} from '../../types/negocioPublicaciones';

// =============================================================================
// FEED INFINITO
// =============================================================================

interface UseFeedNegocioPublicacionesParams {
    ciudad: string | null | undefined;
    sucursalId?: string;
    limite?: number;
    // ── Mismos filtros del header de Negocios (useFiltrosNegociosStore) —
    // una publicación hereda los filtros del negocio/sucursal que la hizo.
    latitud?: number | null;
    longitud?: number | null;
    /** Solo se manda cuando "Cerca de ti" está activo (ver useNegociosLista). */
    distanciaMaxKm?: number;
    categoriaId?: number | null;
    subcategoriaIds?: number[];
    aceptaCardYA?: boolean;
    aDomicilio?: boolean;
}

export function useFeedNegocioPublicaciones(params: UseFeedNegocioPublicacionesParams) {
    const {
        ciudad, sucursalId, limite = 10,
        latitud, longitud, distanciaMaxKm,
        categoriaId, subcategoriaIds, aceptaCardYA, aDomicilio,
    } = params;
    const habilitado = !!ciudad;

    const filtros = {
        ciudad: ciudad ?? '',
        sucursalId,
        latitud,
        longitud,
        distanciaMaxKm,
        categoriaId,
        subcategoriaIds,
        aceptaCardYA,
        aDomicilio,
    };

    return useInfiniteQuery({
        queryKey: queryKeys.negocioPublicaciones.feed(filtros),
        queryFn: async ({ pageParam }): Promise<RespuestaFeedPublicacionesNegocio> => {
            const response = await api.get<{
                success: boolean;
                data: RespuestaFeedPublicacionesNegocio;
            }>('/negocio-publicaciones/feed', {
                params: {
                    ciudad,
                    pagina: pageParam,
                    limite,
                    ...(sucursalId && { sucursalId }),
                    ...(latitud && longitud && { latitud, longitud }),
                    ...(distanciaMaxKm !== undefined && { distanciaMaxKm }),
                    ...(categoriaId && { categoriaId }),
                    ...(subcategoriaIds && subcategoriaIds.length > 0 && {
                        subcategoriaIds: subcategoriaIds.join(','),
                    }),
                    ...(aceptaCardYA && { aceptaCardYA: true }),
                    ...(aDomicilio && { aDomicilio: true }),
                },
            });
            return response.data.success
                ? response.data.data
                : { publicaciones: [], hayMas: false };
        },
        initialPageParam: 1,
        getNextPageParam: (ultimaPagina, paginas) =>
            ultimaPagina.hayMas ? paginas.length + 1 : undefined,
        enabled: habilitado,
        staleTime: 2 * 60 * 1000,
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// DETALLE
// =============================================================================

export function usePublicacionNegocio(
    publicacionId: string | undefined,
    gps?: { latitud?: number | null; longitud?: number | null }
) {
    const { latitud, longitud } = gps ?? {};
    return useQuery({
        queryKey: queryKeys.negocioPublicaciones.detalle(publicacionId ?? '', { latitud, longitud }),
        queryFn: async (): Promise<PublicacionNegocioDetalle | null> => {
            const response = await api.get<{
                success: boolean;
                data?: PublicacionNegocioDetalle;
            }>(`/negocio-publicaciones/${publicacionId}`, {
                params: {
                    ...(latitud && longitud && { latitud, longitud }),
                },
            });
            return response.data.success && response.data.data ? response.data.data : null;
        },
        enabled: !!publicacionId,
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status === 404) return false;
            return failureCount < 2;
        },
    });
}

// =============================================================================
// REGISTRAR VISTA (fire-and-forget, dedup por sesión)
// =============================================================================

const STORAGE_PREFIX_VISTA = 'vista_negocio_publicacion_';

export async function registrarVistaPublicacionNegocio(publicacionId: string): Promise<void> {
    const key = `${STORAGE_PREFIX_VISTA}${publicacionId}`;
    if (typeof window !== 'undefined') {
        if (sessionStorage.getItem(key)) return;
        // Se marca ANTES del await (optimista): el mismo componente se monta
        // por duplicado (bloque móvil + escritorio, alternados por CSS) y
        // dos llamadas concurrentes verían el storage vacío si se marcara
        // después de la respuesta, duplicando la vista.
        sessionStorage.setItem(key, '1');
    }
    try {
        await api.post(`/negocio-publicaciones/${publicacionId}/vista`);
    } catch {
        if (typeof window !== 'undefined') sessionStorage.removeItem(key);
    }
}

/**
 * Registra la vista de una publicación ya cargada (fire-and-forget, dedup
 * por sesión) — salta al autor para que no infle las vistas de su propia
 * publicación (mismo criterio que MarketPlace con el vendedor). Centraliza
 * la lógica de "quién puede ver esto" para que la usen por igual la página
 * de detalle y el modal de comentarios, sin depender de qué subcomponente
 * visual está montado en cada caso.
 */
export function useRegistrarVistaPublicacionNegocio(
    publicacion: PublicacionNegocioDetalle | null | undefined
): void {
    const usuarioActual = useAuthStore((s) => s.usuario);
    useEffect(() => {
        if (!publicacion) return;
        if (usuarioActual?.id === publicacion.autorUsuarioId) return;
        registrarVistaPublicacionNegocio(publicacion.id);
    }, [publicacion, usuarioActual?.id]);
}

// =============================================================================
// MUTATIONS — CREAR / ACTUALIZAR / ARCHIVAR
// =============================================================================

export interface CrearPublicacionNegocioPayload {
    texto: string;
    precio?: number | null;
    fotos: string[];
    fotoPortadaIndex?: number;
}

export type ActualizarPublicacionNegocioPayload = Partial<CrearPublicacionNegocioPayload>;

interface RespuestaMutacionPublicacion {
    success: boolean;
    message?: string;
    errores?: string[];
    data?: { id: string };
}

// sucursalId NO se pasa manual — el interceptor Axios lo agrega automático
// en modo comercial (usuario.sucursalActiva || usuario.sucursalAsignada),
// mismo patrón que ofertasService.crearOferta.

export function useCrearPublicacionNegocio() {
    const queryClient = useQueryClient();
    return useMutation<RespuestaMutacionPublicacion, unknown, CrearPublicacionNegocioPayload>({
        mutationFn: async (payload) => {
            const response = await api.post('/negocio-publicaciones', payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.negocioPublicaciones.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.negocioPublicacionesBS.all() });
        },
    });
}

export function useActualizarPublicacionNegocio() {
    const queryClient = useQueryClient();
    return useMutation<
        RespuestaMutacionPublicacion,
        unknown,
        { publicacionId: string; payload: ActualizarPublicacionNegocioPayload }
    >({
        mutationFn: async ({ publicacionId, payload }) => {
            const response = await api.put(`/negocio-publicaciones/${publicacionId}`, payload);
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.negocioPublicaciones.detalle(variables.publicacionId),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.negocioPublicaciones.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.negocioPublicacionesBS.all() });
        },
    });
}

/** Archiva (soft-delete manual, sin TTL) — solo dueño/gerente del negocio. */
export function useArchivarPublicacionNegocio() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message?: string },
        unknown,
        { publicacionId: string }
    >({
        mutationFn: async ({ publicacionId }) => {
            const response = await api.delete(`/negocio-publicaciones/${publicacionId}`);
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.negocioPublicaciones.detalle(variables.publicacionId),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.negocioPublicaciones.all() });
            queryClient.invalidateQueries({ queryKey: queryKeys.negocioPublicacionesBS.all() });
        },
    });
}

// =============================================================================
// FOTOS — Upload presigned URL / limpiar huérfana
// =============================================================================

export function useUploadFotoNegocioPublicacion() {
    return useMutation({
        mutationFn: async (vars: {
            nombreArchivo: string;
            contentType: 'image/jpeg' | 'image/png' | 'image/webp';
        }) => {
            const response = await api.post<{
                success: boolean;
                data?: { uploadUrl: string; publicUrl: string };
                message?: string;
            }>('/negocio-publicaciones/upload-imagen', vars);
            return response.data;
        },
    });
}

export function useEliminarFotoNegocioPublicacionHuerfana() {
    return useMutation({
        mutationFn: async (url: string) => {
            const response = await api.delete<{ success: boolean; message?: string }>(
                '/negocio-publicaciones/foto-huerfana',
                { data: { url } }
            );
            return response.data;
        },
    });
}

// =============================================================================
// COMENTARIOS (hilos de 1 nivel — cualquier usuario, cualquier modo)
// =============================================================================

export function useComentariosPublicacionNegocio(publicacionId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.negocioPublicaciones.comentarios(publicacionId ?? ''),
        queryFn: async (): Promise<Comentario[]> => {
            const response = await api.get<{ success: boolean; data: Comentario[] }>(
                `/negocio-publicaciones/${publicacionId}/comentarios`
            );
            return response.data.data ?? [];
        },
        enabled: !!publicacionId,
        // Sin staleTime: los comentarios son contenido social — al reabrir el
        // modal (ej. desde el deep-link de una notificación) SIEMPRE debe
        // refrescar en vez de servir el caché de hace hasta 1 min, donde un
        // comentario recién llegado podía no aparecer hasta recargar la página.
        staleTime: 0,
    });
}

// Las 3 mutaciones de abajo invalidan `comentarios(publicacionId)` (para la
// página de detalle) Y `feed` en bloque (prefix match — cualquier filtro de
// ciudad/sucursal), porque el feed trae `topComentarios` EMBEBIDOS (mismo
// patrón que `useCrearComentario` de MarketPlace invalidando
// `['marketplace', 'feed-infinito']`). Sin esto, comentar desde una card del
// feed no se reflejaría ahí hasta el próximo staleTime.
function invalidarFeedYComentarios(queryClient: ReturnType<typeof useQueryClient>, publicacionId: string) {
    queryClient.invalidateQueries({
        queryKey: queryKeys.negocioPublicaciones.comentarios(publicacionId),
    });
    queryClient.invalidateQueries({ queryKey: ['negocio-publicaciones', 'feed'] });
}

export function useCrearComentarioNegocio() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message: string; data?: { id: string } },
        unknown,
        { publicacionId: string; texto: string; parentId?: string | null }
    >({
        mutationFn: async ({ publicacionId, texto, parentId }) => {
            const response = await api.post(
                `/negocio-publicaciones/${publicacionId}/comentarios`,
                { texto, parentId: parentId ?? null }
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            invalidarFeedYComentarios(queryClient, variables.publicacionId);
        },
    });
}

export function useEditarComentarioNegocio() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message: string },
        unknown,
        { comentarioId: string; publicacionId: string; texto: string }
    >({
        mutationFn: async ({ comentarioId, texto }) => {
            const response = await api.put(`/negocio-publicaciones/comentarios/${comentarioId}`, { texto });
            return response.data;
        },
        onSuccess: (_data, variables) => {
            invalidarFeedYComentarios(queryClient, variables.publicacionId);
        },
    });
}

export function useEliminarComentarioNegocio() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message: string },
        unknown,
        { comentarioId: string; publicacionId: string }
    >({
        mutationFn: async ({ comentarioId }) => {
            const response = await api.delete(`/negocio-publicaciones/comentarios/${comentarioId}`);
            return response.data;
        },
        onSuccess: (_data, variables) => {
            invalidarFeedYComentarios(queryClient, variables.publicacionId);
        },
    });
}

export type { PublicacionNegocioFeedItem, PublicacionNegocioFeedItemConComentarios, PublicacionNegocioDetalle };
