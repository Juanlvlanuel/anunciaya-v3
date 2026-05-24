/**
 * buscador.ts (Servicios)
 * ========================
 * Sugerencias en vivo del buscador de Servicios.
 *
 * Mismo patrón sobrio que `services/ofertas/buscador.ts`:
 *  - ILIKE simple sobre título + descripción + skills + requisitos.
 *  - Sin tabla de log, sin populares, sin Redis (dataset chico por ciudad).
 *  - Sin FTS — el volumen piloto en Peñasco es ~decenas, no miles.
 *
 * Visibilidad: replica los mismos filtros del feed (`obtenerFeed` /
 * `obtenerFeedInfinito`) para que las sugerencias NO incluyan publicaciones
 * pausadas, eliminadas, o de otras ciudades.
 *
 * Doc maestro: docs/estandares/PATRON_BUSCADOR_SECCION.md.
 *
 * Ubicación: apps/api/src/services/servicios/buscador.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import type { PrecioInput } from '../../validations/servicios.schema.js';
import { sanitizarTerminoParaLog } from '../marketplace/buscador.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface SugerenciaServicioRow {
    publicacionId: string;
    titulo: string;
    fotos: string[];
    fotoPortadaIndex: number;
    precio: PrecioInput;
    modalidad: string;
    modo: string;
    tipo: string;
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
    /** Total de sucursales activas del negocio (para decidir si mostrar el sufijo). */
    totalSucursales: number;
}

// =============================================================================
// SUGERENCIAS EN VIVO
// =============================================================================

/**
 * Devuelve top 5 publicaciones activas en la ciudad cuyo título, descripción,
 * skills o requisitos matchea el query del usuario (ILIKE substring,
 * accent-insensitive con `unaccent()`).
 *
 * El caller decide el debounce (300ms en el FE).
 *
 * Filtros heredados del feed:
 *  - estado='activa'
 *  - deleted_at IS NULL
 *  - dentro de la ciudad indicada
 */
export async function obtenerSugerenciasServicios(
    queryTexto: string,
    ciudad: string,
): Promise<{ success: true; data: SugerenciaServicioRow[] }> {
    const q = queryTexto.trim();
    if (q.length < 2) return { success: true, data: [] };
    if (!ciudad) return { success: true, data: [] };

    try {
        const patron = `%${q}%`;

        type Raw = {
            publicacion_id: string;
            titulo: string;
            fotos: string[] | null;
            foto_portada_index: number;
            precio: PrecioInput;
            modalidad: string;
            modo: string;
            tipo: string;
            ciudad: string;
            oferente_nombre: string;
            oferente_apellidos: string;
            oferente_avatar_url: string | null;
            negocio_nombre: string | null;
            sucursal_nombre: string | null;
            es_principal: boolean | null;
            total_sucursales: number | null;
        };

        const resultado = await db.execute(sql`
            SELECT
                sp.id                  AS publicacion_id,
                sp.titulo              AS titulo,
                sp.fotos               AS fotos,
                sp.foto_portada_index  AS foto_portada_index,
                sp.precio              AS precio,
                sp.modalidad           AS modalidad,
                sp.modo                AS modo,
                sp.tipo                AS tipo,
                sp.ciudad              AS ciudad,
                u.nombre               AS oferente_nombre,
                u.apellidos            AS oferente_apellidos,
                u.avatar_url           AS oferente_avatar_url,
                -- Negocio asociado (solo cuando la publicación tiene sucursalId,
                -- típicamente vacante-empresa). NULL para servicios personales.
                n.nombre               AS negocio_nombre,
                s.nombre               AS sucursal_nombre,
                s.es_principal         AS es_principal,
                -- Total de sucursales activas del negocio (para decidir si
                -- mostrar el sufijo de sucursal en el resultado del buscador).
                CASE WHEN n.id IS NULL THEN NULL ELSE (
                    SELECT COUNT(*)::integer
                    FROM negocio_sucursales ns
                    WHERE ns.negocio_id = n.id
                      AND ns.activa = true
                ) END                  AS total_sucursales
            FROM servicios_publicaciones sp
            INNER JOIN usuarios u ON u.id = sp.usuario_id
            LEFT JOIN negocio_sucursales s ON s.id = sp.sucursal_id
            LEFT JOIN negocios n ON n.id = s.negocio_id
            WHERE sp.estado = 'activa'
              AND sp.deleted_at IS NULL
              AND sp.ciudad = ${ciudad}
              AND (
                  unaccent(sp.titulo) ILIKE unaccent(${patron})
                  OR unaccent(sp.descripcion) ILIKE unaccent(${patron})
                  -- Skills y requisitos viven como arrays text[]; usamos
                  -- EXISTS + unnest para que un término matchee cualquier
                  -- entrada del array (ej. "plomería" en skills).
                  OR EXISTS (
                      SELECT 1 FROM unnest(sp.skills) skill
                      WHERE unaccent(skill) ILIKE unaccent(${patron})
                  )
                  OR EXISTS (
                      SELECT 1 FROM unnest(sp.requisitos) req
                      WHERE unaccent(req) ILIKE unaccent(${patron})
                  )
              )
            ORDER BY sp.updated_at DESC
            LIMIT 50
        `);

        const items = (resultado.rows as Raw[]).map((r) => ({
            publicacionId: r.publicacion_id,
            titulo: r.titulo,
            fotos: r.fotos ?? [],
            fotoPortadaIndex: r.foto_portada_index,
            precio: r.precio,
            modalidad: r.modalidad,
            modo: r.modo,
            tipo: r.tipo,
            ciudad: r.ciudad,
            oferenteNombre: r.oferente_nombre,
            oferenteApellidos: r.oferente_apellidos,
            oferenteAvatarUrl: r.oferente_avatar_url,
            negocioNombre: r.negocio_nombre,
            sucursalNombre: r.sucursal_nombre,
            esPrincipal: !!r.es_principal,
            totalSucursales: Number(r.total_sucursales) || 0,
        }));

        return { success: true, data: items };
    } catch (error) {
        console.error('Error en obtenerSugerenciasServicios:', error);
        return { success: true, data: [] };
    }
}

