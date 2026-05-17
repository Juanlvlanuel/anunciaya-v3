/**
 * useServicios.ts
 * ================
 * Hooks de React Query para la sección pública Servicios.
 *
 * Sprint 2 expone solo el feed (recientes + cercanos) y el feed infinito.
 * Detalle, mis-publicaciones, perfil del prestador, mutations de publicar/
 * editar/cambiar estado, y Q&A llegan en sprints 3 y 4.
 *
 * Doc maestro pendiente: docs/arquitectura/Servicios.md (Sprint 7).
 * Patrón calcado de: apps/web/src/hooks/queries/useMarketplace.ts
 *
 * Ubicación: apps/web/src/hooks/queries/useServicios.ts
 */

import {
    useQuery,
    useInfiniteQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import type {
    FeedServicios,
    RespuestaFeedInfinito,
    ModoServicio,
    TipoPublicacion,
    ModalidadServicio,
    OrdenFeedInfinito,
    SugerenciaServicio,
    PublicacionDetalle,
    PublicacionServicio,
    PreguntaServicio,
    PerfilPrestador,
    ResenaServicio,
} from '../../types/servicios';

// =============================================================================
// FEED INICIAL (recientes + cercanos)
// =============================================================================

interface UseServiciosFeedParams {
    ciudad: string | null | undefined;
    lat: number | null | undefined;
    lng: number | null | undefined;
    /** Si es `null` o `undefined` no se envía como filtro al backend → "Todos". */
    modo?: ModoServicio | null;
}

/**
 * Consume `GET /api/servicios/feed?ciudad=...&lat=...&lng=...&modo=...`.
 *
 * staleTime 2 min — mismo criterio que MarketPlace (la BD es la misma y las
 * queries son rápidas con índice GIST).
 *
 * `enabled`: solo dispara cuando hay ciudad + lat + lng. Sin GPS no se pide
 * el feed (la página muestra mensaje de "activa ubicación").
 *
 * `placeholderData: keepPreviousData` evita temblor visual al cambiar el
 * toggle Ofrezco/Solicito o al refrescarse el GPS.
 */
export function useServiciosFeed(params: UseServiciosFeedParams) {
    const { ciudad, lat, lng, modo } = params;
    const habilitado =
        !!ciudad &&
        lat !== null &&
        lat !== undefined &&
        lng !== null &&
        lng !== undefined;

    return useQuery({
        queryKey: queryKeys.servicios.feed({
            ciudad: ciudad ?? '',
            lat: lat ?? 0,
            lng: lng ?? 0,
            modo: modo ?? undefined,
        }),
        queryFn: async (): Promise<FeedServicios> => {
            const response = await api.get<{ success: boolean; data: FeedServicios }>(
                '/servicios/feed',
                { params: { ciudad, lat, lng, ...(modo ? { modo } : {}) } }
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
// FEED INFINITO (paginado, filtros, orden)
// =============================================================================

interface UseServiciosFeedInfinitoParams {
    ciudad: string | null | undefined;
    lat: number | null | undefined;
    lng: number | null | undefined;
    modo?: ModoServicio;
    tipo?: TipoPublicacion;
    modalidad?: ModalidadServicio;
    orden?: OrdenFeedInfinito;
    /** Items por página. Default 10. */
    limite?: number;
}

/**
 * Consume `GET /api/servicios/feed/infinito` con `useInfiniteQuery`.
 *
 * Cada página trae N items (default 10) con campos enriquecidos del feed.
 * Paginación offset-based; `paginacion.hayMas` indica si existe la siguiente.
 *
 * staleTime 2 min para que el usuario no vea cards desactualizadas demasiado
 * tiempo, pero sin estresar la BD con refetches al cambiar de tab.
 */
export function useServiciosFeedInfinito(params: UseServiciosFeedInfinitoParams) {
    const {
        ciudad,
        lat,
        lng,
        modo,
        tipo,
        modalidad,
        orden = 'recientes',
        limite = 10,
    } = params;

    const habilitado =
        !!ciudad &&
        lat !== null &&
        lat !== undefined &&
        lng !== null &&
        lng !== undefined;

    return useInfiniteQuery({
        queryKey: queryKeys.servicios.feedInfinito({
            ciudad: ciudad ?? '',
            lat: lat ?? 0,
            lng: lng ?? 0,
            modo,
            tipo,
            modalidad,
            orden,
        }),
        initialPageParam: 1,
        queryFn: async ({ pageParam }): Promise<RespuestaFeedInfinito> => {
            const response = await api.get<{
                success: boolean;
                data: RespuestaFeedInfinito;
            }>('/servicios/feed/infinito', {
                params: {
                    ciudad,
                    lat,
                    lng,
                    pagina: pageParam,
                    limite,
                    orden,
                    ...(modo ? { modo } : {}),
                    ...(tipo ? { tipo } : {}),
                    ...(modalidad ? { modalidad } : {}),
                },
            });
            return response.data.success
                ? response.data.data
                : {
                      items: [],
                      paginacion: {
                          pagina: 1,
                          limite,
                          total: 0,
                          totalPaginas: 0,
                          hayMas: false,
                      },
                  };
        },
        getNextPageParam: (lastPage) =>
            lastPage.paginacion.hayMas
                ? lastPage.paginacion.pagina + 1
                : undefined,
        enabled: habilitado,
        staleTime: 2 * 60 * 1000,
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// BUSCADOR — SUGERENCIAS EN VIVO
// =============================================================================

/**
 * Consume `GET /api/servicios/buscar/sugerencias?q=&ciudad=`.
 *
 * Debounce 300ms del query raw + mínimo 2 caracteres antes de disparar el
 * fetch (consistente con Ofertas y MarketPlace).
 *
 * `placeholderData: keepPreviousData` evita parpadeo entre teclas mientras se
 * escribe rápido.
 */
export function useBuscadorServiciosSugerencias(
    queryRaw: string,
    ciudad: string | null,
) {
    const [debounced, setDebounced] = useState(queryRaw);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(queryRaw), 300);
        return () => clearTimeout(t);
    }, [queryRaw]);

    return useQuery({
        queryKey: queryKeys.servicios.sugerencias(debounced, ciudad ?? ''),
        queryFn: async (): Promise<SugerenciaServicio[]> => {
            const response = await api.get<{
                success: boolean;
                data: SugerenciaServicio[];
            }>('/servicios/buscar/sugerencias', {
                params: { q: debounced, ciudad },
            });
            return response.data.success ? response.data.data : [];
        },
        enabled: !!ciudad && debounced.trim().length >= 2,
        staleTime: 60 * 1000,
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// DETALLE — PUBLICACIÓN POR ID
// =============================================================================

/**
 * Consume `GET /api/servicios/publicaciones/:id`. Devuelve detalle completo
 * con datos del oferente embebidos.
 *
 * `staleTime` 1 min — el detalle no cambia con frecuencia. La invalidación
 * llega cuando el dueño edita su publicación (mutación de update).
 */
export function usePublicacionServicio(publicacionId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.servicios.publicacion(publicacionId ?? ''),
        queryFn: async (): Promise<PublicacionDetalle | null> => {
            if (!publicacionId) return null;
            const response = await api.get<{
                success: boolean;
                data: PublicacionDetalle;
            }>(`/servicios/publicaciones/${publicacionId}`);
            return response.data.success ? response.data.data : null;
        },
        enabled: !!publicacionId,
        staleTime: 60 * 1000,
    });
}

/**
 * `POST /api/servicios/publicaciones/:id/vista`. Idempotente best-effort,
 * sin auth. Se dispara al montar el detalle (una vez por sesión via
 * sessionStorage para no inflar el contador).
 */
export function useRegistrarVistaServicio() {
    return useMutation({
        mutationFn: async (publicacionId: string) => {
            await api.post(`/servicios/publicaciones/${publicacionId}/vista`);
        },
    });
}

// =============================================================================
// MIS PUBLICACIONES (Sprint 7)
// =============================================================================

interface RespuestaMisPublicaciones {
    data: PublicacionServicio[];
    paginacion: {
        limit: number;
        offset: number;
        total: number;
    };
}

/**
 * `GET /api/servicios/mis-publicaciones?estado=&limit=&offset=`
 * Listado paginado de las publicaciones del usuario actual filtradas por
 * estado. staleTime 60s — el panel se actualiza cuando se hace una mutación
 * (pausar, reactivar, eliminar) gracias a `invalidateQueries`.
 */
export function useMisPublicacionesServicio(
    estado: 'activa' | 'pausada' | undefined,
    paginacion: { limit: number; offset: number } = { limit: 50, offset: 0 },
) {
    return useQuery({
        queryKey: queryKeys.servicios.misPublicaciones(estado, paginacion),
        queryFn: async (): Promise<RespuestaMisPublicaciones> => {
            // El backend retorna { success, code, data: [...], paginacion: {...} }
            // — `data` y `paginacion` al mismo nivel, mismo patrón que MarketPlace.
            const response = await api.get<{
                success: boolean;
                data?: PublicacionServicio[];
                paginacion?: RespuestaMisPublicaciones['paginacion'];
            }>('/servicios/mis-publicaciones', {
                params: {
                    ...(estado ? { estado } : {}),
                    limit: paginacion.limit,
                    offset: paginacion.offset,
                },
            });
            if (response.data.success && response.data.data) {
                return {
                    data: response.data.data,
                    paginacion:
                        response.data.paginacion ?? {
                            ...paginacion,
                            total: response.data.data.length,
                        },
                };
            }
            return { data: [], paginacion: { ...paginacion, total: 0 } };
        },
        staleTime: 60 * 1000,
        placeholderData: keepPreviousData,
    });
}

/**
 * `PUT /api/servicios/publicaciones/:id` — edita una publicación existente.
 * Acepta solo los campos modificados (UPDATE dinámico en backend).
 * Invalida feed, detalle y mis-publicaciones.
 */
export function useEditarPublicacionServicio() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (vars: {
            publicacionId: string;
            payload: Record<string, unknown>;
        }) => {
            const response = await api.put<{
                success: boolean;
                code: number;
                message?: string;
                errores?: string[];
            }>(
                `/servicios/publicaciones/${vars.publicacionId}`,
                vars.payload,
            );
            return response.data;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: queryKeys.servicios.all() });
            qc.invalidateQueries({
                queryKey: queryKeys.servicios.publicacion(vars.publicacionId),
            });
        },
    });
}

/**
 * `PATCH /api/servicios/publicaciones/:id/estado` — alterna entre
 * 'activa' ↔ 'pausada'. El dueño usa esto desde "Mis publicaciones" para
 * pausar manualmente sin perder el draft. Invalida las 3 listas (activa,
 * pausada) para que los conteos en los tabs se actualicen.
 */
export function useCambiarEstadoPublicacionServicio() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (vars: {
            publicacionId: string;
            estado: 'activa' | 'pausada';
        }) => {
            const response = await api.patch<{
                success: boolean;
                message?: string;
            }>(`/servicios/publicaciones/${vars.publicacionId}/estado`, {
                estado: vars.estado,
            });
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.servicios.all() });
        },
    });
}

