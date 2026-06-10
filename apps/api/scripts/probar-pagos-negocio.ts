/**
 * probar-pagos-negocio.ts — HARNESS (DEV) · historial de pagos_membresia
 * ======================================================================
 * Valida listarPagosNegocio (lo que consume la ficha del método manual):
 *   1) El vendedor da de alta un negocio en efectivo (registra un pago) y listarPagosNegocio
 *      devuelve ese pago con concepto/monto/meses y el NOMBRE de quién lo registró.
 *   2) Alcance: un panel de OTRA región NO ve los pagos (devuelve []).
 *
 * Requiere: seed-vendedor-prueba.ts. NO toca Stripe. Aborta en producción. Limpia sus datos.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-pagos-negocio.ts
 *
 * Ubicación: apps/api/scripts/probar-pagos-negocio.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { altaManualNegocio } from '../src/services/admin/altaManualNegocio.service.js';
import { listarPagosNegocio } from '../src/services/admin/negocios.service.js';

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

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Historial de pagos (ficha manual) ════════');

  const [vend] = (await db.execute(sql`
    SELECT id::text AS id, nombre, apellidos FROM usuarios WHERE correo = ${VENDEDOR_CORREO}
  `)).rows as Array<{ id: string; nombre: string; apellidos: string | null }>;
  if (!vend) {
    console.error('✗ No existe vendedor.prueba@dev.local. Corre seed-vendedor-prueba.ts. Abortado.');
    process.exit(1);
  }
  const nombreVendedor = `${vend.nombre} ${vend.apellidos ?? ''}`.trim();

  const [emb] = (await db.execute(sql`SELECT id::text AS id FROM embajadores WHERE usuario_id = ${vend.id} LIMIT 1`)).rows as Array<{ id: string }>;
  const [reg] = (await db.execute(sql`
    SELECT c.region_id::text AS region_id FROM embajador_ciudades ec JOIN ciudades c ON c.id = ec.ciudad_id
    WHERE ec.embajador_id = ${emb.id} LIMIT 1
  `)).rows as Array<{ region_id: string | null }>;
  const regionVendedor = reg?.region_id ?? null;

  const [ciudad] = (await db.execute(sql`
    SELECT id::text AS id, nombre FROM ciudades WHERE activa = true AND region_id = ${regionVendedor}
    ORDER BY importancia DESC LIMIT 1
  `)).rows as Array<{ id: string; nombre: string }>;
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

  const sufijo = Date.now();
  const correo = `pagos.test+${sufijo}@dev.local`;
  await limpiar(correo);

  // 1) Alta manual (registra el primer pago) y consulta del historial.
  const alta = await altaManualNegocio(panelVendedor, {
    nombreNegocio: 'Negocio Pagos',
    ciudadId: ciudad.id,
    nombre: 'Dueño',
    apellidos: 'Pagos',
    correo,
    confirmarCorreo: correo,
    telefono: '+521234567890',
    concepto: 'transferencia',
    monto: 449,
    meses: 6,
    embajadorId: null,
  });
  console.log('\n[1] Historial tras el alta (vendedor)');
  verificar('alta ok', alta.ok === true, JSON.stringify(alta));

  if (alta.ok) {
    const pagos = await listarPagosNegocio(panelVendedor, alta.negocioId);
    verificar('1 pago en el historial', pagos.length === 1, String(pagos.length));
    const p = pagos[0];
    if (p) {
      verificar("concepto = 'transferencia'", p.concepto === 'transferencia', p.concepto);
      verificar('monto = 449', p.monto === '449' || p.monto === '449.00', p.monto ?? 'null');
      verificar('mesesCubiertos = 6', p.mesesCubiertos === 6, String(p.mesesCubiertos));
      verificar('fechaPago presente', !!p.fechaPago);
      verificar('registradoPorNombre = vendedor', p.registradoPorNombre === nombreVendedor, p.registradoPorNombre ?? 'null');
    }

    // 2) Alcance: panel de otra región no ve los pagos.
    const panelOtraRegion: UsuarioPanel = {
      usuarioId: null,
      rolEquipo: 'gerente',
      regionId: '00000000-0000-0000-0000-000000000000',
      viaSecret: false,
      panel2faHabilitado: false,
      panel2faOk: true,
    };
    const ajenos = await listarPagosNegocio(panelOtraRegion, alta.negocioId);
    console.log('\n[2] Alcance: gerente de otra región');
    verificar('no ve los pagos (vacío)', ajenos.length === 0, String(ajenos.length));
  }

  await limpiar(correo);

  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-pagos-negocio:', err);
  process.exit(1);
});
