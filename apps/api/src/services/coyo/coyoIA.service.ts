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

import { GoogleGenAI, FunctionCallingConfigMode, type FunctionDeclaration, type FunctionCall, type Part } from '@google/genai';
import { env } from '../../config/env.js';
import {
    obtenerCatalogoCategorias,
    formatearCatalogoParaPrompt,
    obtenerCatalogoMarketplace,
    formatearCatalogoMarketplaceParaPrompt,
} from './categoriasCatalogo.service.js';
import { obtenerCategoriasMarketplace } from '../marketplace/categorias.js';
import { CAPACIDADES_ASISTENTE, type Capacidad } from '../asistente/capacidades.js';
import { CONOCIMIENTO_ANUNCIAYA } from './conocimientoAnunciaYA.js';

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

EMPATÍA EMOCIONAL:
- Si la pregunta del vecino transmite cansancio, dolor, urgencia, frustración u otra emoción (aunque sea sutil), RECONÓCELA antes de presentar opciones.
- NO empieces con expresiones genéricas de entusiasmo ("¡Qué rico!", "¡Qué buena idea!") cuando el vecino claramente expresó cansancio o molestia — suena al revés.
- Ejemplos de empatía bien encajada:
   - "no tengo ganas de cocinar" → "¡Te entiendo, hoy a descansar!" / "¡Ay, qué flojera!" + opciones
   - "se me arruinó el coche" → "¡Híjole, qué mala suerte!" / "Entiendo lo de tu coche" + opciones
   - "me duele algo" → "Ojalá te sientas mejor pronto" + opciones
   - "necesito X urgente" → "¡Vamos a resolverlo rápido!" + opciones
   - "no encuentro nada barato" → "Te entiendo, vamos a buscar opciones accesibles" + opciones
- Cuando NO haya emoción visible (pregunta neutra como "donde venden tacos"), responde directo sin forzar empatía.

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

/**
 * Modelo principal — el más nuevo y de mejor calidad. Si Gemini está
 * caído (503) o lento, se reintenta dentro del mismo modelo antes de
 * caer al fallback.
 */
const MODELO_GEMINI_PRINCIPAL = 'gemini-2.5-flash';

/**
 * Modelo de respaldo cuando el principal agota reintentos. Variante ligera de
 * la familia 2.5 (rápida y barata) — buena disponibilidad para redactar cuando
 * el principal (gemini-2.5-flash) está saturado o lento.
 *
 * NOTA: el anterior `gemini-2.0-flash` fue RETIRADO por Google (404
 * "no longer available", jun-2026). Si este modelo también se retira, cambiar
 * por el flash/lite vigente más reciente.
 */
const MODELO_GEMINI_FALLBACK = 'gemini-2.5-flash-lite';

/**
 * Backoff de reintentos por modelo (ms). Tres intentos: inmediato,
 * 1 segundo, 3 segundos. La mayoría de los 503 transitorios de Gemini
 * se resuelven en pocos segundos.
 */
const DELAYS_REINTENTO_MS = [0, 1000, 3000];

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
// HELPERS DE RESILIENCIA (RETRY + FALLBACK)
// =============================================================================

/**
 * Determina si un error de Gemini es TRANSITORIO (vale la pena reintentar)
 * o PERMANENTE (no tiene sentido reintentar).
 *
 *  - 5xx (503, 502, 500): servidor de Gemini saturado o caído → transitorio.
 *  - 429: rate limit / cuota → transitorio (esperar y reintentar).
 *  - 408: timeout → transitorio.
 *  - 4xx (excepto 408/429): cliente erróneo (400 bad request, 401 sin auth,
 *    403 sin permiso, 404 modelo no existe) → permanente, no reintentar.
 *  - Sin status (network error, DNS, etc.) → asumir transitorio.
 */
function esErrorTransitorio(error: unknown): boolean {
    if (error && typeof error === 'object' && 'status' in error) {
        const status = (error as { status: unknown }).status;
        if (typeof status === 'number') {
            if (status >= 500) return true;
            if (status === 429 || status === 408) return true;
            return false;
        }
    }
    // Errores sin status (red, DNS, timeout no tipado) → asumir transitorio.
    return true;
}

/**
 * Shape exacto que espera `cliente.models.generateContent({ contents })` —
 * lo derivamos del propio SDK en vez de redefinirlo a mano, así que si
 * `@google/genai` cambia su tipo, este archivo lo refleja sin desincronizarse.
 * Acepta tanto un string plano (llamadas solo-texto) como un array de
 * `Content` con `parts` multimodales (texto + `inlineData` de imagen).
 */
type ContenidoGemini = Parameters<GoogleGenAI['models']['generateContent']>[0]['contents'];

/**
 * Config opcional que aceptan algunas llamadas (ej. `tools` de function
 * calling para `interpretarPeticionAsistente`). La mayoría de las funciones
 * de esta cajita no la usan — queda `undefined` y `generateContent` se llama
 * sin `config`, igual que antes.
 */
type ConfigGemini = Parameters<GoogleGenAI['models']['generateContent']>[0]['config'];

/**
 * Llama a Gemini con resiliencia: reintenta el modelo principal hasta 3
 * veces con backoff (0s → 1s → 3s), y si todos los reintentos fallan
 * con errores transitorios, intenta con el modelo de respaldo.
 *
 * Devuelve `{ texto, modelo, functionCalls }` si alguna llamada funcionó, o
 * `null` si fallaron todas las combinaciones (modelo principal × 3 intentos +
 * modelo fallback × 3 intentos = 6 intentos antes de rendirse).
 *
 * Los errores permanentes (4xx excepto 408/429) NO se reintentan y
 * tampoco activan el fallback — devuelven `null` inmediatamente.
 */
