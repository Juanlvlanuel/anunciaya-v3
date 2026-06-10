/**
 * probar-login-sin-contrasena.ts — HARNESS (DEV) · Fase 2 auth
 * ============================================================
 * Valida el destrabe del login para cuentas SIN contraseña (alta manual, modelo C),
 * sin romper Google ni el login normal. 6 casos con datos reales:
 *   1) Login cuenta sin contraseña NO-Google      → 409 + errorCode CUENTA_SIN_CONTRASENA.
 *   2) Login cuenta Google (sin hash)             → 400 "usa Google/Facebook", SIN errorCode.
 *   3) solicitarRecuperacion cuenta sin contraseña→ correoRegistrado:true + código en Redis.
 *   4) solicitarRecuperacion cuenta Google        → esOAuth:true, NO genera código.
 *   5) Ciclo completo: define contraseña (código) → restablece → login OK.
 *   6) Regresión: cuenta con contraseña normal sigue logueando.
 *
 * NO toca Stripe. Aborta en producción. Crea y limpia sus propios datos.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-login-sin-contrasena.ts
 *
 * Ubicación: apps/api/scripts/probar-login-sin-contrasena.ts
 */

import { config } from 'dotenv';
config();

import bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { usuarios } from '../src/db/schemas/schema.js';
import { redis } from '../src/db/redis.js';
import { loginUsuario, solicitarRecuperacion, restablecerContrasena } from '../src/services/auth.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');
let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string) {
  if (!condicion) fallos++;
  console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

async function crearUsuario(opts: {
  correo: string;
  contrasenaHash: string | null;
  autenticadoPorGoogle: boolean;
}) {
  await db.insert(usuarios).values({
    nombre: 'Login',
    apellidos: 'Prueba',
    correo: opts.correo,
    contrasenaHash: opts.contrasenaHash,
    autenticadoPorGoogle: opts.autenticadoPorGoogle,
    correoVerificado: true,
    correoVerificadoAt: new Date().toISOString(),
    estado: 'activo',
    perfil: 'personal',
  });
}

async function limpiar(...correos: string[]) {
  for (const correo of correos) {
    await db.execute(sql`DELETE FROM usuarios WHERE correo = ${correo}`);
    await redis.del(`recovery:${correo}`);
  }
}

async function codigoEnRedis(correo: string): Promise<string | null> {
  const raw = await redis.get(`recovery:${correo}`);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { codigo: string }).codigo;
  } catch {
    return null;
  }
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  const s = Date.now();
  const cSinPass = `login.sinpass.test+${s}@dev.local`;
  const cGoogle = `login.google.test+${s}@dev.local`;
  const cCiclo = `login.ciclo.test+${s}@dev.local`;
  const cNormal = `login.normal.test+${s}@dev.local`;

  console.log('\n════════ Fase 2 · login de cuentas sin contraseña ════════');
  await limpiar(cSinPass, cGoogle, cCiclo, cNormal);

  // Sembrar cuentas de prueba.
  await crearUsuario({ correo: cSinPass, contrasenaHash: null, autenticadoPorGoogle: false }); // alta manual
  await crearUsuario({ correo: cGoogle, contrasenaHash: null, autenticadoPorGoogle: true });    // Google
  await crearUsuario({ correo: cCiclo, contrasenaHash: null, autenticadoPorGoogle: false });    // alta manual (ciclo)
  await crearUsuario({ correo: cNormal, contrasenaHash: await bcrypt.hash('PassNormal123', 12), autenticadoPorGoogle: false });

  // ── 1) Login cuenta sin contraseña no-Google → 409 + CUENTA_SIN_CONTRASENA ──
  const r1 = await loginUsuario({ correo: cSinPass, contrasena: 'LoQueSea123' });
  console.log('\n[1] Login cuenta sin contraseña (no-Google)');
  verificar('success = false', r1.success === false);
  verificar('code = 409', r1.code === 409, String(r1.code));
  verificar("errorCode = 'CUENTA_SIN_CONTRASENA'", r1.errorCode === 'CUENTA_SIN_CONTRASENA', r1.errorCode ?? 'undefined');

  // ── 2) Login cuenta Google → 400 mensaje Google, sin errorCode ─────────────
  const r2 = await loginUsuario({ correo: cGoogle, contrasena: 'LoQueSea123' });
  console.log('\n[2] Login cuenta Google');
  verificar('success = false', r2.success === false);
  verificar('code = 400', r2.code === 400, String(r2.code));
  verificar('SIN errorCode', r2.errorCode === undefined, r2.errorCode ?? 'undefined');
  verificar('mensaje menciona Google', /Google/.test(r2.message));

  // ── 3) solicitarRecuperacion cuenta sin contraseña → genera código ─────────
  const r3 = await solicitarRecuperacion({ correo: cSinPass });
  console.log('\n[3] solicitarRecuperacion cuenta sin contraseña');
  verificar('success = true', r3.success === true);
  verificar('correoRegistrado = true', r3.correoRegistrado === true);
  verificar('esOAuth no marcado', !r3.esOAuth);
  verificar('código guardado en Redis', (await codigoEnRedis(cSinPass)) !== null);

  // ── 4) solicitarRecuperacion cuenta Google → esOAuth, sin código ───────────
  const r4 = await solicitarRecuperacion({ correo: cGoogle });
  console.log('\n[4] solicitarRecuperacion cuenta Google');
  verificar('success = true', r4.success === true);
  verificar('esOAuth = true', r4.esOAuth === true);
  verificar('correoRegistrado = false', r4.correoRegistrado === false);
  verificar('NO generó código en Redis', (await codigoEnRedis(cGoogle)) === null);

  // ── 5) Ciclo completo: define contraseña → login OK ────────────────────────
  console.log('\n[5] Ciclo: definir contraseña por primera vez → login');
  const r5a = await solicitarRecuperacion({ correo: cCiclo });
  verificar('solicitud ok (correoRegistrado)', r5a.success === true && r5a.correoRegistrado === true);
  const codigo = await codigoEnRedis(cCiclo);
  verificar('código disponible', !!codigo, codigo ?? 'null');
  if (codigo) {
    const r5b = await restablecerContrasena({ correo: cCiclo, codigo, nuevaContrasena: 'MiNuevaPass123' });
    verificar('restablecer ok', r5b.success === true, r5b.message);
    const [u] = (await db.execute(
      sql`SELECT contrasena_hash FROM usuarios WHERE correo = ${cCiclo}`,
    )).rows as Array<{ contrasena_hash: string | null }>;
    verificar('contrasenaHash ya NO es null', u?.contrasena_hash !== null);
    const r5c = await loginUsuario({ correo: cCiclo, contrasena: 'MiNuevaPass123' });
    verificar('login con la nueva contraseña entra', r5c.success === true, r5c.message);
  }

  // ── 6) Regresión: login normal sigue funcionando ──────────────────────────
  const r6 = await loginUsuario({ correo: cNormal, contrasena: 'PassNormal123' });
  console.log('\n[6] Regresión: login normal');
  verificar('login normal entra', r6.success === true, r6.message);

  await limpiar(cSinPass, cGoogle, cCiclo, cNormal);

  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-login-sin-contrasena:', err);
  process.exit(1);
});
