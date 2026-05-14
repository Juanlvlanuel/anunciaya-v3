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
    /**
     * Condición opcional desde 2026-05-13. NULL = no aplica (productos
     * consumibles, hechos a mano nuevos, etc.). Cuando es NULL, ni el card
     * ni el detalle muestran ninguna etiqueta de condición.
     */
    condicion: CondicionArticulo | null;
    /**
     * "Acepta ofertas" opcional desde 2026-05-13. NULL = no especificado
     * (no se muestra nada). true/false = decisión explícita del vendedor.
     */
    aceptaOfertas: boolean | null;
    /**
     * Unidad de venta opcional (c/u, por kg, por docena, por litro, por
     * metro, por porción, texto libre). Cuando existe, el card y el detalle
     * muestran "$15 c/u" en lugar de solo "$15".
     */
    unidadVenta: string | null;
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
    /**
     * True si el usuario autenticado tiene este artículo en Mis Guardados.
     * El backend lo agrega cuando el endpoint corre con sesión válida
     * (feed infinito, publicaciones del vendedor). Sin sesión = false.
     */
    guardado?: boolean;
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
    /** Preguntas con respuesta visible públicamente (Sprint 9.2). */
    totalPreguntasRespondidas?: number;
}

/**
 * Una pregunta sobre un artículo (vista pública o del vendedor).
 * - Vista pública: solo preguntas con `respondidaAt != null`.
 * - Vista vendedor: pendientes (`respuesta == null`) + respondidas.
 */
export interface PreguntaMarketplace {
    id: string;
    /** UUID del comprador — necesario para BotonComentarista (P3 navegación). */
    compradorId: string;
    /** Nombre completo (no anonimizado) — antes era "Nombre I." */
    compradorNombre: string;
    /** Apellidos completos del comprador. */
    compradorApellidos: string;
    /** URL del avatar (puede ser null si el comprador no subió foto). */
    compradorAvatarUrl: string | null;
    pregunta: string;
    respuesta: string | null;
    respondidaAt: string | null;
    /** Timestamp de la última edición (null si nunca se editó). */
    editadaAt: string | null;
    createdAt: string;
}

export interface PreguntasParaVendedor {
    pendientes: PreguntaMarketplace[];
    respondidas: PreguntaMarketplace[];
}

/**
 * Pregunta pendiente del propio comprador autenticado en un artículo —
 * se muestra en la vista visitante para que el usuario sepa que su pregunta
 * está esperando respuesta y pueda retirarla. Distinto de los datos públicos
 * porque incluye solo lo necesario para el bloque inline.
 */
export interface MiPreguntaPendiente {
    id: string;
    pregunta: string;
    createdAt: string;
}

/**
 * Respuesta del endpoint cuando el visitante NO es dueño:
 * - `preguntas`: TODAS las preguntas activas (respondidas + pendientes),
 *   con datos completos del comprador (id, nombre, apellidos, avatarUrl)
 *   para renderizar avatar + nombre clickeable hacia el perfil P3
 *   (mismo patrón que el feed).
 * - `miPreguntaPendiente`: pregunta del propio usuario aún sin respuesta,
 *   o `null` si no está autenticado o no ha preguntado. Se conserva
 *   principalmente para saber si ocultar el botón "Hacer una pregunta"
 *   (evita duplicados — el backend rechaza con 409).
 */
export interface PreguntasVisitante {
    preguntas: PreguntaMarketplace[];
    miPreguntaPendiente: MiPreguntaPendiente | null;
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
    /** Teléfono para CTA WhatsApp en P3. null si el vendedor no lo registró. */
    telefono: string | null;
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

// =============================================================================
// FEED INFINITO (rediseño v1.2 — estilo Facebook)
// =============================================================================

/** Datos del vendedor incluidos en cada card del feed infinito. */
export interface VendedorEnFeed {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
}

/**
 * Pregunta inline en la card del feed.
 * Si `respuesta` y `respondidaAt` son null → pregunta pendiente (visible
 * públicamente con indicador "Pendiente de respuesta").
 * Si `editadaAt` != null → la pregunta fue editada por el comprador, mostrar
 * marca "(editada)" junto al nombre.
 */
export interface PreguntaInlineFeed {
    id: string;
    pregunta: string;
    respuesta: string | null;
    respondidaAt: string | null;
    editadaAt: string | null;
    createdAt: string;
    comprador: {
        id: string;
        nombre: string;
        apellidos: string;
        avatarUrl: string | null;
    };
}

/**
 * Artículo del feed infinito — extiende `ArticuloFeed` con los datos del
 * vendedor y todas las preguntas del artículo (respondidas + pendientes),
 * respondidas primero, sin límite.
 */
export interface ArticuloFeedInfinito extends ArticuloFeed {
    vendedor: VendedorEnFeed;
    /**
     * Todas las preguntas del artículo, respondidas primero. Pendientes con
     * `respuesta=null`. Vacío si el artículo no tiene preguntas.
     */
    topPreguntas: PreguntaInlineFeed[];
    /**
     * Si el usuario actual tiene este artículo en sus guardados. False si no
     * hay sesión. Permite que el corazón se vea relleno al cargar la página.
     */
    guardado: boolean;
}

/** Filtros disponibles en el feed infinito. */
export type OrdenFeedInfinito = 'recientes' | 'vistos' | 'cerca';

/** Respuesta paginada del endpoint `GET /api/marketplace/feed/infinito`. */
export interface RespuestaFeedInfinito {
    articulos: ArticuloFeedInfinito[];
    pagina: number;
    limite: number;
    /** true si existe al menos una página más después de la actual. */
    hayMas: boolean;
}
