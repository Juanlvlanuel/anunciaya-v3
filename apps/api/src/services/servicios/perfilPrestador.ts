/**
 * perfilPrestador.ts
 * ===================
 * Servicios públicos del perfil de un prestador (cualquier usuario que tenga
 * publicaciones de Servicios). Sprint 5.
 *
 * Expone 3 endpoints:
 *   - obtenerPerfilPrestador      → datos del usuario + KPIs agregados
 *   - obtenerPublicacionesDelPrestador → listado de sus publicaciones activas
 *   - obtenerResenasDelPrestador  → listado de reseñas que ha recibido
 *
 * Las 3 corren independientes desde el frontend (paralelizables en React Query)
 * para que el primer paint del perfil llegue rápido y el resto vaya cayendo.
 *
 * Ubicación: apps/api/src/services/servicios/perfilPrestador.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';

// =============================================================================
// TIPOS DE RESPUESTA
// =============================================================================

export interface PerfilPrestadorRow {
    id: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
    ciudad: string | null;
    /** ISO de cuando se unió a AnunciaYA. */
    miembroDesde: string;
    /** Última conexión (heartbeat) — null si no se ha logueado nunca. */
    ultimaConexion: string | null;
    // KPIs agregados
    ratingPromedio: number | null;
    totalResenas: number;
    /** Cantidad de publicaciones activas (estado='activa' y no eliminadas). */
    totalPublicacionesActivas: number;
    /** Mediana del tiempo de respuesta en minutos. Lo poblará un cron mensual
     *  que calcula desde `chat_mensajes` el delta entre primer mensaje del
     *  cliente y primera respuesta del dueño. Por ahora null. */
    tiempoRespuestaMinutos: number | null;
}

export interface PublicacionDelPrestadorRow {
    id: string;
    modo: 'ofrezco' | 'solicito';
    tipo: 'servicio-persona' | 'vacante-empresa' | 'solicito';
    titulo: string;
    descripcion: string;
    fotos: string[];
    fotoPortadaIndex: number;
    precio: unknown;
    presupuesto: { min: number; max: number } | null;
    modalidad: 'presencial' | 'remoto' | 'hibrido';
    ciudad: string;
    zonasAproximadas: string[];
    categoria: string | null;
    urgente: boolean;
    estado: 'activa' | 'pausada';
    createdAt: string;
}

export interface ResenaPrestadorRow {
    id: string;
    publicacionId: string;
    publicacionTitulo: string | null;
    autor: {
        id: string;
        nombre: string;
        apellidos: string;
        avatarUrl: string | null;
    };
    rating: number;
    texto: string | null;
    createdAt: string;
}

// =============================================================================
// 1) Perfil base + KPIs
// =============================================================================

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RawPerfil = {
    id: string;
    nombre: string;
    apellidos: string;
    avatar_url: string | null;
    ciudad: string | null;
    created_at: string;
    ultima_conexion: string | null;
    servicio_tiempo_respuesta_minutos: number | null;
    rating_promedio: number | null;
    total_resenas: number;
    total_publicaciones_activas: number;
} & Record<string, unknown>;

