/**
 * ============================================================================
 * MARKETPLACE SERVICE — Compra-venta P2P de objetos físicos
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/marketplace.service.ts
 *
 * PROPÓSITO:
 * Lógica de negocio del módulo MarketPlace v1. Solo CRUD básico — el feed,
 * detalle, mis-artículos, cambio de estado y soft delete. La búsqueda, perfil
 * del vendedor, niveles y crons llegan en sprints posteriores.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md
 * Sprint:      docs/prompts Marketplace/Sprint-1-Backend-Base.md
 *
 * Reglas críticas (NO romper):
 * - `ubicacion` (real) NUNCA se devuelve al frontend.
 * - `ubicacion_aproximada` se calcula al crear (offset aleatorio en 500m) y
 *   queda fija. Decisión 5 del doc: aleatorizar al guardar, no al consultar.
 * - `expira_at` se setea SOLO al crear (NOW() + 30 días). El UPDATE general
 *   NO la modifica; solo el endpoint futuro de "Reactivar" (Sprint 7).
 * - Las fotos huérfanas se borran de R2 con el helper local
 *   `eliminarFotoMarketplaceSiHuerfana` (no se comparten con otras tablas).
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { redis } from '../db/redis.js';
import { articulosMarketplace } from '../db/schemas/schema.js';
import { eliminarArchivo, generarPresignedUrl } from './r2.service.js';
import { validarTextoPublicacion } from './marketplace/filtros.js';
import type { ResultadoValidacion } from './marketplace/filtros.js';
import type {
    CrearArticuloInput,
    ActualizarArticuloInput,
} from '../validations/marketplace.schema.js';

// =============================================================================
// TIPOS DE RESPUESTA
// =============================================================================

interface ArticuloRow {
    id: string;
    usuarioId: string;
    titulo: string;
    descripcion: string;
    precio: string;
    // `condicion` y `aceptaOfertas` son opcionales desde 2026-05-13. NULL =
    // "no aplica / no especificado" (el card y el detalle no muestran nada).
    condicion: string | null;
    aceptaOfertas: boolean | null;
    /**
     * Unidad de venta opcional (c/u, por kg, por docena, etc.). Cuando existe,
     * el card muestra "$15 c/u" en lugar de solo "$15".
     */
    unidadVenta: string | null;
    fotos: string[];
    fotoPortadaIndex: number;
    ubicacionAproximada: { lat: number; lng: number };
    ciudad: string;
    zonaAproximada: string;
    estado: string;
    totalVistas: number;
    totalMensajes: number;
    totalGuardados: number;
    expiraAt: string;
    createdAt: string;
    updatedAt: string;
    vendidaAt: string | null;
}

