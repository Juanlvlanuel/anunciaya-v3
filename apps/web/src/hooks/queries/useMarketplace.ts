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

import {
    useQuery,
    useInfiniteQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from '@tanstack/react-query';
import { useState, useCallback, useEffect } from 'react';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import type {
    FeedMarketplace,
    ArticuloFeed,
    ArticuloMarketplaceDetalle,
    ArticuloMarketplace,
    CondicionArticulo,
    PerfilVendedorMarketplace,
    PublicacionesDeVendedor,
    PreguntaMarketplace,
    PreguntasParaVendedor,
    PreguntasVisitante,
    MiPreguntaPendiente,
    OrdenFeedInfinito,
    RespuestaFeedInfinito,
} from '../../types/marketplace';
import { optimizarImagen } from '../../utils/optimizarImagen';

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
// FEED INFINITO (rediseño v1.2 — estilo Facebook)
// =============================================================================

interface UseFeedInfinitoParams {
    ciudad: string | null | undefined;
    lat: number | null | undefined;
    lng: number | null | undefined;
    orden?: OrdenFeedInfinito;
    precioMin?: number;
    precioMax?: number;
    /** Items por página. Default 10. */
    limite?: number;
}

/**
 * Consume `GET /api/marketplace/feed/infinito` con `useInfiniteQuery`.
 *
 * Cada página trae 10 artículos enriquecidos con avatar+nombre del vendedor y
 * top 2 preguntas respondidas. La paginación es offset-based y `hayMas`
 * determina si existe la siguiente página.
 *
 * Decisión de staleTime:
 * - 2 min para que el usuario no vea cards desactualizadas demasiado tiempo,
 *   pero sin estresar la BD con refetches al cambiar de tab.
 *
 * Decisión de placeholderData:
 * - `keepPreviousData` para evitar temblor visual al cambiar el orden o los
 *   filtros (PATRON_REACT_QUERY).
 */
export function useFeedInfinitoMarketplace(params: UseFeedInfinitoParams) {
    const {
        ciudad,
        lat,
        lng,
        orden = 'recientes',
        precioMin,
        precioMax,
        limite = 10,
    } = params;

    const habilitado =
        !!ciudad &&
        lat !== null &&
        lat !== undefined &&
        lng !== null &&
        lng !== undefined;

    return useInfiniteQuery({
        queryKey: queryKeys.marketplace.feedInfinito({
            ciudad: ciudad ?? '',
            lat: lat ?? 0,
            lng: lng ?? 0,
            orden,
            precioMin,
            precioMax,
        }),
        queryFn: async ({ pageParam }): Promise<RespuestaFeedInfinito> => {
            const response = await api.get<{
                success: boolean;
                data: RespuestaFeedInfinito;
            }>('/marketplace/feed/infinito', {
                params: {
                    ciudad,
                    lat,
                    lng,
                    orden,
                    pagina: pageParam,
                    limite,
                    ...(precioMin !== undefined && { precioMin }),
                    ...(precioMax !== undefined && { precioMax }),
                },
            });
            return response.data.success
                ? response.data.data
                : { articulos: [], pagina: pageParam as number, limite, hayMas: false };
        },
        initialPageParam: 1,
        getNextPageParam: (ultimaPagina) =>
            ultimaPagina.hayMas ? ultimaPagina.pagina + 1 : undefined,
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

// =============================================================================
// HEARTBEAT (presencia en detalle del artículo)
// =============================================================================

/**
 * Señal de presencia activa en el detalle del artículo.
 * Fire-and-forget — errores silenciados (no es crítico).
 */
export async function heartbeatArticulo(articuloId: string): Promise<void> {
    try {
        await api.post(`/marketplace/articulos/${articuloId}/heartbeat`);
    } catch {
        // Silencioso a propósito.
    }
}

// =============================================================================
// MUTATIONS — CREAR / ACTUALIZAR ARTÍCULO
// =============================================================================

/**
 * Body que el wizard envía al backend. `confirmadoPorUsuario` es opcional;
 * el wizard lo agrega cuando el usuario eligió "Continuar de todos modos"
 * tras una sugerencia suave de moderación (servicio o búsqueda).
 */
export interface CrearArticuloPayload {
    titulo: string;
    descripcion: string;
    precio: number;
    /**
     * Opcional desde 2026-05-13. NULL/undefined = no aplica (productos
     * consumibles, hechos a mano nuevos, etc.).
     */
    condicion?: CondicionArticulo | null;
    /**
     * Opcional desde 2026-05-13. NULL/undefined = no especificado
     * (no se muestra mención en el card).
     */
    aceptaOfertas?: boolean | null;
    /**
     * Unidad de venta opcional (c/u, por kg, por docena, etc.). Cuando
     * existe, el card muestra "$15 c/u" en lugar de solo "$15".
     */
    unidadVenta?: string | null;
    /**
     * Snapshot del checklist legal del Paso 3 del wizard. Se persiste en
     * BD como evidencia inmutable de los compromisos que aceptó el vendedor
     * al publicar. El `aceptadasAt` lo agrega el backend al insertar
     * (timestamp confiable, no manipulable por el cliente).
     */
    confirmaciones?: {
        licito: boolean;
        enPoder: boolean;
        honesto: boolean;
        seguro: boolean;
        /** Identifica la versión del texto del checklist. Formato: `v<n>-YYYY-MM-DD`. */
        version: string;
    };
    fotos: string[];
    fotoPortadaIndex: number;
    latitud: number;
    longitud: number;
    ciudad: string;
    zonaAproximada: string;
    confirmadoPorUsuario?: boolean;
}

export type ActualizarArticuloPayload = Partial<CrearArticuloPayload>;

/**
 * Respuesta del backend cuando la moderación interviene. Si `severidad ===
 * 'rechazo'` el HTTP status es 422; si es `'sugerencia'` el HTTP status es
 * 200 pero `success: false` y el wizard debe mostrar el modal con dos
 * botones (Editar publicación / Continuar de todos modos).
 */
export interface RespuestaModeracion {
    success: false;
    message: string;
    moderacion: {
        severidad: 'rechazo' | 'sugerencia';
        categoria: 'rifa' | 'subasta' | 'esquema' | 'adultos' | 'ilegal' | 'servicio' | 'busqueda';
        mensaje: string;
        palabraDetectada?: string;
    };
}

interface RespuestaCrearOk {
    success: true;
    message: string;
    data: ArticuloMarketplace;
}

type RespuestaCrear = RespuestaCrearOk | RespuestaModeracion;

/**
 * Mutation para crear un artículo. Maneja los 3 caminos:
 *  - 201 con artículo creado.
 *  - 200 con `{ success: false, moderacion }` (sugerencia suave — el wizard
 *    decide si reenviar con `confirmadoPorUsuario: true`).
 *  - 422 con `{ success: false, moderacion }` (rechazo duro — el wizard
 *    muestra el mensaje sin permitir continuar).
 *
 * Por convenio, el hook NO lanza error en 200 con sugerencia (es flujo
 * normal). Sí lanza en 422 (rechazo) y otros errores HTTP. El wizard
 * inspecciona `data` o `error.response?.data` según el caso.
 */
export function useCrearArticulo() {
    const queryClient = useQueryClient();
    return useMutation<RespuestaCrear, unknown, CrearArticuloPayload>({
        mutationFn: async (payload) => {
            const response = await api.post<RespuestaCrear>('/marketplace/articulos', payload);
            return response.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all() });
            }
        },
    });
}

interface RespuestaActualizarOk {
    success: true;
    message: string;
    data: ArticuloMarketplaceDetalle;
}

type RespuestaActualizar = RespuestaActualizarOk | RespuestaModeracion;

/**
 * Reactiva un artículo `pausada` (Sprint 7). El backend extiende `expira_at`
 * 30 días más y vuelve a `estado='activa'`. Solo puede reactivar el dueño.
 */
export function useReactivarArticulo() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message?: string; data?: { estado: 'activa' } },
        unknown,
        { articuloId: string }
    >({
        mutationFn: async ({ articuloId }) => {
            const response = await api.post(
                `/marketplace/articulos/${articuloId}/reactivar`
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.articulo(variables.articuloId),
            });
            queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all() });
        },
    });
}

