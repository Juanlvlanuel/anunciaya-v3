/**
 * usePreguntasComunidad.ts
 * =========================
 * Hooks de React Query para el feed "Pregúntale a [ciudad]" del Home.
 *
 * Hooks expuestos:
 *   - usePreguntasComunidadLista()  → feed de la ciudad activa del useGpsStore
 *   - useCrearPregunta()            → mutation: publicar pregunta + invalida feed
 *
 * Notas de diseño:
 *   - La ciudad se toma del `useGpsStore` (el frontend solo conoce la ciudad
 *     como texto; no hay UUID de regiones). Si no hay ciudad activa, el query
 *     queda deshabilitado.
 *   - Sin Socket.io — refresco "ligero" vía `refetchOnWindowFocus: true` y el
 *     `staleTime` por defecto del proyecto (2 min).
 *   - Sin optimistic update en crear: el documento de patrón lo desaconseja
 *     para "crear desde cero" (genera complejidad sin ganancia perceptible).
 *
 * Ubicación: apps/web/src/hooks/queries/usePreguntasComunidad.ts
 */

import {
    useQuery,
    useMutation,
    useQueryClient,
    keepPreviousData,
} from '@tanstack/react-query';
import * as preguntasComunidadService from '../../services/preguntasComunidadService';
import {
    esEstadoCoyoFinal,
    type PreguntaComunidad,
    type CrearPreguntaInput,
    type EstadoCoyo,
    type EstadoCoyoResponse,
} from '../../types/preguntasComunidad';
import { useGpsStore } from '../../stores/useGpsStore';
import { queryKeys } from '../../config/queryKeys';

// =============================================================================
// CONSTANTES
// =============================================================================

const LIMIT_DEFAULT = 20;
const OFFSET_DEFAULT = 0;

// =============================================================================
// LISTA: feed de la ciudad activa
// =============================================================================

/**
 * Devuelve el feed de preguntas 'activa' de la ciudad actualmente seleccionada
 * en `useGpsStore`. Si no hay ciudad, queda deshabilitado.
 *
 * Comportamiento de refresco:
 *   - `staleTime` por defecto del proyecto (2 min): cachea entre navegaciones.
 *   - `refetchOnWindowFocus: true`: cuando el usuario vuelve a la pestaña
 *     (cambio de tab del navegador) se refresca en background si está stale.
 *   - `placeholderData: keepPreviousData`: al cambiar de ciudad, mantiene la
 *     lista anterior visible hasta que llega la nueva (sin temblor).
 */
export function usePreguntasComunidadLista(opciones?: {
    limit?: number;
    offset?: number;
}) {
    const ciudad = useGpsStore((s) => s.ciudad?.nombre ?? '');
    const limit = opciones?.limit ?? LIMIT_DEFAULT;
    const offset = opciones?.offset ?? OFFSET_DEFAULT;

    return useQuery({
        queryKey: queryKeys.preguntasComunidad.porCiudad(ciudad, { limit, offset }),
        queryFn: () =>
            preguntasComunidadService
                .listarPreguntasPorCiudad({ ciudad, limit, offset })
                .then((r) => r.data ?? []),
        enabled: ciudad.length > 0,
        placeholderData: keepPreviousData,
        // Sobrescribe el default global (false) — el Home se beneficia de
        // ver preguntas frescas al volver a la pestaña.
        refetchOnWindowFocus: true,
    });
}

// =============================================================================
// MUTACIÓN: crear pregunta
// =============================================================================

/**
 * Publica una nueva pregunta. Al éxito invalida el feed de la ciudad afectada
 * (prefix match: cubre cualquier paginación de esa ciudad).
 *
 * Maneja el patrón de envoltorio del backend: si `res.success === false`
 * lanza un Error para que React Query dispare `onError` en lugar de `onSuccess`
 * (regla obligatoria del documento PATRON_REACT_QUERY.md).
 */
