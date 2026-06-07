/**
 * mapear-sucursal-ciudad-id.ts
 * ============================
 * Paso 6 de la migración ciudad↔región: llena `negocio_sucursales.ciudad_id`
 * (creado en el Paso 4) mapeando el TEXTO actual `negocio_sucursales.ciudad` a una
 * fila de `ciudades`, por SLUG normalizado.
 *
 * Slug: misma `normalizarTexto` del catálogo + `.replace(/\s+/g,'-')` que usó el
 * Paso 2 (seed-ciudades). Así "Puerto Peñasco" (texto) → 'puerto-penasco' → ciudad.
 *
 * Reglas:
 *   · Solo mapea sucursales con ciudad NOT NULL y distinta de 'Por configurar'.
 *   · Si el slug no existe en `ciudades`, NO actualiza y lo reporta (sin mapear).
 *   · Las 2 sucursales sin ciudad ('Por configurar' / NULL) quedan con ciudad_id NULL.
 *
 * Idempotente: re-ejecutable (UPDATE determinista por id). Imprime un resumen.
 *
 * EJECUTAR (DEV si DB_ENVIRONMENT=local en apps/api/.env):
 *   cd apps/api && pnpm exec tsx scripts/mapear-sucursal-ciudad-id.ts
 *
 * Reversible: `UPDATE negocio_sucursales SET ciudad_id = NULL;` (nada depende aún de ella).
 *
 * Ubicación: apps/api/scripts/mapear-sucursal-ciudad-id.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { normalizarTexto } from '../../../packages/shared/src/data/ciudadesPopulares.js';

/** Mismo slug que el seed del Paso 2. */
function calcularSlug(texto: string): string {
    return normalizarTexto(texto).replace(/\s+/g, '-');
}

async function main() {
    // Sucursales con ciudad texto mapeable (excluye placeholder y NULL).
    const sucursales = (await db.execute(sql`
        SELECT id, ciudad FROM negocio_sucursales
        WHERE ciudad IS NOT NULL AND ciudad <> 'Por configurar'
    `)).rows as Array<{ id: string; ciudad: string }>;

    // Mapa slug → ciudad_id (del catálogo ya sembrado).
    const ciudades = (await db.execute(sql`SELECT id, slug FROM ciudades`)).rows as Array<{ id: string; slug: string }>;
    const slugAId = new Map(ciudades.map((c) => [c.slug, c.id]));

    let mapeadas = 0;
    const sinMapear = new Map<string, number>(); // texto de ciudad → cuántas

    for (const suc of sucursales) {
        const slug = calcularSlug(suc.ciudad);
        const ciudadId = slugAId.get(slug);
        if (!ciudadId) {
            sinMapear.set(suc.ciudad, (sinMapear.get(suc.ciudad) ?? 0) + 1);
            continue;
        }
        await db.execute(sql`UPDATE negocio_sucursales SET ciudad_id = ${ciudadId} WHERE id = ${suc.id}`);
        mapeadas++;
    }

    // Totales y distribución.
    const tot = (await db.execute(sql`
        SELECT count(*)::int AS total,
               count(ciudad_id)::int AS con_ciudad_id,
               (count(*) - count(ciudad_id))::int AS sin_ciudad_id
        FROM negocio_sucursales
    `)).rows[0] as { total: number; con_ciudad_id: number; sin_ciudad_id: number };

    const dist = (await db.execute(sql`
        SELECT c.slug, count(*)::int AS n
        FROM negocio_sucursales s JOIN ciudades c ON c.id = s.ciudad_id
        GROUP BY c.slug ORDER BY n DESC
    `)).rows;

    const sinMapearTotal = [...sinMapear.values()].reduce((a, b) => a + b, 0);

    console.log('\n───────── RESUMEN mapear-sucursal-ciudad-id ─────────');
    console.log(`Ambiente BD:                       ${process.env.DB_ENVIRONMENT || 'local'}`);
    console.log(`Sucursales con ciudad (mapeables): ${sucursales.length}`);
    console.log(`Mapeadas (ciudad_id asignado):     ${mapeadas}`);
    console.log(`Sin mapear (slug inexistente):     ${sinMapearTotal}`, sinMapear.size ? Object.fromEntries(sinMapear) : '');
    console.log(`Total sucursales:                  ${tot.total}`);
    console.log(`Con ciudad_id:                     ${tot.con_ciudad_id}`);
    console.log(`Sin ciudad_id (NULL/Por configurar): ${tot.sin_ciudad_id}`);
    console.log('Distribución por ciudad:', dist);
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
}

main().catch((err) => {
    console.error('Error en mapear-sucursal-ciudad-id:', err);
    process.exit(1);
});