export function useActualizarArticulo() {
    const queryClient = useQueryClient();
    return useMutation<
        RespuestaActualizar,
        unknown,
        { articuloId: string; payload: ActualizarArticuloPayload }
    >({
        mutationFn: async ({ articuloId, payload }) => {
            const response = await api.put<RespuestaActualizar>(
                `/marketplace/articulos/${articuloId}`,
                payload
            );
            return response.data;
        },
        onSuccess: (data, variables) => {
            if (data.success) {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.marketplace.articulo(variables.articuloId),
                });
                queryClient.invalidateQueries({
                    queryKey: queryKeys.marketplace.all(),
                });
            }
        },
    });
}

// =============================================================================
// HOOK — UPLOAD DE FOTOS A R2
// =============================================================================

interface RespuestaUploadImagen {
    success: boolean;
    data?: { uploadUrl: string; publicUrl: string };
    message?: string;
}

interface UseSubirFotoMarketplaceResult {
    /** URL pública de R2 una vez completado el upload (null durante o si falló) */
    publicUrl: string | null;
    isUploading: boolean;
    error: string | null;
    /** Ejecuta el upload del archivo elegido por el usuario */
    subir: (file: File) => Promise<string | null>;
    /** Limpia el estado (al borrar foto del wizard, etc.) */
    reset: () => void;
}

