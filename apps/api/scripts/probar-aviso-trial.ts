/**
 * probar-aviso-trial.ts — HARNESS (DEV, sin Stripe)
 * =================================================
 * Verifica el copy ramificado de manejarTrialPorTerminar (Pieza 4 · Opción A):
 *   [efectivo]      → 2 avisos "Tu membresía se renueva pronto" (no "prueba gratis").
 *   [transferencia] → igual que efectivo.
 *   [cortesía]      → SUPRIME el aviso (0 notificaciones; el dueño no paga ese periodo).
 *   [trial de alta] → sin pago manual cubriendo el periodo → 2 avisos "Tu prueba gratis termina pronto".
 *
 * NO toca Stripe: el handler resuelve el negocio por usuarios.stripe_subscription_id en BD,
 * así que basta un subId ficticio + un mock de la suscripción ({ id, trial_end }).
 * Aborta en producción. Crea y limpia sus propios datos.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-aviso-trial.ts
 *
 * Ubicación: apps/api/scripts/probar-aviso-trial.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import type Stripe from 'stripe';
import { manejarTrialPorTerminar } from '../src/services/pago.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');

async function limpiar(correo: string) {
  const r = (await db.execute(sql`SELECT id::text, negocio_id::text FROM usuarios WHERE correo = ${correo}`))
    .rows as Array<{ id: string; negocio_id: string | null }>;
  if (r[0]) {
    if (r[0].negocio_id) await db.execute(sql`DELETE FROM notificaciones WHERE negocio_id = ${r[0].negocio_id}`);
    await db.execute(sql`DELETE FROM notificaciones WHERE usuario_id = ${r[0].id}`);
    await db.execute(sql`DELETE FROM usuarios WHERE id = ${r[0].id}`); // pagos_membresia y negocio caen por FK cascade
  }
}

async function crearNegocio(correo: string, subId: string): Promise<string> {
  const u = (await db.execute(sql`
    INSERT INTO usuarios (nombre, apellidos, correo, perfil, membresia, correo_verificado, correo_verificado_at,
                          estado, modo_activo, tiene_modo_comercial, stripe_subscription_id)
    VALUES ('Prueba', 'Trial', ${correo}, 'comercial', 1, true, now(), 'activo', 'comercial', true, ${subId})
    RETURNING id::text
  `)).rows as Array<{ id: string }>;
  const n = (await db.execute(sql`
    INSERT INTO negocios (usuario_id, nombre, estado_membresia, metodo_cobro, onboarding_completado, es_borrador,
                          fecha_vencimiento, fecha_proximo_cobro)
    VALUES (${u[0].id}, 'Trial', 'al_corriente', 'tarjeta', true, false, now() + interval '6 months', now() + interval '6 months')
    RETURNING id::text
  `)).rows as Array<{ id: string }>;
  await db.execute(sql`UPDATE usuarios SET negocio_id = ${n[0].id} WHERE id = ${u[0].id}`);
  return n[0].id;
}

async function notifs(negocioId: string) {
  return (await db.execute(sql`
    SELECT titulo, modo FROM notificaciones WHERE negocio_id = ${negocioId} AND tipo = 'sistema' ORDER BY modo
  `)).rows as Array<{ titulo: string; modo: string }>;
}

function mockSub(subId: string, trialEndUnix: number): Stripe.Subscription {
  return { id: subId, trial_end: trialEndUnix } as unknown as Stripe.Subscription;
}

async function caso(nombre: string, correo: string, concepto: string | null, esperadoCantidad: number, esperadoTitulo: string | null): Promise<boolean> {
  await limpiar(correo);
  const subId = `sub_test_trial_${concepto ?? 'alta'}`;
  const negocioId = await crearNegocio(correo, subId);

  const hasta = new Date();
  hasta.setMonth(hasta.getMonth() + 6);
  hasta.setHours(23, 59, 59, 0);
  const trialEndUnix = Math.floor(hasta.getTime() / 1000);

  // concepto null = trial de ALTA (no hay pago manual cubriendo este periodo).
  if (concepto) {
    await db.execute(sql`
      INSERT INTO pagos_membresia (negocio_id, concepto, monto, periodo_hasta)
      VALUES (${negocioId}, ${concepto}, ${concepto === 'cortesia' ? null : '449'}, ${hasta.toISOString()})
    `);
  }

  await manejarTrialPorTerminar(mockSub(subId, trialEndUnix));

  const ns = await notifs(negocioId);
  const cantOk = ns.length === esperadoCantidad;
  const tituloOk = esperadoTitulo === null ? true : ns.length > 0 && ns.every((x) => x.titulo === esperadoTitulo);
  const pass = cantOk && tituloOk;
  console.log(`\n[${nombre}]  ${ok(pass)}`);
  console.log(`    notificaciones=${ns.length} (esperado ${esperadoCantidad})${ns[0] ? `  título="${ns[0].titulo}"` : ''}`);
  await limpiar(correo);
  return pass;
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }

  console.log('\n════════ Verificación · aviso trial_will_end (Pieza 4) ════════');
  let fallos = 0;
  if (!(await caso('efectivo → avisa cobro', 'prueba.trial.efectivo@dev.local', 'efectivo', 2, 'Tu membresía se renueva pronto'))) fallos++;
  if (!(await caso('transferencia → avisa cobro', 'prueba.trial.transf@dev.local', 'transferencia', 2, 'Tu membresía se renueva pronto'))) fallos++;
  if (!(await caso('cortesía → SUPRIME', 'prueba.trial.cortesia@dev.local', 'cortesia', 0, null))) fallos++;
  if (!(await caso('trial de alta → prueba gratis', 'prueba.trial.alta@dev.local', null, 2, 'Tu prueba gratis termina pronto'))) fallos++;

  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => { console.error('Error en probar-aviso-trial:', err); process.exit(1); });
