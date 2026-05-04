/**
 * buscador.ts
 * ============
 * Lógica del buscador potenciado del MarketPlace (Sprint 6).
 *
 * Endpoints servidos:
 *   - obtenerSugerencias  → top 5 títulos de artículos activos por FTS
 *   - obtenerPopulares    → top 6 términos buscados últimos 7 días por ciudad
 *   - buscarArticulos     → búsqueda completa con filtros + ordenar + paginado
 *
 * Privacidad:
 *  - `marketplace_busquedas_log` se inserta SIEMPRE con `usuario_id = NULL`
 *    aunque el endpoint sea autenticado. Solo se persiste ciudad + termino +
 *    timestamp para calcular populares. Imposible perfilar a usuarios.
 *
 * Sanitización del término al guardar en log:
 *  - trim() + toLowerCase().
 *  - Elimina puntuación (regex permite letras + números + acentos + espacios).
 *  - Descarta si length < 3 (evita "a", "  ", "?", etc. ensuciando populares).
 *
 * Cache de populares en Redis:
 *  - Clave `marketplace:populares:{ciudad}` con TTL 1h.
 *  - El cron diario del Sprint 7 puede pre-calentar el cache.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§8 P5)
 * Sprint:      docs/prompts Marketplace/Sprint-6-Buscador.md
 *
 * Ubicación: apps/api/src/services/marketplace/buscador.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { redis } from '../../db/redis.js';

// =============================================================================
// TIPOS
// =============================================================================

export type OrdenarBusqueda =
    | 'recientes'
    | 'cercanos'
    | 'precio_asc'
    | 'precio_desc';

export interface FiltrosBusqueda {
    /** Texto a buscar — opcional (se puede listar sin texto, solo con filtros) */
    q?: string;
    ciudad: string;
    /** Coordenadas del usuario para `cercanos` y filtro de distancia */
    lat?: number;
    lng?: number;
    /** Rango de precio (entero MXN) */
    precioMin?: number;
    precioMax?: number;
    /** 1 o más condiciones */
    condicion?: Array<'nuevo' | 'seminuevo' | 'usado' | 'para_reparar'>;
    /** Distancia máxima en km (requiere lat+lng) */
    distanciaMaxKm?: number;
    ordenar?: OrdenarBusqueda;
    limit?: number;
    offset?: number;
}