/**
 * Hook para subir UNA foto a R2 con prefijo `marketplace/`. Retorna la URL
 * pública lista para guardar en `articulo.fotos`. Diseñado para usarse N
 * veces en paralelo (uno por slot del wizard).
 *
 * Flujo:
 *  1. Pide presigned URL al backend (`POST /marketplace/upload-imagen`).
 *  2. PUT directo a R2 con el archivo (sin pasar por nuestro server).
 *  3. Devuelve `publicUrl` final.
 *
 * Optimiza imágenes antes de subir: redimensiona a 1920px máx, comprime a
 * WebP con calidad 85%. Reduce 70-90% el peso de fotos de cámara móvil
 * (5-10MB → ~500KB) y unifica el formato en R2. Reusa el helper compartido
 * `optimizarImagen` (mismo que usan ChatYA y Business Studio).
 */
export function useSubirFotoMarketplace(): UseSubirFotoMarketplaceResult {
    const [publicUrl, setPublicUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const subir = useCallback(async (file: File): Promise<string | null> => {
        setIsUploading(true);
        setError(null);
        try {
            // 1. Optimizar a WebP (redimensiona + comprime client-side)
            const blobOptimizado = await optimizarImagen(file, {
                maxWidth: 1920,
                quality: 0.85,
            });
            const nombreArchivo = file.name.replace(/\.[^.]+$/, '.webp');
            const contentType = 'image/webp';

            // 2. Pedir presigned URL al backend
            const presignResp = await api.post<RespuestaUploadImagen>(
                '/marketplace/upload-imagen',
                {
                    nombreArchivo,
                    contentType,
                }
            );
            if (!presignResp.data.success || !presignResp.data.data) {
                throw new Error(presignResp.data.message ?? 'No se pudo generar URL de subida');
            }
            const { uploadUrl, publicUrl: urlFinal } = presignResp.data.data;

            // 3. PUT directo a R2 con el blob WebP optimizado
            const putResp = await fetch(uploadUrl, {
                method: 'PUT',
                body: blobOptimizado,
                headers: { 'Content-Type': contentType },
            });
            if (!putResp.ok) {
                throw new Error(`R2 PUT falló: HTTP ${putResp.status}`);
            }

            setPublicUrl(urlFinal);
            return urlFinal;
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Error subiendo foto';
            setError(msg);
            return null;
        } finally {
            setIsUploading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setPublicUrl(null);
        setError(null);
        setIsUploading(false);
    }, []);

    return { publicUrl, isUploading, error, subir, reset };
}

// =============================================================================
// PERFIL DEL VENDEDOR (Sprint 5)
// =============================================================================

/**
 * Consume `GET /api/marketplace/vendedor/:usuarioId`.
 *
 * Devuelve perfil público con KPIs calculados (publicaciones activas,
 * vendidos, tiempo de respuesta). Si el vendedor bloqueó al usuario actual,
 * el backend devuelve 404 sin revelar el motivo.
 */
export function useVendedorMarketplace(usuarioId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.marketplace.vendedor(usuarioId ?? ''),
        queryFn: async (): Promise<PerfilVendedorMarketplace | null> => {
            const response = await api.get<{
                success: boolean;
                data?: PerfilVendedorMarketplace;
            }>(`/marketplace/vendedor/${usuarioId}`);
            if (!response.data.success || !response.data.data) return null;
            return response.data.data;
        },
        enabled: !!usuarioId,
        staleTime: 2 * 60 * 1000,
        retry: (failureCount, error) => {
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status === 404) return false;
            return failureCount < 2;
        },
    });
}

