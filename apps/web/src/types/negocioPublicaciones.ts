/**
 * negocioPublicaciones.ts
 * ========================
 * Tipos del feed de publicaciones libres de negocio (Negocios). Contenido
 * "todo tipo, libre" — sin categoría estructurada, sin modo vendo/busco, sin
 * TTL. Reusa el tipo `Comentario` genérico de `types/comentarios.ts`.
 *
 * Doc maestro: docs/arquitectura/Negocios.md
 * Ubicación: apps/web/src/types/negocioPublicaciones.ts
 */

import type { Comentario } from './comentarios';

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
 * Item del feed enriquecido con comentarios embebidos (mismo patrón que
 * `ArticuloFeedInfinito.topComentarios` de MarketPlace) — evita que cada
 * card del feed pida sus comentarios aparte (N+1). Solo lo devuelve el feed;
 * el detalle sigue pidiendo comentarios por su cuenta.
 */
export interface PublicacionNegocioFeedItemConComentarios extends PublicacionNegocioFeedItem {
    topComentarios: Comentario[];
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
