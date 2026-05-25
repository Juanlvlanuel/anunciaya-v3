/**
 * orquestador.ts (Coyo)
 * =====================
 * El "director de orquesta" de Coyo. Procesa una pregunta de la comunidad
 * en segundo plano: interpreta el texto → busca en las 4 áreas → redacta
 * la respuesta cálida → guarda todo en la fila de `preguntas_comunidad`.
 *
 * Modelo de ejecución (decidido):
 *   - La pregunta se publica al instante con estado_coyo='pendiente'.
 *   - El service de crearPregunta dispara fire-and-forget a este orquestador.
 *   - El frontend sondea con GET /api/preguntas-comunidad/:id/coyo hasta
 *     que estado_coyo deja de ser 'pendiente' o 'procesando'.
 *
 * Filosofía de fallos:
 *   Este orquestador es a prueba de fallos en TODOS los niveles. NUNCA
 *   debe lanzar al caller (que es un fire-and-forget de crearPregunta).
 *   Cualquier error interno deja la pregunta en 'sin_respuesta' y se
 *   loguea. La publicación de la pregunta NUNCA falla por culpa de Coyo.
 *
 * Estados finales posibles:
 *   - 'listo'         → encontró ≥1 resultado, hay respuesta_coyo y
 *                       resultados_coyo.
 *   - 'sin_respuesta' → la IA no estaba disponible, o no encontró nada
 *                       en ninguna área, o hubo un error inesperado.
 *   - 'no_aplica'     → la pregunta no era búsqueda local (Coyo redirige).
 *
 * Ubicación: apps/api/src/services/coyo/orquestador.ts
 */