/**
 * Consume `GET /api/marketplace/vendedor/:usuarioId/publicaciones`.
 *
 * Lista paginada de publicaciones del vendedor por estado (activa | vendida).
 * Usa `placeholderData: keepPreviousData` para evitar temblor visual al
 * cambiar de tab.
 */
export function useVendedorPublicaciones(
    usuarioId: string | undefined,
    estado: 'activa' | 'vendida',
    paginacion: { limit: number; offset: number } = { limit: 20, offset: 0 }
) {
    return useQuery({
        queryKey: queryKeys.marketplace.vendedorPublicaciones(
            usuarioId ?? '',
            estado,
            paginacion
        ),
        queryFn: async (): Promise<PublicacionesDeVendedor> => {
            const response = await api.get<{
                success: boolean;
                data?: ArticuloMarketplace[];
                paginacion?: PublicacionesDeVendedor['paginacion'];
            }>(`/marketplace/vendedor/${usuarioId}/publicaciones`, {
                params: { estado, ...paginacion },
            });
            return {
                data: response.data.data ?? [],
                paginacion: response.data.paginacion ?? {
                    total: 0,
                    limit: paginacion.limit,
                    offset: paginacion.offset,
                },
            };
        },
        enabled: !!usuarioId,
        staleTime: 60 * 1000,
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// BUSCADOR (Sprint 6)
// =============================================================================

/**
 * Sugerencias en vivo con debounce 300ms.
 *
 * El componente pasa el `query` "raw" del input — este hook se encarga de
 * debouncear y solo dispara fetch cuando el query estabilizado tiene >= 2
 * caracteres. Sin esto, cada tecla pegada spamearía el backend.
 */
export interface SugerenciaArticulo {
    id: string;
    titulo: string;
    precio: number;
    condicion: string;
    fotoPortada: string | null;
    ciudad: string;
}

export function useBuscadorSugerencias(queryRaw: string, ciudad: string | null) {
    const [queryDebounced, setQueryDebounced] = useState(queryRaw);

    useEffect(() => {
        const timer = setTimeout(() => setQueryDebounced(queryRaw), 300);
        return () => clearTimeout(timer);
    }, [queryRaw]);

    return useQuery({
        queryKey: queryKeys.marketplace.sugerencias(queryDebounced, ciudad ?? ''),
        queryFn: async (): Promise<SugerenciaArticulo[]> => {
            const response = await api.get<{ success: boolean; data?: SugerenciaArticulo[] }>(
                '/marketplace/buscar/sugerencias',
                { params: { q: queryDebounced, ciudad } }
            );
            return response.data.data ?? [];
        },
        enabled: !!ciudad && queryDebounced.trim().length >= 2,
        staleTime: 60 * 1000,
        placeholderData: keepPreviousData,
    });
}

/**
 * Top 6 búsquedas populares por ciudad. El backend cachea en Redis 1h, el
 * frontend cachea en React Query 5min — ambos suficientes para una sección
 * de "más buscado" que cambia poco.
 */
export function useBuscadorPopulares(ciudad: string | null) {
    return useQuery({
        queryKey: queryKeys.marketplace.populares(ciudad ?? ''),
        queryFn: async (): Promise<string[]> => {
            const response = await api.get<{ success: boolean; data?: string[] }>(
                '/marketplace/buscar/populares',
                { params: { ciudad } }
            );
            return response.data.data ?? [];
        },
        enabled: !!ciudad,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Filtros que el wizard pasa al endpoint `/buscar`. Se serializan a query
 * string en `URLSearchParams`.
 */
export interface FiltrosBusquedaCliente {
    q?: string;
    lat?: number;
    lng?: number;
    precioMin?: number;
    precioMax?: number;
    condicion?: Array<'nuevo' | 'seminuevo' | 'usado' | 'para_reparar'>;
    distanciaMaxKm?: number;
    ordenar?: 'recientes' | 'cercanos' | 'precio_asc' | 'precio_desc';
}

interface RespuestaBusqueda {
    success: boolean;
    data: ArticuloMarketplace[];
    paginacion: { total: number; limit: number; offset: number };
    query: string;
}

/**
 * Resultados de búsqueda paginados con scroll infinito (`useInfiniteQuery`).
 * Cada página trae 20 artículos. El componente concatena todas las páginas y
 * dispara `fetchNextPage` cuando el sentinel entra en viewport.
 */
export function useBuscadorResultados(
    ciudad: string | null,
    filtros: FiltrosBusquedaCliente
) {
    const limit = 20;

    return useInfiniteQuery({
        queryKey: queryKeys.marketplace.resultadosBusqueda({
            ciudad,
            ...filtros,
        }),
        queryFn: async ({ pageParam }): Promise<RespuestaBusqueda> => {
            const params: Record<string, unknown> = {
                ciudad,
                limit,
                offset: pageParam,
                ordenar: filtros.ordenar ?? 'recientes',
            };
            if (filtros.q) params.q = filtros.q;
            if (filtros.lat !== undefined) params.lat = filtros.lat;
            if (filtros.lng !== undefined) params.lng = filtros.lng;
            if (filtros.precioMin !== undefined) params.precioMin = filtros.precioMin;
            if (filtros.precioMax !== undefined) params.precioMax = filtros.precioMax;
            if (filtros.condicion && filtros.condicion.length > 0) {
                params.condicion = filtros.condicion.join(',');
            }
            if (filtros.distanciaMaxKm !== undefined) {
                params.distanciaMaxKm = filtros.distanciaMaxKm;
            }
            const response = await api.get<RespuestaBusqueda>('/marketplace/buscar', {
                params,
            });
            return response.data;
        },
        initialPageParam: 0,
        getNextPageParam: (ultima) => {
            const cargados = ultima.paginacion.offset + ultima.data.length;
            return cargados < ultima.paginacion.total ? cargados : undefined;
        },
        enabled: !!ciudad,
        staleTime: 30 * 1000,
        placeholderData: keepPreviousData,
    });
}

// =============================================================================
// PREGUNTAS Y RESPUESTAS (Sprint 9.2)
// =============================================================================

/**
 * Obtiene preguntas de un artículo.
 * - Si `esDueno=true` → devuelve `{ pendientes, respondidas }`.
 * - Si `esDueno=false` → devuelve `{ respondidas, miPreguntaPendiente }`
 *   donde `miPreguntaPendiente` es la pregunta del usuario autenticado que
 *   aún no tiene respuesta (o `null` si no aplica). Permite mostrarle al
 *   comprador que su pregunta está pendiente y darle opción de retirarla.
 */
export function usePreguntasArticulo(
    articuloId: string | undefined,
    esDueno: boolean
) {
    return useQuery({
        queryKey: queryKeys.marketplace.preguntas(articuloId ?? ''),
        queryFn: async (): Promise<PreguntasVisitante | PreguntasParaVendedor> => {
            const response = await api.get<{
                success: boolean;
                data: PreguntaMarketplace[] | PreguntasParaVendedor;
                miPreguntaPendiente?: MiPreguntaPendiente | null;
            }>(`/marketplace/articulos/${articuloId}/preguntas`);
            if (esDueno) {
                return response.data.data as PreguntasParaVendedor;
            }
            return {
                preguntas: response.data.data as PreguntaMarketplace[],
                miPreguntaPendiente: response.data.miPreguntaPendiente ?? null,
            };
        },
        enabled: !!articuloId,
        staleTime: 60 * 1000,
    });
}

export function useCrearPregunta() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message: string },
        unknown,
        { articuloId: string; pregunta: string }
    >({
        mutationFn: async ({ articuloId, pregunta }) => {
            const response = await api.post(
                `/marketplace/articulos/${articuloId}/preguntas`,
                { pregunta }
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.preguntas(variables.articuloId),
            });
        },
    });
}

export function useResponderPregunta() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message: string },
        unknown,
        { preguntaId: string; articuloId: string; respuesta: string }
    >({
        mutationFn: async ({ preguntaId, respuesta }) => {
            const response = await api.post(
                `/marketplace/preguntas/${preguntaId}/responder`,
                { respuesta }
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.preguntas(variables.articuloId),
            });
        },
    });
}

