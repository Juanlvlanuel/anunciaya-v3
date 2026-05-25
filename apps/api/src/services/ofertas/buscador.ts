/**
 * buscador.ts (Ofertas)
 * ======================
 * Sugerencias en vivo del buscador de Ofertas.
 *
 * A diferencia del MarketPlace (que tiene FTS español + tabla de log +
 * populares + cache Redis), Ofertas usa una versión deliberadamente sobria:
 *  - LIKE/ILIKE simple sobre título + descripción + nombre del negocio.
 *  - Sin tabla de log, sin populares, sin Redis.
 *  - Sin FTS porque el dataset por ciudad es chico (decenas, no miles).
 *
 * Razón: el volumen esperado de ofertas en una ciudad piloto (Peñasco) es
 * de ~50-150 ofertas activas. ILIKE con índice trigram (o secuencial) basta
 * y deja la implementación mantenible. Cuando el volumen crezca y empiece a
 * dolerle al usuario, se reevalúa subir a FTS.
 *
 * Visibilidad: replica los mismos filtros del feed (`obtenerFeedOfertas`)
 * para que las sugerencias NO incluyan ofertas vencidas, pausadas, o de
 * negocios borrador.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§P5 — patrón a replicar)
 *
 * Ubicación: apps/api/src/services/ofertas/buscador.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { sanitizarTerminoParaLog } from '../marketplace/buscador.js';
import { tokenizarQuery, unirOr } from '../_helpers/busquedaFlexible.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface SugerenciaOfertaRow {
    ofertaId: string;
    titulo: string;
    imagen: string | null;
    tipo: string;
    valor: number;
    negocioNombre: string;
    sucursalNombre: string | null;
    /** Si la sucursal de esta oferta es la principal del negocio (Matriz). */
    esPrincipal: boolean;
    /** Total de sucursales activas del negocio (para decidir si mostrar el sufijo). */
    totalSucursales: number;
    ciudad: string;
}

// =============================================================================
// SUGERENCIAS EN VIVO
// =============================================================================

/**
 * Devuelve top 5 ofertas activas en la ciudad cuyo título, descripción o
 * nombre del negocio matchea el query del usuario (ILIKE substring).
 *
 * El caller decide el debounce (300ms en el FE).
 *
 * Filtros heredados del feed:
 *  - oferta activa + visible públicamente
 *  - dentro del rango de fechas (NOW() entre fecha_inicio y fecha_fin)
 *  - negocio activo + onboarding completado + no borrador
 *  - sucursal activa
 *  - dentro de la ciudad indicada
 *
 * Deduplicación: la misma oferta puede vivir en varias sucursales del mismo
 * negocio (ver §dedup en `obtenerFeedOfertas`). Aquí elegimos una fila por
 * grupo `(negocio_id, titulo, descripcion, tipo, valor, fecha_fin)` para no
 * mostrar duplicados en el overlay.
 */
