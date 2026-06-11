/**
 * probar-editar-pago.ts — HARNESS (DEV) · editar una fila del historial de pagos
 * =============================================================================
 * Valida editarPagoMembresia (corregir concepto/monto/meses de un pago ya registrado):
 *   1) Alta manual (registra un pago transferencia $449 / 6m) → se corrige a efectivo $300 / 3m.
 *   2) Corregir a cortesía → el monto queda en NULL (decisión de producto + CHECK).
 *   3) Pertenencia: un pagoId que NO es del negocio → 404.
 *   4) Alcance: gerente de OTRA región no puede editar → 403.
 *
 * Requiere: seed-vendedor-prueba.ts. NO toca Stripe. Aborta en producción. Limpia sus datos.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-editar-pago.ts
 *
 * Ubicación: apps/api/scripts/probar-editar-pago.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { altaManualNegocio } from '../src/services/admin/altaManualNegocio.service.js';
import { listarPagosNegocio } from '../src/services/admin/negocios.service.js';
import { editarPagoMembresia } from '../src/services/admin/negocios-acciones.service.js';

const VENDEDOR_CORREO = 'vendedor.prueba@dev.local';
const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string) {
  if (!condicion) fallos++;
  console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
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

/** "Vigencia hasta" actual del negocio (fecha_vencimiento). */
async function vigencia(negocioId: string): Promise<string | null> {
  const [n] = (await db.execute(
    sql`SELECT fecha_vencimiento::text AS v FROM negocios WHERE id = ${negocioId} LIMIT 1`,
  )).rows as Array<{ v: string | null }>;
  return n?.v ?? null;
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Editar pago del historial ════════');

  const [vend] = (await db.execute(sql`
    SELECT id::text AS id FROM usuarios WHERE correo = ${VENDEDOR_CORREO}
  `)).rows as Array<{ id: string }>;
  if (!vend) {
    console.error('✗ No existe vendedor.prueba@dev.local. Corre seed-vendedor-prueba.ts. Abortado.');
    process.exit(1);
  }

  const [emb] = (await db.execute(sql`SELECT id::text AS id FROM embajadores WHERE usuario_id = ${vend.id} LIMIT 1`)).rows as Array<{ id: string }>;
  const [reg] = (await db.execute(sql`
    SELECT c.region_id::text AS region_id FROM embajador_ciudades ec JOIN ciudades c ON c.id = ec.ciudad_id
    WHERE ec.embajador_id = ${emb.id} LIMIT 1
  `)).rows as Array<{ region_id: string | null }>;
  const regionVendedor = reg?.region_id ?? null;

  const [ciudad] = (await db.execute(sql`
    SELECT id::text AS id FROM ciudades WHERE activa = true AND region_id = ${regionVendedor}
    ORDER BY importancia DESC LIMIT 1
  `)).rows as Array<{ id: string }>;
  if (!ciudad) {
    console.error('✗ No hay ciudad activa en la región del vendedor. Abortado.');
    process.exit(1);
  }

  const panelVendedor: UsuarioPanel = {
    usuarioId: vend.id,
    rolEquipo: 'vendedor',
    regionId: regionVendedor,
    viaSecret: false,
    panel2faHabilitado: false,
    panel2faOk: true,
  };
  // Las ediciones las hace un superadmin (manda sobre cualquier negocio). usuarioId = actor de la auditoría.
  const panelSuper: UsuarioPanel = {
    usuarioId: vend.id,
    rolEquipo: 'superadmin',
    regionId: null,
    viaSecret: false,
    panel2faHabilitado: false,
    panel2faOk: true,
  };

  const sufijo = Date.now();
  const correo = `editar.pago+${sufijo}@dev.local`;
  await limpiar(correo);

  const alta = await altaManualNegocio(panelVendedor, {
    nombreNegocio: 'Negocio Editar Pago',
    ciudadId: ciudad.id,
    nombre: 'Dueño',
    apellidos: 'EditarPago',
    correo,
    confirmarCorreo: correo,
    telefono: '+521234567890',
    concepto: 'transferencia',
    monto: 449,
    meses: 6,
    embajadorId: null,
  });
  console.log('\n[0] Alta manual (transferencia $449 / 6 meses)');
  verificar('alta ok', alta.ok === true, JSON.stringify(alta));
  if (!alta.ok) { await limpiar(correo); process.exit(1); }

  const pagosIni = await listarPagosNegocio(panelSuper, alta.negocioId);
  const pagoId = pagosIni[0]?.id;
  verificar('hay 1 pago', pagosIni.length === 1 && !!pagoId, String(pagosIni.length));
  if (!pagoId) { await limpiar(correo); process.exit(1); }
  const vencAlta = await vigencia(alta.negocioId); // = hoy + 6 meses (el único pago define la vigencia)

  // [1] Corregir a efectivo $300 / 3 meses → traslada la vigencia (6m → 3m, se acorta).
  const r1 = await editarPagoMembresia(panelSuper, alta.negocioId, pagoId, { concepto: 'efectivo', monto: 300, meses: 3 });
  console.log('\n[1] Corregir → efectivo $300 / 3 meses');
  verificar('edición ok', r1.ok === true, JSON.stringify(r1));
  const p1 = (await listarPagosNegocio(panelSuper, alta.negocioId))[0];
  verificar("concepto = 'efectivo'", p1?.concepto === 'efectivo', p1?.concepto);
  verificar('monto = 300', p1?.monto === '300' || p1?.monto === '300.00', p1?.monto ?? 'null');
  verificar('mesesCubiertos = 3', p1?.mesesCubiertos === 3, String(p1?.mesesCubiertos));
  const vencTras1 = await vigencia(alta.negocioId);
  verificar('vigencia trasladada (cambió)', vencTras1 !== vencAlta, `${vencAlta} → ${vencTras1}`);
  verificar('vigencia se acortó (3m < 6m)', !!vencTras1 && !!vencAlta && new Date(vencTras1) < new Date(vencAlta));

  // [2] Corregir a cortesía → monto NULL. Mismos meses (3) ⇒ NO mueve la vigencia.
  const r2 = await editarPagoMembresia(panelSuper, alta.negocioId, pagoId, { concepto: 'cortesia', meses: 3 });
  console.log('\n[2] Corregir → cortesía (sin monto, mismos meses)');
  verificar('edición ok', r2.ok === true, JSON.stringify(r2));
  const p2 = (await listarPagosNegocio(panelSuper, alta.negocioId))[0];
  verificar("concepto = 'cortesia'", p2?.concepto === 'cortesia', p2?.concepto);
  verificar('monto = NULL', p2?.monto === null, p2?.monto ?? 'null');
  const vencTras2 = await vigencia(alta.negocioId);
  verificar('vigencia NO cambió (meses iguales)', vencTras2 === vencTras1, `${vencTras1} → ${vencTras2}`);

  // [3] Pertenencia: pagoId que no es del negocio → 404.
  const r3 = await editarPagoMembresia(panelSuper, alta.negocioId, '00000000-0000-0000-0000-000000000000', { concepto: 'efectivo', monto: 100, meses: 1 });
  console.log('\n[3] Pago ajeno (uuid inexistente)');
  verificar('rechazado 404', r3.ok === false && r3.status === 404, JSON.stringify(r3));

  // [4] Alcance: gerente de otra región → 403.
  const panelOtraRegion: UsuarioPanel = {
    usuarioId: null,
    rolEquipo: 'gerente',
    regionId: '00000000-0000-0000-0000-000000000000',
    viaSecret: false,
    panel2faHabilitado: false,
    panel2faOk: true,
  };
  const r4 = await editarPagoMembresia(panelOtraRegion, alta.negocioId, pagoId, { concepto: 'efectivo', monto: 100, meses: 1 });
  console.log('\n[4] Gerente de otra región');
  verificar('rechazado 403', r4.ok === false && r4.status === 403, JSON.stringify(r4));

  // [5] Estado inconsistente (vigencia desfasada) → re-guardar corrige aunque los meses no cambien.
  await db.execute(sql`UPDATE negocios SET fecha_vencimiento = '2020-01-01T00:00:00Z' WHERE id = ${alta.negocioId}`);
  const r5 = await editarPagoMembresia(panelSuper, alta.negocioId, pagoId, { concepto: 'efectivo', monto: 449, meses: 3 });
  console.log('\n[5] Re-guardar con meses iguales corrige una vigencia desfasada');
  verificar('edición ok', r5.ok === true, JSON.stringify(r5));
  const vencTras5 = await vigencia(alta.negocioId);
  verificar('vigencia recalculada (ya no 2020)', !!vencTras5 && new Date(vencTras5).getFullYear() !== 2020, vencTras5 ?? 'null');

  await limpiar(correo);

  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-editar-pago:', err);
  process.exit(1);
});
