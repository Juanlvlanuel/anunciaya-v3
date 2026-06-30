/**
 * publicidad-renovacion.service.ts
 * ================================
 * Renovar / extender un anuncio de publicidad pagado (desde Mi Perfil). Pago ÚNICO con Stripe, igual
 * que el wizard, pero en vez de crear un anuncio nuevo EXTIENDE la vigencia de uno existente.
 *
 * Modelo: cada renovación es una fila NUEVA en `publicidad_compras` con `renovacion_de` = el anuncio
 * original (su propio folio + recibo → aparece en Recibos del Panel). Esa fila NO se muestra como
 * anuncio (el carrusel público y el Panel la excluyen por `renovacion_de`). Al confirmarse el pago:
 *   1. se sella la fila de renovación (activa + folio + PaymentIntent) — es solo registro de pago,
 *   2. se aplican al ORIGINAL los carruseles/imágenes/ciudades elegidos (reconciliación, conserva clics),
 *   3. se EXTIENDE el `expira_at` del original: `GREATEST(expira_at, now()) + meses` → si sigue vigente
 *      no pierde días; si ya venció, cuenta desde hoy. Reactiva si estaba vencido/pausado.
 *
 * Ubicación: apps/api/src/services/publicidad-renovacion.service.ts
 */

import type Stripe from 'stripe';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { stripe } from '../config/stripe.js';
import { env } from '../config/env.js';
import { calcularPrecioPublicidad, CARRUSELES_VALIDOS, type CarruselPub } from './publicidad-precio.service.js';
import { obtenerConfigNumero } from './configuracion.service.js';

export interface RenovacionInput {
    carruseles: CarruselPub[];
    imagenes: Partial<Record<CarruselPub, string>>;
    ciudadIds: string[];
    meses?: number;
}

export type ResultadoRenovacion =
    | { ok: true; checkoutUrl: string; renovacionId: string; total: number }
    | { ok: false; status: number; mensaje: string };

const err = (status: number, mensaje: string): ResultadoRenovacion => ({ ok: false, status, mensaje });

const LABEL: Record<CarruselPub, string> = { patrocinadores: 'Grande', anuncios: 'Chico' };

/**
 * Reconcilia las piezas (carruseles+imágenes, conservando clics de las que se mantienen) y las ciudades
 * (reemplazo completo) de una compra, y actualiza `es_combo`. Misma lógica que `editarAnuncio` del Panel
 * — se invoca dentro de una transacción (`tx`). NO toca monto/folio/recibo.
 */
export async function reconciliarPiezasYCiudades(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    compraId: string,
    carruseles: CarruselPub[],
    imagenes: Partial<Record<CarruselPub, string>>,
    ciudadIds: string[],
): Promise<void> {
    const actuales = (await tx.execute(sql`SELECT carrusel, imagen_url FROM publicidad_piezas WHERE compra_id = ${compraId}::uuid`)).rows as Array<{ carrusel: string; imagen_url: string }>;
    const actualesMap = new Map(actuales.map((p) => [p.carrusel, p.imagen_url]));

    for (const p of actuales) {
        if (!carruseles.includes(p.carrusel as CarruselPub)) {
            await tx.execute(sql`DELETE FROM publicidad_piezas WHERE compra_id = ${compraId}::uuid AND carrusel = ${p.carrusel}`);
        }
    }
    for (const c of carruseles) {
        const nueva = imagenes[c]!;
        if (!actualesMap.has(c)) {
            await tx.execute(sql`INSERT INTO publicidad_piezas (compra_id, carrusel, imagen_url) VALUES (${compraId}::uuid, ${c}, ${nueva})`);
        } else if (actualesMap.get(c) !== nueva) {
            await tx.execute(sql`UPDATE publicidad_piezas SET imagen_url = ${nueva} WHERE compra_id = ${compraId}::uuid AND carrusel = ${c}`);
        }
    }

    await tx.execute(sql`DELETE FROM publicidad_compra_ciudades WHERE compra_id = ${compraId}::uuid`);
    for (const cid of ciudadIds) {
        await tx.execute(sql`INSERT INTO publicidad_compra_ciudades (compra_id, ciudad_id) VALUES (${compraId}::uuid, ${cid}::uuid)`);
    }

    await tx.execute(sql`UPDATE publicidad_compras SET es_combo = ${carruseles.length >= 2}, updated_at = now() WHERE id = ${compraId}::uuid`);
}