export async function obtenerSugerenciasOfertas(
    queryTexto: string,
    ciudad: string,
): Promise<{ success: true; data: SugerenciaOfertaRow[] }> {
    const q = queryTexto.trim();
    if (q.length < 2) return { success: true, data: [] };
    if (!ciudad) return { success: true, data: [] };

    try {
        const patron = `%${q}%`;

        // Match accent-insensitive: `immutable_unaccent()` se aplica a ambos lados
        // (columna y patrón) para que "panaderia" matchee "Panadería" y
        // viceversa. Requiere `CREATE EXTENSION unaccent` aplicado vía
        // `docs/migraciones/2026-05-14-extension-unaccent.sql`.
        const resultado = await db.execute(sql`
            WITH base AS (
                SELECT
                    o.id              AS oferta_id,
                    o.titulo          AS titulo,
                    o.imagen          AS imagen,
                    o.tipo            AS tipo,
                    o.valor           AS valor,
                    o.updated_at      AS updated_at,
                    n.nombre          AS negocio_nombre,
                    s.nombre          AS sucursal_nombre,
                    s.es_principal    AS es_principal,
                    -- Total de sucursales activas del negocio (para decidir
                    -- si mostrar el sufijo de sucursal en el header del chat).
                    (
                        SELECT COUNT(*)::integer
                        FROM negocio_sucursales ns
                        WHERE ns.negocio_id = n.id
                        AND ns.activa = true
                    )                 AS total_sucursales,
                    s.ciudad          AS ciudad,
                    ROW_NUMBER() OVER (
                        PARTITION BY
                            o.negocio_id, o.titulo, o.descripcion,
                            o.tipo, o.valor, o.fecha_fin
                        ORDER BY s.es_principal DESC, o.updated_at DESC
                    ) AS rn
                FROM ofertas o
                INNER JOIN negocios n ON n.id = o.negocio_id
                INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
                WHERE o.activo = true
                  AND o.visibilidad = 'publico'
                  AND n.activo = true
                  AND s.activa = true
                  AND n.es_borrador = false
                  AND n.onboarding_completado = true
                  AND CURRENT_DATE >= DATE(o.fecha_inicio)
                  AND CURRENT_DATE <= DATE(o.fecha_fin)
                  AND (o.limite_usos IS NULL OR o.usos_actuales < o.limite_usos)
                  AND s.ciudad = ${ciudad}
                  AND (
                      immutable_unaccent(o.titulo) ILIKE immutable_unaccent(${patron})
                      OR immutable_unaccent(o.descripcion) ILIKE immutable_unaccent(${patron})
                      OR immutable_unaccent(n.nombre) ILIKE immutable_unaccent(${patron})
                      -- Categoría/subcategoría del negocio: "tacos" encuentra
                      -- ofertas de negocios categorizados como Tacos aunque
                      -- la palabra no esté en el título de la oferta.
                      OR EXISTS(
                          SELECT 1
                          FROM asignacion_subcategorias asig
                          JOIN subcategorias_negocio sc ON sc.id = asig.subcategoria_id
                          JOIN categorias_negocio c ON c.id = sc.categoria_id
                          WHERE asig.negocio_id = n.id
                            AND (
                                immutable_unaccent(sc.nombre) ILIKE immutable_unaccent(${patron})
                                OR immutable_unaccent(c.nombre) ILIKE immutable_unaccent(${patron})
                            )
                      )
                  )
            )
            SELECT
                oferta_id,
                titulo,
                imagen,
                tipo,
                valor,
                negocio_nombre,
                sucursal_nombre,
                es_principal,
                total_sucursales,
                ciudad
            FROM base
            WHERE rn = 1
            ORDER BY updated_at DESC
            LIMIT 50
        `);

        type Raw = {
            oferta_id: string;
            titulo: string;
            imagen: string | null;
            tipo: string;
            valor: string | number;
            negocio_nombre: string;
            sucursal_nombre: string | null;
            es_principal: boolean;
            total_sucursales: number;
            ciudad: string;
        };

        const items = (resultado.rows as Raw[]).map((r) => ({
            ofertaId: r.oferta_id,
            titulo: r.titulo,
            imagen: r.imagen,
            tipo: r.tipo,
            valor: typeof r.valor === 'string' ? Number(r.valor) : r.valor,
            negocioNombre: r.negocio_nombre,
            sucursalNombre: r.sucursal_nombre,
            esPrincipal: !!r.es_principal,
            totalSucursales: Number(r.total_sucursales) || 1,
            ciudad: r.ciudad,
        }));

        return { success: true, data: items };
    } catch (error) {
        console.error('Error en obtenerSugerenciasOfertas:', error);
        return { success: true, data: [] };
    }
}

