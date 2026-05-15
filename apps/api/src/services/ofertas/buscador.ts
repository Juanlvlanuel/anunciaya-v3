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

        // Match accent-insensitive: `unaccent()` se aplica a ambos lados
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
                      unaccent(o.titulo) ILIKE unaccent(${patron})
                      OR unaccent(o.descripcion) ILIKE unaccent(${patron})
                      OR unaccent(n.nombre) ILIKE unaccent(${patron})
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
                                unaccent(sc.nombre) ILIKE unaccent(${patron})
                                OR unaccent(c.nombre) ILIKE unaccent(${patron})
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
                ciudad
            FROM base
            WHERE rn = 1
            ORDER BY updated_at DESC
            LIMIT 5
        `);

        type Raw = {
            oferta_id: string;
            titulo: string;
            imagen: string | null;
            tipo: string;
            valor: string | number;
            negocio_nombre: string;
            sucursal_nombre: string | null;
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
            ciudad: r.ciudad,
        }));

        return { success: true, data: items };
    } catch (error) {
        console.error('Error en obtenerSugerenciasOfertas:', error);
        return { success: true, data: [] };
    }
}
