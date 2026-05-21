/**
 * deteccionVenta.ts
 * ===================
 * Detección de palabras clave que sugieren que el texto pertenece a
 * MarketPlace (venta de objetos) en lugar de Servicios. Usado por el
 * composer de Servicios para mostrar un hint inline antes de publicar.
 *
 * El mismo regex vive en backend (`apps/api/src/services/servicios/servicios.service.ts`
 * → `detectarSugerenciaSeccion`). Cuando MarketPlace adopte el composer
 * y necesitemos detección bidireccional, centralizar en `packages/shared/`.
 *
 * Mantener sincronizado con el backend manualmente hasta entonces.
 *
 * Ubicación: apps/web/src/utils/deteccionVenta.ts
 */

const REGEX_VENTA =
    /\b(vendo|vendido|venta|remato|cambio por|cambio x)\b/i;

/** Devuelve true si el texto contiene palabras típicas de venta de
 *  objetos físicos. No hace inferencia sofisticada — sólo palabras
 *  obvias. Es intencional: el hint debe disparar solo cuando hay alta
 *  confianza de que el usuario está en la sección equivocada. */
export function pareceVenta(texto: string): boolean {
    if (!texto || texto.trim().length === 0) return false;
    return REGEX_VENTA.test(texto);
}
