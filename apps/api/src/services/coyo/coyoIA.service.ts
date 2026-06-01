/**
 * coyoIA.service.ts — La "cajita" de IA de Coyo
 * ==============================================
 *
 * ESTE ES EL ÚNICO archivo del backend que importa `@google/genai` y conoce
 * la forma de hablar con Gemini. Si en el futuro migramos de IA (otra LLM,
 * otro proveedor), SOLO se toca este archivo — el resto del backend usa las
 * funciones `interpretarPregunta` y `redactarRespuestaCoyo` sin saber qué
 * hay debajo.
 *
 * Resiliente: si `GEMINI_API_KEY` no está configurada, o si la llamada a
 * Gemini falla (red, cuota, error inesperado), las funciones devuelven
 * `{ disponible: false }` con la razón. NUNCA tumban la app — Coyo IA es
 * una FUNCIÓN, no infraestructura crítica.
 *
 * Para EDITAR LA PERSONALIDAD DE COYO ver la constante `PERSONALIDAD_COYO`
 * más abajo. Toda la voz/tono vive ahí — los prompts individuales solo
 * agregan la tarea concreta.
 *
 * Modelo: gemini-2.5-flash. Librería: @google/genai (la oficial vigente —
 * la antigua `@google/generative-ai` está descontinuada).
 *
 * Ubicación: apps/api/src/services/coyo/coyoIA.service.ts
 */

import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.js';

// =============================================================================
// PERSONALIDAD DE COYO — EDITABLE
// =============================================================================
//
// Esta constante es la "voz" de Coyo. Se inyecta como contexto en cada llamada
// a Gemini que produce texto presentable al usuario (ej. `redactarRespuestaCoyo`).
// Para ajustar tono, modismos o reglas, edita SOLO esta constante — no toques
// los prompts individuales más abajo.

const PERSONALIDAD_COYO = `Eres Coyo, un coyote simpático que es la mascota y asistente de AnunciaYA, una app de comercio local hiperlocal de tu ciudad. Eres como un vecino buena onda que conoce la zona y ayuda con gusto.

TONO:
- Cálido y cercano. Tutea siempre.
- Modismos mexicanos NATURALES (ej. "te recomiendo", "está cerquita", "ya"). NUNCA forzados ni exagerados — nada de payaso ni de "compa", "wey", "carnal" cada frase.
- BREVE: 1 o 2 frases máximo. Vas al grano.
- NO uses las palabras "pueblo" ni "catálogo" en tus respuestas. Habla de "tu ciudad" o "la ciudad". AnunciaYA funciona en múltiples ciudades — no todas son pueblos pequeños.

REGLAS SAGRADAS (NO ROMPER NUNCA):
1. SOLO hablas de los resultados REALES que se te pasan en el prompt. NUNCA inventas negocios, precios, horarios, ratings, reseñas, ni recomendaciones que no estén en los datos.
2. SÍ puedes y DEBES mencionar los datos ricos que vienen en los resultados (rating, total de reseñas, si está verificado, si está abierto ahorita, condición del artículo, días para vencer una oferta). Son información real y valiosa para el vecino.
3. NO prometes ni garantizas nada más allá del dato real. No dices "es bueno" o "te va a encantar" — solo presentas lo que hay.
4. Si NO hay resultados, lo dices cálido y honesto, e invitas a dejar la pregunta para que la comunidad responda. Nunca rellenas con inventos.
5. Si la pregunta NO es para buscar algo de tu ciudad (matemáticas, redactar textos, política, charla random), rediriges amable: "para eso no soy bueno, pero si buscas algo aquí en tu ciudad, dime".
6. Si te escriben groserías o con mala onda, no te enganchas. Sigues amable y breve.`;

// =============================================================================
// CLIENTE GEMINI (LAZY SINGLETON)
// =============================================================================

const MODELO_GEMINI = 'gemini-2.5-flash';

let clienteCache: GoogleGenAI | null = null;

/**
 * Devuelve el cliente Gemini si `GEMINI_API_KEY` está configurada, o `null`
 * si no. No lanza — el caller decide cómo manejar la ausencia.
 *
 * Singleton lazy: se construye en el primer uso real, no al arrancar el
 * server. Así un proceso que nunca usa Coyo IA no carga la librería.
 */
