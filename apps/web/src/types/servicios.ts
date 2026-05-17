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

export type EstadoPublicacion = 'activa' | 'pausada' | 'eliminada';

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
}

/** Detalle completo: publicación + oferente. */
export interface PublicacionDetalle extends PublicacionServicio {
    oferente: OferenteServicio;
}

/** Respuesta del endpoint `/feed`. */
export interface FeedServicios {
    recientes: PublicacionServicio[];
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

/** Q&A — pregunta visible en el detalle. */
export interface PreguntaServicio {
    id: string;
    publicacionId: string;
    autor: {
        id: string;
        nombre: string;
        apellidos: string;
        avatarUrl: string | null;
    };
    pregunta: string;
    respuesta: string | null;
    respondidaAt: string | null;
    editadaAt: string | null;
    createdAt: string;
    /** Solo true para el autor y el dueño cuando la pregunta no tiene respuesta. */
    pendiente: boolean;
}

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
}
