/**
 * preguntasComunidad.service.ts
 * ==============================
 * Service para el feed "Pregúntale a [ciudad]" del Home.
 *
 * Operaciones:
 *   - crearPregunta            → inserta una pregunta del vecino
 *   - listarPreguntasPorCiudad → feed paginado, solo 'activa', más reciente primero
 *
 * UBICACIÓN: apps/api/src/services/preguntasComunidad.service.ts
 */

import { db } from '../db/index.js';
import {
    preguntasComunidad,
    respuestasPreguntasComunidad,
    usuarios,
} from '../db/schemas/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type {
    CrearPreguntaInput,
    ListarPreguntasPorCiudadInput,
    PreguntaComunidadResponse,
    EstadoPregunta,
    EstadoCoyo,
    RespuestaServicio,
    EditarPreguntaInput,
    AccionAutorInput,
} from '../types/preguntasComunidad.types.js';
import { procesarPreguntaConCoyo } from './coyo/orquestador.js';

// =============================================================================
// CONSTANTES
// =============================================================================

const TEXTO_MAX = 500;
const LIMIT_DEFAULT = 20;
const LIMIT_MAX = 50;

/**
 * Días sin actividad antes de que una pregunta se autocierre.
 * "Actividad" = una respuesta NUEVA y activa. Likes, "yo también quiero saber"
 * y resueltas NO resetean el timer (decisión de producto Sprint 1).
 *
 * Si la pregunta nunca tuvo respuestas, se mide desde su `created_at`.
 */
const DIAS_EXPIRACION = 14;

// =============================================================================
// EXPIRACIÓN PASIVA (Sprint 1.E)
// =============================================================================

/**
 * Cierra todas las preguntas 'activa' de una ciudad que llevan más de
 * DIAS_EXPIRACION sin actividad. Es un "cron pasivo" — se ejecuta al inicio
 * de `listarPreguntasPorCiudad`, antes del SELECT del feed.
 *
 * Diseño:
 *   - "Actividad" = una respuesta NUEVA y activa. La fecha de referencia es
 *     `MAX(respuestas.created_at WHERE estado='activa')` para esa pregunta.
 *     Si no hay respuestas, se usa `preguntas_comunidad.created_at`.
 *   - El barrido es por ciudad para que solo el tráfico de esa ciudad pague
 *     el costo, y para que el `WHERE ciudad = ...` use el índice existente.
 *   - Idempotente: si no hay vencidas, el UPDATE afecta 0 filas y sale rápido.
 *   - No relanza errores — si el UPDATE falla, el feed se sigue mostrando
 *     normalmente (solo no se cierran preguntas en esta corrida).
 *
 * NOTA: las preguntas marcadas como `resuelta_at IS NOT NULL` también
 * expiran — marcar resuelta NO extiende el timer (solo nuevas respuestas).
 * Esto coincide con la decisión de producto y mantiene la regla simple:
 * "14 días sin que nadie aporte algo nuevo, se autocierra".
 */
async function cerrarPreguntasVencidasDeCiudad(ciudad: string): Promise<void> {
    try {
        await db.execute(sql`
            UPDATE preguntas_comunidad
            SET estado_pregunta = 'cerrada',
                updated_at = NOW()
            WHERE ciudad = ${ciudad}
              AND estado_pregunta = 'activa'
              AND COALESCE(
                  (
                      SELECT MAX(created_at)
                      FROM respuestas_preguntas_comunidad
                      WHERE pregunta_id = preguntas_comunidad.id
                        AND estado = 'activa'
                  ),
                  preguntas_comunidad.created_at
              ) < NOW() - (${DIAS_EXPIRACION} || ' days')::interval
        `);
    } catch (error) {
        // No relanzamos: el barrido es aditivo. Si falla, el feed se muestra
        // igual (solo no se cerrarán preguntas vencidas en esta corrida).
        console.warn(
            'cerrarPreguntasVencidasDeCiudad falló (no bloqueante):',
            ciudad,
            error,
        );
    }
}

