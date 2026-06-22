/**
 * probar-publicidad-acciones.ts — HARNESS (DEV) · acciones de Publicidad (Fase 2)
 * ================================================================================
 * Valida pausar/reactivar/cancelar con DATOS REALES, sus guards de estado, el alcance por
 * rol (gerente por ciudades del anuncio) y que cada acción deja rastro en admin_auditoria.
 *
 * AISLADO y AUTORREPARABLE: crea su propio anuncio temporal (marcador
 * 'seed-test-acciones-publicidad'), actúa sobre él y lo BORRA al final (cascade). No toca el
 * seed ni deja basura. Aborta en producción.
 *
 * EJECUTAR:  pnpm --filter @anunciaya/api exec tsx scripts/probar-publicidad-acciones.ts
 *
 * Ubicación: apps/api/scripts/probar-publicidad-acciones.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { pausarAnuncio, reactivarAnuncio, cancelarAnuncio, editarAnuncio } from '../src/services/admin/publicidad-acciones.service.js';
import { obtenerKpisPublicidad } from '../src/services/admin/publicidad.service.js';

const MARCADOR = 'seed-test-acciones-publicidad';
const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, cond: boolean, detalle?: string) {
  if (!cond) fallos++;
  console.log(`  ${ok(cond)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

const panel = (rolEquipo: UsuarioPanel['rolEquipo'], regionId: string | null): UsuarioPanel => ({
  usuarioId: null, rolEquipo, regionId, viaSecret: false, panel2faHabilitado: false, panel2faOk: true,
});

async function estadoEn(id: string): Promise<string | null> {
  const [r] = (await db.execute(sql`SELECT estado FROM publicidad_compras WHERE id = ${id}`)).rows as Array<{ estado: string }>;
  return r?.estado ?? null;
}

async function limpiar() {
  await db.execute(sql`DELETE FROM publicidad_compras WHERE stripe_payment_intent_id = ${MARCADOR}`);
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Acciones de Publicidad (datos reales) ════════');

  const [u] = (await db.execute(sql`SELECT id::text AS id FROM usuarios LIMIT 1`)).rows as Array<{ id: string }>;
  const [c] = (await db.execute(sql`
    SELECT id::text AS id, region_id::text AS region_id
    FROM ciudades WHERE activa = true AND region_id IS NOT NULL
    ORDER BY (nombre ILIKE '%peñasco%') DESC LIMIT 1`)).rows as Array<{ id: string; region_id: string }>;
  if (!u || !c) {
    console.error('✗ Falta un usuario o una ciudad con región para la prueba.');
    process.exit(1);
  }

  await limpiar();

  // Anuncio temporal (activo).
  const [a] = (await db.execute(sql`
    INSERT INTO publicidad_compras
      (usuario_id, es_combo, estado, origen, metodo_cobro, monto, stripe_payment_intent_id, duracion_dias, inicia_at, expira_at)
    VALUES (${u.id}, false, 'activa', 'self', 'tarjeta', 500, ${MARCADOR}, 30, now(), now() + interval '30 days')
    RETURNING id::text AS id`)).rows as Array<{ id: string }>;
  await db.execute(sql`INSERT INTO publicidad_piezas (compra_id, carrusel, imagen_url) VALUES (${a.id}, 'anuncios', 'https://x/y.png')`);
  await db.execute(sql`INSERT INTO publicidad_compra_ciudades (compra_id, ciudad_id) VALUES (${a.id}, ${c.id})`);
  const id = a.id;

  try {
    // 1) pausar (super).
    const r1 = await pausarAnuncio(panel('superadmin', null), id);
    verificar('super pausa', r1.ok && (await estadoEn(id)) === 'pausada', JSON.stringify(r1));

    // 2) guard: pausar de nuevo → 409.
    const r2 = await pausarAnuncio(panel('superadmin', null), id);
    verificar('pausar ya pausada → 409', !r2.ok && r2.status === 409);

    // 3) reactivar (super).
    const r3 = await reactivarAnuncio(panel('superadmin', null), id);
    verificar('super reactiva', r3.ok && (await estadoEn(id)) === 'activa');

    // 4) guard: reactivar una activa → 409.
    const r4 = await reactivarAnuncio(panel('superadmin', null), id);
    verificar('reactivar ya activa → 409', !r4.ok && r4.status === 409);

    // 5) alcance: gerente de la región del anuncio PUEDE pausar.
    const r5 = await pausarAnuncio(panel('gerente', c.region_id), id);
    verificar('gerente de la región pausa', r5.ok && (await estadoEn(id)) === 'pausada');
    await reactivarAnuncio(panel('superadmin', null), id); // restaurar

    // 6) alcance: gerente de OTRA región NO puede.
    const [otra] = (await db.execute(sql`SELECT id::text AS id FROM regiones WHERE id <> ${c.region_id} LIMIT 1`)).rows as Array<{ id: string }>;
    if (otra) {
      const r6 = await pausarAnuncio(panel('gerente', otra.id), id);
      verificar('gerente de otra región → 403', !r6.ok && r6.status === 403, `${(await estadoEn(id))}`);
    } else {
      console.log('  (no hay una 2ª región para probar el bloqueo del gerente)');
    }

    // 7) gerente sin región → 403.
    const r7 = await pausarAnuncio(panel('gerente', null), id);
    verificar('gerente sin región → 403', !r7.ok && r7.status === 403);

    // ── EDITAR (el anuncio sigue activo) ──────────────────────────────────────
    // Le doy clics a la pieza 'anuncios' para verificar que se conservan al editar.
    await db.execute(sql`UPDATE publicidad_piezas SET clicks = 5 WHERE compra_id = ${id} AND carrusel = 'anuncios'`);

    // E1) editar → pasar a combo (3 piezas), sin tocar el monto.
    const e1 = await editarAnuncio(panel('superadmin', null), id, {
      carruseles: ['anuncios', 'patrocinadores', 'fundadores'],
      imagenes: { anuncios: 'https://x/y.png', patrocinadores: 'https://x/p.png', fundadores: 'https://x/f.png' },
      ciudadIds: [c.id],
    });
    const [pz] = (await db.execute(sql`SELECT count(*)::int AS n FROM publicidad_piezas WHERE compra_id = ${id}`)).rows as Array<{ n: number }>;
    const [cmb] = (await db.execute(sql`SELECT es_combo, monto::float AS monto FROM publicidad_compras WHERE id = ${id}`)).rows as Array<{ es_combo: boolean; monto: number }>;
    const [clk1] = (await db.execute(sql`SELECT clicks FROM publicidad_piezas WHERE compra_id = ${id} AND carrusel = 'anuncios'`)).rows as Array<{ clicks: number }>;
    verificar('editar → 3 piezas + es_combo', e1.ok && pz.n === 3 && cmb.es_combo === true, JSON.stringify(e1));
    verificar('editar NO toca el monto (sigue 500)', cmb.monto === 500, `${cmb.monto}`);
    verificar('editar conserva los clics de la pieza que sigue', clk1.clicks === 5, `${clk1.clicks}`);

    // E2) editar → volver a 1 pieza, cambiando su imagen.
    const e2 = await editarAnuncio(panel('superadmin', null), id, {
      carruseles: ['anuncios'],
      imagenes: { anuncios: 'https://x/y2.png' },
      ciudadIds: [c.id],
    });
    const [pz2] = (await db.execute(sql`SELECT count(*)::int AS n FROM publicidad_piezas WHERE compra_id = ${id}`)).rows as Array<{ n: number }>;
    const [img2] = (await db.execute(sql`SELECT imagen_url FROM publicidad_piezas WHERE compra_id = ${id} AND carrusel = 'anuncios'`)).rows as Array<{ imagen_url: string }>;
    verificar('editar → vuelve a 1 pieza', e2.ok && pz2.n === 1);
    verificar('editar cambia la imagen', img2.imagen_url === 'https://x/y2.png');

    // E3) editar: gerente de otra región → 403 (alcance).
    if (otra) {
      const e3 = await editarAnuncio(panel('gerente', otra.id), id, {
        carruseles: ['anuncios'], imagenes: { anuncios: 'https://x/y.png' }, ciudadIds: [c.id],
      });
      verificar('editar: gerente de otra región → 403', !e3.ok && e3.status === 403);
    }

    // ── KPIs (el anuncio sigue activo) ────────────────────────────────────────
    const kpis = await obtenerKpisPublicidad(panel('superadmin', null));
    verificar('KPIs: activos ≥ 1', kpis.activos >= 1, `activos=${kpis.activos}`);
    verificar('KPIs: ingresos ≥ 500', kpis.ingresos >= 500, `ingresos=${kpis.ingresos}`);
    verificar('KPIs: clics ≥ 5', kpis.clics >= 5, `clics=${kpis.clics}`);

    // 8) cancelar (super) → cancelada; luego pausar cancelada → 409.
    const r8 = await cancelarAnuncio(panel('superadmin', null), id, 'prueba');
    verificar('super cancela', r8.ok && (await estadoEn(id)) === 'cancelada');
    const r9 = await pausarAnuncio(panel('superadmin', null), id);
    verificar('pausar cancelada → 409', !r9.ok && r9.status === 409);

    // 9) auditoría: las 3 acciones dejaron rastro.
    const [aud] = (await db.execute(sql`
      SELECT count(*)::int AS n FROM admin_auditoria
      WHERE entidad_id = ${id} AND accion IN ('publicidad_pausar','publicidad_reactivar','publicidad_cancelar')`)).rows as Array<{ n: number }>;
    verificar('auditoría registró las acciones', aud.n >= 3, `${aud.n} registros`);
  } finally {
    await limpiar();
    // Borra también los registros de auditoría de la prueba (no ensuciar la bitácora de dev).
    await db.execute(sql`DELETE FROM admin_auditoria WHERE entidad_id = ${id} AND entidad_tipo = 'publicidad'`);
  }

  console.log(`\nResultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-publicidad-acciones:', err);
  process.exit(1);
});
