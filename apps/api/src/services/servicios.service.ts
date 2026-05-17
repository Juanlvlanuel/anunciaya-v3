/**
 * ============================================================================
 * SERVICIOS SERVICE — Sección pública Servicios (Sprint 1)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/servicios.service.ts
 *
 * PROPÓSITO:
 * Lógica de negocio del módulo Servicios v1. CRUD principal + feed + detalle +
 * mis-publicaciones + cambio de estado + soft delete + registrar vista +
 * presigned R2.
 *
 * Q&A vive en `services/servicios/preguntas.ts` (mismo patrón que MarketPlace).
 * Filtros de moderación llegarán en Sprint 4. Buscador en Sprint 6. Cron en
 * Sprint 7. Reseñas en Sprint 5.
 *
 * Doc maestro pendiente: docs/arquitectura/Servicios.md (Sprint 7 al cierre).
 * Migraciones: docs/migraciones/2026-05-15-servicios-base.sql.
 * Patrón calcado de: apps/api/src/services/marketplace.service.ts.
 *
 * Reglas críticas (NO romper):
 * - `ubicacion` (real) NUNCA se devuelve al frontend.
 * - `ubicacion_aproximada` se calcula al crear (offset uniforme en 500m) y
 *   queda fija. NO se recalcula en cada consulta.
 * - `expira_at` se setea SOLO al crear (NOW() + 30 días). UPDATE general NO la
 *   modifica; solo `/reactivar` (Sprint 7) lo puede modificar.
 * - `estado` sin 'vendida' — un servicio no se agota. Solo activa | pausada |
 *   eliminada (soft).
 * - Las fotos huérfanas se borran de R2 con `eliminarFotoServicioSiHuerfana`.
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { serviciosPublicaciones } from '../db/schemas/schema.js';
import { eliminarArchivo, generarPresignedUrl } from './r2.service.js';
import { aleatorizarCoordenada } from '../utils/aleatorizarUbicacion.js';
import type {
    CrearPublicacionInput,
    ActualizarPublicacionInput,
    PrecioInput,
} from '../validations/servicios.schema.js';
import { CATEGORIAS_CLASIFICADO } from '../validations/servicios.schema.js';

// =============================================================================
// TIPOS DE RESPUESTA
// =============================================================================

type Modo = 'ofrezco' | 'solicito';
type Tipo = 'servicio-persona' | 'vacante-empresa' | 'solicito';
type Modalidad = 'presencial' | 'remoto' | 'hibrido';
type Estado = 'activa' | 'pausada' | 'eliminada';
type CategoriaClasificado = (typeof CATEGORIAS_CLASIFICADO)[number];

interface PresupuestoJSON {
    min: number;
    max: number;
}

export interface PublicacionRow {
    id: string;
    usuarioId: string;
    modo: Modo;
    tipo: Tipo;
    subtipo: string | null;
    titulo: string;
    descripcion: string;
    fotos: string[];
    fotoPortadaIndex: number;
    precio: PrecioInput;
    modalidad: Modalidad;
    ubicacionAproximada: { lat: number; lng: number };
    ciudad: string;
    zonasAproximadas: string[];
    skills: string[];
    requisitos: string[];
    horario: string | null;
    diasSemana: string[];
    presupuesto: PresupuestoJSON | null;
    /** Categoría del clasificado (solo modo='solicito'). NULL en `ofrezco`. */
    categoria: CategoriaClasificado | null;
    /** Pin al top + eyebrow rojo en el widget Clasificados. */
    urgente: boolean;
    estado: Estado;
    totalVistas: number;
    totalMensajes: number;
    totalGuardados: number;
    expiraAt: string;
    createdAt: string;
    updatedAt: string;
}

export interface PublicacionConOferenteRow extends PublicacionRow {
    oferente: {
        id: string;
        nombre: string;
        apellidos: string;
        avatarUrl: string | null;
        ciudad: string | null;
        /** Nullable: el FE oculta el botón WhatsApp si es null. */
        telefono: string | null;
        ultimaConexion: string | null;
        tiempoRespuestaMinutos: number | null;
    };
}

export interface PublicacionFeedRow extends PublicacionRow {
    distanciaMetros: number | null;
}

