/**
 * probar-publicidad-alta.ts — HARNESS (DEV) · alta manual de Publicidad (Fase 2)
 * ==============================================================================
 * Valida crearAnuncioManual con DATOS REALES: cobro en efectivo (folio + precio calculado),
 * cortesía (sin folio ni monto, solo super), alcance del gerente (ciudades de su región),
 * y los rechazos (cortesía por gerente, ciudad fuera de región, correo inexistente, límite).
 *
 * AISLADO: captura los anuncios que crea y los BORRA al final (cascade + auditoría). Aborta en prod.
 * EJECUTAR:  pnpm --filter @anunciaya/api exec tsx scripts/probar-publicidad-alta.ts
 *
 * Ubicación: apps/api/scripts/probar-publicidad-alta.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { crearAnuncioManual } from '../src/services/admin/publicidad-alta.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`  ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

const panel = (rolEquipo: UsuarioPanel['rolEquipo'], regionId: string | null, usuarioId: string | null = null): UsuarioPanel => ({
  usuarioId, rolEquipo, regionId, viaSecret: false, panel2faHabilitado: false, panel2faOk: true,
});

const IMG = { anuncios: 'https://x/a.png', patrocinadores: 'https://x/p.png', fundadores: 'https://x/f.png' };
const creados: string[] = [];

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Alta manual de Publicidad (datos reales) ════════');

  const [u] = (await db.execute(sql`SELECT id::text AS id, correo FROM usuarios ORDER BY created_at ASC LIMIT 1`)).rows as Array<{ id: string; correo: string }>;
  const [c] = (await db.execute(sql`
    SELECT id::text AS id, region_id::text AS region_id FROM ciudades
    WHERE activa = true AND region_id IS NOT NULL
    ORDER BY (nombre ILIKE '%peñasco%') DESC LIMIT 1`)).rows as Array<{ id: string; region_id: string }>;
  if (!u || !c) { console.error('✗ Falta usuario o ciudad con región.'); process.exit(1); }

  const superP = panel('superadmin', null, u.id);
  const gerenteP = panel('gerente', c.region_id, u.id);

  try {
    // 1) super · efectivo · 2 carruseles · 1 ciudad → folio + precio 1100 (300+800).
    const r1 = await crearAnuncioManual(superP, {
      correoAnunciante: u.correo, carruseles: ['anuncios', 'patrocinadores'], imagenes: IMG,
      ciudadIds: [c.id], metodoCobro: 'efectivo',
    });
    if (r1.ok) creados.push(r1.id);
    verificar('super crea (efectivo) con folio + monto 1100', r1.ok && r1.folio != null && r1.monto === 1100, JSON.stringify(r1));

    // 2) super · cortesía → sin folio ni monto.
    const r2 = await crearAnuncioManual(superP, {
      correoAnunciante: u.correo, carruseles: ['anuncios'], imagenes: IMG,
      ciudadIds: [c.id], metodoCobro: 'cortesia',
    });
    if (r2.ok) creados.push(r2.id);
    verificar('super cortesía → sin folio ni monto', r2.ok && r2.folio === null && r2.monto === null);

    // 3) gerente de la región · efectivo → ok.
    const r3 = await crearAnuncioManual(gerenteP, {
      correoAnunciante: u.correo, carruseles: ['fundadores'], imagenes: IMG,
      ciudadIds: [c.id], metodoCobro: 'transferencia',
    });
    if (r3.ok) creados.push(r3.id);
    verificar('gerente de la región crea', r3.ok, JSON.stringify(r3));

    // 4) gerente intenta cortesía → 403.
    const r4 = await crearAnuncioManual(gerenteP, {
      correoAnunciante: u.correo, carruseles: ['anuncios'], imagenes: IMG, ciudadIds: [c.id], metodoCobro: 'cortesia',
    });
    verificar('gerente cortesía → 403', !r4.ok && r4.status === 403);

    // 5) ciudad fuera de la región del gerente → 403.
    const [otra] = (await db.execute(sql`
      SELECT id::text AS id FROM ciudades WHERE activa = true AND region_id IS NOT NULL AND region_id <> ${c.region_id} LIMIT 1`)).rows as Array<{ id: string }>;
    if (otra) {
      const r5 = await crearAnuncioManual(gerenteP, {
        correoAnunciante: u.correo, carruseles: ['anuncios'], imagenes: IMG, ciudadIds: [otra.id], metodoCobro: 'efectivo',
      });
      verificar('gerente · ciudad de otra región → 403', !r5.ok && r5.status === 403);
    } else {
      console.log('  (no hay ciudad de otra región para probar el bloqueo)');
    }

    // 6) correo inexistente → 404.
    const r6 = await crearAnuncioManual(superP, {
      correoAnunciante: 'no-existe-xyz@ejemplo.com', carruseles: ['anuncios'], imagenes: IMG, ciudadIds: [c.id], metodoCobro: 'efectivo',
    });
    verificar('correo inexistente → 404', !r6.ok && r6.status === 404);

    // 7) límite de ciudades (manda 11 ids DISTINTOS → excede el default 10).
    const muchas = Array.from({ length: 11 }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`);
    const r7 = await crearAnuncioManual(superP, {
      correoAnunciante: u.correo, carruseles: ['anuncios'], imagenes: IMG, ciudadIds: muchas, metodoCobro: 'efectivo',
    });
    verificar('excede límite de ciudades → 400', !r7.ok && r7.status === 400);

    // 8) las piezas + ciudades del 1er anuncio quedaron bien.
    if (r1.ok) {
      const [{ piezas }] = (await db.execute(sql`SELECT count(*)::int AS piezas FROM publicidad_piezas WHERE compra_id = ${r1.id}`)).rows as Array<{ piezas: number }>;
      const [{ ciudades }] = (await db.execute(sql`SELECT count(*)::int AS ciudades FROM publicidad_compra_ciudades WHERE compra_id = ${r1.id}`)).rows as Array<{ ciudades: number }>;
      verificar('1er anuncio: 2 piezas + 1 ciudad', piezas === 2 && ciudades === 1, `piezas=${piezas} ciudades=${ciudades}`);
    }
  } finally {
    for (const id of creados) {
      await db.execute(sql`DELETE FROM publicidad_compras WHERE id = ${id}::uuid`);
      await db.execute(sql`DELETE FROM admin_auditoria WHERE entidad_id = ${id}::uuid AND entidad_tipo = 'publicidad'`);
    }
  }

  console.log(`\nResultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-publicidad-alta:', err);
  process.exit(1);
});
