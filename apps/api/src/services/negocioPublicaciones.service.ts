/**
 * ============================================================================
 * NEGOCIO PUBLICACIONES SERVICE — Feed de publicaciones libres de negocio
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/negocioPublicaciones.service.ts
 *
 * PROPÓSITO:
 * Lógica de negocio del feed de publicaciones de Negocios. Contenido "todo
 * tipo, libre" (aviso, foto del local, producto nuevo, evento) publicado por
 * negocios en modo Comercial. NO reemplaza a `ofertas` (descuentos
 * estructurados).
 *
 * Doc maestro: docs/arquitectura/Negocios.md
 *
 * Reglas críticas (NO romper):
 * - Un post pertenece a UNA sucursal (local físico) — `sucursal_id` NOT NULL.
 * - `ciudad_id` se desnormaliza desde `negocio_sucursales.ciudad_id` SOLO al
 *   crear (no se resincroniza si la sucursal cambia de ciudad después).
 * - Sin TTL (a diferencia de MarketPlace): solo archivado manual.
 * - Fotos sin límite de producto — el tope de 40 en Zod/CHECK es guardarraíl
 *   técnico anti-abuso, no una restricción de negocio.
 * - Quién puede publicar ya lo resuelve la cadena de middlewares
 *   (verificarNegocio + validarAccesoSucursal) — este service no re-valida
 *   estado de cuenta ni pertenencia de sucursal más allá del negocioId.
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { redis } from '../db/redis.js';
import { negocioPublicaciones } from '../db/schemas/schema.js';
import { eliminarArchivo, generarPresignedUrl } from './r2.service.js';
import { validarTextoPublicacion } from './marketplace/filtros.js';
import { resolverCiudadId } from '../utils/ciudades.js';
import { armarArbolComentarios, type ComentarioNodo } from './comentarios/arbol.js';
import type {
    CrearPublicacionInput,
    ActualizarPublicacionInput,
} from '../validations/negocioPublicaciones.schema.js';

// =============================================================================
// TIPOS DE RESPUESTA
// =============================================================================

export interface PublicacionFeedItem {
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
 * Item del feed enriquecido con comentarios embebidos — mismo patrón que
 * `ArticuloFeedInfinitoRow.topComentarios` de MarketPlace: evita que cada
 * card del feed pida sus comentarios aparte (N+1). Árbol completo (raíces +
 * respuestas, sin LIMIT) — el cliente decide cuántos hilos muestra inline.
 * Solo lo devuelve el feed; el detalle (`PublicacionDetalle`) sigue pidiendo
 * comentarios por su cuenta (una sola publicación, no hay N+1 que evitar).
 */
export interface PublicacionFeedItemConComentarios extends PublicacionFeedItem {
    topComentarios: ComentarioNodo[];
    totalComentarios: number;
    /** Distancia del usuario a la sucursal en km. `null` si no hay GPS. */
    distanciaKm: number | null;
}

export interface PublicacionDetalle extends PublicacionFeedItem {
    autorUsuarioId: string;
    estado: string;
    updatedAt: string;
    /** Distancia del usuario a la sucursal en km. `null` si no hay GPS. */
    distanciaKm: number | null;
}

interface RawPublicacionRow {
    id: string;
    negocio_id: string;
    sucursal_id: string;
    autor_usuario_id?: string;
    texto: string;
    precio: string | null;
    fotos: string[];
    foto_portada_index: number;
    estado?: string;
    total_vistas: number;
    created_at: string;
    updated_at?: string;
    sucursal_nombre: string;
    sucursal_avatar_url: string | null;
    ciudad_nombre: string | null;
}

function mapearFilaFeed(row: RawPublicacionRow): PublicacionFeedItem {
    return {
        id: row.id,
        negocioId: row.negocio_id,
        sucursalId: row.sucursal_id,
        sucursalNombre: row.sucursal_nombre,
        sucursalAvatarUrl: row.sucursal_avatar_url,
        ciudadNombre: row.ciudad_nombre,
        texto: row.texto,
        precio: row.precio,
        fotos: row.fotos,
        fotoPortadaIndex: row.foto_portada_index,
        totalVistas: row.total_vistas,
        createdAt: row.created_at,
    };
}

/** Fila plana de comentario tal como sale del json_agg (snake_case). */
interface RawComentarioPlano {
    id: string;
    autor_id: string;
    parent_id: string | null;
    texto: string;
    es_vendedor: boolean;
    editado_at: string | null;
    created_at: string;
    autor_nombre: string;
    autor_apellidos: string;
    autor_avatar_url: string | null;
}