// Intersección con Record<string, unknown> para satisfacer el constraint de
// `db.execute<T>` (que exige `Record<string, unknown>`). Los campos
// declarados conservan su tipado estricto; el index signature solo deja pasar
// accesos a propiedades dinámicas como `unknown` (útil para campos extra que
// los SELECT enriquecidos agreguen al vuelo).
type RawPublicacionDb = {
    id: string;
    usuario_id: string;
    modo: string;
    tipo: string;
    subtipo: string | null;
    titulo: string;
    descripcion: string;
    fotos: string[];
    foto_portada_index: number;
    precio: PrecioInput;
    modalidad: string;
    lat: number;
    lng: number;
    ciudad: string;
    zonas_aproximadas: string[];
    skills: string[];
    requisitos: string[];
    horario: string | null;
    dias_semana: string[];
    presupuesto: PresupuestoJSON | null;
    categoria: string | null;
    urgente: boolean;
    estado: string;
    total_vistas: number;
    total_mensajes: number;
    total_guardados: number;
    expira_at: string;
    created_at: string;
    updated_at: string;
} & Record<string, unknown>;

// =============================================================================
// HELPER: Eliminar foto de R2 si está huérfana
// =============================================================================

/**
 * Las fotos de Servicios viven solo en `servicios_publicaciones.fotos`. NO se
 * comparten con otras tablas. Mismo patrón que `eliminarFotoMarketplaceSiHuerfana`.
 *
 * Útil al editar (`actualizarPublicacion`) cuando el usuario remueve una foto
 * de su array. NO se llama en `eliminarPublicacion` (soft delete) porque el
 * reconcile global de R2 hará la limpieza eventual.
 *
 * @param url - URL de la foto a evaluar
 * @param excluirPublicacionId - UUID de la publicación que está editando
 */
export async function eliminarFotoServicioSiHuerfana(
    url: string,
    excluirPublicacionId?: string
): Promise<void> {
    try {
        const filtroExcluir = excluirPublicacionId
            ? sql`AND id != ${excluirPublicacionId}`
            : sql``;

        const [{ total }] = await db
            .select({ total: sql<number>`COUNT(*)::int` })
            .from(serviciosPublicaciones)
            .where(
                sql`${url} = ANY(ARRAY(SELECT jsonb_array_elements_text(fotos))) ${filtroExcluir}`
            );

        if (total > 0) {
            console.log(
                `ℹ️ Foto Servicios conservada (usada por ${total} publicación/es): ${url}`
            );
            return;
        }

        await eliminarArchivo(url);
    } catch (error) {
        console.error('Error procesando foto Servicios huérfana:', error);
        // No re-lanzar: la limpieza de R2 es best-effort.
    }
}

// =============================================================================
// HELPER INTERNO: Serializar array JS → literal PostgreSQL
// =============================================================================
//
// Drizzle no serializa correctamente arrays JS VACÍOS como parámetros — genera
// `()` (placeholder vacío) que PostgreSQL rechaza con syntax error. Convertir
// el array a literal en JS y pasarlo como string SÍ funciona — PostgreSQL hace
// el cast a `text[]`/`varchar[]` con `::`.
//
//   pgArrayLiteral([])              → '{}'
//   pgArrayLiteral(['Centro'])      → '{"Centro"}'
//   pgArrayLiteral(['a"b', 'c\\d']) → '{"a\\"b","c\\\\d"}'

export function pgArrayLiteral(arr: readonly string[]): string {
    if (arr.length === 0) return '{}';
    const escapados = arr.map((s) => {
        const esc = s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        return `"${esc}"`;
    });
    return '{' + escapados.join(',') + '}';
}

// =============================================================================
// HELPER INTERNO: Mapear fila SQL (snake_case + PostGIS) → PublicacionRow
// =============================================================================

