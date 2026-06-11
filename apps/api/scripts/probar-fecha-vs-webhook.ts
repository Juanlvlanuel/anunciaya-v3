/**
 * probar-fecha-vs-webhook.ts — HARNESS (Stripe TEST + DEV)
 * =======================================================
 * Verifica el riesgo §1 del checklist de Negocios: en un negocio CON suscripción, ¿el webhook
 * `customer.subscription.updated` (que escribe `current_period_end`) DEGRADA la fecha que
 * "Marcar pagado" fijó a mano?
 *
 * Lógica: `marcarPagado(hasta=X)` empuja `trial_end=X` en Stripe (`empujarCobroSuscripcion`).
 * El webhook (`manejarSuscripcionActualizada`) lee `items[0].current_period_end ?? current_period_end`
 * y lo escribe en `fecha_vencimiento`. Si ese `current_period_end` == X, el webhook reescribe la
 * MISMA fecha → la fecha manual SOBREVIVE (no hay bug). Esto comprueba ese dato real en Stripe.
 *
 * Aborta en producción. Crea una suscripción REAL (test) y la limpia.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-fecha-vs-webhook.ts
 *
 * Ubicación: apps/api/scripts/probar-fecha-vs-webhook.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';
import { marcarPagado } from '../src/services/admin/negocios-acciones.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';

const CORREO = 'prueba.fecha-webhook@dev.local';
const PRICE = process.env.STRIPE_PRICE_COMERCIAL!;
const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`    ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function limpiarUsuario(correo: string) {
  const r = (await db.execute(sql`SELECT id::text, stripe_subscription_id FROM usuarios WHERE correo = ${correo}`))
    .rows as Array<{ id: string; stripe_subscription_id: string | null }>;
  if (r[0]) {
    if (r[0].stripe_subscription_id?.startsWith('sub_')) {
      try { await stripe.subscriptions.cancel(r[0].stripe_subscription_id); } catch { /* ya */ }
    }
    await db.execute(sql`DELETE FROM usuarios WHERE id = ${r[0].id}`);
  }
}

async function crearNegocio(correo: string, subId: string, customerId: string): Promise<string> {
  const emb = (await db.execute(sql`SELECT id::text FROM embajadores WHERE codigo_referido = 'JUAN01' LIMIT 1`)).rows as Array<{ id: string }>;
  const u = (await db.execute(sql`
    INSERT INTO usuarios (nombre, apellidos, correo, perfil, membresia, correo_verificado, correo_verificado_at,
                          estado, modo_activo, tiene_modo_comercial, stripe_customer_id, stripe_subscription_id)
    VALUES ('Prueba', 'FechaWebhook', ${correo}, 'comercial', 1, true, now(), 'activo', 'comercial', true, ${customerId}, ${subId})
    RETURNING id::text
  `)).rows as Array<{ id: string }>;
  const n = (await db.execute(sql`
    INSERT INTO negocios (usuario_id, nombre, embajador_id, estado_membresia, onboarding_completado, es_borrador,
                          fecha_vencimiento, fecha_proximo_cobro)
    VALUES (${u[0].id}, 'FechaWebhook', ${emb[0].id}, 'al_corriente', true, false, now() + interval '30 days', now() + interval '30 days')
    RETURNING id::text
  `)).rows as Array<{ id: string }>;
  await db.execute(sql`UPDATE usuarios SET negocio_id = ${n[0].id} WHERE id = ${u[0].id}`);
  return n[0].id;
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }
  if (!PRICE) { console.error('✗ Falta STRIPE_PRICE_COMERCIAL.'); process.exit(1); }

  console.log('\n════════ ¿El webhook degrada la fecha de "Marcar pagado"? ════════');
  await limpiarUsuario(CORREO);

  const sa = (await db.execute(sql`SELECT id::text FROM usuarios WHERE rol_equipo = 'superadmin' LIMIT 1`)).rows as Array<{ id: string }>;
  const panel = { usuarioId: sa[0]?.id ?? null, rolEquipo: 'superadmin', regionId: null } as unknown as UsuarioPanel;

  // Suscripción REAL activa (tarjeta 4242).
  const customer = await stripe.customers.create({ email: CORREO, name: 'Prueba FechaWebhook' });
  const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id });
  await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
  const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price: PRICE }], default_payment_method: pm.id });
  const negocioId = await crearNegocio(CORREO, sub.id, customer.id);
  console.log(`\nNegocio ${negocioId} · sub ${sub.id} (status=${sub.status})`);

  // Marcar pagado a una fecha LEJANA (X = hoy + 180 días).
  const X = new Date(Date.now() + 180 * 86400000);
  const Xiso = X.toISOString();
  const Xunix = Math.floor(X.getTime() / 1000);
  const r = await marcarPagado(panel, negocioId, { hasta: Xiso, concepto: 'efectivo', monto: 449, meses: 6 });
  console.log('\n[1] marcarPagado a +180 días');
  verificar('marcarPagado ok', r.ok === true, JSON.stringify(r));

  // (a) Lo que marcarPagado escribió en BD.
  const [fila] = (await db.execute(sql`SELECT fecha_vencimiento::text AS v FROM negocios WHERE id = ${negocioId}`)).rows as Array<{ v: string | null }>;
  const vencUnix = fila?.v ? Math.floor(Date.parse(fila.v) / 1000) : 0;
  verificar('BD fecha_vencimiento == X', Math.abs(vencUnix - Xunix) <= 5, `${fila?.v}`);

  // (b) Lo que el WEBHOOK leería de Stripe (mismo acceso que manejarSuscripcionActualizada).
  const s = await stripe.subscriptions.retrieve(sub.id);
  const sAny = s as unknown as { current_period_end?: number; trial_end?: number | null; items?: { data?: Array<{ current_period_end?: number }> } };
  const trialEnd = sAny.trial_end ?? 0;
  const cpe = sAny.items?.data?.[0]?.current_period_end ?? sAny.current_period_end ?? 0;
  console.log('\n[2] En Stripe tras el empuje');
  verificar('status = trialing', s.status === 'trialing', s.status);
  verificar('trial_end == X (lo empujado)', Math.abs(trialEnd - Xunix) <= 5, `${trialEnd} vs ${Xunix}`);

  // (c) La conclusión: current_period_end (lo que el webhook ESCRIBIRÍA) == X → la fecha sobrevive.
  console.log('\n[3] Lo que el webhook escribiría (current_period_end)');
  verificar('current_period_end == X → el webhook NO degrada la fecha', Math.abs(cpe - Xunix) <= 5, `cpe=${cpe} vs X=${Xunix}`);

  await limpiarUsuario(CORREO);
  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'SIN RIESGO ✓ (la fecha manual sobrevive)' : `${fallos} fallo(s) ✗ (revisar)`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => { console.error('Error en probar-fecha-vs-webhook:', err); process.exit(1); });