interface RawPublicacionFeedRow extends RawPublicacionRow {
    total_comentarios: number;
    comentarios: RawComentarioPlano[] | null;
    distancia_km: number | null;
}

function mapearFilaFeedConComentarios(row: RawPublicacionFeedRow): PublicacionFeedItemConComentarios {
    return {
        ...mapearFilaFeed(row),
        totalComentarios: row.total_comentarios ?? 0,
        distanciaKm: row.distancia_km !== null && row.distancia_km !== undefined ? Number(row.distancia_km) : null,
        topComentarios: armarArbolComentarios(
            (row.comentarios ?? []).map((c) => ({
                id: c.id,
                autorId: c.autor_id,
                autorNombre: c.autor_nombre,
                autorApellidos: c.autor_apellidos,
                autorAvatarUrl: c.autor_avatar_url,
                parentId: c.parent_id,
                texto: c.texto,
                esVendedor: c.es_vendedor,
                editadoAt: c.editado_at,
                createdAt: c.created_at,
            }))
        ),
    };
}

interface RawPublicacionDetalleRow extends RawPublicacionRow {
    distancia_km: number | null;
}

function mapearFilaDetalle(row: RawPublicacionDetalleRow): PublicacionDetalle {
    return {
        ...mapearFilaFeed(row),
        autorUsuarioId: row.autor_usuario_id as string,
        estado: row.estado as string,
        updatedAt: row.updated_at as string,
        distanciaKm: row.distancia_km !== null && row.distancia_km !== undefined ? Number(row.distancia_km) : null,
    };
}

// =============================================================================
// CREAR PUBLICACIÓN
// =============================================================================

export async function crearPublicacion(
    negocioId: string,
    sucursalId: string,
    autorUsuarioId: string,
    input: CrearPublicacionInput
): Promise<{ success: boolean; message: string; code: number; data?: { id: string } }> {
    try {
        // La sucursal debe pertenecer al negocio (defensivo — validarAccesoSucursal
        // ya lo confina, pero un post SIEMPRE debe quedar amarrado al negocio dueño).
        const sucursalResult = await db.execute(sql`
            SELECT ciudad_id
            FROM negocio_sucursales
            WHERE id = ${sucursalId} AND negocio_id = ${negocioId}
            LIMIT 1
        `);
        if (sucursalResult.rows.length === 0) {
            return { success: false, message: 'Sucursal no encontrada', code: 404 };
        }
        const ciudadId = (sucursalResult.rows[0] as { ciudad_id: string | null }).ciudad_id;

        const validacion = validarTextoPublicacion(input.texto, '');
        if (!validacion.valido && validacion.severidad === 'rechazo') {
            return { success: false, message: validacion.mensaje, code: 422 };
        }

        const fotosJson = JSON.stringify(input.fotos ?? []);
        const insertResult = await db.execute(sql`
            INSERT INTO negocio_publicaciones
                (negocio_id, sucursal_id, autor_usuario_id, texto, precio, fotos, foto_portada_index, ciudad_id)
            VALUES
                (${negocioId}, ${sucursalId}, ${autorUsuarioId}, ${input.texto},
                 ${input.precio ?? null}, ${fotosJson}::jsonb, ${input.fotoPortadaIndex ?? 0}, ${ciudadId})
            RETURNING id
        `);
        const nueva = insertResult.rows[0] as { id: string };

        return { success: true, message: 'Publicación creada', code: 201, data: { id: nueva.id } };
    } catch (error) {
        console.error('Error al crear publicación de negocio:', error);
        throw error;
    }
}

// =============================================================================
// FEED
// =============================================================================

interface OpcionesFeedPublicaciones {
    /** Nombre de ciudad (mismo patrón que MarketPlace/Servicios) — se resuelve a UUID aquí. */
    ciudad?: string;
    sucursalId?: string;
    pagina: number;
    limite: number;
    // ── Mismos filtros que `listarSucursalesCercanas` (negocios.service.ts) —
    // una publicación hereda los filtros del negocio/sucursal que la hizo.
    latitud?: number;
    longitud?: number;
    /** Radio en km. Solo restringe cuando el caller manda "Cerca de ti"
     *  activo; si no, default 50km (igual que negocios — no es una
     *  restricción real en un contexto hiperlocal de una sola ciudad). */
    distanciaMaxKm?: number;
    categoriaId?: number;
    subcategoriaIds?: number[];
    aceptaCardYA?: boolean;
    aDomicilio?: boolean;
}