export interface AnuncioRenovable {
    id: string;
    carruseles: CarruselPub[];
    imagenes: Record<string, string>;   // carrusel → imagen_url (R2) del anuncio actual
    ciudadIds: string[];
    expiraAt: string | null;
    estado: string;
}

/**
 * Datos de un anuncio del usuario para PRECARGAR el wizard de renovación (tamaños, imágenes, ciudades,
 * vigencia). Valida propiedad y que sea renovable (no cancelado/pendiente, no es a su vez renovación).
 */
export async function obtenerAnuncioRenovable(
    usuarioId: string,
    compraId: string,
): Promise<{ ok: true; anuncio: AnuncioRenovable } | { ok: false; status: number; mensaje: string }> {
    const [orig] = (await db.execute(sql`
        SELECT id::text AS id, usuario_id::text AS usuario_id, estado, renovacion_de::text AS renovacion_de, expira_at::text AS expira_at
        FROM publicidad_compras WHERE id = ${compraId}::uuid LIMIT 1
    `)).rows as Array<{ id: string; usuario_id: string; estado: string; renovacion_de: string | null; expira_at: string | null }>;
    if (!orig) return { ok: false, status: 404, mensaje: 'Anuncio no encontrado.' };
    if (orig.usuario_id !== usuarioId) return { ok: false, status: 403, mensaje: 'Este anuncio no es tuyo.' };
    if (orig.renovacion_de) return { ok: false, status: 400, mensaje: 'Ese registro es un pago de renovación.' };
    if (orig.estado === 'cancelada') return { ok: false, status: 409, mensaje: 'El anuncio está cancelado.' };
    if (orig.estado === 'pendiente') return { ok: false, status: 409, mensaje: 'El anuncio aún no está activo.' };

    const piezas = (await db.execute(sql`SELECT carrusel, imagen_url FROM publicidad_piezas WHERE compra_id = ${compraId}::uuid`)).rows as Array<{ carrusel: string; imagen_url: string }>;
    const ciudadFilas = (await db.execute(sql`SELECT ciudad_id::text AS ciudad_id FROM publicidad_compra_ciudades WHERE compra_id = ${compraId}::uuid`)).rows as Array<{ ciudad_id: string }>;
    const imagenes: Record<string, string> = {};
    for (const p of piezas) imagenes[p.carrusel] = p.imagen_url;

    return {
        ok: true,
        anuncio: {
            id: orig.id,
            carruseles: piezas.map((p) => p.carrusel as CarruselPub),
            imagenes,
            ciudadIds: ciudadFilas.map((c) => c.ciudad_id),
            expiraAt: orig.expira_at,
            estado: orig.estado,
        },
    };
}

/**
 * Inicia la renovación de un anuncio del usuario: valida propiedad/estado, recalcula el precio VIGENTE
 * hoy con los carruseles/ciudades/meses elegidos, crea la fila de renovación `pendiente` (con sus piezas
 * y ciudades) y abre Stripe Checkout (pago único). El webhook la activa y extiende el original.
 */
