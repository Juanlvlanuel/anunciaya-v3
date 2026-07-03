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
import { tokenizarQuery, unirOr } from '../_helpers/busquedaFlexible.js';

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
    /**
     * Modo a buscar: 'vendo' (default) | 'busco'. Si no se pasa, se busca en
     * ventas (comportamiento histórico; también lo que Coyo-comprador espera).
     */
    modo?: 'vendo' | 'busco';
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
    /**
     * Modo flexible para Coyo. Cuando `true`, las palabras se tratan como
     * OR (cualquiera matchea) en vez del AND implícito por defecto. Solo
     * lo activa `services/coyo/buscadorUnificado.ts`. Ver
     * `services/_helpers/busquedaFlexible.ts`.
     */
    modoFlexible?: boolean;
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
 * Devuelve top 5 artículos activos en la ciudad cuyo
 * `to_tsvector('spanish', titulo+descripcion)` matchea el query del usuario,
 * con preview enriquecido para renderizar cards en el overlay (foto, precio,
 * condición, ciudad).
 *
 * El caller decide el debounce (300ms en el FE).
 */
export interface SugerenciaArticuloRow {
    id: string;
    /** 'vendo' (venta) | 'busco' (demanda). Buscador global trae ambos. */
    modo: 'vendo' | 'busco';
    titulo: string;
    /** NULL en modo='busco' (una búsqueda no lleva precio). */
    precio: number | null;
    /** Presupuesto {min,max} — solo modo='busco', opcional. */
    presupuesto: { min: number; max: number } | null;
    /** NULL cuando no aplica (búsquedas o ventas sin condición). */
    condicion: string | null;
    fotoPortada: string | null;
    ciudad: string;
    /** Nombre del usuario que publicó (solo personas — MP no admite negocios). */
    vendedorNombre: string;
}

