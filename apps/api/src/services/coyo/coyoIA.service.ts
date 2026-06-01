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
 * Output de `interpretarPregunta`.
 */
export interface PreguntaInterpretada {
    /**
     * `true` si la pregunta del vecino es para BUSCAR algo de su ciudad
     * (un negocio, producto, servicio u oferta). `false` para cualquier
     * otra cosa (matemáticas, escribir textos, política, charla random).
     */
    esBusquedaLocal: boolean;
    /**
     * Palabras clave limpias para alimentar al buscador unificado.
     * Cuando `esBusquedaLocal === false`, es string vacío.
     */
    terminos: string;
}

// =============================================================================
// FUNCIÓN 1 — interpretarPregunta
// =============================================================================
//
// Le pide a Gemini que clasifique la pregunta del vecino y extraiga los
// términos buscables. Devuelve JSON estricto.

const PROMPT_INTERPRETAR = `Lee la pregunta de un vecino de la ciudad y decide 2 cosas:

1. esBusquedaLocal: true si la pregunta es para BUSCAR algo de la ciudad (un negocio, un producto, un servicio, una oferta, alguien que ofrezca algo). false si es otra cosa (matemáticas, escribir textos, política, charla random, opinión general, etc.).

2. terminos: SOLO 1 a 3 PALABRAS CLAVE ESENCIALES — la CATEGORÍA o el SUSTANTIVO PRINCIPAL de lo que busca. NO devuelvas sinónimos. NO devuelvas frases largas. Prefiere 1 palabra fuerte; máximo 3 SOLO si de verdad ayudan a precisar (ej. "cuidado mascotas" porque las dos juntas precisan el dominio). Para palabras prestadas del INGLÉS (laptop, software, smartphone, hotdog, etc.) usa SIEMPRE el SINGULAR — el buscador en español no procesa plurales de palabras anglo. Para palabras en español puedes usar singular o plural indistintamente.

NO uses palabras DEMASIADO GENÉRICAS como término clave: "servicios", "servicio", "hogar", "casa", "ayuda", "algo", "bueno", "barato", "cosa", "cosas", "lugar", "lugares". Estas palabras matchean cientos de negocios sin precisar el dominio y generan ruido.

SÍ debes INFERIR el dominio cuando la pregunta tenga UNA SOLA interpretación obvia aunque el sustantivo principal no esté explícito en la pregunta. Es parte de ser un buen asistente vecinal: anticipar lo que el vecino busca. Ejemplos de inferencia clara:
- "no tengo ganas de cocinar" → busca restaurantes/comida a domicilio → terminos: "restaurantes"
- "se me cayó algo en el ojo" → busca atención médica → terminos: "médico"
- "el coche no arranca" → busca mecánico → terminos: "mecánico"
- "se me rompió el cierre de la maleta" → busca taller de reparación → terminos: "reparación"
- "tengo hambre" → busca comida → terminos: "comida" o "restaurantes"

Si la pregunta es vaga con MÚLTIPLES interpretaciones razonables y no hay pista para elegir UNA (ej. "tienen algo bueno?", "quien me ayuda con la casa?" — la casa puede ser limpieza, plomería, electricidad, jardinería, mudanza), clasifica como esBusquedaLocal=false en lugar de inventar una sola interpretación.

Si esBusquedaLocal es false, deja terminos como "".

Ejemplos:
- "¿Quién arregla una fuga de agua urgente?" → {"esBusquedaLocal": true, "terminos": "plomería"}
- "¿Dónde venden tacos al pastor?" → {"esBusquedaLocal": true, "terminos": "tacos"}
- "¿Dónde hay laptops?" → {"esBusquedaLocal": true, "terminos": "laptop"}
- "Busco quien cuide a mi perro el fin" → {"esBusquedaLocal": true, "terminos": "cuidado mascotas"}
- "Necesito un fotógrafo para mi boda" → {"esBusquedaLocal": true, "terminos": "fotógrafo bodas"}
- "no tengo ganas de cocinar" → {"esBusquedaLocal": true, "terminos": "restaurantes"}
- "el coche no arranca" → {"esBusquedaLocal": true, "terminos": "mecánico"}
- "se me cayó algo en el ojo" → {"esBusquedaLocal": true, "terminos": "médico"}
- "¿Cuánto es 5 por 8?" → {"esBusquedaLocal": false, "terminos": ""}
- "Escríbeme un poema sobre el mar" → {"esBusquedaLocal": false, "terminos": ""}
- "¿Tienen algo bueno?" → {"esBusquedaLocal": false, "terminos": ""}
- "¿Quien me ayuda con la casa?" → {"esBusquedaLocal": false, "terminos": ""}

RESPONDE SOLO con JSON válido, SIN texto extra, SIN bloques markdown, SIN explicaciones. El JSON debe tener exactamente esta forma:
{"esBusquedaLocal": true|false, "terminos": "..."}`;

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
        typeof obj.esBusquedaLocal === 'boolean' &&
        typeof obj.terminos === 'string'
    );
}
