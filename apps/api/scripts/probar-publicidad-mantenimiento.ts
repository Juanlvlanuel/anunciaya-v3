/**
 * probar-publicidad-mantenimiento.ts — HARNESS (DEV) · cron de Publicidad (Fase 2)
 * ================================================================================
 * Valida la EXPIRACIÓN automática (activa + vencida → expirada) con datos reales. No prueba el
 * aviso por correo (enviaría correos reales); su lógica de selección queda cubierta por tsc.
 * También valida el cableado con Mantenimiento: el conteo del preview (`contarMantenimientoPublicidad`),
 * que el cron aparezca en el catálogo (`obtenerEstadoCrons`) y que el preview responda (`obtenerPreviewCron`).
 *
 * AISLADO: crea su anuncio vencido y lo BORRA al final. Aborta en producción.
 * EJECUTAR:  pnpm --filter @anunciaya/api exec tsx scripts/probar-publicidad-mantenimiento.ts
 *
 * Ubicación: apps/api/scripts/probar-publicidad-mantenimiento.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { expirarAnunciosVencidos, contarMantenimientoPublicidad } from '../src/services/publicidad-mantenimiento.service.js';
import { obtenerEstadoCrons } from '../src/utils/cronRegistry.js';
import { obtenerPreviewCron } from '../src/services/admin/crons-preview.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`  ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Mantenimiento de Publicidad (expiración) ════════');

  const [u] = (await db.execute(sql`SELECT id::text AS id FROM usuarios LIMIT 1`)).rows as Array<{ id: string }>;
  if (!u) { console.error('✗ Falta usuario.'); process.exit(1); }

  // Anuncio ACTIVO pero ya vencido (inicia hace 40 días, expiró hace 10).
  const [a] = (await db.execute(sql`
    INSERT INTO publicidad_compras (usuario_id, es_combo, estado, origen, metodo_cobro, monto, duracion_dias, inicia_at, expira_at)
    VALUES (${u.id}, false, 'activa', 'self', 'tarjeta', 300, 30, now() - interval '40 days', now() - interval '10 days')
    RETURNING id::text AS id`)).rows as Array<{ id: string }>;

  try {
    // El preview cuenta el anuncio vencido ANTES de expirar (entra en "por expirar").
    const candidatosAntes = await contarMantenimientoPublicidad();
    verificar('contarMantenimientoPublicidad incluye el vencido', candidatosAntes >= 1, `${candidatosAntes}`);

    const r = await expirarAnunciosVencidos();
    verificar('expira al menos 1 anuncio vencido', r.expirados >= 1, `${r.expirados}`);
    const [check] = (await db.execute(sql`SELECT estado FROM publicidad_compras WHERE id = ${a.id}::uuid`)).rows as Array<{ estado: string }>;
    verificar('el anuncio de prueba quedó "expirada"', check.estado === 'expirada', check.estado);

    // Cableado con Mantenimiento: catálogo + preview por id.
    const crons = await obtenerEstadoCrons();
    verificar('el cron aparece en el catálogo', crons.some((c) => c.id === 'publicidad-mantenimiento'));
    const prev = await obtenerPreviewCron('publicidad-mantenimiento');
    verificar('obtenerPreviewCron responde (no null)', prev !== null);
    verificar('el preview trae descripción', !!prev && prev.descripcion.length > 0, prev?.descripcion);
  } finally {
    await db.execute(sql`DELETE FROM publicidad_compras WHERE id = ${a.id}::uuid`);
  }

  console.log(`\nResultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-publicidad-mantenimiento:', err);
  process.exit(1);
});
