/**
 * deteccionServicio.ts
 * ======================
 * Detección de palabras clave que sugieren que el texto del composer de
 * MarketPlace corresponde a un servicio (intangible) en lugar de un objeto
 * físico — es la contraparte de `deteccionVenta.ts` (que detecta venta
 * cuando estás en Servicios).
 *
 * El mismo concepto vive en backend
 * (`apps/api/src/services/marketplace/filtros.ts` → `detectarServicio` /
 *  `detectarBusqueda`). Cuando el composer global se centralice en
 * `packages/shared/`, mover los regex ahí para tener UNA sola fuente de
 * verdad. Mientras tanto, mantener sincronizado manualmente con el backend.
 *
 * Filosofía: solo dispara el hint cuando hay alta confianza. Falsos
 * positivos son mucho peores que falsos negativos — el backend tiene la
 * sugerencia formal con modal; el hint inline es solo cortesía proactiva.
 *
 * Ubicación: apps/web/src/utils/deteccionServicio.ts
 */

// Patrones espejo (recortados a lo más obvio) de los del backend en
// `services/marketplace/filtros.ts`. El backend tiene un set más amplio y
// con normalización Unicode; aquí basta con los más comunes para el hint.
const REGEX_SERVICIO =
    /\b(ofrezco|presto|presto servicio|servicio de|reparo|reparaci[oó]n|instalo|instalaci[oó]n|hago|clases?|asesor[ií]a|trabajos?\s+de|por\s+hora)\b/i;

const REGEX_BUSQUEDA = /\b(busco|necesito|quiero|requiero)\b/i;

/**
 * Devuelve true si el texto contiene palabras típicas de un servicio
 * (intangible) — sugiere que la publicación debería ir a Servicios.
 */
export function pareceServicio(texto: string): boolean {
    if (!texto || texto.trim().length === 0) return false;
    return REGEX_SERVICIO.test(texto);
}

/**
 * Devuelve true si el texto suena a "busco/necesito X" — sugiere que la
 * publicación debería ir a "Pregúntale a Peñasco" (Home) en lugar de MP.
 */
export function pareceBusqueda(texto: string): boolean {
    if (!texto || texto.trim().length === 0) return false;
    return REGEX_BUSQUEDA.test(texto);
}
