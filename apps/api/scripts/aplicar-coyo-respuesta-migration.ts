/**
 * aplicar-coyo-respuesta-migration.ts
 * ====================================
 * Aplica la migración 2026-05-24: agrega columnas de respuesta de Coyo a
 * `preguntas_comunidad` (respuesta_coyo, resultados_coyo, estado_coyo,
 * coyo_procesado_at) + CHECK del estado + índice parcial sobre pendientes.
 *
 * Espejo de docs/migraciones/2026-05-24-coyo-respuesta-en-pregunta.sql.
 * Idempotente.
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    // 1. Columnas nuevas
    await db.execute(sql`
        ALTER TABLE preguntas_comunidad
            ADD COLUMN IF NOT EXISTS respuesta_coyo     text,
            ADD COLUMN IF NOT EXISTS resultados_coyo    jsonb,
            ADD COLUMN IF NOT EXISTS estado_coyo        varchar(20) NOT NULL DEFAULT 'pendiente',
            ADD COLUMN IF NOT EXISTS coyo_procesado_at  timestamptz
    `);

    // 2. CHECK del estado_coyo (drop+add idempotente)
    await db.execute(sql`
        ALTER TABLE preguntas_comunidad
            DROP CONSTRAINT IF EXISTS preguntas_comunidad_estado_coyo_check
    `);
    await db.execute(sql`
        ALTER TABLE preguntas_comunidad
            ADD CONSTRAINT preguntas_comunidad_estado_coyo_check
            CHECK (estado_coyo::text = ANY (
                ARRAY['pendiente', 'procesando', 'listo', 'sin_respuesta', 'no_aplica']::text[]
            ))
    `);

    // 3. Índice parcial sobre pendientes (cron futuro)
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_preguntas_comunidad_coyo_pendientes
            ON preguntas_comunidad (estado_coyo, created_at DESC)
            WHERE estado_coyo IN ('pendiente', 'procesando')
    `);

    // ─── Verificación ────────────────────────────────────────────────
    const columnas = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'preguntas_comunidad'
          AND column_name IN ('respuesta_coyo', 'resultados_coyo', 'estado_coyo', 'coyo_procesado_at')
        ORDER BY ordinal_position
    `);
    console.log('Columnas nuevas en preguntas_comunidad:');
    console.table(columnas.rows);

    const constraint = await db.execute(sql`
        SELECT conname, pg_get_constraintdef(oid) AS def
        FROM pg_constraint
        WHERE conrelid = 'preguntas_comunidad'::regclass
          AND conname = 'preguntas_comunidad_estado_coyo_check'
    `);
    console.log('\nCHECK estado_coyo:');
    console.table(constraint.rows);

    const indices = await db.execute(sql`
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'preguntas_comunidad'
        ORDER BY indexname
    `);
    console.log('\nÍndices:');
    console.table(indices.rows);

    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
