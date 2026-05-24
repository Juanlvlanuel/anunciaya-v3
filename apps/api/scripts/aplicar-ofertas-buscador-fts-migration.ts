/**
 * aplicar-ofertas-buscador-fts-migration.ts
 * ==========================================
 * Aplica la migración 2026-05-24-ofertas-buscador-fts.sql:
 *   - ALTER FUNCTION unaccent(text) IMMUTABLE (idempotente, ver trampa #7
 *     de PATRON_BUSCADOR_FTS.md).
 *   - Índice GIN FTS con unaccent + coalesce sobre (titulo, descripcion)
 *     — descripcion es NULLABLE en ofertas.
 *   - Tabla `ofertas_busquedas_log` + su índice para fire-and-forget de
 *     términos buscados.
 *
 * Idempotente.
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    // 1. Marcar unaccent como IMMUTABLE (prerequisito)
    await db.execute(sql`ALTER FUNCTION unaccent(text) IMMUTABLE`);

    // 2. Índice GIN FTS con unaccent + coalesce
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_ofertas_titulo_fts_unaccent
            ON ofertas
            USING GIN (to_tsvector('spanish', unaccent(titulo || ' ' || coalesce(descripcion, ''))))
    `);

    // 3. Tabla de log
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS ofertas_busquedas_log (
            id          BIGSERIAL PRIMARY KEY,
            ciudad      VARCHAR(100) NOT NULL,
            termino     VARCHAR(100) NOT NULL,
            usuario_id  UUID REFERENCES usuarios(id) ON DELETE SET NULL,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_ofertas_busq_ciudad_fecha
            ON ofertas_busquedas_log (ciudad, created_at DESC)
    `);

    // ─── Verificación ────────────────────────────────────────────────
    const indiceFts = await db.execute(sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'ofertas'
          AND indexname = 'idx_ofertas_titulo_fts_unaccent'
    `);
    console.log('Índice FTS sobre ofertas:');
    console.table(indiceFts.rows);

    const columnas = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'ofertas_busquedas_log'
        ORDER BY ordinal_position
    `);
    console.log('\nColumnas de ofertas_busquedas_log:');
    console.table(columnas.rows);

    const indicesLog = await db.execute(sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'ofertas_busquedas_log'
        ORDER BY indexname
    `);
    console.log('\nÍndices de ofertas_busquedas_log:');
    console.table(indicesLog.rows);

    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
