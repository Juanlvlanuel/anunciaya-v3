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
import type {
    PreguntaComunidad,
    CrearPreguntaInput,
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
