/**
 * useDinamicas.ts
 * ================
 * Hooks de React Query para Dinámicas (Fase 1-2) — calcados de los
 * equivalentes de `useMarketplace.ts` (mismo patrón: mutation devuelve
 * `{success, data}` o `{success:false, code, message}`, invalidación de
 * queryKeys en `onSuccess`).
 *
 * Ubicación: apps/web/src/hooks/queries/useDinamicas.ts
 */

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import type {
    CrearDinamicaPayload,
    EditarBorradorDinamicaPayload,
    PublicarDinamicaPayload,
    Dinamica,
    DinamicaDetallePublico,
    MisDinamicasRespuesta,
    RespuestaFeedDinamicas,
    BoletoDinamica,
} from '../../types/dinamicas';

// =============================================================================
// RESPUESTAS
// =============================================================================

interface RespuestaModeracionDinamica {
    success: false;
    code: number;
    message: string;
    moderacion: {
        categoria: string;
        mensaje: string;
        palabraDetectada?: string;
    };
}

interface RespuestaDinamicaOk {
    success: true;
    data: Dinamica;
}

type RespuestaDinamica = RespuestaDinamicaOk | RespuestaModeracionDinamica;

// =============================================================================
// CICLO DE VIDA
// =============================================================================

export function useCrearDinamica() {
    const queryClient = useQueryClient();
    return useMutation<RespuestaDinamica, unknown, CrearDinamicaPayload>({
        mutationFn: async (payload) => {
            const response = await api.post<RespuestaDinamica>('/dinamicas', payload);
            return response.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: queryKeys.dinamicas.all() });
            }
        },
    });
}

export function useEditarBorradorDinamica() {
    const queryClient = useQueryClient();
    return useMutation<
        RespuestaDinamica,
        unknown,
        { dinamicaId: string; payload: EditarBorradorDinamicaPayload }
    >({
        mutationFn: async ({ dinamicaId, payload }) => {
            const response = await api.put<RespuestaDinamica>(`/dinamicas/${dinamicaId}`, payload);
            return response.data;
        },
        onSuccess: (data, vars) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: queryKeys.dinamicas.all() });
                queryClient.invalidateQueries({ queryKey: queryKeys.dinamicas.dinamica(vars.dinamicaId) });
            }
        },
    });
}

export function usePublicarDinamica() {
    const queryClient = useQueryClient();
    return useMutation<
        RespuestaDinamica,
        unknown,
        { dinamicaId: string; payload: PublicarDinamicaPayload }
    >({
        mutationFn: async ({ dinamicaId, payload }) => {
            const response = await api.post<RespuestaDinamica>(`/dinamicas/${dinamicaId}/publicar`, payload);
            return response.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: queryKeys.dinamicas.all() });
            }
        },
    });
}

export function usePosponerDinamica() {
    const queryClient = useQueryClient();
    return useMutation<
        RespuestaDinamica,
        unknown,
        { dinamicaId: string; nuevaFechaLimiteInscripcion: string }
    >({
        mutationFn: async ({ dinamicaId, nuevaFechaLimiteInscripcion }) => {
            const response = await api.post<RespuestaDinamica>(`/dinamicas/${dinamicaId}/posponer`, {
                nuevaFechaLimiteInscripcion,
            });
            return response.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: queryKeys.dinamicas.all() });
            }
        },
    });
}

export function useCancelarDinamica() {
    const queryClient = useQueryClient();
    return useMutation<RespuestaDinamica, unknown, string>({
        mutationFn: async (dinamicaId) => {
            const response = await api.post<RespuestaDinamica>(`/dinamicas/${dinamicaId}/cancelar`);
            return response.data;
        },
        onSuccess: (data) => {
            if (data.success) {
                queryClient.invalidateQueries({ queryKey: queryKeys.dinamicas.all() });
            }
        },
    });
}

// =============================================================================
// LECTURA
// =============================================================================

export function useMisDinamicas() {
    return useQuery({
        queryKey: queryKeys.dinamicas.mias(),
        queryFn: async () => {
            const response = await api.get<{ success: boolean; data: MisDinamicasRespuesta }>('/dinamicas/mias');
            return response.data.data;
        },
    });
}

/** Ficha de la Dinámica — el backend ya la devuelve enriquecida (organizador,
 *  boletos vendidos/disponibles, insignia); `DinamicaDetallePublico` extiende
 *  `Dinamica`, así que el composer (que solo lee los campos base para
 *  hidratar el draft de edición) sigue funcionando igual. */
export function useDinamica(dinamicaId: string | null) {
    return useQuery({
        queryKey: queryKeys.dinamicas.dinamica(dinamicaId ?? ''),
        queryFn: async () => {
            const response = await api.get<{ success: boolean; data: DinamicaDetallePublico }>(
                `/dinamicas/${dinamicaId}`,
            );
            return response.data.data;
        },
        enabled: !!dinamicaId,
    });
}

// =============================================================================
// FASE 3 — feed público, boletos y participación
// =============================================================================

interface UseFeedInfinitoDinamicasParams {
    ciudad: string | null | undefined;
    limite?: number;
}

/** Feed infinito de Dinámicas — calcado de `useFeedInfinitoMarketplace`
 *  (`useMarketplace.ts`): mismo patrón de paginación offset-based,
 *  `keepPreviousData` para evitar temblor visual (PATRON_REACT_QUERY). */
