/**
 * moderacionMarketplace.ts
 * =========================
 * Validación inline de palabras prohibidas para el wizard de publicar.
 *
 * Refleja la lista canónica del backend en
 * `apps/api/src/services/marketplace/filtros.ts` para detectar palabras
 * prohibidas mientras el usuario escribe — antes de llegar al submit final.
 *
 * IMPORTANTE: si se actualizan las palabras o mensajes en el backend, hay
 * que reflejar el cambio aquí también. La validación canónica sigue siendo
 * la del backend; este util es solo UX para no dejar avanzar al usuario.
 */

export type CategoriaProhibida =
    | 'rifa'
    | 'subasta'
    | 'esquema'
    | 'adultos'
    | 'ilegal';

const PALABRAS_PROHIBIDAS: Record<CategoriaProhibida, string[]> = {
    rifa: [
        'rifa', 'rifas', 'rifo', 'rifando', 'rife', 'rifen',
        'sorteo', 'sorteos', 'sorteando', 'sorte', 'sortes', 'sortear', 'sorteare',
        'boleto', 'boletos',
        'cachito', 'cachitos', 'cachit', 'cachitito',
        'tombola',
    ],
    subasta: [
        'subasta', 'subastas', 'subastando', 'subastar',
        'mejor postor',
        'puja', 'pujar', 'pujas',
        'remate', 'remato', 'rematando', 'rematar',
    ],
    esquema: [
        'multinivel', 'multi nivel',
        'piramide',
        'network marketing',
        'cripto', 'bitcoin', 'ethereum', 'forex',
        'inversion garantizada',
        'gana dinero rapido', 'gana din rapido',
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

const MENSAJES_RECHAZO: Record<CategoriaProhibida, string> = {
    rifa: 'No puedes publicar rifas, sorteos ni venta de boletos en MarketPlace.',
    subasta: 'No puedes publicar subastas. Establece un precio fijo.',
    esquema: 'MarketPlace no permite esquemas multinivel, criptomonedas ni inversiones.',
    adultos: 'El contenido para adultos no está permitido en AnunciaYA.',
    ilegal: 'No puedes publicar artículos prohibidos por la ley.',
};

/**
 * Mapeo leetspeak / sustituciones comunes para evadir filtros.
 * Aplicado en `normalizar()` antes de comparar.
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
 * Normalización agresiva para detectar palabras prohibidas escritas con
 * variantes comunes:
 *  - Minúsculas
 *  - Sin acentos
 *  - Sustituciones leetspeak (0→o, 1→i, 3→e, 4→a, @→a, $→s, etc.)
 *
 * El texto resultante NO se muestra al usuario, solo se usa internamente
 * para comparar contra la lista negra.
 */
function normalizar(texto: string): string {
    let resultado = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let mapeado = '';
    for (const ch of resultado) {
        mapeado += SUSTITUCIONES_LEET[ch] ?? ch;
    }
    return mapeado;
}

/**
 * Construye un regex que detecta una palabra prohibida permitiendo
 * separadores no-alfanuméricos entre letras (ej: "r.i.f.a", "r i f a",
 * "r_i_f_a"). El boundary se hace con lookarounds para que NO matchee
 * dentro de otra palabra (ej: "deriva" no matchea "rifa").
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

/**
 * Devuelve el primer match de palabra prohibida en el texto, o `null` si
 * el texto está limpio. Reusable en cualquier input del wizard.
 */
export function detectarPalabraProhibida(texto: string): {
    categoria: CategoriaProhibida;
    palabra: string;
    mensaje: string;
} | null {
    if (!texto || texto.trim().length === 0) return null;
    const textoNormalizado = normalizar(texto);

    for (const categoria of Object.keys(PALABRAS_PROHIBIDAS) as CategoriaProhibida[]) {
        const palabras = PALABRAS_PROHIBIDAS[categoria];
        for (const palabra of palabras) {
            const regex = construirRegex(palabra);
            if (regex.test(textoNormalizado)) {
                return {
                    categoria,
                    palabra,
                    mensaje: MENSAJES_RECHAZO[categoria],
                };
            }
        }
    }

    return null;
}