export function useEliminarPregunta() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message: string },
        unknown,
        { preguntaId: string; articuloId: string }
    >({
        mutationFn: async ({ preguntaId }) => {
            const response = await api.delete(
                `/marketplace/preguntas/${preguntaId}`
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.preguntas(variables.articuloId),
            });
        },
    });
}

export function useEliminarPreguntaMia() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message: string },
        unknown,
        { preguntaId: string; articuloId: string }
    >({
        mutationFn: async ({ preguntaId }) => {
            const response = await api.delete(
                `/marketplace/preguntas/${preguntaId}/mia`
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.preguntas(variables.articuloId),
            });
            // El feed v1.2 trae las preguntas inline, también invalidar.
            queryClient.invalidateQueries({
                queryKey: ['marketplace', 'feed-infinito'],
            });
        },
    });
}

/**
 * El comprador edita el texto de su propia pregunta. Solo permitido si
 * sigue pendiente (sin respuesta).
 */
export function useEditarPreguntaPropia() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message: string },
        unknown,
        { preguntaId: string; articuloId: string; pregunta: string }
    >({
        mutationFn: async ({ preguntaId, pregunta }) => {
            const response = await api.put(
                `/marketplace/preguntas/${preguntaId}/mia`,
                { pregunta }
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.preguntas(variables.articuloId),
            });
            queryClient.invalidateQueries({
                queryKey: ['marketplace', 'feed-infinito'],
            });
        },
    });
}

