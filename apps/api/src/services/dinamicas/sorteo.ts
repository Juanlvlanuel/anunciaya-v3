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
 * Algoritmo (por RONDAS, confirmado con el usuario ago-2026 — reemplaza el
 * diseño anterior de "una sola cascada de N para todos los K lugares"):
 * cada uno de los K lugares premiados corre su propia ronda de N bolas —
 * las primeras N-1 de esa ronda "no ganan", la N-ésima es la ganadora de
 * ESE lugar. Las rondas se revelan en orden de lugar DESCENDENTE (K, K-1,
 * ..., 1), para que el premio mayor (lugar #1) sea la última bola de todo
 * el sorteo — mismo suspenso de siempre, ahora aplicado por ronda.
 *
 * Sin reemplazo a lo largo de TODO el sorteo (no solo dentro de cada
 * ronda): cada bola sacada usa `SHA256(semilla:intentoGlobal) %
 * restante.length` como índice sobre el pool que va quedando, así que
 * ningún boleto puede salir dos veces ni entre rondas distintas. Total de
 * bolas del sorteo = K × N.
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
 * @param numeroIntentosPorLugar N — cuántas bolas se sacan EN CADA ronda
 *   (una ronda por lugar premiado); la N-ésima de cada ronda es la ganadora
 *   de ese lugar.
 * @param numeroLugares K — cuántos lugares premiados hay = cuántas rondas
 *   se corren. Total de bolas del sorteo = K × N.
 */
export function ejecutarSorteo(
    pool: BoletoParaSorteo[],
    semilla: string,
    numeroIntentosPorLugar: number,
    numeroLugares: number,
): ResultadoSorteo {
    const totalBolas = numeroIntentosPorLugar * numeroLugares;
    if (totalBolas > pool.length) {
        throw new Error('numeroIntentosPorLugar × numeroLugares no puede ser mayor al tamaño del pool');
    }

    const restante = [...pool].sort((a, b) => a.numeroBoleto - b.numeroBoleto);
    const intentos: IntentoSorteo[] = [];
    const ganadores: IntentoSorteo[] = [];

    let intentoGlobal = 0;
    // Ronda 0 sortea el lugar K (el más chico), la última ronda sortea el
    // lugar #1 — así el premio mayor siempre es la última bola del sorteo.
    for (let ronda = 0; ronda < numeroLugares; ronda++) {
        const lugarDeEstaRonda = numeroLugares - ronda;
        for (let i = 1; i <= numeroIntentosPorLugar; i++) {
            intentoGlobal++;
            const indice = indiceDeterministico(semilla, intentoGlobal, restante.length);
            const [boleto] = restante.splice(indice, 1);
            const esGanador = i === numeroIntentosPorLugar;
            const intento: IntentoSorteo = {
                numeroIntento: intentoGlobal,
                boleto,
                esGanador,
                lugar: esGanador ? lugarDeEstaRonda : null,
            };
            intentos.push(intento);
            if (esGanador) ganadores.push(intento);
        }
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
