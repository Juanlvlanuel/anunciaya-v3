/**
 * sorteo.ts
 * =========
 * Motor de sorteo de una Dinámica — módulo PURO, sin dependencia de BD,
 * para que sea testeable directo con vectores fijos (mismo criterio que
 * `services/dinamicas/estados.ts` / `services/marketplace/filtros.ts`).
 *
 * Determinista y auditable: dado el mismo pool + semilla + N + K, el
 * resultado es SIEMPRE el mismo (reproducible byte a byte). La semilla se
 * genera con `crypto.randomBytes` al momento de iniciar el sorteo — nadie la
 * elige, nadie puede predecirla de antemano.
 *
 * Algoritmo (cascada, confirmado con el usuario): en cada intento 1..N se
 * saca, sin reemplazo, un boleto del pool restante usando
 * `SHA256(semilla:intento) % restante.length` como índice. Los últimos K
 * intentos son los ganadores, en ORDEN INVERSO — el intento N es el 1er
 * lugar (premio grande, revelado al final para dar suspenso), N-1 es el
 * 2do lugar, etc.
 *
 * Solo los K ganadores se persisten en `dinamica_ganadores`. Los intentos
 * "no ganó" no se guardan — son recomputables por cualquiera desde la
 * semilla pública + este algoritmo, verificables contra `hashVerificacion`.
 *
 * Ubicación: apps/api/src/services/dinamicas/sorteo.ts
 */

import { randomBytes, createHash } from 'node:crypto';

export interface BoletoParaSorteo {
    id: string;
    numeroBoleto: number;
}

export interface IntentoSorteo {
    numeroIntento: number;
    boleto: BoletoParaSorteo;
    esGanador: boolean;
    lugar: number | null;
}

export interface ResultadoSorteo {
    intentos: IntentoSorteo[];
    /** Solo los ganadores, ordenados por lugar ascendente (1ro, 2do, ...). */
    ganadores: IntentoSorteo[];
}

/** Semilla impredecible — nadie la elige, se genera al iniciar el sorteo. */
export function generarSemilla(): string {
    return randomBytes(32).toString('hex');
}

/** Primeros 64 bits de SHA256(semilla:intento), como entero para el módulo. */
function indiceDeterministico(semilla: string, intento: number, tamañoRestante: number): number {
    const hashHex = createHash('sha256').update(`${semilla}:${intento}`).digest('hex');
    const entero = BigInt('0x' + hashHex.slice(0, 16));
    return Number(entero % BigInt(tamañoRestante));
}

/**
 * Ejecuta el sorteo completo de una vez (fairness: la secuencia entera debe
 * quedar fija antes de revelar nada — no es "random en vivo"). La
 * revelación gradual al frontend es responsabilidad del caller (sala
 * en vivo), este módulo solo calcula el resultado.
 *
 * @param pool boletos elegibles (estado='pagado'), en cualquier orden — se
 *   reordena internamente por `numeroBoleto` para que el resultado sea
 *   reproducible sin depender del orden de llegada de la consulta SQL.
 * @param semilla generada con `generarSemilla()`.
 * @param numeroIntentos N — cuántas bolas se sacan en total.
 * @param numeroLugares K — cuántas de esas bolas (las últimas) son ganadoras.
 */
export function ejecutarSorteo(
    pool: BoletoParaSorteo[],
    semilla: string,
    numeroIntentos: number,
    numeroLugares: number,
): ResultadoSorteo {
    if (numeroIntentos > pool.length) {
        throw new Error('numeroIntentos no puede ser mayor al tamaño del pool');
    }
    if (numeroLugares > numeroIntentos) {
        throw new Error('numeroLugares no puede ser mayor a numeroIntentos');
    }

    const restante = [...pool].sort((a, b) => a.numeroBoleto - b.numeroBoleto);
    const intentos: IntentoSorteo[] = [];

    for (let intento = 1; intento <= numeroIntentos; intento++) {
        const indice = indiceDeterministico(semilla, intento, restante.length);
        const [boleto] = restante.splice(indice, 1);
        intentos.push({ numeroIntento: intento, boleto, esGanador: false, lugar: null });
    }

    const ganadores: IntentoSorteo[] = [];
    for (let i = 0; i < numeroLugares; i++) {
        const intentoGanador = intentos[numeroIntentos - 1 - i];
        intentoGanador.esGanador = true;
        intentoGanador.lugar = i + 1;
        ganadores.push(intentoGanador);
    }
    ganadores.sort((a, b) => (a.lugar as number) - (b.lugar as number));

    return { intentos, ganadores };
}

/**
 * Hash público de verificación — cualquiera puede recomputar el sorteo con
 * la semilla publicada y confirmar que su hash coincide con el guardado.
 */
export function calcularHashVerificacion(
    dinamicaId: string,
    semilla: string,
    intentos: IntentoSorteo[],
): string {
    const secuencia = intentos.map((i) => `${i.numeroIntento}:${i.boleto.numeroBoleto}`).join(',');
    return createHash('sha256').update(`${dinamicaId}|${semilla}|${secuencia}`).digest('hex');
}
