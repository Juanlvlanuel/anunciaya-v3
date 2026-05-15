/**
 * busquedasRecientes.ts
 * ======================
 * Helpers para gestionar las búsquedas recientes en localStorage del
 * navegador. Compartidos entre los overlays de búsqueda de MarketPlace,
 * Ofertas y Negocios.
 *
 * Decisión de privacidad: las búsquedas recientes viven SOLO en localStorage
 * (no en BD). Esto evita perfilamiento server-side y le deja al usuario
 * control total — borrarlas es limpiar el storage local.
 *
 * Una clave de storage por sección: cada sección tiene su propio historial
 * para que las búsquedas en una no contaminen las otras (un "bicicleta"
 * buscado en MarketPlace no aparece como reciente al abrir Ofertas).
 *
 * Retro-compatibilidad: las funciones aceptan la sección como parámetro
 * opcional con default `'marketplace'`, así el código existente del
 * `OverlayBuscadorMarketplace` sigue funcionando sin cambios.
 *
 * Ubicación: apps/web/src/utils/busquedasRecientes.ts
 */

export type SeccionBusqueda = 'marketplace' | 'ofertas' | 'negocios';

const STORAGE_KEY_POR_SECCION: Record<SeccionBusqueda, string> = {
    marketplace: 'marketplace_busquedas_recientes',
    ofertas: 'ofertas_busquedas_recientes',
    negocios: 'negocios_busquedas_recientes',
};

const MAX_RECIENTES = 10;

function leerSafe(seccion: SeccionBusqueda): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY_POR_SECCION[seccion]);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECIENTES);
    } catch {
        return [];
    }
}

function escribirSafe(seccion: SeccionBusqueda, lista: string[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(
            STORAGE_KEY_POR_SECCION[seccion],
            JSON.stringify(lista.slice(0, MAX_RECIENTES)),
        );
    } catch {
        // QuotaExceeded u otro error — silencioso, no es crítico.
    }
}

/**
 * Devuelve la lista actual de búsquedas recientes (más reciente primero).
 */
export function obtenerBusquedasRecientes(seccion: SeccionBusqueda = 'marketplace'): string[] {
    return leerSafe(seccion);
}

/**
 * Agrega un término al inicio de la lista. Si ya existe, lo mueve al inicio
 * (no lo duplica). Recorta a MAX_RECIENTES.
 */
export function agregarBusquedaReciente(
    termino: string,
    seccion: SeccionBusqueda = 'marketplace',
): void {
    const limpio = termino.trim();
    if (limpio.length < 2) return;
    const actual = leerSafe(seccion);
    const filtrada = actual.filter(
        (t) => t.toLowerCase() !== limpio.toLowerCase()
    );
    escribirSafe(seccion, [limpio, ...filtrada]);
}

/**
 * Quita un término específico de la lista.
 */
export function quitarBusquedaReciente(
    termino: string,
    seccion: SeccionBusqueda = 'marketplace',
): void {
    const actual = leerSafe(seccion);
    escribirSafe(seccion, actual.filter((t) => t !== termino));
}

/**
 * Borra todas las búsquedas recientes.
 */
export function borrarBusquedasRecientes(seccion: SeccionBusqueda = 'marketplace'): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem(STORAGE_KEY_POR_SECCION[seccion]);
    } catch {
        /* noop */
    }
}
