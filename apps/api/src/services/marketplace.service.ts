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
import { articulosMarketplace } from '../db/schemas/schema.js';
import { eliminarArchivo, generarPresignedUrl } from './r2.service.js';
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
    condicion: string;
    aceptaOfertas: boolean;
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
    };
}

interface ArticuloFeedRow extends ArticuloRow {
    distanciaMetros: number | null;
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
    condicion: string;
    acepta_ofertas: boolean;
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
// CREAR ARTÍCULO
// =============================================================================

/**
 * Crea un nuevo artículo del MarketPlace.
 *
 * - `expira_at` = NOW() + 30 días (TTL para auto-pausa por cron del Sprint 7)
 * - `ubicacion` = punto exacto recibido (privado)
 * - `ubicacion_aproximada` = punto aleatorizado dentro de 500m (público)
 *
 * @param usuarioId - UUID del usuario en modo Personal (validado por middleware)
 * @param datos    - Payload validado por `crearArticuloSchema`
 */
export async function crearArticulo(
    usuarioId: string,
    datos: CrearArticuloInput
) {
    try {
        const aprox = aleatorizarCoordenada(datos.latitud, datos.longitud);

        const resultado = await db.execute(sql`
            INSERT INTO articulos_marketplace (
                usuario_id, titulo, descripcion, precio, condicion, acepta_ofertas,
                fotos, foto_portada_index,
                ubicacion, ubicacion_aproximada,
                ciudad, zona_aproximada,
                expira_at
            ) VALUES (
                ${usuarioId},
                ${datos.titulo},
                ${datos.descripcion},
                ${datos.precio},
                ${datos.condicion},
                ${datos.aceptaOfertas},
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
                a.condicion, a.acepta_ofertas,
                a.fotos, a.foto_portada_index,
                ST_Y(a.ubicacion_aproximada::geometry) AS lat,
                ST_X(a.ubicacion_aproximada::geometry) AS lng,
                a.ciudad, a.zona_aproximada, a.estado,
                a.total_vistas, a.total_mensajes, a.total_guardados,
                a.expira_at, a.created_at, a.updated_at, a.vendida_at,
                u.id           AS vendedor_id,
                u.nombre       AS vendedor_nombre,
                u.apellidos    AS vendedor_apellidos,
                u.avatar_url   AS vendedor_avatar_url,
                u.ciudad       AS vendedor_ciudad
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
        };

        const data: ArticuloConVendedorRow = {
            ...mapearArticulo(row),
            vendedor: {
                id: row.vendedor_id,
                nombre: row.vendedor_nombre,
                apellidos: row.vendedor_apellidos,
                avatarUrl: row.vendedor_avatar_url,
                ciudad: row.vendedor_ciudad,
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
                a.condicion, a.acepta_ofertas,
                a.fotos, a.foto_portada_index,
                ST_Y(a.ubicacion_aproximada::geometry) AS lat,
                ST_X(a.ubicacion_aproximada::geometry) AS lng,
                a.ciudad, a.zona_aproximada, a.estado,
                a.total_vistas, a.total_mensajes, a.total_guardados,
                a.expira_at, a.created_at, a.updated_at, a.vendida_at,
                ST_Distance(
                    a.ubicacion_aproximada,
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
                ) AS distancia_metros
            FROM articulos_marketplace a
            WHERE a.estado = 'activa'
              AND a.deleted_at IS NULL
              AND a.ciudad = ${ciudad}
            ORDER BY a.created_at DESC
            LIMIT 20
        `);

        const cercanosResultado = await db.execute(sql`
            SELECT
                a.id, a.usuario_id, a.titulo, a.descripcion, a.precio,
                a.condicion, a.acepta_ofertas,
                a.fotos, a.foto_portada_index,
                ST_Y(a.ubicacion_aproximada::geometry) AS lat,
                ST_X(a.ubicacion_aproximada::geometry) AS lng,
                a.ciudad, a.zona_aproximada, a.estado,
                a.total_vistas, a.total_mensajes, a.total_guardados,
                a.expira_at, a.created_at, a.updated_at, a.vendida_at,
                ST_Distance(
                    a.ubicacion_aproximada,
                    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
                ) AS distancia_metros
            FROM articulos_marketplace a
            WHERE a.estado = 'activa'
              AND a.deleted_at IS NULL
              AND a.ciudad = ${ciudad}
            ORDER BY a.ubicacion_aproximada <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
            LIMIT 20
        `);

        const mapearConDistancia = (
            row: RawArticuloDb & { distancia_metros: number | null }
        ): ArticuloFeedRow => ({
            ...mapearArticulo(row),
            distanciaMetros:
                row.distancia_metros !== null ? Math.round(row.distancia_metros) : null,
        });

        return {
            success: true,
            data: {
                recientes: (recientesResultado.rows as unknown as Array<
                    RawArticuloDb & { distancia_metros: number | null }
                >).map(mapearConDistancia),
                cercanos: (cercanosResultado.rows as unknown as Array<
                    RawArticuloDb & { distancia_metros: number | null }
                >).map(mapearConDistancia),
            },
        };
    } catch (error) {
        console.error('Error al obtener feed MarketPlace:', error);
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
                a.condicion, a.acepta_ofertas,
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

        // 2) Construir SET dinámico. expira_at NUNCA se incluye.
        const sets: ReturnType<typeof sql>[] = [sql`updated_at = NOW()`];

        if (datos.titulo !== undefined) sets.push(sql`titulo = ${datos.titulo}`);
        if (datos.descripcion !== undefined) sets.push(sql`descripcion = ${datos.descripcion}`);
        if (datos.precio !== undefined) sets.push(sql`precio = ${datos.precio}`);
        if (datos.condicion !== undefined) sets.push(sql`condicion = ${datos.condicion}`);
        if (datos.aceptaOfertas !== undefined) sets.push(sql`acepta_ofertas = ${datos.aceptaOfertas}`);
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
        await db.execute(sql`
            UPDATE articulos_marketplace
            SET total_vistas = total_vistas + 1
            WHERE id = ${articuloId}
              AND deleted_at IS NULL
        `);
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
// EXPORTS
// =============================================================================

export default {
    aleatorizarCoordenada,
    eliminarFotoMarketplaceSiHuerfana,
    crearArticulo,
    obtenerArticuloPorId,
    obtenerFeed,
    obtenerMisArticulos,
    actualizarArticulo,
    cambiarEstado,
    eliminarArticulo,
    registrarVista,
    generarUrlUploadImagenMarketplace,
};
