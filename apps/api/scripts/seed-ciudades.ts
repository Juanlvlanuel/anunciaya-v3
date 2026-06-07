/**
 * seed-ciudades.ts
 * ================
 * Paso 2 de la migración ciudad↔región: puebla la tabla `ciudades` (creada en el
 * Paso 1) desde el catálogo hardcodeado `ciudadesPopulares`.
 *
 * Fuente: packages/shared/src/data/ciudadesPopulares.ts (importado por RUTA RELATIVA
 * AL src — no dist, no alias). Es la copia ya consolidada (71 entradas, con Sonoyta).
 *
 * Slug: se calcula con la MISMA `normalizarTexto` del catálogo (lower + NFD + sin
 * acentos/especiales) + reemplazo de espacios por '-'. DEBE coincidir con el slug que
 * usará el Paso 6 al mapear `negocio_sucursales.ciudad` (texto) → `ciudad_id`.
 *
 * Idempotente: `INSERT ... ON CONFLICT (slug) DO NOTHING`. Re-ejecutable sin duplicar.
 * `region_id` queda NULL (se asigna en el Paso 5). Imprime un resumen al final.
 *
 * EJECUTAR (apunta a DEV si DB_ENVIRONMENT=local en apps/api/.env):
 *   cd apps/api && pnpm exec tsx scripts/seed-ciudades.ts
 *
 * Reversible: `TRUNCATE ciudades;` (nada cuelga de ella todavía).
 *
 * Ubicación: apps/api/scripts/seed-ciudades.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import {
    ciudadesPopulares,
    normalizarTexto,
} from '../../../packages/shared/src/data/ciudadesPopulares.js';

/** Slug normalizado: igual que en el Paso 6. "Puerto Peñasco" → "puerto-penasco". */
function calcularSlug(nombre: string): string {
    return normalizarTexto(nombre).replace(/\s+/g, '-');
}

async function main() {
    let insertadas = 0;
    let yaExistian = 0;

    // Detección informativa de slugs compartidos DENTRO del catálogo (acentos/mayúsculas):
    // si dos nombres distintos colapsan al mismo slug, solo entrará el primero.
    const slugAnombre = new Map<string, string>();

    for (const ciudad of ciudadesPopulares) {
        const slug = calcularSlug(ciudad.nombre);

        if (slugAnombre.has(slug) && slugAnombre.get(slug) !== ciudad.nombre) {
            console.log(`⚠️  Slug compartido '${slug}': "${slugAnombre.get(slug)}" y "${ciudad.nombre}" → colapsan en una sola fila`);
        }
        slugAnombre.set(slug, ciudad.nombre);

        const res = await db.execute(sql`
            INSERT INTO ciudades (nombre, estado, pais, slug, lat, lng, alias, importancia)
            VALUES (
                ${ciudad.nombre},
                ${ciudad.estado},
                ${'México'},
                ${slug},
                ${ciudad.coordenadas.lat},
                ${ciudad.coordenadas.lng},
                ${JSON.stringify(ciudad.alias ?? [])}::jsonb,
                ${ciudad.importancia}
            )
            ON CONFLICT (slug) DO NOTHING
            RETURNING id
        `);

        if (res.rows.length > 0) insertadas++;
        else yaExistian++;
    }

    // Totales y verificación del caso "Puerto Peñasco" / "Puerto Penasco".
    const totalRes = await db.execute(sql`SELECT count(*)::int AS total FROM ciudades`);
    const total = (totalRes.rows[0] as { total: number }).total;

    const penascoRes = await db.execute(
        sql`SELECT nombre, estado, slug FROM ciudades WHERE slug = 'puerto-penasco'`,
    );

    const dupRes = await db.execute(sql`
        SELECT slug, count(*)::int AS n FROM ciudades GROUP BY slug HAVING count(*) > 1
    `);

    console.log('\n───────── RESUMEN seed-ciudades ─────────');
    console.log(`Ambiente BD:            ${process.env.DB_ENVIRONMENT || 'local'}`);
    console.log(`Catálogo (entradas):    ${ciudadesPopulares.length}`);
    console.log(`Slugs únicos:           ${slugAnombre.size}`);
    console.log(`Insertadas ahora:       ${insertadas}`);
    console.log(`Ya existían (skip):     ${yaExistian}`);
    console.log(`Total en 'ciudades':    ${total}`);
    console.log(`'puerto-penasco' →      ${penascoRes.rows.length} fila(s):`, penascoRes.rows);
    console.log(`Slugs duplicados en BD: ${dupRes.rows.length} (debe ser 0)`);
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
}

main().catch((err) => {
    console.error('Error en seed-ciudades:', err);
    process.exit(1);
});
