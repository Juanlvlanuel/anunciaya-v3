/**
 * seed-vendedor-prueba.ts
 * =======================
 * Habilita al usuario `vendedor.prueba@dev.local` como VENDEDOR del Panel en DEV.
 *
 * La cuenta ya existe y ya tiene su fila en `embajadores` (codigo JUAN01) + cobertura
 * en `embajador_ciudades` (Puerto Peñasco + Sonoyta → Sonora-Norte). Lo único que
 * faltaba es la capa de Panel: `rol_equipo='vendedor'`. De paso resetea la contraseña
 * a una conocida para poder hacer login (mismo patrón que seed-gerentes-dev.ts).
 *
 * El rol de equipo es una capa ENCIMA del perfil: la cuenta sigue perfil='personal' y
 * tiene_modo_comercial=false; lo que la habilita en el Panel es `rol_equipo='vendedor'`.
 * La región del vendedor se DEDUCE de `embajador_ciudades` (no de region_id).
 *
 * Idempotente: re-ejecutable (re-hashea la contraseña y reasigna el rol).
 *
 * EJECUTAR (DEV):  cd apps/api && pnpm exec tsx scripts/seed-vendedor-prueba.ts
 *
 * Reversible:  UPDATE usuarios SET rol_equipo = NULL WHERE correo = 'vendedor.prueba@dev.local';
 *
 * Ubicación: apps/api/scripts/seed-vendedor-prueba.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const USUARIO_ID = 'febba5d9-ce4a-4355-afa1-b5021c49c721';
const PASSWORD = 'Vendedor1234*';

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') {
        console.error('✗ Abortado: DB_ENVIRONMENT=production. Este seed es solo para DEV.');
        process.exit(1);
    }

    // Verificar que el usuario existe antes de tocar nada.
    const previo = (await db.execute(sql`
        SELECT correo, rol_equipo FROM usuarios WHERE id = ${USUARIO_ID}
    `)).rows as Array<{ correo: string; rol_equipo: string | null }>;
    if (!previo[0]) {
        console.error(`✗ Usuario ${USUARIO_ID} no encontrado.`);
        process.exit(1);
    }

    const hash = await bcrypt.hash(PASSWORD, 12);

    const res = await db.execute(sql`
        UPDATE usuarios
        SET rol_equipo        = 'vendedor',
            contrasena_hash   = ${hash},
            correo_verificado = true,
            estado            = 'activo',
            updated_at        = now()
        WHERE id = ${USUARIO_ID}
        RETURNING correo, rol_equipo, estado, perfil, tiene_modo_comercial
    `);

    // Verificación: el hash recién escrito valida contra la contraseña conocida.
    const okHash = await bcrypt.compare(PASSWORD, hash);

    // Re-leer la cobertura (región deducida) para el resumen.
    const cobertura = (await db.execute(sql`
        SELECT c.slug AS ciudad, r.nombre AS region
        FROM embajador_ciudades ec
        JOIN embajadores e ON e.id = ec.embajador_id
        JOIN ciudades c ON c.id = ec.ciudad_id
        LEFT JOIN regiones r ON r.id = c.region_id
        WHERE e.usuario_id = ${USUARIO_ID}
        ORDER BY c.slug
    `)).rows as Array<{ ciudad: string; region: string | null }>;

    console.log('\n───────── RESUMEN seed-vendedor-prueba ─────────');
    console.log(`Ambiente BD:    ${process.env.DB_ENVIRONMENT || 'local'}`);
    console.log(`Rol previo:     ${previo[0].rol_equipo ?? 'null'}  →  vendedor`);
    console.table(res.rows);
    console.log(`Contraseña:     ${PASSWORD}  (hash válido: ${okHash ? 'sí' : 'NO ⚠️'})`);
    console.log(`Región (deducida de cobertura): ${cobertura[0]?.region ?? '—'}`);
    console.log(`Ciudades cubiertas: [${cobertura.map((c) => c.ciudad).join(', ')}]`);
    console.log('─────────────────────────────────────────────\n');

    process.exit(0);
}

main().catch((err) => {
    console.error('Error en seed-vendedor-prueba:', err);
    process.exit(1);
});
