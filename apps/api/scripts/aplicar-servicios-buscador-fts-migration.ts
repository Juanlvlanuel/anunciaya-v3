/**
 * aplicar-servicios-buscador-fts-migration.ts
 * ============================================
 * Aplica la migración 2026-05-24: índice FTS con unaccent integrada sobre
 * `servicios_publicaciones(titulo, descripcion)` para soportar la búsqueda
 * completa híbrida (FTS + ILIKE + unaccent) del endpoint
 * `GET /api/servicios/buscar`.
 *
 * Espejo de docs/migraciones/2026-05-24-servicios-buscador-fts.sql.
 * Idempotente.
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    // 1. Wrapper IMMUTABLE de unaccent en `public`. Detectamos en qué
    //    schema vive `unaccent` (Supabase: `extensions`, local: `public`)
    //    y calificamos explícitamente. Sin calificar, el INLINING durante
    //    CREATE INDEX falla con "function unaccent(text) does not exist".
    //    Ver migración SQL y PATRON_BUSCADOR_FTS.md trampa #7.
    const schemaRes = await db.execute(sql`
        SELECT n.nspname AS schema
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'unaccent'
        LIMIT 1
    `);
    const unaccentSchema = (schemaRes.rows[0] as { schema?: string } | undefined)?.schema;
    if (!unaccentSchema) {
        throw new Error('Extensión unaccent no instalada — corre la migración 2026-05-14-extension-unaccent.sql primero');
    }
    await db.execute(sql.raw(`
        CREATE OR REPLACE FUNCTION public.immutable_unaccent(text) RETURNS text AS $$
            SELECT ${unaccentSchema}.unaccent($1)
        $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE
    `));

    // 2. Drop+Create del índice FTS con la wrapper (por si ya existía con
    //    `unaccent(...)` directo de una corrida anterior).
    await db.execute(sql`DROP INDEX IF EXISTS idx_servicios_pub_titulo_fts_unaccent`);

    await db.execute(sql`
        CREATE INDEX idx_servicios_pub_titulo_fts_unaccent
            ON servicios_publicaciones
            USING GIN (to_tsvector('spanish', public.immutable_unaccent(titulo || ' ' || descripcion)))
            WHERE deleted_at IS NULL
    `);

    // Verificación
    const indices = await db.execute(sql`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'servicios_publicaciones'
          AND indexname = 'idx_servicios_pub_titulo_fts_unaccent'
    `);
    console.log('Índice creado:');
    console.table(indices.rows);

    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
