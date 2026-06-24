/**
 * seed-territorios-dev.ts
 * =======================
 * Siembra zonas de prueba en `territorio_zonas` (DEV) para verificar el Gate 1 del módulo
 * Territorios: ver el mapa del Panel pintando zonas REALES. Busca un vendedor activo y su
 * ciudad (de `embajador_ciudades`) y dibuja 2 cuadritos contiguos cerca del centro de esa
 * ciudad: una asignada al vendedor (azul) y otra sin asignar (ámbar).
 *
 * Re-corrible: borra primero las zonas de prueba (por nombre) para no acumular.
 * Correr:  cd apps/api && pnpm exec tsx scripts/seed-territorios-dev.ts
 */
import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';

const NOMBRE_A = 'Zona Poniente (demo)';
const NOMBRE_B = 'Zona Oriente · sin asignar (demo)';

async function main() {
    // Un vendedor activo + una de sus ciudades (con coords).
    const [vend] = (await db.execute(sql`
        SELECT e.id::text AS embajador_id, ec.ciudad_id::text AS ciudad_id,
               c.nombre AS ciudad, c.lat::float AS lat, c.lng::float AS lng
        FROM embajadores e
        JOIN embajador_ciudades ec ON ec.embajador_id = e.id
        JOIN ciudades c ON c.id = ec.ciudad_id
        WHERE e.estado = 'activo' AND c.lat IS NOT NULL AND c.lng IS NOT NULL
        LIMIT 1
    `)).rows as Array<{ embajador_id: string; ciudad_id: string; ciudad: string; lat: number; lng: number }>;

    if (!vend) {
        console.log('⚠️  No hay un vendedor activo con ciudad (con coords) asignada en dev. Crea uno primero.');
        process.exit(0);
    }

    const { lat, lng } = vend;
    const d = 0.02; // ~2 km de lado
    const zonaA = { type: 'Polygon', coordinates: [[[lng - d, lat - d], [lng, lat - d], [lng, lat + d], [lng - d, lat + d], [lng - d, lat - d]]] };
    const zonaB = { type: 'Polygon', coordinates: [[[lng, lat - d], [lng + d, lat - d], [lng + d, lat + d], [lng, lat + d], [lng, lat - d]]] };

    // Re-corrible.
    await db.execute(sql`DELETE FROM territorio_zonas WHERE nombre IN (${NOMBRE_A}, ${NOMBRE_B})`);

    await db.execute(sql`
        INSERT INTO territorio_zonas (ciudad_id, embajador_id, nombre, poligono, color)
        VALUES
            (${vend.ciudad_id}, ${vend.embajador_id}, ${NOMBRE_A}, ${JSON.stringify(zonaA)}::jsonb, '#2563eb'),
            (${vend.ciudad_id}, NULL,                 ${NOMBRE_B}, ${JSON.stringify(zonaB)}::jsonb, '#f59e0b')
    `);

    const [tot] = (await db.execute(sql`SELECT count(*)::int AS n FROM territorio_zonas`)).rows as Array<{ n: number }>;
    console.log(`✅ 2 zonas de prueba sembradas en "${vend.ciudad}" (una asignada al vendedor, otra sin asignar).`);
    console.log(`   Total en territorio_zonas: ${tot.n}. Abre el Panel → Red de ventas → Territorios para verlas.`);
    process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
