/**
 * probar-existe-correo.ts — HARNESS (DEV) · chequeo de correo en vivo (aviso temprano del alta)
 * =============================================================================================
 * Valida el service existeCorreo (detrás de GET /api/admin/negocios/existe-correo):
 *   1) Correo que NO existe → false.
 *   2) Correo que SÍ existe → true (mismo SELECT que el 409 del alta → el aviso predice el envío).
 *   3) Otro correo inexistente → false.
 *
 * Aborta en producción. Crea y limpia su propio usuario de prueba.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-existe-correo.ts
 *
 * Ubicación: apps/api/scripts/probar-existe-correo.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { existeCorreo } from '../src/services/admin/altaManualNegocio.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string) {
  if (!condicion) fallos++;
  console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Chequeo de correo en vivo (existeCorreo) ════════');

  const sufijo = Date.now();
  const correo = `existe.correo.test+${sufijo}@dev.local`;       // se inserta (debe dar true)
  const inexistente = `no.existe.test+${sufijo}@dev.local`;      // nunca se inserta (false)

  await db.execute(sql`DELETE FROM usuarios WHERE correo = ${correo}`);

  // 1) Antes de insertar → false
  verificar('correo inexistente → false', (await existeCorreo(correo)) === false);

  // Sembrar un usuario con ese correo (normalizado en minúsculas, como lo guarda el registro/alta)
  await db.execute(sql`
    INSERT INTO usuarios (nombre, apellidos, correo, perfil, estado, membresia)
    VALUES ('Test Existe', 'Prueba', ${correo}, 'personal', 'activo', 1)
  `);

  // 2) Ahora sí existe → true (mismo SELECT que usa el 409 del alta)
  verificar('correo existente → true', (await existeCorreo(correo)) === true);

  // 3) Otro correo que no se insertó → false
  verificar('otro correo inexistente → false', (await existeCorreo(inexistente)) === false);

  // Limpieza
  await db.execute(sql`DELETE FROM usuarios WHERE correo = ${correo}`);

  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-existe-correo:', err);
  process.exit(1);
});
