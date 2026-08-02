/**
 * archivoFoto.ts
 * ===============
 * Tipo compartido para el elemento del arreglo `fotos` (columna JSONB) en
 * MarketPlace, Servicios y Publicaciones de Negocio. Fotos y videos conviven
 * en el mismo arreglo — no hay un campo separado.
 *
 * Doc maestro: docs/arquitectura/Video_En_Publicaciones.md
 *
 * Ubicación: apps/web/src/types/archivoFoto.ts
 */

export interface ArchivoFoto {
    url: string;
    tipo: 'imagen' | 'video';
    /** Solo presente cuando tipo === 'video'. Poster generado en frontend. */
    posterUrl?: string;
}
