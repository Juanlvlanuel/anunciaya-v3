/**
 * probar-fundador.ts — HARNESS (DEV) · Fundador (regalo de Publicidad)
 * ====================================================================
 * Valida con DATOS REALES el toggle "Fundador" del negocio: marcar/quitar, que el carrusel público de
 * su ciudad lo incluya (su logo), el cupo por ciudad y la auditoría. Aislado y autorreparable: usa un
 * negocio real con logo + sucursal principal, restaura su estado y limpia la auditoría de la prueba.
 *
 * EJECUTAR:  pnpm --filter @anunciaya/api exec tsx scripts/probar-fundador.ts
 *
 * Ubicación: apps/api/scripts/probar-fundador.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { marcarDesmarcarFundador } from '../src/services/admin/negocios-acciones.service.js';
import { listarPublicidadPublica } from '../src/services/publicidadPublica.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`  ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

const panel = (rolEquipo: UsuarioPanel['rolEquipo'], regionId: string | null): UsuarioPanel => ({
  usuarioId: null, rolEquipo, regionId, viaSecret: false, panel2faHabilitado: false, panel2faOk: true,
});

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Fundador (datos reales) ════════');

  // Un negocio activo con logo + sucursal principal con ciudad.
  const [neg] = (await db.execute(sql`
    SELECT n.id::text AS id, ns.ciudad_id::text AS ciudad_id, n.es_fundador AS antes
    FROM negocios n
    JOIN negocio_sucursales ns ON ns.negocio_id = n.id AND ns.es_principal = true
    WHERE n.logo_url IS NOT NULL AND ns.ciudad_id IS NOT NULL AND n.activo = true
    ORDER BY (n.es_fundador = false) DESC
    LIMIT 1
  `)).rows as Array<{ id: string; ciudad_id: string; antes: boolean }>;
  if (!neg) {
    console.error('✗ No hay un negocio con logo + sucursal principal para la prueba.');
    process.exit(1);
  }

  try {
    // 1) marcar.
    const r1 = await marcarDesmarcarFundador(panel('superadmin', null), neg.id, true);
    const [a1] = (await db.execute(sql`SELECT es_fundador FROM negocios WHERE id = ${neg.id}`)).rows as Array<{ es_fundador: boolean }>;
    verificar('marcar fundador', r1.ok && a1.es_fundador === true, JSON.stringify(r1));

    // 2) el carrusel público de su ciudad lo incluye (por su logo).
    const pub = await listarPublicidadPublica(neg.ciudad_id);
    verificar('aparece en fundadores del carrusel público', pub.fundadores.some((f) => f.piezaId === neg.id), `${pub.fundadores.length} fundadores`);

    // 3) quitar.
    const r2 = await marcarDesmarcarFundador(panel('superadmin', null), neg.id, false);
    const [a2] = (await db.execute(sql`SELECT es_fundador FROM negocios WHERE id = ${neg.id}`)).rows as Array<{ es_fundador: boolean }>;
    verificar('quitar fundador', r2.ok && a2.es_fundador === false);

    // 4) deja de aparecer.
    const pub2 = await listarPublicidadPublica(neg.ciudad_id);
    verificar('deja de aparecer tras quitar', !pub2.fundadores.some((f) => f.piezaId === neg.id));

    // 5) auditoría.
    const [aud] = (await db.execute(sql`
      SELECT count(*)::int AS n FROM admin_auditoria
      WHERE entidad_id = ${neg.id} AND accion IN ('negocio_marcar_fundador','negocio_quitar_fundador')`)).rows as Array<{ n: number }>;
    verificar('auditoría registró marcar + quitar', aud.n >= 2, `${aud.n} registros`);
  } finally {
    // Restaurar el estado original del negocio + limpiar la auditoría de la prueba.
    await db.execute(sql`UPDATE negocios SET es_fundador = ${neg.antes} WHERE id = ${neg.id}::uuid`);
    await db.execute(sql`DELETE FROM admin_auditoria WHERE entidad_id = ${neg.id} AND accion IN ('negocio_marcar_fundador','negocio_quitar_fundador')`);
  }

  console.log(`\nResultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-fundador:', err);
  process.exit(1);
});
