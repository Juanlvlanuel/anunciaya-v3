/**
 * normalizarTexto.ts
 * ===================
 * Helper para comparaciones de texto accent-insensitive y case-insensitive.
 *
 * Usado por los filtros in-memory de los overlays/feed (Negocios, Mis
 * Guardados, etc.) — el equivalente backend es la extensión `unaccent` de
 * Postgres usada en los buscadores de Ofertas y MarketPlace.
 *
 * Implementación: `String.prototype.normalize('NFD')` descompone los
 * caracteres con acento en su base + combining mark (ej. "á" → "a" + "´"),
 * y la regex `\p{Diacritic}` (Unicode property con flag `u`) elimina las
 * marcas combinantes. Cubre todos los acentos romance (á é í ó ú ü ñ → la
 * ñ se queda intacta porque NO es un combining mark — se considera letra
 * propia, lo cual es correcto en español).
 *
 * Ubicación: apps/web/src/utils/normalizarTexto.ts
 */

/**
 * Normaliza un texto para comparación: minúsculas + sin acentos.
 *
 * Ejemplos:
 *  - "Panadería" → "panaderia"
 *  - "Acción" → "accion"
 *  - "Niño" → "niño" (la ñ se mantiene — es letra propia en español)
 *  - "PEÑASCO" → "peñasco"
 */
export function normalizarTexto(texto: string): string {
    return texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
