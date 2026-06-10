/**
 * probar-alta-manual-vendedor.ts — HARNESS (DEV) · alta manual hecha por un VENDEDOR
 * =================================================================================
 * Valida el escenario PRINCIPAL en campo: un vendedor da de alta a su prospecto y se
 * AUTO-ATRIBUYE el negocio. Con datos reales (vendedor.prueba@dev.local · JUAN01 · Sonora-Norte):
 *   A) Alta en una ciudad DE SU REGIÓN → ok, y el embajadorId se deduce de SU cuenta y se
 *      escribe en negocios.embajador_id Y usuarios.referido_por.
 *   B) Alta en una ciudad de OTRA región → 403 (el candado regional también aplica al vendedor).
 *
 * Requiere haber corrido antes: seed-vendedor-prueba.ts (rol_equipo='vendedor').
 * NO toca Stripe. Aborta en producción. Crea y limpia sus propios datos.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-alta-manual-vendedor.ts
 *
 * Ubicación: apps/api/scripts/probar-alta-manual-vendedor.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import type { AltaManualNegocioInput } from '../src/validations/admin/altaManualNegocio.schema.js';
import { altaManualNegocio } from '../src/services/admin/altaManualNegocio.service.js';

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

function datosBase(correo: string, ciudadId: string): AltaManualNegocioInput {
  return {
    nombreNegocio: 'Negocio Vendedor',
    ciudadId,
    nombre: 'Dueño',
    apellidos: 'Vendido',
    correo,
    confirmarCorreo: correo,
    telefono: '+521234567890',
    concepto: 'efectivo',
    monto: 449,
    meses: 1,
    embajadorId: null, // se ignora para rol vendedor (auto-atribución)
  };
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Alta MANUAL por VENDEDOR (auto-atribución) ════════');

  // 1) Identidad del vendedor: usuarioId, embajadorId (activo) y región deducida.
  const [vend] = (await db.execute(sql`
    SELECT id::text AS id FROM usuarios WHERE correo = ${VENDEDOR_CORREO}
  `)).rows as Array<{ id: string }>;
  if (!vend) {
    console.error('✗ No existe vendedor.prueba@dev.local. Corre seed-vendedor-prueba.ts. Abortado.');
    process.exit(1);
  }

  const [emb] = (await db.execute(sql`
    SELECT id::text AS id, estado FROM embajadores WHERE usuario_id = ${vend.id} LIMIT 1
  `)).rows as Array<{ id: string; estado: string }>;
  if (!emb || emb.estado !== 'activo') {
    console.error('✗ El vendedor no tiene un embajador activo. Abortado.');
    process.exit(1);
  }

  const [reg] = (await db.execute(sql`
    SELECT c.region_id::text AS region_id
    FROM embajador_ciudades ec JOIN ciudades c ON c.id = ec.ciudad_id
    WHERE ec.embajador_id = ${emb.id} LIMIT 1
  `)).rows as Array<{ region_id: string | null }>;
  const regionVendedor = reg?.region_id ?? null;

  // 2) Ciudad DENTRO de su región y ciudad FUERA de su región.
  const [ciudadDentro] = (await db.execute(sql`
    SELECT id::text AS id, nombre FROM ciudades
    WHERE activa = true AND region_id = ${regionVendedor}
    ORDER BY importancia DESC LIMIT 1
  `)).rows as Array<{ id: string; nombre: string }>;

  const [ciudadFuera] = (await db.execute(sql`
    SELECT id::text AS id, nombre, region_id::text AS region_id FROM ciudades
    WHERE activa = true AND region_id IS DISTINCT FROM ${regionVendedor}
    ORDER BY importancia DESC LIMIT 1
  `)).rows as Array<{ id: string; nombre: string; region_id: string | null }>;

  console.log(`Vendedor: ${VENDEDOR_CORREO}  embajador=${emb.id}  región=${regionVendedor ?? 'null'}`);
  console.log(`Ciudad dentro: ${ciudadDentro?.nombre ?? '—'}   ·   Ciudad fuera: ${ciudadFuera?.nombre ?? '— (no hay otra región)'}`);

  if (!ciudadDentro) {
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

  const sufijo = Date.now();
  const correoA = `alta.vend.test+${sufijo}a@dev.local`;
  const correoB = `alta.vend.test+${sufijo}b@dev.local`;
  await limpiar(correoA);
  await limpiar(correoB);

  // ── A) Alta en ciudad de SU región → auto-atribución ──────────────────────
  const rA = await altaManualNegocio(panelVendedor, datosBase(correoA, ciudadDentro.id));
  console.log('\n[A] Alta del vendedor en su región');
  verificar('resultado ok', rA.ok === true, JSON.stringify(rA));
  if (rA.ok) {
    const [n] = (await db.execute(sql`
      SELECT embajador_id::text AS embajador_id FROM negocios WHERE id = ${rA.negocioId}
    `)).rows as Array<{ embajador_id: string | null }>;
    const [u] = (await db.execute(sql`
      SELECT referido_por::text AS referido_por FROM usuarios WHERE id = ${rA.usuarioId}
    `)).rows as Array<{ referido_por: string | null }>;
    verificar('negocios.embajador_id = embajador del vendedor', n?.embajador_id === emb.id, n?.embajador_id ?? 'null');
    verificar('usuarios.referido_por = embajador del vendedor', u?.referido_por === emb.id, u?.referido_por ?? 'null');
  }

  // ── B) Alta en ciudad de OTRA región → 403 ────────────────────────────────
  console.log('\n[B] Alta del vendedor en ciudad de otra región → 403');
  if (!ciudadFuera) {
    console.log('    ⚠️  No hay ciudad de otra región en la BD; no se puede probar el candado. (informativo)');
  } else {
    const rB = await altaManualNegocio(panelVendedor, datosBase(correoB, ciudadFuera.id));
    verificar('ok = false', rB.ok === false);
    verificar('status = 403', rB.ok === false && rB.status === 403, rB.ok === false ? String(rB.status) : 'ok');
    // No debe haber creado nada con el correo B.
    const creadoB = (await db.execute(sql`SELECT 1 FROM usuarios WHERE correo = ${correoB}`)).rows.length;
    verificar('no creó cuenta con el correo B', creadoB === 0);
  }

  await limpiar(correoA);
  await limpiar(correoB);

  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('══════════════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-alta-manual-vendedor:', err);
  process.exit(1);
});