// =============================================================================
// BUSCAR SERVICIOS — Búsqueda completa con filtros + orden + paginado
// =============================================================================
//
// Calcado de `services/marketplace/buscador.ts::buscarArticulos` siguiendo
// la receta de `docs/estandares/PATRON_BUSCADOR_FTS.md`. Diferencias con MP:
//   - Filtros del dominio Servicios: modo, tipo, modalidad, tipoEmpleo,
//     categoria, soloUrgente.
//   - Búsqueda extendida a arrays `skills` y `requisitos` con `unnest()`
//     (calcada del `obtenerSugerenciasServicios` de arriba).
//   - Sin filtros de precio numérico ni ordenamiento por precio: el campo
//     `precio` es JSONB discriminated union (`fijo|hora|mensual|rango|
//     a-convenir`) y ordenarlo uniformemente no es trivial.
//
// Privacidad:
//   - `servicios_busquedas_log` se inserta con `usuario_id = NULL` aunque la
//     ruta sea autenticada (regla del proyecto). Solo persiste ciudad +
//     termino + timestamp para alimentar futuros "populares" o métricas.

export type OrdenarBusquedaServicios = 'recientes' | 'cercanos';

export interface FiltrosBusquedaServicios {
    /** Texto a buscar — opcional (se puede listar sin texto, solo con filtros). */
    q?: string;
    ciudad: string;
    /** Coordenadas del usuario para `cercanos` y filtro de distancia. */
    lat?: number;
    lng?: number;
    /** Filtro por modo: 'ofrezco' (servicios ofrecidos) o 'solicito' (clasificados). */
    modo?: 'ofrezco' | 'solicito';
    /** Filtro por tipo de publicación. */
    tipo?: 'servicio-persona' | 'vacante-empresa' | 'solicito';
    modalidad?: 'presencial' | 'remoto' | 'hibrido';
    /** Solo aplica cuando tipo='vacante-empresa'. */
    tipoEmpleo?: 'tiempo-completo' | 'medio-tiempo' | 'por-proyecto' | 'eventual';
    /** Solo aplica cuando modo='solicito' (Clasificados). */
    categoria?:
        | 'hogar'
        | 'cuidados'
        | 'eventos'
        | 'belleza-bienestar'
        | 'empleo'
        | 'otros';
    /** Si true, devuelve solo pedidos marcados como urgentes. */
    soloUrgente?: boolean;
    /** Distancia máxima en km (requiere lat+lng). */
    distanciaMaxKm?: number;
    /** Orden por defecto: 'recientes'. */
    ordenar?: OrdenarBusquedaServicios;
    limit?: number;
    offset?: number;
}

