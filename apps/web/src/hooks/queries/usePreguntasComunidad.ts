/**
 * usePreguntasComunidad.ts
 * =========================
 * Hooks de React Query para el feed "Pregúntale a [ciudad]" del Home.
 *
 * Hooks expuestos:
 *   - usePreguntasComunidadLista()  → feed de la ciudad activa del useGpsStore
 *   - useCrearPregunta()            → mutation: publicar pregunta + invalida feed
 *   - useEstadoCoyo()               → sondeo del estado de Coyo de UNA pregunta
 *
 *   ── Sprint 1 — Respuestas + Interés ─────────────────────────────────────
 *   - useRespuestas(preguntaId)     → lista de respuestas (paginada)
 *   - useCrearRespuesta()           → mutation: responder + invalida lista + feed
 *   - useBorrarMiRespuesta()        → mutation: soft-delete + invalida lista + feed
 *   - useMarcarInteres()            → mutation: marcar interés + optimistic feed
 *   - useQuitarInteres()            → mutation: quitar interés + optimistic feed
 *
 *   ── Sprint 1 — Control del Autor ────────────────────────────────────────
 *   - useCerrarMiPregunta()         → mutation: estado='cerrada' + invalida feed
 *   - useMarcarResuelta()           → mutation: resuelta_at=NOW() + invalida feed
 *   - useBorrarMiPregunta()         → mutation: estado='oculta' + invalida feed
 *   - useEditarMiPregunta()         → mutation: cambiar texto + re-dispara Coyo
 *
 * Notas de diseño:
 *   - La ciudad se toma del `useGpsStore` (el frontend solo conoce la ciudad
 *     como texto; no hay UUID de regiones). Si no hay ciudad activa, el query
 *     queda deshabilitado.
 *   - Sin Socket.io — refresco "ligero" vía `refetchOnWindowFocus: true` y el
 *     `staleTime` por defecto del proyecto (2 min).
 *   - Sin optimistic update en crear pregunta/respuesta: el documento de
 *     patrón lo desaconseja para "crear desde cero".
 *   - Optimistic update SÍ en marcar/quitar interés: la acción es booleana y
 *     el conteo cambia ±1 — el rollback es trivial si falla.
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
    type RespuestaPreguntaComunidad,
    type CrearRespuestaInput,
    type EditarPreguntaInput,
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
// DETALLE: una pregunta por id (deep-link de notificaciones)
// =============================================================================

/**
 * Trae UNA pregunta por su id. Lo usa el Home para destacar la pregunta a la
 * que apunta una notificación (`/inicio?preguntaId=<id>`), sin depender de
 * que esté entre las primeras 20 del feed ni de la ciudad activa.
 *
 *   - `enabled: false` cuando no hay id → no hace ningún request.
 *   - `retry: false`: si la pregunta ya no está activa el backend devuelve
 *     404; no tiene sentido reintentar — el componente muestra un aviso.
 *   - Devuelve `null` si el backend respondió sin `data`.
 */
export function usePregunta(preguntaId: string) {
    return useQuery<PreguntaComunidad | null>({
        queryKey: queryKeys.preguntasComunidad.detalle(preguntaId),
        queryFn: () =>
            preguntasComunidadService
                .obtenerPregunta(preguntaId)
                .then((r) => r.data ?? null),
        enabled: preguntaId.length > 0,
        retry: false,
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

// =============================================================================
// RESPUESTAS DE LA COMUNIDAD (Sprint 1)
// =============================================================================

const LIMIT_RESPUESTAS_DEFAULT = 20;
const OFFSET_RESPUESTAS_DEFAULT = 0;

/**
 * Lista las respuestas activas de una pregunta. El componente decide cuándo
 * habilitarlo (típicamente al hacer click en "Ver N respuestas"), así que
 * el hook acepta un flag `enabled` además del preguntaId.
 *
 * Las respuestas vienen en orden cronológico (la más vieja primero) — flujo
 * natural de conversación. Backend limita a 50 por página.
 */
export function useRespuestas(
    preguntaId: string,
    opciones?: { limit?: number; offset?: number; enabled?: boolean },
) {
    const limit = opciones?.limit ?? LIMIT_RESPUESTAS_DEFAULT;
    const offset = opciones?.offset ?? OFFSET_RESPUESTAS_DEFAULT;
    const enabled = opciones?.enabled ?? true;

    return useQuery({
        queryKey: queryKeys.preguntasComunidad.respuestas(preguntaId, { limit, offset }),
        queryFn: () =>
            preguntasComunidadService
                .listarRespuestas({ preguntaId, limit, offset })
                .then((r) => r.data ?? []),
        enabled: enabled && preguntaId.length > 0,
        placeholderData: keepPreviousData,
    });
}

/**
 * Helper: invalida el feed por ciudad (para refrescar conteos
 * totalRespuestas/totalInteresados) Y la lista de respuestas de la pregunta.
 * Se usa después de cualquier mutación que toque respuestas.
 */
function invalidarFeedYRespuestas(
    qc: ReturnType<typeof useQueryClient>,
    preguntaId: string,
) {
    qc.invalidateQueries({ queryKey: ['preguntasComunidad', 'porCiudad'] });
    qc.invalidateQueries({
        queryKey: ['preguntasComunidad', 'respuestas', preguntaId],
    });
}

/**
 * Publica una respuesta. Al éxito invalida la lista de respuestas (para
 * mostrar la nueva) y el feed (para actualizar el contador
 * `totalRespuestas` de la card).
 */
export function useCrearRespuesta() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (
            input: CrearRespuestaInput,
        ): Promise<RespuestaPreguntaComunidad | undefined> => {
            const res = await preguntasComunidadService.crearRespuesta(input);
            if (!res.success) {
                throw new Error(
                    (res as unknown as { error?: string }).error
                        ?? res.message
                        ?? 'Error al publicar la respuesta',
                );
            }
            return res.data;
        },
        onSuccess: (_data, variables) => {
            invalidarFeedYRespuestas(qc, variables.preguntaId);
        },
    });
}