// =============================================================================
// CREAR PREGUNTA
// =============================================================================

/**
 * Inserta una pregunta y devuelve el row resultante con datos básicos del autor.
 * Valida texto (no vacío, ≤ 500) y presencia de ciudad/estado.
 */
export async function crearPregunta(
    input: CrearPreguntaInput
): Promise<RespuestaServicio<PreguntaComunidadResponse>> {
    try {
        const texto = (input.texto ?? '').trim();
        const ciudad = (input.ciudad ?? '').trim();
        const estado = (input.estado ?? '').trim();

        // Validaciones (mismas reglas que el CHECK / NOT NULL del schema)
        if (texto.length === 0) {
            return { success: false, message: 'El texto de la pregunta no puede estar vacío', code: 400 };
        }
        if (texto.length > TEXTO_MAX) {
            return { success: false, message: `El texto excede el máximo de ${TEXTO_MAX} caracteres`, code: 400 };
        }
        if (ciudad.length === 0 || estado.length === 0) {
            return { success: false, message: 'Ciudad y estado son requeridos', code: 400 };
        }

        // Insert — estado_pregunta queda en el default 'activa'
        const [nueva] = await db
            .insert(preguntasComunidad)
            .values({
                usuarioId: input.usuarioId,
                texto,
                ciudad,
                estado,
            })
            .returning();

        // Traer datos del autor para enriquecer el response (el frontend
        // necesita poder pintar avatar/nombre sin un round-trip extra).
        const [autor] = await db
            .select({
                id: usuarios.id,
                nombre: usuarios.nombre,
                apellidos: usuarios.apellidos,
                avatarUrl: usuarios.avatarUrl,
            })
            .from(usuarios)
            .where(eq(usuarios.id, input.usuarioId))
            .limit(1);

        if (!autor) {
            // Caso degenerado: el FK garantiza que el autor existe al momento
            // del insert, así que esto solo pasaría en un race con un borrado
            // de cuenta concurrente. Reportamos pero devolvemos la pregunta
            // creada con datos vacíos para no perder el trabajo del usuario.
            return {
                success: false,
                message: 'Pregunta creada pero no se pudieron cargar los datos del autor',
                code: 500,
            };
        }

        const preguntaFormateada: PreguntaComunidadResponse = {
            id: nueva.id,
            texto: nueva.texto,
            ciudad: nueva.ciudad,
            estado: nueva.estado,
            estadoPregunta: nueva.estadoPregunta as EstadoPregunta,
            createdAt: nueva.createdAt ?? new Date().toISOString(),
            updatedAt: nueva.updatedAt ?? new Date().toISOString(),
            autorId: autor.id,
            autorNombre: autor.nombre,
            autorApellidos: autor.apellidos,
            autorAvatarUrl: autor.avatarUrl ?? null,
            // Campos de Coyo en su estado inicial — el frontend sondeará
            // con GET /api/preguntas-comunidad/:id/coyo hasta que el
            // orquestador (disparado fire-and-forget abajo) los actualice.
            estadoCoyo: nueva.estadoCoyo as EstadoCoyo,
            respuestaCoyo: nueva.respuestaCoyo ?? null,
            resultadosCoyo: nueva.resultadosCoyo ?? null,
            coyoProcesadoAt: nueva.coyoProcesadoAt ?? null,
            // Campos nuevos del Sprint 1 — recién creada no tiene nada todavía.
            resueltaAt: null,
            totalRespuestas: 0,
            totalInteresados: 0,
            yoTambienInteresado: false,
        };

        // ─── DISPARO COYO EN SEGUNDO PLANO (fire-and-forget) ─────────
        // No await. La pregunta se publica al instante; Coyo procesa
        // detrás. Si falla, se loguea — la publicación NO depende ni
        // espera a Coyo. El frontend sondea para enterarse del progreso.
        procesarPreguntaConCoyo(nueva.id).catch((err) => {
            console.warn(
                'Coyo orquestador falló (fire-and-forget) para',
                nueva.id,
                err,
            );
        });

        return {
            success: true,
            message: 'Pregunta creada',
            data: preguntaFormateada,
        };
    } catch (error) {
        console.error('Error en crearPregunta:', error);
        return { success: false, message: 'Error al crear pregunta', code: 500 };
    }
}