export function useCrearPregunta() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (datos: CrearPreguntaInput): Promise<PreguntaComunidad | undefined> => {
            const res = await preguntasComunidadService.crearPregunta(datos);
            if (!res.success) {
                throw new Error(
                    (res as unknown as { error?: string }).error
                        ?? res.message
                        ?? 'Error al crear la pregunta'
                );
            }
            return res.data;
        },

        onSuccess: (_data, variables) => {
            // Invalida todas las páginas del feed de esa ciudad (prefix match
            // sobre ['preguntasComunidad', 'porCiudad', ciudad, ...]).
            qc.invalidateQueries({
                queryKey: ['preguntasComunidad', 'porCiudad', variables.ciudad],
            });
        },
    });
}

// =============================================================================
// SONDEO: estado de Coyo de UNA pregunta
// =============================================================================

/**
 * Intervalo de sondeo en ms. 2 segundos es buen compromiso: rápido lo
 * suficiente para sentir que Coyo "responde solito", lento lo suficiente
 * para no saturar el server con preguntas viejas que tardaron en procesar.
 */
const INTERVALO_SONDEO_MS = 2000;

/**
 * Sondea el estado de Coyo de una pregunta hasta que llegue a un estado
 * final ('listo' | 'sin_respuesta' | 'no_aplica'). Diseñado para que cada
 * `CardPregunta` lo invoque con el `estadoCoyo` que ya viene en el feed:
 *
 *   - Si `estadoInicial` ya es final → el query queda DESHABILITADO. No
 *     se hace ningún request. Las preguntas viejas del feed ni siquiera
 *     llaman al endpoint de sondeo.
 *   - Si `estadoInicial` es 'pendiente' / 'procesando' → el query arranca,
 *     y mientras el `data.estadoCoyo` siga siendo pendiente/procesando,
 *     `refetchInterval` devuelve 2000ms. Cuando llega a un estado final,
 *     `refetchInterval` devuelve `false` y el sondeo se DETIENE solo.
 *
 * @param preguntaId    UUID de la pregunta.
 * @param estadoInicial El `estadoCoyo` del feed (decide si arrancar).
 */
export function useEstadoCoyo(preguntaId: string, estadoInicial: EstadoCoyo) {
    const inicialEsFinal = esEstadoCoyoFinal(estadoInicial);
    const qc = useQueryClient();

    return useQuery<EstadoCoyoResponse | null>({
        queryKey: queryKeys.preguntasComunidad.estadoCoyo(preguntaId),
        queryFn: async () => {
            const r = await preguntasComunidadService.obtenerEstadoCoyo(preguntaId);
            const data = r.data ?? null;
            // Cuando la pregunta llega a estado final, invalidamos el feed
            // para que las consumers que dependen de `feed.data` (ej.
            // `useCoyoEstadoVisual` para apagar el "pensando" del Coyo
            // animado en el hero) vean el nuevo estado. Sin esto, el feed
            // se queda con la versión vieja y el Coyo del hero se queda
            // "pensando" aunque la respuesta ya esté visible en la card.
            if (data && esEstadoCoyoFinal(data.estadoCoyo)) {
                qc.invalidateQueries({
                    queryKey: ['preguntasComunidad', 'porCiudad'],
                });
            }
            return data;
        },
        // Solo arranca si la pregunta aún no terminó. Las preguntas viejas
        // del feed (con estado final) no hacen ningún request.
        enabled: preguntaId.length > 0 && !inicialEsFinal,
        // refetchInterval CONDICIONAL: 2s mientras esté procesando, false
        // (detener) cuando llegue a estado final. Esto cumple la regla
        // "Coyo debe poder apagarse sin saturar el server".
        refetchInterval: (query) => {
            const estado = query.state.data?.estadoCoyo;
            // Si aún no hay data (primer fetch en vuelo) o el estado actual
            // sigue siendo no-final → sigue sondeando.
            if (!estado || !esEstadoCoyoFinal(estado)) {
                return INTERVALO_SONDEO_MS;
            }
            return false;
        },
        // El sondeo ya está corriendo en intervalo, no necesitamos también
        // refetch al focus (sería redundante y duplicaría requests).
        refetchOnWindowFocus: false,
    });
}