export async function obtenerPerfilPrestador(usuarioId: string) {
    if (!UUID_REGEX.test(usuarioId)) {
        return {
            success: false as const,
            code: 400,
            message: 'ID de usuario inválido.',
        };
    }

    try {
        const result = await db.execute<RawPerfil>(sql`
            SELECT
                u.id,
                u.nombre,
                u.apellidos,
                u.avatar_url,
                u.ciudad,
                u.created_at,
                u.ultima_conexion,
                u.servicio_tiempo_respuesta_minutos,
                (
                    SELECT AVG(r.rating)::numeric(3,2)
                    FROM servicios_resenas r
                    WHERE r.destinatario_id = u.id
                      AND r.deleted_at IS NULL
                ) AS rating_promedio,
                (
                    SELECT COUNT(*)::int
                    FROM servicios_resenas r
                    WHERE r.destinatario_id = u.id
                      AND r.deleted_at IS NULL
                ) AS total_resenas,
                (
                    SELECT COUNT(*)::int
                    FROM servicios_publicaciones sp
                    WHERE sp.usuario_id = u.id
                      AND sp.estado = 'activa'
                      AND sp.deleted_at IS NULL
                ) AS total_publicaciones_activas
            FROM usuarios u
            WHERE u.id = ${usuarioId}
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos a este usuario.',
            };
        }

        const row = result.rows[0] as RawPerfil;
        const data: PerfilPrestadorRow = {
            id: row.id,
            nombre: row.nombre,
            apellidos: row.apellidos,
            avatarUrl: row.avatar_url,
            ciudad: row.ciudad,
            miembroDesde: row.created_at,
            ultimaConexion: row.ultima_conexion,
            ratingPromedio:
                row.rating_promedio !== null
                    ? Number(row.rating_promedio)
                    : null,
            totalResenas: Number(row.total_resenas),
            totalPublicacionesActivas: Number(row.total_publicaciones_activas),
            tiempoRespuestaMinutos:
                row.servicio_tiempo_respuesta_minutos !== null
                    ? Number(row.servicio_tiempo_respuesta_minutos)
                    : null,
        };

        return { success: true as const, code: 200, data };
    } catch (error) {
        console.error('Error en obtenerPerfilPrestador:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar el perfil.',
        };
    }
}

// =============================================================================
// 2) Publicaciones activas del prestador
// =============================================================================

interface OpcionesPublicacionesPrestador {
    estado?: 'activa' | 'pausada';
    limit?: number;
    offset?: number;
}

type RawPubDelPrestador = {
    id: string;
    modo: string;
    tipo: string;
    titulo: string;
    descripcion: string;
    fotos: string[];
    foto_portada_index: number;
    precio: unknown;
    presupuesto: { min: number; max: number } | null;
    modalidad: string;
    ciudad: string;
    zonas_aproximadas: string[];
    categoria: string | null;
    urgente: boolean;
    estado: string;
    created_at: string;
} & Record<string, unknown>;

export async function obtenerPublicacionesDelPrestador(
    usuarioId: string,
    opts: OpcionesPublicacionesPrestador = {},
) {
    if (!UUID_REGEX.test(usuarioId)) {
        return {
            success: false as const,
            code: 400,
            message: 'ID de usuario inválido.',
        };
    }

    const estado = opts.estado ?? 'activa';
    const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);
    const offset = Math.max(opts.offset ?? 0, 0);

    try {
        const result = await db.execute<RawPubDelPrestador>(sql`
            SELECT
                sp.id, sp.modo, sp.tipo,
                sp.titulo, sp.descripcion,
                sp.fotos, sp.foto_portada_index,
                sp.precio, sp.presupuesto, sp.modalidad,
                sp.ciudad, sp.zonas_aproximadas,
                sp.categoria, sp.urgente,
                sp.estado, sp.created_at
            FROM servicios_publicaciones sp
            WHERE sp.usuario_id = ${usuarioId}
              AND sp.deleted_at IS NULL
              AND sp.estado = ${estado}
            ORDER BY sp.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `);

        const items: PublicacionDelPrestadorRow[] = result.rows.map((r) => {
            const row = r as RawPubDelPrestador;
            return {
                id: row.id,
                modo: row.modo as 'ofrezco' | 'solicito',
                tipo: row.tipo as PublicacionDelPrestadorRow['tipo'],
                titulo: row.titulo,
                descripcion: row.descripcion,
                fotos: row.fotos ?? [],
                fotoPortadaIndex: row.foto_portada_index,
                precio: row.precio,
                presupuesto: row.presupuesto,
                modalidad: row.modalidad as PublicacionDelPrestadorRow['modalidad'],
                ciudad: row.ciudad,
                zonasAproximadas: row.zonas_aproximadas ?? [],
                categoria: row.categoria,
                urgente: row.urgente ?? false,
                estado: row.estado as 'activa' | 'pausada',
                createdAt: row.created_at,
            };
        });

        return { success: true as const, code: 200, data: items };
    } catch (error) {
        console.error('Error en obtenerPublicacionesDelPrestador:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar las publicaciones.',
        };
    }
}

// =============================================================================
// 3) Reseñas recibidas por el prestador
// =============================================================================

interface OpcionesResenasPrestador {
    limit?: number;
    offset?: number;
}

type RawResena = {
    id: string;
    publicacion_id: string;
    publicacion_titulo: string | null;
    autor_id: string;
    autor_nombre: string;
    autor_apellidos: string;
    autor_avatar_url: string | null;
    rating: number;
    texto: string | null;
    created_at: string;
} & Record<string, unknown>;

/**
 * Crear una reseña tras conversación cerrada en ChatYA o trigger manual.
 *
 * Reglas (también garantizadas por constraints BD):
 *   - rating 1-5 (Zod ya validó)
 *   - texto opcional max 200
 *   - autor != destinatario (BD CHECK no_self_review)
 *   - 1 reseña por (publicacion, autor) (BD UNIQUE)
 *
 * El destinatario se infiere de `servicios_publicaciones.usuario_id`.
 * Devuelve 409 si ya existe una reseña del autor para esa publicación.
 */
export async function crearResenaServicio(opts: {
    autorId: string;
    publicacionId: string;
    rating: number;
    texto: string | null;
}) {
    if (!UUID_REGEX.test(opts.publicacionId)) {
        return {
            success: false as const,
            code: 400,
            message: 'ID de publicación inválido.',
        };
    }

    try {
        // 1) Verificar publicación + obtener destinatario.
        const pubRes = await db.execute<{ usuario_id: string }>(sql`
            SELECT usuario_id
            FROM servicios_publicaciones
            WHERE id = ${opts.publicacionId}
              AND deleted_at IS NULL
            LIMIT 1
        `);
        if (pubRes.rows.length === 0) {
            return {
                success: false as const,
                code: 404,
                message: 'No encontramos esta publicación.',
            };
        }
        const destinatarioId = (
            pubRes.rows[0] as { usuario_id: string }
        ).usuario_id;

        if (destinatarioId === opts.autorId) {
            return {
                success: false as const,
                code: 400,
                message: 'No puedes reseñar tu propia publicación.',
            };
        }

        // 2) Verificar que el autor no haya reseñado ya esta publicación.
        const yaRes = await db.execute<{ id: string }>(sql`
            SELECT id
            FROM servicios_resenas
            WHERE publicacion_id = ${opts.publicacionId}
              AND autor_id = ${opts.autorId}
              AND deleted_at IS NULL
            LIMIT 1
        `);
        if (yaRes.rows.length > 0) {
            return {
                success: false as const,
                code: 409,
                message: 'Ya enviaste una reseña para esta publicación.',
            };
        }

        // 3) Insertar.
        const insertRes = await db.execute<{ id: string }>(sql`
            INSERT INTO servicios_resenas (
                publicacion_id, autor_id, destinatario_id, rating, texto
            ) VALUES (
                ${opts.publicacionId},
                ${opts.autorId},
                ${destinatarioId},
                ${opts.rating},
                ${opts.texto}
            )
            RETURNING id
        `);

        return {
            success: true as const,
            code: 201,
            data: {
                id: (insertRes.rows[0] as { id: string }).id,
                destinatarioId,
            },
        };
    } catch (error) {
        console.error('Error en crearResenaServicio:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos guardar la reseña.',
        };
    }
}

export async function obtenerResenasDelPrestador(
    usuarioId: string,
    opts: OpcionesResenasPrestador = {},
) {
    if (!UUID_REGEX.test(usuarioId)) {
        return {
            success: false as const,
            code: 400,
            message: 'ID de usuario inválido.',
        };
    }

    const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
    const offset = Math.max(opts.offset ?? 0, 0);

    try {
        const result = await db.execute<RawResena>(sql`
            SELECT
                r.id,
                r.publicacion_id,
                sp.titulo AS publicacion_titulo,
                r.autor_id,
                u.nombre AS autor_nombre,
                u.apellidos AS autor_apellidos,
                u.avatar_url AS autor_avatar_url,
                r.rating,
                r.texto,
                r.created_at
            FROM servicios_resenas r
            INNER JOIN usuarios u ON u.id = r.autor_id
            LEFT JOIN servicios_publicaciones sp ON sp.id = r.publicacion_id
            WHERE r.destinatario_id = ${usuarioId}
              AND r.deleted_at IS NULL
            ORDER BY r.created_at DESC
            LIMIT ${limit} OFFSET ${offset}
        `);

        const items: ResenaPrestadorRow[] = result.rows.map((r) => {
            const row = r as RawResena;
            return {
                id: row.id,
                publicacionId: row.publicacion_id,
                publicacionTitulo: row.publicacion_titulo,
                autor: {
                    id: row.autor_id,
                    nombre: row.autor_nombre,
                    apellidos: row.autor_apellidos,
                    avatarUrl: row.autor_avatar_url,
                },
                rating: row.rating,
                texto: row.texto,
                createdAt: row.created_at,
            };
        });

        return { success: true as const, code: 200, data: items };
    } catch (error) {
        console.error('Error en obtenerResenasDelPrestador:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar las reseñas.',
        };
    }
}
