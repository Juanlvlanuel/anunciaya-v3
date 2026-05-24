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
    // 1. Marcar unaccent como IMMUTABLE (necesario para usarla en índice).
    //    Postgres exige IMMUTABLE en expresiones de índice; unaccent es
    //    STABLE por defecto. Ver migración SQL para detalles.
    await db.execute(sql`ALTER FUNCTION unaccent(text) IMMUTABLE`);

    // 2. Índice FTS GIN con unaccent
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_servicios_pub_titulo_fts_unaccent
            ON servicios_publicaciones
            USING GIN (to_tsvector('spanish', unaccent(titulo || ' ' || descripcion)))
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
