/**
 * mapear-usuario-ciudad-id.ts
 * ===========================
 * Backfill de `usuarios.ciudad_id` (columna creada en 2026-06-16-usuarios-ciudad-id.sql):
 * mapea el TEXTO actual `usuarios.ciudad` a una fila de `ciudades`, por SLUG normalizado.
 *
 * Gemelo de `mapear-sucursal-ciudad-id.ts` (que hizo lo mismo para negocio_sucursales).
 *
 * Slug: misma `normalizarTexto` del catálogo + `.replace(/\s+/g,'-')` que usó el seed
 * (seed-ciudades). Así "Puerto Peñasco" (texto) → 'puerto-penasco' → ciudad.
 *
 * Reglas:
 *   · Solo mapea usuarios con ciudad NOT NULL y distinta de 'Por configurar'.
 *   · Si el slug no existe en `ciudades`, NO actualiza y lo reporta (sin mapear).
 *   · Los usuarios sin texto de ciudad quedan con ciudad_id NULL ("Sin ciudad" en el Panel)
 *     hasta que abran la app y el puente del frontend reporte su ubicación.
 *
 * NOTA: hoy casi solo los DUEÑOS tienen `usuarios.ciudad` poblado (se les copia de su
 * sucursal); los clientes nacen sin ciudad. Por eso el grueso de la cobertura llega en vivo,
 * vía PATCH /api/auth/ubicacion (puente useGpsStore → backend), no de este backfill.
 *
 * Idempotente: re-ejecutable (UPDATE determinista por id). Imprime un resumen.
 *
 * EJECUTAR (DEV si DB_ENVIRONMENT=local en apps/api/.env):
 *   cd apps/api && pnpm exec tsx scripts/mapear-usuario-ciudad-id.ts
 *
 * Reversible: `UPDATE usuarios SET ciudad_id = NULL;`
 *
 * Ubicación: apps/api/scripts/mapear-usuario-ciudad-id.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { normalizarTexto } from '../../../packages/shared/src/data/ciudadesPopulares.js';

/** Mismo slug que el seed (seed-ciudades). */
function calcularSlug(texto: string): string {
    return normalizarTexto(texto).replace(/\s+/g, '-');
}

/** Slugs candidatos para un texto, en orden de preferencia. Maneja datos legacy con
 *  formato "Ciudad, Estado" (ej. "Puerto Peñasco, Sonora") probando también solo el
 *  nombre antes de la coma. El flujo EN VIVO manda solo el nombre, así que esto es
 *  exclusivo del backfill de datos viejos. */
function slugsCandidatos(texto: string): string[] {
    const candidatos = [calcularSlug(texto)];
    if (texto.includes(',')) {
        const soloNombre = calcularSlug(texto.split(',')[0]);
        if (soloNombre && !candidatos.includes(soloNombre)) candidatos.push(soloNombre);
    }
    return candidatos;
}

async function main() {
    // Usuarios con ciudad texto mapeable (excluye placeholder y NULL).
    const usuarios = (await db.execute(sql`
        SELECT id, ciudad FROM usuarios
        WHERE ciudad IS NOT NULL AND ciudad <> 'Por configurar'
    `)).rows as Array<{ id: string; ciudad: string }>;

    // Mapa slug → ciudad_id (del catálogo ya sembrado).
    const ciudades = (await db.execute(sql`SELECT id, slug FROM ciudades`)).rows as Array<{ id: string; slug: string }>;
    const slugAId = new Map(ciudades.map((c) => [c.slug, c.id]));

    let mapeados = 0;
    const sinMapear = new Map<string, number>(); // texto de ciudad → cuántos

    for (const u of usuarios) {
        const ciudadId = slugsCandidatos(u.ciudad).map((s) => slugAId.get(s)).find(Boolean);
        if (!ciudadId) {
            sinMapear.set(u.ciudad, (sinMapear.get(u.ciudad) ?? 0) + 1);
            continue;
        }
        await db.execute(sql`UPDATE usuarios SET ciudad_id = ${ciudadId} WHERE id = ${u.id}`);
        mapeados++;
    }

    // Totales y distribución.
    const tot = (await db.execute(sql`
        SELECT count(*)::int AS total,
               count(ciudad_id)::int AS con_ciudad_id,
               (count(*) - count(ciudad_id))::int AS sin_ciudad_id
        FROM usuarios
    `)).rows[0] as { total: number; con_ciudad_id: number; sin_ciudad_id: number };

    const dist = (await db.execute(sql`
        SELECT c.slug, count(*)::int AS n
        FROM usuarios u JOIN ciudades c ON c.id = u.ciudad_id
        GROUP BY c.slug ORDER BY n DESC
    `)).rows;

    const sinMapearTotal = [...sinMapear.values()].reduce((a, b) => a + b, 0);

    console.log('\n───────── RESUMEN mapear-usuario-ciudad-id ─────────');
    console.log(`Ambiente BD:                       ${process.env.DB_ENVIRONMENT || 'local'}`);
    console.log(`Usuarios con ciudad (mapeables):   ${usuarios.length}`);
    console.log(`Mapeados (ciudad_id asignado):     ${mapeados}`);
    console.log(`Sin mapear (slug inexistente):     ${sinMapearTotal}`, sinMapear.size ? Object.fromEntries(sinMapear) : '');
    console.log(`Total usuarios:                    ${tot.total}`);
    console.log(`Con ciudad_id:                     ${tot.con_ciudad_id}`);
    console.log(`Sin ciudad_id (NULL):              ${tot.sin_ciudad_id}`);
    console.log('Distribución por ciudad:', dist);
    console.log('─────────────────────────────────────────\n');

    process.exit(0);
}

main().catch((err) => {
    console.error('Error en mapear-usuario-ciudad-id:', err);
    process.exit(1);
});