export async function crearCheckoutRenovacion(usuarioId: string, compraOriginalId: string, input: RenovacionInput): Promise<ResultadoRenovacion> {
    // Carruseles (1..2 válidos) + imagen por carrusel.
    const carruseles = Array.from(new Set(input.carruseles));
    if (carruseles.length === 0) return err(400, 'Elige al menos un tamaño.');
    if (carruseles.some((c) => !CARRUSELES_VALIDOS.includes(c))) return err(400, 'Tamaño inválido.');
    for (const c of carruseles) {
        if (!input.imagenes[c]) return err(400, `Falta la imagen del tamaño "${c}".`);
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

    // Anuncio original: existe, es del usuario, renovable (no cancelado, no pendiente, no es a su vez renovación).
    const [orig] = (await db.execute(sql`
        SELECT id::text AS id, usuario_id::text AS usuario_id, negocio_id::text AS negocio_id, estado, renovacion_de::text AS renovacion_de
        FROM publicidad_compras WHERE id = ${compraOriginalId}::uuid LIMIT 1
    `)).rows as Array<{ id: string; usuario_id: string; negocio_id: string | null; estado: string; renovacion_de: string | null }>;
    if (!orig) return err(404, 'Anuncio no encontrado.');
    if (orig.usuario_id !== usuarioId) return err(403, 'Este anuncio no es tuyo.');
    if (orig.renovacion_de) return err(400, 'Ese registro es un pago de renovación, no un anuncio.');
    if (orig.estado === 'cancelada') return err(409, 'El anuncio está cancelado; no se puede renovar.');
    if (orig.estado === 'pendiente') return err(409, 'El anuncio aún no está activo.');

    const [usuario] = (await db.execute(sql`SELECT correo FROM usuarios WHERE id = ${usuarioId}::uuid LIMIT 1`)).rows as Array<{ correo: string }>;
    if (!usuario) return err(404, 'Usuario no encontrado.');

    // Precio VIGENTE hoy (mismo cálculo que el wizard: respeta lanzamiento, combo, tramos y periodos).
    const meses = Math.max(1, Math.floor(input.meses ?? 1));
    const desglose = await calcularPrecioPublicidad(carruseles, ciudadIds.length, meses);
    if (desglose.total <= 0) return err(400, 'El precio configurado es 0; no se puede cobrar.');

    const duracionBase = await obtenerConfigNumero('publicidad_duracion_dias', 30);
    const duracion = meses * duracionBase;
    const esCombo = carruseles.length >= 2;

    // Crea la fila de RENOVACIÓN (pendiente) con sus piezas/ciudades y `renovacion_de`. El `expira_at`
    // aquí es provisional (el CHECK exige expira>inicia); la vigencia real se calcula al activar y se
    // copia a esta fila para que su recibo muestre el "hasta" correcto.
    let renovacionId = '';
    await db.transaction(async (tx) => {
        const [r] = (await tx.execute(sql`
            INSERT INTO publicidad_compras
                (usuario_id, negocio_id, es_combo, estado, origen, metodo_cobro, monto,
                 duracion_dias, inicia_at, expira_at, renovacion_de)
            VALUES
                (${usuarioId}, ${orig.negocio_id}, ${esCombo}, 'pendiente', 'self', 'tarjeta', ${desglose.total},
                 ${duracion}, now(), now() + (${meses} || ' months')::interval, ${compraOriginalId}::uuid)
            RETURNING id::text AS id
        `)).rows as Array<{ id: string }>;
        renovacionId = r.id;
        for (const c of carruseles) {
            await tx.execute(sql`INSERT INTO publicidad_piezas (compra_id, carrusel, imagen_url) VALUES (${renovacionId}::uuid, ${c}, ${input.imagenes[c]})`);
        }
        for (const cid of ciudadIds) {
            await tx.execute(sql`INSERT INTO publicidad_compra_ciudades (compra_id, ciudad_id) VALUES (${renovacionId}::uuid, ${cid}::uuid)`);
        }
    });

    const base = env.FRONTEND_URL?.replace(/\/$/, '') || '';
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
            {
                price_data: {
                    currency: 'mxn',
                    unit_amount: Math.round(desglose.total * 100),
                    product_data: {
                        name: `Renovación de publicidad — ${carruseles.map((c) => LABEL[c]).join(', ')}`,
                        description: `${ciudadIds.length} ciudad(es) · ${meses} ${meses === 1 ? 'mes' : 'meses'}`,
                    },
                },
                quantity: 1,
            },
        ],
        customer_email: usuario.correo,
        metadata: { tipo: 'renovacion_publicidad', renovacionId, compraOriginalId, usuarioId, meses: String(meses) },
        success_url: `${base}/perfil?publicidad=renovada`,
        cancel_url: `${base}/perfil?publicidad=cancelado`,
        locale: 'es',
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    if (!session.url) return err(502, 'No se pudo iniciar el pago.');
    return { ok: true, checkoutUrl: session.url, renovacionId, total: desglose.total };
}

/**
 * Activa una renovación tras confirmarse su pago (la llama el webhook por `metadata.tipo`). Idempotente
 * y defensiva. Sella la fila de renovación, extiende la vigencia del original y le aplica los cambios.
 */
