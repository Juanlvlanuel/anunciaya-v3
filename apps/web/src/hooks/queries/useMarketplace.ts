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
import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import { useAuthStore } from '../../stores/useAuthStore';
import type {
    FeedMarketplace,
    ArticuloMarketplaceDetalle,
    ArticuloMarketplace,
    CondicionArticulo,
    PerfilVendedorMarketplace,
    PublicacionesDeVendedor,
    ComentarioMarketplace,
    OrdenFeedInfinito,
    RespuestaFeedInfinito,
    ModoArticulo,
    CategoriaMarketplace,
} from '../../types/marketplace';

// =============================================================================
// FEED DEL MARKETPLACE (recientes + cercanos)
// =============================================================================

interface UseMarketplaceFeedParams {
    ciudad: string | null | undefined;
    lat: number | null | undefined;
    lng: number | null | undefined;
    /** Modo del feed: 'vendo' (default) | 'busco'. Alimenta el KPI del header. */
    modo?: ModoArticulo;
    /** Filtro por categoría (opcional). */
    categoriaId?: number;
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
    const { ciudad, lat, lng, modo = 'vendo', categoriaId } = params;
    const habilitado = !!ciudad && lat !== null && lat !== undefined && lng !== null && lng !== undefined;

    return useQuery({
        queryKey: queryKeys.marketplace.feed({
            ciudad: ciudad ?? '',
            lat: lat ?? 0,
            lng: lng ?? 0,
            modo,
            categoriaId,
        }),
        queryFn: async (): Promise<FeedMarketplace> => {
            const response = await api.get<{ success: boolean; data: FeedMarketplace }>(
                '/marketplace/feed',
                {
                    params: {
                        ciudad,
                        lat,
                        lng,
                        modo,
                        ...(categoriaId !== undefined && { categoriaId }),
                    },
                }
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
// CATEGORÍAS (MarketPlace)
// =============================================================================

/**
 * Lista pública de categorías activas de MarketPlace (para el selector del
 * composer y el filtro del feed). Cambian poco → staleTime alto.
 */
export function useCategoriasMarketplace() {
    return useQuery({
        queryKey: queryKeys.marketplace.categorias(),
        queryFn: async (): Promise<CategoriaMarketplace[]> => {
            const response = await api.get<{ success: boolean; data?: CategoriaMarketplace[] }>(
                '/marketplace/categorias'
            );
            return response.data.success ? response.data.data ?? [] : [];
        },
        staleTime: 30 * 60 * 1000,
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
    /** Modo del feed: 'vendo' (default) | 'busco'. */
    modo?: ModoArticulo;
    /** Solo búsquedas urgentes — aplica cuando modo='busco'. */
    soloUrgente?: boolean;
    /** Filtro por categoría (opcional). */
    categoriaId?: number;
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
        modo = 'vendo',
        soloUrgente,
        categoriaId,
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
            modo,
            soloUrgente,
            categoriaId,
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
                    modo,
                    ...(soloUrgente !== undefined && { soloUrgente }),
                    ...(categoriaId !== undefined && { categoriaId }),
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
        // Refresco "tipo Facebook": al volver a la pestaña, refetchea en
        // segundo plano (mismo override que `usePreguntasComunidadLista` del
        // Home, contra el `refetchOnWindowFocus: false` global). Además,
        // `refetchOnMount: 'always'` — a diferencia del Home, acá SÍ se pidió
        // que el refresco sea automático cada vez que se entra a la página
        // (no solo cuando el dato ya está stale).
        refetchOnWindowFocus: true,
        refetchOnMount: 'always',
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
    if (typeof window !== 'undefined') {
        if (sessionStorage.getItem(key)) return;
        // Se marca ANTES del await (optimista): si el componente que muestra
        // el cuerpo del artículo llega a montarse por duplicado (mismo
        // patrón que Negocios — bloque móvil + escritorio), dos llamadas
        // concurrentes verían el storage vacío si se marcara después de la
        // respuesta, duplicando la vista.
        sessionStorage.setItem(key, '1');
    }
    try {
        await api.post(`/marketplace/articulos/${articuloId}/vista`);
    } catch {
        if (typeof window !== 'undefined') sessionStorage.removeItem(key);
    }
}

/**
 * Registra la vista de un artículo ya cargado (fire-and-forget, dedup por
 * sesión) — salta al vendedor para que no infle las vistas de su propio
 * artículo. Centraliza la lógica de "quién puede ver esto" para que la usen
 * por igual la página de detalle y el modal de comentarios, sin depender de
 * qué subcomponente visual está montado en cada caso (mismo patrón que
 * `useRegistrarVistaPublicacionNegocio` en Negocios).
 */
export function useRegistrarVistaArticulo(
    articulo: ArticuloMarketplaceDetalle | null | undefined
): void {
    const usuarioActual = useAuthStore((s) => s.usuario);
    useEffect(() => {
        if (!articulo) return;
        if (usuarioActual?.id === articulo.vendedor.id) return;
        registrarVistaArticulo(articulo.id);
    }, [articulo, usuarioActual?.id]);
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
 * Body que el composer (antes wizard) envía al backend.
 * `confirmadoPorUsuario` es opcional; el composer lo agrega cuando el
 * usuario eligió "Continuar de todos modos" tras una sugerencia suave de
 * moderación (servicio o búsqueda).
 */
export interface CrearArticuloPayload {
    /** Doble sentido: 'vendo' (default backend) | 'busco'. */
    modo?: ModoArticulo;
    /** Categoría obligatoria (ambos modos). */
    categoriaId: number;
    titulo: string;
    descripcion: string;
    /** Obligatorio en modo='vendo'; ausente en modo='busco'. */
    precio?: number;
    /** Presupuesto {min,max} — solo modo='busco', opcional. */
    presupuesto?: { min: number; max: number };
    /** Pin al top del feed de búsquedas — solo modo='busco'. */
    urgente?: boolean;
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
    confirmaciones?:
        | {
              // Checklist de venta (modo='vendo').
              licito: boolean;
              enPoder: boolean;
              honesto: boolean;
              seguro: boolean;
              /** Versión del texto del checklist. Formato: `v<n>-YYYY-MM-DD`. */
              version: string;
          }
        | {
              // Checklist de búsqueda (modo='busco'): sin "en mi poder".
              licito: boolean;
              real: boolean;
              seguro: boolean;
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

/**
 * `POST /api/marketplace/upload-imagen` — mutation que pide la presigned
 * URL al backend. El caller (típicamente `useFotosUploaderMarketplace`)
 * recibe `{ uploadUrl, publicUrl }`, optimiza la imagen a WebP y hace el
 * PUT directo a R2.
 *
 * Sprint 9.3: se eliminó `useSubirFotoMarketplace` (versión one-shot con
 * estado interno) que solo usaba el wizard MP. Ahora este es el único
 * punto de entrada para subir fotos al bucket MarketPlace.
 */
export function useUploadFotoMarketplace() {
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
                };
                message?: string;
            }>('/marketplace/upload-imagen', vars);
            return response.data;
        },
    });
}

/**
 * `DELETE /api/marketplace/foto-huerfana` — composer usa esto para limpiar
 * fotos que el usuario subió a R2 pero que aún no están atadas a un
 * artículo creado (canceló o descartó el borrador).
 *
 * El backend valida reference count contra `articulos_marketplace.fotos`
 * antes de borrar, así que si la URL ya está en un artículo publicado
 * queda protegida.
 */
export function useEliminarFotoMarketplaceHuerfana() {
    return useMutation({
        mutationFn: async (url: string) => {
            const response = await api.delete<{
                success: boolean;
                message?: string;
            }>('/marketplace/foto-huerfana', { data: { url } });
            return response.data;
        },
    });
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
    /** 'vendo' (venta) | 'busco' (demanda). Buscador global trae ambos. */
    modo: ModoArticulo;
    titulo: string;
    /** NULL en modo='busco'. */
    precio: number | null;
    /** Presupuesto {min,max} — solo modo='busco', opcional. */
    presupuesto: { min: number; max: number } | null;
    /** NULL cuando no aplica. */
    condicion: string | null;
    fotoPortada: string | null;
    ciudad: string;
    /** Nombre del usuario que publicó (solo personas — MP no admite negocios). */
    vendedorNombre: string;
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

// =============================================================================
// COMENTARIOS (hilos de 1 nivel — reemplaza el Q&A)
// =============================================================================

/** Árbol de comentarios (raíces + respuestas) de un artículo. */
export function useComentariosArticulo(articuloId: string | undefined) {
    return useQuery({
        queryKey: queryKeys.marketplace.comentarios(articuloId ?? ''),
        queryFn: async (): Promise<ComentarioMarketplace[]> => {
            const response = await api.get<{ success: boolean; data: ComentarioMarketplace[] }>(
                `/marketplace/articulos/${articuloId}/comentarios`
            );
            return response.data.data ?? [];
        },
        enabled: !!articuloId,
        // Sin staleTime: los comentarios son contenido social — al reabrir el
        // modal (ej. desde el deep-link de una notificación) SIEMPRE debe
        // refrescar en vez de servir el caché de hace hasta 1 min, donde un
        // comentario recién llegado podía no aparecer hasta recargar la página.
        staleTime: 0,
    });
}

/** Crea un comentario raíz o (con `parentId`) una respuesta. */
export function useCrearComentario() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message: string; data?: { id: string } },
        unknown,
        { articuloId: string; texto: string; parentId?: string | null }
    >({
        mutationFn: async ({ articuloId, texto, parentId }) => {
            const response = await api.post(
                `/marketplace/articulos/${articuloId}/comentarios`,
                { texto, parentId: parentId ?? null }
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.comentarios(variables.articuloId),
            });
            queryClient.invalidateQueries({ queryKey: ['marketplace', 'feed-infinito'] });
        },
    });
}

/** El autor edita su comentario (sin límite de tiempo). */
export function useEditarComentario() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message: string },
        unknown,
        { comentarioId: string; articuloId: string; texto: string }
    >({
        mutationFn: async ({ comentarioId, texto }) => {
            const response = await api.put(
                `/marketplace/comentarios/${comentarioId}`,
                { texto }
            );
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.comentarios(variables.articuloId),
            });
            queryClient.invalidateQueries({ queryKey: ['marketplace', 'feed-infinito'] });
        },
    });
}

/** Elimina un comentario (autor o dueño del artículo). */
export function useEliminarComentario() {
    const queryClient = useQueryClient();
    return useMutation<
        { success: boolean; message: string },
        unknown,
        { comentarioId: string; articuloId: string }
    >({
        mutationFn: async ({ comentarioId }) => {
            const response = await api.delete(`/marketplace/comentarios/${comentarioId}`);
            return response.data;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.marketplace.comentarios(variables.articuloId),
            });
            queryClient.invalidateQueries({ queryKey: ['marketplace', 'feed-infinito'] });
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
