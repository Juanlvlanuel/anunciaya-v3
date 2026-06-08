/**
 * limpiar-datos-prueba.ts
 * =======================
 * Borra los datos de prueba creados en la sesión de validación de cobros:
 *   - Negocio de Prueba (registro real con 4242)  → anunciayapruebas@gmail.com
 *   - Prueba · En gracia / Suspendido / Cancelado  → prueba.{gracia,suspendido,cancelado}@dev.local
 *   - Prueba · Ciclo morosidad                     → prueba.morosidad@dev.local
 *
 * Cancela primero la suscripción en Stripe (si la hay) y luego borra al dueño
 * (ON DELETE CASCADE borra su negocio). CONSERVA el vendedor de prueba JUAN01.
 * Aborta en producción.
 *
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/limpiar-datos-prueba.ts
 *
 * Ubicación: apps/api/scripts/limpiar-datos-prueba.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';

const CORREOS = [
    'anunciayapruebas@gmail.com',
    'prueba.gracia@dev.local',
    'prueba.suspendido@dev.local',
    'prueba.cancelado@dev.local',
    'prueba.morosidad@dev.local',
];

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') {
        console.error('✗ Abortado: DB_ENVIRONMENT=production. Solo DEV.');
        process.exit(1);
    }

    const enLista = sql.join(CORREOS.map((c) => sql`${c}`), sql`, `);
    const filas = (await db.execute(sql`
        SELECT u.id::text AS id, u.correo, u.stripe_subscription_id AS sub, n.nombre AS negocio
        FROM usuarios u
        LEFT JOIN negocios n ON n.usuario_id = u.id
        WHERE u.correo IN (${enLista})
    `)).rows as Array<{ id: string; correo: string; sub: string | null; negocio: string | null }>;

    console.log('\n── A borrar ──');
    console.table(filas);

    if (!filas.length) { console.log('Nada que borrar (ya estaba limpio).'); process.exit(0); }

    // 1) Cancelar suscripciones en Stripe.
    for (const f of filas) {
        if (f.sub) {
            try {
                await stripe.subscriptions.cancel(f.sub);
                console.log(`Stripe: cancelada ${f.sub} (${f.correo}).`);
            } catch (e) {
                console.log(`Stripe: no se pudo cancelar ${f.sub} (${(e as Error).message}).`);
            }
        }
    }

    // 2) Borrar dueños (cascade borra negocios).
    const borr = await db.execute(sql`DELETE FROM usuarios WHERE correo IN (${enLista}) RETURNING correo`);
    console.log(`\nBD: ${borr.rows.length} dueño(s) borrado(s) (sus negocios cayeron en cascada).`);

    // 3) Verificación: la cartera del vendedor JUAN01 debe quedar vacía; el vendedor SIGUE.
    const cartera = (await db.execute(sql`
        SELECT count(*)::int AS total FROM negocios n
        JOIN embajadores e ON e.id = n.embajador_id
        WHERE e.codigo_referido = 'JUAN01'
    `)).rows[0] as { total: number };
    const vendedor = (await db.execute(sql`
        SELECT rol_equipo FROM usuarios WHERE correo = 'vendedor.prueba@dev.local'
    `)).rows[0] as { rol_equipo: string } | undefined;

    console.log(`\nVerificación:`);
    console.log(`  Cartera de JUAN01: ${cartera.total} negocio(s) (debe ser 0).`);
    console.log(`  Vendedor de prueba: ${vendedor ? `conservado (rol_equipo=${vendedor.rol_equipo})` : '⚠️ no encontrado'}.`);
    console.log('\n✅ Limpieza terminada.\n');
    process.exit(0);
}

main().catch((err) => { console.error('Error en limpiar-datos-prueba:', err); process.exit(1); });
