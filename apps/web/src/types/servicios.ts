/**
 * types/servicios.ts
 * ====================
 * Tipos compartidos del módulo Servicios (frontend).
 *
 * Sirven como contrato con el backend (`apps/api/src/services/servicios.service.ts`).
 * Si cambia un tipo aquí, hay que ajustar también el shape de respuesta del
 * service o vice versa.
 *
 * Doc maestro pendiente: docs/arquitectura/Servicios.md (Sprint 7).
 * Handoff de diseño: design_handoff_servicios/types.ts.
 *
 * Ubicación: apps/web/src/types/servicios.ts
 */

import type { Comentario } from './comentarios';

/** Comentario de una publicación de servicio (alias del genérico compartido). */
export type ComentarioServicio = Comentario;

export type ModoServicio = 'ofrezco' | 'solicito';

export type TipoPublicacion =
    | 'servicio-persona'
    | 'vacante-empresa'
    | 'solicito';

export type SubtipoPublicacion =
    | 'servicio-personal'
    | 'busco-empleo'
    | 'servicio-puntual'
    | 'vacante-empresa';

export type ModalidadServicio = 'presencial' | 'remoto' | 'hibrido';

export type EstadoPublicacion = 'activa' | 'pausada' | 'cerrada' | 'eliminada';

/**
 * Sprint 8 — Tipo de empleo para vacantes. Solo aplica a `tipo='vacante-empresa'`.
 *   - tiempo-completo: 40h/sem
 *   - medio-tiempo: 20h/sem
 *   - por-proyecto: plazo definido
 *   - eventual: por evento o turno
 */
export type TipoEmpleo =
    | 'tiempo-completo'
    | 'medio-tiempo'
    | 'por-proyecto'
    | 'eventual';

/**
 * Categorías del widget Clasificados v2 — set consolidado de 5 macro + Otros
 * pensado para Peñasco beta. Solo aplican a `modo='solicito'`.
 *
 *   - hogar             → plomería, electricidad, A/C, jardín, mudanzas, etc.
 *   - cuidados          → niñeras, tutorías, ancianos, mascotas
 *   - eventos           → bodas, XV, catering, fotografía, música
 *   - belleza-bienestar → estilismo, masajes, manicura, depilación
 *   - empleo            → "busco trabajo" / "busco empleado"
 *   - otros             → fallback
 *
 * En BD se guardan en lowercase kebab-case; los labels con tildes viven en
 * `apps/web/src/utils/servicios.ts` (`labelCategoria`).
 *
 * "Urgente" NO es categoría — es el boolean `urgente` que se combina con
 * cualquier categoría. "Todos" es solo un filtro UI que significa "sin filtro".
 */
export const CATEGORIAS_CLASIFICADO = [
    'hogar',
    'cuidados',
    'eventos',
    'belleza-bienestar',
    'empleo',
    'otros',
] as const;
export type CategoriaClasificado = (typeof CATEGORIAS_CLASIFICADO)[number];

/** Filtro del tag strip del widget — incluye 'todos' y 'urgente' como pseudo-categorías UI. */
export const FILTROS_CLASIFICADO = [
    'todos',
    'urgente',
    ...CATEGORIAS_CLASIFICADO,
] as const;
export type FiltroClasificado = (typeof FILTROS_CLASIFICADO)[number];

/** Discriminated union de precio (mismo shape que el backend). */
export type PrecioServicio =
    | { kind: 'fijo'; monto: number; moneda?: 'MXN' }
    | { kind: 'hora'; monto: number; moneda?: 'MXN' }
    | { kind: 'mensual'; monto: number; moneda?: 'MXN' }
    | { kind: 'rango'; min: number; max: number; moneda?: 'MXN' }
    | { kind: 'a-convenir' };

export type DiaSemanaCodigo = 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';

export interface PresupuestoServicio {
    min: number;
    max: number;
}

/**
 * Coordenada aproximada que devuelve el backend. La exacta NUNCA llega al FE.
 */
export interface UbicacionAproximada {
    lat: number;
    lng: number;
}

/**
 * Publicación tal como llega del backend en feed y listados.
 *
 * `oferente` se incluye solo en endpoints enriquecidos (detalle); el feed
 * básico puede no traerlo todavía (el FE lo enriquece con queries adicionales
 * si es necesario, o el backend lo agrega en el orden del Sprint 3+).
 */