// =============================================================================
// LISTAR PREGUNTAS POR CIUDAD
// =============================================================================

/**
 * Devuelve el feed de preguntas 'activa' de una ciudad, ordenadas de la más
 * nueva a la más vieja. Incluye:
 *   - Datos básicos del autor (left join con `usuarios`).
 *   - Campos de Coyo (respuesta, estado, resultados).
 *   - `totalRespuestas` — count de respuestas activas (subquery).
 *   - `totalInteresados` — count de "yo también" (subquery).
 *   - `yoTambienInteresado` — EXISTS para el `usuarioId` actual (si vino).
 *   - `resueltaAt` — null si el autor no la marcó como resuelta.
 */
export async function listarPreguntasPorCiudad(
    input: ListarPreguntasPorCiudadInput
): Promise<RespuestaServicio<PreguntaComunidadResponse[]>> {
    try {
        const ciudad = (input.ciudad ?? '').trim();
        if (ciudad.length === 0) {
            return { success: false, message: 'La ciudad es requerida', code: 400 };
        }

        // Sanear paginación
        const limitRaw = input.limit ?? LIMIT_DEFAULT;
        const offsetRaw = input.offset ?? 0;
        const limit = Math.min(Math.max(1, Math.floor(limitRaw)), LIMIT_MAX);
        const offset = Math.max(0, Math.floor(offsetRaw));

        // ─── Cron pasivo: cerrar preguntas vencidas (>14 días sin
        //     actividad) ANTES de leer el feed. await intencional para que
        //     el SELECT no devuelva una pregunta que debería ser 'cerrada'.
        //     Si falla, el feed se sigue mostrando (función no relanza).
        await cerrarPreguntasVencidasDeCiudad(ciudad);

        // Subqueries inline para conteos y "yo también interesado".
        // Más simple que joins agregados — Postgres optimiza cada subselect
        // y se mantiene legible. Con los índices de `respuestas_preguntas_
        // comunidad(pregunta_id, created_at) WHERE estado='activa'` y
        // `preguntas_interesados(pregunta_id, usuario_id) PRIMARY KEY`,
        // cada subquery es O(log n).
        const usuarioId = input.usuarioId ?? null;

        const filas = await db
            .select({
                id: preguntasComunidad.id,
                texto: preguntasComunidad.texto,
                ciudad: preguntasComunidad.ciudad,
                estado: preguntasComunidad.estado,
                estadoPregunta: preguntasComunidad.estadoPregunta,
                resueltaAt: preguntasComunidad.resueltaAt,
                createdAt: preguntasComunidad.createdAt,
                updatedAt: preguntasComunidad.updatedAt,
                autorId: usuarios.id,
                autorNombre: usuarios.nombre,
                autorApellidos: usuarios.apellidos,
                autorAvatarUrl: usuarios.avatarUrl,
                // Campos de Coyo — al recargar el feed, las preguntas viejas
                // ya tienen su respuesta lista (no requiere sondear).
                estadoCoyo: preguntasComunidad.estadoCoyo,
                respuestaCoyo: preguntasComunidad.respuestaCoyo,
                resultadosCoyo: preguntasComunidad.resultadosCoyo,
                coyoProcesadoAt: preguntasComunidad.coyoProcesadoAt,
                // Conteos del Sprint 1 — subqueries inline
                totalRespuestas: sql<number>`(
                    SELECT COUNT(*)::int
                    FROM respuestas_preguntas_comunidad
                    WHERE pregunta_id = ${preguntasComunidad.id}
                      AND estado = 'activa'
                )`,
                totalInteresados: sql<number>`(
                    SELECT COUNT(*)::int
                    FROM preguntas_interesados
                    WHERE pregunta_id = ${preguntasComunidad.id}
                )`,
                yoTambienInteresado: usuarioId
                    ? sql<boolean>`EXISTS (
                        SELECT 1
                        FROM preguntas_interesados
                        WHERE pregunta_id = ${preguntasComunidad.id}
                          AND usuario_id = ${usuarioId}::uuid
                      )`
                    : sql<boolean>`false`,
            })
            .from(preguntasComunidad)
            .leftJoin(usuarios, eq(preguntasComunidad.usuarioId, usuarios.id))
            .where(and(
                eq(preguntasComunidad.ciudad, ciudad),
                eq(preguntasComunidad.estadoPregunta, 'activa')
            ))
            .orderBy(desc(preguntasComunidad.createdAt))
            .limit(limit)
            .offset(offset);

        const preguntas: PreguntaComunidadResponse[] = filas.map((f) => ({
            id: f.id,
            texto: f.texto,
            ciudad: f.ciudad,
            estado: f.estado,
            estadoPregunta: f.estadoPregunta as EstadoPregunta,
            createdAt: f.createdAt ?? new Date().toISOString(),
            updatedAt: f.updatedAt ?? new Date().toISOString(),
            // El left join podría devolver null si la cuenta del autor fue
            // eliminada después de crear la pregunta (FK es ON DELETE CASCADE,
            // así que en la práctica no debería pasar — pero somos defensivos).
            autorId: f.autorId ?? '',
            autorNombre: f.autorNombre ?? '',
            autorApellidos: f.autorApellidos ?? '',
            autorAvatarUrl: f.autorAvatarUrl ?? null,
            estadoCoyo: f.estadoCoyo as EstadoCoyo,
            respuestaCoyo: f.respuestaCoyo,
            resultadosCoyo: f.resultadosCoyo,
            coyoProcesadoAt: f.coyoProcesadoAt,
            resueltaAt: f.resueltaAt ?? null,
            totalRespuestas: Number(f.totalRespuestas) || 0,
            totalInteresados: Number(f.totalInteresados) || 0,
            yoTambienInteresado: Boolean(f.yoTambienInteresado),
        }));

        return {
            success: true,
            message: 'Preguntas obtenidas',
            data: preguntas,
        };
    } catch (error) {
        console.error('Error en listarPreguntasPorCiudad:', error);
        return { success: false, message: 'Error al listar preguntas', code: 500 };
    }
}

