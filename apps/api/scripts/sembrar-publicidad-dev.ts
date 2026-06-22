/**
 * sembrar-publicidad-dev.ts — SEED (DEV) · módulo Publicidad
 * ==========================================================
 * Inserta anuncios de PRUEBA para verificar la sección del Panel y la columna derecha
 * (datos reales que detonan el flujo, regla 8 de CLAUDE.md). Idempotente: borra los
 * anuncios de seed previos (marcados por stripe_payment_intent_id='seed-dev-publicidad')
 * y los vuelve a crear. Aborta en producción.
 *
 * Crea 2 anuncios VIGENTES en la ciudad más relevante (Puerto Peñasco si existe):
 *   1) Combo (3 piezas: anuncios + patrocinadores + fundadores) — origen self/tarjeta.
 *   2) Simple (1 pieza: anuncios) — origen manual/efectivo.
 * Las imágenes son placeholders públicos (placehold.co); la subida real a R2 es Fase 2.
 *
 * EJECUTAR:  pnpm --filter @anunciaya/api exec tsx scripts/sembrar-publicidad-dev.ts
 *
 * Ubicación: apps/api/scripts/sembrar-publicidad-dev.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';

const MARCADOR = 'seed-dev-publicidad';

const IMG = {
  anuncios: 'https://placehold.co/320x160/f59e0b/ffffff/png?text=Anuncio',
  patrocinadores: 'https://placehold.co/600x900/2563eb/ffffff/png?text=Patrocinador',
  fundadores: 'https://placehold.co/200x200/7c3aed/ffffff/png?text=Logo',
};

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Seed de Publicidad (DEV) ════════');

  // Usuario anunciante (preferir uno comercial para que la ficha muestre su negocio).
  const [usuario] = (await db.execute(sql`
    SELECT id::text AS id, negocio_id::text AS negocio_id, nombre
    FROM usuarios
    ORDER BY (negocio_id IS NOT NULL) DESC, created_at ASC
    LIMIT 1`)).rows as Array<{ id: string; negocio_id: string | null; nombre: string }>;
  if (!usuario) {
    console.error('✗ No hay usuarios en la BD; no se puede sembrar.');
    process.exit(1);
  }

  // Ciudad activa (preferir Puerto Peñasco; si no, la más importante).
  const [ciudad] = (await db.execute(sql`
    SELECT id::text AS id, nombre, estado
    FROM ciudades
    WHERE activa = true
    ORDER BY (nombre ILIKE '%peñasco%') DESC, importancia DESC
    LIMIT 1`)).rows as Array<{ id: string; nombre: string; estado: string }>;
  if (!ciudad) {
    console.error('✗ No hay ciudades activas; no se puede sembrar.');
    process.exit(1);
  }

  console.log(`  Anunciante: ${usuario.nombre} · Ciudad: ${ciudad.nombre}, ${ciudad.estado}`);

  // Idempotencia: borra los seeds previos (cascade limpia piezas + ciudades).
  await db.execute(sql`DELETE FROM publicidad_compras WHERE stripe_payment_intent_id = ${MARCADOR}`);

  // ── Anuncio 1: COMBO (los 3 carruseles) ─────────────────────────────────────
  const [c1] = (await db.execute(sql`
    INSERT INTO publicidad_compras
      (usuario_id, negocio_id, es_combo, estado, origen, metodo_cobro, monto, folio,
       stripe_payment_intent_id, duracion_dias, inicia_at, expira_at)
    VALUES
      (${usuario.id}, ${usuario.negocio_id}, true, 'activa', 'self', 'tarjeta', 1200,
       nextval('pagos_membresia_folio_seq'), ${MARCADOR}, 30, now(), now() + interval '30 days')
    RETURNING id::text AS id`)).rows as Array<{ id: string }>;

  await db.execute(sql`
    INSERT INTO publicidad_piezas (compra_id, carrusel, imagen_url) VALUES
      (${c1.id}, 'anuncios', ${IMG.anuncios}),
      (${c1.id}, 'patrocinadores', ${IMG.patrocinadores}),
      (${c1.id}, 'fundadores', ${IMG.fundadores})`);
  await db.execute(sql`INSERT INTO publicidad_compra_ciudades (compra_id, ciudad_id) VALUES (${c1.id}, ${ciudad.id})`);

  // ── Anuncio 2: SIMPLE (solo Anuncios) · alta manual en efectivo ─────────────
  const [c2] = (await db.execute(sql`
    INSERT INTO publicidad_compras
      (usuario_id, negocio_id, es_combo, estado, origen, metodo_cobro, monto, folio,
       stripe_payment_intent_id, duracion_dias, inicia_at, expira_at, registrado_por)
    VALUES
      (${usuario.id}, ${usuario.negocio_id}, false, 'activa', 'manual', 'efectivo', 350,
       nextval('pagos_membresia_folio_seq'), ${MARCADOR}, 15, now(), now() + interval '15 days', ${usuario.id})
    RETURNING id::text AS id`)).rows as Array<{ id: string }>;

  await db.execute(sql`INSERT INTO publicidad_piezas (compra_id, carrusel, imagen_url) VALUES (${c2.id}, 'anuncios', ${IMG.anuncios})`);
  await db.execute(sql`INSERT INTO publicidad_compra_ciudades (compra_id, ciudad_id) VALUES (${c2.id}, ${ciudad.id})`);

  console.log('  ✓ 2 anuncios creados (1 combo + 1 simple) en', ciudad.nombre);
  console.log('  → Verifica: Panel → Publicidad (2 filas) · columna derecha en', ciudad.nombre, '(desktop)');
  console.log('═══════════════════════════════════════════\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error en sembrar-publicidad-dev:', err);
  process.exit(1);
});
