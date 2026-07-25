/**
 * negocioPublicaciones.ts
 * ========================
 * Tipos del feed de publicaciones libres de negocio (Negocios). Contenido
 * "todo tipo, libre" — sin categoría estructurada, sin modo vendo/busco, sin
 * TTL.
 *
 * Doc maestro: docs/arquitectura/Negocios.md
 * Ubicación: apps/web/src/types/negocioPublicaciones.ts
 */

/** Item del feed — datos de la sucursal embebidos para evitar requests extra. */
export interface PublicacionNegocioFeedItem {
    id: string;
    negocioId: string;
    sucursalId: string;
    sucursalNombre: string;
    sucursalAvatarUrl: string | null;
    ciudadNombre: string | null;
    texto: string;
    precio: string | null;
    fotos: string[];
    fotoPortadaIndex: number;
    totalVistas: number;
    createdAt: string;
}

/**
 * Item del feed enriquecido con el conteo de comentarios (evita que cada card
 * pida `totalComentarios` aparte). El detalle y el modal de comentarios piden
 * el árbol completo por su cuenta.
 */
export interface PublicacionNegocioFeedItemConComentarios extends PublicacionNegocioFeedItem {
    totalComentarios: number;
    /** Distancia del usuario a la sucursal en km. `null` si no hay GPS. */
    distanciaKm: number | null;
}

export interface PublicacionNegocioDetalle extends PublicacionNegocioFeedItem {
    autorUsuarioId: string;
    estado: 'activa' | 'archivada';
    updatedAt: string;
    /** Distancia del usuario a la sucursal en km. `null` si no hay GPS. */
    distanciaKm: number | null;
}

export interface RespuestaFeedPublicacionesNegocio {
    publicaciones: PublicacionNegocioFeedItemConComentarios[];
    hayMas: boolean;
}

/** Fila del listado de administración en Business Studio ("mis publicaciones"). */
export interface PublicacionNegocioBSRow extends PublicacionNegocioFeedItem {
    estado: 'activa' | 'archivada';
    updatedAt: string;
    totalComentarios: number;
}

export interface RespuestaListadoPublicacionesBS {
    publicaciones: PublicacionNegocioBSRow[];
    total: number;
}

export interface KpisPublicacionesNegocio {
    total: number;
    activas: number;
    archivadas: number;
    totalVistas: number;
    totalComentarios: number;
}
