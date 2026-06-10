/**
 * probar-alta-tarjeta.ts — HARNESS (DEV) · no-regresión del alta por TARJETA
 * =========================================================================
 * Valida que el alta por tarjeta (webhook checkout.session.completed →
 * manejarCheckoutCompletado) crea el usuario dueño + negocio + sucursal principal
 * EXACTAMENTE igual. Es la red de seguridad del refactor que extrae el helper
 * crearNegocioConDueno: correr ANTES del refactor (baseline) y DESPUÉS (debe dar idéntico).
 *
 * Ejercita la ruta real: siembra Redis temp:registro:{correo}, fabrica un evento
 * checkout.session.completed firmado (generateTestHeaderString) e invoca procesarWebhook,
 * incluyendo verificación de firma e idempotencia. Verifica las 3 filas en BD.
 *
 * NO llama a la API de Stripe (customer/subscription son ids ficticios que el webhook solo
 * guarda como columnas). Aborta en producción. Crea y limpia sus propios datos.
 * EJECUTAR:  cd apps/api && pnpm exec tsx scripts/probar-alta-tarjeta.ts
 *
 * Ubicación: apps/api/scripts/probar-alta-tarjeta.ts
 */

import { config } from 'dotenv';
config();

import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import { redis } from '../src/db/redis.js';
import { stripe } from '../src/config/stripe.js';
import { env } from '../src/config/env.js';
import { procesarWebhook } from '../src/services/pago.service.js';

const ok = (b: boolean) => (b ? '✓' : '✗');

let fallos = 0;
function verificar(etiqueta: string, condicion: boolean, detalle?: string) {
  if (!condicion) fallos++;
  console.log(`    ${ok(condicion)} ${etiqueta}${detalle !== undefined ? `  → ${detalle}` : ''}`);
}

interface FilaUsuario {
  id: string;
  perfil: string;
  membresia: number;
  correo_verificado: boolean;
  estado: string;
  tiene_modo_comercial: boolean;
  modo_activo: string;
  autenticado_por_google: boolean;
  contrasena_hash: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  referido_por: string | null;
  negocio_id: string | null;
}
interface FilaNegocio {
  id: string;
  usuario_id: string;
  nombre: string;
  es_borrador: boolean;
  verificado: boolean;
  participa_puntos: boolean;
  metodo_cobro: string;
  estado_membresia: string;
  estado_admin: string;
  activo: boolean;
  embajador_id: string | null;
}
interface FilaSucursal {
  id: string;
  negocio_id: string;
  es_principal: boolean;
  ciudad: string;
  ciudad_id: string | null;
  activa: boolean;
}

async function limpiar(correo: string, sessionId: string, eventId: string) {
  await db.execute(sql`DELETE FROM usuarios WHERE correo = ${correo}`); // cascade: negocio + sucursal + pagos
  await redis.del(`temp:registro:${correo}`);
  await redis.del(`stripe:tokens:${sessionId}`);
  await redis.del(`stripe:session:${sessionId}`);
  await redis.del(`stripe:evt:${eventId}`);
}