function mapearPublicacion(row: RawPublicacionDb): PublicacionRow {
    return {
        id: row.id,
        usuarioId: row.usuario_id,
        modo: row.modo as Modo,
        tipo: row.tipo as Tipo,
        subtipo: row.subtipo,
        titulo: row.titulo,
        descripcion: row.descripcion,
        fotos: row.fotos ?? [],
        fotoPortadaIndex: row.foto_portada_index,
        precio: row.precio,
        modalidad: row.modalidad as Modalidad,
        ubicacionAproximada: { lat: row.lat, lng: row.lng },
        ciudad: row.ciudad,
        zonasAproximadas: row.zonas_aproximadas ?? [],
        skills: row.skills ?? [],
        requisitos: row.requisitos ?? [],
        horario: row.horario,
        diasSemana: row.dias_semana ?? [],
        presupuesto: row.presupuesto,
        categoria: row.categoria as CategoriaClasificado | null,
        urgente: row.urgente ?? false,
        estado: row.estado as Estado,
        totalVistas: row.total_vistas,
        totalMensajes: row.total_mensajes,
        totalGuardados: row.total_guardados,
        expiraAt: row.expira_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// =============================================================================
// SELECT base — extrae lat/lng de geography(Point) con ST_X/ST_Y
// =============================================================================
//
// Drizzle no puede emitir ST_X/ST_Y, por eso usamos SQL crudo en todas las
// queries. La columna `ubicacion` (privada) NUNCA se incluye en el SELECT.
//
// Prefijo `sp.` obligatorio: el detalle hace `INNER JOIN usuarios u` y sin
// alias las columnas `id`, `usuario_id`, `ciudad`, etc. quedarían ambiguas.
// Todas las queries SELECT abajo usan `FROM servicios_publicaciones sp`.

const COLUMNAS_PUBLICACION = sql`
    sp.id,
    sp.usuario_id,
    sp.modo,
    sp.tipo,
    sp.subtipo,
    sp.titulo,
    sp.descripcion,
    sp.fotos,
    sp.foto_portada_index,
    sp.precio,
    sp.modalidad,
    ST_X(sp.ubicacion_aproximada::geometry) AS lng,
    ST_Y(sp.ubicacion_aproximada::geometry) AS lat,
    sp.ciudad,
    sp.zonas_aproximadas,
    sp.skills,
    sp.requisitos,
    sp.horario,
    sp.dias_semana,
    sp.presupuesto,
    sp.categoria,
    sp.urgente,
    sp.estado,
    sp.total_vistas,
    sp.total_mensajes,
    sp.total_guardados,
    sp.expira_at,
    sp.created_at,
    sp.updated_at
`;

// =============================================================================
// MODERACIÓN PASIVA — detecta señales de sección equivocada
// =============================================================================
//
// Heurística simple basada en palabras clave del título + descripción. Si
// detecta señal fuerte, retorna la sección sugerida. El frontend muestra un
// modal "¿Lo publicarías mejor en X?" — si el usuario insiste, reenvía con
// `confirmadoPorUsuario=true` y se publica tal como está.
//
// Sprint 7.7. Heurística básica que se puede ampliar con un clasificador
// más sofisticado más adelante.

export type SeccionSugerida = 'marketplace';

const REGEX_VENTA_ARTICULO =
    /\b(vendo|vendido|venta|remato|cambio por|cambio x)\b/i;

export function detectarSugerenciaSeccion(
    titulo: string,
    descripcion: string,
): SeccionSugerida | null {
    const texto = `${titulo} ${descripcion}`.toLowerCase();
    // "vendo iPhone", "remato tele", "cambio bici por...". Servicios es para
    // contratar a alguien o pedir un servicio, no para vender objetos.
    if (REGEX_VENTA_ARTICULO.test(texto)) {
        return 'marketplace';
    }
    return null;
}

// =============================================================================
// CREAR PUBLICACIÓN
// =============================================================================

/**
 * Crea una nueva publicación de Servicios.
 *
 * - `expira_at` = NOW() + 30 días (cron del Sprint 7 auto-pausa)
 * - `ubicacion`            = punto exacto recibido (privado — NUNCA se devuelve)
 * - `ubicacion_aproximada` = punto aleatorizado dentro de 500m (público)
 *
 * MODERACIÓN: difiere a Sprint 4 — aquí solo confiamos en la validación de Zod.
 *
 * @param usuarioId - UUID del usuario en modo Personal (validado por middleware)
 * @param datos     - Payload validado por `crearPublicacionSchema`
 */
export async function crearPublicacion(
    usuarioId: string,
    datos: CrearPublicacionInput
) {
    try {
        // 0. Moderación pasiva — detectar señales de "esto no parece servicio"
        //    en titulo + descripcion y devolver 409 con sugerencia si el
        //    usuario no confirmó. Patrón calcado de MarketPlace.
        if (!datos.confirmadoPorUsuario) {
            const sugerencia = detectarSugerenciaSeccion(
                datos.titulo,
                datos.descripcion,
            );
            if (sugerencia) {
                return {
                    success: false as const,
                    code: 409,
                    message:
                        'Lo que describes parece encajar mejor en otra sección de AnunciaYA.',
                    sugerencia,
                };
            }
        }

        // 1. Aleatorizar coordenada para `ubicacion_aproximada`.
        const aprox = aleatorizarCoordenada(datos.latitud, datos.longitud);

        // 2. Calcular `expira_at` = NOW() + 30 días en UTC.
        const expiraAt = new Date();
        expiraAt.setUTCDate(expiraAt.getUTCDate() + 30);

        // 3. Inyectar `aceptadasAt` (timestamp confiable, no lo manda el cliente)
        //    al snapshot de confirmaciones.
        const confirmacionesConTimestamp = {
            ...datos.confirmaciones,
            aceptadasAt: new Date().toISOString(),
        };

        // 4. INSERT con SQL crudo (necesario para geography(POINT, 4326)).
        const resultado = await db.execute<{ id: string }>(sql`
            INSERT INTO servicios_publicaciones (
                usuario_id,
                modo,
                tipo,
                subtipo,
                titulo,
                descripcion,
                fotos,
                foto_portada_index,
                precio,
                modalidad,
                ubicacion,
                ubicacion_aproximada,
                ciudad,
                zonas_aproximadas,
                skills,
                requisitos,
                horario,
                dias_semana,
                presupuesto,
                categoria,
                urgente,
                confirmaciones,
                expira_at
            ) VALUES (
                ${usuarioId},
                ${datos.modo},
                ${datos.tipo},
                ${datos.subtipo ?? null},
                ${datos.titulo},
                ${datos.descripcion},
                ${JSON.stringify(datos.fotos)}::jsonb,
                ${datos.fotoPortadaIndex},
                ${JSON.stringify(datos.precio)}::jsonb,
                ${datos.modalidad},
                ST_SetSRID(ST_MakePoint(${datos.longitud}, ${datos.latitud}), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${aprox.lng}, ${aprox.lat}), 4326)::geography,
                ${datos.ciudad},
                ${pgArrayLiteral(datos.zonasAproximadas)}::varchar[],
                ${pgArrayLiteral(datos.skills)}::text[],
                ${pgArrayLiteral(datos.requisitos)}::text[],
                ${datos.horario ?? null},
                ${pgArrayLiteral(datos.diasSemana)}::varchar[],
                ${datos.presupuesto ? JSON.stringify(datos.presupuesto) : null}::jsonb,
                ${datos.categoria ?? null},
                ${datos.urgente ?? false},
                ${JSON.stringify(confirmacionesConTimestamp)}::jsonb,
                ${expiraAt.toISOString()}
            )
            RETURNING id
        `);

        const id = (resultado.rows[0] as { id: string }).id;
        return { success: true as const, code: 201, data: { id } };
    } catch (error) {
        console.error('Error en crearPublicacion:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos crear la publicación. Intenta de nuevo.',
        };
    }
}

// =============================================================================
// OBTENER PUBLICACIÓN POR ID (detalle)
// =============================================================================

/**
 * Devuelve la publicación con datos del oferente embebidos. La columna privada
 * `ubicacion` NO se incluye — solo `ubicacion_aproximada` mapeada a lat/lng.
 *
 * Visible para todos: activa | pausada. NO visible: eliminada.
 * El controller decide si bloquea el contacto cuando está pausada.
 */
export async function obtenerPublicacionPorId(publicacionId: string) {
    try {
        const resultado = await db.execute<RawPublicacionDb & {
            oferente_id: string;
            oferente_nombre: string;
            oferente_apellidos: string;
            oferente_avatar_url: string | null;
            oferente_ciudad: string | null;
            oferente_telefono: string | null;
            oferente_ultima_conexion: string | null;
        }>(sql`
            SELECT
                ${COLUMNAS_PUBLICACION},
                u.id              AS oferente_id,
                u.nombre          AS oferente_nombre,
                u.apellidos       AS oferente_apellidos,
                u.avatar_url      AS oferente_avatar_url,
                u.ciudad          AS oferente_ciudad,
                u.telefono        AS oferente_telefono,
                u.ultima_conexion AS oferente_ultima_conexion
            FROM servicios_publicaciones sp
            INNER JOIN usuarios u ON u.id = sp.usuario_id
            WHERE sp.id = ${publicacionId}
              AND sp.estado != 'eliminada'
              AND sp.deleted_at IS NULL
            LIMIT 1
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos esta publicación. Pudo haberse eliminado.',
            };
        }

        const row = resultado.rows[0] as RawPublicacionDb & {
            oferente_id: string;
            oferente_nombre: string;
            oferente_apellidos: string;
            oferente_avatar_url: string | null;
            oferente_ciudad: string | null;
            oferente_telefono: string | null;
            oferente_ultima_conexion: string | null;
        };

        const base = mapearPublicacion(row);
        const data: PublicacionConOferenteRow = {
            ...base,
            oferente: {
                id: row.oferente_id,
                nombre: row.oferente_nombre,
                apellidos: row.oferente_apellidos,
                avatarUrl: row.oferente_avatar_url,
                ciudad: row.oferente_ciudad,
                telefono: row.oferente_telefono,
                ultimaConexion: row.oferente_ultima_conexion,
                tiempoRespuestaMinutos: null,
            },
        };

        return { success: true as const, code: 200, data };
    } catch (error) {
        console.error('Error en obtenerPublicacionPorId:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar la publicación.',
        };
    }
}

// =============================================================================
// FEED — Recientes + Cercanos
// =============================================================================

interface OpcionesFeed {
    ciudad: string;
    lat: number;
    lng: number;
    modo?: Modo;
}

/**
 * Devuelve `{ recientes, cercanos }` para el feed inicial. Solo `estado='activa'`.
 *
 * Recientes: últimos 10 por created_at desc en la ciudad (sin filtro de distancia).
 * Cercanos:  primeros 20 por ST_Distance asc desde (lat, lng) del usuario.
 *
 * Si se pasa `modo`, se filtra; sin él devuelve mezcla.
 */
export async function obtenerFeed(opciones: OpcionesFeed) {
    try {
        const { ciudad, lat, lng, modo } = opciones;
        const filtroModo = modo ? sql`AND sp.modo = ${modo}` : sql``;

        // ── Recientes ────────────────────────────────────────────────────
        const recientesRes = await db.execute<RawPublicacionDb>(sql`
            SELECT ${COLUMNAS_PUBLICACION}
            FROM servicios_publicaciones sp
            WHERE sp.estado = 'activa'
              AND sp.deleted_at IS NULL
              AND sp.ciudad = ${ciudad}
              ${filtroModo}
            ORDER BY sp.created_at DESC
            LIMIT 10
        `);

        // ── Cercanos ─────────────────────────────────────────────────────
        // ST_DWithin con radio amplio (50 km) para limitar candidatos; orden
        // exacto por ST_Distance ascendente.
        const cercanosRes = await db.execute<RawPublicacionDb & { dist_m: number }>(sql`
            SELECT
                ${COLUMNAS_PUBLICACION},
                ST_Distance(
                    sp.ubicacion_aproximada::geography,
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
                ) AS dist_m
            FROM servicios_publicaciones sp
            WHERE sp.estado = 'activa'
              AND sp.deleted_at IS NULL
              AND sp.ciudad = ${ciudad}
              ${filtroModo}
              AND ST_DWithin(
                  sp.ubicacion_aproximada::geography,
                  ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
                  50000
              )
            ORDER BY dist_m ASC
            LIMIT 20
        `);

        const recientes = (recientesRes.rows as RawPublicacionDb[]).map(mapearPublicacion);
        const cercanos: PublicacionFeedRow[] = (
            cercanosRes.rows as Array<RawPublicacionDb & { dist_m: number }>
        ).map((r) => ({
            ...mapearPublicacion(r),
            distanciaMetros: Math.round(r.dist_m),
        }));

        return {
            success: true as const,
            code: 200,
            data: { recientes, cercanos },
        };
    } catch (error) {
        console.error('Error en obtenerFeed:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar el feed.',
        };
    }
}

// =============================================================================
// FEED INFINITO — Paginado estilo Facebook
// =============================================================================

interface OpcionesFeedInfinito {
    ciudad: string;
    lat: number;
    lng: number;
    modo?: Modo;
    tipo?: Tipo;
    modalidad?: Modalidad;
    /** Categoría de clasificado — solo aplica si `modo='solicito'`. */
    categoria?: string;
    /** Si true, devuelve solo pedidos urgentes. Se combina con `modo='solicito'`. */
    soloUrgente?: boolean;
    orden: 'recientes' | 'cerca';
    pagina: number;
    limite: number;
}

export async function obtenerFeedInfinito(opciones: OpcionesFeedInfinito) {
    try {
        const {
            ciudad,
            lat,
            lng,
            modo,
            tipo,
            modalidad,
            categoria,
            soloUrgente,
            orden,
            pagina,
            limite,
        } = opciones;
        const offset = (pagina - 1) * limite;

        const filtroModo = modo ? sql`AND sp.modo = ${modo}` : sql``;
        const filtroTipo = tipo ? sql`AND sp.tipo = ${tipo}` : sql``;
        const filtroModalidad = modalidad ? sql`AND sp.modalidad = ${modalidad}` : sql``;
        const filtroCategoria = categoria ? sql`AND sp.categoria = ${categoria}` : sql``;
        const filtroUrgente = soloUrgente ? sql`AND sp.urgente = true` : sql``;

        // Para Clasificados (modo='solicito') aprovechamos el índice parcial
        // `idx_servicios_pub_solicito_urgente`: urgentes primero, luego fecha.
        // Para el resto del feed mantenemos el orden simple por created_at.
        const ordenSql =
            orden === 'cerca'
                ? sql`ORDER BY ST_Distance(sp.ubicacion_aproximada::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) ASC`
                : modo === 'solicito'
                  ? sql`ORDER BY sp.urgente DESC, sp.created_at DESC`
                  : sql`ORDER BY sp.created_at DESC`;

        const filasRes = await db.execute<RawPublicacionDb & { dist_m: number }>(sql`
            SELECT
                ${COLUMNAS_PUBLICACION},
                ST_Distance(
                    sp.ubicacion_aproximada::geography,
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
                ) AS dist_m
            FROM servicios_publicaciones sp
            WHERE sp.estado = 'activa'
              AND sp.deleted_at IS NULL
              AND sp.ciudad = ${ciudad}
              ${filtroModo}
              ${filtroTipo}
              ${filtroModalidad}
              ${filtroCategoria}
              ${filtroUrgente}
            ${ordenSql}
            LIMIT ${limite}
            OFFSET ${offset}
        `);

        const [{ total }] = (await db.execute<{ total: number }>(sql`
            SELECT COUNT(*)::int AS total
            FROM servicios_publicaciones sp
            WHERE sp.estado = 'activa'
              AND sp.deleted_at IS NULL
              AND sp.ciudad = ${ciudad}
              ${filtroModo}
              ${filtroTipo}
              ${filtroModalidad}
              ${filtroCategoria}
              ${filtroUrgente}
        `)).rows as Array<{ total: number }>;

        const items: PublicacionFeedRow[] = (
            filasRes.rows as Array<RawPublicacionDb & { dist_m: number }>
        ).map((r) => ({
            ...mapearPublicacion(r),
            distanciaMetros: Math.round(r.dist_m),
        }));

        return {
            success: true as const,
            code: 200,
            data: {
                items,
                paginacion: {
                    pagina,
                    limite,
                    total,
                    totalPaginas: Math.ceil(total / limite),
                    hayMas: offset + items.length < total,
                },
            },
        };
    } catch (error) {
        console.error('Error en obtenerFeedInfinito:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar el feed.',
        };
    }
}

// =============================================================================
// MIS PUBLICACIONES (panel del oferente)
// =============================================================================

interface OpcionesMisPublicaciones {
    estado?: 'activa' | 'pausada';
    limit: number;
    offset: number;
}

export async function obtenerMisPublicaciones(
    usuarioId: string,
    opciones: OpcionesMisPublicaciones
) {
    try {
        const { estado, limit, offset } = opciones;
        const filtroEstado = estado
            ? sql`AND sp.estado = ${estado}`
            : sql`AND sp.estado IN ('activa', 'pausada')`;

        const filasRes = await db.execute<RawPublicacionDb>(sql`
            SELECT ${COLUMNAS_PUBLICACION}
            FROM servicios_publicaciones sp
            WHERE sp.usuario_id = ${usuarioId}
              AND sp.deleted_at IS NULL
              ${filtroEstado}
            ORDER BY sp.created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
        `);

        const [{ total }] = (await db.execute<{ total: number }>(sql`
            SELECT COUNT(*)::int AS total
            FROM servicios_publicaciones sp
            WHERE sp.usuario_id = ${usuarioId}
              AND sp.deleted_at IS NULL
              ${filtroEstado}
        `)).rows as Array<{ total: number }>;

        const data = (filasRes.rows as RawPublicacionDb[]).map(mapearPublicacion);

        return {
            success: true as const,
            code: 200,
            data,
            paginacion: { limit, offset, total },
        };
    } catch (error) {
        console.error('Error en obtenerMisPublicaciones:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar tus publicaciones.',
        };
    }
}

// =============================================================================
// ACTUALIZAR PUBLICACIÓN
// =============================================================================

/**
 * Actualiza una publicación existente. Solo el dueño.
 *
 * - NUNCA modifica `expira_at` (eso vive en /reactivar, Sprint 7).
 * - Si llegan `latitud` + `longitud`, recalcula `ubicacion_aproximada` con
 *   un nuevo offset random (el oferente cambió de zona).
 * - Limpia fotos huérfanas removidas con `eliminarFotoServicioSiHuerfana`.
 */
export async function actualizarPublicacion(
    usuarioId: string,
    publicacionId: string,
    datos: ActualizarPublicacionInput
) {
    try {
        // 1. Validar que la publicación existe y es del usuario.
        const existeRes = await db.execute<{ fotos: string[]; estado: string }>(sql`
            SELECT fotos, estado
            FROM servicios_publicaciones
            WHERE id = ${publicacionId}
              AND usuario_id = ${usuarioId}
              AND deleted_at IS NULL
            LIMIT 1
        `);
        if (existeRes.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos esta publicación o no es tuya.',
            };
        }
        const fotosAnteriores = (existeRes.rows[0] as { fotos: string[] }).fotos ?? [];

        // 2. Construir SET dinámico con SQL crudo.
        //    Drizzle no es flexible con SETs condicionales mezclando JSONB +
        //    geography + arrays — más simple manejar con un único UPDATE crudo.
        const sets: ReturnType<typeof sql>[] = [];

        if (datos.titulo !== undefined) sets.push(sql`titulo = ${datos.titulo}`);
        if (datos.descripcion !== undefined) sets.push(sql`descripcion = ${datos.descripcion}`);
        if (datos.fotos !== undefined) sets.push(sql`fotos = ${JSON.stringify(datos.fotos)}::jsonb`);
        if (datos.fotoPortadaIndex !== undefined) sets.push(sql`foto_portada_index = ${datos.fotoPortadaIndex}`);
        if (datos.precio !== undefined) sets.push(sql`precio = ${JSON.stringify(datos.precio)}::jsonb`);
        if (datos.modalidad !== undefined) sets.push(sql`modalidad = ${datos.modalidad}`);
        if (datos.ciudad !== undefined) sets.push(sql`ciudad = ${datos.ciudad}`);
        if (datos.zonasAproximadas !== undefined) sets.push(sql`zonas_aproximadas = ${pgArrayLiteral(datos.zonasAproximadas)}::varchar[]`);
        if (datos.skills !== undefined) sets.push(sql`skills = ${pgArrayLiteral(datos.skills)}::text[]`);
        if (datos.requisitos !== undefined) sets.push(sql`requisitos = ${pgArrayLiteral(datos.requisitos)}::text[]`);
        if (datos.horario !== undefined) sets.push(sql`horario = ${datos.horario}`);
        if (datos.diasSemana !== undefined) sets.push(sql`dias_semana = ${pgArrayLiteral(datos.diasSemana)}::varchar[]`);
        if (datos.presupuesto !== undefined) {
            sets.push(
                sql`presupuesto = ${datos.presupuesto ? JSON.stringify(datos.presupuesto) : null}::jsonb`
            );
        }
        if (datos.categoria !== undefined) {
            sets.push(sql`categoria = ${datos.categoria ?? null}`);
        }
        if (datos.urgente !== undefined) {
            sets.push(sql`urgente = ${datos.urgente}`);
        }

        // Ubicación: si vienen ambos, recalculamos ambas columnas.
        if (datos.latitud !== undefined && datos.longitud !== undefined) {
            const aprox = aleatorizarCoordenada(datos.latitud, datos.longitud);
            sets.push(
                sql`ubicacion = ST_SetSRID(ST_MakePoint(${datos.longitud}, ${datos.latitud}), 4326)::geography`
            );
            sets.push(
                sql`ubicacion_aproximada = ST_SetSRID(ST_MakePoint(${aprox.lng}, ${aprox.lat}), 4326)::geography`
            );
        }

        sets.push(sql`updated_at = NOW()`);

        if (sets.length === 1) {
            // Solo updated_at — nada cambió en realidad.
            return {
                success: false as const,
                code: 400,
                message: 'No proporcionaste cambios.',
            };
        }

        const setClause = sql.join(sets, sql`, `);

        await db.execute(sql`
            UPDATE servicios_publicaciones
            SET ${setClause}
            WHERE id = ${publicacionId}
              AND usuario_id = ${usuarioId}
              AND deleted_at IS NULL
        `);

        // 3. Limpieza R2: fotos removidas → eliminar si están huérfanas.
        if (datos.fotos !== undefined) {
            const removidas = fotosAnteriores.filter((u) => !datos.fotos!.includes(u));
            await Promise.all(
                removidas.map((url) => eliminarFotoServicioSiHuerfana(url, publicacionId))
            );
        }

        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en actualizarPublicacion:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos actualizar la publicación.',
        };
    }
}

// =============================================================================
// CAMBIAR ESTADO (activa ↔ pausada)
// =============================================================================

export async function cambiarEstadoPublicacion(
    usuarioId: string,
    publicacionId: string,
    nuevoEstado: 'activa' | 'pausada'
) {
    try {
        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE servicios_publicaciones
            SET estado = ${nuevoEstado}, updated_at = NOW()
            WHERE id = ${publicacionId}
              AND usuario_id = ${usuarioId}
              AND deleted_at IS NULL
              AND estado IN ('activa', 'pausada')
            RETURNING id
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos esta publicación o no es tuya.',
            };
        }

        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en cambiarEstadoPublicacion:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cambiar el estado.',
        };
    }
}

// =============================================================================
// ELIMINAR PUBLICACIÓN (soft delete)
// =============================================================================

/**
 * Reactiva una publicación pausada:
 *   - estado → 'activa'
 *   - expira_at → NOW() + 30 días
 *   - updated_at → NOW()
 *
 * Necesario tras una pausa automática del cron (publicación venció por
 * 30 días sin interacción). Hacer solo `PATCH /estado` no basta porque
 * `expira_at` ya estaría en el pasado y el cron volvería a pausarla.
 *
 * Solo el dueño (usuario_id == authUserId) puede reactivar.
 */
export async function reactivarPublicacion(
    usuarioId: string,
    publicacionId: string,
) {
    try {
        const expiraAt = new Date();
        expiraAt.setUTCDate(expiraAt.getUTCDate() + 30);

        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE servicios_publicaciones
            SET estado = 'activa',
                expira_at = ${expiraAt.toISOString()},
                updated_at = NOW()
            WHERE id = ${publicacionId}
              AND usuario_id = ${usuarioId}
              AND deleted_at IS NULL
              AND estado = 'pausada'
            RETURNING id
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message:
                    'No encontramos esta publicación o no es tuya o no está pausada.',
            };
        }

        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en reactivarPublicacion:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos reactivar la publicación.',
        };
    }
}

/**
 * Soft delete: `estado='eliminada'` + `deleted_at=NOW()`. Las fotos NO se
 * borran de R2 aquí — el reconcile global las atrapará si quedan huérfanas.
 */
export async function eliminarPublicacion(
    usuarioId: string,
    publicacionId: string
) {
    try {
        const resultado = await db.execute<{ id: string }>(sql`
            UPDATE servicios_publicaciones
            SET estado = 'eliminada', deleted_at = NOW(), updated_at = NOW()
            WHERE id = ${publicacionId}
              AND usuario_id = ${usuarioId}
              AND deleted_at IS NULL
            RETURNING id
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos esta publicación o no es tuya.',
            };
        }

        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en eliminarPublicacion:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos eliminar la publicación.',
        };
    }
}

