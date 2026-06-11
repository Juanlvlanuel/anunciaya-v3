/**
 * probar-pagos-limite.ts — HARNESS (DEV) · paginación del historial de pagos
 * =========================================================================
 * Valida el parámetro `limite` de listarPagosNegocio (el "ver todos" de la ficha):
 *   1) Alta manual (1 pago) + 2 "Registrar pago" → 3 pagos en total.
 *   2) Sin límite → 3 filas.
 *   3) limite=2 → 2 filas, y son las MÁS RECIENTES (mismas que las 2 primeras sin límite).
 *
 * Requiere: seed-vendedor-prueba.ts. NO toca Stripe (negocio manual). Aborta en producción. Limpia.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-pagos-limite.ts
 *
 * Ubicación: apps/api/scripts/probar-pagos-limite.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { altaManualNegocio } from '../src/services/admin/altaManualNegocio.service.js';
import { listarPagosNegocio } from '../src/services/admin/negocios.service.js';
import { marcarPagado } from '../src/services/admin/negocios-acciones.service.js';

const VENDEDOR_CORREO = 'vendedor.prueba@dev.local';
const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`    ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function limpiar(correo: string) {
  const filas = (await db.execute(
    sql`SELECT negocio_id::text AS negocio_id FROM usuarios WHERE correo = ${correo}`,
  )).rows as Array<{ negocio_id: string | null }>;
  for (const f of filas) {
    if (f.negocio_id) await db.execute(sql`DELETE FROM admin_auditoria WHERE entidad_id = ${f.negocio_id}`);
  }
  await db.execute(sql`DELETE FROM usuarios WHERE correo = ${correo}`); // cascade: negocio + sucursal + pagos
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Paginación del historial de pagos ════════');

  const [vend] = (await db.execute(sql`SELECT id::text AS id FROM usuarios WHERE correo = ${VENDEDOR_CORREO}`)).rows as Array<{ id: string }>;
  if (!vend) { console.error('✗ No existe vendedor.prueba@dev.local. Corre seed-vendedor-prueba.ts.'); process.exit(1); }

  const [emb] = (await db.execute(sql`SELECT id::text AS id FROM embajadores WHERE usuario_id = ${vend.id} LIMIT 1`)).rows as Array<{ id: string }>;
  const [reg] = (await db.execute(sql`
    SELECT c.region_id::text AS region_id FROM embajador_ciudades ec JOIN ciudades c ON c.id = ec.ciudad_id
    WHERE ec.embajador_id = ${emb.id} LIMIT 1
  `)).rows as Array<{ region_id: string | null }>;
  const regionVendedor = reg?.region_id ?? null;
  const [ciudad] = (await db.execute(sql`
    SELECT id::text AS id FROM ciudades WHERE activa = true AND region_id = ${regionVendedor} ORDER BY importancia DESC LIMIT 1
  `)).rows as Array<{ id: string }>;
  if (!ciudad) { console.error('✗ No hay ciudad activa en la región del vendedor.'); process.exit(1); }

  const panelVendedor: UsuarioPanel = { usuarioId: vend.id, rolEquipo: 'vendedor', regionId: regionVendedor, viaSecret: false, panel2faHabilitado: false, panel2faOk: true };
  const panelSuper: UsuarioPanel = { usuarioId: vend.id, rolEquipo: 'superadmin', regionId: null, viaSecret: false, panel2faHabilitado: false, panel2faOk: true };

  const correo = `pagos.limite+${Date.now()}@dev.local`;
  await limpiar(correo);

  const alta = await altaManualNegocio(panelVendedor, {
    nombreNegocio: 'Negocio Límite', ciudadId: ciudad.id, nombre: 'Dueño', apellidos: 'Límite',
    correo, confirmarCorreo: correo, telefono: '+521234567890', concepto: 'efectivo', monto: 449, meses: 1, embajadorId: null,
  });
  console.log('\n[0] Alta manual + 2 pagos más');
  verificar('alta ok', alta.ok === true, JSON.stringify(alta));
  if (!alta.ok) { await limpiar(correo); process.exit(1); }

  // 2 "Registrar pago" más (negocio manual, sin Stripe) → 3 pagos en total.
  for (let i = 1; i <= 2; i++) {
    const hasta = new Date(Date.now() + (i + 1) * 30 * 86400000).toISOString();
    const r = await marcarPagado(panelSuper, alta.negocioId, { hasta, concepto: 'transferencia', monto: 449, meses: 1 });
    verificar(`registrar pago #${i + 1} ok`, r.ok === true, r.ok ? '' : JSON.stringify(r));
  }

  const todos = await listarPagosNegocio(panelSuper, alta.negocioId);
  verificar('sin límite → 3 filas', todos.length === 3, String(todos.length));

  const limitados = await listarPagosNegocio(panelSuper, alta.negocioId, 2);
  verificar('límite 2 → 2 filas', limitados.length === 2, String(limitados.length));
  verificar(
    'las 2 son las más recientes',
    limitados.length === 2 && limitados[0].id === todos[0].id && limitados[1].id === todos[1].id,
  );

  await limpiar(correo);

  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => { console.error('Error en probar-pagos-limite:', err); process.exit(1); });