// =============================================================================
// BUSCAR OFERTAS — Búsqueda completa con filtros + orden + paginado
// =============================================================================
//
// Calcado de `services/servicios/buscador.ts::buscarServicios` siguiendo la
// receta de `docs/estandares/PATRON_BUSCADOR_FTS.md`. Diferencias con Servicios:
//   - `descripcion` es NULLABLE → uso `coalesce(descripcion, '')` en el FTS
//     y en los ILIKE para evitar la trampa #6. El índice GIN también lo lleva
//     en su expresión.
//   - Sin `deleted_at`: las ofertas se desactivan con `activo=false` o expiran
//     con `fecha_fin`. Mismos filtros base que el sugerencias actual.
//   - Sin ubicación propia (la oferta no tiene lat/lng — la sucursal sí). Por
//     eso no hay `ordenar=cercanos` ni `distanciaMaxKm`. Solo `recientes`.
//   - JOIN a `negocios` + `negocio_sucursales` para filtrar por ciudad y por
//     estado del negocio/sucursal. La búsqueda incluye nombre del negocio y
//     categorías/subcategorías (mismo bonus que el sugerencias).
//   - Deduplicación: la misma oferta puede vivir en N sucursales del mismo
//     negocio. Uso ROW_NUMBER() para mostrar una sola fila por grupo
//     `(negocio_id, titulo, descripcion, tipo, valor, fecha_fin)`,
//     prefiriendo la Matriz.

export type OrdenarBusquedaOfertas = 'recientes';

export type TipoOferta =
    | 'porcentaje'
    | 'monto_fijo'
    | '2x1'
    | '3x2'
    | 'envio_gratis'
    | 'otro';

export interface FiltrosBusquedaOfertas {
    /** Texto a buscar — opcional (se puede listar sin texto, solo con filtros). */
    q?: string;
    ciudad: string;
    /** Filtro por tipo de oferta (CHECK en BD). */
    tipo?: TipoOferta;
    /** Orden por defecto: 'recientes' (updated_at DESC). */
    ordenar?: OrdenarBusquedaOfertas;
    limit?: number;
    offset?: number;
    /**
     * Modo flexible para Coyo. Cuando `true`, las palabras se tratan como
     * OR (cualquiera matchea) en vez del AND implícito por defecto. Solo
     * lo activa `services/coyo/buscadorUnificado.ts`. Ver
     * `services/_helpers/busquedaFlexible.ts`.
     */
    modoFlexible?: boolean;
}

export interface ResultadoBusquedaOfertas {
    success: true;
    data: unknown[];
    paginacion: { total: number; limit: number; offset: number };
    query: string;
}

/**
 * Búsqueda completa de Ofertas. Si `q` está presente filtra por FTS+ILIKE
 * (acento-insensible) sobre titulo, descripcion, nombre del negocio y
 * categorías/subcategorías. Si no, devuelve todas las ofertas vigentes de
 * la ciudad ordenadas por `updated_at DESC`.
 *
 * Aplica los mismos filtros base que `obtenerSugerenciasOfertas` y la misma
 * deduplicación por `(negocio_id, titulo, descripcion, tipo, valor,
 * fecha_fin)` para no mostrar la misma oferta varias veces si vive en
 * distintas sucursales del mismo negocio.
 *
 * Inserta una entrada en `ofertas_busquedas_log` fire-and-forget
 * (`usuario_id = NULL` por privacidad).
 */