export interface PublicacionServicio {
    id: string;
    usuarioId: string;
    /** Sprint 8 — Solo aplica a vacantes (tipo='vacante-empresa'). NULL para servicios personales. */
    sucursalId: string | null;
    // ──────────────────────────────────────────────────────────────────
    // Datos del negocio asociado (Sprint 9.3) — solo poblados cuando la
    // publicación es vacante (`sucursalId` no nulo). Los devuelve el
    // backend en endpoints del feed (`/feed`, `/feed/infinito`) vía
    // LEFT JOIN. Cards usan estos campos para mostrar logo + portada
    // del local como identidad visual de la vacante. Null para
    // servicios-persona y solicitos-persona.
    // ──────────────────────────────────────────────────────────────────
    negocioId?: string | null;
    negocioNombre?: string | null;
    negocioLogo?: string | null;
    sucursalNombre?: string | null;
    sucursalPortada?: string | null;
    sucursalFotoPerfil?: string | null;
    modo: ModoServicio;
    tipo: TipoPublicacion;
    subtipo: SubtipoPublicacion | null;
    titulo: string;
    descripcion: string;
    fotos: string[];
    fotoPortadaIndex: number;
    precio: PrecioServicio;
    modalidad: ModalidadServicio;
    ubicacionAproximada: UbicacionAproximada;
    ciudad: string;
    zonasAproximadas: string[];
    skills: string[];
    requisitos: string[];
    horario: string | null;
    diasSemana: DiaSemanaCodigo[];
    /** Sprint 8 — Solo aplica a vacantes. NULL para otros tipos. */
    tipoEmpleo: TipoEmpleo | null;
    /** Sprint 8 — Solo aplica a vacantes (max 8). Vacío para otros tipos. */
    beneficios: string[];
    presupuesto: PresupuestoServicio | null;
    /** Categoría del clasificado (solo modo='solicito'). NULL en `ofrezco`. */
    categoria: CategoriaClasificado | null;
    /** Pin al top + eyebrow rojo en el widget Clasificados. */
    urgente: boolean;
    estado: EstadoPublicacion;
    totalVistas: number;
    totalMensajes: number;
    totalGuardados: number;
    expiraAt: string;
    createdAt: string;
    updatedAt: string;
    /**
     * Oferente ligero (id/nombre/apellidos/avatar) — solo poblado en el feed
     * (`/feed`, `/feed/infinito`). NULL en endpoints que no hacen ese JOIN
     * (ej. Mis Publicaciones). Distinto de `OferenteServicio` (el objeto
     * completo del detalle, con teléfono/ultimaConexion/negocio/etc.) —
     * nombre separado para no chocar tipos entre `PublicacionServicio` y
     * `PublicacionDetalle`.
     */
    oferenteResumen: {
        id: string;
        nombre: string;
        apellidos: string;
        avatarUrl: string | null;
    } | null;
    /** Conteo de comentarios públicos — solo poblado en el feed. */
    totalComentarios: number;
}

/** Fila del feed (incluye distancia para orden cercano). */
export interface PublicacionFeed extends PublicacionServicio {
    distanciaMetros: number | null;
}

/** Datos del oferente embebidos en el detalle. */
export interface OferenteServicio {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    ciudad: string | null;
    telefono: string | null;
    ultimaConexion: string | null;
    tiempoRespuestaMinutos: number | null;
    /** Datos del negocio asociado (solo cuando la publicación es vacante-empresa). */
    negocioId?: string | null;
    negocioNombre?: string | null;
    negocioLogo?: string | null;
    sucursalNombre?: string | null;
    /** Foto de perfil de la sucursal específica (distinta al logo del negocio). */
    sucursalFotoPerfil?: string | null;
    /** WhatsApp de la sucursal específica — distinto al `telefono` del
     *  usuario dueño (campo personal). Solo se usa cuando la publicación
     *  es vacante-empresa. El FE oculta el botón WhatsApp si es null. */
    sucursalWhatsapp?: string | null;
    /** Portada del local (foto grande de la sucursal) — usada como hero en
     *  el detalle de vacante-empresa. */
    sucursalPortada?: string | null;
    /** Si la sucursal es la principal ("Matriz") del negocio. */
    sucursalEsPrincipal?: boolean | null;
    /** Total de sucursales activas del negocio (0 si no hay negocio asociado). */
    totalSucursales?: number;
}

/** Detalle completo: publicación + oferente. */
export interface PublicacionDetalle extends PublicacionServicio {
    oferente: OferenteServicio;
    /** Ubicación EXACTA del local (sin offset). Sprint 9.3: solo viene
     *  del backend cuando `tipo === 'vacante-empresa'` — los negocios son
     *  entidades verificadas y su dirección ya es pública en la sección
     *  Negocios. Para servicios-persona y solicitudes-de-persona es
     *  `undefined` y la UI cae a `ubicacionAproximada` (círculo 500m). */
    ubicacionExacta?: { lat: number; lng: number };
    /** Sprint 9.3: true si el usuario actual tiene esta publicación en
     *  sus guardados. false para visitantes anónimos o sin guardar. Lo
     *  usa el bookmark del detalle para arrancar con el estado real. */
    guardado: boolean;
}

/** Respuesta del endpoint `/feed`. */
export interface FeedServicios {
    /** Recientes también traen `distanciaMetros` (Sprint 9.3) — el
     *  backend la calcula con `ST_Distance` para que el carrusel pueda
     *  mostrar el badge de distancia sobre la foto, igual que cercanos. */
    recientes: PublicacionFeed[];
    cercanos: PublicacionFeed[];
}

