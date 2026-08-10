/**
 * cartasLoteria.ts
 * =================
 * Las 54 cartas de la baraja tradicional de lotería mexicana — arte propio
 * (ver `apps/web/public/loteria/`, generado vía Gemini, NO la baraja de
 * "Don Clemente"). Alimenta el método de sorteo `carta_unica` de Dinámicas
 * (Fase 4.3): cada boleto pagado se identifica con una carta en vez de un
 * número, calculado como una función PURA de `numeroBoleto` — no hay tabla
 * ni columna en BD para este mapeo, es puramente cosmético en el frontend
 * (el motor de sorteo sigue operando sobre `numeroBoleto` sin cambios, ver
 * `docs/arquitectura/Dinamicas.md`).
 *
 * Orden fijo (índice 1-54), calcado de los nombres de archivo reales en
 * `apps/web/public/loteria/carta-NN-slug.webp`.
 *
 * Ubicación: apps/web/src/data/cartasLoteria.ts
 */

export interface CartaLoteria {
    numero: number;
    slug: string;
    nombre: string;
    archivo: string;
}

const SLUGS_Y_NOMBRES: [string, string][] = [
    ['el-gallo', 'El Gallo'],
    ['el-diablito', 'El Diablito'],
    ['la-dama', 'La Dama'],
    ['el-catrin', 'El Catrín'],
    ['el-paraguas', 'El Paraguas'],
    ['la-sirena', 'La Sirena'],
    ['la-escalera', 'La Escalera'],
    ['la-botella', 'La Botella'],
    ['el-barril', 'El Barril'],
    ['el-arbol', 'El Árbol'],
    ['el-melon', 'El Melón'],
    ['el-valiente', 'El Valiente'],
    ['el-gorrito', 'El Gorrito'],
    ['la-muerte', 'La Muerte'],
    ['la-pera', 'La Pera'],
    ['la-bandera', 'La Bandera'],
    ['el-bandolon', 'El Bandolón'],
    ['el-violoncello', 'El Violoncello'],
    ['la-garza', 'La Garza'],
    ['el-pajaro', 'El Pájaro'],
    ['la-mano', 'La Mano'],
    ['la-bota', 'La Bota'],
    ['la-luna', 'La Luna'],
    ['el-cotorro', 'El Cotorro'],
    ['el-borracho', 'El Borracho'],
    ['el-negrito', 'El Negrito'],
    ['el-corazon', 'El Corazón'],
    ['la-sandia', 'La Sandía'],
    ['el-tambor', 'El Tambor'],
    ['el-camaron', 'El Camarón'],
    ['las-jaras', 'Las Jaras'],
    ['el-musico', 'El Músico'],
    ['la-arana', 'La Araña'],
    ['el-soldado', 'El Soldado'],
    ['la-estrella', 'La Estrella'],
    ['el-cazo', 'El Cazo'],
    ['el-mundo', 'El Mundo'],
    ['el-apache', 'El Apache'],
    ['el-nopal', 'El Nopal'],
    ['el-alacran', 'El Alacrán'],
    ['la-rosa', 'La Rosa'],
    ['la-calavera', 'La Calavera'],
    ['la-campana', 'La Campana'],
    ['el-cantarito', 'El Cantarito'],
    ['el-venado', 'El Venado'],
    ['el-sol', 'El Sol'],
    ['la-corona', 'La Corona'],
    ['la-chalupa', 'La Chalupa'],
    ['el-pino', 'El Pino'],
    ['el-pescado', 'El Pescado'],
    ['la-palma', 'La Palma'],
    ['la-maceta', 'La Maceta'],
    ['el-arpa', 'El Arpa'],
    ['la-rana', 'La Rana'],
];

/** Total FIJO de boletos del método `carta_unica` — siempre se usa la
 *  baraja completa (54 cartas, una por participante, del boleto #1 al
 *  #54), no es un tope editable. El composer bloquea "Boleto Inicial" y
 *  "Total de Boletos" a estos valores en cuanto se elige el método
 *  (espejo de la validación en `dinamicas.schema.ts`/`useComposerDinamicas.ts`). */
export const TOTAL_BOLETOS_CARTA_UNICA = SLUGS_Y_NOMBRES.length;
export const BOLETO_INICIAL_CARTA_UNICA = 1;

export const CARTAS_LOTERIA: CartaLoteria[] = SLUGS_Y_NOMBRES.map(([slug, nombre], i) => {
    const numero = i + 1;
    const nn = String(numero).padStart(2, '0');
    return { numero, slug, nombre, archivo: `/loteria/carta-${nn}-${slug}.webp` };
});

/** Carta determinada por `numeroBoleto` — función pura, sin estado ni BD.
 *  El `% 54` es defensivo (con el tope de 54 boletos nunca debería hacer
 *  falta ciclar), evita un índice fuera de rango si algún dato viejo lo
 *  excediera. */
export function obtenerCartaPorBoleto(numeroBoleto: number): CartaLoteria {
    const indice = ((numeroBoleto - 1) % CARTAS_LOTERIA.length + CARTAS_LOTERIA.length) % CARTAS_LOTERIA.length;
    return CARTAS_LOTERIA[indice];
}
