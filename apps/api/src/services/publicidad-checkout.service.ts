/**
 * publicidad-checkout.service.ts
 * ==============================
 * Wizard self-service con Stripe (Fase 2): un usuario compra su propia publicidad y paga con
 * tarjeta. Flujo de pago ÚNICO (mode: 'payment', a diferencia de la membresía que es subscription):
 *
 *   1. crearCheckoutPublicidad → crea el anuncio en estado 'pendiente' (compra + piezas + ciudades)
 *      con su monto, y abre una Checkout Session de Stripe con metadata.tipo='compra_publicidad'.
 *   2. El usuario paga en Stripe → el webhook `checkout.session.completed` llama activarPublicidadPagada
 *      (lo enruta `manejarCheckoutCompletado` por metadata.tipo) → el anuncio pasa a 'activa', se le
 *      sella el folio (secuencia global) y el PaymentIntent. El recibo + correo se emiten en el módulo
 *      de Recibos.
 *
 * El carrusel público solo muestra 'activa', así que un 'pendiente' (pago abandonado) nunca se ve.
 *
 * Ubicación: apps/api/src/services/publicidad-checkout.service.ts
 */

import type Stripe from 'stripe';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stripe } from '../config/stripe.js';
import { env } from '../config/env.js';
import { calcularPrecioPublicidad, CARRUSELES_VALIDOS, type CarruselPub } from './publicidad-precio.service.js';
import { notificarCambioPublicidad } from './publicidad-realtime.js';
import { obtenerConfigNumero } from './configuracion.service.js';

export interface CheckoutInput {
    carruseles: CarruselPub[];
    imagenes: Partial<Record<CarruselPub, string>>;
    ciudadIds: string[];
    meses?: number;
}

export type ResultadoCheckout =
    | { ok: true; checkoutUrl: string; compraId: string; total: number }
    | { ok: false; status: number; mensaje: string };

const err = (status: number, mensaje: string): ResultadoCheckout => ({ ok: false, status, mensaje });

export async function crearCheckoutPublicidad(usuarioId: string, input: CheckoutInput): Promise<ResultadoCheckout> {
    // Carruseles (1..3) + imagen por carrusel.
    const carruseles = Array.from(new Set(input.carruseles));
    if (carruseles.length === 0) return err(400, 'Elige al menos un carrusel.');
    if (carruseles.some((c) => !CARRUSELES_VALIDOS.includes(c))) return err(400, 'Carrusel inválido.');
    for (const c of carruseles) {
        if (!input.imagenes[c]) return err(400, `Falta la imagen del carrusel "${c}".`);
    }

    // Ciudades: existen + activas, dentro del límite.
    const ciudadIds = Array.from(new Set(input.ciudadIds));
    if (ciudadIds.length === 0) return err(400, 'Elige al menos una ciudad.');
    const limite = await obtenerConfigNumero('publicidad_limite_ciudades', 10);
    if (ciudadIds.length > limite) return err(400, `Máximo ${limite} ciudades por anuncio.`);
    const idsSql = sql.join(ciudadIds.map((id) => sql`${id}::uuid`), sql`, `);
    const [{ activas }] = (await db.execute(sql`
        SELECT count(*)::int AS activas FROM ciudades WHERE id IN (${idsSql}) AND activa = true
    `)).rows as Array<{ activas: number }>;
    if (activas !== ciudadIds.length) return err(400, 'Alguna ciudad no existe o no está activa.');

    // Anunciante (correo para el recibo de Stripe).
    const [usuario] = (await db.execute(sql`
        SELECT correo, negocio_id::text AS negocio_id FROM usuarios WHERE id = ${usuarioId}::uuid LIMIT 1
    `)).rows as Array<{ correo: string; negocio_id: string | null }>;
    if (!usuario) return err(404, 'Usuario no encontrado.');

    // Precio + vigencia (según los meses pagados por adelantado).
    const meses = Math.max(1, Math.floor(input.meses ?? 1));
    const desglose = await calcularPrecioPublicidad(carruseles, ciudadIds.length, meses);
    if (desglose.total <= 0) return err(400, 'El precio configurado es 0; usa una cortesía desde el Panel.');
    // `duracion_dias` es informativa (meses × 30; el recibo deriva los meses de aquí).
    // La VIGENCIA real (expira_at) se suma por meses de CALENDARIO, no por 30 días/mes:
    // 12 meses = +1 año exacto, no 360 días (que caía ~5 días antes).
    const duracionBase = await obtenerConfigNumero('publicidad_duracion_dias', 30);
    const duracion = meses * duracionBase;
    const esCombo = carruseles.length === 2; // combo = los 2 tamaños (Grande + Chico); fundadores no se vende

    // Crea el anuncio PENDIENTE (compra + piezas + ciudades) en una transacción.
    let compraId = '';
    await db.transaction(async (tx) => {
        const [compra] = (await tx.execute(sql`
            INSERT INTO publicidad_compras
                (usuario_id, negocio_id, es_combo, estado, origen, metodo_cobro, monto,
                 duracion_dias, inicia_at, expira_at)
            VALUES
                (${usuarioId}, ${usuario.negocio_id}, ${esCombo}, 'pendiente', 'self', 'tarjeta', ${desglose.total},
                 ${duracion}, now(), now() + (${meses} || ' months')::interval)
            RETURNING id::text AS id
        `)).rows as Array<{ id: string }>;
        compraId = compra.id;
        for (const c of carruseles) {
            await tx.execute(sql`INSERT INTO publicidad_piezas (compra_id, carrusel, imagen_url) VALUES (${compraId}, ${c}, ${input.imagenes[c]})`);
        }
        for (const cid of ciudadIds) {
            await tx.execute(sql`INSERT INTO publicidad_compra_ciudades (compra_id, ciudad_id) VALUES (${compraId}, ${cid})`);
        }
    });

    // Checkout de pago único.
    const base = env.FRONTEND_URL?.replace(/\/$/, '') || '';
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
            {
                price_data: {
                    currency: 'mxn',
                    unit_amount: Math.round(desglose.total * 100),
                    product_data: {
                        name: esCombo ? 'Publicidad AnunciaYA — combo' : `Publicidad AnunciaYA — ${carruseles.join(', ')}`,
                        description: `${ciudadIds.length} ciudad(es) · ${meses} ${meses === 1 ? 'mes' : 'meses'}`,
                    },
                },
                quantity: 1,
            },
        ],
        customer_email: usuario.correo,
        metadata: { tipo: 'compra_publicidad', compraId, usuarioId },
        success_url: `${base}/perfil?tab=pagos&publicidad=exito`,
        cancel_url: `${base}/perfil?tab=pagos&publicidad=cancelado`,
        locale: 'es',
        // La sesión caduca en 1h (mín. de Stripe: 30 min); el cron borra los 'pendiente' abandonados.
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    if (!session.url) return err(502, 'No se pudo iniciar el pago.');
    return { ok: true, checkoutUrl: session.url, compraId, total: desglose.total };
}

