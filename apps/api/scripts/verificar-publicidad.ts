/**
 * verificar-publicidad.ts — VERIFICACIÓN (DEV) · módulo Publicidad
 * ================================================================
 * Confirma que las migraciones de Publicidad quedaron bien aplicadas. SOLO LECTURA
 * (no inserta ni borra nada): existencia de las 3 tablas, jubilación de las 2 dormidas,
 * columnas, constraints (CHECK), índices y conteo de filas. Aborta en producción.
 *
 * EJECUTAR:  pnpm --filter @anunciaya/api exec tsx scripts/verificar-publicidad.ts
 *
 * Ubicación: apps/api/scripts/verificar-publicidad.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`  ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

const COLUMNAS_ESPERADAS = [
  'id', 'usuario_id', 'negocio_id', 'es_combo', 'estado', 'origen', 'metodo_cobro',
  'monto', 'folio', 'stripe_payment_intent_id', 'recibo_url', 'duracion_dias',
  'inicia_at', 'expira_at', 'aviso_vencimiento_enviado', 'registrado_por',
  'created_at', 'updated_at',
];

const CHECKS_COMPRAS = [
  'publicidad_compras_estado_check',
  'publicidad_compras_origen_check',
  'publicidad_compras_monto_check',
  'publicidad_compras_cortesia_sin_monto_check',
  'publicidad_compras_fechas_check',
];

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Verificación de Publicidad (solo lectura) ════════');

  // 1) Las 3 tablas existen.
  const [t] = (await db.execute(sql`SELECT
      to_regclass('public.publicidad_compras')::text AS compras,
      to_regclass('public.publicidad_piezas')::text AS piezas,
      to_regclass('public.publicidad_compra_ciudades')::text AS ciudades`)).rows as Array<{
    compras: string | null; piezas: string | null; ciudades: string | null;
  }>;
  verificar('Tabla publicidad_compras existe', !!t.compras, t.compras ?? 'NO EXISTE');
  verificar('Tabla publicidad_piezas existe', !!t.piezas, t.piezas ?? 'NO EXISTE');
  verificar('Tabla publicidad_compra_ciudades existe', !!t.ciudades, t.ciudades ?? 'NO EXISTE');

  if (!t.compras) {
    console.log('\n⚠ Las tablas aún no existen. Corre primero docs/migraciones/2026-06-21-publicidad.sql en dev.\n');
    process.exit(1);
  }

  // 2) Las dormidas ya NO existen (jubiladas).
  const [d] = (await db.execute(sql`SELECT
      to_regclass('public.planes_anuncios')::text AS planes,
      to_regclass('public.promociones_pagadas')::text AS promos`)).rows as Array<{
    planes: string | null; promos: string | null;
  }>;
  verificar('planes_anuncios jubilada (no existe)', d.planes === null, d.planes ?? 'NULL');
  verificar('promociones_pagadas jubilada (no existe)', d.promos === null, d.promos ?? 'NULL');

  // 3) Columnas de publicidad_compras.
  const cols = (await db.execute(sql`SELECT column_name, is_nullable FROM information_schema.columns
      WHERE table_name = 'publicidad_compras'`)).rows as Array<{ column_name: string; is_nullable: string }>;
  const nombres = new Set(cols.map((c) => c.column_name));
  verificar(`publicidad_compras tiene ${COLUMNAS_ESPERADAS.length} columnas`, cols.length === COLUMNAS_ESPERADAS.length, `${cols.length}`);
  const faltan = COLUMNAS_ESPERADAS.filter((c) => !nombres.has(c));
  verificar('todas las columnas esperadas presentes', faltan.length === 0, faltan.length ? `faltan: ${faltan.join(', ')}` : 'sí');
  const nullable = new Set(cols.filter((c) => c.is_nullable === 'YES').map((c) => c.column_name));
  for (const c of ['negocio_id', 'metodo_cobro', 'monto', 'folio', 'recibo_url', 'registrado_por']) {
    verificar(`${c} es nullable`, nullable.has(c));
  }

  // 4) Constraints CHECK.
  const cons = (await db.execute(sql`SELECT conname FROM pg_constraint WHERE conrelid = 'publicidad_compras'::regclass`)).rows
    .map((r) => (r as { conname: string }).conname);
  for (const c of CHECKS_COMPRAS) verificar(`CHECK ${c}`, cons.includes(c));
  const consP = (await db.execute(sql`SELECT conname FROM pg_constraint WHERE conrelid = 'publicidad_piezas'::regclass`)).rows
    .map((r) => (r as { conname: string }).conname);
  verificar('CHECK publicidad_piezas_carrusel_check', consP.includes('publicidad_piezas_carrusel_check'));

  // 5) Índices clave.
  const idx = (await db.execute(sql`SELECT indexname FROM pg_indexes
      WHERE tablename IN ('publicidad_compras','publicidad_piezas','publicidad_compra_ciudades')`)).rows
    .map((r) => (r as { indexname: string }).indexname);
  verificar('índice único de folio', idx.includes('idx_publicidad_compras_folio'));
  verificar('índice único pieza (compra+carrusel)', idx.includes('idx_publicidad_piezas_compra_carrusel'));
  verificar('índice de ciudades por ciudad', idx.includes('idx_publicidad_compra_ciudades_ciudad'));

  // 6) Conteo de filas (lectura).
  const [n] = (await db.execute(sql`SELECT
      (SELECT count(*) FROM publicidad_compras)::int AS compras,
      (SELECT count(*) FROM publicidad_piezas)::int AS piezas,
      (SELECT count(*) FROM publicidad_compra_ciudades)::int AS ciudades`)).rows as Array<{
    compras: number; piezas: number; ciudades: number;
  }>;
  console.log(`\n  Filas actuales: compras=${n.compras} · piezas=${n.piezas} · ciudades=${n.ciudades}`);

  console.log(`\nResultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en verificar-publicidad:', err);
  process.exit(1);
});
