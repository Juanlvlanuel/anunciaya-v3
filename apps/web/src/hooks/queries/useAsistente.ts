/**
 * useAsistente.ts
 * ================
 * Mutation para `POST /api/asistente/interpretar` — un turno del Asistente
 * Coyo (FAB global). Mismo patrón que `useSugerirArticuloIA` en
 * `useMarketplace.ts`: mutation directa con `api.post`, sin cache de React
 * Query (no es un dato reusable, es una acción disparada por el usuario).
 *
 * Ubicación: apps/web/src/hooks/queries/useAsistente.ts
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { ResultadosCoyo } from '../../types/preguntasComunidad';

// =============================================================================
// TIPOS — deben calzar con apps/api/src/services/asistente/asistente.service.ts
// =============================================================================

export interface TurnoChatAsistente {
    rol: 'usuario' | 'coyo';
    texto: string;
}

export type ResultadoAsistente =
    | { tipo: 'pregunta'; texto: string }
    | { tipo: 'respuesta'; texto: string; resultados: ResultadosCoyo | null }
    | { tipo: 'navegar'; ruta: string; mensaje?: string }
    | {
          tipo: 'prefill_marketplace';
          ruta: string;
          modo: 'vendo' | 'busco';
          descripcionArticulo: string;
          descripcion?: string;
          categoriaId?: number;
          precio?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_servicio';
          ruta: string;
          modo: 'ofrezco' | 'solicito';
          descripcionServicio: string;
          descripcion?: string;
          categoria?: 'hogar' | 'cuidados' | 'eventos' | 'belleza-bienestar' | 'empleo' | 'otros';
          presupuesto?: number;
          mensaje?: string;
      };

export interface InterpretarAsistentePayload {
    texto?: string;
    audioBase64?: string;
    audioMimeType?: 'audio/webm' | 'audio/ogg' | 'audio/mp4' | 'audio/mpeg';
    historial: TurnoChatAsistente[];
    rutaActual: string;
    modoComercial?: boolean;
    ciudad?: string;
    lat?: number;
    lng?: number;
}

type RespuestaInterpretarAsistente =
    | { success: true; resultado: ResultadoAsistente }
    | { success: false; message: string };

export function useInterpretarAsistente() {
    return useMutation({
        mutationFn: async (payload: InterpretarAsistentePayload) => {
            const response = await api.post<RespuestaInterpretarAsistente>(
                '/asistente/interpretar',
                payload,
            );
            return response.data;
        },
    });
}