async function llamarGeminiConReintento(
    cliente: GoogleGenAI,
    contents: ContenidoGemini,
    config?: ConfigGemini,
): Promise<{ texto: string; modelo: string; functionCalls?: FunctionCall[] } | null> {
    const modelos = [MODELO_GEMINI_PRINCIPAL, MODELO_GEMINI_FALLBACK];

    for (const modelo of modelos) {
        for (let intento = 0; intento < DELAYS_REINTENTO_MS.length; intento++) {
            const delay = DELAYS_REINTENTO_MS[intento];
            if (delay > 0) {
                await new Promise((r) => setTimeout(r, delay));
            }
            try {
                const r = await cliente.models.generateContent({
                    model: modelo,
                    contents,
                    ...(config ? { config } : {}),
                });
                if (intento > 0 || modelo !== MODELO_GEMINI_PRINCIPAL) {
                    // Solo loguear cuando hubo recuperación (no en el path feliz)
                    console.warn(
                        `Coyo IA — recuperado con ${modelo} en intento ${intento + 1}`,
                    );
                }
                return { texto: r.text ?? '', modelo, functionCalls: r.functionCalls };
            } catch (error) {
                const transitorio = esErrorTransitorio(error);
                if (!transitorio) {
                    // Error permanente (4xx) — no reintentar, no fallback.
                    console.warn(
                        `Coyo IA — error permanente en ${modelo}, no se reintenta:`,
                        error,
                    );
                    return null;
                }
                const esUltimoIntento = intento === DELAYS_REINTENTO_MS.length - 1;
                const esUltimoModelo = modelo === MODELO_GEMINI_FALLBACK;
                if (esUltimoIntento && esUltimoModelo) {
                    console.warn(
                        `Coyo IA — agotados todos los reintentos en ${modelo}:`,
                        error,
                    );
                } else if (esUltimoIntento) {
                    console.warn(
                        `Coyo IA — ${modelo} agotó reintentos, intentando ${MODELO_GEMINI_FALLBACK}...`,
                    );
                }
                // Continúa con el siguiente intento (mismo modelo o siguiente)
            }
        }
    }

    return null;
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
 * Dirección de la búsqueda (solo relevante cuando `tipo='busqueda_local'`):
 *  - `busca_oferta` (DEFAULT): el vecino quiere ENCONTRAR / COMPRAR / CONTRATAR
 *    algo que otro ofrece ("¿dónde venden X?", "¿quién arregla Y?", "ocupo Z").
 *    → Negocios + Ofertas + MarketPlace en venta + Servicios ofrecidos.
 *  - `busca_demanda`: el vecino OFRECE / VENDE algo y busca QUIÉN LO NECESITA /
 *    COMPRA ("¿quién compra X?", "vendo Z", "¿alguien que ocupe [mi servicio]?").
 *    → MarketPlace en modo 'busco' + Servicios 'solicito' (sin Negocios ni Ofertas).
 */
export type IntencionPregunta = 'busca_oferta' | 'busca_demanda';

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
    /**
     * Dirección de la búsqueda. Solo importa cuando `tipo === 'busqueda_local'`.
     * Si Gemini la omite o manda un valor inválido, se normaliza a
     * `'busca_oferta'` (el caso mayoritario y seguro). Ver {@link IntencionPregunta}.
     */
    intencion: IntencionPregunta;
    /**
     * `true` SOLO cuando el vecino busca TRABAJO/EMPLEO para sí mismo ("hay
     * empleo?", "buscan personal?", "vacante de X"). Se responde con las
     * VACANTES (`tipo='vacante-empresa'`), NO con negocios ni servicios — es un
     * carril aparte en `buscadorUnificado` que ignora la `intencion`. Default false.
     */
    esEmpleo: boolean;
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
- REGLA DE ORO — CONSERVA LA PALABRA DEL VECINO: si el vecino nombra algo CONCRETO (un producto, comida u objeto: "pan", "tacos", "cama", "bicicleta", "refrigerador"), SIEMPRE incluye esa palabra en los términos. Puedes AGREGAR la categoría del catálogo o un sinónimo como token EXTRA, pero NUNCA reemplaces la palabra del vecino solo por la categoría: los artículos de MarketPlace y las solicitudes usan la palabra LITERAL (ej. el artículo "Vendo Pan dulce" matchea "pan" pero NO "panadería"). Ej: "quiero comer pan" → "pan panadería" (no solo "panadería").
- NO uses palabras DEMASIADO GENÉRICAS como término: "servicios", "servicio", "hogar", "casa", "ayuda", "algo", "bueno", "barato", "cosa", "cosas", "lugar", "lugares".
- Para palabras prestadas del INGLÉS (laptop, software, smartphone, hotdog, etc.) usa SIEMPRE el SINGULAR — el buscador en español no procesa plurales anglo.
- Para palabras en español puedes usar singular o plural indistintamente.

ESTRATEGIA DE DOMINIO AMPLIO (la más importante — léela con cuidado): el negocio de AnunciaYA se organiza en CATEGORÍAS PRINCIPALES (ej. "Comida", "Salud", "Belleza", "Comercios", "Servicios"). Cada categoría tiene varias subcategorías (ej. "Comida" agrupa Mariscos, Restaurantes, Panaderías, Repostería, Tortillerías).

Las categorías REALES y vigentes están listadas al final de este prompt en la sección "CATÁLOGO DE CATEGORÍAS DE ANUNCIAYA". Úsalas como referencia.

Cuando el vecino busque algo de un DOMINIO AMPLIO sin pedir un sustantivo específico (ej. "no tengo ganas de cocinar", "tengo hambre", "me duele algo", "necesito ir al peluquero"), USA LA CATEGORÍA PRINCIPAL del catálogo como uno de los términos, EXACTAMENTE COMO APARECE en el catálogo (con la inicial en mayúscula). Eso permite que el buscador encuentre TODOS los negocios de esa categoría, no solo los que coinciden con palabra específica.

Ejemplos de dominio amplio:
- "no tengo ganas de cocinar" → terminos: "Comida restaurantes"
- "tengo hambre" → terminos: "Comida"
- "necesito comer algo" → terminos: "Comida"
- "me duele algo" → terminos: "Salud médico"
- "necesito ir al peluquero" → terminos: "Belleza"
- "necesito ropa" → terminos: "Comercios ropa"
- "donde paso un buen rato" → terminos: "Diversión"

Cuando el vecino busca algo ESPECÍFICO (con sustantivo concreto), prefiere la palabra específica:
- "donde hay tacos" → terminos: "tacos"
- "donde venden mariscos" → terminos: "Mariscos" (es subcategoría exacta del catálogo)
- "necesito una farmacia" → terminos: "Farmacias" (subcategoría exacta)
- "donde hay una panadería" → terminos: "Panaderías" (subcategoría exacta)
- "donde compro pan dulce" → terminos: "Repostería pan" (subcategoría + palabra)
- "quiero comer pan" → terminos: "pan panadería" (conserva "pan" para los artículos que lo dicen + el giro para los negocios)

ESTRATEGIA DE SINÓNIMOS (para palabras anglo o muy genéricas): Cuando la pregunta usa un término GENÉRICO en INGLÉS donde los productos suelen publicarse con marcas, INCLUYE 1-2 sinónimos comunes:
- "smartphones" / "celulares" → terminos: "smartphone celular" (matchea iPhone, Samsung, etc.)
- "autos" / "carros" → terminos: "auto coche carro"

Ejemplos donde NO agregar sinónimos (palabra ya específica):
- "tacos" → terminos: "tacos"
- "pizza" → terminos: "pizza"

ESTRATEGIA DE OFICIOS (español, MUY IMPORTANTE): los oficios tienen forma de PERSONA (plomero, electricista, albañil, carpintero, jardinero, mecánico, pintor, cerrajero) y forma de GIRO (plomería, carpintería, jardinería, cerrajería). El buscador NO une "plomero" con "plomería" (son raíces distintas para el motor), y las publicaciones usan CUALQUIERA de las dos indistintamente: una solicitud dice "busco plomero" y un oferente dice "ofrezco plomería". Por eso, para un oficio, INCLUYE SIEMPRE LAS DOS FORMAS (persona Y giro) sin importar cuál escribió el vecino:
- "un plomero" / "ofrezco plomería" / "servicios de plomería" → terminos: "plomero plomería"
- "necesito un carpintero" / "hago carpintería" → terminos: "carpintero carpintería"
- "electricista" (no tiene giro claramente distinto) → terminos: "electricista"
NUNCA pongas solo UNA forma cuando el oficio tiene ambas — perderías las publicaciones que usan la otra. Aplica igual en busca_oferta y busca_demanda.

LIMITA a 4 tokens MÁXIMO total. Tu juicio decide cuál estrategia aplicar según la pregunta.

INFERENCIA: si la pregunta tiene UNA SOLA interpretación obvia aunque el sustantivo no esté explícito, clasifica como busqueda_local con los términos inferidos. Es parte de ser un buen asistente vecinal:
- "no tengo ganas de cocinar" → busqueda_local con terminos: "restaurantes"
- "el coche no arranca" → busqueda_local con terminos: "mecánico"
- "se me cayó algo en el ojo" → busqueda_local con terminos: "médico"
- "tengo hambre" → busqueda_local con terminos: "restaurantes"

PREGUNTAS DE OPINIÓN QUE ESCONDEN BÚSQUEDA: en español mexicano es común preguntar de forma INDIRECTA con frases como "¿está chido X?", "¿vale la pena X?", "¿me conviene X?", "¿es buena idea X?". Si X es algo que la app puede buscar (negocio, producto, servicio, oferta, comida, etc.), el vecino REALMENTE quiere encontrar X — solo lo pregunta así. Trata X como busqueda_local. Pero si X es algo abstracto (política, clima, vivir en otro país, opiniones), sigue siendo no_local.
- "¿está chido pedir tacos a domicilio?" → busqueda_local con terminos: "tacos domicilio"
- "¿vale la pena ir al mecánico aquí?" → busqueda_local con terminos: "mecánico"
- "¿me conviene comprar una laptop usada?" → busqueda_local con terminos: "laptop"
- "¿está chido el clima?" → no_local (clima es abstracto, no buscable)
- "¿qué piensas de los políticos?" → no_local (opinión abstracta)

INTENCIÓN — DIRECCIÓN DE LA BÚSQUEDA (campo "intencion"; decide SIEMPRE, pero solo se usa cuando tipo es busqueda_local):
¿El vecino es el que BUSCA algo, o el que OFRECE algo?
- "busca_oferta" (POR DEFECTO — el caso normal): el vecino quiere ENCONTRAR, COMPRAR o CONTRATAR algo que alguien más ofrece. Ej: "¿dónde venden X?", "¿quién arregla Y?", "necesito/ocupo un plomero", "tengo hambre", "busco una lavadora".
- "busca_demanda": el vecino OFRECE o VENDE algo y busca QUIÉN LO NECESITA o LO COMPRA. Ej: "¿quién compra X?", "vendo mi X", "ofrezco clases de inglés", "doy servicio de plomería", "¿alguien que ocupe un plomero?" (cuando el vecino ES el plomero buscando clientes).

OJO con "ocupar" (en México = necesitar) — el pivote es QUIÉN necesita:
- "ocupo un plomero" / "necesito un plomero" → el vecino necesita el servicio → busca_oferta.
- "¿alguien que ocupe un plomero?" / "¿quién necesita un plomero?" → el vecino se ofrece como plomero y busca clientes → busca_demanda.

El pivote general: ¿el vecino TIENE/OFRECE algo (busca_demanda) o lo QUIERE/NECESITA (busca_oferta)? Ante cualquier duda, usa "busca_oferta". Cuando tipo NO es busqueda_local, pon igualmente "busca_oferta".

DOMINIO EMPLEO (campo "esEmpleo"): pon esEmpleo=true SOLO cuando el vecino busca TRABAJO/EMPLEO para sí mismo. Estas preguntas se responden con las VACANTES que publican las empresas (NO con negocios ni servicios). Señales: "hay empleo?", "hay chamba?", "buscan personal?", "están contratando?", "vacantes disponibles?", "solicitan meseros?", "busco trabajo de X", "hay trabajo de X?".
- Sigue siendo tipo="busqueda_local".
- Si el vecino NO menciona un puesto específico (solo "empleo"/"trabajo"/"chamba"), deja terminos VACÍO ("") — se traerán todas las vacantes recientes.
- Si SÍ menciona un puesto ("solicitan meseros?", "vacante de diseñador"), pon SOLO el puesto en terminos ("mesero", "diseñador").
- esEmpleo=false para TODO lo demás. OJO: "necesito un plomero" / "ocupo un albañil" NO son empleo — el vecino quiere CONTRATAR un servicio, no emplearse (esEmpleo=false).

REGLAS para mensajeReformular (solo cuando tipo es vaga):
- 1-2 frases cálidas, mexicanas naturales, sin exagerar.
- TUTEA siempre. NO uses "pueblo" ni "catálogo" — habla de "la ciudad" o "tu ciudad".
- DEBE incluir OPCIONES CONCRETAS para que el vecino sepa qué decir. Sugiere 3-5 dominios razonables relacionados con la pregunta.
- Si la pregunta es agresiva u ofensiva, NO te enganches — responde neutral y breve invitando a reformular bien.

EJEMPLOS de cada tipo (fíjate en el campo "intencion"):

busqueda_local · busca_oferta (el vecino busca / compra / contrata):
- "¿Quién arregla una fuga de agua urgente?" → {"tipo": "busqueda_local", "terminos": "plomería", "mensajeReformular": "", "intencion": "busca_oferta"}
- "¿Dónde venden tacos al pastor?" → {"tipo": "busqueda_local", "terminos": "tacos", "mensajeReformular": "", "intencion": "busca_oferta"}
- "¿Dónde hay laptops?" → {"tipo": "busqueda_local", "terminos": "laptop", "mensajeReformular": "", "intencion": "busca_oferta"}
- "venden smartphones?" → {"tipo": "busqueda_local", "terminos": "smartphone celular", "mensajeReformular": "", "intencion": "busca_oferta"}
- "no tengo ganas de cocinar" → {"tipo": "busqueda_local", "terminos": "restaurantes", "mensajeReformular": "", "intencion": "busca_oferta"}
- "el coche no arranca" → {"tipo": "busqueda_local", "terminos": "mecánico", "mensajeReformular": "", "intencion": "busca_oferta"}
- "ocupo un plomero" → {"tipo": "busqueda_local", "terminos": "plomero plomería", "mensajeReformular": "", "intencion": "busca_oferta"}
- "está chido pedir tacos a domicilio?" → {"tipo": "busqueda_local", "terminos": "tacos domicilio", "mensajeReformular": "", "intencion": "busca_oferta"}
- "vale la pena ir al mecánico aquí?" → {"tipo": "busqueda_local", "terminos": "mecánico", "mensajeReformular": "", "intencion": "busca_oferta"}

busqueda_local · busca_demanda (el vecino OFRECE / VENDE y busca quién lo necesita / compra):
- "¿quién compra una cama matrimonial?" → {"tipo": "busqueda_local", "terminos": "cama matrimonial", "mensajeReformular": "", "intencion": "busca_demanda"}
- "vendo mi bici de montaña" → {"tipo": "busqueda_local", "terminos": "bicicleta montaña", "mensajeReformular": "", "intencion": "busca_demanda"}
- "ofrezco clases de inglés" → {"tipo": "busqueda_local", "terminos": "clases inglés", "mensajeReformular": "", "intencion": "busca_demanda"}
- "¿alguien que ocupe un plomero?" → {"tipo": "busqueda_local", "terminos": "plomero plomería", "mensajeReformular": "", "intencion": "busca_demanda"}
- "doy servicio de jardinería ¿a quién le interesa?" → {"tipo": "busqueda_local", "terminos": "jardinero jardinería", "mensajeReformular": "", "intencion": "busca_demanda"}
- "ofrezco servicios de plomería" → {"tipo": "busqueda_local", "terminos": "plomero plomería", "mensajeReformular": "", "intencion": "busca_demanda"}

busqueda_local · empleo (esEmpleo=true — el vecino busca trabajo; se responde con VACANTES):
- "hay algún empleo?" → {"tipo": "busqueda_local", "terminos": "", "mensajeReformular": "", "intencion": "busca_oferta", "esEmpleo": true}
- "buscan personal?" → {"tipo": "busqueda_local", "terminos": "", "mensajeReformular": "", "intencion": "busca_oferta", "esEmpleo": true}
- "están contratando?" → {"tipo": "busqueda_local", "terminos": "", "mensajeReformular": "", "intencion": "busca_oferta", "esEmpleo": true}
- "solicitan meseros?" → {"tipo": "busqueda_local", "terminos": "mesero", "mensajeReformular": "", "intencion": "busca_oferta", "esEmpleo": true}
- "hay vacante de diseñador?" → {"tipo": "busqueda_local", "terminos": "diseñador", "mensajeReformular": "", "intencion": "busca_oferta", "esEmpleo": true}

vaga:
- "¿Quien me ayuda con la casa?" → {"tipo": "vaga", "terminos": "", "mensajeReformular": "¡Hola! Para echarte la mano dime de qué se trata: ¿necesitas plomero, electricista, jardinería, limpieza o ayuda con mudanza? Con un poquito más de detalle te ayudo mejor.", "intencion": "busca_oferta"}
- "¿Tienen algo bueno?" → {"tipo": "vaga", "terminos": "", "mensajeReformular": "¡Híjole, hay mucho en tu ciudad! Cuéntame qué tipo de cosa te interesa: ¿negocios, productos en venta, ofertas del día, servicios? Con un poquito más de pista te oriento.", "intencion": "busca_oferta"}
- "no encuentro nada barato" → {"tipo": "vaga", "terminos": "", "mensajeReformular": "Pues mira, ¿qué andas buscando barato? Dime si es comida, ropa, electrónica, herramientas o algún servicio en particular, y te echo un ojo.", "intencion": "busca_oferta"}

no_local:
- "¿Cuánto es 5 por 8?" → {"tipo": "no_local", "terminos": "", "mensajeReformular": "", "intencion": "busca_oferta"}
- "Escríbeme un poema sobre el mar" → {"tipo": "no_local", "terminos": "", "mensajeReformular": "", "intencion": "busca_oferta"}
- "qué piensas de la política?" → {"tipo": "no_local", "terminos": "", "mensajeReformular": "", "intencion": "busca_oferta"}

inapropiada:
- "donde venden marihuana?" → {"tipo": "inapropiada", "terminos": "", "mensajeReformular": "", "intencion": "busca_oferta"}
- "necesito un sicario" → {"tipo": "inapropiada", "terminos": "", "mensajeReformular": "", "intencion": "busca_oferta"}
- "donde compro armas?" → {"tipo": "inapropiada", "terminos": "", "mensajeReformular": "", "intencion": "busca_oferta"}
- "ustedes son una mierda" → {"tipo": "inapropiada", "terminos": "", "mensajeReformular": "", "intencion": "busca_oferta"}
- "necesito prostitutas" → {"tipo": "inapropiada", "terminos": "", "mensajeReformular": "", "intencion": "busca_oferta"}

RESPONDE SOLO con JSON válido, SIN texto extra, SIN bloques markdown, SIN explicaciones. El JSON debe tener exactamente esta forma:
{"tipo": "busqueda_local"|"vaga"|"no_local"|"inapropiada", "terminos": "...", "mensajeReformular": "...", "intencion": "busca_oferta"|"busca_demanda", "esEmpleo": true|false}`;

/**
 * Instrucción que se agrega al prompt SOLO cuando el vecino adjuntó una foto.
 * Gemini 2.5-flash es multimodal nativo — la imagen se manda como `inlineData`
 * junto con este texto. El objetivo (visión estratégica): que Coyo pueda
 * responder al instante usando la imagen como contexto, sin esperar a que
 * la comunidad interprete una pregunta vaga por el vecino.
 */
const INSTRUCCION_IMAGEN = `

EL VECINO ADJUNTÓ UNA FOTO junto con su pregunta. Analízala como contexto ADICIONAL:
- Úsala para identificar el objeto, producto, problema o categoría que el texto no deja claro (ej. una foto de una llave goteando + "esto tiene arreglo?" → terminos: "plomero plomería"; una foto de un platillo + "se ve rico esto?" → terminos del platillo o "restaurantes").
- Si el texto YA es claro, la foto solo confirma o afina los términos — no cambies la interpretación si la imagen no aporta nada nuevo.
- Si el texto por sí solo sería "vaga" pero la foto muestra algo identificable con UNA interpretación razonable, clasifica como "busqueda_local" usando lo que ves en la imagen — no dejes al vecino esperando cuando la foto ya resuelve la ambigüedad.
- Si la imagen muestra contenido inapropiado (armas, drogas, sexo explícito, etc.) aunque el texto no lo sugiera, clasifica igual como "inapropiada".
- Nunca inventes detalles que no se vean claramente en la imagen.`;

/**
 * Descarga una imagen pública de R2 y la devuelve en base64 lista para
 * `inlineData`. Devuelve `null` si falla cualquier paso (URL caída, timeout,
 * tipo no soportado) — el caller cae a interpretar solo con texto, nunca
 * rompe el flujo por una imagen inaccesible.
 */
async function descargarImagenComoBase64(
    url: string,
): Promise<{ data: string; mimeType: string } | null> {
    try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) return null;
        const contentType = respuesta.headers.get('content-type') ?? 'image/webp';
        if (!contentType.startsWith('image/')) return null;
        const buffer = Buffer.from(await respuesta.arrayBuffer());
        return { data: buffer.toString('base64'), mimeType: contentType };
    } catch (error) {
        console.warn('Coyo IA — no se pudo descargar la imagen adjunta:', error);
        return null;
    }
}

/**
 * Clasifica la pregunta del vecino y extrae términos buscables. Si el vecino
 * adjuntó una foto (`imagenUrl`), Gemini la analiza junto con el texto
 * (multimodal) para afinar la interpretación — ver {@link INSTRUCCION_IMAGEN}.
 *
 * @example
 *   const r = await interpretarPregunta("¿Hay plomeros que vengan hoy?");
 *   if (r.disponible) {
 *     console.log(r.data.esBusquedaLocal, r.data.terminos);
 *   }
 */
export async function interpretarPregunta(
    texto: string,
    imagenUrl?: string | null,
): Promise<RespuestaIA<PreguntaInterpretada>> {
    const cliente = obtenerCliente();
    if (cliente === null) return { disponible: false, razon: 'sin_api_key' };

    // Inyectar las categorías REALES del catálogo de AnunciaYA al prompt.
    // Cacheado en memoria 1h (no consulta BD en cada pregunta). Si falla la
    // carga o el catálogo está vacío, formatearCatalogoParaPrompt devuelve
    // cadena vacía y el prompt funciona sin esa sección (Gemini cae a sus
    // reglas internas). Ver `categoriasCatalogo.service.ts`.
    const [catalogo, catalogoMP] = await Promise.all([
        obtenerCatalogoCategorias(),
        obtenerCatalogoMarketplace(),
    ]);
    const catalogoTexto = formatearCatalogoParaPrompt(catalogo);
    const catalogoMPTexto = formatearCatalogoMarketplaceParaPrompt(catalogoMP);

    let promptCompleto = PROMPT_INTERPRETAR;
    if (catalogoTexto) {
        promptCompleto += `\n\nCATÁLOGO DE CATEGORÍAS DE NEGOCIOS (giros REALES de los negocios locales — úsalas como CATEGORÍA PRINCIPAL en \`terminos\` cuando el vecino busque un dominio amplio de negocio, servicio o comida):\n\n${catalogoTexto}`;
    }
    if (catalogoMPTexto) {
        promptCompleto += `\n\nCATÁLOGO DE CATEGORÍAS DE MARKETPLACE (categorías de PRODUCTOS que los vecinos compran y venden entre sí — úsalas en \`terminos\` cuando la pregunta sea COMPRAR o VENDER una cosa/producto físico, sea busca_oferta o busca_demanda):\n\n${catalogoMPTexto}`;
    }
    if (catalogoTexto || catalogoMPTexto) {
        promptCompleto += `\n\nIMPORTANTE: cuando incluyas una CATEGORÍA o SUBCATEGORÍA de cualquiera de los dos catálogos, úsala EXACTAMENTE COMO APARECE (con la inicial en mayúscula). Así el buscador la matchea correctamente.`;
    }

    // Si el vecino adjuntó foto, intenta descargarla para mandarla inline a
    // Gemini (multimodal). Si falla la descarga, sigue solo con texto — la
    // imagen es un plus, nunca un bloqueante.
    const imagen = imagenUrl ? await descargarImagenComoBase64(imagenUrl) : null;
    if (imagen) {
        promptCompleto += INSTRUCCION_IMAGEN;
    }

    const textoPrompt = `${promptCompleto}\n\nPregunta del vecino:\n${texto}`;
    const contents: ContenidoGemini = imagen
        ? [
              {
                  role: 'user',
                  parts: [
                      { text: textoPrompt },
                      { inlineData: { mimeType: imagen.mimeType, data: imagen.data } },
                  ],
              },
          ]
        : textoPrompt;

    const respuesta = await llamarGeminiConReintento(cliente, contents);
    if (respuesta === null) {
        console.warn(
            'Coyo IA — interpretarPregunta agotó reintentos y fallback de Gemini',
        );
        return { disponible: false, razon: 'error_gemini' };
    }
    const textoRespuesta = respuesta.texto;

    try {
        const limpio = limpiarJsonDeGemini(textoRespuesta);
        const parseado: unknown = JSON.parse(limpio);
        if (esPreguntaInterpretada(parseado)) {
            const raw = parseado as { intencion?: unknown; esEmpleo?: unknown };
            const intencion = normalizarIntencion(raw.intencion);
            const esEmpleo = normalizarEmpleo(raw.esEmpleo);
            return { disponible: true, data: { ...parseado, intencion, esEmpleo } };
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
    intencion: IntencionPregunta = 'busca_oferta',
    esEmpleo = false,
): Promise<RespuestaIA<string>> {
    const cliente = obtenerCliente();
    if (cliente === null) return { disponible: false, razon: 'sin_api_key' };

    const datosJson = JSON.stringify(resultados, null, 2);

    // El tono cambia según quién es el vecino: quien busca empleo (esEmpleo),
    // comprador (busca_oferta) o oferente/vendedor (busca_demanda).
    const contextoIntencion = esEmpleo
        ? `CONTEXTO CLAVE — el vecino busca EMPLEO / TRABAJO. Los resultados (en el grupo "servicios") son VACANTES publicadas por empresas de la ciudad. Preséntalas como oportunidades de trabajo: "encontré estas vacantes", "hay una vacante de X". Menciona el puesto. NUNCA hables de "comprar" ni "contratar" — el vecino quiere emplearse.`
        : intencion === 'busca_demanda'
            ? `CONTEXTO CLAVE — el vecino NO está comprando: está OFRECIENDO o VENDIENDO algo y busca QUIÉN LO NECESITA o LO COMPRA. Los resultados son publicaciones de OTROS vecinos que andan BUSCANDO justo eso (demanda). Preséntalos como OPORTUNIDADES: "mira, encontré vecinos que andan buscando eso", "estos podrían estar interesados en lo tuyo". NUNCA le digas que compre o contrate — es ÉL quien ofrece.`
            : `CONTEXTO — el vecino busca ENCONTRAR, COMPRAR o CONTRATAR algo. Los resultados son opciones que le sirven. Preséntaselos como recomendaciones para lo que busca.`;

    const prompt = `${PERSONALIDAD_COYO}

Pregunta del vecino:
${pregunta}

${contextoIntencion}

Resultados reales encontrados en tu ciudad (JSON):
${datosJson}

Escribe la respuesta de Coyo en español, breve (1-2 frases), cálida y mexicana sin exagerar. NO uses las palabras "pueblo" ni "catálogo" — habla de "tu ciudad" o "la ciudad".

CASO A — Si hay AL MENOS UN item en CUALQUIERA de los 4 grupos del JSON (negocios/ofertas/marketplace/servicios): estás OBLIGADO a mencionarlo, SIEMPRE — sin excepción, incluso si el match no es perfecto o exacto para lo que preguntó (ej. si preguntó por un plomero y el único resultado es un negocio de climas que también podría ayudarle, menciónalo como la opción más cercana que encontraste — nunca lo omitas ni digas "no encontré nada" habiendo un item en el JSON). SOLO menciona resultados que estén en el JSON, nunca inventes otros. Si hay datos ricos (rating, totalResenas, verificado, estaAbierto, condicion, aceptaOfertas, negocioRating, diasParaVencer), úsalos cuando aporten valor.

CASO B — Si y SOLO SI TODOS los 4 grupos vienen vacíos (cero items en total, revisa el JSON con cuidado antes de asumir esto): dilo con honestidad y calidez, sin inventar nada. Reconoce que esta vez no encontraste eso en tu ciudad, e invita al vecino a dejar su pregunta para que la comunidad pueda responderle. Mantén el tono cálido y vecinal — no es un error, es información honesta. NUNCA uses este caso si el JSON tiene aunque sea un solo item — eso sería mentirle al vecino en su cara mientras la tarjeta del resultado se muestra justo debajo de tu mensaje.

RESPONDE SOLO con el texto de Coyo, SIN comillas envolventes, SIN bloques markdown, SIN encabezados, SIN explicaciones.`;

    const respuesta = await llamarGeminiConReintento(cliente, prompt);
    if (respuesta === null) {
        console.warn(
            'Coyo IA — redactarRespuestaCoyo agotó reintentos y fallback de Gemini',
        );
        return { disponible: false, razon: 'error_gemini' };
    }
    const texto = respuesta.texto.trim();
    if (texto.length === 0) {
        console.warn(
            'Coyo IA — redactarRespuestaCoyo: Gemini devolvió texto vacío',
        );
        return { disponible: false, razon: 'error_parseo' };
    }
    return { disponible: true, data: texto };
}

// =============================================================================
// FUNCIÓN 3 — interpretarPeticionAsistente (FAB global — Fase 1)
// =============================================================================
//
// A diferencia de interpretarPregunta (solo lectura, siempre busca), esta
// función decide entre EJECUTAR una capacidad del catálogo (function calling
// de Gemini) o hacer una PREGUNTA DE ACLARACIÓN en texto plano cuando falta
// un dato obligatorio. Nunca inventa parámetros que el usuario no dio.

/** Un turno de la conversación ya mostrado en el panel — se manda como contexto para que Gemini recuerde datos de turnos anteriores (ej. "vendo mi bici" → "800 pesos"). */
export interface TurnoChatAsistente {
    rol: 'usuario' | 'coyo';
    texto: string;
}

export interface ContextoAppAsistente {
    /** Ruta actual del usuario en la app (ej. "/marketplace"). */
    rutaActual: string;
    /** true si el usuario está navegando en modo comercial (Business Studio). */
    modoComercial?: boolean;
}

/** Resultado de interpretar una petición: o Gemini decide EJECUTAR una capacidad, o hace una PREGUNTA porque falta un dato obligatorio. */
export type ResultadoAsistente =
    | {
          tipo: 'accion';
          capacidad: string;
          parametros: Record<string, unknown>;
          /** Texto que Gemini haya generado junto con la llamada a función (ej. explicando cómo usar lo que va a abrir). `undefined` si no generó nada. */
          mensaje?: string;
      }
    | { tipo: 'pregunta'; texto: string };

// Base de conocimiento de AnunciaYA (qué es y cómo funciona cada sección) —
// vive en su propio archivo, ver `conocimientoAnunciaYA.ts` (incluye la nota
// de que hay que resincronizarla a mano si cambian reglas de negocio reales).

const PROMPT_ASISTENTE_ACCIONES = `Además de responder, ahora también puedes EJECUTAR acciones dentro de la app llamando a una de las funciones disponibles.

MODO CONSULTOR — REGLA DE ORO: cuando el usuario quiera algo que requiere varios datos (ej. crear una publicación), nunca lo satures pidiéndolos todos juntos ni le des un manual técnico. Entrevístalo amigablemente, UNA pregunta concisa a la vez — la siguiente pregunta depende de lo que acaba de responder. Si se traba o dice "no sé", explícaselo con un ejemplo cotidiano antes de repetir la pregunta, no con jerga de la app.

CONTEXTO Y AMBIGÜEDAD (muy importante, error real ya visto): AnunciaYA tiene varios términos que suenan parecido pero son cosas DISTINTAS (ej. "Publicaciones" el módulo de Business Studio donde el NEGOCIO postea anuncios propios, vs "Mis Publicaciones" la sección personal con tus artículos de MarketPlace/Servicios — son cosas diferentes aunque el nombre se parezca). Antes de responder una pregunta de "qué es"/"qué hay en X":
1. Usa el turno INMEDIATO ANTERIOR como pista fuerte — si el usuario acaba de preguntar sobre Business Studio y su siguiente mensaje menciona un término que también existe como módulo de BS (ej. preguntó "qué hay en Publicaciones" justo después de que mencionaste el módulo Publicaciones), lo más probable es que siga hablando de ESO, aunque diga el nombre no exacto.
2. Si tras considerar el contexto SIGUE habiendo una ambigüedad real (dos interpretaciones distintas y ambas plausibles, con respuestas DIFERENTES), NO seleccione una al azar y respondas — pregunta primero cuál de las dos quiere, mencionando ambas opciones concretas (ej. "¿Te refieres al módulo Publicaciones de Business Studio que te acabo de mencionar, o a tu Mis Publicaciones personal de MarketPlace/Servicios?"). Es preferible una pregunta corta a una respuesta segura pero equivocada.
3. Si el contexto deja claro cuál es SIN ambigüedad real, responde directo con esa — no preguntes por preguntar cuando ya es obvio.

AL CREAR UNA PUBLICACIÓN (MarketPlace/Servicios), el MODO CONSULTOR también aplica a la CALIDAD y COMPLETITUD del borrador, no solo a los datos técnicamente obligatorios de la función:
- ORDEN: primero necesitas saber QUÉ es el artículo/servicio. Si el usuario todavía no lo dijo (ej. "quiero vender algo"), pregúntale SOLO eso — nunca preguntes precio, categoría ni nada más en ese mismo mensaje, sería prematuro sin saber qué es.
- Una vez que sabes qué es, la CATEGORÍA (MarketPlace) casi siempre la puedes deducir tú mismo sin preguntar — es obligatoria en AMBOS modos, "vendo" Y "busco" (ej. "mi iPhone 12" / "busco un iPhone" → Electrónica, "mi sofá" / "ando buscando un sofá" → Muebles, "mis tenis" → Ropa) — complétala en silencio, aunque no haya foto (en "busco" nunca la hay). Solo pregúntala si el artículo es genuinamente ambiguo (ej. "un aparato", "una cosa").
- El PRECIO (si modo="vendo") sí es obligatorio en la práctica — pregúntalo siempre que falte, el formulario no deja publicar sin él.
- Si además falta algún detalle para escribir una buena descripción (estado, marca, motivo de venta, o experiencia/zona/horario si es un servicio), pregúntalo también.
- Combina TODO lo que realmente haga falta preguntar (precio + algún detalle, ya sabiendo qué es) en la MENOR cantidad de preguntas posible — no hagas una pregunta por cada campo si puedes juntarlas en una sola frase natural. Si el usuario ya vino con todo en su primer mensaje, no le insistas con más preguntas — ejecuta directo.
- Con lo que te cuente (y lo que detectó el análisis de foto, si adjuntó una), redacta TÚ el título (corto, atractivo, mejor que una copia literal de sus palabras) y la descripción — en tono NATURAL y HABLADO, como si el vecino la platicara, NUNCA en viñetas ni lenguaje de catálogo. Junta ahí TODOS los datos reales que tengas (marca/color/componentes de la foto + lo que el usuario contó) para que quede completa, no una frase suelta — entre más detalle real haya, más rica debe quedar la descripción. ES UNA DESCRIPCIÓN DE VENTA, NO UNA DESCRIPCIÓN DE FOTO: describe el artículo como su dueño, nunca como quien narra una imagen — PROHIBIDO usar "se ve", "se ven", "se aprecia", "en la imagen/foto", "está servido/colocado en/sobre", ni mencionar el fondo/plato/mesa/tabla que aparezcan solo por la foto. Nunca inventes un dato que no venga de la foto ni de lo que el usuario dijo.

CUÁNDO EJECUTAR UNA FUNCIÓN: solo cuando tengas TODOS sus datos obligatorios y la petición claramente pide navegar a una sección de la cuenta, crear una publicación, o buscar algo REAL (negocio/oferta/artículo/servicio) ya publicado en la ciudad.

DUDAS DE "CÓMO HAGO X" (muy importante): si la duda del usuario es sobre CÓMO hacer/ver/cambiar algo (no solo "qué es") y ese "algo" corresponde a un destino de navegar_a_destino, LLAMA la función en vez de solo explicarlo en texto — así lo dejas directo en la pantalla donde puede hacerlo, no nada más se lo describas. Ej: "¿cómo cambio mi contraseña?" → navegar_a_destino(seguridad). Si la duda es solo conceptual ("¿qué es X?", "¿para qué sirve X?") y no hay una acción concreta que ejecutar, ahí sí respondes en texto con la información de AnunciaYA.

SIEMPRE QUE LLAMES UNA FUNCIÓN, ACOMPÁÑALA CON UN MENSAJE BREVE (muy importante, no lo omitas): además de la llamada a función, escribe 1-2 frases explicando qué acabas de hacer o CÓMO sigue el proceso desde ahí — usa las "DUDAS FRECUENTES" y el resto de la información de AnunciaYA de más abajo si aplica. Ej: si navegas a Mis Cupones porque preguntaron cómo canjear un cupón, no digas solo "listo, ahí te dejo" — di algo como "Ahí te dejo Mis Cupones: abre el cupón que quieres usar y toca 'revelar código' para mostrarlo en el negocio." Nunca dejes una acción sin explicación de qué sigue.

CUÁNDO RESPONDER EN TEXTO PLANO (sin llamar ninguna función):
1. Si falta un dato obligatorio para ejecutar una función — aplica el MODO CONSULTOR de arriba: pregunta JUSTO el siguiente dato que falta, breve y cálido, uno a la vez. Nunca inventes ni asumas un valor que el usuario no dio, y nunca preguntes por un dato que ya te dio en un turno anterior.
2. Si preguntan qué es, para qué sirve o cómo FUNCIONA (conceptualmente) algo de AnunciaYA (CardYA, ScanYA, ChatYA, puntos, cupones, Business Studio, membresía, etc.), o cualquier duda frecuente de la lista de abajo — respóndelo directo con la información de AnunciaYA de más abajo. Esto NO es una búsqueda de negocios ni requiere función.
3. Si piden algo que de verdad no puedes hacer — dilo con honestidad, sin prometer algo que no existe. Sí puedes dejar listos título, descripción, categoría y precio/presupuesto en el borrador de MarketPlace o Servicios, y SÍ puedes incluir una foto si el usuario la adjuntó con el botón de cámara del chat (ver la nota de FOTOS en la función de crear publicación) — pero nunca prometas agregar una foto que no adjuntó ahí. Si de plano no sabes ayudar con algo, dilo con calidez e invita a preguntar otra cosa.
4. REGLA DE ORO — NUNCA afirmes que navegaste, abriste o "dejaste" al usuario en algún lugar si no llamaste una función de navegación real (navegar_a_destino / navegar_a_perfil_negocio) EN ESE MISMO turno. Frases como "ya te dejé en...", "te llevo a...", "ábrelo aquí" sin una llamada a función real son una MENTIRA — el usuario se queda exactamente donde estaba y se da cuenta. Si te piden "llévame/ábreme ESE anuncio/negocio/servicio" refiriéndose a un resultado que ya mostraste con buscar_informacion, NO existe una función para abrir un resultado específico — dile que puede tocar/hacer click directo en la tarjeta del resultado que le mostraste arriba (ya son clicables), no repitas la búsqueda ni finjas haberlo abierto.

Usa la conversación reciente como contexto: si en un turno anterior el usuario ya dio un dato (ej. "vendo mi bicicleta") y en el turno actual solo completa lo que faltaba (ej. "800 pesos"), combina ambos turnos para decidir si ya puedes ejecutar la función.

${CONOCIMIENTO_ANUNCIAYA}`;

/**
 * Convierte el catálogo de capacidades (`services/asistente/capacidades.ts`,
 * agnóstico de proveedor de IA) al shape `FunctionDeclaration` que espera
 * `@google/genai`. Esta es la ÚNICA función que traduce entre ambos — el
 * catálogo en sí no conoce el SDK de Gemini.
 */
function capacidadesComoFunctionDeclarations(
    capacidades: Capacidad[],
): FunctionDeclaration[] {
    return capacidades.map((cap) => ({
        name: cap.nombre,
        description: cap.descripcion,
        parametersJsonSchema: {
            type: 'object',
            properties: Object.fromEntries(
                cap.parametros.map((p) => [
                    p.nombre,
                    {
                        type: p.tipo,
                        description: p.descripcion,
                        ...(p.enumValues ? { enum: p.enumValues } : {}),
                    },
                ]),
            ),
            required: cap.parametros.filter((p) => p.obligatorio).map((p) => p.nombre),
        },
    }));
}

/**
 * Interpreta un turno del Asistente Coyo (FAB global): texto y/o audio, con
 * el historial reciente del chat como contexto. Devuelve o una acción a
 * ejecutar (capacidad + parámetros) o una pregunta de aclaración en texto.
 *
 * @example
 *   const r = await interpretarPeticionAsistente(
 *     { texto: 'quiero vender mi bicicleta en 800' },
 *     [],
 *     { rutaActual: '/marketplace' },
 *   );
 *   if (r.disponible && r.data.tipo === 'accion') { ... }
 */
export async function interpretarPeticionAsistente(
    turnoActual: { texto?: string; audioBase64?: string; audioMimeType?: string },
    historialReciente: TurnoChatAsistente[],
    contextoApp: ContextoAppAsistente,
): Promise<RespuestaIA<ResultadoAsistente>> {
    const cliente = obtenerCliente();
    if (cliente === null) return { disponible: false, razon: 'sin_api_key' };

    let promptTexto = `${PERSONALIDAD_COYO}\n\n${PROMPT_ASISTENTE_ACCIONES}\n\nContexto: el usuario está en la ruta "${contextoApp.rutaActual}"${contextoApp.modoComercial ? ', en modo comercial (Business Studio)' : ''}.`;

    if (historialReciente.length > 0) {
        const historialTexto = historialReciente
            .map((t) => `${t.rol === 'usuario' ? 'Usuario' : 'Coyo'}: ${t.texto}`)
            .join('\n');
        promptTexto += `\n\nConversación reciente:\n${historialTexto}`;
    }

    if (turnoActual.texto) {
        promptTexto += `\n\nUsuario: ${turnoActual.texto}`;
    } else if (turnoActual.audioBase64) {
        promptTexto += `\n\nEl usuario mandó un mensaje de VOZ (adjunto). Escúchalo y responde según su contenido.`;
    }

    const parts: Part[] = [{ text: promptTexto }];
    if (turnoActual.audioBase64 && turnoActual.audioMimeType) {
        parts.push({
            inlineData: { mimeType: turnoActual.audioMimeType, data: turnoActual.audioBase64 },
        });
    }

    const contents: ContenidoGemini = [{ role: 'user', parts }];

    const respuesta = await llamarGeminiConReintento(cliente, contents, {
        tools: [{ functionDeclarations: capacidadesComoFunctionDeclarations(CAPACIDADES_ASISTENTE) }],
        toolConfig: { functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO } },
    });

    if (respuesta === null) {
        console.warn('Coyo IA — interpretarPeticionAsistente agotó reintentos y fallback de Gemini');
        return { disponible: false, razon: 'error_gemini' };
    }

    const llamada = respuesta.functionCalls?.[0];
    if (llamada && llamada.name) {
        const capacidadValida = CAPACIDADES_ASISTENTE.some((c) => c.nombre === llamada.name);
        if (!capacidadValida) {
            console.warn('Coyo IA — interpretarPeticionAsistente: Gemini llamó una capacidad desconocida', llamada.name);
            return { disponible: false, razon: 'error_parseo' };
        }
        const mensaje = respuesta.texto.trim();
        return {
            disponible: true,
            data: {
                tipo: 'accion',
                capacidad: llamada.name,
                parametros: llamada.args ?? {},
                ...(mensaje ? { mensaje } : {}),
            },
        };
    }

    const texto = respuesta.texto.trim();
    if (texto.length === 0) {
        console.warn('Coyo IA — interpretarPeticionAsistente: Gemini no llamó función ni devolvió texto');
        return { disponible: false, razon: 'error_parseo' };
    }
    return { disponible: true, data: { tipo: 'pregunta', texto } };
}

// =============================================================================
// FUNCIÓN 4 — sugerirDatosArticulo (MarketPlace)
// =============================================================================
//
// Analiza la foto de un artículo de MarketPlace y sugiere título, descripción
// y condición basándose SOLO en lo visible en la imagen. Disparado por un
// botón EXPLÍCITO del usuario en el composer — nunca automático — así que no
// hay guard de cancelación por desmontaje ni riesgo de pisar texto: el
// caller decide si aplica el resultado.

/**
 * Condición sugerida — mismos 4 valores que `campoCondicion` del schema de
 * MarketPlace, o `null` cuando el desgaste no se distingue con confianza en
 * la foto.
 */
export type CondicionSugerida = 'nuevo' | 'seminuevo' | 'usado' | 'para_reparar' | null;

export interface ArticuloSugerido {
    titulo: string;
    descripcion: string;
    condicion: CondicionSugerida;
    /** ID de `categorias_marketplace`, resuelto por nombre — `null` si Gemini no distingue una categoría clara en la foto. */
    categoriaId: number | null;
}

const PROMPT_SUGERIR_ARTICULO = `Vas a escribir una publicación de venta para AnunciaYA (app de comercio local). Te paso la foto de un artículo SOLO como referencia para saber qué es y cómo es — pero tu trabajo NO es describir la foto, es escribir la publicación como si TÚ fueras el vecino dueño del artículo, describiéndoselo a un comprador.

DIFERENCIA CLAVE (no te la saltes): una descripción de FOTOGRAFÍA habla de la imagen — dice "se ve", "se aprecia", "aparece", "está servido/colocado sobre..." — como si describieras una pintura. Una descripción de VENTA habla del ARTÍCULO como un hecho — dice qué es, de qué está hecho, qué incluye — sin mencionar en ningún momento que hay una foto, una imagen, un fondo, un plato, una mesa o una tabla usados solo para la toma. Escribe SIEMPRE en el segundo modo. Ejemplo de lo que NUNCA debes escribir: "Se ven dos tortas servidas en una tabla de madera" (describe la foto). Ejemplo de lo que SÍ debes escribir: "Torta de bistec con guacamole, lechuga, jitomate y cebolla en pan bolillo, con queso blanco desmoronado — incluye 2 piezas" (describe el producto).

PROHIBIDAS en cualquier parte del texto (no solo al inicio) las palabras/frases: "se ve", "se ven", "se aprecia", "se observa", "se nota", "aparece", "en la imagen", "en la foto", "la foto muestra", "está servido/a en", "está colocado/a sobre", o cualquier mención al fondo, plato, tabla, mesa o superficie usados para tomar la foto (a menos que ese objeto sea literalmente parte de lo que se vende, ej. vender la tabla de madera misma).

ESCRIBE EN ESPAÑOL DE MÉXICO, tono natural y directo — como un vecino describiendo lo que vende, NO como un catálogo o anuncio publicitario. NUNCA uses adjetivos vendedores ni de relleno ("excelente", "hermoso", "increíble", "de gran calidad", "imperdible").

PROHIBIDO INVENTAR — si algo no se distingue con claridad en la foto, OMÍTELO, no lo adivines:
- NO infieras marca ni modelo si no hay logo o etiqueta visible y legible.
- NO inventes medidas, capacidad, año ni talla si no están indicados visualmente (ej. una etiqueta legible).
- NO afirmes que algo "funciona bien" ni describas su estado FUNCIONAL — eso no se puede saber de una foto.
- Describe solo lo observable del ARTÍCULO EN SÍ: tipo de objeto, color, material aparente, cantidad, ingredientes/componentes visibles — nunca del entorno o la puesta en escena de la foto.

TÍTULO: mínimo 10 y máximo 80 caracteres. Directo, ej. "Bicicleta de montaña rodada 26" — sin precio, sin emojis, sin signos de exclamación.

DESCRIPCIÓN: mínimo 20 y máximo 500 caracteres, SIN emojis, SIN viñetas ni guiones ni saltos de línea — texto corrido de 2-4 frases naturales, en tono HABLADO, como si el vecino la estuviera platicando para vender el artículo. Escribe las características concretas del artículo (color, material, tamaño aparente, cantidad, componentes) tejidas en oraciones normales, no como lista. Si la foto da poco detalle, escribe menos pero que siga sonando natural — nunca rellenes con generalidades vacías ni inventes para alargarla.

CONDICIÓN: elige UNA de estas 4 opciones basándote SOLO en el desgaste FÍSICO VISIBLE en la foto (nunca en si funciona o no): "nuevo" (se ve sin uso, con empaque o etiquetas), "seminuevo" (uso mínimo, sin desgaste visible notorio), "usado" (desgaste visible normal), "para_reparar" (daño o rotura visible). Si la foto no permite distinguir el desgaste con confianza, responde null — mejor omitir que adivinar.

CATEGORÍA: elige la categoría que mejor describa el artículo, ÚNICAMENTE de la lista real que se te da más abajo en "CATEGORÍAS DISPONIBLES". Responde el nombre EXACTO tal cual aparece en la lista en el campo "categoriaNombre". Si ninguna categoría de la lista corresponde con confianza, responde null — nunca inventes una categoría que no esté en la lista.

RESPONDE SOLO con JSON válido, SIN texto extra, SIN bloques markdown, SIN explicaciones. El JSON debe tener exactamente esta forma:
{"titulo": "...", "descripcion": "...", "condicion": "nuevo"|"seminuevo"|"usado"|"para_reparar"|null, "categoriaNombre": "..."|null}`;

/**
 * Analiza la foto de un artículo (ya subida a R2, URL pública) y sugiere
 * título, descripción y condición. Disparado por un botón explícito del
 * usuario en el composer de MarketPlace — ver `ComposerMarketplace.tsx`.
 *
 * @example
 *   const r = await sugerirDatosArticulo('https://...r2.../marketplace/foo.webp');
 *   if (r.disponible) console.log(r.data.titulo, r.data.descripcion, r.data.condicion);
 */
export async function sugerirDatosArticulo(
    imagenUrl: string,
): Promise<RespuestaIA<ArticuloSugerido>> {
    const cliente = obtenerCliente();
    if (cliente === null) return { disponible: false, razon: 'sin_api_key' };

    const [imagen, categorias] = await Promise.all([
        descargarImagenComoBase64(imagenUrl),
        obtenerCategoriasMarketplace(),
    ]);
    if (imagen === null) {
        console.warn(
            'Coyo IA — sugerirDatosArticulo: no se pudo descargar la imagen',
            imagenUrl,
        );
        return { disponible: false, razon: 'error_gemini' };
    }

    let promptCompleto = PROMPT_SUGERIR_ARTICULO;
    if (categorias.length > 0) {
        promptCompleto += `\n\nCATEGORÍAS DISPONIBLES:\n${categorias.map((c) => `- ${c.nombre}`).join('\n')}`;
    }

    const contents: ContenidoGemini = [
        {
            role: 'user',
            parts: [
                { text: promptCompleto },
                { inlineData: { mimeType: imagen.mimeType, data: imagen.data } },
            ],
        },
    ];

    const respuesta = await llamarGeminiConReintento(cliente, contents);
    if (respuesta === null) {
        console.warn(
            'Coyo IA — sugerirDatosArticulo agotó reintentos y fallback de Gemini',
        );
        return { disponible: false, razon: 'error_gemini' };
    }

    try {
        const limpio = limpiarJsonDeGemini(respuesta.texto);
        const parseado: unknown = JSON.parse(limpio);
        if (esArticuloSugeridoCrudo(parseado)) {
            const categoriaEncontrada = categorias.find(
                (c) => c.nombre === parseado.categoriaNombre,
            );
            return {
                disponible: true,
                data: {
                    titulo: parseado.titulo,
                    descripcion: parseado.descripcion,
                    condicion: parseado.condicion,
                    categoriaId: categoriaEncontrada?.id ?? null,
                },
            };
        }
        console.warn(
            'Coyo IA — sugerirDatosArticulo: JSON con shape inválido',
            respuesta.texto,
        );
        return { disponible: false, razon: 'error_parseo' };
    } catch (error) {
        console.warn(
            'Coyo IA — sugerirDatosArticulo: respuesta no es JSON parseable',
            { texto: respuesta.texto, error },
        );
        return { disponible: false, razon: 'error_parseo' };
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
function esPreguntaInterpretada(
    v: unknown,
): v is Omit<PreguntaInterpretada, 'intencion' | 'esEmpleo'> {
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

const CONDICIONES_SUGERIDAS_VALIDAS = new Set([
    'nuevo',
    'seminuevo',
    'usado',
    'para_reparar',
]);

/** Shape crudo que devuelve Gemini para `sugerirDatosArticulo`, antes de resolver `categoriaNombre` → `categoriaId`. */
type ArticuloSugeridoCrudo = Omit<ArticuloSugerido, 'categoriaId'> & { categoriaNombre: string | null };

/**
 * Type guard defensivo para la respuesta de `sugerirDatosArticulo` — protege
 * contra Gemini devolviendo un JSON con otro shape o una `condicion` fuera
 * del enum esperado.
 */
function esArticuloSugeridoCrudo(v: unknown): v is ArticuloSugeridoCrudo {
    if (typeof v !== 'object' || v === null) return false;
    const obj = v as Record<string, unknown>;
    if (typeof obj.titulo !== 'string' || typeof obj.descripcion !== 'string') {
        return false;
    }
    if (
        obj.condicion !== null &&
        !(typeof obj.condicion === 'string' && CONDICIONES_SUGERIDAS_VALIDAS.has(obj.condicion))
    ) {
        return false;
    }
    if (obj.categoriaNombre !== null && typeof obj.categoriaNombre !== 'string') {
        return false;
    }
    return true;
}

/**
 * Normaliza el campo `intencion` que devuelve Gemini: cualquier valor que no
 * sea exactamente `'busca_demanda'` cae a `'busca_oferta'` (default seguro —
 * es el caso mayoritario y no cambia el comportamiento histórico de Coyo).
 */
function normalizarIntencion(v: unknown): IntencionPregunta {
    return v === 'busca_demanda' ? 'busca_demanda' : 'busca_oferta';
}

/** Normaliza `esEmpleo`: solo `true` cuando Gemini lo dice explícitamente. */
function normalizarEmpleo(v: unknown): boolean {
    return v === true;
}
