/**
 * seed-gerentes-dev.ts
 * ====================
 * Siembra 2 cuentas de GERENTE REGIONAL de prueba (con login) para validar en el
 * Panel el contraste de permisos del Paso 8a (visibilidad vs mando):
 *   · gerente.norte@test.com  → rol_equipo='gerente', region_id = Sonora-Norte
 *   · gerente.centro@test.com → rol_equipo='gerente', region_id = Sonora-Centro
 *
 * El rol de equipo es una capa ENCIMA del perfil: la cuenta va con perfil='personal'
 * y tiene_modo_comercial=false (no es comercial); lo que la habilita en el Panel es
 * `rol_equipo='gerente'` + `region_id`. El alcance del gerente sale de usuarios.region_id.
 *
 * Idempotente: ON CONFLICT (correo) DO UPDATE (re-ejecutable, re-hashea y reasigna).
 * Contraseña común: 'Gerente1234*' (bcrypt). 2FA del Panel apagado (solo el superadmin lo usa).
 *
 * EJECUTAR (DEV si DB_ENVIRONMENT=local):
 *   cd apps/api && pnpm exec tsx scripts/seed-gerentes-dev.ts
 *   (si ya estás en apps/api: pnpm exec tsx scripts/seed-gerentes-dev.ts)
 *
 * Reversible: DELETE FROM usuarios WHERE correo IN ('gerente.norte@test.com','gerente.centro@test.com');
 *
 * Ubicación: apps/api/scripts/seed-gerentes-dev.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const PASSWORD = 'Gerente1234*';

const GERENTES = [
    { correo: 'gerente.norte@test.com',  nombre: 'Gerente', apellidos: 'Norte',  region: 'Sonora-Norte' },
    { correo: 'gerente.centro@test.com', nombre: 'Gerente', apellidos: 'Centro', region: 'Sonora-Centro' },
];

async function main() {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const resumen: Array<{ correo: string; region: string; regionId: string }> = [];

    for (const g of GERENTES) {
        const reg = (await db.execute(sql`SELECT id::text AS id FROM regiones WHERE nombre = ${g.region} LIMIT 1`))
            .rows as Array<{ id: string }>;
        if (!reg[0]) {
            console.error(`✗ Región no encontrada: ${g.region}. ¿Corriste el Paso 5?`);
            process.exit(1);
        }
        const regionId = reg[0].id;

        await db.execute(sql`
            INSERT INTO usuarios
                (nombre, apellidos, correo, contrasena_hash, perfil, membresia,
                 correo_verificado, correo_verificado_at, estado, modo_activo,
                 tiene_modo_comercial, rol_equipo, region_id)
            VALUES
                (${g.nombre}, ${g.apellidos}, ${g.correo}, ${hash}, 'personal', 1,
                 true, now(), 'activo', 'personal',
                 false, 'gerente', ${regionId})
            ON CONFLICT (correo) DO UPDATE SET
                contrasena_hash   = EXCLUDED.contrasena_hash,
                correo_verificado = true,
                estado            = 'activo',
                rol_equipo        = 'gerente',
                region_id         = EXCLUDED.region_id,
                updated_at        = now()
        `);

        resumen.push({ correo: g.correo, region: g.region, regionId });
    }

    console.log('\n───────── RESUMEN seed-gerentes-dev ─────────');
    console.log(`Ambiente BD:      ${process.env.DB_ENVIRONMENT || 'local'}`);
    console.log(`Contraseña común: ${PASSWORD}`);
    for (const r of resumen) {
        console.log(`  • ${r.correo}  →  gerente / ${r.region}`);
    }
    console.log('─────────────────────────────────────────────\n');

    process.exit(0);
}

main().catch((err) => {
    console.error('Error en seed-gerentes-dev:', err);
    process.exit(1);
});