// =============================================================================
// CONTROL DEL AUTOR — Sprint 1.C
// =============================================================================
// El autor de una pregunta tiene 4 acciones sobre SU pregunta:
//   - cerrarMiPregunta     → estado_pregunta = 'cerrada' (sale del feed pero
//                            sigue accesible; no acepta más respuestas)
//   - borrarMiPregunta     → estado_pregunta = 'oculta' (sale del feed; soft-delete
//                            por consistencia con el patrón de Coyo)
//   - marcarResuelta       → resuelta_at = NOW() (sigue activa pero con ✓)
//   - editarMiPregunta     → cambiar el texto SOLO si tiene 0 respuestas; al
//                            editar se re-dispara Coyo para que actualice su
//                            respuesta acorde al nuevo texto
// =============================================================================

/**
 * Verifica que la pregunta exista Y que el usuarioId del caller sea su autor.
 * Devuelve la fila si todo OK, o un RespuestaServicio con error si no.
 */
async function verificarAutoria(
    preguntaId: string,
    usuarioId: string,
): Promise<
    | { ok: true; pregunta: { id: string; usuarioId: string; estadoPregunta: string } }
    | { ok: false; error: RespuestaServicio<never> }
> {
    const [fila] = await db
        .select({
            id: preguntasComunidad.id,
            usuarioId: preguntasComunidad.usuarioId,
            estadoPregunta: preguntasComunidad.estadoPregunta,
        })
        .from(preguntasComunidad)
        .where(eq(preguntasComunidad.id, preguntaId))
        .limit(1);

    if (!fila) {
        return {
            ok: false,
            error: {
                success: false,
                message: 'La pregunta no existe',
                code: 404,
            },
        };
    }
    if (fila.usuarioId !== usuarioId) {
        return {
            ok: false,
            error: {
                success: false,
                message: 'Solo el autor puede modificar su pregunta',
                code: 403,
            },
        };
    }
    return { ok: true, pregunta: fila };
}

