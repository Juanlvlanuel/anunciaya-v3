/**
 * aplicar-preguntas-comunidad-migration.ts
 * =========================================
 * Aplica la migración 2026-05-24: tabla preguntas_comunidad (feed
 * "Pregúntale a [ciudad]" del Home).
 *
 * Espejo de docs/migraciones/2026-05-24-preguntas-comunidad.sql.
 * Idempotente.
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    // Tabla
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS preguntas_comunidad (
            id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            usuario_id      uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
            texto           varchar(500) NOT NULL,
            ciudad          varchar(120) NOT NULL,
            estado          varchar(100) NOT NULL,
            estado_pregunta varchar(20) NOT NULL DEFAULT 'activa',
            created_at      timestamptz DEFAULT now(),
            updated_at      timestamptz DEFAULT now(),
            CONSTRAINT preguntas_comunidad_estado_pregunta_check
                CHECK (estado_pregunta::text = ANY (
                    ARRAY['activa', 'cerrada', 'oculta']::text[]
                ))
        )
    `);

    // Índices
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_preguntas_comunidad_ciudad_fecha
            ON preguntas_comunidad (ciudad, created_at DESC)
    `);
    await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_preguntas_comunidad_usuario
            ON preguntas_comunidad (usuario_id)
    `);

    // Verificación
    const columnas = await db.execute(sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'preguntas_comunidad'
        ORDER BY ordinal_position
    `);
    console.log('Columnas de preguntas_comunidad:');
    console.table(columnas.rows);

    const indices = await db.execute(sql`
        SELECT indexname, indexdef
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