/**
 * Soft-delete de la propia respuesta. Solo el autor de la respuesta puede
 * borrarla. Al éxito invalida la lista (para que desaparezca) y el feed
 * (para que el contador `totalRespuestas` baje).
 */
export function useBorrarMiRespuesta() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (variables: { respuestaId: string; preguntaId: string }) => {
            const res = await preguntasComunidadService.borrarMiRespuesta(
                variables.respuestaId,
            );
            if (!res.success) {
                throw new Error(
                    (res as unknown as { error?: string }).error
                        ?? res.message
                        ?? 'Error al borrar la respuesta',
                );
            }
            return res.data;
        },
        onSuccess: (_data, variables) => {
            invalidarFeedYRespuestas(qc, variables.preguntaId);
        },
    });
}

// =============================================================================
// INTERÉS ("yo también quiero saber") — Sprint 1
// =============================================================================

/**
 * Aplica el delta optimista de interés a TODAS las queries del feed que
 * contengan la pregunta (cualquier ciudad/paginación). Devuelve el snapshot
 * previo para poder hacer rollback en onError.
 *
 * `delta = +1` (marcar) o `-1` (quitar). El optimistic update también
 * cambia el booleano `yoTambienInteresado` al valor objetivo.
 */
function aplicarDeltaInteresOptimista(
    qc: ReturnType<typeof useQueryClient>,
    preguntaId: string,
    delta: 1 | -1,
): Map<readonly unknown[], PreguntaComunidad[] | undefined> {
    const objetivo = delta === 1;
    const snapshot = new Map<readonly unknown[], PreguntaComunidad[] | undefined>();

    // Recorre TODAS las queries del feed (porCiudad), parchea la pregunta
    // afectada. React Query devuelve [key, data] pairs.
    const queriesFeed = qc.getQueriesData<PreguntaComunidad[]>({
        queryKey: ['preguntasComunidad', 'porCiudad'],
    });

    for (const [key, data] of queriesFeed) {
        snapshot.set(key, data);
        if (!data) continue;
        const idx = data.findIndex((p) => p.id === preguntaId);
        if (idx === -1) continue;
        const actual = data[idx];
        // Si el estado ya coincide con el objetivo, no tocamos nada (la
        // mutación es idempotente y no debería cambiar el conteo).
        if (actual.yoTambienInteresado === objetivo) continue;
        const parchada: PreguntaComunidad = {
            ...actual,
            yoTambienInteresado: objetivo,
            totalInteresados: Math.max(0, actual.totalInteresados + delta),
        };
        const nueva = [...data];
        nueva[idx] = parchada;
        qc.setQueryData(key, nueva);
    }

    return snapshot;
}

/** Marca interés del usuario en una pregunta (optimistic). */
export function useMarcarInteres() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (preguntaId: string) => {
            const res = await preguntasComunidadService.marcarInteres(preguntaId);
            if (!res.success) {
                throw new Error(
                    (res as unknown as { error?: string }).error
                        ?? res.message
                        ?? 'Error al marcar interés',
                );
            }
            return res.data;
        },
        // Optimistic: parchea el feed antes de que el server responda.
        onMutate: async (preguntaId) => {
            // Cancela cualquier refetch en vuelo del feed para que no
            // sobrescriba nuestro patch optimista.
            await qc.cancelQueries({ queryKey: ['preguntasComunidad', 'porCiudad'] });
            const snapshot = aplicarDeltaInteresOptimista(qc, preguntaId, +1);
            return { snapshot };
        },
        // Si falla, restauramos el snapshot previo.
        onError: (_err, _preguntaId, ctx) => {
            if (!ctx) return;
            for (const [key, data] of ctx.snapshot.entries()) {
                qc.setQueryData(key, data);
            }
        },
        // Al final (éxito o error), invalida el feed para sincronizar con
        // los conteos reales del servidor.
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ['preguntasComunidad', 'porCiudad'] });
        },
    });
}