export function useDerivarPreguntaAChat() {
    const queryClient = useQueryClient();
    return useMutation<
        {
            success: boolean;
            data: {
                compradorId: string;
                compradorNombre: string;
                compradorApellidos: string;
                compradorAvatarUrl: string | null;
                articuloId: string;
            };
        },
        unknown,
        { preguntaId: string; articuloId: string }
    >({
        mutationFn: async ({ preguntaId }) => {
            const response = await api.post(
                `/marketplace/preguntas/${preguntaId}/derivar-a-chat`
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.preguntas(variables.articuloId),
            });
        },
    });
}

// =============================================================================
// MIS PUBLICACIONES (C.2 — panel de gestión del vendedor)
// =============================================================================

/**
 * Lista paginada de los artículos del usuario autenticado, filtrada por estado.
 * Si `estado=undefined`, devuelve todos los no-eliminados (activa+pausada+vendida).
 *
 * El endpoint es `GET /api/marketplace/mis-articulos?estado=&limit=&offset=`
 * (ojo: NO es `/articulos/mios` — ver `marketplace.routes.ts`). El backend
 * excluye automáticamente `eliminada` y los soft-deletes (`deleted_at IS NOT
 * NULL`), así que el cliente no necesita filtrar.
 *
 * Decisiones:
 * - `staleTime: 1 min` — los KPIs (vistas/mensajes/guardados/expiraAt) cambian
 *   con frecuencia y queremos que el panel los muestre razonablemente al día.
 * - `placeholderData: keepPreviousData` por la regla obligatoria del proyecto
 *   (evita temblor visual al cambiar de tab Activas → Pausadas → Vendidas).
 */