// =============================================================================
// REGISTRAR VISTA (incrementa contador)
// =============================================================================

/**
 * Idempotente best-effort. La dedupe por usuario/día vive en analytics (Sprint
 * futuro) — aquí solo incrementamos.
 */
export async function registrarVista(publicacionId: string) {
    try {
        await db.execute(sql`
            UPDATE servicios_publicaciones
            SET total_vistas = total_vistas + 1
            WHERE id = ${publicacionId}
              AND estado != 'eliminada'
              AND deleted_at IS NULL
        `);
        return { success: true as const, code: 200 };
    } catch (error) {
        console.error('Error en registrarVista:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos registrar la vista.',
        };
    }
}

// =============================================================================
// UPLOAD DE IMAGEN (presigned URL R2 prefijo `servicios/`)
// =============================================================================

/**
 * Genera una URL presigned para que el cliente suba directamente a R2 sin
 * pasar por el backend. Carpeta `servicios/{usuarioId}/`. La key final la
 * genera `generarPresignedUrl` (timestamp + uuid + extensión).
 */
export async function generarUrlUploadImagen(
    usuarioId: string,
    nombreArchivo: string,
    contentType: 'image/jpeg' | 'image/png' | 'image/webp'
) {
    try {
        const carpeta = `servicios/${usuarioId}`;
        const resultado = await generarPresignedUrl(
            carpeta,
            nombreArchivo,
            contentType,
            300,
            ['image/jpeg', 'image/png', 'image/webp']
        );

        if (!resultado.success) {
            return {
                success: false as const,
                code: resultado.code ?? 500,
                message: resultado.message ?? 'No pudimos generar la URL de subida.',
            };
        }

        return {
            success: true as const,
            code: 200,
            data: resultado.data,
        };
    } catch (error) {
        console.error('Error en generarUrlUploadImagen:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos generar la URL de subida.',
        };
    }
}