/**
 * `POST /api/servicios/publicaciones/:id/reactivar` — para publicaciones
 * pausadas. Resetea `expira_at` a NOW()+30d y cambia estado a 'activa'.
 * Diferente de `PATCH /estado` porque ese no toca `expira_at`.
 */
export function useReactivarPublicacionServicio() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (publicacionId: string) => {
            const response = await api.post<{
                success: boolean;
                message?: string;
            }>(`/servicios/publicaciones/${publicacionId}/reactivar`);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.servicios.all() });
        },
    });
}

/**
 * `DELETE /api/servicios/publicaciones/:id` — soft delete. Las fotos
 * NO se borran de R2 aquí; el reconcile cron las limpia eventualmente
 * (best-effort consistencia eventual).
 */
export function useEliminarPublicacionServicio() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (publicacionId: string) => {
            const response = await api.delete<{
                success: boolean;
                message?: string;
            }>(`/servicios/publicaciones/${publicacionId}`);
            return response.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: queryKeys.servicios.all() });
        },
    });
}

// =============================================================================
// Q&A — PREGUNTAS Y RESPUESTAS
// =============================================================================

/**
 * Consume `GET /api/servicios/publicaciones/:id/preguntas`. El backend
 * aplica el filtro de privacidad: visitante anónimo solo ve respondidas,
 * autor ve sus pendientes + respondidas, dueño ve todas.
 */
