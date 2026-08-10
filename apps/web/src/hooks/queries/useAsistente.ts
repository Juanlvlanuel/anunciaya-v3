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
      }
    | {
          tipo: 'prefill_catalogo';
          ruta: string;
          tipoArticulo: 'producto' | 'servicio';
          nombre: string;
          descripcion?: string;
          categoria?: string;
          precioBase?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_publicacion_negocio';
          ruta: string;
          texto: string;
          precio?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_vacante';
          ruta: string;
          titulo: string;
          descripcion: string;
          tipoEmpleo: 'tiempo-completo' | 'medio-tiempo' | 'por-proyecto' | 'eventual';
          modalidad: 'presencial' | 'remoto' | 'hibrido';
          salario?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_recompensa';
          ruta: string;
          nombre: string;
          descripcion?: string;
          puntosRequeridos?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_config_puntos';
          ruta: string;
          pesosPor?: number;
          puntosGanados?: number;
          diasExpiracionPuntos?: number | null;
          diasExpiracionVoucher?: number;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_sucursal';
          ruta: string;
          nombre: string;
          ciudad: string;
          estado: string;
          latitud: number;
          longitud: number;
          direccion?: string;
          telefono?: string;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_empleado';
          ruta: string;
          nombre: string;
          nick: string;
          especialidad?: string;
          telefono?: string;
          puedeRegistrarVentas?: boolean;
          puedeProcesarCanjes?: boolean;
          puedeVerHistorial?: boolean;
          puedeResponderChat?: boolean;
          puedeResponderResenas?: boolean;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_perfil_comercial';
          ruta: string;
          descripcion?: string;
          telefono?: string;
          whatsapp?: string;
          correo?: string;
          sitioWeb?: string;
          direccion?: string;
          ciudad?: string;
          estado?: string;
          latitud?: number;
          longitud?: number;
          metodoPagoEfectivo?: boolean;
          metodoPagoTarjeta?: boolean;
          metodoPagoTransferencia?: boolean;
          tieneEnvio?: boolean;
          tieneServicio?: boolean;
          mensaje?: string;
      }
    | {
          tipo: 'prefill_oferta';
          ruta: string;
          titulo: string;
          tipoOferta: 'porcentaje' | 'monto_fijo' | '2x1' | '3x2' | 'envio_gratis' | 'otro';
          valor?: string;
          fechaInicio: string;
          fechaFin: string;
          descripcion?: string;
          compraMinima?: number;
          mensaje?: string;
      };

export interface InterpretarAsistentePayload {
    texto?: string;
    audioBase64?: string;
    audioMimeType?: 'audio/webm' | 'audio/ogg' | 'audio/mp4' | 'audio/mpeg';
    historial: TurnoChatAsistente[];
    rutaActual: string;
    modoComercial?: boolean;
    /** Nombre real del negocio (modo comercial) — evita que Gemini invente uno al redactar descripciones/textos. */
    nombreNegocio?: string;
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
