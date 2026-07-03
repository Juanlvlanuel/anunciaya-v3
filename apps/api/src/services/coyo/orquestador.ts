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
import { preguntasComunidad, usuarios, ciudades } from '../../db/schemas/schema.js';
import { interpretarPregunta, redactarRespuestaCoyo } from './coyoIA.service.js';
import {
    buscarEnTodaLaApp,
    type ResultadoBusquedaUnificada,
} from './buscadorUnificado.js';
import { notificarItemsRecomendados } from './notificacionesCoyo.service.js';

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
    'Para eso no soy bueno, pero si buscas algo aquí en tu ciudad (negocios, ofertas, servicios, cosas de segunda mano), dime y te ayudo a buscar.';

/**
 * Texto de respaldo cuando hay resultados pero la IA falló al redactar
 * (timeout/cuota a media). No desperdiciamos los resultados.
 */
const TEXTO_RESPALDO_CON_RESULTADOS = 'Mira lo que encontré:';

// =============================================================================
// HELPER: detectar si Coyo redactó como "sin resultados" (CASO B del prompt)
// =============================================================================

/**
 * Devuelve `true` si el texto redactado por Gemini sigue el patrón del
 * CASO B del prompt de `redactarRespuestaCoyo` — Coyo dice "no encontré X"
 * + invita a la comunidad a responder. Eso pasa cuando Gemini decide
 * semánticamente que los items que trajo el buscador NO son relevantes
 * para el vecino (típicamente porque el dato es contradictorio — ej. un
 * servicio con título "Se busca Plomero" pero `modo='ofrezco'` por error
 * de captura).
 *
 * Cuando esta función devuelve `true` y `huboResultados === true`, el
 * orquestador LIMPIA los items antes de guardar para mantener consistencia
 * visual texto ↔ tarjetas. El principio "Coyo no inventa" se extiende a
 * lo visual: si el texto dice "no encontré", las tarjetas no deben
 * contradecirlo.
 *
 * Heurística DOBLE (negativa + invitación a la comunidad) porque solo con
 * la negativa había falsos positivos legítimos: "no encontré laptops
 * nuevas pero encontré estas usadas" sería CASO A con matización, no
 * CASO B. El CASO B SIEMPRE incluye la invitación a la comunidad por
 * la regla 4 de PERSONALIDAD_COYO + el prompt explícito.
 *
 * Si Gemini redacta con una variación no contemplada por los regex, el
 * caso pasa sin filtrar — preferible quedarse corto (tarjetas visibles
 * en duda) que pasarse (ocultar tarjetas legítimas). Ver §Filtro de
 * consistencia texto-tarjeta en docs/arquitectura/Home_Coyo.md.
 */
export function geminiRedactoComoSinResultados(texto: string): boolean {
    const senalNegativa =
        /(no encontr[éeé]|no hay|por ahora no|ahorita no|todav[íi]a no|sin resultados|no aparec)/i;
    const senalComunidad =
        /(deja(?:r)?\s+(?:tu|aqu[íi]\s+tu)\s+pregunta|comunidad|alg[úu]n\s+vecino|vecinos?\s+te\s|echa(?:r)?\s+(?:una\s+)?mano|alguien\s+te\s+(?:puede|pueda))/i;
    return senalNegativa.test(texto) && senalComunidad.test(texto);
}

// =============================================================================
// HELPER: detectar si Gemini MENCIONÓ el item en su texto (filtro CASO A v2)
// =============================================================================

/**
 * Stopwords en español + tokens que NO discriminan items y por tanto no
 * sirven para decidir si Gemini "mencionó" un item en su redacción.
 *
 * Lista corta a propósito — solo lo que aparece a menudo en títulos de
 * AnunciaYA. Ampliar si se observa que un ítem legítimo se filtra por
 * compartir todos sus tokens significativos con stopwords.
 */
const STOPWORDS_TITULO = new Set<string>([
    'el', 'la', 'los', 'las',
    'un', 'una', 'unos', 'unas',
    'de', 'del', 'al',
    'para', 'por', 'con', 'sin',
    'que', 'cual',
    'mi', 'tu', 'su', 'mis', 'tus', 'sus',
    'es', 'son', 'esta', 'estan',
    'lo', 'le', 'les',
    'esto', 'este',
]);