/**
 * Activa un anuncio tras confirmarse su pago (lo llama el webhook por metadata.tipo). Idempotente y
 * defensivo (no lanza). Sella el folio (secuencia global) y el PaymentIntent.
 */
export async function activarPublicidadPagada(session: Stripe.Checkout.Session): Promise<void> {
    const compraId = session.metadata?.compraId;
    if (!compraId) {
        console.error('⚠️ Publicidad: checkout sin compraId en metadata:', session.id);
        return;
    }

    const [a] = (await db.execute(sql`SELECT estado, folio FROM publicidad_compras WHERE id = ${compraId}::uuid`)).rows as Array<{ estado: string; folio: number | null }>;
    if (!a) {
        console.error('⚠️ Publicidad: compra no encontrada al activar:', compraId);
        return;
    }
    if (a.estado === 'activa') return; // ya activada (idempotencia)

    let folio = a.folio;
    if (folio == null) {
        const [{ f }] = (await db.execute(sql`SELECT nextval('pagos_membresia_folio_seq')::int AS f`)).rows as Array<{ f: number }>;
        folio = f;
    }
    const pi = typeof session.payment_intent === 'string' ? session.payment_intent : null;

    await db.execute(sql`
        UPDATE publicidad_compras
        SET estado = 'activa', folio = ${folio}, stripe_payment_intent_id = ${pi}, updated_at = now()
        WHERE id = ${compraId}::uuid
    `);
    console.log(`✅ Publicidad activada por pago: ${compraId} (folio ${folio})`);
    notificarCambioPublicidad('self-service'); // aparece al instante en la columna tras el pago

    // Recibo PDF + correo al anunciante (best-effort: el pago ya quedó aplicado).
    try {
        const { prepararReciboPublicidad } = await import('./admin/recibo-publicidad.service.js');
        const { enviarComprobantePublicidad } = await import('../utils/email.js');
        const rec = await prepararReciboPublicidad(compraId, true);
        if (rec) {
            if (rec.reciboUrl) {
                await db.execute(sql`UPDATE publicidad_compras SET recibo_url = ${rec.reciboUrl} WHERE id = ${compraId}::uuid`);
            }
            if (rec.correo) {
                await enviarComprobantePublicidad(rec.correo, rec.nombre ?? '', {
                    titular: rec.titular, carruseles: rec.carruseles, concepto: rec.concepto,
                    monto: rec.monto, folio: rec.folio, hasta: rec.hasta, reciboUrl: rec.reciboUrl,
                });
            }
        }
    } catch (e) {
        console.error('Error emitiendo el recibo de publicidad (wizard):', e);
    }
}