export function usePreguntasServicio(publicacionId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.servicios.preguntas(publicacionId ?? ''),
        queryFn: async (): Promise<PreguntaServicio[]> => {
            if (!publicacionId) return [];
            const response = await api.get<{
                success: boolean;
                data: PreguntaServicio[];
            }>(`/servicios/publicaciones/${publicacionId}/preguntas`);
            return response.data.success ? response.data.data : [];
        },
        enabled: !!publicacionId,
        staleTime: 30 * 1000,
    });
}

/**
 * `POST /api/servicios/publicaciones/:id/preguntas` — el autor envía una
 * pregunta pública. Invalida el listado de preguntas al éxito.
 */
export function useCrearPreguntaServicio() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (vars: {
            publicacionId: string;
            pregunta: string;
        }) => {
            const response = await api.post<{ success: boolean; data?: { id: string }; message?: string }>(
                `/servicios/publicaciones/${vars.publicacionId}/preguntas`,
                { pregunta: vars.pregunta },
            );
            return response.data;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({
                queryKey: queryKeys.servicios.preguntas(vars.publicacionId),
            });
        },
    });
}

/**
 * `POST /api/servicios/preguntas/:id/responder` — el dueño responde una
 * pregunta pendiente. Invalida el listado de preguntas de la publicación.
 */
