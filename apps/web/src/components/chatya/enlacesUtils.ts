/**
 * enlacesUtils.ts
 * ================
 * Utilidades compartidas para detección y manejo de URLs en ChatYA.
 *
 * UBICACIÓN: apps/web/src/components/chatya/enlacesUtils.ts
 */

/** Regex para detectar URLs HTTP/HTTPS en texto */
export const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

/** Extrae la primera URL encontrada en un texto */
export function extraerPrimeraUrl(texto: string): string | null {
  const match = texto.match(URL_REGEX);
  return match ? match[0] : null;
}

/** Extrae todas las URLs de un texto */
export function extraerEnlaces(texto: string): string[] {
  return texto.match(URL_REGEX) || [];
}

/** Extrae el dominio limpio de una URL */
export function extraerDominio(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
