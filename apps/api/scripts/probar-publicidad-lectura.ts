/**
 * probar-publicidad-lectura.ts — HARNESS (DEV) · lectura de Publicidad
 * ====================================================================
 * Valida la Fase 1 (VER) con DATOS REALES (los del seed): el service del Panel
 * (lista + ficha + alcance por rol/región) y el endpoint público por ciudad.
 *   1) super → ve los 2 anuncios; conteos cuadran.
 *   2) ficha del combo → 3 piezas + ≥1 ciudad + folio.
 *   3) gerente de la región del anuncio → los ve; gerente de otra región → 0.
 *   4) endpoint público de la ciudad → anuncios=2, patrocinadores=1, fundadores=1.
 *
 * Solo LECTURA. Aborta en producción. Requiere haber corrido sembrar-publicidad-dev.ts.
 * EJECUTAR:  pnpm --filter @anunciaya/api exec tsx scripts/probar-publicidad-lectura.ts
 *
 * Ubicación: apps/api/scripts/probar-publicidad-lectura.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import { listarPublicidad, obtenerDetallePublicidad } from '../src/services/admin/publicidad.service.js';
import { listarPublicidadPublica } from '../src/services/publicidadPublica.service.js';

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

const FILTROS = { pagina: 1, porPagina: 20 };

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Lectura de Publicidad (datos reales) ════════');

  // Ciudad + región del seed.
  const [ctx] = (await db.execute(sql`
    SELECT c.id::text AS ciudad_id, c.region_id::text AS region_id, c.nombre
    FROM publicidad_compra_ciudades pcc
    JOIN ciudades c ON c.id = pcc.ciudad_id
    JOIN publicidad_compras pc ON pc.id = pcc.compra_id
    WHERE pc.stripe_payment_intent_id = 'seed-dev-publicidad'
    LIMIT 1`)).rows as Array<{ ciudad_id: string; region_id: string | null; nombre: string }>;
  if (!ctx) {
    console.error('✗ No hay datos de seed. Corre sembrar-publicidad-dev.ts primero.');
    process.exit(1);
  }
  console.log(`  Ciudad del seed: ${ctx.nombre} (región: ${ctx.region_id ?? 'sin asignar'})`);

  // 1) super ve los 2 anuncios.
  const listaSuper = await listarPublicidad(panel('superadmin', null), FILTROS);
  verificar('super ve ≥ 2 anuncios', listaSuper.total >= 2, `${listaSuper.total}`);
  verificar('conteos.total = total', listaSuper.conteos.total === listaSuper.total, `${listaSuper.conteos.total}`);
  const combo = listaSuper.items.find((i) => i.esCombo);
  verificar('hay un anuncio combo', !!combo, combo ? combo.carruseles.join('+') : '—');
  verificar('el combo trae 3 carruseles', (combo?.carruseles.length ?? 0) === 3, `${combo?.carruseles.length ?? 0}`);

  // 2) ficha del combo.
  if (combo) {
    const ficha = await obtenerDetallePublicidad(panel('superadmin', null), combo.id);
    verificar('ficha del combo existe', !!ficha);
    verificar('ficha: 3 piezas', (ficha?.piezas.length ?? 0) === 3, `${ficha?.piezas.length ?? 0}`);
    verificar('ficha: ≥ 1 ciudad', (ficha?.ciudades.length ?? 0) >= 1, `${ficha?.ciudades.length ?? 0}`);
    verificar('ficha: folio asignado', ficha?.folio != null, `${ficha?.folio ?? 'NULL'}`);
  }

  // 3) alcance del gerente: por las ciudades del anuncio.
  if (ctx.region_id) {
    const listaGerente = await listarPublicidad(panel('gerente', ctx.region_id), FILTROS);
    verificar('gerente de la región del anuncio LO ve', listaGerente.total >= 2, `${listaGerente.total}`);

    const [otra] = (await db.execute(sql`SELECT id::text AS id FROM regiones WHERE id <> ${ctx.region_id} LIMIT 1`)).rows as Array<{ id: string }>;
    if (otra) {
      const listaOtra = await listarPublicidad(panel('gerente', otra.id), FILTROS);
      verificar('gerente de OTRA región NO lo ve', listaOtra.items.every((i) => !i.esCombo) || listaOtra.total === 0, `total=${listaOtra.total}`);
    }
  } else {
    console.log('  (la ciudad del seed no tiene región asignada — se omite la prueba del gerente)');
  }
  // gerente sin región → no ve nada.
  const sinRegion = await listarPublicidad(panel('gerente', null), FILTROS);
  verificar('gerente sin región ve 0', sinRegion.total === 0, `${sinRegion.total}`);

  // 4) endpoint público por ciudad.
  const publico = await listarPublicidadPublica(ctx.ciudad_id);
  verificar('público: 2 en Anuncios', publico.anuncios.length === 2, `${publico.anuncios.length}`);
  verificar('público: 1 en Patrocinadores', publico.patrocinadores.length === 1, `${publico.patrocinadores.length}`);
  verificar('público: 1 en Fundadores', publico.fundadores.length === 1, `${publico.fundadores.length}`);
  verificar('público: cada item trae imagenUrl', publico.anuncios.every((a) => !!a.imagenUrl));

  const vacio = await listarPublicidadPublica('');
  verificar('público sin ciudad → vacío', vacio.anuncios.length === 0 && vacio.patrocinadores.length === 0);

  console.log(`\nResultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-publicidad-lectura:', err);
  process.exit(1);
});