async function main() {
  if (process.env.DB_ENVIRONMENT === 'production') {
    console.error('✗ Abortado: production.');
    process.exit(1);
  }

  const sufijo = Date.now();
  const correo = `alta.tarjeta.test+${sufijo}@dev.local`;
  const sessionId = `cs_test_alta_${sufijo}`;
  const eventId = `evt_test_alta_${sufijo}`;
  const customerId = `cus_test_${sufijo}`;
  const subscriptionId = `sub_test_${sufijo}`;
  const nombreNegocio = 'Negocio Alta Tarjeta';
  const contrasenaHash = '$2b$12$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWX0123456'; // hash ficticio (se guarda tal cual)

  console.log('\n════════ No-regresión · alta por TARJETA (webhook) ════════');

  // Limpieza defensiva por si quedó algo de una corrida anterior con ese correo (no debería: sufijo único).
  await limpiar(correo, sessionId, eventId);

  // 1) Sembrar Redis temp:registro:{correo} (lo que el webhook recupera con los datos del dueño).
  await redis.setex(
    `temp:registro:${correo}`,
    15 * 60,
    JSON.stringify({
      correo,
      nombre: 'Dueño',
      apellidos: 'De Prueba',
      telefono: '+521234567890',
      nombreNegocio,
      contrasenaHash,
      esRegistroGoogle: false,
      verificadoAt: new Date().toISOString(),
    }),
  );

  // 2) Evento checkout.session.completed firmado (firma válida: firmo y verifico con el mismo secret).
  const evento = {
    id: eventId,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        customer: customerId,
        subscription: subscriptionId,
        metadata: {
          tipo: 'registro_comercial',
          correo,
          nombreNegocio,
          nombre: 'Dueño',
          apellidos: 'De Prueba',
          telefono: '+521234567890',
        },
      },
    },
  };
  const payload = JSON.stringify(evento);
  const firma = stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET });

  // 3) Procesar el webhook como lo haría Stripe (incluye verificación de firma + idempotencia).
  await procesarWebhook(payload, firma);

  // 4) Verificar las 3 filas en BD.
  const [usuario] = (await db.execute(sql`
    SELECT id::text, perfil, membresia, correo_verificado, estado, tiene_modo_comercial, modo_activo,
           autenticado_por_google, contrasena_hash, stripe_customer_id, stripe_subscription_id,
           referido_por::text, negocio_id::text
    FROM usuarios WHERE correo = ${correo}
  `)).rows as unknown as FilaUsuario[];

  console.log('\n[usuario]');
  verificar('existe', !!usuario);
  if (usuario) {
    verificar("perfil = 'comercial'", usuario.perfil === 'comercial', usuario.perfil);
    verificar('membresia = 1', usuario.membresia === 1, String(usuario.membresia));
    verificar('correoVerificado = true', usuario.correo_verificado === true);
    verificar("estado = 'activo'", usuario.estado === 'activo', usuario.estado);
    verificar('tieneModoComercial = true', usuario.tiene_modo_comercial === true);
    verificar("modoActivo = 'comercial'", usuario.modo_activo === 'comercial', usuario.modo_activo);
    verificar('autenticadoPorGoogle = false', usuario.autenticado_por_google === false);
    verificar('contrasenaHash conservado', usuario.contrasena_hash === contrasenaHash);
    verificar('stripeCustomerId guardado', usuario.stripe_customer_id === customerId, usuario.stripe_customer_id ?? 'null');
    verificar('stripeSubscriptionId guardado', usuario.stripe_subscription_id === subscriptionId, usuario.stripe_subscription_id ?? 'null');
    verificar('referidoPor = null (sin código)', usuario.referido_por === null);
    verificar('negocioId enlazado', usuario.negocio_id !== null);
  }

  const [negocio] = usuario
    ? ((await db.execute(sql`
        SELECT id::text, usuario_id::text, nombre, es_borrador, verificado, participa_puntos,
               metodo_cobro, estado_membresia, estado_admin, activo, embajador_id::text
        FROM negocios WHERE usuario_id = ${usuario.id}
      `)).rows as unknown as FilaNegocio[])
    : [];

  console.log('\n[negocio]');
  verificar('existe', !!negocio);
  if (negocio) {
    verificar('nombre = nombreNegocio', negocio.nombre === nombreNegocio, negocio.nombre);
    verificar('esBorrador = true', negocio.es_borrador === true);
    verificar('verificado = false', negocio.verificado === false);
    verificar('participaPuntos = false', negocio.participa_puntos === false);
    verificar("metodoCobro = 'tarjeta'", negocio.metodo_cobro === 'tarjeta', negocio.metodo_cobro);
    verificar("estadoMembresia = 'al_corriente'", negocio.estado_membresia === 'al_corriente', negocio.estado_membresia);
    verificar("estadoAdmin = 'activo'", negocio.estado_admin === 'activo', negocio.estado_admin);
    verificar('activo = true', negocio.activo === true);
    verificar('embajadorId = null', negocio.embajador_id === null);
    verificar('negocioId del usuario coincide', usuario?.negocio_id === negocio.id);
  }

  const [sucursal] = negocio
    ? ((await db.execute(sql`
        SELECT id::text, negocio_id::text, es_principal, ciudad, ciudad_id::text, activa
        FROM negocio_sucursales WHERE negocio_id = ${negocio.id}
      `)).rows as unknown as FilaSucursal[])
    : [];

  console.log('\n[sucursal principal]');
  verificar('existe', !!sucursal);
  if (sucursal) {
    verificar('esPrincipal = true', sucursal.es_principal === true);
    verificar("ciudad = 'Por configurar'", sucursal.ciudad === 'Por configurar', sucursal.ciudad);
    verificar('ciudadId = null', sucursal.ciudad_id === null);
    verificar('activa = true', sucursal.activa === true);
  }

  // 5) Limpiar.
  await limpiar(correo, sessionId, eventId);

  console.log(`\n🧹 Limpieza hecha. Resultado: ${fallos === 0 ? 'TODO OK ✓' : `${fallos} fallo(s) ✗`}`);
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Error en probar-alta-tarjeta:', err);
  process.exit(1);
});
