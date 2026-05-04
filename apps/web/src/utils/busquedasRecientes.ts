/**
 * busquedasRecientes.ts
 * ======================
 * Helpers para gestionar las búsquedas recientes del MarketPlace en
 * localStorage del navegador.
 *
 * Decisión de privacidad: las búsquedas recientes viven SOLO en localStorage
 * (no en BD). Esto evita perfilamiento server-side y le deja al usuario
 * control total — borrarlas es limpiar el storage local.
 *
 * Ubicación: apps/web/src/utils/busquedasRecientes.ts
 */

const STORAGE_KEY = 'marketplace_busquedas_recientes';
const MAX_RECIENTES = 10;

function leerSafe(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECIENTES);
    } catch {
        return [];
    }
}

function escribirSafe(lista: string[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lista.slice(0, MAX_RECIENTES)));
    } catch {
        // QuotaExceeded u otro error — silencioso, no es crítico.
    }
}

/**
 * Devuelve la lista actual de búsquedas recientes (más reciente primero).
 */
export function obtenerBusquedasRecientes(): string[] {
    return leerSafe();
}

/**
 * Agrega un término al inicio de la lista. Si ya existe, lo mueve al inicio
 * (no lo duplica). Recorta a MAX_RECIENTES.
 */
export function agregarBusquedaReciente(termino: string): void {
    const limpio = termino.trim();
    if (limpio.length < 2) return;
    const actual = leerSafe();
    const filtrada = actual.filter(
        (t) => t.toLowerCase() !== limpio.toLowerCase()
    );
    escribirSafe([limpio, ...filtrada]);
}

/**
 * Quita un término específico de la lista.
 */
export function quitarBusquedaReciente(termino: string): void {
    const actual = leerSafe();
    escribirSafe(actual.filter((t) => t !== termino));
}

/**
 * Borra todas las búsquedas recientes.
 */
export function borrarBusquedasRecientes(): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* noop */
    }
}
