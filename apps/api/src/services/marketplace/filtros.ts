/**
 * filtros.ts
 * ===========
 * Capa 1 de Moderación Autónoma del MarketPlace.
 *
 * AnunciaYA es operada por una sola persona. La moderación NO puede ser
 * humana — debe ser 100% automática y barata. Este archivo implementa los
 * filtros del wizard / endpoints de creación y edición:
 *
 *   1.2 Palabras prohibidas → RECHAZO DURO (HTTP 422)
 *       categorías: rifas, subastas, esquemas multinivel/cripto, adultos, ilegal
 *
 *   1.3 Detección de servicios → SUGERENCIA SUAVE
 *       el wizard sugiere ir a /servicios pero permite continuar
 *
 *   1.4 Detección de búsquedas → SUGERENCIA SUAVE
 *       el wizard sugiere ir a "Pregúntale a [ciudad]" del Home
 *
 * Diseño:
 *  - Lista negra inline en código (NO en BD). Crece con commits + deploy.
 *  - Match case-insensitive, ignora acentos (NFD), por palabra completa con \b.
 *  - Sin dependencias externas — solo regex.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§7 Moderación Autónoma)
 * Sprint:      docs/prompts Marketplace/Sprint-4-Wizard-Publicar.md
 *
 * Ubicación: apps/api/src/services/marketplace/filtros.ts
 */

// =============================================================================
// TIPOS
// =============================================================================

export type CategoriaProhibida =
    | 'rifa'
    | 'subasta'
    | 'esquema'
    | 'adultos'
    | 'ilegal';

export type CategoriaSugerencia = 'servicio' | 'busqueda';

export type Severidad = 'rechazo' | 'sugerencia';

export interface ResultadoValidacion {
    valido: boolean;
    severidad: Severidad;
    categoria?: CategoriaProhibida | CategoriaSugerencia;
    mensaje: string;
    palabraDetectada?: string;
}

// =============================================================================
// LISTA NEGRA — PALABRAS PROHIBIDAS
// =============================================================================

/**
 * Diccionario de palabras prohibidas por categoría. Las palabras se comparan
 * sin acentos y en minúsculas. Para que la detección sea por palabra completa
 * usamos `\b` al construir la regex.
 *
 * Para frases compuestas con espacio (ej. "mejor postor", "network marketing")
 * el `\b` también funciona porque el espacio es boundary natural.
 *
 * Para agregar palabras: editar este archivo, commit, deploy. No requiere
 * migración de BD.
 */
export const PALABRAS_PROHIBIDAS: Record<CategoriaProhibida, string[]> = {
    rifa: [
        'rifa', 'rifas', 'rifo', 'rifando',
        'sorteo', 'sorteos', 'sorteando',
        'boleto', 'boletos',
        'cachito', 'cachitos',
        'tombola',
    ],
    subasta: [
        'subasta', 'subastas', 'subastando',
        'mejor postor',
        'puja', 'pujar', 'pujas',
        'remate', 'remato',
    ],
    esquema: [
        'multinivel', 'multi nivel',
        'piramide',
        'network marketing',
        'cripto', 'bitcoin', 'ethereum', 'forex',
        'inversion garantizada',
        'gana dinero rapido',
        'gana desde casa',
    ],
    adultos: [
        // Lista mínima — el doc admite que se ampliará en operación
        'sexual', 'porno', 'pornografia', 'erotica', 'erotico',
        'escort', 'escorts',
    ],
    ilegal: [
        'arma', 'armas', 'pistola', 'revolver', 'municiones',
        'droga', 'drogas', 'cocaina', 'marihuana', 'peyote',
        'animales exoticos', 'tigre', 'tortuga marina', 'coral',
    ],
};

const MENSAJES_RECHAZO: Record<CategoriaProhibida, string> = {
    rifa: 'No puedes publicar rifas, sorteos ni venta de boletos en MarketPlace. Las rifas no están permitidas.',
    subasta: 'No puedes publicar subastas en MarketPlace. Establece un precio fijo y publica de nuevo.',
    esquema: 'MarketPlace no permite la promoción de esquemas multinivel, criptomonedas ni inversiones.',
    adultos: 'El contenido para adultos no está permitido en AnunciaYA.',
    ilegal: 'No puedes publicar artículos prohibidos por la ley en AnunciaYA.',
};

// =============================================================================
// PATRONES DE SUGERENCIA — SERVICIOS Y BÚSQUEDAS
// =============================================================================

const PATRONES_SERVICIO: RegExp[] = [
    /\bofrezco mis servicios\b/i,
    /\bdoy clases\b/i,
    /\bclases de\b/i,
    /\bservicio de (limpieza|plomeria|jardineria|cuidado|reparacion|instalacion)\b/i,
    /\bcobro \$?\d+ la hora\b/i,
    /\bcobro por hora\b/i,
    /\bdisponible para\b/i,
    /\bme dedico a\b/i,
    /\bsoy (plomero|jardinero|electricista|albañil|carpintero|pintor|niñera|enfermero|enfermera|chofer|mecanico)\b/i,
    /\bpresupuesto sin compromiso\b/i,
    /\bcotizo\b/i,
];

