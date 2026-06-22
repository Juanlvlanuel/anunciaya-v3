/**
 * probar-publicidad-checkout.ts — HARNESS (DEV) · wizard self-service (Fase 2)
 * ============================================================================
 * Valida lo que NO depende de Stripe: los rechazos de crearCheckoutPublicidad (antes de abrir el
 * checkout) y la ACTIVACIÓN del webhook (activarPublicidadPagada con un session simulado): el anuncio
 * pendiente pasa a 'activa', se le sella folio + PaymentIntent, y es idempotente.
 *
 * AISLADO: crea su anuncio pendiente y lo BORRA al final. Aborta en producción.
 * EJECUTAR:  pnpm --filter @anunciaya/api exec tsx scripts/probar-publicidad-checkout.ts
 *
 * Ubicación: apps/api/scripts/probar-publicidad-checkout.ts
 */

import { config } from 'dotenv';
config();

import type Stripe from 'stripe';
import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { crearCheckoutPublicidad, activarPublicidadPagada } from '../src/services/publicidad-checkout.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`  ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

const IMG = { anuncios: 'https://x/a.png' };

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Wizard self-service de Publicidad ════════');

  const [u] = (await db.execute(sql`SELECT id::text AS id FROM usuarios LIMIT 1`)).rows as Array<{ id: string }>;
  const [c] = (await db.execute(sql`SELECT id::text AS id FROM ciudades WHERE activa = true LIMIT 1`)).rows as Array<{ id: string }>;
  if (!u || !c) { console.error('✗ Falta usuario o ciudad.'); process.exit(1); }

  // ── Rechazos (no tocan Stripe) ─────────────────────────────────────────────
  const r1 = await crearCheckoutPublicidad(u.id, { carruseles: [], imagenes: {}, ciudadIds: [c.id] });
  verificar('sin carruseles → 400', !r1.ok && r1.status === 400);

  const r2 = await crearCheckoutPublicidad(u.id, { carruseles: ['anuncios'], imagenes: {}, ciudadIds: [c.id] });
  verificar('sin imagen → 400', !r2.ok && r2.status === 400);

  const r3 = await crearCheckoutPublicidad(u.id, { carruseles: ['anuncios'], imagenes: IMG, ciudadIds: [] });
  verificar('sin ciudades → 400', !r3.ok && r3.status === 400);

  const muchas = Array.from({ length: 11 }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`);
  const r4 = await crearCheckoutPublicidad(u.id, { carruseles: ['anuncios'], imagenes: IMG, ciudadIds: muchas });
  verificar('excede límite de ciudades → 400', !r4.ok && r4.status === 400);

  const r5 = await crearCheckoutPublicidad(u.id, { carruseles: ['anuncios'], imagenes: IMG, ciudadIds: ['00000000-0000-0000-0000-000000000099'] });
  verificar('ciudad inexistente → 400', !r5.ok && r5.status === 400);

  // ── Activación del webhook (con session simulado) ──────────────────────────
  const [pend] = (await db.execute(sql`
    INSERT INTO publicidad_compras (usuario_id, es_combo, estado, origen, metodo_cobro, monto, duracion_dias, inicia_at, expira_at)
    VALUES (${u.id}, false, 'pendiente', 'self', 'tarjeta', 300, 30, now(), now() + interval '30 days')
    RETURNING id::text AS id`)).rows as Array<{ id: string }>;
  await db.execute(sql`INSERT INTO publicidad_piezas (compra_id, carrusel, imagen_url) VALUES (${pend.id}, 'anuncios', ${IMG.anuncios})`);
  await db.execute(sql`INSERT INTO publicidad_compra_ciudades (compra_id, ciudad_id) VALUES (${pend.id}, ${c.id})`);

  const session = { id: 'cs_test_xyz', metadata: { compraId: pend.id, tipo: 'compra_publicidad' }, payment_intent: 'pi_test_123' } as unknown as Stripe.Checkout.Session;

  try {
    await activarPublicidadPagada(session);
    const [a1] = (await db.execute(sql`SELECT estado, folio, stripe_payment_intent_id AS pi FROM publicidad_compras WHERE id = ${pend.id}::uuid`)).rows as Array<{ estado: string; folio: number | null; pi: string | null }>;
    verificar('activa el anuncio pendiente', a1.estado === 'activa', a1.estado);
    verificar('sella folio', a1.folio != null, `${a1.folio}`);
    verificar('sella PaymentIntent', a1.pi === 'pi_test_123', a1.pi ?? '—');

    // Idempotencia: una 2ª entrega no cambia el folio.
    const folioPrev = a1.folio;
    await activarPublicidadPagada(session);
    const [a2] = (await db.execute(sql`SELECT folio FROM publicidad_compras WHERE id = ${pend.id}::uuid`)).rows as Array<{ folio: number | null }>;
    verificar('idempotente (folio no cambia)', a2.folio === folioPrev, `${a2.folio}`);
  } finally {
    await db.execute(sql`DELETE FROM publicidad_compras WHERE id = ${pend.id}::uuid`);
  }

  console.log(`\nResultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-publicidad-checkout:', err);
  process.exit(1);
});