export async function obtenerSugerencias(
    queryTexto: string,
    ciudad: string
): Promise<{ success: true; data: SugerenciaArticuloRow[] }> {
    const q = queryTexto.trim();
    if (q.length < 2) return { success: true, data: [] };

    try {
        // Match accent-insensitive: aplicamos `unaccent()` tanto al texto
        // indexado como al query del usuario, así "bicicleta vintage" matchea
        // "Bicicleta Vintage" aunque el usuario escriba "bicilceta vintage"
        // o sin acentos. Requiere `CREATE EXTENSION unaccent` aplicado vía
        // `docs/migraciones/2026-05-14-extension-unaccent.sql`.
        //
        // Combina FTS español con ILIKE substring:
        //  - FTS (`@@ plainto_tsquery`) → da ranking por relevancia y stemming
        //    en español ("bicicletas" matchea "bicicleta") pero NO hace prefix
        //    matching: el usuario que escribe "bici" no encuentra "bicicleta"
        //    porque el tokenizer trabaja por palabras completas.
        //  - ILIKE substring → cubre ese gap. Mientras el usuario escribe
        //    incrementalmente, los matches por prefijo aparecen al instante.
        //
        // Ranking del ORDER BY: las filas con match FTS reciben ts_rank > 0
        // (más relevantes); las que solo matchean por ILIKE reciben 0 y caen
        // al final, desempatadas por `created_at` (más recientes primero).
        //
        // Nota: el GIN index original `idx_marketplace_titulo_fts` está sobre
        // la versión sin `unaccent` y deja de servir para esta query — el
        // planner cae a sequential scan. Para datasets pequeños es aceptable.
        // Si el volumen crece, recrear el index sobre la versión con unaccent.
        const patron = `%${q}%`;
        const resultado = await db.execute(sql`
            SELECT
                a.id,
                a.modo,
                a.titulo,
                a.precio,
                a.presupuesto,
                a.condicion,
                a.fotos,
                a.foto_portada_index,
                c.nombre AS ciudad,
                u.nombre AS vendedor_nombre,
                u.apellidos AS vendedor_apellidos
            FROM articulos_marketplace a
            INNER JOIN usuarios u ON u.id = a.usuario_id
            LEFT JOIN ciudades c ON c.id = a.ciudad_id
            WHERE a.estado = 'activa'
              AND a.deleted_at IS NULL
              -- Buscador GLOBAL: trae ventas y búsquedas juntas (sin filtrar por
              -- modo). El precio/presupuesto se resuelve por fila en el mapeo.
              AND c.nombre = ${ciudad}
              AND (
                  to_tsvector('spanish', unaccent(a.titulo || ' ' || a.descripcion))
                      @@ plainto_tsquery('spanish', unaccent(${q}))
                  OR unaccent(a.titulo) ILIKE unaccent(${patron})
                  OR unaccent(a.descripcion) ILIKE unaccent(${patron})
              )
            ORDER BY ts_rank(
                to_tsvector('spanish', unaccent(a.titulo || ' ' || a.descripcion)),
                plainto_tsquery('spanish', unaccent(${q}))
            ) DESC,
            a.created_at DESC
            LIMIT 50
        `);

        type Raw = {
            id: string;
            modo: 'vendo' | 'busco';
            titulo: string;
            precio: string | number | null;
            presupuesto: { min: number; max: number } | null;
            condicion: string | null;
            fotos: string[] | null;
            foto_portada_index: number | null;
            ciudad: string;
            vendedor_nombre: string | null;
            vendedor_apellidos: string | null;
        };

        const items: SugerenciaArticuloRow[] = (resultado.rows as Raw[]).map((r) => {
            const fotos = Array.isArray(r.fotos) ? r.fotos : [];
            const idx = r.foto_portada_index ?? 0;
            const fotoPortada = fotos.length > 0 ? fotos[idx] ?? fotos[0] ?? null : null;
            const nombreCompleto = [r.vendedor_nombre, r.vendedor_apellidos]
                .filter(Boolean)
                .join(' ')
                .trim();
            const precioNum =
                r.precio === null
                    ? null
                    : typeof r.precio === 'string'
                      ? Number(r.precio)
                      : r.precio;
            return {
                id: r.id,
                modo: r.modo,
                titulo: r.titulo,
                precio: precioNum,
                presupuesto: r.presupuesto,
                condicion: r.condicion,
                fotoPortada,
                ciudad: r.ciudad,
                vendedorNombre: nombreCompleto || 'Anónimo',
            };
        });
        return { success: true, data: items };
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
        sql`c.nombre = ${filtros.ciudad}`,
    ];

    // Modo: si se pasa, filtra (lo usa Coyo para acotar a ventas); si NO se
    // pasa, la búsqueda es GLOBAL (ventas + búsquedas juntas), como pide el
    // buscador de la UI.
    if (filtros.modo !== undefined) {
        conds.push(sql`a.modo = ${filtros.modo}`);
    }

    if (queryNorm.length >= 2) {
        // Accent-insensitive + prefix matching — ver §obtenerSugerencias
        // para racional. Combina FTS (stemming + ranking) con ILIKE substring
        // para cubrir el caso "bici" → "bicicleta" mientras el usuario teclea.
        //
        // Dos variantes:
        //   - Normal (usuarios): plainto_tsquery (AND) + frase entera.
        //   - Flexible (Coyo): websearch_to_tsquery + OR por palabra.
        // Ver `services/_helpers/busquedaFlexible.ts`.
        const tokens = filtros.modoFlexible ? tokenizarQuery(queryNorm) : [];
        const usarFlexible = filtros.modoFlexible && tokens.length > 0;

        const ftsExpr = usarFlexible
            ? sql`websearch_to_tsquery('spanish', unaccent(${unirOr(tokens)}))`
            : sql`plainto_tsquery('spanish', unaccent(${queryNorm}))`;

        const ilikeOr = (expresion: ReturnType<typeof sql>) => {
            if (usarFlexible) {
                return sql.join(
                    tokens.map(
                        (t) => sql`${expresion} ILIKE unaccent(${`%${t}%`})`,
                    ),
                    sql` OR `,
                );
            }
            return sql`${expresion} ILIKE unaccent(${`%${queryNorm}%`})`;
        };

        // Cláusulas de búsqueda. El `ILIKE` substring contra `descripcion`
        // SOLO se agrega en modo normal: en modo flexible (Coyo) genera
        // falsos positivos cuando una palabra suelta de Gemini es substring
        // literal de otra palabra distinta de la descripción. Caso real
        // documentado: pregunta "agua purificadora" → tokens ['agua',
        // 'purificadora']. El FTS español NO matchea la Laptop HP porque su
        // tsvector contiene `'aguant'` (raíz de "aguanta") y no `'agua'`;
        // pero `unaccent('aguanta') ILIKE '%agua%'` SÍ devuelve TRUE y la
        // laptop se cuela. En modo flexible confiamos en el FTS (stemming
        // del diccionario español) + el ILIKE del título (corto y curado,
        // bajo riesgo de substring espurio). Ver §Modo flexible en
        // docs/arquitectura/Home_Coyo.md.
        const clausulasBusqueda: ReturnType<typeof sql>[] = [
            sql`to_tsvector('spanish', unaccent(a.titulo || ' ' || a.descripcion)) @@ ${ftsExpr}`,
            ilikeOr(sql`unaccent(a.titulo)`),
        ];
        if (usarFlexible) {
            // Modo flexible (Coyo): matchear también contra el NOMBRE de la
            // categoría (corto y curado, bajo riesgo de substring espurio), para
            // que un término de categoría (ej. "Vehículos") traiga TODOS los
            // artículos de esa categoría aunque el título no la mencione. El FTS
            // de título+descripción sigue cubriendo el texto libre.
            clausulasBusqueda.push(ilikeOr(sql`unaccent(cat.nombre)`));
        } else {
            clausulasBusqueda.push(ilikeOr(sql`unaccent(a.descripcion)`));
        }

        conds.push(sql`(${sql.join(clausulasBusqueda, sql` OR `)})`);
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
            a.id, a.usuario_id, a.modo, a.titulo, a.descripcion, a.precio,
            a.presupuesto, a.urgente,
            a.condicion, a.acepta_ofertas,
            a.fotos, a.foto_portada_index,
            ST_Y(a.ubicacion_aproximada::geometry) AS lat,
            ST_X(a.ubicacion_aproximada::geometry) AS lng,
            c.nombre AS ciudad, a.zona_aproximada, a.estado,
            a.total_vistas, a.total_mensajes, a.total_guardados,
            a.expira_at, a.created_at, a.updated_at, a.vendida_at,
            ${distanciaSelect}
        FROM articulos_marketplace a
        LEFT JOIN ciudades c ON c.id = a.ciudad_id
        LEFT JOIN categorias_marketplace cat ON cat.id = a.categoria_id
        WHERE ${where}
        ${orderBy}
        LIMIT ${limit}
        OFFSET ${offset}
    `);

    // ─── Total para paginación ────────────────────────────────────────────
    const totalResultado = await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM articulos_marketplace a
        LEFT JOIN ciudades c ON c.id = a.ciudad_id
        LEFT JOIN categorias_marketplace cat ON cat.id = a.categoria_id
        WHERE ${where}
    `);
    const total = (totalResultado.rows[0] as { total: number }).total;

    // ─── Mapear filas a formato del feed ─────────────────────────────────
    interface RawFila {
        id: string;
        usuario_id: string;
        modo: string;
        titulo: string;
        descripcion: string;
        precio: string | null;
        presupuesto: { min: number; max: number } | null;
        urgente: boolean;
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
        modo: row.modo,
        titulo: row.titulo,
        descripcion: row.descripcion,
        precio: row.precio,
        presupuesto: row.presupuesto,
        urgente: row.urgente,
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
