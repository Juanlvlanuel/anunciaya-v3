/**
 * probar-conteo-negocios.ts — HARNESS (DEV) · contador del menú de Negocios
 * ========================================================================
 * Valida `contarNegocios` (el total del alcance que alimenta el contador del menú):
 *   1) superadmin → COUNT(*) de todos los negocios.
 *   2) gerente de una región → negocios cuya sucursal MATRIZ cae en su región.
 *
 * Solo LECTURA (no crea ni borra). Aborta en producción.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-conteo-negocios.ts
 *
 * Ubicación: apps/api/scripts/probar-conteo-negocios.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { contarNegocios } from '../src/services/admin/negocios.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`  ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

const panel = (rolEquipo: UsuarioPanel['rolEquipo'], regionId: string | null): UsuarioPanel => ({
  usuarioId: null,
  rolEquipo,
  regionId,
  viaSecret: false,
  panel2faHabilitado: false,
  panel2faOk: true,
});

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Conteo de negocios (contador del menú) ════════');

  // 1) superadmin = todos.
  const totalSuper = await contarNegocios(panel('superadmin', null));
  const [{ real }] = (await db.execute(sql`SELECT COUNT(*)::int AS real FROM negocios`)).rows as Array<{ real: number }>;
  verificar('super = COUNT(*) de negocios', totalSuper === Number(real), `${totalSuper} vs ${real}`);

  // 2) gerente de una región real = negocios con matriz en su región.
  const [reg] = (await db.execute(sql`SELECT id::text AS id, nombre FROM regiones WHERE activa = true LIMIT 1`)).rows as Array<{ id: string; nombre: string }>;
  if (reg) {
    const totalGerente = await contarNegocios(panel('gerente', reg.id));
    const [{ real: realReg }] = (await db.execute(sql`
      SELECT COUNT(*)::int AS real FROM negocios n WHERE EXISTS (
        SELECT 1 FROM negocio_sucursales ns JOIN ciudades c ON c.id = ns.ciudad_id
        WHERE ns.negocio_id = n.id AND ns.es_principal = true AND c.region_id = ${reg.id}
      )
    `)).rows as Array<{ real: number }>;
    verificar(`gerente = negocios con matriz en "${reg.nombre}"`, totalGerente === Number(realReg), `${totalGerente} vs ${realReg}`);
  } else {
    console.log('  (sin regiones activas para probar el gerente)');
  }

  console.log(`\nResultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-conteo-negocios:', err);
  process.exit(1);
});