export function useResponderPreguntaServicio() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (vars: {
            preguntaId: string;
            publicacionId: string;
            respuesta: string;
        }) => {
            const response = await api.post<{ success: boolean; message?: string }>(
                `/servicios/preguntas/${vars.preguntaId}/responder`,
                { respuesta: vars.respuesta },
            );
            return response.data;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({
                queryKey: queryKeys.servicios.preguntas(vars.publicacionId),
            });
        },
    });
}

/** `PUT /api/servicios/preguntas/:id/mia` — el autor edita su pregunta pendiente. */
export function useEditarPreguntaPropiaServicio() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (vars: {
            preguntaId: string;
            publicacionId: string;
            pregunta: string;
        }) => {
            const response = await api.put<{ success: boolean; message?: string }>(
                `/servicios/preguntas/${vars.preguntaId}/mia`,
                { pregunta: vars.pregunta },
            );
            return response.data;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({
                queryKey: queryKeys.servicios.preguntas(vars.publicacionId),
            });
        },
    });
}

/** `DELETE /api/servicios/preguntas/:id/mia` — el autor retira su pregunta pendiente. */
export function useEliminarPreguntaPropiaServicio() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (vars: {
            preguntaId: string;
            publicacionId: string;
        }) => {
            const response = await api.delete<{ success: boolean; message?: string }>(
                `/servicios/preguntas/${vars.preguntaId}/mia`,
            );
            return response.data;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({
                queryKey: queryKeys.servicios.preguntas(vars.publicacionId),
            });
        },
    });
}

/** `DELETE /api/servicios/preguntas/:id` — el dueño elimina una pregunta. */
export function useEliminarPreguntaDuenoServicio() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (vars: {
            preguntaId: string;
            publicacionId: string;
        }) => {
            const response = await api.delete<{ success: boolean; message?: string }>(
                `/servicios/preguntas/${vars.preguntaId}`,
            );
            return response.data;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({
                queryKey: queryKeys.servicios.preguntas(vars.publicacionId),
            });
        },
    });
}

// =============================================================================
// CREAR PUBLICACIÓN + UPLOAD DE FOTOS (Sprint 4 — Wizard)
// =============================================================================

/**
 * `POST /api/servicios/publicaciones` — envía el draft del wizard al backend.
 * Invalida el feed al éxito para que la nueva publicación aparezca.
 *
 * El payload debe coincidir con `crearPublicacionSchema` del backend.
 */
export function useCrearPublicacionServicio() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Record<string, unknown>) => {
            const response = await api.post<{
                success: boolean;
                code: number;
                data?: { id: string };
                message?: string;
                errores?: string[];
            }>('/servicios/publicaciones', payload);
            return response.data;
        },
        onSuccess: () => {
            // Invalida todo lo de servicios (feed, feed-infinito, mis-publicaciones)
            // así la nueva publicación aparece al volver al feed.
            qc.invalidateQueries({ queryKey: queryKeys.servicios.all() });
        },
    });
}

/**
 * `POST /api/servicios/upload-imagen` — obtiene un presigned URL de R2 para
 * subir una foto. Devuelve `{ url, publicUrl }`. El wizard sube directo a R2
 * desde el browser (PUT al `url`) y guarda `publicUrl` en `draft.fotos`.
 */