export function useMisArticulosMarketplace(
    estado: 'activa' | 'pausada' | 'vendida' | undefined,
    paginacion: { limit: number; offset: number } = { limit: 20, offset: 0 }
) {
    return useQuery({
        queryKey: queryKeys.marketplace.misArticulos(estado, paginacion),
        queryFn: async (): Promise<PublicacionesDeVendedor> => {
            const response = await api.get<{
                success: boolean;
                data?: ArticuloMarketplace[];
                paginacion?: PublicacionesDeVendedor['paginacion'];
            }>('/marketplace/mis-articulos', {
                params: {
                    ...(estado ? { estado } : {}),
                    limit: paginacion.limit,
                    offset: paginacion.offset,
                },
            });
            return {
                data: response.data.data ?? [],
                paginacion: response.data.paginacion ?? {
                    total: 0,
                    limit: paginacion.limit,
                    offset: paginacion.offset,
                },
            };
        },
        staleTime: 60 * 1000,
        placeholderData: keepPreviousData,
    });
}

/**
 * Cambia el estado de un artículo del usuario (activa | pausada | vendida).
 * `eliminada` NO entra aquí — para eso `useEliminarArticuloMarketplace`.
 *
 * Reglas de transición que aplica el backend (`cambiarEstado` service):
 *  - activa  ↔ pausada
 *  - activa  → vendida
 *  - pausada → vendida
 *  - vendida → (terminal)
 *
 * Para reactivar una `pausada` desde el panel de Mis Publicaciones, conviene
 * usar `useReactivarArticulo` en su lugar — extiende `expira_at` +30 días
 * además de poner `estado='activa'`. Este hook solo cambia el estado.
 *
 * Invalida el detalle del artículo y `marketplace.all()` (cubre el listado de
 * mis publicaciones, el feed público, el perfil del vendedor y las queries
 * del buscador — todos esos espacios deben reflejar el cambio).
 */
export function useCambiarEstadoArticuloMarketplace() {
    const queryClient = useQueryClient();
    return useMutation<
        {
            success: boolean;
            message?: string;
            data?: { estado: 'activa' | 'pausada' | 'vendida' };
        },
        unknown,
        { articuloId: string; estado: 'activa' | 'pausada' | 'vendida' }
    >({
        mutationFn: async ({ articuloId, estado }) => {
            const response = await api.patch(
                `/marketplace/articulos/${articuloId}/estado`,
                { estado }
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.articulo(variables.articuloId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.all(),
            });
        },
    });
}

/**
 * Elimina (soft delete) un artículo del usuario. El backend marca
 * `estado='eliminada'` + `deleted_at=NOW()` y limpia las fotos huérfanas en
 * R2 con reference counting (`eliminarFotoMarketplaceSiHuerfana`).
 *
 * Invalida `marketplace.all()` para que desaparezca del listado de Mis
 * Publicaciones, del feed público, del perfil del vendedor y de Mis
 * Guardados de otros usuarios (estos últimos lo filtran server-side al
 * refetchear, no hay que invalidar `guardados` aquí).
 */
export function useEliminarArticuloMarketplace() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message?: string },
        unknown,
        { articuloId: string }
    >({
        mutationFn: async ({ articuloId }) => {
            const response = await api.delete(
                `/marketplace/articulos/${articuloId}`
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.articulo(variables.articuloId),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.all(),
            });
        },
    });
}