/**
 * El autor cierra su pregunta. Sale del feed (filtrado por
 * estado_pregunta='activa') pero la fila se conserva en BD.
 *
 * Idempotente: si ya está cerrada u oculta, devuelve éxito sin tocar BD.
 */
export async function cerrarMiPregunta(
    input: AccionAutorInput,
): Promise<RespuestaServicio<{ cerrada: boolean }>> {
    try {
        const verif = await verificarAutoria(input.preguntaId, input.usuarioId);
        if (!verif.ok) return verif.error;

        if (verif.pregunta.estadoPregunta !== 'activa') {
            return {
                success: true,
                message: 'La pregunta ya no estaba activa',
                data: { cerrada: true },
            };
        }

        await db
            .update(preguntasComunidad)
            .set({
                estadoPregunta: 'cerrada',
                updatedAt: sql`NOW()`,
            })
            .where(eq(preguntasComunidad.id, input.preguntaId));

        return {
            success: true,
            message: 'Pregunta cerrada',
            data: { cerrada: true },
        };
    } catch (error) {
        console.error('Error en cerrarMiPregunta:', error);
        return { success: false, message: 'Error al cerrar pregunta', code: 500 };
    }
}

/**
 * El autor borra su pregunta. Implementado como soft-delete
 * (estado_pregunta='oculta') para mantener consistencia con el patrón de
 * Coyo y conservar las respuestas que la comunidad ya dio (sin perder
 * el trabajo de otros vecinos).
 *
 * Las respuestas quedan vivas en BD pero sin pregunta visible que las
 * referencie en el feed.
 */
export async function borrarMiPregunta(
    input: AccionAutorInput,
): Promise<RespuestaServicio<{ borrada: boolean }>> {
    try {
        const verif = await verificarAutoria(input.preguntaId, input.usuarioId);
        if (!verif.ok) return verif.error;

        if (verif.pregunta.estadoPregunta === 'oculta') {
            return {
                success: true,
                message: 'La pregunta ya estaba borrada',
                data: { borrada: true },
            };
        }

        await db
            .update(preguntasComunidad)
            .set({
                estadoPregunta: 'oculta',
                updatedAt: sql`NOW()`,
            })
            .where(eq(preguntasComunidad.id, input.preguntaId));

        return {
            success: true,
            message: 'Pregunta borrada',
            data: { borrada: true },
        };
    } catch (error) {
        console.error('Error en borrarMiPregunta:', error);
        return { success: false, message: 'Error al borrar pregunta', code: 500 };
    }
}

/**
 * El autor marca su pregunta como resuelta. La pregunta sigue siendo
 * estado_pregunta='activa' (puede recibir más respuestas), pero queda
 * marcada con `resuelta_at = NOW()`. El frontend la trata distinto
 * (ícono ✓, ordenada al final del feed, etc.).
 *
 * Idempotente: si ya está marcada, no actualiza el timestamp.
 */