export async function buscarOfertas(
    filtros: FiltrosBusquedaOfertas,
): Promise<ResultadoBusquedaOfertas> {
    const limit = Math.min(Math.max(filtros.limit ?? 20, 1), 100);
    const offset = Math.max(filtros.offset ?? 0, 0);
    const queryNorm = (filtros.q ?? '').trim();

    // ─── WHERE dinámico (filtros base + ciudad + búsqueda + tipo) ────────
    // Calcados al pie del sugerencias actual para que la búsqueda completa
    // y las sugerencias devuelvan exactamente el mismo subconjunto al usuario.
    const conds: ReturnType<typeof sql>[] = [
        sql`o.activo = true`,
        sql`o.visibilidad = 'publico'`,
        sql`n.activo = true`,
        sql`s.activa = true`,
        sql`n.es_borrador = false`,
        sql`n.onboarding_completado = true`,
        sql`CURRENT_DATE >= DATE(o.fecha_inicio)`,
        sql`CURRENT_DATE <= DATE(o.fecha_fin)`,
        sql`(o.limite_usos IS NULL OR o.usos_actuales < o.limite_usos)`,
        sql`s.ciudad = ${filtros.ciudad}`,
    ];

    if (queryNorm.length >= 2) {
        // Híbrido FTS + ILIKE + unaccent (con coalesce porque descripcion es
        // NULLABLE — trampa #6 del patrón). Dos variantes:
        //   - Normal (usuarios): plainto_tsquery (AND) + frase entera.
        //   - Flexible (Coyo): websearch_to_tsquery + OR por palabra.
        // Ver `services/_helpers/busquedaFlexible.ts`.
        const tokens = filtros.modoFlexible ? tokenizarQuery(queryNorm) : [];
        const usarFlexible = filtros.modoFlexible && tokens.length > 0;

        const ftsExpr = usarFlexible
            ? sql`websearch_to_tsquery('spanish', immutable_unaccent(${unirOr(tokens)}))`
            : sql`plainto_tsquery('spanish', immutable_unaccent(${queryNorm}))`;

        const ilikeOr = (expresion: ReturnType<typeof sql>) => {
            if (usarFlexible) {
                return sql.join(
                    tokens.map(
                        (t) =>
                            sql`${expresion} ILIKE immutable_unaccent(${`%${t}%`})`,
                    ),
                    sql` OR `,
                );
            }
            return sql`${expresion} ILIKE immutable_unaccent(${`%${queryNorm}%`})`;
        };

        conds.push(sql`(
            to_tsvector('spanish', immutable_unaccent(o.titulo || ' ' || coalesce(o.descripcion, ''))) @@ ${ftsExpr}
            OR ${ilikeOr(sql`immutable_unaccent(o.titulo)`)}
            OR ${ilikeOr(sql`immutable_unaccent(coalesce(o.descripcion, ''))`)}
            OR ${ilikeOr(sql`immutable_unaccent(n.nombre)`)}
            OR EXISTS (
                SELECT 1
                FROM asignacion_subcategorias asig
                JOIN subcategorias_negocio sc ON sc.id = asig.subcategoria_id
                JOIN categorias_negocio c ON c.id = sc.categoria_id
                WHERE asig.negocio_id = n.id
                  AND (
                      ${ilikeOr(sql`immutable_unaccent(sc.nombre)`)}
                      OR ${ilikeOr(sql`immutable_unaccent(c.nombre)`)}
                  )
            )
        )`);
    }

    if (filtros.tipo !== undefined) {
        conds.push(sql`o.tipo = ${filtros.tipo}`);
    }

    const where = sql.join(conds, sql` AND `);

    // ─── Query de datos con dedup (ROW_NUMBER por grupo de oferta) ───────
    const datosResultado = await db.execute(sql`
        WITH base AS (
            SELECT
                o.id              AS id,
                o.titulo          AS titulo,
                o.descripcion     AS descripcion,
                o.imagen          AS imagen,
                o.tipo            AS tipo,
                o.valor           AS valor,
                o.compra_minima   AS compra_minima,
                o.fecha_inicio    AS fecha_inicio,
                o.fecha_fin       AS fecha_fin,
                o.created_at      AS created_at,
                o.updated_at      AS updated_at,
                n.id              AS negocio_id,
                n.nombre          AS negocio_nombre,
                s.id              AS sucursal_id,
                s.nombre          AS sucursal_nombre,
                s.es_principal    AS es_principal,
                s.calificacion_promedio AS calificacion_promedio,
                (
                    SELECT COUNT(*)::integer
                    FROM negocio_sucursales ns
                    WHERE ns.negocio_id = n.id
                      AND ns.activa = true
                )                 AS total_sucursales,
                s.ciudad          AS ciudad,
                ROW_NUMBER() OVER (
                    PARTITION BY
                        o.negocio_id, o.titulo, o.descripcion,
                        o.tipo, o.valor, o.fecha_fin
                    ORDER BY s.es_principal DESC, o.updated_at DESC
                ) AS rn
            FROM ofertas o
            INNER JOIN negocios n ON n.id = o.negocio_id
            INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
            WHERE ${where}
        )
        SELECT
            id, titulo, descripcion, imagen, tipo, valor,
            compra_minima, fecha_inicio, fecha_fin,
            created_at, updated_at,
            negocio_id, negocio_nombre,
            sucursal_id, sucursal_nombre, es_principal, calificacion_promedio,
            total_sucursales, ciudad
        FROM base
        WHERE rn = 1
        ORDER BY updated_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
    `);

    // ─── Total para paginación (también con dedup) ───────────────────────
    // COUNT(DISTINCT ...) sobre la combinación de columnas que define una
    // oferta lógica, replicando el GROUP BY del PARTITION del CTE.
    const totalResultado = await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM (
            SELECT 1
            FROM ofertas o
            INNER JOIN negocios n ON n.id = o.negocio_id
            INNER JOIN negocio_sucursales s ON s.id = o.sucursal_id
            WHERE ${where}
            GROUP BY o.negocio_id, o.titulo, o.descripcion, o.tipo, o.valor, o.fecha_fin
        ) AS deduplicado
    `);
    const total = (totalResultado.rows[0] as { total: number }).total;

    // ─── Mapear filas snake_case → camelCase ─────────────────────────────
    interface RawFila {
        id: string;
        titulo: string;
        descripcion: string | null;
        imagen: string | null;
        tipo: string;
        valor: string | null;
        compra_minima: string;
        fecha_inicio: string;
        fecha_fin: string;
        created_at: string;
        updated_at: string;
        negocio_id: string;
        negocio_nombre: string;
        sucursal_id: string;
        sucursal_nombre: string | null;
        es_principal: boolean;
        calificacion_promedio: string | null;
        total_sucursales: number;
        ciudad: string;
    }
    const data = (datosResultado.rows as unknown as RawFila[]).map((row) => ({
        id: row.id,
        titulo: row.titulo,
        descripcion: row.descripcion,
        imagen: row.imagen,
        tipo: row.tipo,
        // `valor` está como varchar en BD (acepta string para tipo='otro'
        // y numérico para porcentaje/monto_fijo). Lo devolvemos tal cual y
        // el frontend decide formatear según `tipo`.
        valor: row.valor,
        compraMinima: row.compra_minima,
        fechaInicio: row.fecha_inicio,
        fechaFin: row.fecha_fin,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        negocioId: row.negocio_id,
        negocioNombre: row.negocio_nombre,
        sucursalId: row.sucursal_id,
        sucursalNombre: row.sucursal_nombre,
        esPrincipal: !!row.es_principal,
        // Rating del negocio (heredado de la sucursal). `numeric(2,1)` viene
        // como string; el caller decide si convertirlo a número.
        calificacionPromedio: row.calificacion_promedio,
        totalSucursales: Number(row.total_sucursales) || 1,
        ciudad: row.ciudad,
    }));

    // ─── Loguear término en BD (fire-and-forget, usuario_id = NULL) ─────
    if (queryNorm.length >= 2) {
        const sanitizado = sanitizarTerminoParaLog(queryNorm);
        if (sanitizado) {
            db.execute(sql`
                INSERT INTO ofertas_busquedas_log (ciudad, termino, usuario_id)
                VALUES (${filtros.ciudad}, ${sanitizado}, NULL)
            `).catch((err) => {
                console.warn('No se pudo loguear búsqueda de ofertas:', err);
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
