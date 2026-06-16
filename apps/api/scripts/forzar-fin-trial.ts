/**
 * forzar-fin-trial.ts — HARNESS (Stripe TEST + DEV)
 * =================================================
 * Fuerza el FIN DEL TRIAL de un negocio con tarjeta (stripe.subscriptions.update trial_end:'now')
 * para detonar el PRIMER COBRO REAL y validar que aparece como `cobro_exitoso` ($449) en la
 * bitácora financiera (módulo Suscripciones).
 *
 * Con la tarjeta BUENA del alta → Stripe cobra → invoice.payment_succeeded → webhook
 * (manejarRenovacionPagada) → fila `cobro_exitoso` en eventos_pago + negocio al_corriente con
 * fechas avanzadas y "Cliente desde" (fecha_primer_pago) sellada.
 *
 * Requiere `stripe listen --forward-to localhost:4000/api/pagos/webhook` + backend :4000.
 * Aborta en producción. NO borra nada (opera sobre un negocio REAL — solo termina su trial).
 *
 * USO:  cd apps/api && pnpm exec tsx scripts/forzar-fin-trial.ts <correo-del-dueño>
 *   ej: pnpm exec tsx scripts/forzar-fin-trial.ts multivideosjj@gmail.com
 *
 * Ubicación: apps/api/scripts/forzar-fin-trial.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function contarCobrosExitosos(negocioId: string): Promise<number> {
    return ((await db.execute(sql`
        SELECT count(*)::int AS n FROM eventos_pago
        WHERE negocio_id = ${negocioId} AND tipo = 'cobro_exitoso'
    `)).rows[0] as { n: number }).n;
}

async function main() {
    if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }

    const correo = process.argv[2];
    if (!correo) {
        console.error('✗ Falta el correo. Uso: pnpm exec tsx scripts/forzar-fin-trial.ts <correo-del-dueño>');
        process.exit(1);
    }

    // 1) Negocio + suscripción por correo del dueño.
    const filas = (await db.execute(sql`
        SELECT n.id::text AS negocio_id, n.nombre AS negocio, n.estado_membresia,
               n.fecha_proximo_cobro::text AS proximo, u.stripe_subscription_id AS sub
        FROM negocios n JOIN usuarios u ON u.id = n.usuario_id
        WHERE u.correo = ${correo}
    `)).rows as Array<{ negocio_id: string; negocio: string; estado_membresia: string; proximo: string | null; sub: string | null }>;

    if (!filas[0]) { console.error(`✗ No hay negocio para el correo ${correo}.`); process.exit(1); }
    const neg = filas[0];
    if (!neg.sub) { console.error(`✗ "${neg.negocio}" no tiene suscripción de Stripe (¿es un negocio manual?).`); process.exit(1); }

    // 2) La suscripción debe estar EN TRIAL (si no, no hay trial que forzar).
    const sub = await stripe.subscriptions.retrieve(neg.sub);
    console.log(`\nNegocio: ${neg.negocio}  ·  estado=${neg.estado_membresia}  ·  próximo cobro=${neg.proximo ?? '—'}`);
    console.log(`Stripe: ${neg.sub} (status=${sub.status})`);
    if (sub.status !== 'trialing') {
        console.error(`\n✗ La suscripción no está en trial (status=${sub.status}); no hay trial que forzar.`);
        process.exit(1);
    }

    // 3) Cobros exitosos ANTES (para detectar el nuevo que detone el cobro).
    const antes = await contarCobrosExitosos(neg.negocio_id);

    // 4) Forzar el fin del trial → Stripe cobra ya.
    console.log('\nForzando fin del trial → Stripe cobra $449 con la tarjeta del alta…');
    await stripe.subscriptions.update(neg.sub, { trial_end: 'now' });

    // 5) Esperar a que el webhook registre el cobro_exitoso (timeout 40s).
    let nuevo: { monto: string | null; fecha: string } | null = null;
    const inicio = Date.now();
    while (Date.now() - inicio < 40000) {
        if (await contarCobrosExitosos(neg.negocio_id) > antes) {
            nuevo = ((await db.execute(sql`
                SELECT monto::text AS monto, fecha_evento::text AS fecha FROM eventos_pago
                WHERE negocio_id = ${neg.negocio_id} AND tipo = 'cobro_exitoso'
                ORDER BY fecha_evento DESC LIMIT 1
            `)).rows[0]) as { monto: string | null; fecha: string };
            break;
        }
        await dormir(2500);
    }

    if (!nuevo) {
        console.error('\n✗ No apareció el cobro_exitoso en 40s. ¿`stripe listen` + backend :4000 corriendo? (con una tarjeta que rebota saldría como cobro_fallido, no exitoso).');
        process.exit(1);
    }

    // 6) Reporte final: el evento + el estado del negocio tras el cobro.
    const desp = (await db.execute(sql`
        SELECT estado_membresia, fecha_primer_pago::text AS primer_pago,
               fecha_vencimiento::text AS vence, fecha_proximo_cobro::text AS proximo
        FROM negocios WHERE id = ${neg.negocio_id}
    `)).rows[0];
    console.log('\n✅ Cobro exitoso registrado en la bitácora:');
    console.table([{ tipo: 'cobro_exitoso', monto: nuevo.monto, fecha: nuevo.fecha }]);
    console.log('Estado del negocio tras el cobro:');
    console.table([desp]);
    console.log('\n👉 Abre Suscripciones en el Panel: verás "Cobro exitoso" $449 (verde, suma a Ingresos).');

    process.exit(0);
}

main().catch((e) => { console.error('Error en forzar-fin-trial:', e); process.exit(1); });