export async function marcarResuelta(
    input: AccionAutorInput,
): Promise<RespuestaServicio<{ resuelta: boolean; resueltaAt: string }>> {
    try {
        const verif = await verificarAutoria(input.preguntaId, input.usuarioId);
        if (!verif.ok) return verif.error;

        const [fila] = await db
            .select({
                resueltaAt: preguntasComunidad.resueltaAt,
            })
            .from(preguntasComunidad)
            .where(eq(preguntasComunidad.id, input.preguntaId))
            .limit(1);

        if (fila?.resueltaAt) {
            return {
                success: true,
                message: 'La pregunta ya estaba resuelta',
                data: { resuelta: true, resueltaAt: fila.resueltaAt },
            };
        }

        const [actualizada] = await db
            .update(preguntasComunidad)
            .set({
                resueltaAt: sql`NOW()`,
                updatedAt: sql`NOW()`,
            })
            .where(eq(preguntasComunidad.id, input.preguntaId))
            .returning({ resueltaAt: preguntasComunidad.resueltaAt });

        return {
            success: true,
            message: 'Pregunta marcada como resuelta',
            data: {
                resuelta: true,
                resueltaAt: actualizada?.resueltaAt ?? new Date().toISOString(),
            },
        };
    } catch (error) {
        console.error('Error en marcarResuelta:', error);
        return { success: false, message: 'Error al marcar resuelta', code: 500 };
    }
}

/**
 * El autor edita el texto de su pregunta. Solo permitido si la pregunta
 * tiene 0 respuestas activas — si ya hay respuestas, editar el texto
 * cambiaría el contexto y descontextualizaría las respuestas existentes.
 *
 * Al editar:
 *   - Se actualiza el texto.
 *   - Se resetean los campos de Coyo (`estado_coyo='pendiente'`,
 *     `respuesta_coyo=null`, `resultados_coyo=null`, `coyo_procesado_at=null`).
 *   - Se dispara `procesarPreguntaConCoyo` fire-and-forget para que Coyo
 *     re-procese con el texto nuevo.
 */
export async function editarMiPregunta(
    input: EditarPreguntaInput,
): Promise<RespuestaServicio<{ editada: boolean }>> {
    try {
        const textoNuevo = (input.textoNuevo ?? '').trim();

        if (textoNuevo.length === 0) {
            return {
                success: false,
                message: 'El texto no puede estar vacío',
                code: 400,
            };
        }
        if (textoNuevo.length > TEXTO_MAX) {
            return {
                success: false,
                message: `El texto excede el máximo de ${TEXTO_MAX} caracteres`,
                code: 400,
            };
        }

        const verif = await verificarAutoria(input.preguntaId, input.usuarioId);
        if (!verif.ok) return verif.error;

        if (verif.pregunta.estadoPregunta !== 'activa') {
            return {
                success: false,
                message: 'Solo se pueden editar preguntas activas',
                code: 409,
            };
        }

        // Verificar que NO haya respuestas activas
        const [conteoRespuestas] = await db
            .select({
                total: sql<number>`COUNT(*)::int`,
            })
            .from(respuestasPreguntasComunidad)
            .where(
                and(
                    eq(respuestasPreguntasComunidad.preguntaId, input.preguntaId),
                    eq(respuestasPreguntasComunidad.estado, 'activa'),
                ),
            );

        const totalRespuestas = Number(conteoRespuestas?.total) || 0;
        if (totalRespuestas > 0) {
            return {
                success: false,
                message:
                    'Esta pregunta ya recibió respuestas. Para mejorar tu pregunta, ciérrala y publica una nueva.',
                code: 409,
            };
        }

        // Actualizar texto + reset campos de Coyo para re-procesar
        await db
            .update(preguntasComunidad)
            .set({
                texto: textoNuevo,
                estadoCoyo: 'pendiente',
                respuestaCoyo: null,
                resultadosCoyo: null,
                coyoProcesadoAt: null,
                updatedAt: sql`NOW()`,
            })
            .where(eq(preguntasComunidad.id, input.preguntaId));

        // Re-disparar Coyo con el texto nuevo (fire-and-forget — no
        // bloqueamos al usuario)
        procesarPreguntaConCoyo(input.preguntaId).catch((err) => {
            console.warn(
                'Coyo orquestador falló (fire-and-forget) al re-procesar tras edición',
                input.preguntaId,
                err,
            );
        });

        return {
            success: true,
            message: 'Pregunta editada — Coyo está re-procesando',
            data: { editada: true },
        };
    } catch (error) {
        console.error('Error en editarMiPregunta:', error);
        return { success: false, message: 'Error al editar pregunta', code: 500 };
    }
}

