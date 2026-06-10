/**
 * probar-alta-manual.ts — HARNESS (DEV) · alta manual de negocio en efectivo
 * =========================================================================
 * Ejercita el service altaManualNegocio con datos reales en BD:
 *   1) Superadmin da de alta un negocio en efectivo → verifica usuario (sin contraseña) +
 *      negocio (metodo_cobro='manual', fechas) + sucursal (ciudad_id REAL) + pago en pagos_membresia.
 *   2) Repetir con el MISMO correo → 409 (correo ya existe).
 *   3) Gerente de OTRA región intenta la misma ciudad → 403 (ciudad fuera de su región).
 *   4) listarCatalogoCiudades devuelve la ciudad elegida.
 *
 * NO toca Stripe. Aborta en producción. Crea y limpia sus propios datos.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-alta-manual.ts
 *
 * Ubicación: apps/api/scripts/probar-alta-manual.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import type { UsuarioPanel } from '../src/middleware/panel.middleware.js';
import type { AltaManualNegocioInput } from '../src/validations/admin/altaManualNegocio.schema.js';
import { altaManualNegocio, listarCatalogoCiudades } from '../src/services/admin/altaManualNegocio.service.js';
import { restablecerContrasena, loginUsuario } from '../src/services/auth.service.js';
import { guardarCodigoRecuperacion } from '../src/utils/tokenStore.js';

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

async function limpiar(correo: string) {
  const filas = (await db.execute(
    sql`SELECT negocio_id::text AS negocio_id FROM usuarios WHERE correo = ${correo}`,
  )).rows as Array<{ negocio_id: string | null }>;
  for (const f of filas) {
    if (f.negocio_id) await db.execute(sql`DELETE FROM admin_auditoria WHERE entidad_id = ${f.negocio_id}`);
  }
  await db.execute(sql`DELETE FROM usuarios WHERE correo = ${correo}`); // cascade: negocio + sucursal + pagos
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  console.log('\n════════ Alta MANUAL de negocio (efectivo) ════════');

  // Ciudad real para el alta (preferir una con región asignada, para el test de candado).
  const [ciudad] = (await db.execute(sql`
    SELECT id::text AS id, nombre, region_id::text AS region_id
    FROM ciudades
    WHERE activa = true
    ORDER BY (region_id IS NOT NULL) DESC, importancia DESC
    LIMIT 1
  `)).rows as Array<{ id: string; nombre: string; region_id: string | null }>;

  if (!ciudad) {
    console.error('✗ No hay ciudades activas en la BD (corre seed-ciudades.ts). Abortado.');
    process.exit(1);
  }
  console.log(`Ciudad de prueba: ${ciudad.nombre} (${ciudad.id})  región=${ciudad.region_id ?? 'null'}`);

  const sufijo = Date.now();
  const correo = `alta.manual.test+${sufijo}@dev.local`;
  const datos: AltaManualNegocioInput = {
    nombreNegocio: 'Negocio Alta Manual',
    ciudadId: ciudad.id,
    nombre: 'Dueño',
    apellidos: 'Manual',
    correo,
    confirmarCorreo: correo,
    telefono: '+521234567890',
    concepto: 'efectivo',
    monto: 449,
    meses: 3,
    embajadorId: null,
  };

  await limpiar(correo);

  // ── 1) Alta como superadmin ──────────────────────────────────────────────
  const r1 = await altaManualNegocio(panelSuper, datos);
  console.log('\n[1] Alta superadmin');
  verificar('resultado ok', r1.ok === true, JSON.stringify(r1));

  if (r1.ok) {
    const [u] = (await db.execute(sql`
      SELECT id::text, perfil, correo_verificado, contrasena_hash, requiere_cambio_contrasena,
             stripe_customer_id, stripe_subscription_id, tiene_modo_comercial, modo_activo, negocio_id::text
      FROM usuarios WHERE id = ${r1.usuarioId}
    `)).rows as Array<{
      id: string; perfil: string; correo_verificado: boolean; contrasena_hash: string | null;
      requiere_cambio_contrasena: boolean; stripe_customer_id: string | null; stripe_subscription_id: string | null;
      tiene_modo_comercial: boolean; modo_activo: string; negocio_id: string | null;
    }>;
    console.log('  [usuario]');
    verificar("perfil = 'comercial'", u?.perfil === 'comercial', u?.perfil);
    verificar('contrasenaHash = null (sin contraseña)', u?.contrasena_hash === null);
    verificar('requiereCambioContrasena = false', u?.requiere_cambio_contrasena === false);
    verificar('correoVerificado = false (modelo C: se verifica al crear contraseña)', u?.correo_verificado === false);
    verificar('sin stripeCustomerId', u?.stripe_customer_id === null);
    verificar('sin stripeSubscriptionId', u?.stripe_subscription_id === null);
    verificar('tieneModoComercial = true', u?.tiene_modo_comercial === true);
    verificar("modoActivo = 'comercial'", u?.modo_activo === 'comercial', u?.modo_activo);
    verificar('negocioId enlazado', u?.negocio_id === r1.negocioId);

    const [n] = (await db.execute(sql`
      SELECT metodo_cobro, estado_membresia, estado_admin, activo, es_borrador, embajador_id::text,
             fecha_vencimiento, fecha_proximo_cobro, fecha_primer_pago::text
      FROM negocios WHERE id = ${r1.negocioId}
    `)).rows as Array<{
      metodo_cobro: string; estado_membresia: string; estado_admin: string; activo: boolean;
      es_borrador: boolean; embajador_id: string | null; fecha_vencimiento: string | null;
      fecha_proximo_cobro: string | null; fecha_primer_pago: string | null;
    }>;
    console.log('  [negocio]');
    verificar("metodoCobro = 'manual'", n?.metodo_cobro === 'manual', n?.metodo_cobro);
    verificar("estadoMembresia = 'al_corriente'", n?.estado_membresia === 'al_corriente', n?.estado_membresia);
    verificar("estadoAdmin = 'activo'", n?.estado_admin === 'activo', n?.estado_admin);
    verificar('activo = true', n?.activo === true);
    verificar('esBorrador = true', n?.es_borrador === true);
    verificar('embajadorId = null', n?.embajador_id === null);
    verificar('fechaVencimiento en el futuro', !!n?.fecha_vencimiento && new Date(n.fecha_vencimiento).getTime() > Date.now());
    verificar('fechaProximoCobro = fechaVencimiento', n?.fecha_proximo_cobro === n?.fecha_vencimiento);
    verificar('fechaPrimerPago seteada (hoy)', !!n?.fecha_primer_pago);

    const [s] = (await db.execute(sql`
      SELECT es_principal, ciudad, ciudad_id::text, activa
      FROM negocio_sucursales WHERE negocio_id = ${r1.negocioId}
    `)).rows as Array<{ es_principal: boolean; ciudad: string; ciudad_id: string | null; activa: boolean }>;
    console.log('  [sucursal]');
    verificar('esPrincipal = true', s?.es_principal === true);
    verificar('ciudad = nombre real', s?.ciudad === ciudad.nombre, s?.ciudad);
    verificar('ciudadId = id real (visible al Panel regional)', s?.ciudad_id === ciudad.id);
    verificar('activa = true', s?.activa === true);

    const [p] = (await db.execute(sql`
      SELECT monto::text, concepto, meses_cubiertos, periodo_hasta, registrado_por::text
      FROM pagos_membresia WHERE negocio_id = ${r1.negocioId}
    `)).rows as Array<{
      monto: string | null; concepto: string; meses_cubiertos: number | null;
      periodo_hasta: string | null; registrado_por: string | null;
    }>;
    console.log('  [pagos_membresia]');
    verificar('1 pago registrado', !!p);
    verificar('monto = 449', p?.monto === '449' || p?.monto === '449.00', p?.monto ?? 'null');
    verificar("concepto = 'efectivo'", p?.concepto === 'efectivo', p?.concepto);
    verificar('mesesCubiertos = 3', p?.meses_cubiertos === 3, String(p?.meses_cubiertos));
    verificar('periodoHasta = fechaVencimiento', p?.periodo_hasta === n?.fecha_vencimiento);
  }

  // ── 2) Mismo correo → 409 ────────────────────────────────────────────────
  const r2 = await altaManualNegocio(panelSuper, datos);
  console.log('\n[2] Correo duplicado → 409');
  verificar('ok = false', r2.ok === false);
  verificar('status = 409', r2.ok === false && r2.status === 409, r2.ok === false ? String(r2.status) : 'ok');

  // ── 3) Gerente de OTRA región → 403 ──────────────────────────────────────
  const panelGerenteOtraRegion: UsuarioPanel = {
    usuarioId: null,
    rolEquipo: 'gerente',
    regionId: '00000000-0000-0000-0000-000000000000', // región inexistente ≠ la de la ciudad
    viaSecret: false,
    panel2faHabilitado: false,
    panel2faOk: true,
  };
  const correo3 = `alta.manual.test+${sufijo}b@dev.local`;
  const r3 = await altaManualNegocio(panelGerenteOtraRegion, { ...datos, correo: correo3, confirmarCorreo: correo3 });
  console.log('\n[3] Gerente de otra región → 403');
  verificar('ok = false', r3.ok === false);
  verificar('status = 403', r3.ok === false && r3.status === 403, r3.ok === false ? String(r3.status) : 'ok');

  // ── 4) Catálogo de ciudades incluye la elegida ───────────────────────────
  const catalogo = await listarCatalogoCiudades(panelSuper);
  console.log('\n[4] Catálogo de ciudades (superadmin)');
  verificar('lista no vacía', catalogo.length > 0, `${catalogo.length} ciudades`);
  verificar('incluye la ciudad de prueba', catalogo.some((c) => c.id === ciudad.id));

  // ── 5) Cortesía → pago sin monto (CHECK cortesia_sin_monto) ───────────────
  const correoCort = `alta.manual.test+${sufijo}cort@dev.local`;
  await limpiar(correoCort);
  const rCort = await altaManualNegocio(panelSuper, {
    ...datos,
    correo: correoCort,
    confirmarCorreo: correoCort,
    concepto: 'cortesia',
    monto: undefined, // cortesía: sin monto
    meses: 6,
  });
  console.log('\n[5] Cortesía (sin monto)');
  verificar('resultado ok', rCort.ok === true, JSON.stringify(rCort));
  if (rCort.ok) {
    const [nc] = (await db.execute(sql`
      SELECT fecha_vencimiento, fecha_proximo_cobro, fecha_primer_pago::text
      FROM negocios WHERE id = ${rCort.negocioId}
    `)).rows as Array<{ fecha_vencimiento: string | null; fecha_proximo_cobro: string | null; fecha_primer_pago: string | null }>;
    verificar('fechaVencimiento en el futuro', !!nc?.fecha_vencimiento && new Date(nc.fecha_vencimiento).getTime() > Date.now());
    verificar('fechaProximoCobro = fechaVencimiento', nc?.fecha_proximo_cobro === nc?.fecha_vencimiento);
    verificar('fechaPrimerPago = null (no hubo cobro)', nc?.fecha_primer_pago === null, nc?.fecha_primer_pago ?? 'null');

    const [pc] = (await db.execute(sql`
      SELECT monto::text, concepto, meses_cubiertos
      FROM pagos_membresia WHERE negocio_id = ${rCort.negocioId}
    `)).rows as Array<{ monto: string | null; concepto: string; meses_cubiertos: number | null }>;
    verificar('1 pago registrado', !!pc);
    verificar('monto = null (CHECK cortesia_sin_monto)', pc?.monto === null, pc?.monto ?? 'null');
    verificar("concepto = 'cortesia'", pc?.concepto === 'cortesia', pc?.concepto);
    verificar('mesesCubiertos = 6', pc?.meses_cubiertos === 6, String(pc?.meses_cubiertos));
  }

  // ── 6) Crear contraseña marca verificado + login entra (modelo C, E2E) ────
  // Reusa el dueño del [1] (correoVerificado=false, sin contraseña). Simula el código
  // sin depender de SES: lo guarda en Redis y luego define la contraseña.
  console.log('\n[6] Crear contraseña → correo verificado → login entra');
  const codigoCrear = '654321';
  const nuevaPass = 'Prueba1234';
  await guardarCodigoRecuperacion(correo, codigoCrear);
  const rReset = await restablecerContrasena({ correo, codigo: codigoCrear, nuevaContrasena: nuevaPass });
  verificar('restablecer/crear contraseña ok', rReset.success === true, JSON.stringify(rReset));
  const [uPost] = (await db.execute(sql`
    SELECT correo_verificado, correo_verificado_at, contrasena_hash
    FROM usuarios WHERE correo = ${correo}
  `)).rows as Array<{ correo_verificado: boolean; correo_verificado_at: string | null; contrasena_hash: string | null }>;
  verificar('correoVerificado = true tras crear contraseña', uPost?.correo_verificado === true);
  verificar('correoVerificadoAt seteado', !!uPost?.correo_verificado_at);
  verificar('contrasenaHash seteado', !!uPost?.contrasena_hash);
  const rLogin = await loginUsuario({ correo, contrasena: nuevaPass });
  verificar('login entra (success, sin 403/409)', rLogin.success === true, rLogin.success ? 'ok' : `code=${rLogin.code}`);

  // Limpieza (los correos 3 no crearon nada porque fallaron antes de insertar).
  await limpiar(correo);
  await limpiar(correo3);
  await limpiar(correoCort);

  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-alta-manual:', err);
  process.exit(1);
});