import { sql, eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { preguntasComunidad } from '../../db/schemas/schema.js';
import { interpretarPregunta, redactarRespuestaCoyo } from './coyoIA.service.js';
import {
    buscarEnTodaLaApp,
    type ResultadoBusquedaUnificada,
} from './buscadorUnificado.js';

// =============================================================================
// CONSTANTES
// =============================================================================

/**
 * Texto que devuelve Coyo cuando la pregunta NO es búsqueda local
 * (matemáticas, escribir textos, política, charla random, etc.). Alineado
 * con la PERSONALIDAD_COYO (regla 5): redirige amable y honesto sin
 * gastar una llamada extra a Gemini para construir un texto que ya
 * conocemos.
 */
const TEXTO_REDIRECCION_NO_APLICA =
    'Para eso no soy bueno, pero si buscas algo aquí en el pueblo (negocios, ofertas, servicios, cosas de segunda mano), dime y te ayudo a buscar.';

/**
 * Texto de respaldo cuando hay resultados pero la IA falló al redactar
 * (timeout/cuota a media). No desperdiciamos los resultados.
 */
const TEXTO_RESPALDO_CON_RESULTADOS = 'Mira lo que encontré:';

// =============================================================================
// HELPER: marcar estado final
// =============================================================================

type EstadoCoyoBD = 'pendiente' | 'procesando' | 'listo' | 'sin_respuesta' | 'no_aplica';

interface CamposFinales {
    estadoCoyo: EstadoCoyoBD;
    respuestaCoyo: string | null;
    resultadosCoyo: ResultadoBusquedaUnificada['resultados'] | null;
}

/**
 * Marca la pregunta con el estado final + setea coyo_procesado_at = NOW().
 * Defensivo: si el UPDATE falla, loguea y traga el error (no debe propagar
 * al fire-and-forget que nos llamó).
 */
async function marcarEstadoFinal(
    preguntaId: string,
    campos: CamposFinales,
): Promise<void> {
    try {
        await db
            .update(preguntasComunidad)
            .set({
                estadoCoyo: campos.estadoCoyo,
                respuestaCoyo: campos.respuestaCoyo,
                resultadosCoyo: campos.resultadosCoyo,
                coyoProcesadoAt: new Date().toISOString(),
            })
            .where(eq(preguntasComunidad.id, preguntaId));
    } catch (error) {
        console.error(
            'Coyo orquestador: falló UPDATE de estado final para',
            preguntaId,
            error,
        );
    }
}

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

/**
 * Procesa una pregunta con Coyo (interpretar → buscar → redactar → guardar).
 *
 * Patrón de uso: SIEMPRE fire-and-forget desde el caller. No await — solo
 * `procesarPreguntaConCoyo(id).catch(err => console.warn(...))`. La función
 * no lanza ni siquiera ante errores internos: en el peor caso deja la
 * pregunta en 'sin_respuesta' y devuelve sin más.
 */
export async function procesarPreguntaConCoyo(preguntaId: string): Promise<void> {
    try {
        // ─── 1. Marcar 'procesando' y cargar la pregunta ─────────────
        const filas = await db
            .update(preguntasComunidad)
            .set({ estadoCoyo: 'procesando' })
            .where(eq(preguntasComunidad.id, preguntaId))
            .returning({
                id: preguntasComunidad.id,
                texto: preguntasComunidad.texto,
                ciudad: preguntasComunidad.ciudad,
            });

        const pregunta = filas[0];
        if (!pregunta) {
            console.warn('Coyo orquestador: pregunta no existe en BD', preguntaId);
            return;
        }

        // ─── 2. Interpretar pregunta con la cajita IA ────────────────
        const interpretacion = await interpretarPregunta(pregunta.texto);

        if (!interpretacion.disponible) {
            // IA caída / sin key / error parseo → no podemos clasificar.
            // La pregunta queda viva para la comunidad, sin texto de Coyo.
            console.warn(
                'Coyo orquestador: IA no disponible (interpretarPregunta) →',
                interpretacion.razon,
            );
            await marcarEstadoFinal(preguntaId, {
                estadoCoyo: 'sin_respuesta',
                respuestaCoyo: null,
                resultadosCoyo: null,
            });
            return;
        }

        // ─── 3. No-búsqueda-local → redirigir amable ─────────────────
        if (!interpretacion.data.esBusquedaLocal) {
            await marcarEstadoFinal(preguntaId, {
                estadoCoyo: 'no_aplica',
                respuestaCoyo: TEXTO_REDIRECCION_NO_APLICA,
                resultadosCoyo: null,
            });
            return;
        }

        // ─── 4. Buscar en las 4 áreas (parallel inside) ──────────────
        const resultadoBusqueda = await buscarEnTodaLaApp({
            q: interpretacion.data.terminos,
            ciudad: pregunta.ciudad,
        });

        const totalResultados =
            resultadoBusqueda.resultados.negocios.items.length +
            resultadoBusqueda.resultados.ofertas.items.length +
            resultadoBusqueda.resultados.marketplace.items.length +
            resultadoBusqueda.resultados.servicios.items.length;

        // ─── 5. Redactar la respuesta cálida con la cajita IA ────────
        // Ojo: ESTA llamada se hace SIEMPRE, incluso si totalResultados=0.
        // Coyo debe responder cálido aun cuando no encontró nada (en vez
        // de cerrar silencioso). La cajita maneja el caso "todos los grupos
        // vacíos" con un mensaje honesto que invita a la comunidad a
        // responder. Solo si la IA TAMPOCO está disponible y NO hay
        // resultados, cerramos como sin_respuesta (no hay nada que decir).
        const huboResultados = totalResultados > 0;
        const redaccion = await redactarRespuestaCoyo(
            pregunta.texto,
            resultadoBusqueda.resultados,
        );

        // ─── 6. Caso degenerado: IA caída + 0 resultados ─────────────
        // Sin IA no podemos construir un mensaje cálido y sin resultados
        // tampoco hay nada que presentar. Cae al fallback histórico:
        // sin_respuesta (el frontend muestra "Esperando respuestas de la
        // comunidad" + texto fijo del bloque "no_aplica" no aplica aquí).
        if (!redaccion.disponible && !huboResultados) {
            console.warn(
                'Coyo orquestador: IA caída + 0 resultados →',
                redaccion.razon,
            );
            await marcarEstadoFinal(preguntaId, {
                estadoCoyo: 'sin_respuesta',
                respuestaCoyo: null,
                resultadosCoyo: null,
            });
            return;
        }

        const textoFinal = redaccion.disponible
            ? redaccion.data
            : TEXTO_RESPALDO_CON_RESULTADOS;

        if (!redaccion.disponible) {
            console.warn(
                'Coyo orquestador: redactarRespuestaCoyo no disponible — usando texto de respaldo →',
                redaccion.razon,
            );
        }

        // ─── 7. Guardar todo y cerrar como listo ─────────────────────
        // Estado SIEMPRE 'listo' (con o sin resultados) para que el front
        // muestre la respuesta de Coyo. La pregunta sigue abierta a la
        // comunidad por separado (el campo estadoPregunta='activa' no
        // cambia — Coyo y la comunidad son canales independientes).
        await marcarEstadoFinal(preguntaId, {
            estadoCoyo: 'listo',
            respuestaCoyo: textoFinal,
            resultadosCoyo: resultadoBusqueda.resultados,
        });
    } catch (error) {
        // Red de seguridad: cualquier error inesperado deja la pregunta
        // en sin_respuesta y se loguea. NUNCA propagamos hacia arriba.
        console.error(
            'Coyo orquestador: error inesperado procesando',
            preguntaId,
            error,
        );
        await marcarEstadoFinal(preguntaId, {
            estadoCoyo: 'sin_respuesta',
            respuestaCoyo: null,
            resultadosCoyo: null,
        });
    }
}

// =============================================================================
// HELPER PÚBLICO: leer estado actual (para el endpoint de sondeo)
// =============================================================================

export interface EstadoCoyoPregunta {
    estadoCoyo: EstadoCoyoBD;
    respuestaCoyo: string | null;
    resultadosCoyo: ResultadoBusquedaUnificada['resultados'] | null;
    coyoProcesadoAt: string | null;
}

/**
 * Devuelve solo los campos de Coyo de una pregunta. Usado por el endpoint
 * de sondeo `GET /api/preguntas-comunidad/:id/coyo`. Devuelve null si la
 * pregunta no existe.
 */
export async function obtenerEstadoCoyo(
    preguntaId: string,
): Promise<EstadoCoyoPregunta | null> {
    const [fila] = await db
        .select({
            estadoCoyo: preguntasComunidad.estadoCoyo,
            respuestaCoyo: preguntasComunidad.respuestaCoyo,
            resultadosCoyo: preguntasComunidad.resultadosCoyo,
            coyoProcesadoAt: preguntasComunidad.coyoProcesadoAt,
        })
        .from(preguntasComunidad)
        .where(eq(preguntasComunidad.id, preguntaId))
        .limit(1);

    if (!fila) return null;

    return {
        estadoCoyo: fila.estadoCoyo as EstadoCoyoBD,
        respuestaCoyo: fila.respuestaCoyo,
        resultadosCoyo:
            (fila.resultadosCoyo as ResultadoBusquedaUnificada['resultados'] | null) ?? null,
        coyoProcesadoAt: fila.coyoProcesadoAt,
    };
}

// Evitar warning de "sql importada sin usar" cuando el orquestador se
// expande en el futuro con queries crudas. Por ahora solo `eq` se usa.
void sql;