const PATRONES_BUSQUEDA: RegExp[] = [
    /\bbusco\b/i,
    /\bse busca\b/i,
    /\bnecesito (un|una|comprar)\b/i,
    /\bquiero comprar\b/i,
    /\bcompro\b/i,
    /\bquien tenga\b/i,
    /\balguien que venda\b/i,
];

// =============================================================================
// HELPERS DE NORMALIZACIÓN
// =============================================================================

/**
 * Sustituciones leetspeak / variantes comunes para evadir filtros.
 * Aplicadas en `normalizar()` antes de comparar.
 */
const SUSTITUCIONES_LEET: Record<string, string> = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '8': 'b',
    '9': 'g',
    '@': 'a',
    '$': 's',
    '€': 'e',
    '!': 'i',
    '|': 'i',
};

/**
 * Normalización agresiva: minúsculas + sin acentos + sustituciones leetspeak.
 * Hace match contra variantes como "s0rt30" → "sorteo", "r1f@" → "rifa".
 * El texto resultante NO se devuelve al usuario, solo se usa para comparar.
 */
function normalizar(texto: string): string {
    let resultado = texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    let mapeado = '';
    for (const ch of resultado) {
        mapeado += SUSTITUCIONES_LEET[ch] ?? ch;
    }
    return mapeado;
}

/**
 * Construye una regex que detecta una palabra prohibida permitiendo
 * separadores no-alfanuméricos entre las letras (ej: "r.i.f.a", "r i f a",
 * "r_i_f_a"). Los lookarounds `(?<![a-z0-9])` y `(?![a-z0-9])` actúan como
 * boundary robusto: NO matchea dentro de otras palabras (ej: "deriva" no
 * matchea "rifa", "soporte" no matchea "sorte").
 */
function construirRegex(palabra: string): RegExp {
    const letras = Array.from(palabra).map((c) =>
        c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const patron = letras
        .map((c) => (c === ' ' ? '[\\W_]+' : c))
        .join('[\\W_]*');
    return new RegExp(`(?<![a-z0-9])${patron}(?![a-z0-9])`, 'i');
}

// =============================================================================
// DETECCIÓN
// =============================================================================

/**
 * Busca cualquier palabra prohibida en el texto. Devuelve la primera categoría
 * y palabra detectadas, o null si todo está limpio.
 */
export function detectarPalabraProhibida(texto: string): {
    categoria: CategoriaProhibida;
    palabra: string;
} | null {
    const textoNormalizado = normalizar(texto);

    for (const [categoria, palabras] of Object.entries(PALABRAS_PROHIBIDAS) as Array<
        [CategoriaProhibida, string[]]
    >) {
        for (const palabra of palabras) {
            const regex = construirRegex(palabra);
            if (regex.test(textoNormalizado)) {
                return { categoria, palabra };
            }
        }
    }

    return null;
}

/**
 * Detecta patrones que sugieren un servicio en lugar de un objeto físico.
 * Devuelve true si encuentra alguno.
 */
export function detectarServicio(texto: string): boolean {
    const textoNormalizado = normalizar(texto);
    return PATRONES_SERVICIO.some((rx) => rx.test(textoNormalizado));
}

/**
 * Detecta patrones que sugieren una búsqueda ("busco X") en lugar de una
 * publicación de venta.
 */
export function detectarBusqueda(texto: string): boolean {
    const textoNormalizado = normalizar(texto);
    return PATRONES_BUSQUEDA.some((rx) => rx.test(textoNormalizado));
}

// =============================================================================
// VALIDACIÓN INTEGRAL
// =============================================================================

/**
 * Corre los 3 filtros sobre `${titulo} ${descripcion}` (título primero — donde
 * suele aparecer la palabra clave que define el ítem). Devuelve resultado
 * estructurado.
 *
 * Orden de prioridad:
 *   1. Palabras prohibidas → rechazo duro.
 *   2. Servicios disfrazados → sugerencia.
 *   3. Búsquedas → sugerencia.
 *   4. Texto limpio → válido sin observaciones.
 */
export function validarTextoPublicacion(
    titulo: string,
    descripcion: string
): ResultadoValidacion {
    const textoCompleto = `${titulo} ${descripcion}`;

    // 1. Rechazo duro
    const prohibida = detectarPalabraProhibida(textoCompleto);
    if (prohibida) {
        return {
            valido: false,
            severidad: 'rechazo',
            categoria: prohibida.categoria,
            mensaje: MENSAJES_RECHAZO[prohibida.categoria],
            palabraDetectada: prohibida.palabra,
        };
    }

    // 2. Sugerencia: servicio
    if (detectarServicio(textoCompleto)) {
        return {
            valido: false,
            severidad: 'sugerencia',
            categoria: 'servicio',
            mensaje:
                'Detectamos que tu publicación podría ser un servicio en lugar de un objeto. Los servicios deben publicarse en la sección Servicios.',
        };
    }

    // 3. Sugerencia: búsqueda
    if (detectarBusqueda(textoCompleto)) {
        return {
            valido: false,
            severidad: 'sugerencia',
            categoria: 'busqueda',
            mensaje:
                '¿Estás buscando algo en lugar de vender? Las búsquedas se publican en Pregúntale a tu ciudad en el Home, donde más personas pueden ayudarte.',
        };
    }

    // 4. Limpio
    return {
        valido: true,
        severidad: 'rechazo', // no aplica, pero el tipo lo exige
        mensaje: '',
    };
}