interface ArticuloConVendedorRow extends ArticuloRow {
    vendedor: {
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

interface ArticuloFeedRow extends ArticuloRow {
    distanciaMetros: number | null;
    viendo: number;
    vistas24h: number;
    totalPreguntasRespondidas: number;
}

// =============================================================================
// HELPER: Aleatorizar coordenada dentro de un círculo de 500m
// =============================================================================

const RADIO_PRIVACIDAD_METROS = 500;
const METROS_POR_GRADO_LAT = 111_320;

/**
 * Devuelve una nueva coordenada desplazada uniformemente dentro de un círculo
 * de `RADIO_PRIVACIDAD_METROS` (500m) alrededor del punto original.
 *
 * Distribución uniforme en disco usando `r = R * sqrt(random())`:
 * - sin sqrt, los puntos se agrupan cerca del centro (área ∝ r²).
 * - con sqrt, la densidad por unidad de área es constante.
 *
 * Se aplica al CREAR el artículo. La coordenada original queda guardada en la
 * columna privada `ubicacion`; la pública es esta aleatorizada.
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

// =============================================================================
// HELPER: Eliminar foto de R2 si está huérfana
// =============================================================================

/**
 * Las fotos del MarketPlace viven solo en `articulos_marketplace.fotos`. NO se
 * comparten con otras tablas (no hay duplicación cross-módulo como en
 * artículos del catálogo de negocios). Por eso este helper es más simple que
 * `eliminarImagenSiHuerfana` de `negocioManagement.service.ts`.
 *
 * Verifica que ningún OTRO artículo del MarketPlace siga referenciando la URL
 * antes de borrarla de R2. Útil al editar (`actualizarArticulo`) cuando el
 * usuario remueve una foto de su array.
 *
 * No se llama en `eliminarArticulo` (soft delete) porque el reconcile global
 * de R2 hará la limpieza eventual cuando el artículo lleve días eliminado.
 *
 * @param url - URL de la foto a evaluar
 * @param excluirArticuloId - UUID del artículo que está editando (no contar
 *                            su propia referencia previa)
 */
export async function eliminarFotoMarketplaceSiHuerfana(
    url: string,
    excluirArticuloId?: string
): Promise<void> {
    try {
        const filtroExcluir = excluirArticuloId
            ? sql`AND id != ${excluirArticuloId}`
            : sql``;

        const [{ total }] = await db
            .select({ total: sql<number>`COUNT(*)::int` })
            .from(articulosMarketplace)
            .where(
                sql`${url} = ANY(ARRAY(SELECT jsonb_array_elements_text(fotos))) ${filtroExcluir}`
            );

        if (total > 0) {
            console.log(
                `ℹ️ Foto MarketPlace conservada (usada por ${total} artículo/s): ${url}`
            );
            return;
        }

        await eliminarArchivo(url);
    } catch (error) {
        console.error('Error procesando foto MarketPlace huérfana:', error);
        // No re-lanzar: la limpieza de R2 es best-effort, el reconcile global
        // la atrapará si quedó huérfana de verdad.
    }
}

// =============================================================================
// HELPER INTERNO: Mapear fila SQL → ArticuloRow (con ubicación aproximada)
// =============================================================================

interface RawArticuloDb {
    id: string;
    usuario_id: string;
    titulo: string;
    descripcion: string;
    precio: string;
    condicion: string | null;
    acepta_ofertas: boolean | null;
    unidad_venta: string | null;
    fotos: string[];
    foto_portada_index: number;
    lat: number;
    lng: number;
    ciudad: string;
    zona_aproximada: string;
    estado: string;
    total_vistas: number;
    total_mensajes: number;
    total_guardados: number;
    expira_at: string;
    created_at: string;
    updated_at: string;
    vendida_at: string | null;
}

function mapearArticulo(row: RawArticuloDb): ArticuloRow {
    return {
        id: row.id,
        usuarioId: row.usuario_id,
        titulo: row.titulo,
        descripcion: row.descripcion,
        precio: row.precio,
        condicion: row.condicion,
        aceptaOfertas: row.acepta_ofertas,
        unidadVenta: row.unidad_venta,
        fotos: row.fotos,
        fotoPortadaIndex: row.foto_portada_index,
        ubicacionAproximada: { lat: row.lat, lng: row.lng },
        ciudad: row.ciudad,
        zonaAproximada: row.zona_aproximada,
        estado: row.estado,
        totalVistas: row.total_vistas,
        totalMensajes: row.total_mensajes,
        totalGuardados: row.total_guardados,
        expiraAt: row.expira_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        vendidaAt: row.vendida_at,
    };
}

// =============================================================================
// HELPER: Aplicar resultado de moderación a la respuesta del service
// =============================================================================

/**
 * Convierte un `ResultadoValidacion` en la respuesta correspondiente del
 * service:
 *  - `severidad: 'rechazo'` → `{ success: false, code: 422, ... }` siempre.
 *  - `severidad: 'sugerencia'` → solo bloquea si el cliente NO ha confirmado
 *    (`confirmadoPorUsuario !== true`). Devuelve `code: 200` con warning.
 *  - `valido: true` → devuelve null (continúa el flujo normal).
 */
function aplicarModeracion(
    validacion: ResultadoValidacion,
    confirmadoPorUsuario?: boolean
): {
    success: false;
    code: number;
    message: string;
    moderacion: {
        severidad: 'rechazo' | 'sugerencia';
        categoria: ResultadoValidacion['categoria'];
        mensaje: string;
        palabraDetectada?: string;
    };
} | null {
    if (validacion.valido) return null;

    if (validacion.severidad === 'rechazo') {
        return {
            success: false,
            code: 422,
            message: validacion.mensaje,
            moderacion: {
                severidad: 'rechazo',
                categoria: validacion.categoria,
                mensaje: validacion.mensaje,
                palabraDetectada: validacion.palabraDetectada,
            },
        };
    }

    // Sugerencia suave: solo bloquea si el usuario NO ha confirmado.
    if (confirmadoPorUsuario === true) {
        return null;
    }

    return {
        success: false,
        code: 200,
        message: validacion.mensaje,
        moderacion: {
            severidad: 'sugerencia',
            categoria: validacion.categoria,
            mensaje: validacion.mensaje,
        },
    };
}

// =============================================================================
// CREAR ARTÍCULO
// =============================================================================

/**
 * Crea un nuevo artículo del MarketPlace.
 *
 * - `expira_at` = NOW() + 30 días (TTL para auto-pausa por cron del Sprint 7)
 * - `ubicacion` = punto exacto recibido (privado)
 * - `ubicacion_aproximada` = punto aleatorizado dentro de 500m (público)
 *
 * MODERACIÓN (Capa 1):
 *  - Si título/descripción contiene palabra prohibida → respuesta `code: 422`
 *    con la categoría detectada. El controller mapea a HTTP 422.
 *  - Si detecta servicio o búsqueda y `confirmadoPorUsuario !== true` →
 *    respuesta `code: 200` con `warning` (sin INSERT). El frontend muestra
 *    modal "Editar mi publicación / Continuar de todos modos". Si el usuario
 *    elige continuar, reenvía con `confirmadoPorUsuario: true`.
 *
 * @param usuarioId - UUID del usuario en modo Personal (validado por middleware)
 * @param datos    - Payload validado por `crearArticuloSchema`
 */
export async function crearArticulo(
    usuarioId: string,
    datos: CrearArticuloInput
) {
    try {
        // ─── Capa 1: Moderación autónoma ──────────────────────────────────
        const validacion = validarTextoPublicacion(datos.titulo, datos.descripcion);
        const resultadoModeracion = aplicarModeracion(validacion, datos.confirmadoPorUsuario);
        if (resultadoModeracion) return resultadoModeracion;

        const aprox = aleatorizarCoordenada(datos.latitud, datos.longitud);

        // Las confirmaciones del checklist legal (Paso 3 del wizard) se
        // persisten como evidencia inmutable. El `aceptadasAt` lo agrega
        // el backend (no el cliente) para tener un timestamp confiable.
        const confirmacionesJson = datos.confirmaciones
            ? JSON.stringify({
                  ...datos.confirmaciones,
                  aceptadasAt: new Date().toISOString(),
              })
            : null;

        const resultado = await db.execute(sql`
            INSERT INTO articulos_marketplace (
                usuario_id, titulo, descripcion, precio, condicion, acepta_ofertas,
                unidad_venta,
                confirmaciones,
                fotos, foto_portada_index,
                ubicacion, ubicacion_aproximada,
                ciudad, zona_aproximada,
                expira_at
            ) VALUES (
                ${usuarioId},
                ${datos.titulo},
                ${datos.descripcion},
                ${datos.precio},
                ${datos.condicion ?? null},
                ${datos.aceptaOfertas ?? null},
                ${datos.unidadVenta ?? null},
                ${confirmacionesJson}::jsonb,
                ${JSON.stringify(datos.fotos)}::jsonb,
                ${datos.fotoPortadaIndex},
                ST_SetSRID(ST_MakePoint(${datos.longitud}, ${datos.latitud}), 4326)::geography,
                ST_SetSRID(ST_MakePoint(${aprox.lng}, ${aprox.lat}), 4326)::geography,
                ${datos.ciudad},
                ${datos.zonaAproximada},
                NOW() + INTERVAL '30 days'
            )
            RETURNING
                id, usuario_id, titulo, descripcion, precio, condicion, acepta_ofertas,
                unidad_venta,
                fotos, foto_portada_index,
                ST_Y(ubicacion_aproximada::geometry) AS lat,
                ST_X(ubicacion_aproximada::geometry) AS lng,
                ciudad, zona_aproximada, estado,
                total_vistas, total_mensajes, total_guardados,
                expira_at, created_at, updated_at, vendida_at
        `);

        const row = resultado.rows[0] as unknown as RawArticuloDb;

        return {
            success: true,
            message: 'Artículo publicado correctamente',
            data: mapearArticulo(row),
        };
    } catch (error) {
        console.error('Error al crear artículo MarketPlace:', error);
        throw error;
    }
}

// =============================================================================
// HELPERS REDIS: Sorted Set "viendo ahora" + vistas 24h
// =============================================================================

const VIENDO_TTL_MS = 120_000; // 2 minutos en milisegundos

/**
 * Cuenta cuántos usuarios están viendo el artículo en este momento.
 * Limpia primero las entradas cuyo último heartbeat superó los 2 minutos.
 */
async function contarViendo(articuloId: string): Promise<number> {
    const key = `articulo:viendo:${articuloId}`;
    const corte = Date.now() - VIENDO_TTL_MS;
    await redis.zremrangebyscore(key, 0, corte);
    return redis.zcard(key);
}

/**
 * Registra o renueva la presencia activa del usuario en el artículo.
 * Usa Sorted Set con timestamp como score — cada heartbeat actualiza el
 * score del userId sin duplicar miembros.
 */
export async function registrarHeartbeat(
    articuloId: string,
    usuarioId: string
): Promise<void> {
    const key = `articulo:viendo:${articuloId}`;
    await redis.zadd(key, Date.now(), usuarioId);
}

/**
 * Devuelve el contador de vistas de las últimas 24h desde Redis.
 */
async function obtenerVistas24h(articuloId: string): Promise<number> {
    const val = await redis.get(`articulo:vistas24h:${articuloId}`);
    return val ? parseInt(val, 10) : 0;
}

// =============================================================================
// HELPER PRIVADO: Calcular tiempo de respuesta promedio de un vendedor
// =============================================================================

/**
 * Calcula el promedio de minutos que tarda un vendedor en responder al primer
 * mensaje del comprador, en conversaciones de los últimos 30 días.
 * Devuelve null si no hay datos suficientes.
 */
async function calcularTiempoRespuesta(vendedorId: string): Promise<number | null> {
    const resultado = await db.execute(sql`
        WITH primeros AS (
            SELECT
                m.conversacion_id,
                MIN(m.created_at) FILTER (WHERE m.emisor_id != ${vendedorId}) AS t_comprador,
                MIN(m.created_at) FILTER (WHERE m.emisor_id = ${vendedorId})  AS t_vendedor
            FROM chat_mensajes m
            INNER JOIN chat_conversaciones c ON c.id = m.conversacion_id
            WHERE m.created_at > NOW() - INTERVAL '30 days'
              AND (c.participante1_id = ${vendedorId} OR c.participante2_id = ${vendedorId})
            GROUP BY m.conversacion_id
        )
        SELECT AVG(EXTRACT(EPOCH FROM (t_vendedor - t_comprador)) / 60.0)::float AS minutos_promedio
        FROM primeros
        WHERE t_comprador IS NOT NULL
          AND t_vendedor IS NOT NULL
          AND t_vendedor > t_comprador
    `);
    const minutos = (resultado.rows[0] as { minutos_promedio: number | null }).minutos_promedio;
    return minutos !== null && !isNaN(minutos) ? minutos : null;
}

// =============================================================================
// OBTENER ARTÍCULO POR ID (público con verificarTokenOpcional)
// =============================================================================

/**
 * Devuelve el artículo con datos del vendedor. NO devuelve `ubicacion` exacta.
 * Visible mientras `deleted_at IS NULL` — incluye `vendida` y `pausada` para
 * permitir links compartidos con badge de estado en el frontend.
 */
export async function obtenerArticuloPorId(articuloId: string) {
    try {
        const resultado = await db.execute(sql`
            SELECT
                a.id, a.usuario_id, a.titulo, a.descripcion, a.precio,
                a.condicion, a.acepta_ofertas, a.unidad_venta,
                a.fotos, a.foto_portada_index,
                ST_Y(a.ubicacion_aproximada::geometry) AS lat,
                ST_X(a.ubicacion_aproximada::geometry) AS lng,
                a.ciudad, a.zona_aproximada, a.estado,
                a.total_vistas, a.total_mensajes, a.total_guardados,
                a.expira_at, a.created_at, a.updated_at, a.vendida_at,
                u.id              AS vendedor_id,
                u.nombre          AS vendedor_nombre,
                u.apellidos       AS vendedor_apellidos,
                u.avatar_url      AS vendedor_avatar_url,
                u.ciudad          AS vendedor_ciudad,
                u.telefono        AS vendedor_telefono,
                u.ultima_conexion AS vendedor_ultima_conexion
            FROM articulos_marketplace a
            INNER JOIN usuarios u ON u.id = a.usuario_id
            WHERE a.id = ${articuloId}
              AND a.deleted_at IS NULL
            LIMIT 1
        `);

        if (resultado.rows.length === 0) {
            return {
                success: false,
                message: 'Artículo no encontrado',
            };
        }

        const row = resultado.rows[0] as unknown as RawArticuloDb & {
            vendedor_id: string;
            vendedor_nombre: string;
            vendedor_apellidos: string;
            vendedor_avatar_url: string | null;
            vendedor_ciudad: string | null;
            vendedor_telefono: string | null;
            vendedor_ultima_conexion: string | null;
        };

        const [tiempoRespuestaMinutos] = await Promise.all([
            calcularTiempoRespuesta(row.vendedor_id),
        ]);

        const data: ArticuloConVendedorRow = {
            ...mapearArticulo(row),
            vendedor: {
                id: row.vendedor_id,
                nombre: row.vendedor_nombre,
                apellidos: row.vendedor_apellidos,
                avatarUrl: row.vendedor_avatar_url,
                ciudad: row.vendedor_ciudad,
                telefono: row.vendedor_telefono,
                ultimaConexion: row.vendedor_ultima_conexion,
                tiempoRespuestaMinutos,
            },
        };

        return {
            success: true,
            data,
        };
    } catch (error) {
        console.error('Error al obtener artículo MarketPlace:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER FEED (recientes + cercanos)
// =============================================================================

/**
 * Devuelve dos arrays:
 * - `recientes`: últimos 20 artículos `activa` de la ciudad por created_at DESC
 * - `cercanos` : top 20 por distancia ASC sobre `ubicacion_aproximada`
 *
 * Solo se devuelve la coordenada aproximada (privacidad). La distancia se
 * calcula entre el punto del usuario y la ubicación pública del artículo, así
 * que ya está "borroseada" por el offset de 500m — coherente con el círculo
 * que el frontend renderiza en el detalle.
 */
export async function obtenerFeed(
    ciudad: string,
    lat: number,
    lng: number
) {
    try {
        const recientesResultado = await db.execute(sql`
            SELECT
                a.id, a.usuario_id, a.titulo, a.descripcion, a.precio,
                a.condicion, a.acepta_ofertas, a.unidad_venta,
                a.fotos, a.foto_portada_index,
                ST_Y(a.ubicacion_aproximada::geometry) AS lat,
                ST_X(a.ubicacion_aproximada::geometry) AS lng,
                a.ciudad, a.zona_aproximada, a.estado,
                a.total_vistas, a.total_mensajes, a.total_guardados,
                a.expira_at, a.created_at, a.updated_at, a.vendida_at,
                ST_Distance(
                    a.ubicacion_aproximada,
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
                ) AS distancia_metros,
                COALESCE(pq.total, 0) AS total_preguntas_respondidas
            FROM articulos_marketplace a
            LEFT JOIN (
                SELECT articulo_id, COUNT(*)::int AS total
                FROM marketplace_preguntas
                WHERE respondida_at IS NOT NULL
                  AND deleted_at IS NULL
                GROUP BY articulo_id
            ) pq ON pq.articulo_id = a.id
            WHERE a.estado = 'activa'
              AND a.deleted_at IS NULL
              AND a.ciudad = ${ciudad}
            ORDER BY a.created_at DESC
            LIMIT 20
        `);

        const cercanosResultado = await db.execute(sql`
            SELECT
                a.id, a.usuario_id, a.titulo, a.descripcion, a.precio,
                a.condicion, a.acepta_ofertas, a.unidad_venta,
                a.fotos, a.foto_portada_index,
                ST_Y(a.ubicacion_aproximada::geometry) AS lat,
                ST_X(a.ubicacion_aproximada::geometry) AS lng,
                a.ciudad, a.zona_aproximada, a.estado,
                a.total_vistas, a.total_mensajes, a.total_guardados,
                a.expira_at, a.created_at, a.updated_at, a.vendida_at,
                ST_Distance(
                    a.ubicacion_aproximada,
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
                ) AS distancia_metros,
                COALESCE(pq.total, 0) AS total_preguntas_respondidas
            FROM articulos_marketplace a
            LEFT JOIN (
                SELECT articulo_id, COUNT(*)::int AS total
                FROM marketplace_preguntas
                WHERE respondida_at IS NOT NULL
                  AND deleted_at IS NULL
                GROUP BY articulo_id
            ) pq ON pq.articulo_id = a.id
            WHERE a.estado = 'activa'
              AND a.deleted_at IS NULL
              AND a.ciudad = ${ciudad}
            ORDER BY a.ubicacion_aproximada <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
            LIMIT 20
        `);

        type RawFeedRow = RawArticuloDb & {
            distancia_metros: number | null;
            total_preguntas_respondidas: number;
        };
        const recientesRows = recientesResultado.rows as unknown as RawFeedRow[];
        const cercanosRows = cercanosResultado.rows as unknown as RawFeedRow[];

        // Enriquecer con datos de Redis en paralelo para todos los artículos.
        const enriquecer = async (row: RawFeedRow): Promise<ArticuloFeedRow> => {
            const [viendo, vistas24h] = await Promise.all([
                contarViendo(row.id),
                obtenerVistas24h(row.id),
            ]);
            return {
                ...mapearArticulo(row),
                distanciaMetros:
                    row.distancia_metros !== null ? Math.round(row.distancia_metros) : null,
                viendo,
                vistas24h,
                totalPreguntasRespondidas: row.total_preguntas_respondidas ?? 0,
            };
        };

        const [recientes, cercanos] = await Promise.all([
            Promise.all(recientesRows.map(enriquecer)),
            Promise.all(cercanosRows.map(enriquecer)),
        ]);

        return {
            success: true,
            data: { recientes, cercanos },
        };
    } catch (error) {
        console.error('Error al obtener feed MarketPlace:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER FEED INFINITO (estilo Facebook)
// =============================================================================

/**
 * Tipo de respuesta para cada artículo del feed infinito. Extiende
 * `ArticuloFeedRow` con datos del vendedor y top-2 preguntas respondidas
 * para que la card pueda renderizarse sin requests adicionales.
 */
export interface ArticuloFeedInfinitoRow extends ArticuloFeedRow {
    vendedor: {
        id: string;
        nombre: string;
        apellidos: string;
        avatarUrl: string | null;
    };
    /**
     * Todas las preguntas del artículo (respondidas + pendientes), ordenadas
     * con respondidas primero, luego pendientes por created_at DESC.
     * Sin LIMIT — el cliente renderiza todas inline.
     */
    topPreguntas: Array<{
        id: string;
        pregunta: string;
        respuesta: string | null;
        respondidaAt: string | null;
        /** Si != null, el comprador editó la pregunta. Mostrar "(editada)". */
        editadaAt: string | null;
        createdAt: string;
        comprador: {
            id: string;
            nombre: string;
            apellidos: string;
            avatarUrl: string | null;
        };
    }>;
    /**
     * Si el usuario actual (token opcional) tiene este artículo en sus
     * guardados. Siempre false cuando no hay sesión.
     */
    guardado: boolean;
}

interface OpcionesFeedInfinito {
    ciudad: string;
    lat: number;
    lng: number;
    /** Tipo de orden. Default: 'recientes'. */
    orden?: 'recientes' | 'vistos' | 'cerca';
    /** Página 1-based. Default: 1. */
    pagina?: number;
    /** Items por página. Default: 10, máx: 20. */
    limite?: number;
    /** Filtros opcionales de precio. */
    precioMin?: number;
    precioMax?: number;
    /**
     * ID del usuario logueado (opcional). Si se provee, cada artículo trae
     * `guardado` indicando si este usuario tiene el artículo en su lista
     * de guardados. Si es null/undefined, `guardado` viene siempre false.
     */
    usuarioId?: string | null;
}

/**
 * Feed infinito estilo Facebook con orden y filtros configurables.
 *
 * Devuelve los artículos enriquecidos con los datos necesarios para la card
 * tipo Facebook (avatar/nombre del vendedor + top 2 preguntas respondidas)
 * para evitar N+1 queries desde el frontend.
 *
 * Paginación offset-based — suficiente para volúmenes pequeños/medios.
 * Si en el futuro hace falta resistencia a inserciones concurrentes,
 * migrar a cursor-based con `(orden_value, created_at, id)`.
 */
export async function obtenerFeedInfinito(opciones: OpcionesFeedInfinito) {
    try {
        const orden = opciones.orden ?? 'recientes';
        const pagina = Math.max(1, opciones.pagina ?? 1);
        const limite = Math.min(20, Math.max(1, opciones.limite ?? 10));
        const offset = (pagina - 1) * limite;

        // Filtros adicionales (precio).
        const filtroPrecioMin =
            opciones.precioMin !== undefined && opciones.precioMin > 0
                ? sql`AND a.precio >= ${opciones.precioMin}`
                : sql``;
        const filtroPrecioMax =
            opciones.precioMax !== undefined && opciones.precioMax > 0
                ? sql`AND a.precio <= ${opciones.precioMax}`
                : sql``;

        // ORDER BY según el modo.
        const orderBy =
            orden === 'vistos'
                ? sql`ORDER BY a.total_vistas DESC, a.created_at DESC`
                : orden === 'cerca'
                    ? sql`ORDER BY a.ubicacion_aproximada <-> ST_SetSRID(ST_MakePoint(${opciones.lng}, ${opciones.lat}), 4326)::geography`
                    : sql`ORDER BY a.created_at DESC`;

        // Pedimos `limite + 1` para saber si hay siguiente página sin un
        // segundo COUNT(*).
        const resultado = await db.execute(sql`
            SELECT
                a.id, a.usuario_id, a.titulo, a.descripcion, a.precio,
                a.condicion, a.acepta_ofertas, a.unidad_venta,
                a.fotos, a.foto_portada_index,
                ST_Y(a.ubicacion_aproximada::geometry) AS lat,
                ST_X(a.ubicacion_aproximada::geometry) AS lng,
                a.ciudad, a.zona_aproximada, a.estado,
                a.total_vistas, a.total_mensajes, a.total_guardados,
                a.expira_at, a.created_at, a.updated_at, a.vendida_at,
                ST_Distance(
                    a.ubicacion_aproximada,
                    ST_SetSRID(ST_MakePoint(${opciones.lng}, ${opciones.lat}), 4326)::geography
                ) AS distancia_metros,
                u.id AS vendedor_id,
                u.nombre AS vendedor_nombre,
                u.apellidos AS vendedor_apellidos,
                u.avatar_url AS vendedor_avatar,
                COALESCE(pq.total, 0) AS total_preguntas_respondidas,
                COALESCE(
                    (
                        SELECT json_agg(
                            p ORDER BY
                                CASE WHEN p.respondida_at IS NULL THEN 1 ELSE 0 END,
                                p.respondida_at DESC NULLS LAST,
                                p.created_at DESC
                        )
                        FROM (
                            SELECT
                                mp.id,
                                mp.pregunta,
                                mp.respuesta,
                                mp.respondida_at,
                                mp.editada_at,
                                mp.created_at,
                                uc.id AS comprador_id,
                                uc.nombre AS comprador_nombre,
                                uc.apellidos AS comprador_apellidos,
                                uc.avatar_url AS comprador_avatar
                            FROM marketplace_preguntas mp
                            INNER JOIN usuarios uc ON uc.id = mp.comprador_id
                            WHERE mp.articulo_id = a.id
                              AND mp.deleted_at IS NULL
                        ) p
                    ),
                    '[]'::json
                ) AS top_preguntas,
                ${opciones.usuarioId
                    ? sql`EXISTS (
                            SELECT 1 FROM guardados g
                            WHERE g.usuario_id = ${opciones.usuarioId}
                              AND g.entity_type = 'articulo_marketplace'
                              AND g.entity_id = a.id
                          )`
                    : sql`FALSE`} AS usuario_guardo
            FROM articulos_marketplace a
            INNER JOIN usuarios u ON u.id = a.usuario_id
            LEFT JOIN (
                SELECT articulo_id, COUNT(*)::int AS total
                FROM marketplace_preguntas
                WHERE respondida_at IS NOT NULL
                  AND deleted_at IS NULL
                GROUP BY articulo_id
            ) pq ON pq.articulo_id = a.id
            WHERE a.estado = 'activa'
              AND a.deleted_at IS NULL
              AND a.ciudad = ${opciones.ciudad}
              ${filtroPrecioMin}
              ${filtroPrecioMax}
            ${orderBy}
            LIMIT ${limite + 1}
            OFFSET ${offset}
        `);

        type RawTopPregunta = {
            id: string;
            pregunta: string;
            // Pendientes pueden venir sin respuesta — el cliente decide cómo
            // mostrarlas (07-may-2026: respondidas primero, pendientes con
            // indicador "Pendiente de respuesta").
            respuesta: string | null;
            respondida_at: string | null;
            // Si != null, el comprador editó la pregunta — UI muestra "(editada)".
            editada_at: string | null;
            created_at: string;
            comprador_id: string;
            comprador_nombre: string;
            comprador_apellidos: string;
            comprador_avatar: string | null;
        };

        type RawFeedInfinitoRow = RawArticuloDb & {
            distancia_metros: number | null;
            vendedor_id: string;
            vendedor_nombre: string;
            vendedor_apellidos: string;
            vendedor_avatar: string | null;
            total_preguntas_respondidas: number;
            top_preguntas: RawTopPregunta[] | null;
            usuario_guardo: boolean;
        };

        const filas = resultado.rows as unknown as RawFeedInfinitoRow[];
        const hayMas = filas.length > limite;
        const filasRecortadas = hayMas ? filas.slice(0, limite) : filas;

        // Enriquecer con datos de Redis (viendo + vistas24h) en paralelo.
        const articulos: ArticuloFeedInfinitoRow[] = await Promise.all(
            filasRecortadas.map(async (row): Promise<ArticuloFeedInfinitoRow> => {
                const [viendo, vistas24h] = await Promise.all([
                    contarViendo(row.id),
                    obtenerVistas24h(row.id),
                ]);

                return {
                    ...mapearArticulo(row),
                    distanciaMetros:
                        row.distancia_metros !== null
                            ? Math.round(row.distancia_metros)
                            : null,
                    viendo,
                    vistas24h,
                    totalPreguntasRespondidas: row.total_preguntas_respondidas ?? 0,
                    vendedor: {
                        id: row.vendedor_id,
                        nombre: row.vendedor_nombre,
                        apellidos: row.vendedor_apellidos,
                        avatarUrl: row.vendedor_avatar,
                    },
                    topPreguntas: (row.top_preguntas ?? []).map((p) => ({
                        id: p.id,
                        pregunta: p.pregunta,
                        respuesta: p.respuesta,
                        respondidaAt: p.respondida_at,
                        editadaAt: p.editada_at,
                        createdAt: p.created_at,
                        comprador: {
                            id: p.comprador_id,
                            nombre: p.comprador_nombre,
                            apellidos: p.comprador_apellidos,
                            avatarUrl: p.comprador_avatar,
                        },
                    })),
                    guardado: row.usuario_guardo === true,
                };
            })
        );

        return {
            success: true,
            data: {
                articulos,
                pagina,
                limite,
                hayMas,
            },
        };
    } catch (error) {
        console.error('Error al obtener feed infinito MarketPlace:', error);
        throw error;
    }
}

// =============================================================================
// OBTENER MIS ARTÍCULOS (paginado)
// =============================================================================

interface PaginacionMisArticulos {
    estado?: 'activa' | 'pausada' | 'vendida';
    limit: number;
    offset: number;
}

/**
 * Lista paginada de artículos del usuario. Excluye `eliminada` (soft-deleted).
 * Si se pasa `estado`, filtra por ese estado. Sin filtro: todos los activos +
 * pausados + vendidos.
 */
export async function obtenerMisArticulos(
    usuarioId: string,
    paginacion: PaginacionMisArticulos
) {
    try {
        const filtroEstado = paginacion.estado
            ? sql`AND a.estado = ${paginacion.estado}`
            : sql`AND a.estado != 'eliminada'`;

        const resultado = await db.execute(sql`
            SELECT
                a.id, a.usuario_id, a.titulo, a.descripcion, a.precio,
                a.condicion, a.acepta_ofertas, a.unidad_venta,
                a.fotos, a.foto_portada_index,
                ST_Y(a.ubicacion_aproximada::geometry) AS lat,
                ST_X(a.ubicacion_aproximada::geometry) AS lng,
                a.ciudad, a.zona_aproximada, a.estado,
                a.total_vistas, a.total_mensajes, a.total_guardados,
                a.expira_at, a.created_at, a.updated_at, a.vendida_at
            FROM articulos_marketplace a
            WHERE a.usuario_id = ${usuarioId}
              AND a.deleted_at IS NULL
              ${filtroEstado}
            ORDER BY a.created_at DESC
            LIMIT ${paginacion.limit}
            OFFSET ${paginacion.offset}
        `);

        const totalResultado = await db.execute(sql`
            SELECT COUNT(*)::int AS total
            FROM articulos_marketplace a
            WHERE a.usuario_id = ${usuarioId}
              AND a.deleted_at IS NULL
              ${filtroEstado}
        `);

        const total = (totalResultado.rows[0] as { total: number }).total;
        const data = (resultado.rows as unknown as RawArticuloDb[]).map(mapearArticulo);

        return {
            success: true,
            data,
            paginacion: {
                total,
                limit: paginacion.limit,
                offset: paginacion.offset,
            },
        };
    } catch (error) {
        console.error('Error al obtener mis artículos MarketPlace:', error);
        throw error;
    }
}

// =============================================================================
// ACTUALIZAR ARTÍCULO
// =============================================================================

/**
 * Solo el dueño puede editar. NUNCA modifica `expira_at` (esa lock está al
 * nivel de Zod — el schema no acepta el campo — y aquí también: este service
 * jamás escribe esa columna). Si cambian las fotos, se calcula el diff y se
 * intenta borrar las removidas de R2 (best-effort vía
 * `eliminarFotoMarketplaceSiHuerfana`).
 */
export async function actualizarArticulo(
    articuloId: string,
    usuarioId: string,
    datos: ActualizarArticuloInput
) {
    try {
        // 1) Verificar dueño y estado editable
        const verificacion = await db.execute(sql`
            SELECT usuario_id, estado, fotos
            FROM articulos_marketplace
            WHERE id = ${articuloId}
              AND deleted_at IS NULL
            LIMIT 1
        `);

        if (verificacion.rows.length === 0) {
            return { success: false, message: 'Artículo no encontrado', code: 404 };
        }

        const actual = verificacion.rows[0] as {
            usuario_id: string;
            estado: string;
            fotos: string[];
        };

        if (actual.usuario_id !== usuarioId) {
            return {
                success: false,
                message: 'No tienes permiso para editar este artículo',
                code: 403,
            };
        }

        if (actual.estado === 'vendida') {
            return {
                success: false,
                message: 'No puedes editar un artículo vendido',
                code: 409,
            };
        }

        // ─── Capa 1: Moderación si cambian título o descripción ───────────
        // Solo se valida cuando el editor tocó esos campos. Si solo cambia
        // precio/fotos/etc, no hay riesgo de palabras prohibidas nuevas.
        if (datos.titulo !== undefined || datos.descripcion !== undefined) {
            const tituloEval = datos.titulo ?? '';
            const descEval = datos.descripcion ?? '';
            // Si el caller solo pasó uno, leemos el otro de BD para validar conjunto.
            const necesitaLeerActual = datos.titulo === undefined || datos.descripcion === undefined;
            let tituloFinal = tituloEval;
            let descFinal = descEval;
            if (necesitaLeerActual) {
                const completo = await db.execute(sql`
                    SELECT titulo, descripcion FROM articulos_marketplace WHERE id = ${articuloId}
                `);
                const r = completo.rows[0] as { titulo: string; descripcion: string };
                tituloFinal = datos.titulo ?? r.titulo;
                descFinal = datos.descripcion ?? r.descripcion;
            }
            const validacion = validarTextoPublicacion(tituloFinal, descFinal);
            const resultadoModeracion = aplicarModeracion(validacion, datos.confirmadoPorUsuario);
            if (resultadoModeracion) return resultadoModeracion;
        }

        // 2) Construir SET dinámico. expira_at NUNCA se incluye.
        const sets: ReturnType<typeof sql>[] = [sql`updated_at = NOW()`];

        if (datos.titulo !== undefined) sets.push(sql`titulo = ${datos.titulo}`);
        if (datos.descripcion !== undefined) sets.push(sql`descripcion = ${datos.descripcion}`);
        if (datos.precio !== undefined) sets.push(sql`precio = ${datos.precio}`);
        // condicion/aceptaOfertas aceptan null (editor que limpia el valor) y
        // valores explícitos. `undefined` significa "no tocar este campo".
        if (datos.condicion !== undefined) sets.push(sql`condicion = ${datos.condicion}`);
        if (datos.aceptaOfertas !== undefined) sets.push(sql`acepta_ofertas = ${datos.aceptaOfertas}`);
        if (datos.unidadVenta !== undefined) sets.push(sql`unidad_venta = ${datos.unidadVenta}`);
        if (datos.fotos !== undefined) sets.push(sql`fotos = ${JSON.stringify(datos.fotos)}::jsonb`);
        if (datos.fotoPortadaIndex !== undefined) sets.push(sql`foto_portada_index = ${datos.fotoPortadaIndex}`);
        if (datos.ciudad !== undefined) sets.push(sql`ciudad = ${datos.ciudad}`);
        if (datos.zonaAproximada !== undefined) sets.push(sql`zona_aproximada = ${datos.zonaAproximada}`);

        // Si actualizan ubicación (Zod garantiza que vienen ambos lat+lng juntos),
        // recomputamos también `ubicacion_aproximada` con un nuevo offset random.
        if (datos.latitud !== undefined && datos.longitud !== undefined) {
            const aprox = aleatorizarCoordenada(datos.latitud, datos.longitud);
            sets.push(
                sql`ubicacion = ST_SetSRID(ST_MakePoint(${datos.longitud}, ${datos.latitud}), 4326)::geography`
            );
            sets.push(
                sql`ubicacion_aproximada = ST_SetSRID(ST_MakePoint(${aprox.lng}, ${aprox.lat}), 4326)::geography`
            );
        }

        const setClause = sql.join(sets, sql`, `);

        await db.execute(sql`
            UPDATE articulos_marketplace
            SET ${setClause}
            WHERE id = ${articuloId}
        `);

        // 3) Limpieza de fotos removidas (best-effort, fire-and-forget)
        if (datos.fotos !== undefined) {
            const fotosRemovidas = actual.fotos.filter((url) => !datos.fotos!.includes(url));
            for (const url of fotosRemovidas) {
                eliminarFotoMarketplaceSiHuerfana(url, articuloId).catch((err) => {
                    console.error('Error procesando foto removida:', err);
                });
            }
        }

        // 4) Devolver artículo actualizado
        const refrescado = await obtenerArticuloPorId(articuloId);
        return refrescado.success
            ? { success: true, message: 'Artículo actualizado', data: refrescado.data }
            : { success: false, message: 'Artículo actualizado pero no se pudo releer', code: 500 };
    } catch (error) {
        console.error('Error al actualizar artículo MarketPlace:', error);
        throw error;
    }
}

// =============================================================================
// CAMBIAR ESTADO (pausar / activar / vender)
// =============================================================================

/**
 * Aplica las transiciones permitidas por la matriz §6 del doc maestro:
 *   activa  ⇄ pausada
 *   activa  → vendida
 *   pausada → activa  (también permitido)
 *
 * Vendida es definitiva (solo se puede `eliminar` después). NO incluye
 * `eliminada` — eso va por DELETE.
 */
const TRANSICIONES_VALIDAS: Record<string, Set<string>> = {
    activa: new Set(['pausada', 'vendida']),
    pausada: new Set(['activa']),
    vendida: new Set([]),
    eliminada: new Set([]),
};

export async function cambiarEstado(
    articuloId: string,
    usuarioId: string,
    nuevoEstado: 'activa' | 'pausada' | 'vendida'
) {
    try {
        const verificacion = await db.execute(sql`
            SELECT usuario_id, estado
            FROM articulos_marketplace
            WHERE id = ${articuloId}
              AND deleted_at IS NULL
            LIMIT 1
        `);

        if (verificacion.rows.length === 0) {
            return { success: false, message: 'Artículo no encontrado', code: 404 };
        }

        const actual = verificacion.rows[0] as { usuario_id: string; estado: string };

        if (actual.usuario_id !== usuarioId) {
            return {
                success: false,
                message: 'No tienes permiso para cambiar el estado de este artículo',
                code: 403,
            };
        }

        if (actual.estado === nuevoEstado) {
            return {
                success: true,
                message: 'El artículo ya estaba en ese estado',
                data: { estado: nuevoEstado },
            };
        }

        const transicionesPermitidas = TRANSICIONES_VALIDAS[actual.estado] ?? new Set();
        if (!transicionesPermitidas.has(nuevoEstado)) {
            return {
                success: false,
                message: `Transición no permitida: ${actual.estado} → ${nuevoEstado}`,
                code: 409,
            };
        }

        const setVendidaAt =
            nuevoEstado === 'vendida' ? sql`, vendida_at = NOW()` : sql``;

        await db.execute(sql`
            UPDATE articulos_marketplace
            SET estado = ${nuevoEstado}, updated_at = NOW() ${setVendidaAt}
            WHERE id = ${articuloId}
        `);

        return {
            success: true,
            message: 'Estado actualizado',
            data: { estado: nuevoEstado },
        };
    } catch (error) {
        console.error('Error al cambiar estado MarketPlace:', error);
        throw error;
    }
}

// =============================================================================
// ELIMINAR ARTÍCULO (soft delete)
// =============================================================================

/**
 * Soft delete: marca `estado='eliminada'` y `deleted_at=NOW()`. Las fotos en
 * R2 se mantienen — el reconcile global del Panel Admin las limpia
 * eventualmente cuando ya no estén referenciadas (consistente con
 * `docs/arquitectura/Mantenimiento_R2.md`).
 */
export async function eliminarArticulo(articuloId: string, usuarioId: string) {
    try {
        const verificacion = await db.execute(sql`
            SELECT usuario_id
            FROM articulos_marketplace
            WHERE id = ${articuloId}
              AND deleted_at IS NULL
            LIMIT 1
        `);

        if (verificacion.rows.length === 0) {
            return { success: false, message: 'Artículo no encontrado', code: 404 };
        }

        const dueno = (verificacion.rows[0] as { usuario_id: string }).usuario_id;
        if (dueno !== usuarioId) {
            return {
                success: false,
                message: 'No tienes permiso para eliminar este artículo',
                code: 403,
            };
        }

        await db.execute(sql`
            UPDATE articulos_marketplace
            SET estado = 'eliminada',
                deleted_at = NOW(),
                updated_at = NOW()
            WHERE id = ${articuloId}
        `);

        return { success: true, message: 'Artículo eliminado' };
    } catch (error) {
        console.error('Error al eliminar artículo MarketPlace:', error);
        throw error;
    }
}

// =============================================================================
// REGISTRAR VISTA
// =============================================================================

/**
 * Incrementa `total_vistas` en 1. Sin auth requerida (lo llama el detalle al
 * montar). Idempotencia / dedup por usuario quedan para más adelante.
 */
export async function registrarVista(articuloId: string) {
    try {
        const vistas24hKey = `articulo:vistas24h:${articuloId}`;

        const [, valor] = await Promise.all([
            db.execute(sql`
                UPDATE articulos_marketplace
                SET total_vistas = total_vistas + 1
                WHERE id = ${articuloId}
                  AND deleted_at IS NULL
            `),
            redis.incr(vistas24hKey),
        ]);

        // Aplica TTL de 24h solo al crear la key (valor === 1 → recién creada).
        if (valor === 1) {
            await redis.expire(vistas24hKey, 86400);
        }

        return { success: true };
    } catch (error) {
        console.error('Error al registrar vista MarketPlace:', error);
        throw error;
    }
}

// =============================================================================
// UPLOAD DE IMAGEN — Presigned URL para R2
// =============================================================================

/**
 * Genera una URL pre-firmada para que el frontend suba una foto directamente a
 * R2 con prefijo `marketplace/`. Reusa el patrón de
 * `articulos.service.ts → generarUrlUploadImagenArticulo`.
 */
export async function generarUrlUploadImagenMarketplace(
    nombreArchivo: string,
    contentType: string
) {
    const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
    return generarPresignedUrl('marketplace', nombreArchivo, contentType, 300, TIPOS_PERMITIDOS);
}

// =============================================================================
// PERFIL DEL VENDEDOR (Sprint 5)
// =============================================================================

/**
 * Formatea el promedio de minutos de respuesta a un string corto para el UI.
 *
 *  null / sin datos → '—'
 *  < 60   → '<1h'
 *  < 1440 → 'Xh' (horas)
 *  >= 1440 → 'Xd' (días)
 */
function formatearTiempoRespuesta(minutos: number | null): string {
    if (minutos === null || minutos === undefined || isNaN(minutos) || minutos < 0) {
        return '—';
    }
    if (minutos < 60) return '<1h';
    if (minutos < 1440) {
        const horas = Math.round(minutos / 60);
        return `${horas}h`;
    }
    const dias = Math.round(minutos / 1440);
    return `${dias}d`;
}

interface PerfilVendedor {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    ciudad: string | null;
    /** Teléfono para CTA de WhatsApp en P3. null si el vendedor no lo tiene. */
    telefono: string | null;
    miembroDesde: string; // ISO de created_at
    kpis: {
        publicacionesActivas: number;
        vendidos: number;
        tiempoRespuesta: string;
    };
}

/**
 * Obtiene el perfil público de un vendedor (P3 del MarketPlace).
 *
 * KPIs:
 *  - Publicaciones activas: COUNT(*) WHERE estado='activa' AND deleted_at IS NULL.
 *  - Vendidos: COUNT(*) WHERE estado='vendida'.
 *  - Tiempo de respuesta: promedio de minutos entre el primer mensaje del
 *    comprador y la primera respuesta del vendedor en cada conversación de
 *    los últimos 30 días. NO se filtra por contexto_tipo — el tiempo de
 *    respuesta es característica de la persona, no del módulo (decisión
 *    aplicada al feedback del usuario para que el KPI sea útil en beta).
 *
 * Si el vendedor bloqueó al `usuarioActualId`, devuelve 404 sin revelar el
 * motivo (privacidad del bloqueo).
 */
export async function obtenerVendedorPorId(
    vendedorId: string,
    usuarioActualId?: string
) {
    try {
        // 1) Si hay usuario logueado, verificar bloqueo (vendedor → usuario actual)
        if (usuarioActualId) {
            const bloqueo = await db.execute(sql`
                SELECT 1 FROM chat_bloqueados
                WHERE usuario_id = ${vendedorId} AND bloqueado_id = ${usuarioActualId}
                LIMIT 1
            `);
            if (bloqueo.rows.length > 0) {
                return { success: false, message: 'Vendedor no encontrado', code: 404 };
            }
        }

        // 2) Datos básicos del vendedor + KPIs de articulos en una query
        const datos = await db.execute(sql`
            SELECT
                u.id, u.nombre, u.apellidos, u.avatar_url, u.ciudad, u.telefono,
                u.created_at,
                COALESCE(act.total, 0) AS activas,
                COALESCE(vend.total, 0) AS vendidos
            FROM usuarios u
            LEFT JOIN (
                SELECT usuario_id, COUNT(*)::int AS total
                FROM articulos_marketplace
                WHERE estado = 'activa' AND deleted_at IS NULL
                GROUP BY usuario_id
            ) act ON act.usuario_id = u.id
            LEFT JOIN (
                SELECT usuario_id, COUNT(*)::int AS total
                FROM articulos_marketplace
                WHERE estado = 'vendida' AND deleted_at IS NULL
                GROUP BY usuario_id
            ) vend ON vend.usuario_id = u.id
            WHERE u.id = ${vendedorId}
            LIMIT 1
        `);

        if (datos.rows.length === 0) {
            return { success: false, message: 'Vendedor no encontrado', code: 404 };
        }

        const row = datos.rows[0] as {
            id: string;
            nombre: string;
            apellidos: string;
            avatar_url: string | null;
            ciudad: string | null;
            telefono: string | null;
            created_at: string;
            activas: number;
            vendidos: number;
        };

        // 3) Tiempo de respuesta promedio en últimos 30 días (helper reutilizable).
        const minutos = await calcularTiempoRespuesta(vendedorId);

        const perfil: PerfilVendedor = {
            id: row.id,
            nombre: row.nombre,
            apellidos: row.apellidos,
            avatarUrl: row.avatar_url,
            ciudad: row.ciudad,
            telefono: row.telefono,
            miembroDesde: row.created_at,
            kpis: {
                publicacionesActivas: row.activas,
                vendidos: row.vendidos,
                tiempoRespuesta: formatearTiempoRespuesta(minutos),
            },
        };

        return { success: true, data: perfil };
    } catch (error) {
        console.error('Error al obtener perfil del vendedor:', error);
        throw error;
    }
}

/**
 * Lista pública paginada de artículos de un vendedor por estado. Distinto de
 * `obtenerMisArticulos` (que toma usuario del token) porque acá el caller es
 * cualquier visitante que ve el perfil del vendedor.
 *
 * Si el visitante está autenticado (`visitanteId` no null), cada artículo
 * incluye `guardado: boolean` indicando si el visitante lo tiene en Mis
 * Guardados. Esto permite que el corazón de la card refleje el estado real
 * desde el primer render (sin esperar fetch adicional).
 */
export async function obtenerArticulosDeVendedor(
    vendedorId: string,
    estado: 'activa' | 'vendida',
    paginacion: { limit: number; offset: number },
    visitanteId: string | null = null
) {
    try {
        // Si hay visitante autenticado, agregamos un subquery EXISTS para
        // saber si guardó cada artículo. Si no, devolvemos FALSE para todos.
        const guardadoExpr = visitanteId
            ? sql`EXISTS (
                    SELECT 1 FROM guardados g
                    WHERE g.usuario_id = ${visitanteId}
                      AND g.entity_type = 'articulo_marketplace'
                      AND g.entity_id = a.id
                  ) AS usuario_guardo`
            : sql`FALSE AS usuario_guardo`;

        const resultado = await db.execute(sql`
            SELECT
                a.id, a.usuario_id, a.titulo, a.descripcion, a.precio,
                a.condicion, a.acepta_ofertas, a.unidad_venta,
                a.fotos, a.foto_portada_index,
                ST_Y(a.ubicacion_aproximada::geometry) AS lat,
                ST_X(a.ubicacion_aproximada::geometry) AS lng,
                a.ciudad, a.zona_aproximada, a.estado,
                a.total_vistas, a.total_mensajes, a.total_guardados,
                a.expira_at, a.created_at, a.updated_at, a.vendida_at,
                ${guardadoExpr}
            FROM articulos_marketplace a
            WHERE a.usuario_id = ${vendedorId}
              AND a.estado = ${estado}
              AND a.deleted_at IS NULL
            ORDER BY ${estado === 'vendida' ? sql`a.vendida_at` : sql`a.created_at`} DESC
            LIMIT ${paginacion.limit}
            OFFSET ${paginacion.offset}
        `);

        const totalResultado = await db.execute(sql`
            SELECT COUNT(*)::int AS total
            FROM articulos_marketplace
            WHERE usuario_id = ${vendedorId}
              AND estado = ${estado}
              AND deleted_at IS NULL
        `);

        const total = (totalResultado.rows[0] as { total: number }).total;
        const data = (
            resultado.rows as unknown as Array<RawArticuloDb & { usuario_guardo: boolean }>
        ).map((row) => ({
            ...mapearArticulo(row),
            guardado: row.usuario_guardo,
        }));

        return {
            success: true,
            data,
            paginacion: { total, limit: paginacion.limit, offset: paginacion.offset },
        };
    } catch (error) {
        console.error('Error al obtener artículos del vendedor:', error);
        throw error;
    }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
    aleatorizarCoordenada,
    eliminarFotoMarketplaceSiHuerfana,
    crearArticulo,
    obtenerArticuloPorId,
    obtenerFeed,
    obtenerFeedInfinito,
    obtenerMisArticulos,
    actualizarArticulo,
    cambiarEstado,
    eliminarArticulo,
    registrarVista,
    registrarHeartbeat,
    generarUrlUploadImagenMarketplace,
    obtenerVendedorPorId,
    obtenerArticulosDeVendedor,
};