export interface ResultadoBusqueda {
    success: true;
    data: unknown[];
    paginacion: { total: number; limit: number; offset: number };
    query: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Sanitiza el término antes de guardarlo en `marketplace_busquedas_log`.
 *
 * Reglas:
 *  - trim + toLowerCase
 *  - Elimina puntuación (mantiene letras, números, acentos y espacios)
 *  - Colapsa espacios múltiples
 *  - Descarta si length < 3 (devuelve null)
 *
 * Visible (no `_internal`) porque el test unitario lo importa directamente.
 */
export function sanitizarTerminoParaLog(termino: string): string | null {
    const limpio = termino
        .toLowerCase()
        .normalize('NFC')
        // Mantener letras (incluye acentos), números y espacios
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (limpio.length < 3) return null;
    return limpio;
}

// =============================================================================
// SUGERENCIAS EN VIVO
// =============================================================================

/**
 * Devuelve top 5 títulos de artículos activos en la ciudad cuyo
 * `to_tsvector('spanish', titulo)` matchea el query del usuario.
 *
 * Las sugerencias son TÍTULOS COMPLETOS de artículos existentes, no términos
 * extraídos. Esto da resultados más específicos y útiles ("Bicicleta vintage
 * Rinos restaurada") en lugar de genéricos ("bicicleta").
 *
 * El caller decide el debounce (300ms en el FE).
 */
export async function obtenerSugerencias(
    queryTexto: string,
    ciudad: string
): Promise<{ success: true; data: string[] }> {
    const q = queryTexto.trim();
    if (q.length < 2) return { success: true, data: [] };

    try {
        const resultado = await db.execute(sql`
            SELECT titulo
            FROM articulos_marketplace
            WHERE estado = 'activa'
              AND deleted_at IS NULL
              AND ciudad = ${ciudad}
              AND to_tsvector('spanish', titulo || ' ' || descripcion)
                  @@ plainto_tsquery('spanish', ${q})
            ORDER BY ts_rank(
                to_tsvector('spanish', titulo || ' ' || descripcion),
                plainto_tsquery('spanish', ${q})
            ) DESC,
            created_at DESC
            LIMIT 5
        `);
        const titulos = (resultado.rows as Array<{ titulo: string }>).map((r) => r.titulo);
        return { success: true, data: titulos };
    } catch (error) {
        console.error('Error en obtenerSugerencias:', error);
        return { success: true, data: [] };
    }
}

// =============================================================================
// POPULARES POR CIUDAD
// =============================================================================

const CACHE_PREFIX_POPULARES = 'marketplace:populares';
const CACHE_TTL_POPULARES_SEG = 60 * 60; // 1 hora

/**
 * Top 6 términos más buscados en la ciudad en los últimos 7 días. Cachea en
 * Redis con TTL 1h. El cron diario del Sprint 7 puede pre-calentar el cache.
 */
export async function obtenerPopulares(
    ciudad: string
): Promise<{ success: true; data: string[] }> {
    const key = `${CACHE_PREFIX_POPULARES}:${ciudad}`;

    try {
        const cached = await redis.get(key);
        if (cached) {
            try {
                return { success: true, data: JSON.parse(cached) as string[] };
            } catch {
                // Caché corrupto — continuar y recalcular.
            }
        }
    } catch (error) {
        // Si Redis falla, seguir sin caché.
        console.warn('Redis fail en obtenerPopulares:', error);
    }

    try {
        const resultado = await db.execute(sql`
            SELECT termino, COUNT(*)::int AS total
            FROM marketplace_busquedas_log
            WHERE ciudad = ${ciudad}
              AND created_at > NOW() - INTERVAL '7 days'
            GROUP BY termino
            ORDER BY total DESC, MAX(created_at) DESC
            LIMIT 6
        `);
        const terminos = (resultado.rows as Array<{ termino: string }>).map((r) => r.termino);

        // Guardar en cache (best-effort)
        try {
            await redis.set(key, JSON.stringify(terminos), 'EX', CACHE_TTL_POPULARES_SEG);
        } catch {
            // ignorar
        }

        return { success: true, data: terminos };
    } catch (error) {
        console.error('Error en obtenerPopulares:', error);
        return { success: true, data: [] };
    }
}

// =============================================================================
// BUSCAR ARTÍCULOS (con filtros + ordenar + paginado)
// =============================================================================

/**
 * Búsqueda completa. Si `q` está presente filtra por FTS; si no, devuelve
 * todos los artículos activos de la ciudad ordenados según el criterio.
 *
 * Inserta una entrada en `marketplace_busquedas_log` fire-and-forget
 * (con `usuario_id = NULL` por privacidad).
 */
export async function buscarArticulos(
    filtros: FiltrosBusqueda
): Promise<ResultadoBusqueda> {
    const limit = Math.min(Math.max(filtros.limit ?? 20, 1), 100);
    const offset = Math.max(filtros.offset ?? 0, 0);
    const queryNorm = (filtros.q ?? '').trim();
    const ordenar: OrdenarBusqueda = filtros.ordenar ?? 'recientes';

    // ─── Construcción de WHERE dinámico ──────────────────────────────────
    const conds: ReturnType<typeof sql>[] = [
        sql`a.estado = 'activa'`,
        sql`a.deleted_at IS NULL`,
        sql`a.ciudad = ${filtros.ciudad}`,
    ];

    if (queryNorm.length >= 2) {
        conds.push(
            sql`to_tsvector('spanish', a.titulo || ' ' || a.descripcion) @@ plainto_tsquery('spanish', ${queryNorm})`
        );
    }

    if (filtros.precioMin !== undefined) {
        conds.push(sql`a.precio >= ${filtros.precioMin}`);
    }
    if (filtros.precioMax !== undefined) {
        conds.push(sql`a.precio <= ${filtros.precioMax}`);
    }
    if (filtros.condicion && filtros.condicion.length > 0) {
        const condArray = sql.join(
            filtros.condicion.map((c) => sql`${c}`),
            sql`, `
        );
        conds.push(sql`a.condicion IN (${condArray})`);
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
                a.ubicacion_aproximada,
                ST_SetSRID(ST_MakePoint(${filtros.lng}, ${filtros.lat}), 4326)::geography,
                ${radioMetros}
            )
        `);
    }

    const where = sql.join(conds, sql` AND `);

    // ─── ORDER BY ────────────────────────────────────────────────────────
    let orderBy: ReturnType<typeof sql>;
    if (ordenar === 'cercanos' && filtros.lat !== undefined && filtros.lng !== undefined) {
        orderBy = sql`ORDER BY a.ubicacion_aproximada <-> ST_SetSRID(ST_MakePoint(${filtros.lng}, ${filtros.lat}), 4326)::geography`;
    } else if (ordenar === 'precio_asc') {
        orderBy = sql`ORDER BY a.precio ASC`;
    } else if (ordenar === 'precio_desc') {
        orderBy = sql`ORDER BY a.precio DESC`;
    } else {
        // recientes (default) o cercanos sin GPS → fallback a recientes
        orderBy = sql`ORDER BY a.created_at DESC`;
    }

    // ─── Distancia precalculada para mostrar en cards ────────────────────
    const distanciaSelect =
        filtros.lat !== undefined && filtros.lng !== undefined
            ? sql`ST_Distance(a.ubicacion_aproximada, ST_SetSRID(ST_MakePoint(${filtros.lng}, ${filtros.lat}), 4326)::geography) AS distancia_metros`
            : sql`NULL::float AS distancia_metros`;

    // ─── Query de datos ──────────────────────────────────────────────────
    const datosResultado = await db.execute(sql`
        SELECT
            a.id, a.usuario_id, a.titulo, a.descripcion, a.precio,
            a.condicion, a.acepta_ofertas,
            a.fotos, a.foto_portada_index,
            ST_Y(a.ubicacion_aproximada::geometry) AS lat,
            ST_X(a.ubicacion_aproximada::geometry) AS lng,
            a.ciudad, a.zona_aproximada, a.estado,
            a.total_vistas, a.total_mensajes, a.total_guardados,
            a.expira_at, a.created_at, a.updated_at, a.vendida_at,
            ${distanciaSelect}
        FROM articulos_marketplace a
        WHERE ${where}
        ${orderBy}
        LIMIT ${limit}
        OFFSET ${offset}
    `);

    // ─── Total para paginación ────────────────────────────────────────────
    const totalResultado = await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM articulos_marketplace a
        WHERE ${where}
    `);
    const total = (totalResultado.rows[0] as { total: number }).total;

    // ─── Mapear filas a formato del feed ─────────────────────────────────
    interface RawFila {
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
        distancia_metros: number | null;
    }
    const data = (datosResultado.rows as unknown as RawFila[]).map((row) => ({
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
        distanciaMetros:
            row.distancia_metros !== null ? Math.round(row.distancia_metros) : null,
    }));

    // ─── Loguear término en BD (fire-and-forget, usuario_id = NULL) ─────
    if (queryNorm.length >= 2) {
        const sanitizado = sanitizarTerminoParaLog(queryNorm);
        if (sanitizado) {
            db.execute(sql`
                INSERT INTO marketplace_busquedas_log (ciudad, termino, usuario_id)
                VALUES (${filtros.ciudad}, ${sanitizado}, NULL)
            `).catch((err) => {
                console.warn('No se pudo loguear búsqueda:', err);
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