export function useFeedInfinitoDinamicas(params: UseFeedInfinitoDinamicasParams) {
    const { ciudad, limite = 10 } = params;
    const habilitado = !!ciudad;

    return useInfiniteQuery({
        queryKey: queryKeys.dinamicas.feed({ ciudad: ciudad ?? '', limite }),
        queryFn: async ({ pageParam }): Promise<RespuestaFeedDinamicas> => {
            const response = await api.get<{ success: boolean; data: RespuestaFeedDinamicas }>('/dinamicas', {
                params: { ciudad, pagina: pageParam, limite },
            });
            return response.data.success
                ? response.data.data
                : { dinamicas: [], pagina: pageParam as number, limite, hayMas: false };
        },
        initialPageParam: 1,
        getNextPageParam: (ultimaPagina) => (ultimaPagina.hayMas ? ultimaPagina.pagina + 1 : undefined),
        enabled: habilitado,
        staleTime: 2 * 60 * 1000,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: true,
        refetchOnMount: 'always',
    });
}

/** Lista pública de participantes — transparencia antes del cierre de
 *  inscripción (ver Contexto_Dinamicas.md). Sin `staleTime`: cambia seguido
 *  (cada reserva/confirmación) y la ficha debe reflejarlo al reabrirse. */
export function useBoletosDinamica(dinamicaId: string | null) {
    return useQuery({
        queryKey: queryKeys.dinamicas.boletos(dinamicaId ?? ''),
        queryFn: async (): Promise<BoletoDinamica[]> => {
            const response = await api.get<{ success: boolean; data: BoletoDinamica[] }>(
                `/dinamicas/${dinamicaId}/boletos`,
            );
            return response.data.data;
        },
        enabled: !!dinamicaId,
        staleTime: 0,
    });
}

interface RespuestaBoletoOk {
    success: true;
    data: { id: string; numeroBoleto: number };
}
interface RespuestaBoletoError {
    success: false;
    message: string;
}
type RespuestaBoleto = RespuestaBoletoOk | RespuestaBoletoError;

function invalidarDinamicaYBoletos(queryClient: ReturnType<typeof useQueryClient>, dinamicaId: string) {
    queryClient.invalidateQueries({ queryKey: queryKeys.dinamicas.dinamica(dinamicaId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dinamicas.boletos(dinamicaId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dinamicas.all() });
}

/** El usuario reserva un número de boleto para sí mismo — dispara chat
 *  automático con el organizador en el backend (best-effort, sin acción del
 *  frontend). */
export function useReservarBoleto() {
    const queryClient = useQueryClient();
    return useMutation<RespuestaBoleto, unknown, { dinamicaId: string; numeroBoleto: number }>({
        mutationFn: async ({ dinamicaId, numeroBoleto }) => {
            const response = await api.post<RespuestaBoleto>(`/dinamicas/${dinamicaId}/boletos/reservar`, {
                numeroBoleto,
            });
            return response.data;
        },
        onSuccess: (data, vars) => {
            if (data.success) invalidarDinamicaYBoletos(queryClient, vars.dinamicaId);
        },
    });
}

/** El organizador registra a alguien sin cuenta AY — entra directo pagado. */
export function useAgregarParticipanteManual() {
    const queryClient = useQueryClient();
    return useMutation<
        RespuestaBoleto,
        unknown,
        { dinamicaId: string; numeroBoleto: number; nombreManual: string; telefonoManual: string }
    >({
        mutationFn: async ({ dinamicaId, ...payload }) => {
            const response = await api.post<RespuestaBoleto>(`/dinamicas/${dinamicaId}/boletos/manual`, payload);
            return response.data;
        },
        onSuccess: (data, vars) => {
            if (data.success) invalidarDinamicaYBoletos(queryClient, vars.dinamicaId);
        },
    });
}

/** El organizador confirma que un boleto reservado ya se pagó (fuera de la app). */
export function useConfirmarPagoBoleto() {
    const queryClient = useQueryClient();
    return useMutation<RespuestaBoleto, unknown, { dinamicaId: string; boletoId: string }>({
        mutationFn: async ({ dinamicaId, boletoId }) => {
            const response = await api.post<RespuestaBoleto>(
                `/dinamicas/${dinamicaId}/boletos/${boletoId}/confirmar-pago`,
            );
            return response.data;
        },
        onSuccess: (data, vars) => {
            if (data.success) invalidarDinamicaYBoletos(queryClient, vars.dinamicaId);
        },
    });
}

// =============================================================================
// SUBIDA DE IMÁGENES (R2)
// =============================================================================

export function useUploadFotoDinamica() {
    return useMutation({
        mutationFn: async (vars: {
            nombreArchivo: string;
            contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'video/mp4' | 'video/webm';
        }) => {
            const response = await api.post<{
                success: boolean;
                data?: { uploadUrl: string; publicUrl: string };
                message?: string;
            }>('/dinamicas/upload-imagen', vars);
            return response.data;
        },
    });
}

/** `DELETE /api/dinamicas/foto-huerfana` — mismo uso que la de MarketPlace:
 *  limpia fotos subidas a R2 que el usuario descartó antes de crear/publicar. */
export function useEliminarFotoDinamicaHuerfana() {
    return useMutation({
        mutationFn: async (url: string) => {
            const response = await api.delete<{ success: boolean; message?: string }>('/dinamicas/foto-huerfana', {
                data: { url },
            });
            return response.data;
        },
    });
}