export async function obtenerFeedPublicacionesNegocio(opciones: OpcionesFeedPublicaciones): Promise<{
    success: boolean;
    data: { publicaciones: PublicacionFeedItemConComentarios[]; hayMas: boolean };
}> {
    try {
        const {
            ciudad, sucursalId, pagina, limite,
            latitud, longitud, distanciaMaxKm = 50,
            categoriaId, subcategoriaIds, aceptaCardYA, aDomicilio,
        } = opciones;
        const ciudadId = await resolverCiudadId(ciudad);
        const offset = (pagina - 1) * limite;

        const filtroCiudad = ciudadId ? sql`AND p.ciudad_id = ${ciudadId}` : sql``;
        const filtroSucursal = sucursalId ? sql`AND p.sucursal_id = ${sucursalId}` : sql``;

        const tieneGps = latitud !== undefined && longitud !== undefined;
        const filtroDistancia = tieneGps
            ? sql`
                AND ST_DWithin(
                    s.ubicacion::geography,
                    ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography,
                    ${distanciaMaxKm * 1000}
                )
              `
            : sql``;
        const distanciaKmSelect = tieneGps
            ? sql`
                ST_Distance(
                    s.ubicacion::geography,
                    ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography
                ) / 1000
              `
            : sql`NULL`;

        const filtroCategoria = categoriaId
            ? sql`
                AND EXISTS(
                    SELECT 1 FROM asignacion_subcategorias asig_sub
                    JOIN subcategorias_negocio sc ON sc.id = asig_sub.subcategoria_id
                    WHERE asig_sub.negocio_id = p.negocio_id
                      AND sc.categoria_id = ${categoriaId}
                )
              `
            : sql``;
        const filtroSubcategorias = subcategoriaIds && subcategoriaIds.length > 0
            ? sql`
                AND EXISTS(
                    SELECT 1 FROM asignacion_subcategorias asig_sub
                    WHERE asig_sub.negocio_id = p.negocio_id
                      AND asig_sub.subcategoria_id IN (${sql.join(subcategoriaIds.map((id) => sql`${id}`), sql`, `)})
                )
              `
            : sql``;
        const filtroCardYA = aceptaCardYA !== undefined
            ? sql`AND n.participa_puntos = ${aceptaCardYA}`
            : sql``;
        const filtroADomicilio = aDomicilio === true
            ? sql`AND (s.tiene_envio_domicilio = true OR s.tiene_servicio_domicilio = true)`
            : sql``;

        // Comentarios embebidos (mismo patrón que `obtenerFeedInfinito` de
        // MarketPlace) — evita que cada card del feed pida sus comentarios
        // aparte (N+1). `es_vendedor` = el autor es dueño/gerente del NEGOCIO
        // (no solo de esta publicación puntual), igual criterio que
        // `services/negocioPublicaciones/comentarios.ts`.
        const resultado = await db.execute(sql`
            SELECT
                p.id, p.negocio_id, p.sucursal_id, p.texto, p.precio, p.fotos,
                p.foto_portada_index, p.total_vistas, p.created_at,
                s.nombre AS sucursal_nombre, s.foto_perfil AS sucursal_avatar_url,
                c.nombre AS ciudad_nombre,
                ${distanciaKmSelect} AS distancia_km,
                COALESCE(cq.total, 0) AS total_comentarios,
                COALESCE(
                    (
                        SELECT json_agg(cc ORDER BY cc.created_at ASC)
                        FROM (
                            SELECT
                                npc.id,
                                npc.autor_id,
                                npc.parent_id,
                                npc.texto,
                                (n.usuario_id = npc.autor_id OR uc.negocio_id = p.negocio_id) AS es_vendedor,
                                npc.editado_at,
                                npc.created_at,
                                uc.nombre AS autor_nombre,
                                uc.apellidos AS autor_apellidos,
                                uc.avatar_url AS autor_avatar_url
                            FROM negocio_publicaciones_comentarios npc
                            INNER JOIN usuarios uc ON uc.id = npc.autor_id
                            WHERE npc.publicacion_id = p.id
                              AND npc.deleted_at IS NULL
                        ) cc
                    ),
                    '[]'::json
                ) AS comentarios
            FROM negocio_publicaciones p
            INNER JOIN negocio_sucursales s ON s.id = p.sucursal_id
            INNER JOIN negocios n ON n.id = p.negocio_id
            LEFT JOIN ciudades c ON c.id = p.ciudad_id
            LEFT JOIN (
                SELECT publicacion_id, COUNT(*)::int AS total
                FROM negocio_publicaciones_comentarios
                WHERE deleted_at IS NULL
                GROUP BY publicacion_id
            ) cq ON cq.publicacion_id = p.id
            WHERE p.deleted_at IS NULL
              AND p.estado = 'activa'
              -- Mismos filtros de "elegibilidad" que el directorio de
              -- Negocios: negocio activo, publicado (no borrador/onboarding
              -- pendiente) y no-demo. Si el negocio se desactiva, sus
              -- publicaciones viejas dejan de aparecer en el feed.
              AND n.activo = true
              AND s.activa = true
              AND n.es_borrador = false
              AND n.onboarding_completado = true
              AND n.es_demo = false
              ${filtroCiudad}
              ${filtroSucursal}
              ${filtroDistancia}
              ${filtroCategoria}
              ${filtroSubcategorias}
              ${filtroCardYA}
              ${filtroADomicilio}
            ORDER BY p.created_at DESC
            LIMIT ${limite + 1} OFFSET ${offset}
        `);

        const filas = resultado.rows as unknown as RawPublicacionFeedRow[];
        const hayMas = filas.length > limite;
        const publicaciones = filas.slice(0, limite).map(mapearFilaFeedConComentarios);

        return { success: true, data: { publicaciones, hayMas } };
    } catch (error) {
        console.error('Error al obtener feed de publicaciones de negocio:', error);
        throw error;
    }
}