/**
 * Normaliza un string para comparación robusta: minúsculas + sin acentos
 * (mediante NFD + strip de los combining marks U+0300..U+036F).
 */
function normalizarParaComparar(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

/**
 * Devuelve `true` si al menos un token significativo del `titulo`
 * aparece literalmente (substring, accent-insensitive) en `texto`.
 *
 * Tokens significativos = palabras del título con MÁS de 3 letras,
 * que no son stopwords ni números puros.
 *
 * Usado en el filtro CASO A v2: cuando Gemini redactó mencionando
 * algunos items pero omitiendo otros (porque los consideró irrelevantes
 * semánticamente), los items omitidos NO deben aparecer como tarjetas —
 * contradiría el texto.
 *
 * Caso real (2026-05-31, tarde): pregunta *"quien me ayuda con la
 * casa?"* → Gemini extrajo `'servicios hogar'` → el buscador trajo
 * Plomería Express + Contadora Fernanda + Plomería residencial 24h
 * (Contadora matcheó por categoría "Servicios", palabra demasiado
 * genérica). Gemini redactó mencionando solo las plomerías. Sin este
 * filtro, la tarjeta de "Contadora Fernanda" aparecía contradiciendo
 * el texto.
 *
 * Heurística "al menos un token aparece" en vez de "todos los tokens
 * aparecen": Gemini puede mencionar el negocio por una parte de su
 * nombre (ej. dice "el Brujo" en vez de "Pollos El Brujo"). Con al
 * menos un token significativo basta para considerar mencionado.
 *
 * Falsos negativos posibles: si Gemini parafrasea sin usar palabras del
 * título (raro), el item se filtra. Preferible quedarse corto (filtrar
 * de más) que pasarse (mostrar items irrelevantes).
 *
 * Ver §Filtro CASO A v2 en docs/arquitectura/Home_Coyo.md.
 */
export function tituloMencionadoEnTexto(titulo: string, texto: string): boolean {
    if (!titulo) return true; // título vacío → no podemos decidir, mantener
    if (!texto) return true; // texto vacío → no podemos decidir, mantener

    const tokens = normalizarParaComparar(titulo)
        .split(/\s+/)
        .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ''))
        .filter(
            (t) =>
                t.length > 3 &&
                !STOPWORDS_TITULO.has(t) &&
                !/^\d+$/.test(t),
        );

    if (tokens.length === 0) return true; // título sin tokens distintivos → no filtrar

    const textoNorm = normalizarParaComparar(texto);

    return tokens.some((t) => textoNorm.includes(t));
}

// =============================================================================
// HELPER: marcar estado final
// =============================================================================

type EstadoCoyoBD = 'pendiente' | 'procesando' | 'listo' | 'sin_respuesta' | 'no_aplica';

