/**
 * ============================================================================
 * VACANTES SERVICE (Sprint 8 — Business Studio)
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/services/vacantes.service.ts
 *
 * Service del módulo "Vacantes" en Business Studio. Los negocios publican
 * vacantes corporativas que aparecen en el feed público de Servicios con
 * `tipo='vacante-empresa'`. Esta capa orquesta:
 *
 *   - Validación de permisos (que el operador pertenezca al negocio + sucursal)
 *   - Filtrado por sucursal activa (cada sucursal ve solo sus vacantes)
 *   - Conversión a payload de `crearPublicacion` (fuerza modo='solicito' +
 *     tipo='vacante-empresa')
 *   - KPIs agregados (Total, Activas, Por expirar, Conversaciones)
 *   - Endpoint específico `cerrarVacante` (estado='cerrada')
 *
 * Reusa el service de servicios (`servicios.service.ts`) para todo lo común
 * (crear, actualizar, eliminar, cambiar estado). NO duplica lógica.
 *
 * Decisión 2026-05-17: cada sucursal gestiona sus propias vacantes desde su
 * propio BS — el interceptor de Axios manda `?sucursalId=` que el middleware
 * `validarAccesoSucursal` ya valida. Aquí solo filtramos las queries por esa
 * sucursal_id.
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
    crearPublicacion,
    actualizarPublicacion,
    eliminarPublicacion,
    type PublicacionRow,
} from './servicios.service.js';
import type {
    CrearVacanteInput,
    ActualizarVacanteInput,
    ListarVacantesQueryInput,
} from '../validations/servicios.schema.js';

// =============================================================================
// TIPOS DE RESPUESTA
// =============================================================================

export interface VacanteRow extends PublicacionRow {
    /** Nombre denormalizado de la sucursal (JOIN), para mostrar en la lista. */
    sucursalNombre: string | null;
}

export interface KpisVacantes {
    total: number;
    activas: number;
    /** Vacantes que vencen en los próximos 5 días (estado='activa'). */
    porExpirar: number;
    /** Suma de total_mensajes de todas las vacantes (estado distinto a eliminada). */
    conversaciones: number;
}

// =============================================================================
// HELPER INTERNO
// =============================================================================

/**
 * Verifica que la vacante existe, pertenece al usuario que la está modificando,
 * y opcionalmente que pertenece a la sucursal activa. Devuelve la fila o null.
 */
async function verificarVacanteDelUsuario(
    publicacionId: string,
    usuarioId: string
): Promise<{ existe: boolean; sucursalId: string | null } | null> {
    const res = await db.execute<{ sucursal_id: string | null }>(sql`
        SELECT sucursal_id
        FROM servicios_publicaciones
        WHERE id = ${publicacionId}
          AND usuario_id = ${usuarioId}
          AND tipo = 'vacante-empresa'
          AND deleted_at IS NULL
        LIMIT 1
    `);
    if (res.rows.length === 0) return null;
    return {
        existe: true,
        sucursalId: (res.rows[0] as { sucursal_id: string | null }).sucursal_id,
    };
}

// =============================================================================
// 1) LISTAR VACANTES DEL NEGOCIO/SUCURSAL ACTIVA
// =============================================================================

/**
 * Lista paginada de vacantes filtradas por sucursal activa. Cada operador ve
 * solo las vacantes de SU sucursal (el middleware ya validó acceso).
 *
 * Para que la lista incluya el nombre de la sucursal en cada fila, hace JOIN
 * con `negocio_sucursales`. Para vacantes con `sucursal_id IS NULL` (legacy o
 * casos edge), el nombre queda null.
 */