// =============================================================================
// DETALLE
// =============================================================================

export async function obtenerPublicacion(
    id: string,
    gps?: { latitud?: number; longitud?: number }
): Promise<{ success: boolean; message?: string; code?: number; data?: PublicacionDetalle }> {
    try {
        const { latitud, longitud } = gps ?? {};
        const tieneGps = latitud !== undefined && longitud !== undefined;
        const distanciaKmSelect = tieneGps
            ? sql`
                ST_Distance(
                    s.ubicacion::geography,
                    ST_SetSRID(ST_MakePoint(${longitud}, ${latitud}), 4326)::geography
                ) / 1000
              `
            : sql`NULL`;

        const resultado = await db.execute(sql`
            SELECT
                p.id, p.negocio_id, p.sucursal_id, p.autor_usuario_id, p.texto, p.precio,
                p.fotos, p.foto_portada_index, p.estado, p.total_vistas, p.created_at, p.updated_at,
                s.nombre AS sucursal_nombre, s.foto_perfil AS sucursal_avatar_url,
                c.nombre AS ciudad_nombre,
                ${distanciaKmSelect} AS distancia_km
            FROM negocio_publicaciones p
            INNER JOIN negocio_sucursales s ON s.id = p.sucursal_id
            LEFT JOIN ciudades c ON c.id = p.ciudad_id
            WHERE p.id = ${id} AND p.deleted_at IS NULL
            LIMIT 1
        `);

        if (resultado.rows.length === 0) {
            return { success: false, message: 'Publicación no encontrada', code: 404 };
        }

        return { success: true, data: mapearFilaDetalle(resultado.rows[0] as unknown as RawPublicacionDetalleRow) };
    } catch (error) {
        console.error('Error al obtener publicación de negocio:', error);
        throw error;
    }
}

// =============================================================================
// ACTUALIZAR
// =============================================================================

export async function actualizarPublicacion(
    id: string,
    negocioId: string,
    input: ActualizarPublicacionInput
): Promise<{ success: boolean; message: string; code: number }> {
    try {
        const verificacion = await db.execute(sql`
            SELECT negocio_id
            FROM negocio_publicaciones
            WHERE id = ${id} AND deleted_at IS NULL
            LIMIT 1
        `);
        if (verificacion.rows.length === 0) {
            return { success: false, message: 'Publicación no encontrada', code: 404 };
        }
        const dueno = (verificacion.rows[0] as { negocio_id: string }).negocio_id;
        if (dueno !== negocioId) {
            return { success: false, message: 'No tienes permiso para editar esta publicación', code: 403 };
        }

        if (input.texto !== undefined) {
            const validacion = validarTextoPublicacion(input.texto, '');
            if (!validacion.valido && validacion.severidad === 'rechazo') {
                return { success: false, message: validacion.mensaje, code: 422 };
            }
        }

        await db.execute(sql`
            UPDATE negocio_publicaciones SET
                texto = ${input.texto === undefined ? sql`texto` : input.texto},
                precio = ${input.precio === undefined ? sql`precio` : input.precio},
                fotos = ${input.fotos === undefined ? sql`fotos` : sql`${JSON.stringify(input.fotos)}::jsonb`},
                foto_portada_index = ${input.fotoPortadaIndex === undefined ? sql`foto_portada_index` : input.fotoPortadaIndex},
                updated_at = NOW()
            WHERE id = ${id}
        `);

        return { success: true, message: 'Publicación actualizada', code: 200 };
    } catch (error) {
        console.error('Error al actualizar publicación de negocio:', error);
        throw error;
    }
}