/** Respuesta del endpoint `/feed/infinito` (paginado). */
export interface RespuestaFeedInfinito {
    items: PublicacionFeed[];
    paginacion: {
        pagina: number;
        limite: number;
        total: number;
        totalPaginas: number;
        hayMas: boolean;
    };
}

// =============================================================================
// PERFIL PRESTADOR + RESEÑAS (Sprint 5)
// =============================================================================

/** Perfil base del prestador con KPIs agregados. */
export interface PerfilPrestador {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    ciudad: string | null;
    /** ISO de cuando se unió a AnunciaYA. */
    miembroDesde: string;
    /** Última conexión — null si nunca se logueó. */
    ultimaConexion: string | null;
    /** AVG de ratings recibidos. Null si no tiene reseñas. */
    ratingPromedio: number | null;
    /** Total de reseñas recibidas (no soft-deleted). */
    totalResenas: number;
    /** Total de publicaciones activas (estado='activa'). */
    totalPublicacionesActivas: number;
    /** Mediana del tiempo de respuesta en minutos (null hasta que un cron
     *  mensual lo calcule desde `chat_mensajes`). */
    tiempoRespuestaMinutos: number | null;
}

/** Reseña con autor embebido (para mostrar en la lista del perfil). */
export interface ResenaServicio {
    id: string;
    publicacionId: string;
    publicacionTitulo: string | null;
    autor: {
        id: string;
        nombre: string;
        apellidos: string;
        avatarUrl: string | null;
    };
    /** 1–5. */
    rating: number;
    texto: string | null;
    createdAt: string;
}

/** Orden del feed infinito. */
export type OrdenFeedInfinito = 'recientes' | 'cerca';

/** Filtros del buscador (URL state). Sprint 6. */
export interface FiltrosBusquedaServicios {
    q?: string;
    modo?: ModoServicio;
    tipo?: TipoPublicacion[];
    modalidad?: ModalidadServicio[];
    distanciaKm?: number;
    precioMin?: number;
    precioMax?: number;
}

/**
 * Sugerencia individual del overlay del buscador. Devuelta por
 * `GET /api/servicios/buscar/sugerencias`. Top 5 publicaciones activas en la
 * ciudad cuyo título/descripción/skills/requisitos matcheen el query.
 */
export interface SugerenciaServicio {
    publicacionId: string;
    titulo: string;
    fotos: string[];
    fotoPortadaIndex: number;
    precio: PrecioServicio;
    modalidad: ModalidadServicio;
    modo: ModoServicio;
    tipo: TipoPublicacion;
    ciudad: string;
    oferenteNombre: string;
    oferenteApellidos: string;
    oferenteAvatarUrl: string | null;
    // ── Datos del negocio (cuando la publicación está asociada a una
    //    sucursal — típicamente `tipo='vacante-empresa'`). NULL si es
    //    publicación personal (servicio-persona o solicito). ────────────
    negocioNombre: string | null;
    sucursalNombre: string | null;
    /** `true` si la sucursal de esta publicación es la Matriz del negocio. */
    esPrincipal: boolean;
    /** Total de sucursales activas del negocio (0 si no hay negocio asociado). */
    totalSucursales: number;
}

// =============================================================================
// VACANTES — Business Studio (Sprint 8)
// =============================================================================

/**
 * Vacante tal como llega de los endpoints de BS. Extiende PublicacionServicio
 * con `sucursalNombre` denormalizado (viene del JOIN con negocio_sucursales).
 */
export interface Vacante extends PublicacionServicio {
    /** Nombre denormalizado de la sucursal — JOIN del backend. */
    sucursalNombre: string | null;
}

/** KPIs del dashboard de Vacantes (4 cards arriba). */
export interface KpisVacantes {
    total: number;
    activas: number;
    /** Estado='activa' AND expira_at <= NOW() + 5 días. */
    porExpirar: number;
    /** Suma de total_mensajes de no-eliminadas. */
    conversaciones: number;
}

/** Payload para crear una vacante desde BS. */
export interface CrearVacanteInput {
    sucursalId: string;
    titulo: string;
    descripcion: string;
    tipoEmpleo: TipoEmpleo;
    modalidad: ModalidadServicio;
    precio: PrecioServicio;
    requisitos: string[];
    beneficios?: string[];
    horario?: string;
    diasSemana?: DiaSemanaCodigo[];
    latitud: number;
    longitud: number;
    ciudad: string;
    zonasAproximadas?: string[];
    confirmaciones: {
        legal: boolean;
        verdadera: boolean;
        coordinacion: boolean;
        version: string;
    };
}

/** Payload para actualizar una vacante existente desde BS (update parcial). */
export type ActualizarVacanteInput = Partial<
    Omit<CrearVacanteInput, 'confirmaciones'>
>;

/** Respuesta paginada del listado de vacantes. */
export interface RespuestaVacantes {
    data: Vacante[];
    paginacion: {
        limit: number;
        offset: number;
        total: number;
    };
}