export async function activarRenovacionPublicidad(session: Stripe.Checkout.Session): Promise<void> {
    const renovacionId = session.metadata?.renovacionId;
    const compraOriginalId = session.metadata?.compraOriginalId;
    const meses = Math.max(1, parseInt(session.metadata?.meses ?? '1', 10) || 1);
    if (!renovacionId || !compraOriginalId) {
        console.error('⚠️ Renovación: metadata incompleta:', session.id);
        return;
    }

    const [r] = (await db.execute(sql`SELECT estado, folio FROM publicidad_compras WHERE id = ${renovacionId}::uuid`)).rows as Array<{ estado: string; folio: number | null }>;
    if (!r) {
        console.error('⚠️ Renovación no encontrada al activar:', renovacionId);
        return;
    }
    if (r.estado === 'activa') return; // ya aplicada (idempotencia)

    // Carruseles/imágenes/ciudades elegidos en la renovación (se aplican al original).
    const piezas = (await db.execute(sql`SELECT carrusel, imagen_url FROM publicidad_piezas WHERE compra_id = ${renovacionId}::uuid`)).rows as Array<{ carrusel: string; imagen_url: string }>;
    const ciudadFilas = (await db.execute(sql`SELECT ciudad_id::text AS ciudad_id FROM publicidad_compra_ciudades WHERE compra_id = ${renovacionId}::uuid`)).rows as Array<{ ciudad_id: string }>;
    const carruseles = piezas.map((p) => p.carrusel as CarruselPub);
    const imagenes: Partial<Record<CarruselPub, string>> = {};
    for (const p of piezas) imagenes[p.carrusel as CarruselPub] = p.imagen_url;
    const ciudadIds = ciudadFilas.map((c) => c.ciudad_id);

    let folio = r.folio;
    if (folio == null) {
        const [{ f }] = (await db.execute(sql`SELECT nextval('pagos_membresia_folio_seq')::int AS f`)).rows as Array<{ f: number }>;
        folio = f;
    }
    const pi = typeof session.payment_intent === 'string' ? session.payment_intent : null;

    // Imágenes actuales del original ANTES de reconciliar (para limpiar las que queden huérfanas).
    const viejas = (await db.execute(sql`SELECT imagen_url FROM publicidad_piezas WHERE compra_id = ${compraOriginalId}::uuid`)).rows as Array<{ imagen_url: string }>;

    await db.transaction(async (tx) => {
        // 1. Sella la fila de renovación como pago (registro contable: activa + folio + PI).
        await tx.execute(sql`
            UPDATE publicidad_compras
            SET estado = 'activa', folio = ${folio}, stripe_payment_intent_id = ${pi}, updated_at = now()
            WHERE id = ${renovacionId}::uuid
        `);
        // 2. Aplica al ORIGINAL los carruseles/imágenes/ciudades elegidos (conserva clics).
        await reconciliarPiezasYCiudades(tx, compraOriginalId, carruseles, imagenes, ciudadIds);
        // 3. Extiende la vigencia del original (suma al mayor entre vencimiento y ahora) + reactiva.
        await tx.execute(sql`
            UPDATE publicidad_compras
            SET expira_at = GREATEST(expira_at, now()) + (${meses} || ' months')::interval,
                estado = CASE WHEN estado IN ('expirada', 'pausada') THEN 'activa' ELSE estado END,
                aviso_vencimiento_enviado = false,
                updated_at = now()
            WHERE id = ${compraOriginalId}::uuid
        `);
        // 4. Copia la nueva vigencia del original a la fila de renovación (su recibo muestra el "hasta").
        await tx.execute(sql`
            UPDATE publicidad_compras
            SET expira_at = (SELECT o.expira_at FROM publicidad_compras o WHERE o.id = ${compraOriginalId}::uuid)
            WHERE id = ${renovacionId}::uuid
        `);
    });
    console.log(`✅ Renovación aplicada: pago ${renovacionId} (folio ${folio}) extiende ${compraOriginalId} +${meses}m`);

    // Limpia de R2 las imágenes viejas del original que la renovación reemplazó y nadie más usa.
    try {
        const { eliminarImagenSiHuerfana } = await import('./negocioManagement.service.js');
        const nuevas = new Set(Object.values(imagenes));
        for (const v of viejas) {
            if (v.imagen_url && !nuevas.has(v.imagen_url)) await eliminarImagenSiHuerfana(v.imagen_url);
        }
    } catch (e) {
        console.error('Error limpiando imágenes reemplazadas en la renovación:', e);
    }

    // Recibo PDF + correo de la renovación (best-effort: el pago ya quedó aplicado).
    try {
        const { prepararReciboPublicidad } = await import('./admin/recibo-publicidad.service.js');
        const { enviarComprobantePublicidad } = await import('../utils/email.js');
        const rec = await prepararReciboPublicidad(renovacionId, true);
        if (rec) {
            if (rec.reciboUrl) {
                await db.execute(sql`UPDATE publicidad_compras SET recibo_url = ${rec.reciboUrl} WHERE id = ${renovacionId}::uuid`);
            }
            if (rec.correo) {
                await enviarComprobantePublicidad(rec.correo, rec.nombre ?? '', {
                    titular: rec.titular, carruseles: rec.carruseles, concepto: rec.concepto,
                    monto: rec.monto, folio: rec.folio, hasta: rec.hasta, reciboUrl: rec.reciboUrl,
                });
            }
        }
    } catch (e) {
        console.error('Error emitiendo el recibo de renovación:', e);
    }
}
