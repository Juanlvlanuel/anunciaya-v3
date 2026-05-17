/**
 * aleatorizarUbicacion.ts
 * =========================
 * Helper compartido para aleatorizar una coordenada dentro de un círculo de
 * 500 metros. Usado por:
 *
 *   - MarketPlace (`articulos_marketplace.ubicacion_aproximada`)
 *   - Servicios   (`servicios_publicaciones.ubicacion_aproximada`)
 *
 * La privacidad de la ubicación del oferente depende de este helper: si la
 * distribución de puntos no fuera uniforme en disco, o si el radio fuera
 * mayor, la coordenada pública podría revelar más de lo deseado.
 *
 * Sprint 1 de Servicios (15-may-2026): extraído de `marketplace.service.ts`
 * para reusarlo desde el nuevo módulo sin duplicación.
 *
 * Ubicación: apps/api/src/utils/aleatorizarUbicacion.ts
 */

/** Radio del círculo de privacidad en metros. NO cambiar sin justificar. */
export const RADIO_PRIVACIDAD_METROS = 500;

/** Aproximación de metros por grado de latitud (constante en el globo). */
export const METROS_POR_GRADO_LAT = 111_320;

/**
 * Devuelve una nueva coordenada desplazada uniformemente dentro de un círculo
 * de `RADIO_PRIVACIDAD_METROS` (500m) alrededor del punto original.
 *
 * Distribución uniforme en disco usando `r = R * sqrt(random())`:
 * - sin sqrt, los puntos se agrupan cerca del centro (área ∝ r²).
 * - con sqrt, la densidad por unidad de área es constante.
 *
 * Se aplica al CREAR la publicación. La coordenada original queda guardada en
 * la columna privada `ubicacion`; la pública es esta aleatorizada y queda
 * FIJA (no se recalcula en cada consulta — eso revelaría varianza).
 *
 * @param lat - Latitud original en grados
 * @param lng - Longitud original en grados
 * @returns Nueva coordenada `{ lat, lng }` dentro del círculo de 500m
 */
export function aleatorizarCoordenada(
    lat: number,
    lng: number
): { lat: number; lng: number } {
    const r = RADIO_PRIVACIDAD_METROS * Math.sqrt(Math.random());
    const theta = 2 * Math.PI * Math.random();

    const offsetMetrosLat = r * Math.cos(theta);
    const offsetMetrosLng = r * Math.sin(theta);

    const offsetGradosLat = offsetMetrosLat / METROS_POR_GRADO_LAT;
    // En longitud, 1 grado equivale a menos metros conforme aumenta la latitud.
    const offsetGradosLng =
        offsetMetrosLng / (METROS_POR_GRADO_LAT * Math.cos((lat * Math.PI) / 180));

    return {
        lat: lat + offsetGradosLat,
        lng: lng + offsetGradosLng,
    };
}
