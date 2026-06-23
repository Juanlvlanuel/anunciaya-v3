/**
 * probar-cancelar-vs-webhook.ts — HARNESS (Stripe TEST + DEV)
 * ==========================================================
 * Verifica la "consistencia Cancelar ↔ webhook": al cancelar un negocio de tarjeta desde el Panel,
 * Stripe dispara `customer.subscription.deleted`. `cancelarNegocio` pone `estado_admin='archivado'`
 * y el webhook (`procesarCancelacionSuscripcion`) pone `es_borrador=true` — campos distintos. ¿El
 * estado final diverge según el timing?
 *
 * Comprueba con datos reales que en CUALQUIER orden el negocio queda coherente (archivado + oculto
 * + cancelado) y nada lo revive:
 *   1) cancelarNegocio (Panel) → archivado · activo=false · cancelado · subId limpio · dueño personal.
 *   2) Webhook TARDÍO (subId ya limpio) → no encuentra al usuario → no toca nada (inofensivo).
 *   3) Webhook en CARRERA (subId aún presente) → añade es_borrador=true PERO no contradice:
 *      sigue archivado · activo=false · cancelado.
 *
 * Aborta en producción. Crea una suscripción REAL (test) y la limpia.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-cancelar-vs-webhook.ts
 *
 * Ubicación: apps/api/scripts/probar-cancelar-vs-webhook.ts
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/index.js';
import { sql } from 'drizzle-orm';
import { stripe } from '../src/config/stripe.js';
import { cancelarNegocio } from '../src/services/admin/negocios-acciones.service.js';
import { procesarCancelacionSuscripcion } from '../src/services/pago.service.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { obtenerConfigTexto } from '../src/services/configuracion.service.js';

const CORREO = 'prueba.cancelar-webhook@dev.local';
// El Price ACTIVO vive en config (precio editable desde el Panel); el del env quedó archivado.
async function obtenerPriceMensual(): Promise<string> {
  return obtenerConfigTexto('stripe_price_comercial_id', process.env.STRIPE_PRICE_COMERCIAL || '');
}
const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`    ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

type EstadoNeg = { estado_admin: string; activo: boolean; es_borrador: boolean; estado_membresia: string; sub: string | null };
async function estado(negocioId: string): Promise<EstadoNeg> {
  return (await db.execute(sql`
    SELECT estado_admin, activo, es_borrador, estado_membresia,
           (SELECT stripe_subscription_id FROM usuarios u WHERE u.id = n.usuario_id) AS sub
    FROM negocios n WHERE n.id = ${negocioId}
  `)).rows[0] as EstadoNeg;
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
    VALUES ('Prueba', 'CancelWebhook', ${correo}, 'comercial', 1, true, now(), 'activo', 'comercial', true, ${customerId}, ${subId})
    RETURNING id::text
  `)).rows as Array<{ id: string }>;
  const n = (await db.execute(sql`
    INSERT INTO negocios (usuario_id, nombre, embajador_id, estado_membresia, onboarding_completado, es_borrador,
                          fecha_vencimiento, fecha_proximo_cobro)
    VALUES (${u[0].id}, 'CancelWebhook', ${emb[0].id}, 'al_corriente', true, false, now() + interval '30 days', now() + interval '30 days')
    RETURNING id::text
  `)).rows as Array<{ id: string }>;
  await db.execute(sql`UPDATE usuarios SET negocio_id = ${n[0].id} WHERE id = ${u[0].id}`);
  return n[0].id;
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }

  console.log('\n════════ Consistencia Cancelar ↔ webhook ════════');
  await limpiarUsuario(CORREO);

  const sa = (await db.execute(sql`SELECT id::text FROM usuarios WHERE rol_equipo = 'superadmin' LIMIT 1`)).rows as Array<{ id: string }>;
  const panel = { usuarioId: sa[0]?.id ?? null, rolEquipo: 'superadmin', regionId: null } as unknown as UsuarioPanel;

  const customer = await stripe.customers.create({ email: CORREO, name: 'Prueba CancelWebhook' });
  const pm = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id });
  await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: pm.id } });
  const price = await obtenerPriceMensual();
  const sub = await stripe.subscriptions.create({ customer: customer.id, items: [{ price }], default_payment_method: pm.id });
  const negocioId = await crearNegocio(CORREO, sub.id, customer.id);
  console.log(`\nNegocio ${negocioId} · sub ${sub.id} (status=${sub.status})`);

  // 1) Cancelar desde el Panel.
  const r = await cancelarNegocio(panel, negocioId, 'Prueba consistencia');
  console.log('\n[1] cancelarNegocio (Panel)');
  verificar('cancelar ok', r.ok === true, JSON.stringify(r));
  const e1 = await estado(negocioId);
  verificar("estado_admin = 'archivado'", e1.estado_admin === 'archivado', e1.estado_admin);
  verificar('activo = false', e1.activo === false, String(e1.activo));
  verificar("estado_membresia = 'cancelado'", e1.estado_membresia === 'cancelado', e1.estado_membresia);
  verificar('subId limpio (null)', e1.sub === null, e1.sub ?? 'null');

  // Mock del evento subscription.deleted DELIBERADO (cancelación del Panel/API).
  const mockSub = { id: sub.id, cancellation_details: { reason: 'cancellation_requested' } } as unknown as Parameters<typeof procesarCancelacionSuscripcion>[0];

  // 2) Webhook TARDÍO: el subId ya se limpió → el handler no encuentra al usuario → no toca nada.
  await procesarCancelacionSuscripcion(mockSub);
  const e2 = await estado(negocioId);
  console.log('\n[2] Webhook tardío (subId ya limpio) — debe ser inofensivo');
  verificar('estado intacto (archivado · activo=false · cancelado)',
    e2.estado_admin === 'archivado' && e2.activo === false && e2.estado_membresia === 'cancelado',
    `admin=${e2.estado_admin} activo=${e2.activo} memb=${e2.estado_membresia} borrador=${e2.es_borrador}`);

  // 3) Webhook en CARRERA: simulamos que llega ANTES de limpiar el subId (lo reponemos).
  await db.execute(sql`UPDATE usuarios SET stripe_subscription_id = ${sub.id} WHERE correo = ${CORREO}`);
  await procesarCancelacionSuscripcion(mockSub);
  const e3 = await estado(negocioId);
  console.log('\n[3] Webhook en carrera (subId presente) — añade es_borrador sin contradecir');
  verificar('es_borrador = true (lo que pone el webhook)', e3.es_borrador === true, String(e3.es_borrador));
  verificar("sigue archivado (no lo revive)", e3.estado_admin === 'archivado', e3.estado_admin);
  verificar('sigue oculto (activo=false)', e3.activo === false, String(e3.activo));
  verificar("sigue cancelado", e3.estado_membresia === 'cancelado', e3.estado_membresia);

  await limpiarUsuario(CORREO);
  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'CONSISTENTE ✓ (estado coherente en cualquier orden)' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => { console.error('Error en probar-cancelar-vs-webhook:', err); process.exit(1); });