function obtenerCliente(): GoogleGenAI | null {
    if (!env.GEMINI_API_KEY) return null;
    if (clienteCache === null) {
        clienteCache = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
    return clienteCache;
}

// =============================================================================
// TIPOS
// =============================================================================

/**
 * Tipo discriminado que devuelven TODAS las funciones públicas de esta cajita.
 * El caller debe chequear `disponible` antes de leer `data` (TypeScript se lo
 * exige por el narrowing del union).
 *
 * Razones de no disponibilidad:
 *   - `sin_api_key`   → el server arrancó sin `GEMINI_API_KEY` configurada.
 *   - `error_gemini`  → la llamada a Gemini reventó (red, cuota, modelo).
 *   - `error_parseo`  → Gemini respondió pero el JSON/texto no era válido.
 */
export type RespuestaIA<T> =
    | { disponible: true; data: T }
    | {
          disponible: false;
          razon: 'sin_api_key' | 'error_gemini' | 'error_parseo';
      };

/**
 * Tipo de pregunta — 4 estados que decide Gemini al interpretar.
 */
export type TipoPregunta = 'busqueda_local' | 'vaga' | 'no_local' | 'inapropiada';

/**
 * Output de `interpretarPregunta`.
 */
export interface PreguntaInterpretada {
    /**
     * Clasificación de la pregunta:
     *  - `busqueda_local`: el vecino busca algo concreto de la ciudad
     *    (dominio claro o inferible con UNA interpretación).
     *  - `vaga`: SÍ busca algo de la ciudad PERO la pregunta es
     *    demasiado ambigua (múltiples interpretaciones razonables sin
     *    pista para elegir). Gemini genera `mensajeReformular` con
     *    sugerencias específicas para que el vecino reformule.
     *  - `no_local`: NO es búsqueda local (matemáticas, opiniones,
     *    charla random, etc.). Coyo responde con texto fijo de
     *    redirección. La pregunta SIGUE VISIBLE en el feed (no es
     *    ofensiva, solo fuera de scope).
     *  - `inapropiada`: contenido ilegal/ofensivo (drogas, armas,
     *    sexo explícito, agresión, etc.). Coyo responde con texto
     *    fijo de redirección Y el orquestador OCULTA la pregunta del
     *    feed (`estado_pregunta='oculta'`) para que ningún otro vecino
     *    la vea ni pueda responder.
     */
    tipo: TipoPregunta;
    /**
     * Palabras clave limpias para alimentar al buscador unificado.
     * Cuando `tipo !== 'busqueda_local'`, es string vacío.
     */
    terminos: string;
    /**
     * Mensaje cálido + sugerencias concretas para que el vecino
     * reformule la pregunta. Generado por Gemini parafraseando opciones
     * razonables (ej. para "quien me ayuda con la casa?" sugiere
     * plomería, electricidad, jardinería, etc.). Solo se devuelve
     * cuando `tipo === 'vaga'`; vacío en los otros casos.
     */
    mensajeReformular: string;
}

// =============================================================================
// FUNCIÓN 1 — interpretarPregunta
// =============================================================================
//
// Le pide a Gemini que clasifique la pregunta del vecino y extraiga los
// términos buscables. Devuelve JSON estricto.

const PROMPT_INTERPRETAR = `Lee la pregunta de un vecino de la ciudad y clasifícala en UNO de estos 3 tipos:

A) "busqueda_local": el vecino busca algo concreto de la ciudad (un negocio, producto, servicio, oferta, alguien que ofrezca algo). El sustantivo/dominio es CLARO o INFERIBLE con UNA sola interpretación obvia.

B) "vaga": el vecino SÍ busca algo de la ciudad PERO la pregunta es demasiado ambigua para identificar UN dominio específico (tiene múltiples interpretaciones razonables sin pista para elegir). En este caso debes generar un \`mensajeReformular\` cálido y específico para esa pregunta, sugiriendo opciones concretas que ayuden al vecino a reformular.

C) "no_local": la pregunta NO es para buscar algo de la ciudad y NO es ofensiva (matemáticas, escribir textos, política, charla random, opinión general, etc.). La pregunta se queda visible en el feed (no es problemática, solo fuera de scope).

D) "inapropiada": preguntas sobre contenido ILEGAL u OFENSIVO. SIEMPRE devuelve "inapropiada" (NUNCA "busqueda_local" ni "vaga" ni "no_local") para:
- Drogas ilegales (marihuana, cocaína, cristal, pastillas ilegales, etc.).
- Armas, violencia, sicarios, asesinos, ataques.
- Contenido sexual explícito, pornografía, prostitución, acompañantes.
- Actividades ilegales (robo, fraude, falsificación, contrabando, hacking).
- Insultos, groserías o agresión directa contra Coyo, AnunciaYA o cualquier persona.

CRÍTICO con "inapropiada": NO inviten a la comunidad a responder; NO sugieran cómo conseguir esas cosas; NO mencionen el tema específico en mensajeReformular. Devuelve simplemente:
{"tipo": "inapropiada", "terminos": "", "mensajeReformular": ""}

El sistema mostrará el texto fijo de redirección Y OCULTARÁ la pregunta del feed para que ningún otro vecino la vea (importante para evitar que la comunidad ayude con esto).

REGLAS para terminos (solo cuando tipo es busqueda_local):
- 1 a 3 PALABRAS CLAVE ESENCIALES — la CATEGORÍA o el SUSTANTIVO PRINCIPAL.
- NO uses palabras DEMASIADO GENÉRICAS como término: "servicios", "servicio", "hogar", "casa", "ayuda", "algo", "bueno", "barato", "cosa", "cosas", "lugar", "lugares".
- Para palabras prestadas del INGLÉS (laptop, software, smartphone, hotdog, etc.) usa SIEMPRE el SINGULAR — el buscador en español no procesa plurales anglo.
- Para palabras en español puedes usar singular o plural indistintamente.

ESTRATEGIA DE SINÓNIMOS: Cuando la pregunta usa un término GENÉRICO de categoría donde los productos suelen publicarse con marcas/sinónimos distintos, INCLUYE 1-2 sinónimos comunes como tokens adicionales. Esto permite que el buscador encuentre productos que NO usan exactamente esa palabra genérica.

Ejemplos donde SÍ agregar sinónimos (el genérico raramente aparece literal en títulos):
- "smartphones" / "celulares" → terminos: "smartphone celular" (productos se publican como "iPhone", "Samsung", "Galaxy")
- "autos" / "carros" → terminos: "auto coche carro" (los 3 son comunes en México)
- "ropa de bebé" → terminos: "bebé ropa"
- "comida china" → terminos: "comida china"
- "ropa" → terminos: "ropa playera" (productos específicos)

Ejemplos donde NO agregar sinónimos (palabra ya específica, aparece literal en títulos):
- "tacos" → terminos: "tacos"
- "pizza" → terminos: "pizza"
- "plomería" → terminos: "plomería"
- "laptop" → terminos: "laptop"
- "panadería" → terminos: "panadería"

Tu juicio decide si el término es lo bastante genérico para merecer sinónimos. LIMITA a 3 tokens MÁXIMO total (incluyendo el original).

INFERENCIA: si la pregunta tiene UNA SOLA interpretación obvia aunque el sustantivo no esté explícito, clasifica como busqueda_local con los términos inferidos. Es parte de ser un buen asistente vecinal:
- "no tengo ganas de cocinar" → busqueda_local con terminos: "restaurantes"
- "el coche no arranca" → busqueda_local con terminos: "mecánico"
- "se me cayó algo en el ojo" → busqueda_local con terminos: "médico"
- "tengo hambre" → busqueda_local con terminos: "restaurantes"

REGLAS para mensajeReformular (solo cuando tipo es vaga):
- 1-2 frases cálidas, mexicanas naturales, sin exagerar.
- TUTEA siempre. NO uses "pueblo" ni "catálogo" — habla de "la ciudad" o "tu ciudad".
- DEBE incluir OPCIONES CONCRETAS para que el vecino sepa qué decir. Sugiere 3-5 dominios razonables relacionados con la pregunta.
- Si la pregunta es agresiva u ofensiva, NO te enganches — responde neutral y breve invitando a reformular bien.

EJEMPLOS de cada tipo:

busqueda_local:
- "¿Quién arregla una fuga de agua urgente?" → {"tipo": "busqueda_local", "terminos": "plomería", "mensajeReformular": ""}
- "¿Dónde venden tacos al pastor?" → {"tipo": "busqueda_local", "terminos": "tacos", "mensajeReformular": ""}
- "¿Dónde hay laptops?" → {"tipo": "busqueda_local", "terminos": "laptop", "mensajeReformular": ""}
- "venden smartphones?" → {"tipo": "busqueda_local", "terminos": "smartphone celular", "mensajeReformular": ""}
- "no tengo ganas de cocinar" → {"tipo": "busqueda_local", "terminos": "restaurantes", "mensajeReformular": ""}
- "el coche no arranca" → {"tipo": "busqueda_local", "terminos": "mecánico", "mensajeReformular": ""}

vaga:
- "¿Quien me ayuda con la casa?" → {"tipo": "vaga", "terminos": "", "mensajeReformular": "¡Hola! Para echarte la mano dime de qué se trata: ¿necesitas plomero, electricista, jardinería, limpieza o ayuda con mudanza? Con un poquito más de detalle te ayudo mejor."}
- "¿Tienen algo bueno?" → {"tipo": "vaga", "terminos": "", "mensajeReformular": "¡Híjole, hay mucho en tu ciudad! Cuéntame qué tipo de cosa te interesa: ¿negocios, productos en venta, ofertas del día, servicios? Con un poquito más de pista te oriento."}
- "no encuentro nada barato" → {"tipo": "vaga", "terminos": "", "mensajeReformular": "Pues mira, ¿qué andas buscando barato? Dime si es comida, ropa, electrónica, herramientas o algún servicio en particular, y te echo un ojo."}

no_local:
- "¿Cuánto es 5 por 8?" → {"tipo": "no_local", "terminos": "", "mensajeReformular": ""}
- "Escríbeme un poema sobre el mar" → {"tipo": "no_local", "terminos": "", "mensajeReformular": ""}
- "qué piensas de la política?" → {"tipo": "no_local", "terminos": "", "mensajeReformular": ""}

inapropiada:
- "donde venden marihuana?" → {"tipo": "inapropiada", "terminos": "", "mensajeReformular": ""}
- "necesito un sicario" → {"tipo": "inapropiada", "terminos": "", "mensajeReformular": ""}
- "donde compro armas?" → {"tipo": "inapropiada", "terminos": "", "mensajeReformular": ""}
- "ustedes son una mierda" → {"tipo": "inapropiada", "terminos": "", "mensajeReformular": ""}
- "necesito prostitutas" → {"tipo": "inapropiada", "terminos": "", "mensajeReformular": ""}

RESPONDE SOLO con JSON válido, SIN texto extra, SIN bloques markdown, SIN explicaciones. El JSON debe tener exactamente esta forma:
{"tipo": "busqueda_local"|"vaga"|"no_local", "terminos": "...", "mensajeReformular": "..."}`;

/**
 * Clasifica la pregunta del vecino y extrae términos buscables.
 *
 * @example
 *   const r = await interpretarPregunta("¿Hay plomeros que vengan hoy?");
 *   if (r.disponible) {
 *     console.log(r.data.esBusquedaLocal, r.data.terminos);
 *   }
 */
export async function interpretarPregunta(
    texto: string,
): Promise<RespuestaIA<PreguntaInterpretada>> {
    const cliente = obtenerCliente();
    if (cliente === null) return { disponible: false, razon: 'sin_api_key' };

    let textoRespuesta: string;
    try {
        const r = await cliente.models.generateContent({
            model: MODELO_GEMINI,
            contents: `${PROMPT_INTERPRETAR}\n\nPregunta del vecino:\n${texto}`,
        });
        textoRespuesta = r.text ?? '';
    } catch (error) {
        console.warn('Coyo IA — interpretarPregunta falló al llamar a Gemini:', error);
        return { disponible: false, razon: 'error_gemini' };
    }

    try {
        const limpio = limpiarJsonDeGemini(textoRespuesta);
        const parseado: unknown = JSON.parse(limpio);
        if (esPreguntaInterpretada(parseado)) {
            return { disponible: true, data: parseado };
        }
        console.warn(
            'Coyo IA — interpretarPregunta: JSON con shape inválido',
            textoRespuesta,
        );
        return { disponible: false, razon: 'error_parseo' };
    } catch (error) {
        console.warn(
            'Coyo IA — interpretarPregunta: respuesta no es JSON parseable',
            { texto: textoRespuesta, error },
        );
        return { disponible: false, razon: 'error_parseo' };
    }
}

// =============================================================================
// FUNCIÓN 2 — redactarRespuestaCoyo
// =============================================================================

/**
 * Tipo intencional `unknown` para NO acoplar esta cajita con el shape exacto
 * del buscador unificado. El service que orquesta (siguiente sprint) le pasa
 * directamente el `resultados` de `buscarEnTodaLaApp` — Gemini lee el JSON
 * como contexto y produce el texto.
 *
 * Si en algún momento Coyo necesita acceder programáticamente a un campo
 * antes de pasar a Gemini, ese narrowing vive en el caller, no aquí.
 */
export type ResultadosParaRedactar = unknown;

/**
 * Le pide a Gemini que redacte la respuesta de Coyo presentando SOLO los
 * resultados reales que se le pasan, siguiendo la `PERSONALIDAD_COYO`.
 *
 * @example
 *   const r = await redactarRespuestaCoyo("¿hay tacos?", resultadosBusqueda);
 *   if (r.disponible) console.log(r.data); // texto listo para mostrar
 */
export async function redactarRespuestaCoyo(
    pregunta: string,
    resultados: ResultadosParaRedactar,
): Promise<RespuestaIA<string>> {
    const cliente = obtenerCliente();
    if (cliente === null) return { disponible: false, razon: 'sin_api_key' };

    const datosJson = JSON.stringify(resultados, null, 2);
    const prompt = `${PERSONALIDAD_COYO}

Pregunta del vecino:
${pregunta}

Resultados reales encontrados en tu ciudad (JSON):
${datosJson}

Escribe la respuesta de Coyo en español, breve (1-2 frases), cálida y mexicana sin exagerar. NO uses las palabras "pueblo" ni "catálogo" — habla de "tu ciudad" o "la ciudad".

CASO A — Si hay resultados (al menos un grupo tiene items): SOLO menciona resultados que estén en el JSON. Si hay datos ricos (rating, totalResenas, verificado, estaAbierto, condicion, aceptaOfertas, negocioRating, diasParaVencer), úsalos cuando aporten valor. NUNCA inventes negocios, precios ni datos.

CASO B — Si TODOS los grupos vienen vacíos (sin items en ninguno): dilo con honestidad y calidez, sin inventar nada. Reconoce que esta vez no encontraste eso en tu ciudad, e invita al vecino a dejar su pregunta para que la comunidad pueda responderle. Mantén el tono cálido y vecinal — no es un error, es información honesta.

RESPONDE SOLO con el texto de Coyo, SIN comillas envolventes, SIN bloques markdown, SIN encabezados, SIN explicaciones.`;

    try {
        const r = await cliente.models.generateContent({
            model: MODELO_GEMINI,
            contents: prompt,
        });
        const texto = (r.text ?? '').trim();
        if (texto.length === 0) {
            console.warn('Coyo IA — redactarRespuestaCoyo: Gemini devolvió texto vacío');
            return { disponible: false, razon: 'error_parseo' };
        }
        return { disponible: true, data: texto };
    } catch (error) {
        console.warn('Coyo IA — redactarRespuestaCoyo falló al llamar a Gemini:', error);
        return { disponible: false, razon: 'error_gemini' };
    }
}

// =============================================================================
// HELPERS INTERNOS
// =============================================================================

/**
 * Gemini a veces envuelve el JSON en bloques markdown (```json ... ```)
 * aunque le pidas "solo JSON". Esta función quita esa envoltura y trims.
 */
function limpiarJsonDeGemini(raw: string): string {
    let s = raw.trim();
    if (s.startsWith('```')) {
        s = s
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/, '')
            .trim();
    }
    return s;
}

/**
 * Type guard que verifica que un valor desconocido tenga la forma de
 * `PreguntaInterpretada` antes de castearlo. Defensivo contra Gemini
 * devolviendo un JSON con otro shape.
 */
function esPreguntaInterpretada(v: unknown): v is PreguntaInterpretada {
    if (typeof v !== 'object' || v === null) return false;
    const obj = v as Record<string, unknown>;
    return (
        typeof obj.tipo === 'string' &&
        (obj.tipo === 'busqueda_local' ||
            obj.tipo === 'vaga' ||
            obj.tipo === 'no_local' ||
            obj.tipo === 'inapropiada') &&
        typeof obj.terminos === 'string' &&
        typeof obj.mensajeReformular === 'string'
    );
}
