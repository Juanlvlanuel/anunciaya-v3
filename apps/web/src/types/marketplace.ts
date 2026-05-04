/**
 * marketplace.ts (types)
 * =======================
 * Tipos compartidos del módulo MarketPlace v1 (compra-venta P2P de objetos
 * físicos entre usuarios en modo Personal).
 *
 * Estos tipos espejean la respuesta del backend (snake_case → camelCase
 * transformado por el middleware global).
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md
 * Sprint:      docs/prompts Marketplace/Sprint-2-Feed-Frontend.md
 *
 * Ubicación: apps/web/src/types/marketplace.ts
 */

export type CondicionArticulo = 'nuevo' | 'seminuevo' | 'usado' | 'para_reparar';

export type EstadoArticulo = 'activa' | 'pausada' | 'vendida' | 'eliminada';

/**
 * Artículo del MarketPlace (espejo de `articulos_marketplace` en BD).
 *
 * Notas de privacidad:
 * - `ubicacionAproximada` es un punto desplazado aleatoriamente dentro de un
 *   círculo de 500m alrededor de la ubicación real. La ubicación exacta NUNCA
 *   se devuelve al frontend.
 *
 * Notas de fechas:
 * - Vienen del backend en formato Postgres (`"2026-06-02 22:27:55+00"`, sin
 *   `T`). Para parsear a `Date` usar `parsearFechaPostgres` de
 *   `apps/web/src/utils/marketplace.ts` — `new Date(...)` directo rompe en
 *   Safari iOS.
 */
export interface ArticuloMarketplace {
    id: string;
    usuarioId: string;
    titulo: string;
    descripcion: string;
    /** NUMERIC(10,2) viene como string del backend */
    precio: string;
    condicion: CondicionArticulo;
    aceptaOfertas: boolean;
    fotos: string[];
    fotoPortadaIndex: number;
    ubicacionAproximada: { lat: number; lng: number };
    ciudad: string;
    zonaAproximada: string;
    estado: EstadoArticulo;
    totalVistas: number;
    totalMensajes: number;
    totalGuardados: number;
    expiraAt: string;
    createdAt: string;
    updatedAt: string;
    vendidaAt: string | null;
}

/**
 * Variante del feed: incluye distancia precalculada en el backend con
 * `ST_Distance` sobre `ubicacion_aproximada`.
 */
export interface ArticuloFeed extends ArticuloMarketplace {
    /** Distancia en metros entre el usuario y el artículo. null si no aplica. */
    distanciaMetros: number | null;
    /** Usuarios con heartbeat activo en los últimos 2 min (Redis). */
    viendo?: number;
    /** Vistas en las últimas 24h (Redis). */
    vistas24h?: number;
}

/**
 * Respuesta del endpoint `GET /api/marketplace/feed`.
 */
export interface FeedMarketplace {
    /** Últimos 20 artículos publicados en la ciudad (orden por created_at DESC) */
    recientes: ArticuloFeed[];
    /** Top 20 artículos por proximidad (ST_Distance ASC) */
    cercanos: ArticuloFeed[];
}

/**
 * Vendedor incluido en el detalle público del artículo.
 */
export interface VendedorArticulo {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    ciudad: string | null;
    /**
     * Teléfono para abrir WhatsApp. `null` si el vendedor no completó el campo
     * en su perfil — en ese caso el FE oculta el botón WhatsApp.
     */
    telefono: string | null;
    /** ISO o formato Postgres de `usuarios.ultima_conexion`. null si no disponible. */
    ultimaConexion?: string | null;
    /** Promedio de minutos de respuesta en los últimos 30 días. null si sin datos. */
    tiempoRespuestaMinutos?: number | null;
}

/**
 * Detalle público del artículo (lo que devuelve `GET /api/marketplace/articulos/:id`).
 */
export interface ArticuloMarketplaceDetalle extends ArticuloMarketplace {
    vendedor: VendedorArticulo;
}

/**
 * Perfil público del vendedor (P3). Expuesto por
 * `GET /api/marketplace/vendedor/:usuarioId`. KPIs calculados en el backend.
 */
export interface PerfilVendedorMarketplace {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    ciudad: string | null;
    /** ISO o formato Postgres del `created_at` del usuario (cuando se registró) */
    miembroDesde: string;
    kpis: {
        publicacionesActivas: number;
        vendidos: number;
        /** String formateado del tiempo de respuesta: '<1h', '2h', '1d', '—' */
        tiempoRespuesta: string;
    };
}

/**
 * Respuesta paginada del listado de artículos de un vendedor.
 */
export interface PublicacionesDeVendedor {
    data: ArticuloMarketplace[];
    paginacion: { total: number; limit: number; offset: number };
}