/**
 * Sprint 2.D — Reintentar pregunta cuando Coyo cayó en `sin_respuesta`.
 *
 * Cuando Gemini está caído tras los 6 intentos automáticos (3 con el modelo
 * principal + 3 con el fallback), la pregunta queda en `estado_coyo =
 * 'sin_respuesta'` permanentemente. Esta función permite al AUTOR pedir
 * un reintento manual sin tener que recrear la pregunta.
 *
 * Reglas:
 *   - Solo el AUTOR de la pregunta puede reintentar (verificarAutoria).
 *   - Solo se reintenta si `estado_coyo === 'sin_respuesta'`. Si está en
 *     `pendiente`/`procesando` no tiene sentido (ya hay un orquestador
 *     corriendo). Si está `listo` o `no_aplica`, tampoco — esos son
 *     finales legítimos.
 *   - La pregunta debe estar `estado_pregunta === 'activa'`. Cerradas u
 *     ocultas no se reintentan.
 *   - Resetea los 4 campos de Coyo y dispara `procesarPreguntaConCoyo`
 *     fire-and-forget (mismo patrón que `editarMiPregunta`).
 */
export async function reintentarMiPregunta(
    input: AccionAutorInput,
): Promise<RespuestaServicio<{ reintentado: boolean }>> {
    try {
        const verif = await verificarAutoria(input.preguntaId, input.usuarioId);
        if (!verif.ok) return verif.error;

        if (verif.pregunta.estadoPregunta !== 'activa') {
            return {
                success: false,
                message: 'Solo se pueden reintentar preguntas activas',
                code: 409,
            };
        }

        // Verificar el estado de Coyo — solo `sin_respuesta` permite reintento
        const [filaCoyo] = await db
            .select({
                estadoCoyo: preguntasComunidad.estadoCoyo,
            })
            .from(preguntasComunidad)
            .where(eq(preguntasComunidad.id, input.preguntaId))
            .limit(1);

        if (!filaCoyo) {
            return {
                success: false,
                message: 'La pregunta no existe',
                code: 404,
            };
        }

        if (filaCoyo.estadoCoyo !== 'sin_respuesta') {
            return {
                success: false,
                message:
                    'Solo se puede reintentar cuando Coyo no pudo procesar la pregunta',
                code: 409,
            };
        }

        // Resetear los 4 campos de Coyo para que vuelva a procesarse
        await db
            .update(preguntasComunidad)
            .set({
                estadoCoyo: 'pendiente',
                respuestaCoyo: null,
                resultadosCoyo: null,
                coyoProcesadoAt: null,
                updatedAt: sql`NOW()`,
            })
            .where(eq(preguntasComunidad.id, input.preguntaId));

        // Re-disparar Coyo fire-and-forget (mismo patrón que editarMiPregunta)
        procesarPreguntaConCoyo(input.preguntaId).catch((err) => {
            console.warn(
                'Coyo orquestador falló (fire-and-forget) al reintentar',
                input.preguntaId,
                err,
            );
        });

        return {
            success: true,
            message: 'Reintentando — Coyo está procesando de nuevo',
            data: { reintentado: true },
        };
    } catch (error) {
        console.error('Error en reintentarMiPregunta:', error);
        return {
            success: false,
            message: 'Error al reintentar pregunta',
            code: 500,
        };
    }
}

