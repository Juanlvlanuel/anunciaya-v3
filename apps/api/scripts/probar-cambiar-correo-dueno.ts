/**
 * probar-cambiar-correo-dueno.ts — HARNESS (DEV) · Fase 4: editar correo del dueño
 * ================================================================================
 * Ejercita cambiarCorreoDueno con datos reales en BD:
 *   1) Superadmin cambia el correo del dueño → ok; en BD el correo nuevo queda con
 *      correoVerificado=false + correoVerificadoAt=null; auditoría registrada; el
 *      resultado trae `correoEnviado` (refleja el envío: en DEV @dev.local falla → false).
 *   2) Correo nuevo que ya pertenece a OTRA cuenta → 409.
 *   3) Gerente de OTRA región → 403.
 *
 * NO toca Stripe. Aborta en producción. Crea y limpia sus propios datos.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-cambiar-correo-dueno.ts
 *
 * Ubicación: apps/api/scripts/probar-cambiar-correo-dueno.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import type { AltaManualNegocioInput } from '../src/validations/admin/altaManualNegocio.schema.js';
import { altaManualNegocio } from '../src/services/admin/altaManualNegocio.service.js';
import { cambiarCorreoDueno } from '../src/services/admin/negocios-acciones.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string) {
  if (!condicion) fallos++;
  console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

const panelSuper: UsuarioPanel = {
  usuarioId: null, rolEquipo: 'superadmin', regionId: null, viaSecret: true, panel2faHabilitado: false, panel2faOk: true,
};

async function limpiar(correo: string) {
  const filas = (await db.execute(
    sql`SELECT negocio_id::text AS negocio_id FROM usuarios WHERE correo = ${correo}`,
  )).rows as Array<{ negocio_id: string | null }>;
  for (const f of filas) {
    if (f.negocio_id) await db.execute(sql`DELETE FROM admin_auditoria WHERE entidad_id = ${f.negocio_id}`);
  }
  await db.execute(sql`DELETE FROM usuarios WHERE correo = ${correo}`);
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') { console.error('✗ Abortado: production.'); process.exit(1); }

  console.log('\n════════ Fase 4 · editar correo del dueño ════════');

  const [ciudad] = (await db.execute(sql`
    SELECT id::text AS id FROM ciudades WHERE activa = true
    ORDER BY (region_id IS NOT NULL) DESC, importancia DESC LIMIT 1
  `)).rows as Array<{ id: string }>;
  if (!ciudad) { console.error('✗ No hay ciudades activas. Abortado.'); process.exit(1); }

  const s = Date.now();
  const correo1 = `cce.uno+${s}@dev.local`;       // negocio cuyo correo corregiremos
  const correo2 = `cce.dos+${s}@dev.local`;       // existe en otra cuenta (para el 409)
  const correoNuevo = `cce.nuevo+${s}@dev.local`; // destino del cambio
  const base: AltaManualNegocioInput = {
    nombreNegocio: 'Negocio Correo', ciudadId: ciudad.id, nombre: 'Dueño', apellidos: 'Correo',
    correo: correo1, confirmarCorreo: correo1, telefono: '+521234567890', concepto: 'efectivo', monto: 449, meses: 1, embajadorId: null,
  };

  for (const c of [correo1, correo2, correoNuevo]) await limpiar(c);

  const a1 = await altaManualNegocio(panelSuper, base);
  const a2 = await altaManualNegocio(panelSuper, { ...base, correo: correo2, confirmarCorreo: correo2 });
  if (!a1.ok || !a2.ok) { console.error('✗ Alta de prueba falló'); for (const c of [correo1, correo2, correoNuevo]) await limpiar(c); process.exit(1); }

  // ── 1) Cambio OK ──────────────────────────────────────────────────────────
  const r1 = await cambiarCorreoDueno(panelSuper, a1.negocioId, correoNuevo);
  console.log('\n[1] Cambio de correo (superadmin)');
  verificar('resultado ok', r1.ok === true, JSON.stringify(r1));
  verificar('trae correoEnviado (boolean)', r1.ok === true && typeof r1.correoEnviado === 'boolean', r1.ok ? `correoEnviado=${r1.correoEnviado}` : '');
  const [u] = (await db.execute(sql`
    SELECT correo, correo_verificado, correo_verificado_at FROM usuarios WHERE id = ${a1.usuarioId}
  `)).rows as Array<{ correo: string; correo_verificado: boolean; correo_verificado_at: string | null }>;
  verificar('correo actualizado al nuevo', u?.correo === correoNuevo, u?.correo);
  verificar('correoVerificado = false', u?.correo_verificado === false);
  verificar('correoVerificadoAt = null', u?.correo_verificado_at === null);
  const [aud] = (await db.execute(sql`
    SELECT count(*)::int AS n FROM admin_auditoria WHERE entidad_id = ${a1.negocioId} AND accion = 'negocio_cambiar_correo_dueno'
  `)).rows as Array<{ n: number }>;
  verificar('auditoría registrada', (aud?.n ?? 0) >= 1, `n=${aud?.n}`);

  // ── 2) Correo ya en uso por otra cuenta → 409 ─────────────────────────────
  const r2 = await cambiarCorreoDueno(panelSuper, a1.negocioId, correo2);
  console.log('\n[2] Correo duplicado → 409');
  verificar('ok = false', r2.ok === false);
  verificar('status = 409', r2.ok === false && r2.status === 409, r2.ok === false ? String(r2.status) : 'ok');

  // ── 3) Gerente de otra región → 403 ───────────────────────────────────────
  const panelGerenteOtra: UsuarioPanel = {
    usuarioId: null, rolEquipo: 'gerente', regionId: '00000000-0000-0000-0000-000000000000',
    viaSecret: false, panel2faHabilitado: false, panel2faOk: true,
  };
  const r3 = await cambiarCorreoDueno(panelGerenteOtra, a1.negocioId, `cce.otro+${s}@dev.local`);
  console.log('\n[3] Gerente de otra región → 403');
  verificar('ok = false', r3.ok === false);
  verificar('status = 403', r3.ok === false && r3.status === 403, r3.ok === false ? String(r3.status) : 'ok');

  for (const c of [correo1, correo2, correoNuevo]) await limpiar(c);

  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => { console.error('Error en probar-cambiar-correo-dueno:', err); process.exit(1); });