/** Quita interés del usuario en una pregunta (optimistic). */
export function useQuitarInteres() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (preguntaId: string) => {
            const res = await preguntasComunidadService.quitarInteres(preguntaId);
            if (!res.success) {
                throw new Error(
                    (res as unknown as { error?: string }).error
                        ?? res.message
                        ?? 'Error al quitar interés',
                );
            }
            return res.data;
        },
        onMutate: async (preguntaId) => {
            await qc.cancelQueries({ queryKey: ['preguntasComunidad', 'porCiudad'] });
            const snapshot = aplicarDeltaInteresOptimista(qc, preguntaId, -1);
            return { snapshot };
        },
        onError: (_err, _preguntaId, ctx) => {
            if (!ctx) return;
            for (const [key, data] of ctx.snapshot.entries()) {
                qc.setQueryData(key, data);
            }
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: ['preguntasComunidad', 'porCiudad'] });
        },
    });
}

// =============================================================================
// CONTROL DEL AUTOR (Sprint 1)
// =============================================================================

/**
 * Helper: invalida el feed por ciudad. Se usa después de cualquier acción
 * del autor (cerrar/borrar/resolver/editar/reintentar).
 */
function invalidarFeed(qc: ReturnType<typeof useQueryClient>) {
    qc.invalidateQueries({ queryKey: ['preguntasComunidad', 'porCiudad'] });
}

/** Autor cierra su pregunta (estado='cerrada'). Sale del feed. */
export function useCerrarMiPregunta() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (preguntaId: string) => {
            const res = await preguntasComunidadService.cerrarMiPregunta(preguntaId);
            if (!res.success) {
                throw new Error(
                    (res as unknown as { error?: string }).error
                        ?? res.message
                        ?? 'Error al cerrar pregunta',
                );
            }
            return res.data;
        },
        onSuccess: () => invalidarFeed(qc),
    });
}

/** Autor marca su pregunta como resuelta (resuelta_at=NOW()). Sigue activa. */
export function useMarcarResuelta() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (preguntaId: string) => {
            const res = await preguntasComunidadService.marcarResuelta(preguntaId);
            if (!res.success) {
                throw new Error(
                    (res as unknown as { error?: string }).error
                        ?? res.message
                        ?? 'Error al marcar resuelta',
                );
            }
            return res.data;
        },
        onSuccess: () => invalidarFeed(qc),
    });
}

/** Autor borra su pregunta (soft-delete, estado='oculta'). */
export function useBorrarMiPregunta() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (preguntaId: string) => {
            const res = await preguntasComunidadService.borrarMiPregunta(preguntaId);
            if (!res.success) {
                throw new Error(
                    (res as unknown as { error?: string }).error
                        ?? res.message
                        ?? 'Error al borrar pregunta',
                );
            }
            return res.data;
        },
        onSuccess: () => invalidarFeed(qc),
    });
}

/**
 * Sprint 2.D — Reintentar pregunta cuando Coyo cayó en `sin_respuesta`.
 *
 * Solo el autor; solo válido si `estado_coyo === 'sin_respuesta'` (backend
 * valida). Resetea los 4 campos de Coyo y re-dispara el orquestador.
 *
 * Invalidaciones (mismo patrón que `useEditarMiPregunta`):
 *   - Feed por ciudad + Mis preguntas → para que la card muestre el
 *     nuevo estado pendiente/procesando.
 *   - `estadoCoyo` de esa pregunta específica → para que el sondeo
 *     arranque de nuevo.
 */
export function useReintentarMiPregunta() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (preguntaId: string) => {
            const res = await preguntasComunidadService.reintentarMiPregunta(preguntaId);
            if (!res.success) {
                throw new Error(
                    (res as unknown as { error?: string }).error
                        ?? res.message
                        ?? 'Error al reintentar pregunta',
                );
            }
            return res.data;
        },
        onSuccess: (_data, preguntaId) => {
            invalidarFeed(qc);
            qc.invalidateQueries({
                queryKey: queryKeys.preguntasComunidad.estadoCoyo(preguntaId),
            });
        },
    });
}

/**
 * Autor edita el texto de su pregunta. Solo permitido si tiene 0 respuestas
 * activas. El backend re-dispara Coyo con el texto nuevo (fire-and-forget),
 * así que el cliente debe sondear de nuevo `estadoCoyo`.
 */
export function useEditarMiPregunta() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: EditarPreguntaInput) => {
            const res = await preguntasComunidadService.editarMiPregunta(input);
            if (!res.success) {
                throw new Error(
                    (res as unknown as { error?: string }).error
                        ?? res.message
                        ?? 'Error al editar pregunta',
                );
            }
            return res.data;
        },
        onSuccess: (_data, variables) => {
            invalidarFeed(qc);
            // Invalida también el sondeo de Coyo para que el cliente
            // vuelva a pedirlo con el texto nuevo (la pregunta arranca
            // de nuevo en estadoCoyo='pendiente').
            qc.invalidateQueries({
                queryKey: queryKeys.preguntasComunidad.estadoCoyo(variables.preguntaId),
            });
        },
    });
}
