/**
 * texto.ts
 * ========
 * Normalización de texto del Panel. `slugCiudad` replica EXACTAMENTE el del backend
 * (`apps/api/src/utils/ciudades.ts`) para que el cruce dataset-del-mapa ↔ catálogo dé
 * la misma clave en ambos lados.
 *
 * Ubicación: apps/admin/src/utils/texto.ts
 */

/** Slug de ciudad: minúsculas, sin acentos, sin caracteres especiales, espacios→'-'. */
export function slugCiudad(texto: string): string {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

/** Texto normalizado para comparar (minúsculas, sin acentos, sin espacios extra). */
export function normalizarTexto(texto: string): string {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .replace(/\s+/g, ' ');
}

/** Clave de cruce ciudad↔catálogo: slug del nombre + estado normalizado (desambigua homónimos entre estados). */
export function claveCruceCiudad(nombre: string, estado: string): string {
    return `${slugCiudad(nombre)}|${normalizarTexto(estado)}`;
}
