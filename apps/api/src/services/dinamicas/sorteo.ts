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
import { obtenerTablaPorBoleto } from './tablasLoteria.js';

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

// =============================================================================
// TABLA COMPLETA (Fase 4.3) — motor distinto: no hay "K lugares × N
// intentos fijos" conocidos de antemano. Se cantan cartas de la baraja
// (54, sin reemplazo) y, después de cada una, se revisa si alguna tabla
// ACTIVA (de las 16 cartas de `tablasLoteria.ts`, asignada por
// `obtenerTablaPorBoleto`) ya quedó completa. El primero en completar gana
// el lugar #1 (al revés de la tómbola, donde el premio mayor sale al
// final) — se sigue cantando entre las tablas restantes para el 2do,
// 3er lugar, etc., hasta llegar a K o agotar el mazo.
// =============================================================================

export type ReglaDesempate = 'sorteo_instantaneo' | 'repartir_premio' | 'ronda_extra' | 'orden_inscripcion';

export interface BoletoParaSorteoTablaCompleta extends BoletoParaSorteo {
    /** ISO string — solo se usa si `reglaDesempate === 'orden_inscripcion'`. */
    pagadoEn: string;
}

export interface GanadorTablaCompleta {
    boleto: BoletoParaSorteoTablaCompleta;
    lugar: number;
}

export interface CartaCantada {
    numeroIntento: number;
    /** Índice de la carta cantada (1-54, mismo orden que `cartasLoteria.ts`). */
    cartaIndice: number;
    /** Normalmente 0 o 1 elemento — más de 1 solo puede pasar con
     *  `reglaDesempate === 'repartir_premio'` (2+ tablas completan con la
     *  misma carta y se reparten lugares consecutivos de una vez). */
    ganadores: GanadorTablaCompleta[];
}

export interface ResultadoSorteoTablaCompleta {
    cartas: CartaCantada[];
    ganadores: GanadorTablaCompleta[];
}

/** Orden determinista de un grupo de boletos empatados — mismo criterio de
 *  auditabilidad que el resto del motor (nadie lo elige, se puede
 *  recomputar desde la semilla pública). */
function ordenDeterministico(
    boletos: BoletoParaSorteoTablaCompleta[],
    semilla: string,
    intentoGlobal: number,
): BoletoParaSorteoTablaCompleta[] {
    return boletos
        .map((b) => ({ b, clave: createHash('sha256').update(`${semilla}:desempate:${intentoGlobal}:${b.id}`).digest('hex') }))
        .sort((x, y) => (x.clave < y.clave ? -1 : x.clave > y.clave ? 1 : 0))
        .map((x) => x.b);
}

/** Resuelve un empate (2+ tablas completas con la misma carta) según
 *  `reglaDesempate` — devuelve, en orden, a quién(es) se les asigna lugar
 *  EN ESTE intento (1 solo para sorteo_instantaneo/ronda_extra —el resto
 *  sigue activo para el siguiente lugar—, todos para repartir_premio,
 *  ordenados por `pagadoEn` para orden_inscripcion). */
function resolverEmpate(
    empatados: BoletoParaSorteoTablaCompleta[],
    regla: ReglaDesempate,
    semilla: string,
    intentoGlobal: number,
): BoletoParaSorteoTablaCompleta[] {
    if (regla === 'orden_inscripcion') {
        return [...empatados].sort((a, b) => new Date(a.pagadoEn).getTime() - new Date(b.pagadoEn).getTime());
    }
    if (regla === 'repartir_premio') {
        return ordenDeterministico(empatados, semilla, intentoGlobal);
    }
    // 'sorteo_instantaneo' y 'ronda_extra' — ronda_extra no tiene forma de
    // "extender" el sorteo con cartas nuevas (el mazo son 54 fijas, sin
    // reemplazo), así que para esta primera versión se comporta igual que
    // sorteo_instantaneo (documentado en docs/arquitectura/Dinamicas.md).
    return [ordenDeterministico(empatados, semilla, intentoGlobal)[0]];
}

export function ejecutarSorteoTablaCompleta(
    pool: BoletoParaSorteoTablaCompleta[],
    semilla: string,
    numeroLugares: number,
    reglaDesempate: ReglaDesempate,
): ResultadoSorteoTablaCompleta {
    if (pool.length === 0) {
        throw new Error('No hay boletos pagados para sortear');
    }

    const tablaPorBoletoId = new Map<string, Set<number>>();
    for (const boleto of pool) {
        tablaPorBoletoId.set(boleto.id, new Set(obtenerTablaPorBoleto(boleto.numeroBoleto)));
    }

    const restante = Array.from({ length: 54 }, (_, i) => i + 1);
    const cantadas = new Set<number>();
    const activos = new Map(pool.map((b) => [b.id, b]));
    const cartas: CartaCantada[] = [];
    const ganadores: GanadorTablaCompleta[] = [];
    let siguienteLugar = 1;
    let intentoGlobal = 0;

    while (restante.length > 0 && siguienteLugar <= numeroLugares) {
        intentoGlobal++;
        const indice = indiceDeterministico(semilla, intentoGlobal, restante.length);
        const [cartaIndice] = restante.splice(indice, 1);
        cantadas.add(cartaIndice);

        const completadosAhora: BoletoParaSorteoTablaCompleta[] = [];
        for (const boleto of activos.values()) {
            const tabla = tablaPorBoletoId.get(boleto.id) as Set<number>;
            let completa = true;
            for (const c of tabla) {
                if (!cantadas.has(c)) {
                    completa = false;
                    break;
                }
            }
            if (completa) completadosAhora.push(boleto);
        }

        const ganadoresEsteIntento: GanadorTablaCompleta[] = [];
        if (completadosAhora.length === 1) {
            const lugar = siguienteLugar++;
            activos.delete(completadosAhora[0].id);
            const g = { boleto: completadosAhora[0], lugar };
            ganadores.push(g);
            ganadoresEsteIntento.push(g);
        } else if (completadosAhora.length > 1) {
            const resueltos = resolverEmpate(completadosAhora, reglaDesempate, semilla, intentoGlobal);
            for (const boleto of resueltos) {
                if (siguienteLugar > numeroLugares) break;
                const lugar = siguienteLugar++;
                activos.delete(boleto.id);
                const g = { boleto, lugar };
                ganadores.push(g);
                ganadoresEsteIntento.push(g);
            }
        }

        cartas.push({ numeroIntento: intentoGlobal, cartaIndice, ganadores: ganadoresEsteIntento });
    }

    ganadores.sort((a, b) => a.lugar - b.lugar);
    return { cartas, ganadores };
}

/** Hash público de verificación para tabla completa — mismo criterio que
 *  `calcularHashVerificacion`, pero sobre la secuencia de CARTAS cantadas
 *  (no de boletos, aquí cada intento es una carta, no un boleto). */
export function calcularHashVerificacionTablaCompleta(
    dinamicaId: string,
    semilla: string,
    cartas: CartaCantada[],
): string {
    const secuencia = cartas.map((c) => `${c.numeroIntento}:${c.cartaIndice}`).join(',');
    return createHash('sha256').update(`${dinamicaId}|${semilla}|${secuencia}`).digest('hex');
}