export async function listarVacantes(
    usuarioId: string,
    sucursalId: string,
    opciones: ListarVacantesQueryInput
) {
    try {
        const { estado, busqueda, limit, offset } = opciones;

        const filtroEstado = estado
            ? sql`AND sp.estado = ${estado}`
            : sql`AND sp.estado IN ('activa', 'pausada', 'cerrada')`;

        const filtroBusqueda = busqueda && busqueda.length > 0
            ? sql`AND (
                LOWER(unaccent(sp.titulo)) LIKE LOWER(unaccent(${'%' + busqueda + '%'}))
                OR LOWER(unaccent(sp.descripcion)) LIKE LOWER(unaccent(${'%' + busqueda + '%'}))
              )`
            : sql``;

        const filasRes = await db.execute<{
            id: string;
            usuario_id: string;
            sucursal_id: string | null;
            sucursal_nombre: string | null;
            modo: string;
            tipo: string;
            subtipo: string | null;
            titulo: string;
            descripcion: string;
            fotos: string[];
            foto_portada_index: number;
            precio: unknown;
            modalidad: string;
            lat: number;
            lng: number;
            ciudad: string;
            zonas_aproximadas: string[];
            skills: string[];
            requisitos: string[];
            horario: string | null;
            dias_semana: string[];
            tipo_empleo: string | null;
            beneficios: string[];
            presupuesto: unknown;
            categoria: string | null;
            urgente: boolean;
            estado: string;
            total_vistas: number;
            total_mensajes: number;
            total_guardados: number;
            expira_at: string;
            created_at: string;
            updated_at: string;
        }>(sql`
            SELECT
                sp.id,
                sp.usuario_id,
                sp.sucursal_id,
                ns.nombre AS sucursal_nombre,
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
                sp.tipo_empleo,
                sp.beneficios,
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
            FROM servicios_publicaciones sp
            LEFT JOIN negocio_sucursales ns ON ns.id = sp.sucursal_id
            WHERE sp.usuario_id = ${usuarioId}
              AND sp.sucursal_id = ${sucursalId}
              AND sp.tipo = 'vacante-empresa'
              AND sp.deleted_at IS NULL
              ${filtroEstado}
              ${filtroBusqueda}
            ORDER BY
                CASE sp.estado
                    WHEN 'activa' THEN 1
                    WHEN 'pausada' THEN 2
                    WHEN 'cerrada' THEN 3
                    ELSE 4
                END,
                sp.created_at DESC
            LIMIT ${limit}
            OFFSET ${offset}
        `);

        const [{ total }] = (await db.execute<{ total: number }>(sql`
            SELECT COUNT(*)::int AS total
            FROM servicios_publicaciones sp
            WHERE sp.usuario_id = ${usuarioId}
              AND sp.sucursal_id = ${sucursalId}
              AND sp.tipo = 'vacante-empresa'
              AND sp.deleted_at IS NULL
              ${filtroEstado}
              ${filtroBusqueda}
        `)).rows as Array<{ total: number }>;

        const data: VacanteRow[] = filasRes.rows.map((row) => ({
            id: row.id,
            usuarioId: row.usuario_id,
            sucursalId: row.sucursal_id,
            sucursalNombre: row.sucursal_nombre,
            modo: row.modo as 'ofrezco' | 'solicito',
            tipo: row.tipo as 'servicio-persona' | 'vacante-empresa' | 'solicito',
            subtipo: row.subtipo,
            titulo: row.titulo,
            descripcion: row.descripcion,
            fotos: row.fotos ?? [],
            fotoPortadaIndex: row.foto_portada_index,
            precio: row.precio as PublicacionRow['precio'],
            modalidad: row.modalidad as PublicacionRow['modalidad'],
            ubicacionAproximada: { lat: row.lat, lng: row.lng },
            ciudad: row.ciudad,
            zonasAproximadas: row.zonas_aproximadas ?? [],
            skills: row.skills ?? [],
            requisitos: row.requisitos ?? [],
            horario: row.horario,
            diasSemana: row.dias_semana ?? [],
            tipoEmpleo: row.tipo_empleo as PublicacionRow['tipoEmpleo'],
            beneficios: row.beneficios ?? [],
            presupuesto: row.presupuesto as PublicacionRow['presupuesto'],
            categoria: row.categoria as PublicacionRow['categoria'],
            urgente: row.urgente ?? false,
            estado: row.estado as PublicacionRow['estado'],
            totalVistas: row.total_vistas,
            totalMensajes: row.total_mensajes,
            totalGuardados: row.total_guardados,
            expiraAt: row.expira_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        return {
            success: true as const,
            code: 200,
            data,
            paginacion: { limit, offset, total },
        };
    } catch (error) {
        console.error('Error en listarVacantes:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar tus vacantes.',
        };
    }
}

// =============================================================================
// 2) KPIs DEL DASHBOARD DE VACANTES
// =============================================================================

/**
 * Devuelve las 4 métricas que aparecen en las KPI cards arriba de la lista:
 *   - Total: todas las vacantes (no eliminadas) de la sucursal
 *   - Activas: estado='activa'
 *   - Por expirar: estado='activa' AND expira_at <= NOW() + 5 días
 *   - Conversaciones: suma de total_mensajes de no-eliminadas
 */
export async function obtenerKpisVacantes(
    usuarioId: string,
    sucursalId: string
) {
    try {
        const res = await db.execute<{
            total: number;
            activas: number;
            por_expirar: number;
            conversaciones: number;
        }>(sql`
            SELECT
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE estado = 'activa')::int AS activas,
                COUNT(*) FILTER (
                    WHERE estado = 'activa'
                      AND expira_at <= NOW() + INTERVAL '5 days'
                )::int AS por_expirar,
                COALESCE(SUM(total_mensajes), 0)::int AS conversaciones
            FROM servicios_publicaciones
            WHERE usuario_id = ${usuarioId}
              AND sucursal_id = ${sucursalId}
              AND tipo = 'vacante-empresa'
              AND deleted_at IS NULL
              AND estado != 'eliminada'
        `);

        const fila = res.rows[0] as {
            total: number;
            activas: number;
            por_expirar: number;
            conversaciones: number;
        };

        const data: KpisVacantes = {
            total: Number(fila.total),
            activas: Number(fila.activas),
            porExpirar: Number(fila.por_expirar),
            conversaciones: Number(fila.conversaciones),
        };

        return { success: true as const, code: 200, data };
    } catch (error) {
        console.error('Error en obtenerKpisVacantes:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cargar las métricas.',
        };
    }
}

// =============================================================================
// 3) CREAR VACANTE
// =============================================================================

/**
 * Crea una vacante. Reutiliza `crearPublicacion` del service de servicios pero
 * fuerza `modo='solicito'` + `tipo='vacante-empresa'` y mapea los campos
 * específicos de vacante (sucursalId, tipoEmpleo, beneficios).
 *
 * La sucursal se toma del payload (el dropdown del modal). El middleware ya
 * validó que el usuario tiene acceso a esa sucursal.
 */
export async function crearVacante(
    usuarioId: string,
    datos: CrearVacanteInput
) {
    return await crearPublicacion(usuarioId, {
        modo: 'solicito',
        tipo: 'vacante-empresa',
        subtipo: 'vacante-empresa',
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        fotos: [],
        fotoPortadaIndex: 0,
        precio: datos.precio,
        modalidad: datos.modalidad,
        latitud: datos.latitud,
        longitud: datos.longitud,
        ciudad: datos.ciudad,
        zonasAproximadas: datos.zonasAproximadas,
        skills: [],
        requisitos: datos.requisitos,
        horario: datos.horario,
        diasSemana: datos.diasSemana,
        sucursalId: datos.sucursalId,
        tipoEmpleo: datos.tipoEmpleo,
        beneficios: datos.beneficios,
        urgente: false,
        confirmaciones: datos.confirmaciones,
        confirmadoPorUsuario: true, // BS evita la moderación pasiva — el comercio sabe lo que publica
    });
}

// =============================================================================
// 4) ACTUALIZAR VACANTE
// =============================================================================

/**
 * Actualiza una vacante existente. Delega a `actualizarPublicacion` del service
 * de servicios después de verificar que la vacante existe y es del usuario.
 */
export async function actualizarVacante(
    usuarioId: string,
    publicacionId: string,
    datos: ActualizarVacanteInput
) {
    const vacante = await verificarVacanteDelUsuario(publicacionId, usuarioId);
    if (!vacante) {
        return {
            success: false as const,
            code: 404,
            message: 'No encontramos esta vacante o no es tuya.',
        };
    }
    return await actualizarPublicacion(usuarioId, publicacionId, datos);
}

// =============================================================================
// 5) CAMBIAR ESTADO (pausar/reactivar)
// =============================================================================

/**
 * Pausar o reactivar una vacante. Para "cerrar" (puesto cubierto), usa
 * `cerrarVacante` (estado='cerrada' es distinto de 'pausada').
 */
export async function cambiarEstadoVacante(
    usuarioId: string,
    publicacionId: string,
    nuevoEstado: 'activa' | 'pausada'
) {
    const vacante = await verificarVacanteDelUsuario(publicacionId, usuarioId);
    if (!vacante) {
        return {
            success: false as const,
            code: 404,
            message: 'No encontramos esta vacante o no es tuya.',
        };
    }

    try {
        // Si reactiva, también extiende expira_at +30d para evitar pausa
        // inmediata del cron (mismo patrón que reactivarPublicacion).
        if (nuevoEstado === 'activa') {
            const expiraAt = new Date();
            expiraAt.setUTCDate(expiraAt.getUTCDate() + 30);
            await db.execute(sql`
                UPDATE servicios_publicaciones
                SET estado = 'activa',
                    expira_at = ${expiraAt.toISOString()},
                    updated_at = NOW()
                WHERE id = ${publicacionId}
                  AND usuario_id = ${usuarioId}
                  AND tipo = 'vacante-empresa'
                  AND deleted_at IS NULL
            `);
        } else {
            await db.execute(sql`
                UPDATE servicios_publicaciones
                SET estado = 'pausada',
                    updated_at = NOW()
                WHERE id = ${publicacionId}
                  AND usuario_id = ${usuarioId}
                  AND tipo = 'vacante-empresa'
                  AND deleted_at IS NULL
            `);
        }
        return { success: true as const, code: 200, data: { estado: nuevoEstado } };
    } catch (error) {
        console.error('Error en cambiarEstadoVacante:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cambiar el estado de la vacante.',
        };
    }
}

// =============================================================================
// 6) CERRAR VACANTE (puesto cubierto)
// =============================================================================

/**
 * Marca la vacante como `cerrada` (puesto cubierto). Distinto de pausar:
 * pausada se puede reactivar; cerrada queda en historial sin posibilidad de
 * reactivación desde BS (si necesitan volver a abrir, deben crear una nueva).
 */
export async function cerrarVacante(usuarioId: string, publicacionId: string) {
    const vacante = await verificarVacanteDelUsuario(publicacionId, usuarioId);
    if (!vacante) {
        return {
            success: false as const,
            code: 404,
            message: 'No encontramos esta vacante o no es tuya.',
        };
    }

    try {
        await db.execute(sql`
            UPDATE servicios_publicaciones
            SET estado = 'cerrada',
                updated_at = NOW()
            WHERE id = ${publicacionId}
              AND usuario_id = ${usuarioId}
              AND tipo = 'vacante-empresa'
              AND deleted_at IS NULL
        `);
        return { success: true as const, code: 200, data: { estado: 'cerrada' as const } };
    } catch (error) {
        console.error('Error en cerrarVacante:', error);
        return {
            success: false as const,
            code: 500,
            message: 'No pudimos cerrar la vacante.',
        };
    }
}

// =============================================================================
// 7) ELIMINAR VACANTE (soft delete)
// =============================================================================

export async function eliminarVacante(
    usuarioId: string,
    publicacionId: string
) {
    const vacante = await verificarVacanteDelUsuario(publicacionId, usuarioId);
    if (!vacante) {
        return {
            success: false as const,
            code: 404,
            message: 'No encontramos esta vacante o no es tuya.',
        };
    }
    return await eliminarPublicacion(usuarioId, publicacionId);
}