export interface ResultadoBusquedaServicios {
    success: true;
    data: unknown[];
    paginacion: { total: number; limit: number; offset: number };
    query: string;
}

/**
 * Búsqueda completa de Servicios. Si `q` está presente filtra por FTS+ILIKE
 * (acento-insensible) sobre titulo, descripcion, skills y requisitos. Si no,
 * devuelve todas las publicaciones activas de la ciudad ordenadas según
 * el criterio.
 *
 * Inserta una entrada en `servicios_busquedas_log` fire-and-forget
 * (`usuario_id = NULL` por privacidad).
 */
export async function buscarServicios(
    filtros: FiltrosBusquedaServicios,
): Promise<ResultadoBusquedaServicios> {
    const limit = Math.min(Math.max(filtros.limit ?? 20, 1), 100);
    const offset = Math.max(filtros.offset ?? 0, 0);
    const queryNorm = (filtros.q ?? '').trim();
    const ordenar: OrdenarBusquedaServicios = filtros.ordenar ?? 'recientes';

    // ─── WHERE dinámico ──────────────────────────────────────────────────
    const conds: ReturnType<typeof sql>[] = [
        sql`sp.estado = 'activa'`,
        sql`sp.deleted_at IS NULL`,
        sql`sp.ciudad = ${filtros.ciudad}`,
    ];

    if (queryNorm.length >= 2) {
        // Híbrido FTS + ILIKE + unaccent. Patrón de PATRON_BUSCADOR_FTS.md:
        //   - FTS español (con stemming) sobre titulo+descripcion.
        //   - ILIKE substring para prefix matching mientras teclea.
        //   - EXISTS + unnest para que el término matchee cualquier entrada
        //     de los arrays `skills` o `requisitos`.
        // `unaccent` aplicado a ambos lados.
        const patronLike = `%${queryNorm}%`;
        conds.push(sql`(
            to_tsvector('spanish', unaccent(sp.titulo || ' ' || sp.descripcion))
                @@ plainto_tsquery('spanish', unaccent(${queryNorm}))
            OR unaccent(sp.titulo) ILIKE unaccent(${patronLike})
            OR unaccent(sp.descripcion) ILIKE unaccent(${patronLike})
            OR EXISTS (
                SELECT 1 FROM unnest(sp.skills) skill
                WHERE unaccent(skill) ILIKE unaccent(${patronLike})
            )
            OR EXISTS (
                SELECT 1 FROM unnest(sp.requisitos) req
                WHERE unaccent(req) ILIKE unaccent(${patronLike})
            )
        )`);
    }

    if (filtros.modo !== undefined) {
        conds.push(sql`sp.modo = ${filtros.modo}`);
    }
    if (filtros.tipo !== undefined) {
        conds.push(sql`sp.tipo = ${filtros.tipo}`);
    }
    if (filtros.modalidad !== undefined) {
        conds.push(sql`sp.modalidad = ${filtros.modalidad}`);
    }
    if (filtros.tipoEmpleo !== undefined) {
        conds.push(sql`sp.tipo_empleo = ${filtros.tipoEmpleo}`);
    }
    if (filtros.categoria !== undefined) {
        conds.push(sql`sp.categoria = ${filtros.categoria}`);
    }
    if (filtros.soloUrgente === true) {
        conds.push(sql`sp.urgente = true`);
    }

    // Filtro de distancia: solo si hay GPS
    if (
        filtros.distanciaMaxKm !== undefined &&
        filtros.lat !== undefined &&
        filtros.lng !== undefined
    ) {
        const radioMetros = filtros.distanciaMaxKm * 1000;
        conds.push(sql`
            ST_DWithin(
                sp.ubicacion_aproximada,
                ST_SetSRID(ST_MakePoint(${filtros.lng}, ${filtros.lat}), 4326)::geography,
                ${radioMetros}
            )
        `);
    }

    const where = sql.join(conds, sql` AND `);

    // ─── ORDER BY ────────────────────────────────────────────────────────
    let orderBy: ReturnType<typeof sql>;
    if (
        ordenar === 'cercanos' &&
        filtros.lat !== undefined &&
        filtros.lng !== undefined
    ) {
        orderBy = sql`ORDER BY sp.ubicacion_aproximada <-> ST_SetSRID(ST_MakePoint(${filtros.lng}, ${filtros.lat}), 4326)::geography`;
    } else {
        // recientes (default) o cercanos sin GPS → fallback a recientes
        orderBy = sql`ORDER BY sp.created_at DESC`;
    }

    // ─── Distancia precalculada (NULL si no hay GPS) ─────────────────────
    const distanciaSelect =
        filtros.lat !== undefined && filtros.lng !== undefined
            ? sql`ST_Distance(sp.ubicacion_aproximada, ST_SetSRID(ST_MakePoint(${filtros.lng}, ${filtros.lat}), 4326)::geography) AS distancia_metros`
            : sql`NULL::float AS distancia_metros`;

    // ─── Query de datos ──────────────────────────────────────────────────
    const datosResultado = await db.execute(sql`
        SELECT
            sp.id, sp.usuario_id, sp.modo, sp.tipo, sp.subtipo,
            sp.titulo, sp.descripcion,
            sp.fotos, sp.foto_portada_index,
            sp.precio, sp.modalidad,
            ST_Y(sp.ubicacion_aproximada::geometry) AS lat,
            ST_X(sp.ubicacion_aproximada::geometry) AS lng,
            sp.ciudad, sp.zonas_aproximadas,
            sp.skills, sp.requisitos, sp.horario, sp.dias_semana,
            sp.tipo_empleo, sp.beneficios,
            sp.presupuesto, sp.categoria, sp.urgente,
            sp.estado,
            sp.total_vistas, sp.total_mensajes, sp.total_guardados,
            sp.expira_at, sp.created_at, sp.updated_at,
            ${distanciaSelect}
        FROM servicios_publicaciones sp
        WHERE ${where}
        ${orderBy}
        LIMIT ${limit}
        OFFSET ${offset}
    `);

    // ─── Total para paginación ────────────────────────────────────────────
    const totalResultado = await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM servicios_publicaciones sp
        WHERE ${where}
    `);
    const total = (totalResultado.rows[0] as { total: number }).total;

    // ─── Mapear filas snake_case → camelCase ─────────────────────────────
    interface RawFila {
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
        tipo_empleo: string | null;
        beneficios: string[];
        presupuesto: { min: number; max: number } | null;
        categoria: string | null;
        urgente: boolean;
        estado: string;
        total_vistas: number;
        total_mensajes: number;
        total_guardados: number;
        expira_at: string;
        created_at: string;
        updated_at: string;
        distancia_metros: number | null;
    }
    const data = (datosResultado.rows as unknown as RawFila[]).map((row) => ({
        id: row.id,
        usuarioId: row.usuario_id,
        modo: row.modo,
        tipo: row.tipo,
        subtipo: row.subtipo,
        titulo: row.titulo,
        descripcion: row.descripcion,
        fotos: row.fotos,
        fotoPortadaIndex: row.foto_portada_index,
        precio: row.precio,
        modalidad: row.modalidad,
        ubicacionAproximada: { lat: row.lat, lng: row.lng },
        ciudad: row.ciudad,
        zonasAproximadas: row.zonas_aproximadas,
        skills: row.skills,
        requisitos: row.requisitos,
        horario: row.horario,
        diasSemana: row.dias_semana,
        tipoEmpleo: row.tipo_empleo,
        beneficios: row.beneficios,
        presupuesto: row.presupuesto,
        categoria: row.categoria,
        urgente: row.urgente,
        estado: row.estado,
        totalVistas: row.total_vistas,
        totalMensajes: row.total_mensajes,
        totalGuardados: row.total_guardados,
        expiraAt: row.expira_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        distanciaMetros:
            row.distancia_metros !== null ? Math.round(row.distancia_metros) : null,
    }));

    // ─── Loguear término en BD (fire-and-forget, usuario_id = NULL) ─────
    if (queryNorm.length >= 2) {
        const sanitizado = sanitizarTerminoParaLog(queryNorm);
        if (sanitizado) {
            db.execute(sql`
                INSERT INTO servicios_busquedas_log (ciudad, termino, usuario_id)
                VALUES (${filtros.ciudad}, ${sanitizado}, NULL)
            `).catch((err) => {
                console.warn('No se pudo loguear búsqueda de servicios:', err);
            });
        }
    }

    return {
        success: true,
        data,
        paginacion: { total, limit, offset },
        query: queryNorm,
    };
}
