/**
 * probar-vencimiento-manual.ts — HARNESS (DEV) · Fase 3: expiración de negocios manuales
 * =====================================================================================
 * Encadena los dos crons sobre un negocio manual real:
 *   1) Alta manual → se fuerza fecha_vencimiento a AYER → corre expirarManualesVencidos()
 *      ⇒ queda `en_gracia` + fecha_inicio_gracia/fecha_limite_gracia fijadas + 1 aviso de gracia.
 *   2) Corre expirarManualesVencidos() OTRA VEZ ⇒ sigue habiendo 1 solo aviso (idempotente).
 *   3) Se fuerza fecha_limite_gracia a AYER → corre suspenderGraciasVencidas()
 *      ⇒ queda `suspendido` + activo=false + aviso de suspensión + aviso de gracia LIMPIADO.
 *
 * NO toca Stripe. Aborta en producción. Crea y limpia sus propios datos.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-vencimiento-manual.ts
 *
 * Ubicación: apps/api/scripts/probar-vencimiento-manual.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import type { AltaManualNegocioInput } from '../src/validations/admin/altaManualNegocio.schema.js';
import { altaManualNegocio } from '../src/services/admin/altaManualNegocio.service.js';
import { expirarManualesVencidos } from '../src/services/suscripciones/vencimientos-manuales.js';
import { suspenderGraciasVencidas } from '../src/services/suscripciones/gracia.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string) {
  if (!condicion) fallos++;
  console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

const panelSuper: UsuarioPanel = {
  usuarioId: null,
  rolEquipo: 'superadmin',
  regionId: null,
  viaSecret: true,
  panel2faHabilitado: false,
  panel2faOk: true,
};

const AYER = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

async function negocio(id: string) {
  const [n] = (await db.execute(sql`
    SELECT estado_membresia, activo, fecha_inicio_gracia, fecha_limite_gracia
    FROM negocios WHERE id = ${id}
  `)).rows as Array<{ estado_membresia: string; activo: boolean; fecha_inicio_gracia: string | null; fecha_limite_gracia: string | null }>;
  return n;
}

async function contarNotif(negocioId: string, tipo: string): Promise<number> {
  const [r] = (await db.execute(sql`
    SELECT count(*)::int AS n FROM notificaciones WHERE referencia_id = ${negocioId} AND tipo = ${tipo}
  `)).rows as Array<{ n: number }>;
  return r?.n ?? 0;
}

async function limpiar(correo: string) {
  const filas = (await db.execute(
    sql`SELECT negocio_id::text AS negocio_id FROM usuarios WHERE correo = ${correo}`,
  )).rows as Array<{ negocio_id: string | null }>;
  for (const f of filas) {
    if (f.negocio_id) {
      await db.execute(sql`DELETE FROM notificaciones WHERE referencia_id = ${f.negocio_id}`);
      await db.execute(sql`DELETE FROM admin_auditoria WHERE entidad_id = ${f.negocio_id}`);
    }
  }
  await db.execute(sql`DELETE FROM usuarios WHERE correo = ${correo}`);
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Fase 3 · expiración de negocios manuales ════════');

  const [ciudad] = (await db.execute(sql`
    SELECT id::text AS id, nombre FROM ciudades WHERE activa = true
    ORDER BY (region_id IS NOT NULL) DESC, importancia DESC LIMIT 1
  `)).rows as Array<{ id: string; nombre: string }>;
  if (!ciudad) { console.error('✗ No hay ciudades activas. Abortado.'); process.exit(1); }

  const sufijo = Date.now();
  const correo = `venc.manual.test+${sufijo}@dev.local`;
  const datos: AltaManualNegocioInput = {
    nombreNegocio: 'Negocio Vencimiento', ciudadId: ciudad.id,
    nombre: 'Dueño', apellidos: 'Vencimiento', correo, confirmarCorreo: correo,
    telefono: '+521234567890', concepto: 'efectivo', monto: 449, meses: 1, embajadorId: null,
  };

  await limpiar(correo);

  const alta = await altaManualNegocio(panelSuper, datos);
  if (!alta.ok) { console.error('✗ El alta manual falló:', JSON.stringify(alta)); await limpiar(correo); process.exit(1); }
  const id = alta.negocioId;

  // Forzar el vencimiento a ayer (simula que ya pasó su fecha_vencimiento).
  await db.execute(sql`UPDATE negocios SET fecha_vencimiento = ${AYER} WHERE id = ${id}`);

  // ── 1) Primera corrida del cron de manuales → en_gracia ───────────────────
  const r1 = await expirarManualesVencidos();
  console.log('\n[1] expirarManualesVencidos (1ª corrida)');
  verificar('al menos 1 en gracia', r1.enGracia >= 1, `enGracia=${r1.enGracia}`);
  const n1 = await negocio(id);
  verificar("estadoMembresia = 'en_gracia'", n1?.estado_membresia === 'en_gracia', n1?.estado_membresia);
  verificar('activo sigue true (no suspendido aún)', n1?.activo === true);
  verificar('fechaInicioGracia fijada', !!n1?.fecha_inicio_gracia);
  verificar('fechaLimiteGracia en el futuro', !!n1?.fecha_limite_gracia && new Date(n1.fecha_limite_gracia).getTime() > Date.now());
  verificar('1 aviso de gracia (membresia_en_gracia)', (await contarNotif(id, 'membresia_en_gracia')) === 1);

  // ── 2) Segunda corrida → idempotente (no duplica el aviso) ────────────────
  const r2 = await expirarManualesVencidos();
  console.log('\n[2] expirarManualesVencidos (2ª corrida · idempotencia)');
  verificar('no vuelve a procesarlo (enGracia=0)', r2.enGracia === 0, `enGracia=${r2.enGracia}`);
  verificar('sigue habiendo 1 solo aviso de gracia', (await contarNotif(id, 'membresia_en_gracia')) === 1);

  // ── 3) Vence la gracia → cron de gracia lo suspende ───────────────────────
  await db.execute(sql`UPDATE negocios SET fecha_limite_gracia = ${AYER} WHERE id = ${id}`);
  const r3 = await suspenderGraciasVencidas();
  console.log('\n[3] suspenderGraciasVencidas (hereda manuales)');
  verificar('al menos 1 suspendido', r3.suspendidos >= 1, `suspendidos=${r3.suspendidos}`);
  const n3 = await negocio(id);
  verificar("estadoMembresia = 'suspendido'", n3?.estado_membresia === 'suspendido', n3?.estado_membresia);
  verificar('activo = false', n3?.activo === false);
  verificar('1 aviso de suspensión (negocio_fuera_circulacion)', (await contarNotif(id, 'negocio_fuera_circulacion')) === 1);
  verificar('aviso de gracia limpiado (0)', (await contarNotif(id, 'membresia_en_gracia')) === 0);

  await limpiar(correo);

  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-vencimiento-manual:', err);
  process.exit(1);
});
