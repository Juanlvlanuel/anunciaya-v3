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
import { sqlExpiracionFinDeDia, TTL_DIAS_DEFAULT } from '../utils/expiracion.js';
import type { ZonaHorariaMx } from '../utils/zonaHoraria.js';
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
 * Verifica que la vacante existe Y pertenece a la sucursal indicada.
 * Devuelve sus datos básicos o null.
 *
 * Sprint 9.3 (fix): antes filtraba por `usuario_id` (creador), lo que hacía
 * que SOLO quien creó la vacante la pudiera ver/gestionar — la gerente NUNCA
 * veía vacantes del dueño y viceversa. Ahora filtra por `sucursal_id` —
 * cualquier empleado con acceso a esa sucursal (validado por el middleware
 * `validarAccesoSucursal`) puede gestionar todas las vacantes de la sucursal.
 *
 * Las vacantes son del NEGOCIO/SUCURSAL, no del usuario individual — mismo
 * modelo que Catálogo, Promociones y otros módulos BS.
 */
async function verificarVacanteEnSucursal(
    publicacionId: string,
    sucursalId: string
): Promise<{ existe: boolean; sucursalId: string | null } | null> {
    const res = await db.execute<{ sucursal_id: string | null }>(sql`
        SELECT sucursal_id
        FROM servicios_publicaciones
        WHERE id = ${publicacionId}
          AND sucursal_id = ${sucursalId}
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
 * TODAS las vacantes de su sucursal — dueño, gerentes y empleados con acceso
 * (validado por el middleware `validarAccesoSucursal`).
 *
 * Sprint 9.3 (fix): antes filtraba también por `usuario_id = creador`, lo
 * que ocultaba las vacantes del dueño a la gerente y viceversa. Ahora el
 * único filtro de acceso es `sucursal_id` (las vacantes pertenecen al
 * negocio, no al empleado individual). El `usuarioId` se mantiene en la
 * firma para logs/auditoría pero NO se usa en el WHERE.
 *
 * Para que la lista incluya el nombre de la sucursal en cada fila, hace JOIN
 * con `negocio_sucursales`. Para vacantes con `sucursal_id IS NULL` (legacy o
 * casos edge), el nombre queda null.
 */
export async function listarVacantes(
    usuarioId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
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
                c.nombre AS ciudad,
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
            LEFT JOIN ciudades c ON c.id = ns.ciudad_id
            WHERE sp.sucursal_id = ${sucursalId}
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
            WHERE sp.sucursal_id = ${sucursalId}
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
            // Campos del negocio (Sprint 9.3) — esta query interna de BS
            // Vacantes solo consume `servicios_publicaciones`, no hace JOIN
            // a `negocios`/`negocio_sucursales`. Por eso van NULL aquí. Si
            // BS necesita esos datos en el futuro, agregar el LEFT JOIN.
            negocioId: null,
            negocioNombre: null,
            negocioLogo: null,
            sucursalPortada: null,
            sucursalFotoPerfil: null,
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
 *
 * Sprint 9.3 (fix): mismo cambio que `listarVacantes` — KPIs cuentan TODAS
 * las vacantes de la sucursal, no solo las que creó el usuario actual.
 */
export async function obtenerKpisVacantes(
    usuarioId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
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
            WHERE sucursal_id = ${sucursalId}
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
 * Ubicación REAL de una sucursal para estampar en sus vacantes: ciudad (del catálogo
 * `ciudades` vía `ciudad_id`) + coordenadas (de `ubicacion` PostGIS). Devuelve nulls si
 * la sucursal aún no las tiene; el caller cae al payload del front como respaldo. Así la
 * vacante hereda la ubicación de su sucursal y no depende de un valor hardcodeado en el front.
 */
async function obtenerUbicacionSucursal(sucursalId: string): Promise<{ ciudad: string | null; lat: number | null; lng: number | null }> {
    try {
        const filas = (await db.execute(sql`
            SELECT c.nombre                         AS ciudad,
                   ST_Y(s.ubicacion::geometry)      AS lat,
                   ST_X(s.ubicacion::geometry)      AS lng
            FROM negocio_sucursales s
            LEFT JOIN ciudades c ON c.id = s.ciudad_id
            WHERE s.id = ${sucursalId}
            LIMIT 1
        `)).rows as Array<{ ciudad: string | null; lat: number | string | null; lng: number | string | null }>;
        const f = filas[0];
        if (!f) return { ciudad: null, lat: null, lng: null };
        return {
            ciudad: f.ciudad ?? null,
            lat: f.lat != null ? Number(f.lat) : null,
            lng: f.lng != null ? Number(f.lng) : null,
        };
    } catch {
        return { ciudad: null, lat: null, lng: null };
    }
}

/**
 * Crea una vacante. Reutiliza `crearPublicacion` del service de servicios pero
 * fuerza `modo='solicito'` + `tipo='vacante-empresa'` y mapea los campos
 * específicos de vacante (sucursalId, tipoEmpleo, beneficios).
 *
 * La sucursal se toma del payload (el dropdown del modal). El middleware ya
 * validó que el usuario tiene acceso a esa sucursal. La ciudad y las coordenadas
 * se DERIVAN de esa sucursal (no del front).
 */
export async function crearVacante(
    usuarioId: string,
    datos: CrearVacanteInput
) {
    const ubic = await obtenerUbicacionSucursal(datos.sucursalId);
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
        latitud: ubic.lat ?? datos.latitud,
        longitud: ubic.lng ?? datos.longitud,
        ciudad: ubic.ciudad ?? datos.ciudad,
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
 * de servicios pasando `{ sucursalId }` como filtro de acceso — cualquier
 * empleado con acceso a la sucursal puede editar la vacante.
 */
export async function actualizarVacante(
    usuarioId: string,
    sucursalId: string,
    publicacionId: string,
    datos: ActualizarVacanteInput
) {
    const vacante = await verificarVacanteEnSucursal(publicacionId, sucursalId);
    if (!vacante) {
        return {
            success: false as const,
            code: 404,
            message: 'No encontramos esta vacante en tu sucursal.',
        };
    }
    // Mantener la ubicación de la vacante alineada a su sucursal (ciudad + coords reales).
    const ubic = await obtenerUbicacionSucursal(sucursalId);
    const datosConUbic: ActualizarVacanteInput = {
        ...datos,
        ...(ubic.ciudad ? { ciudad: ubic.ciudad } : {}),
        ...(ubic.lat != null ? { latitud: ubic.lat } : {}),
        ...(ubic.lng != null ? { longitud: ubic.lng } : {}),
    };
    return await actualizarPublicacion(usuarioId, publicacionId, datosConUbic, { sucursalId });
}

// =============================================================================
// 5) CAMBIAR ESTADO (pausar/reactivar)
// =============================================================================

/**
 * Pausar o reactivar una vacante. Para "cerrar" (puesto cubierto), usa
 * `cerrarVacante` (estado='cerrada' es distinto de 'pausada').
 *
 * Sprint 9.3 (fix): el WHERE de los UPDATE ahora filtra por `sucursal_id`
 * en vez de `usuario_id`, para que cualquier empleado con acceso a la
 * sucursal pueda pausar/reactivar (no solo el creador).
 */
export async function cambiarEstadoVacante(
    usuarioId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    sucursalId: string,
    publicacionId: string,
    nuevoEstado: 'activa' | 'pausada'
) {
    const vacante = await verificarVacanteEnSucursal(publicacionId, sucursalId);
    if (!vacante) {
        return {
            success: false as const,
            code: 404,
            message: 'No encontramos esta vacante en tu sucursal.',
        };
    }

    try {
        // Si reactiva, también extiende expira_at para evitar pausa
        // inmediata del cron. La zona horaria viene de la SUCURSAL
        // (es vacante-empresa) — leemos `zona_horaria` configurada en
        // onboarding del negocio. Fallback a Mexico_City si la sucursal
        // no la tiene seteada o la zona en BD no está en el whitelist.
        if (nuevoEstado === 'activa') {
            const ZONAS_VALIDAS: ReadonlySet<ZonaHorariaMx> = new Set<ZonaHorariaMx>([
                'America/Mexico_City',
                'America/Hermosillo',
                'America/Tijuana',
                'America/Cancun',
                'America/Mazatlan',
            ]);
            let zonaSucursal: ZonaHorariaMx = 'America/Mexico_City';
            if (vacante.sucursalId) {
                const zonaRow = await db.execute<{ zona_horaria: string | null }>(sql`
                    SELECT zona_horaria FROM negocio_sucursales
                    WHERE id = ${vacante.sucursalId}
                    LIMIT 1
                `);
                const z = zonaRow.rows[0]?.zona_horaria;
                if (z && ZONAS_VALIDAS.has(z as ZonaHorariaMx)) {
                    zonaSucursal = z as ZonaHorariaMx;
                }
            }
            const expiraAtSql = sqlExpiracionFinDeDia(TTL_DIAS_DEFAULT, zonaSucursal);
            await db.execute(sql`
                UPDATE servicios_publicaciones
                SET estado = 'activa',
                    expira_at = ${expiraAtSql},
                    updated_at = NOW()
                WHERE id = ${publicacionId}
                  AND sucursal_id = ${sucursalId}
                  AND tipo = 'vacante-empresa'
                  AND deleted_at IS NULL
            `);
        } else {
            await db.execute(sql`
                UPDATE servicios_publicaciones
                SET estado = 'pausada',
                    updated_at = NOW()
                WHERE id = ${publicacionId}
                  AND sucursal_id = ${sucursalId}
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
export async function cerrarVacante(
    usuarioId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    sucursalId: string,
    publicacionId: string,
) {
    const vacante = await verificarVacanteEnSucursal(publicacionId, sucursalId);
    if (!vacante) {
        return {
            success: false as const,
            code: 404,
            message: 'No encontramos esta vacante en tu sucursal.',
        };
    }

    try {
        await db.execute(sql`
            UPDATE servicios_publicaciones
            SET estado = 'cerrada',
                updated_at = NOW()
            WHERE id = ${publicacionId}
              AND sucursal_id = ${sucursalId}
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
    sucursalId: string,
    publicacionId: string,
) {
    const vacante = await verificarVacanteEnSucursal(publicacionId, sucursalId);
    if (!vacante) {
        return {
            success: false as const,
            code: 404,
            message: 'No encontramos esta vacante en tu sucursal.',
        };
    }
    return await eliminarPublicacion(usuarioId, publicacionId, { sucursalId });
}
