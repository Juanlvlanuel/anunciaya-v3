/**
 * probar-vendedor-registra-pago.ts — HARNESS (DEV)
 * ================================================
 * Verifica los permisos del VENDEDOR sobre "Registrar pago" (marcarPagado):
 *   1) Registra un pago en EFECTIVO sobre SU negocio MANUAL → OK.
 *   2) Cortesía → 403 (regalar membresía es de gerente/superadmin).
 *   3) Negocio que NO es de su cartera → 403 (alcance).
 *   4) Negocio con TARJETA (tiene suscripción) → 403 (esos los cobra Stripe).
 *
 * No toca Stripe (el subId del caso 4 es falso; el guard del vendedor corta ANTES de llamar a
 * Stripe). Requiere seed-vendedor-prueba.ts. Aborta en producción. Limpia sus datos.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-vendedor-registra-pago.ts
 *
 * Ubicación: apps/api/scripts/probar-vendedor-registra-pago.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { altaManualNegocio } from '../src/services/admin/altaManualNegocio.service.js';
import { marcarPagado } from '../src/services/admin/negocios-acciones.service.js';

const VENDEDOR_CORREO = 'vendedor.prueba@dev.local';
const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`    ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function limpiar(correo: string) {
  const filas = (await db.execute(sql`SELECT negocio_id::text AS negocio_id FROM usuarios WHERE correo = ${correo}`)).rows as Array<{ negocio_id: string | null }>;
  for (const f of filas) {
    if (f.negocio_id) await db.execute(sql`DELETE FROM admin_auditoria WHERE entidad_id = ${f.negocio_id}`);
  }
  await db.execute(sql`DELETE FROM usuarios WHERE correo = ${correo}`);
}

const futuro = (dias: number) => new Date(Date.now() + dias * 86400000).toISOString();

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }

  console.log('\n════════ Permisos del vendedor en "Registrar pago" ════════');

  const [vend] = (await db.execute(sql`SELECT id::text AS id FROM usuarios WHERE correo = ${VENDEDOR_CORREO}`)).rows as Array<{ id: string }>;
  if (!vend) { console.error('✗ No existe vendedor.prueba@dev.local. Corre seed-vendedor-prueba.ts.'); process.exit(1); }
  const [emb] = (await db.execute(sql`SELECT id::text AS id FROM embajadores WHERE usuario_id = ${vend.id} LIMIT 1`)).rows as Array<{ id: string }>;
  const [reg] = (await db.execute(sql`
    SELECT c.region_id::text AS region_id FROM embajador_ciudades ec JOIN ciudades c ON c.id = ec.ciudad_id WHERE ec.embajador_id = ${emb.id} LIMIT 1
  `)).rows as Array<{ region_id: string | null }>;
  const [ciudad] = (await db.execute(sql`SELECT id::text AS id FROM ciudades WHERE activa = true AND region_id = ${reg?.region_id ?? null} ORDER BY importancia DESC LIMIT 1`)).rows as Array<{ id: string }>;
  if (!ciudad) { console.error('✗ No hay ciudad activa en la región del vendedor.'); process.exit(1); }

  const panelVendedor: UsuarioPanel = { usuarioId: vend.id, rolEquipo: 'vendedor', regionId: reg?.region_id ?? null, viaSecret: false, panel2faHabilitado: false, panel2faOk: true };
  const panelSuper: UsuarioPanel = { usuarioId: vend.id, rolEquipo: 'superadmin', regionId: null, viaSecret: false, panel2faHabilitado: false, panel2faOk: true };

  const datosAlta = (correo: string, embajadorId: string | null) => ({
    nombreNegocio: 'Negocio Vendedor', ciudadId: ciudad.id, nombre: 'Dueño', apellidos: 'Vend',
    correo, confirmarCorreo: correo, telefono: '+521234567890', concepto: 'efectivo' as const, monto: 449, meses: 1, embajadorId,
  });

  const correoMio = `vend.mio+${Date.now()}@dev.local`;
  const correoAjeno = `vend.ajeno+${Date.now()}@dev.local`;
  await limpiar(correoMio); await limpiar(correoAjeno);

  // Negocio MÍO (alta por el vendedor → auto-atribuido a él) y AJENO (alta por super, sin vendedor).
  const altaMio = await altaManualNegocio(panelVendedor, datosAlta(correoMio, null));
  const altaAjeno = await altaManualNegocio(panelSuper, datosAlta(correoAjeno, null));
  console.log('\n[0] Setup');
  verificar('alta mía ok', altaMio.ok === true, JSON.stringify(altaMio));
  verificar('alta ajena ok', altaAjeno.ok === true, JSON.stringify(altaAjeno));
  if (!altaMio.ok || !altaAjeno.ok) { await limpiar(correoMio); await limpiar(correoAjeno); process.exit(1); }

  // [1] Vendedor registra pago EFECTIVO en SU negocio manual → OK.
  const r1 = await marcarPagado(panelVendedor, altaMio.negocioId, { hasta: futuro(60), concepto: 'efectivo', monto: 449, meses: 2 });
  console.log('\n[1] Pago efectivo en su negocio manual');
  verificar('OK', r1.ok === true, JSON.stringify(r1));

  // [2] Cortesía → 403.
  const r2 = await marcarPagado(panelVendedor, altaMio.negocioId, { hasta: futuro(60), concepto: 'cortesia' });
  console.log('\n[2] Cortesía');
  verificar('rechazado 403', r2.ok === false && r2.status === 403, JSON.stringify(r2));

  // [3] Negocio ajeno (no es su cartera) → 403.
  const r3 = await marcarPagado(panelVendedor, altaAjeno.negocioId, { hasta: futuro(60), concepto: 'efectivo', monto: 449, meses: 1 });
  console.log('\n[3] Negocio ajeno (otra cartera)');
  verificar('rechazado 403', r3.ok === false && r3.status === 403, JSON.stringify(r3));

  // [4] Negocio con TARJETA (subId falso) → 403, sin tocar Stripe (el guard corta antes).
  await db.execute(sql`UPDATE usuarios SET stripe_subscription_id = 'sub_fake_tarjeta' WHERE correo = ${correoMio}`);
  const r4 = await marcarPagado(panelVendedor, altaMio.negocioId, { hasta: futuro(60), concepto: 'efectivo', monto: 449, meses: 1 });
  console.log('\n[4] Negocio con tarjeta (suscripción)');
  verificar('rechazado 403', r4.ok === false && r4.status === 403, JSON.stringify(r4));

  await limpiar(correoMio); await limpiar(correoAjeno);
  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => { console.error('Error en probar-vendedor-registra-pago:', err); process.exit(1); });
