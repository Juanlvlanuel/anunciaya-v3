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

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import type {
    FeedMarketplace,
    ArticuloMarketplaceDetalle,
    ArticuloMarketplace,
    CondicionArticulo,
    PerfilVendedorMarketplace,
    PublicacionesDeVendedor,
} from '../../types/marketplace';

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
    condicion: CondicionArticulo;
    aceptaOfertas: boolean;
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
 * NOTA: este hook intencionalmente NO redimensiona ni comprime. El backend
 * acepta jpeg/png/webp hasta tamaño normal de cámara. Si más adelante
 * vemos archivos > 5MB en producción, se agrega compresión client-side.
 */
export function useSubirFotoMarketplace(): UseSubirFotoMarketplaceResult {
    const [publicUrl, setPublicUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const subir = useCallback(async (file: File): Promise<string | null> => {
        setIsUploading(true);
        setError(null);
        try {
            // 1. Pedir presigned URL al backend
            const presignResp = await api.post<RespuestaUploadImagen>(
                '/marketplace/upload-imagen',
                {
                    nombreArchivo: file.name,
                    contentType: file.type,
                }
            );
            if (!presignResp.data.success || !presignResp.data.data) {
                throw new Error(presignResp.data.message ?? 'No se pudo generar URL de subida');
            }
            const { uploadUrl, publicUrl: urlFinal } = presignResp.data.data;

            // 2. PUT directo a R2 (sin auth de nuestro server)
            const putResp = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
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
