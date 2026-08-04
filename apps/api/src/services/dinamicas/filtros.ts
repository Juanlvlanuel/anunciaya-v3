/**
 * filtros.ts
 * ===========
 * Moderación autónoma de Dinámicas — copia REDUCIDA de
 * `services/marketplace/filtros.ts`: mismo motor de detección (normalización
 * + regex con boundary robusto), pero con solo 3 de las 5 categorías
 * originales. `rifa` y `subasta` se excluyen a propósito — "rifa", "sorteo",
 * "boleto", "cachito", "tómbola" son vocabulario NORMAL de este módulo, no
 * contenido a bloquear.
 *
 * A diferencia del original, las 3 categorías que quedan (`esquema`,
 * `adultos`, `ilegal`) eran YA rechazo duro sin excepción en MarketPlace —
 * no existe una "sugerencia suave" para ninguna de ellas. Por eso este
 * archivo no tiene `detectarServicio`/`detectarBusqueda` ni el concepto de
 * `severidad`: si `detectarPalabraProhibida` encuentra algo, siempre es
 * rechazo (422); si no, el texto es válido.
 *
 * Ubicación: apps/api/src/services/dinamicas/filtros.ts
 */

// =============================================================================
// TIPOS
// =============================================================================

export type CategoriaProhibidaDinamica = 'esquema' | 'adultos' | 'ilegal';

export interface ResultadoValidacionDinamica {
    valido: boolean;
    categoria?: CategoriaProhibidaDinamica;
    mensaje: string;
    palabraDetectada?: string;
}

// =============================================================================
// LISTA NEGRA — idéntica a marketplace/filtros.ts en estas 3 categorías
// =============================================================================

export const PALABRAS_PROHIBIDAS_DINAMICA: Record<CategoriaProhibidaDinamica, string[]> = {
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
        'sexual', 'porno', 'pornografia', 'erotica', 'erotico',
        'escort', 'escorts',
    ],
    ilegal: [
        'arma', 'armas', 'pistola', 'revolver', 'municiones',
        'droga', 'drogas', 'cocaina', 'marihuana', 'peyote',
        'animales exoticos', 'tigre', 'tortuga marina', 'coral',
    ],
};

const MENSAJES_RECHAZO: Record<CategoriaProhibidaDinamica, string> = {
    esquema: 'No puedes usar Dinámicas para promover esquemas multinivel, criptomonedas ni inversiones.',
    adultos: 'El contenido para adultos no está permitido en AnunciaYA.',
    ilegal: 'No puedes crear una Dinámica con premios o contenido prohibidos por la ley en AnunciaYA.',
};

// =============================================================================
// HELPERS DE NORMALIZACIÓN — idénticos a marketplace/filtros.ts
// =============================================================================

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

function normalizar(texto: string): string {
    const resultado = texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    let mapeado = '';
    for (const ch of resultado) {
        mapeado += SUSTITUCIONES_LEET[ch] ?? ch;
    }
    return mapeado;
}

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

export function detectarPalabraProhibidaDinamica(texto: string): {
    categoria: CategoriaProhibidaDinamica;
    palabra: string;
} | null {
    const textoNormalizado = normalizar(texto);

    for (const [categoria, palabras] of Object.entries(PALABRAS_PROHIBIDAS_DINAMICA) as Array<
        [CategoriaProhibidaDinamica, string[]]
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

/** Corre el filtro sobre `${titulo} ${descripcion}`. Sin "sugerencia suave":
 *  o el texto está limpio, o es rechazo duro. */
export function validarTextoDinamica(titulo: string, descripcion: string): ResultadoValidacionDinamica {
    const textoCompleto = `${titulo} ${descripcion}`;
    const prohibida = detectarPalabraProhibidaDinamica(textoCompleto);

    if (prohibida) {
        return {
            valido: false,
            categoria: prohibida.categoria,
            mensaje: MENSAJES_RECHAZO[prohibida.categoria],
            palabraDetectada: prohibida.palabra,
        };
    }

    return { valido: true, mensaje: '' };
}
