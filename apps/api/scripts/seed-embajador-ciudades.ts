/**
 * seed-embajador-ciudades.ts
 * ==========================
 * Paso 7 de la migración ciudad↔región: puebla la cobertura de los vendedores
 * existentes en `embajador_ciudades` (tabla + trigger del Paso 3).
 *
 * Lógica: a cada embajador se le asignan TODAS las ciudades de SU `region_id`
 * provisional (el que quedó tras el Paso 5). Así el Vendedor Prueba (JUAN01), que
 * quedó en Sonora-Norte, cubre puerto-penasco + sonoyta. Como todas son de la misma
 * región, el trigger `trg_embajador_una_region` lo permite (aquí se ejercita "en
 * positivo" por primera vez).
 *
 * Nota de modelo: la región del vendedor se DEDUCE de estas ciudades. El campo
 * `embajadores.region_id` es provisional y se elimina en el Paso 10.
 *
 * Idempotente: INSERT ... ON CONFLICT DO NOTHING. Re-ejecutable. Imprime un resumen.
 *
 * EJECUTAR (DEV si DB_ENVIRONMENT=local):
 *   cd apps/api && pnpm exec tsx scripts/seed-embajador-ciudades.ts
 *   (si ya estás dentro de apps/api, solo: pnpm exec tsx scripts/seed-embajador-ciudades.ts)
 *
 * Reversible: `TRUNCATE embajador_ciudades;` (nada depende aún de ella).
 *
 * Ubicación: apps/api/scripts/seed-embajador-ciudades.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

async function main() {
    const embajadores = (await db.execute(sql`
        SELECT e.id, e.codigo_referido, e.region_id, r.nombre AS region_nombre
        FROM embajadores e LEFT JOIN regiones r ON r.id = e.region_id
    `)).rows as Array<{ id: string; codigo_referido: string; region_id: string; region_nombre: string | null }>;

    let totalInsertadas = 0;
    const resumen: Array<{ vendedor: string; region: string | null; ciudades: string[] }> = [];

    for (const emb of embajadores) {
        const ciudades = (await db.execute(sql`
            SELECT id, slug FROM ciudades WHERE region_id = ${emb.region_id} ORDER BY slug
        `)).rows as Array<{ id: string; slug: string }>;

        const cubiertas: string[] = [];
        for (const c of ciudades) {
            const res = await db.execute(sql`
                INSERT INTO embajador_ciudades (embajador_id, ciudad_id)
                VALUES (${emb.id}, ${c.id})
                ON CONFLICT (embajador_id, ciudad_id) DO NOTHING
                RETURNING embajador_id
            `);
            if (res.rows.length > 0) totalInsertadas++;
            cubiertas.push(c.slug);
        }
        resumen.push({ vendedor: emb.codigo_referido, region: emb.region_nombre, ciudades: cubiertas });
    }

    // Guard: ninguna cobertura debe abarcar más de una región (1 por vendedor).
    const multi = (await db.execute(sql`
        SELECT e.codigo_referido, count(DISTINCT c.region_id)::int AS regiones
        FROM embajador_ciudades ec
        JOIN embajadores e ON e.id = ec.embajador_id
        JOIN ciudades c ON c.id = ec.ciudad_id
        GROUP BY e.codigo_referido
        HAVING count(DISTINCT c.region_id) > 1
    `)).rows;

    const total = (await db.execute(sql`SELECT count(*)::int AS total FROM embajador_ciudades`)).rows[0] as { total: number };

    console.log('\n───────── RESUMEN seed-embajador-ciudades ─────────');
    console.log(`Ambiente BD:       ${process.env.DB_ENVIRONMENT || 'local'}`);
    console.log(`Embajadores:       ${embajadores.length}`);
    console.log(`Filas insertadas:  ${totalInsertadas}`);
    console.log(`Total cobertura:   ${total.total}`);
    for (const r of resumen) {
        console.log(`  • ${r.vendedor} (${r.region ?? 'sin region'}): [${r.ciudades.join(', ')}]`);
        if (r.ciudades.length === 0) console.log('    ⚠️  sin ciudades en su region provisional');
    }
    console.log(`Vendedores multi-region (debe ser 0): ${multi.length}`, multi.length ? multi : '');
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
}

main().catch((err) => {
    console.error('Error en seed-embajador-ciudades:', err);
    process.exit(1);
});
