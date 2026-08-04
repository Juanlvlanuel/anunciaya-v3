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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { queryKeys } from '../../config/queryKeys';
import type {
    CrearDinamicaPayload,
    EditarBorradorDinamicaPayload,
    PublicarDinamicaPayload,
    Dinamica,
    MisDinamicasRespuesta,
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

export function useDinamica(dinamicaId: string | null) {
    return useQuery({
        queryKey: queryKeys.dinamicas.dinamica(dinamicaId ?? ''),
        queryFn: async () => {
            const response = await api.get<{ success: boolean; data: Dinamica }>(`/dinamicas/${dinamicaId}`);
            return response.data.data;
        },
        enabled: !!dinamicaId,
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