export function useUploadFotoServicio() {
    return useMutation({
        mutationFn: async (vars: {
            nombreArchivo: string;
            contentType: 'image/jpeg' | 'image/png' | 'image/webp';
        }) => {
            const response = await api.post<{
                success: boolean;
                data?: {
                    uploadUrl: string;
                    publicUrl: string;
                    key: string;
                    expiresIn: number;
                };
                message?: string;
            }>('/servicios/upload-imagen', vars);
            return response.data;
        },
    });
}

/**
 * `DELETE /api/servicios/foto-huerfana` — wizard usa esto para limpiar fotos
 * que el usuario subió a R2 pero que aún no están atadas a una publicación
 * creada (porque canceló o borró el borrador).
 *
 * El backend valida reference count contra `servicios_publicaciones.fotos`
 * antes de borrar, así que si el usuario publicó la URL queda protegida.
 */
export function useEliminarFotoServicioHuerfana() {
    return useMutation({
        mutationFn: async (url: string) => {
            const response = await api.delete<{
                success: boolean;
                message?: string;
            }>('/servicios/foto-huerfana', { data: { url } });
            return response.data;
        },
    });
}

// =============================================================================
// PERFIL PRESTADOR + RESEÑAS (Sprint 5)
// =============================================================================

/**
 * `GET /api/servicios/usuarios/:usuarioId` — perfil base con KPIs agregados.
 * staleTime 5 min (rating cambia poco a poco con cada reseña nueva).
 */
export function usePerfilPrestador(usuarioId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.servicios.prestador(usuarioId ?? ''),
        queryFn: async (): Promise<PerfilPrestador | null> => {
            if (!usuarioId) return null;
            const response = await api.get<{
                success: boolean;
                data: PerfilPrestador;
            }>(`/servicios/usuarios/${usuarioId}`);
            return response.data.success ? response.data.data : null;
        },
        enabled: !!usuarioId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * `GET /api/servicios/usuarios/:usuarioId/publicaciones?estado=activa`
 * — listado de publicaciones activas del prestador.
 */
export function usePublicacionesDelPrestador(
    usuarioId: string | undefined,
    estado: 'activa' | 'pausada' = 'activa',
) {
    return useQuery({
        queryKey: queryKeys.servicios.prestadorPublicaciones(
            usuarioId ?? '',
            estado,
        ),
        queryFn: async (): Promise<PublicacionServicio[]> => {
            if (!usuarioId) return [];
            const response = await api.get<{
                success: boolean;
                data: PublicacionServicio[];
            }>(`/servicios/usuarios/${usuarioId}/publicaciones`, {
                params: { estado },
            });
            return response.data.success ? response.data.data : [];
        },
        enabled: !!usuarioId,
        staleTime: 2 * 60 * 1000,
    });
}

/**
 * `POST /api/servicios/publicaciones/:id/resenas` — autor (no dueño) crea
 * una reseña tras conversación cerrada. Invalida el perfil del prestador
 * (destinatario) para que su rating promedio y lista se actualicen.
 */
export function useCrearResenaServicio() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (vars: {
            publicacionId: string;
            rating: number;
            texto: string | null;
        }) => {
            const response = await api.post<{
                success: boolean;
                code: number;
                data?: { id: string; destinatarioId: string };
                message?: string;
                errores?: string[];
            }>(`/servicios/publicaciones/${vars.publicacionId}/resenas`, {
                rating: vars.rating,
                texto: vars.texto,
            });
            return response.data;
        },
        onSuccess: (res) => {
            if (res.data?.destinatarioId) {
                qc.invalidateQueries({
                    queryKey: queryKeys.servicios.prestador(
                        res.data.destinatarioId,
                    ),
                });
                qc.invalidateQueries({
                    queryKey: queryKeys.servicios.prestadorResenas(
                        res.data.destinatarioId,
                    ),
                });
            }
        },
    });
}

/**
 * `GET /api/servicios/usuarios/:usuarioId/resenas` — reseñas recibidas con
 * autor embebido. staleTime 5 min.
 */
export function useResenasDelPrestador(usuarioId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.servicios.prestadorResenas(usuarioId ?? ''),
        queryFn: async (): Promise<ResenaServicio[]> => {
            if (!usuarioId) return [];
            const response = await api.get<{
                success: boolean;
                data: ResenaServicio[];
            }>(`/servicios/usuarios/${usuarioId}/resenas`);
            return response.data.success ? response.data.data : [];
        },
        enabled: !!usuarioId,
        staleTime: 5 * 60 * 1000,
    });
}