interface CamposFinales {
    estadoCoyo: EstadoCoyoBD;
    respuestaCoyo: string | null;
    resultadosCoyo: ResultadoBusquedaUnificada['resultados'] | null;
    /**
     * Si está presente, también se actualiza `estado_pregunta` de la
     * fila. Usado solo para casos de `tipo='inapropiada'`, donde la
     * pregunta debe ocultarse del feed (`estado_pregunta='oculta'`)
     * para que ningún otro vecino la vea ni pueda responder.
     */
    estadoPregunta?: 'activa' | 'cerrada' | 'oculta';
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
        const valores: {
            estadoCoyo: EstadoCoyoBD;
            respuestaCoyo: string | null;
            resultadosCoyo: ResultadoBusquedaUnificada['resultados'] | null;
            coyoProcesadoAt: string;
            estadoPregunta?: 'activa' | 'cerrada' | 'oculta';
        } = {
            estadoCoyo: campos.estadoCoyo,
            respuestaCoyo: campos.respuestaCoyo,
            resultadosCoyo: campos.resultadosCoyo,
            coyoProcesadoAt: new Date().toISOString(),
        };
        if (campos.estadoPregunta) {
            valores.estadoPregunta = campos.estadoPregunta;
        }
        await db
            .update(preguntasComunidad)
            .set(valores)
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
                usuarioId: preguntasComunidad.usuarioId,
                texto: preguntasComunidad.texto,
                ciudadId: preguntasComunidad.ciudadId,
            });

        const pregunta = filas[0];
        if (!pregunta) {
            console.warn('Coyo orquestador: pregunta no existe en BD', preguntaId);
            return;
        }

        // Nombre de la ciudad (del catálogo, vía la FK) para alimentar el buscador
        // unificado, que filtra negocios/ofertas/MP/servicios por el nombre de ciudad.
        let nombreCiudad = '';
        if (pregunta.ciudadId) {
            const [c] = await db
                .select({ nombre: ciudades.nombre })
                .from(ciudades)
                .where(eq(ciudades.id, pregunta.ciudadId))
                .limit(1);
            nombreCiudad = c?.nombre ?? '';
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

        // ─── 3. Decidir según tipo ──────────────────────────────────
        // 4 estados que clasifica Gemini:
        //   - busqueda_local → continúa con búsqueda en las 4 áreas
        //   - vaga → guarda el mensaje específico de reformular (con
        //     sugerencias concretas) generado por Gemini en la misma
        //     llamada; estado final = 'no_aplica'
        //   - no_local → texto fijo de redirección; estado = 'no_aplica'.
        //     La pregunta SIGUE VISIBLE en el feed (no es ofensiva, solo
        //     fuera de scope — ej. matemáticas, charla).
        //   - inapropiada → texto fijo de redirección + ESTADO PREGUNTA
        //     'oculta'. La pregunta NO aparece en el feed para ningún
        //     vecino. Importante porque si la dejáramos visible, otros
        //     vecinos podrían responder con info real para drogas/armas/
        //     sexo/etc. y AnunciaYA terminaría facilitando contenido
        //     ilegal. Caso real reproducido: "donde venden marihuana?"
        //     antes traía respuesta de Coyo invitando a la comunidad.
        if (interpretacion.data.tipo === 'inapropiada') {
            await marcarEstadoFinal(preguntaId, {
                estadoCoyo: 'no_aplica',
                respuestaCoyo: TEXTO_REDIRECCION_NO_APLICA,
                resultadosCoyo: null,
                estadoPregunta: 'oculta',
            });
            return;
        }

        if (interpretacion.data.tipo === 'no_local') {
            await marcarEstadoFinal(preguntaId, {
                estadoCoyo: 'no_aplica',
                respuestaCoyo: TEXTO_REDIRECCION_NO_APLICA,
                resultadosCoyo: null,
            });
            return;
        }

        if (interpretacion.data.tipo === 'vaga') {
            // Usar el mensaje específico generado por Gemini con
            // sugerencias concretas para reformular. Fallback al texto
            // genérico si Gemini no devolvió nada (edge case).
            const mensaje =
                interpretacion.data.mensajeReformular.trim() ||
                TEXTO_REDIRECCION_NO_APLICA;
            await marcarEstadoFinal(preguntaId, {
                estadoCoyo: 'no_aplica',
                respuestaCoyo: mensaje,
                resultadosCoyo: null,
            });
            return;
        }

        // ─── 4. Buscar en las 4 áreas (parallel inside) ──────────────
        const resultadoBusqueda = await buscarEnTodaLaApp({
            q: interpretacion.data.terminos,
            ciudad: nombreCiudad,
            intencion: interpretacion.data.intencion,
            esEmpleo: interpretacion.data.esEmpleo,
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
            interpretacion.data.intencion,
            interpretacion.data.esEmpleo,
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

        // ─── 6.5. Consistencia visual texto ↔ tarjetas ───────────────
        // Si Gemini siguió el CASO B del prompt (dijo "no encontré" +
        // invitación a la comunidad) pero el buscador SÍ trajo items,
        // significa que descartó los items semánticamente (ej. dato
        // contradictorio como un servicio con título "Se busca X" y
        // modo='ofrezco'). Limpiamos los items para que las tarjetas no
        // contradigan el texto — el principio "Coyo no inventa" se
        // extiende a lo visual.
        // Ver §Filtro de consistencia texto-tarjeta en
        // docs/arquitectura/Home_Coyo.md.
        let resultadosParaGuardar = resultadoBusqueda.resultados;
        if (huboResultados && geminiRedactoComoSinResultados(textoFinal)) {
            console.warn(
                'Coyo orquestador: redacción siguió CASO B pero el buscador trajo items — limpiando para consistencia visual',
                {
                    preguntaId,
                    texto: textoFinal,
                    conteosOriginales: {
                        negocios: resultadoBusqueda.resultados.negocios.items.length,
                        ofertas: resultadoBusqueda.resultados.ofertas.items.length,
                        marketplace:
                            resultadoBusqueda.resultados.marketplace.items.length,
                        servicios: resultadoBusqueda.resultados.servicios.items.length,
                    },
                },
            );
            resultadosParaGuardar = {
                negocios: { items: [], total: 0 },
                ofertas: { items: [], total: 0 },
                marketplace: { items: [], total: 0 },
                servicios: { items: [], total: 0 },
            };
        } else if (huboResultados && redaccion.disponible) {
            // ─── 6.6. Filtro CASO A v2: items no mencionados por Gemini ──
            // Si Gemini redactó CASO A (encontró cosas legítimas) pero el
            // buscador trajo items adicionales que Gemini NO mencionó en
            // el texto (porque los consideró irrelevantes semánticamente),
            // limpiamos esos items para que las tarjetas reflejen lo que
            // Coyo dijo.
            //
            // GUARDIA `redaccion.disponible`: solo aplicar cuando Gemini
            // REALMENTE redactó el texto. Si Gemini falló (503/timeout/
            // cuota) usamos `TEXTO_RESPALDO_CON_RESULTADOS` genérico que
            // NO menciona ningún item — el filtro limpiaría TODO y el
            // usuario vería un texto sin tarjetas, perdiendo los
            // resultados legítimos del buscador. Preferimos mostrar las
            // tarjetas con el texto de respaldo a no mostrar nada.
            //
            // Caso real (2026-05-31): pregunta "quien me ayuda con la
            // casa?" → Gemini extrajo "servicios hogar" → buscador trajo
            // Plomería Express + Contadora Fernanda + Plomería residencial
            // (Contadora matcheó por categoría "Servicios", palabra
            // demasiado genérica). Gemini redactó mencionando solo las
            // plomerías. Sin este filtro, la tarjeta de Contadora
            // aparecía contradiciendo el texto.
            //
            // Ver §Filtro CASO A v2 en docs/arquitectura/Home_Coyo.md.
            const filtrarItems = <T extends { titulo: string }>(
                items: T[],
            ): T[] => items.filter((i) => tituloMencionadoEnTexto(i.titulo, textoFinal));

            const negociosFiltrados = filtrarItems(
                resultadoBusqueda.resultados.negocios.items,
            );
            const ofertasFiltrados = filtrarItems(
                resultadoBusqueda.resultados.ofertas.items,
            );
            const marketplaceFiltrados = filtrarItems(
                resultadoBusqueda.resultados.marketplace.items,
            );
            const serviciosFiltrados = filtrarItems(
                resultadoBusqueda.resultados.servicios.items,
            );

            const huboLimpieza =
                negociosFiltrados.length !==
                    resultadoBusqueda.resultados.negocios.items.length ||
                ofertasFiltrados.length !==
                    resultadoBusqueda.resultados.ofertas.items.length ||
                marketplaceFiltrados.length !==
                    resultadoBusqueda.resultados.marketplace.items.length ||
                serviciosFiltrados.length !==
                    resultadoBusqueda.resultados.servicios.items.length;

            if (huboLimpieza) {
                console.warn(
                    'Coyo orquestador: items no mencionados por Gemini en CASO A — limpiando para consistencia visual',
                    {
                        preguntaId,
                        conteosAntes: {
                            negocios:
                                resultadoBusqueda.resultados.negocios.items.length,
                            ofertas:
                                resultadoBusqueda.resultados.ofertas.items.length,
                            marketplace:
                                resultadoBusqueda.resultados.marketplace.items
                                    .length,
                            servicios:
                                resultadoBusqueda.resultados.servicios.items
                                    .length,
                        },
                        conteosDespues: {
                            negocios: negociosFiltrados.length,
                            ofertas: ofertasFiltrados.length,
                            marketplace: marketplaceFiltrados.length,
                            servicios: serviciosFiltrados.length,
                        },
                    },
                );
                resultadosParaGuardar = {
                    negocios: {
                        items: negociosFiltrados,
                        total: negociosFiltrados.length,
                    },
                    ofertas: {
                        items: ofertasFiltrados,
                        total: ofertasFiltrados.length,
                    },
                    marketplace: {
                        items: marketplaceFiltrados,
                        total: marketplaceFiltrados.length,
                    },
                    servicios: {
                        items: serviciosFiltrados,
                        total: serviciosFiltrados.length,
                    },
                };
            }
        }

        // ─── 7. Guardar todo y cerrar como listo ─────────────────────
        // Estado SIEMPRE 'listo' (con o sin resultados) para que el front
        // muestre la respuesta de Coyo. La pregunta sigue abierta a la
        // comunidad por separado (el campo estadoPregunta='activa' no
        // cambia — Coyo y la comunidad son canales independientes).
        await marcarEstadoFinal(preguntaId, {
            estadoCoyo: 'listo',
            respuestaCoyo: textoFinal,
            resultadosCoyo: resultadosParaGuardar,
        });

        // ─── 8. Notificar a los items recomendados (fire-and-forget) ─
        // Cada dueño/gerente/usuario cuyo item aparezca en `resultados-
        // ParaGuardar` recibe una notificación "Coyo te recomendó". Solo
        // tiene sentido cuando huboResultados (después de los filtros);
        // si todo se limpió, no hay a quién notificar.
        //
        // Reglas detalladas en `notificacionesCoyo.service.ts`:
        //   - Negocios/Ofertas/vacante-empresa → gerente de la sucursal
        //     específica (fallback dueño si no hay gerente).
        //   - Marketplace/servicio-persona/solicito → usuario personal
        //     que publicó.
        //   - Auto-notificación bloqueada (autor de la pregunta nunca se
        //     auto-notifica).
        //
        // El helper nunca lanza. Si todas las notificaciones fallan, el
        // flujo principal continúa normal.
        const huboItemsParaNotificar =
            resultadosParaGuardar.negocios.items.length +
                resultadosParaGuardar.ofertas.items.length +
                resultadosParaGuardar.marketplace.items.length +
                resultadosParaGuardar.servicios.items.length >
            0;
        if (huboItemsParaNotificar) {
            // Cargar datos del autor de la pregunta (nombre + avatar) para
            // poder armar la notificación con actorNombre + actorImagenUrl.
            try {
                const [autor] = await db
                    .select({
                        id: usuarios.id,
                        nombre: usuarios.nombre,
                        apellidos: usuarios.apellidos,
                        avatarUrl: usuarios.avatarUrl,
                    })
                    .from(usuarios)
                    .where(eq(usuarios.id, pregunta.usuarioId))
                    .limit(1);

                if (autor) {
                    // Fire-and-forget: no await — las notificaciones se
                    // disparan en background. Si fallan, solo se loguean
                    // (cada función interna ya tiene su try/catch).
                    notificarItemsRecomendados(
                        {
                            preguntaId,
                            textoPregunta: pregunta.texto,
                            autor: {
                                id: autor.id,
                                nombre: autor.nombre,
                                apellidos: autor.apellidos,
                                avatarUrl: autor.avatarUrl,
                            },
                        },
                        resultadosParaGuardar,
                    ).catch((err) => {
                        console.warn(
                            'Coyo orquestador: notificarItemsRecomendados falló (fire-and-forget):',
                            err,
                        );
                    });
                }
            } catch (err) {
                console.warn(
                    'Coyo orquestador: no se pudo cargar autor para notificar items:',
                    err,
                );
            }
        }
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
