/**
 * publicidad-precio.service.ts
 * ============================
 * Cálculo del precio de un anuncio según el carrusel (o combo) y el número de ciudades, leyendo
 * las palancas que el SuperAdmin fija en Configuración (módulo Publicidad). NO es admin: lo usan
 * tanto el alta manual del Panel como el wizard self-service público (que muestra el precio antes
 * de pagar), por eso vive fuera de `admin/`.
 *
 * Fórmula: `total = (Σ precios_base de los carruseles) × factorPorCiudades(numCiudades)`, y si es
 * combo (los 3) `× (1 − descuento%)`. El factor por ciudades sale de la escalera de tramos
 * `publicidad_tramos_ciudades` (1 ciudad → ×1, más ciudades → mayor factor).
 *
 * Ubicación: apps/api/src/services/publicidad-precio.service.ts
 */

import { obtenerConfigNumero, obtenerConfigJson } from './configuracion.service.js';
import { TRAMOS_CIUDADES_DEFAULT, PERIODOS_DEFAULT, type TramoCiudades, type TramoPeriodo } from './admin/configuracion.service.js';

// Espacios de PAGO (vendibles). 'fundadores' ya no se vende: es un regalo a los primeros negocios de
// cada ciudad (se otorga manual desde el Panel y usa el logo del negocio), por eso queda fuera de aquí.
export const CARRUSELES_VALIDOS = ['anuncios', 'patrocinadores'] as const;
export type CarruselPub = (typeof CARRUSELES_VALIDOS)[number];

const PRECIO_CLAVE: Record<CarruselPub, string> = {
    anuncios: 'publicidad_precio_anuncios',
    patrocinadores: 'publicidad_precio_patrocinadores',
};

const PRECIO_DEFAULT: Record<CarruselPub, number> = {
    anuncios: 300,
    patrocinadores: 800,
};

// Precio de lanzamiento (oferta) por tamaño. 0 = sin oferta; si es > 0 y menor al precio base, se cobra
// este y el base se muestra tachado en el wizard. Lo fija el SuperAdmin en Configuración.
const PRECIO_LANZAMIENTO_CLAVE: Record<CarruselPub, string> = {
    anuncios: 'publicidad_precio_lanzamiento_anuncios',
    patrocinadores: 'publicidad_precio_lanzamiento_patrocinadores',
};

/** Precio efectivo de un tamaño: el de lanzamiento si está activo (>0 y menor al base), si no el base. */
async function preciosDeCarrusel(c: CarruselPub): Promise<{ lista: number; efectivo: number }> {
    const lista = await obtenerConfigNumero(PRECIO_CLAVE[c], PRECIO_DEFAULT[c]);
    const lanz = await obtenerConfigNumero(PRECIO_LANZAMIENTO_CLAVE[c], 0);
    const efectivo = lanz > 0 && lanz < lista ? lanz : lista;
    return { lista, efectivo };
}

/** Factor del tramo que contiene `n` ciudades (si supera todos los topes, usa el último). */
function factorDeTramo(tramos: TramoCiudades[], n: number): number {
    for (const t of tramos) {
        if (n >= t.min && (t.max === null || n <= t.max)) return t.factor;
    }
    return tramos[tramos.length - 1]?.factor ?? 1;
}

export interface DesglosePrecio {
    base: number;             // suma de precios EFECTIVOS (lo que se cobra) de los carruseles elegidos
    baseLista: number;        // suma de precios de LISTA (para tachar si hay lanzamiento)
    hayLanzamiento: boolean;  // algún carrusel elegido tiene precio de lanzamiento activo
    factor: number;           // multiplicador por # de ciudades
    esCombo: boolean;
    descuento: number;        // % del combo (0 si no es combo)
    mensual: number;          // precio de 1 mes (base × factor × combo)
    meses: number;            // meses pagados por adelantado
    descuentoPeriodo: number; // % de descuento por el periodo elegido
    total: number;            // mensual × meses × (1 − descuentoPeriodo), redondeado
}

/** Lee los periodos pagables por adelantado (con su descuento). El super los ajusta en Configuración. */
export async function obtenerPeriodos(): Promise<TramoPeriodo[]> {
    return obtenerConfigJson<TramoPeriodo[]>('publicidad_periodos', PERIODOS_DEFAULT);
}

/**
 * Precio de un anuncio. `carruseles` = los carruseles comprados (1..3); `numCiudades` = cuántas
 * ciudades; `meses` = cuántos meses paga por adelantado (default 1). El precio mensual se multiplica
 * por los meses y se aplica el descuento del periodo. Devuelve el desglose para el wizard / alta manual.
 */
export async function calcularPrecioPublicidad(
    carruseles: CarruselPub[],
    numCiudades: number,
    meses = 1,
): Promise<DesglosePrecio> {
    const unicos = Array.from(new Set(carruseles));

    let base = 0;
    let baseLista = 0;
    let hayLanzamiento = false;
    for (const c of unicos) {
        const { lista, efectivo } = await preciosDeCarrusel(c);
        base += efectivo;
        baseLista += lista;
        if (efectivo < lista) hayLanzamiento = true;
    }

    const tramos = await obtenerConfigJson<TramoCiudades[]>('publicidad_tramos_ciudades', TRAMOS_CIUDADES_DEFAULT);
    const factor = factorDeTramo(tramos, Math.max(1, Math.floor(numCiudades)));

    const esCombo = unicos.length === 2; // combo = los 2 espacios de pago juntos (Anuncios + Patrocinadores)
    let descuento = 0;
    let mensual = base * factor;
    if (esCombo) {
        descuento = await obtenerConfigNumero('publicidad_combo_descuento', 15);
        mensual = mensual * (1 - descuento / 100);
    }
    mensual = Math.round(mensual * 100) / 100;

    const m = Math.max(1, Math.floor(meses));
    const periodos = await obtenerPeriodos();
    const descuentoPeriodo = periodos.find((p) => p.meses === m)?.descuento ?? 0;
    const total = Math.round(mensual * m * (1 - descuentoPeriodo / 100) * 100) / 100;

    return { base, baseLista, hayLanzamiento, factor, esCombo, descuento, mensual, meses: m, descuentoPeriodo, total };
}

export interface OpcionesPublicidad {
    limiteCiudades: number;
    duracionDias: number;
    comboDescuento: number;
    // precioLanzamiento = 0 si no hay oferta; si > 0 es el precio que se cobra y precioBase se muestra tachado.
    carruseles: Array<{ clave: CarruselPub; precioBase: number; precioLanzamiento: number }>;
    periodos: TramoPeriodo[];
}

/** Opciones que el wizard / alta manual necesitan para armar el formulario (precios base + reglas). */
export async function obtenerOpcionesPublicidad(): Promise<OpcionesPublicidad> {
    const carruseles: OpcionesPublicidad['carruseles'] = [];
    for (const c of CARRUSELES_VALIDOS) {
        const { lista, efectivo } = await preciosDeCarrusel(c);
        carruseles.push({ clave: c, precioBase: lista, precioLanzamiento: efectivo < lista ? efectivo : 0 });
    }
    return {
        limiteCiudades: await obtenerConfigNumero('publicidad_limite_ciudades', 10),
        duracionDias: await obtenerConfigNumero('publicidad_duracion_dias', 30),
        comboDescuento: await obtenerConfigNumero('publicidad_combo_descuento', 15),
        carruseles,
        periodos: await obtenerPeriodos(),
    };
}