// =============================================================================
// ARCHIVAR (soft-delete manual — sin TTL)
// =============================================================================

export async function archivarPublicacion(
    id: string,
    negocioId: string
): Promise<{ success: boolean; message: string; code: number }> {
    try {
        const verificacion = await db.execute(sql`
            SELECT negocio_id
            FROM negocio_publicaciones
            WHERE id = ${id} AND deleted_at IS NULL
            LIMIT 1
        `);
        if (verificacion.rows.length === 0) {
            return { success: false, message: 'Publicación no encontrada', code: 404 };
        }
        const dueno = (verificacion.rows[0] as { negocio_id: string }).negocio_id;
        if (dueno !== negocioId) {
            return { success: false, message: 'No tienes permiso para eliminar esta publicación', code: 403 };
        }

        await db.execute(sql`
            UPDATE negocio_publicaciones
            SET estado = 'archivada', deleted_at = NOW(), updated_at = NOW()
            WHERE id = ${id}
        `);

        return { success: true, message: 'Publicación archivada', code: 200 };
    } catch (error) {
        console.error('Error al archivar publicación de negocio:', error);
        throw error;
    }
}

// =============================================================================
// REGISTRAR VISTA (sin auth requerida, dedup 24h por Redis igual que MarketPlace)
// =============================================================================

export async function registrarVistaPublicacion(id: string): Promise<{ success: boolean }> {
    try {
        const vistas24hKey = `negocio_publicacion:vistas24h:${id}`;

        const [, valor] = await Promise.all([
            db.execute(sql`
                UPDATE negocio_publicaciones
                SET total_vistas = total_vistas + 1
                WHERE id = ${id} AND deleted_at IS NULL
            `),
            redis.incr(vistas24hKey),
        ]);

        if (valor === 1) {
            await redis.expire(vistas24hKey, 86400);
        }

        return { success: true };
    } catch (error) {
        console.error('Error al registrar vista de publicación de negocio:', error);
        throw error;
    }
}

// =============================================================================
// UPLOAD DE IMAGEN — Presigned URL para R2
// =============================================================================

export async function generarUrlUploadImagenNegocioPublicacion(
    nombreArchivo: string,
    contentType: string
) {
    const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
    return generarPresignedUrl('negocio-publicaciones', nombreArchivo, contentType, 300, TIPOS_PERMITIDOS);
}

/**
 * Borra una foto de R2 solo si ninguna OTRA publicación de negocio la sigue
 * referenciando. Calca `eliminarFotoMarketplaceSiHuerfana`. No se llama en
 * `archivarPublicacion` (soft-delete) — el reconcile global de R2 la
 * limpiará eventualmente.
 */
export async function eliminarFotoNegocioPublicacionSiHuerfana(
    url: string,
    excluirPublicacionId?: string
): Promise<void> {
    try {
        const filtroExcluir = excluirPublicacionId
            ? sql`AND id != ${excluirPublicacionId}`
            : sql``;

        const [{ total }] = await db
            .select({ total: sql<number>`COUNT(*)::int` })
            .from(negocioPublicaciones)
            .where(
                sql`${url} = ANY(ARRAY(SELECT jsonb_array_elements_text(fotos))) ${filtroExcluir}`
            );

        if (total > 0) {
            console.log(
                `ℹ️ Foto de publicación de negocio conservada (usada por ${total} publicación/es): ${url}`
            );
            return;
        }

        await eliminarArchivo(url);
    } catch (error) {
        console.error('Error procesando foto de publicación de negocio huérfana:', error);
        // No re-lanzar: la limpieza de R2 es best-effort, el reconcile global
        // la atrapará si quedó huérfana de verdad.
    }
}
