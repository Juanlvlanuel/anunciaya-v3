/**
 * admin/precio-membresia.service.ts
 * =================================
 * Acciones del módulo Configuración para el PRECIO de la membresía comercial (Sprint Stripe · Pieza 1c).
 * Solo superadmin. Dos acciones SEPARADAS (no se mezclan en un botón):
 *
 *   - cambiarPrecioMensual(precio)  → crea el Price mensual nuevo en Stripe, lo deja default, archiva el
 *     viejo y reapunta la config. Si el plan anual está ACTIVO, recrea también el anual (10× el nuevo
 *     mensual) para mantenerlos en sincronía.
 *   - activarPlanAnual(activo)      → ON: crea el Price anual (10× el mensual actual) y lo siembra en
 *     config (habilita el selector "Anual" en el registro). OFF: archiva el Price anual y vacía su clave
 *     → el registro deja de ofrecerlo. Las suscripciones anuales vigentes NO se tocan.
 *
 * Cambiar el precio no es editar texto: los Prices de Stripe son INMUTABLES → se crean nuevos. El Price
 * activo vive en `configuracion_sistema` (no en una env var) para cambiarlo SIN redeploy: el checkout lee
 * de ahí (§1b). Las suscripciones vigentes NO se migran (Stripe las deja en su precio anterior).
 *
 * Ubicación: apps/api/src/services/admin/precio-membresia.service.ts
 */

import Stripe from 'stripe';
import { db } from '../../db/index.js';
import { configuracionSistema } from '../../db/schemas/schema.js';
import { stripe } from '../../config/stripe.js';
import { env } from '../../config/env.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { resetearCacheConfig, obtenerConfigNumero, obtenerConfigTexto } from '../configuracion.service.js';

/** Factor del plan anual: se cobra como 10 meses (2 gratis), consistente con el alta manual. */
export const FACTOR_ANUAL = 10;
const PRECIO_MIN = 100;
const PRECIO_MAX = 100000;

type Modo = 'test' | 'live';
type DatosPrice = { precio: number; priceId: string };

export type ResultadoPrecioMensual =
    | { ok: true; precioMensual: number; priceMensualId: string; anual: DatosPrice | null; modo: Modo }
    | { ok: false; status: number; mensaje: string };

export type ResultadoPlanAnual =
    | { ok: true; activo: boolean; anual: DatosPrice | null; modo: Modo }
    | { ok: false; status: number; mensaje: string };

// =============================================================================
// HELPERS
// =============================================================================

/** Producto y modo (test/live) a partir del Price mensual activo. null si Stripe no responde. */
async function contextoStripe(): Promise<{ productId: string; modo: Modo } | null> {
    const mensualId = await obtenerConfigTexto('stripe_price_comercial_id', env.STRIPE_PRICE_COMERCIAL);
    try {
        const p = await stripe.prices.retrieve(mensualId);
        const productId = typeof p.product === 'string' ? p.product : p.product.id;
        return { productId, modo: p.livemode ? 'live' : 'test' };
    } catch {
        return null;
    }
}

/** Crea (o reusa, si ya existe uno idéntico activo) un Price recurrente sobre el producto dado. */
async function crearOReusarPrice(productId: string, montoMXN: number, interval: 'month' | 'year'): Promise<Stripe.Price> {
    const lista = await stripe.prices.list({ product: productId, active: true, limit: 100 });
    const existente = lista.data.find(
        (p) => p.unit_amount === montoMXN * 100 && p.currency === 'mxn' && p.recurring?.interval === interval,
    );
    if (existente) return existente;
    return stripe.prices.create({
        product: productId,
        unit_amount: montoMXN * 100, // centavos
        currency: 'mxn',
        recurring: { interval },
        nickname: `Membresía comercial $${montoMXN}/${interval === 'year' ? 'año' : 'mes'}`,
    });
}

/** Archiva un Price (idempotente; no rompe si ya está inactivo o no existe). */
async function archivarPrice(priceId: string): Promise<void> {
    if (!priceId) return;
    try {
        await stripe.prices.update(priceId, { active: false });
    } catch {
        /* ya inactivo o inexistente — sin efecto */
    }
}

/** UPSERT de una clave de `configuracion_sistema` (categoría 'pagos'). */
async function upsertConfig(
    clave: string,
    valor: string,
    tipo: 'numero' | 'texto',
    descripcion: string,
    actorId: string | null,
): Promise<void> {
    const ahora = new Date().toISOString();
    await db
        .insert(configuracionSistema)
        .values({ clave, valor, tipo, descripcion, categoria: 'pagos', actualizadoPor: actorId, updatedAt: ahora })
        .onConflictDoUpdate({
            target: configuracionSistema.clave,
            set: { valor, actualizadoPor: actorId, updatedAt: ahora },
        });
}

// =============================================================================
// CAMBIAR EL PRECIO MENSUAL
// =============================================================================

/**
 * Cambia el precio MENSUAL: crea el Price nuevo, lo deja default, archiva el viejo y reapunta la config.
 * Si el plan anual está ACTIVO, recrea también el anual (10× el nuevo mensual) para no desincronizarlos.
 */
export async function cambiarPrecioMensual(panel: UsuarioPanel, nuevoPrecioMensual: number): Promise<ResultadoPrecioMensual> {
    if (!Number.isInteger(nuevoPrecioMensual) || nuevoPrecioMensual < PRECIO_MIN || nuevoPrecioMensual > PRECIO_MAX) {
        return { ok: false, status: 400, mensaje: `El precio debe ser un entero entre $${PRECIO_MIN} y $${PRECIO_MAX} MXN.` };
    }

    const ctx = await contextoStripe();
    if (!ctx) return { ok: false, status: 502, mensaje: 'No se pudo leer el Price actual en Stripe. Revisa la configuración.' };

    const precioActual = await obtenerConfigNumero('precio_membresia_mxn', 849);
    const priceMensualActualId = await obtenerConfigTexto('stripe_price_comercial_id', env.STRIPE_PRICE_COMERCIAL);
    const priceAnualActualId = await obtenerConfigTexto('stripe_price_comercial_anual_id', '');
    const anualActivo = priceAnualActualId.trim() !== '';

    let mensual: Stripe.Price;
    let anual: Stripe.Price | null = null;
    const precioAnual = nuevoPrecioMensual * FACTOR_ANUAL;
    try {
        mensual = await crearOReusarPrice(ctx.productId, nuevoPrecioMensual, 'month');
        await stripe.products.update(ctx.productId, { default_price: mensual.id });
        if (anualActivo) anual = await crearOReusarPrice(ctx.productId, precioAnual, 'year');
    } catch (error) {
        console.error('[PrecioMembresia] Falló la operación en Stripe:', error);
        return { ok: false, status: 502, mensaje: 'No se pudo crear el Price en Stripe. No se cambió nada.' };
    }

    // Archivar los viejos destronados (idempotente).
    if (priceMensualActualId !== mensual.id) await archivarPrice(priceMensualActualId);
    if (anual && priceAnualActualId && priceAnualActualId !== anual.id) await archivarPrice(priceAnualActualId);

    // Reapuntar la config (al final, con los Prices ya creados).
    await upsertConfig('precio_membresia_mxn', String(nuevoPrecioMensual), 'numero', 'Precio mensual de la membresía comercial (MXN).', panel.usuarioId);
    await upsertConfig('stripe_price_comercial_id', mensual.id, 'texto', 'Price ID activo del plan comercial MENSUAL en Stripe.', panel.usuarioId);
    if (anual) {
        await upsertConfig('precio_membresia_anual_mxn', String(precioAnual), 'numero', 'Precio anual de la membresía comercial (MXN) — 10 meses, 2 gratis.', panel.usuarioId);
        await upsertConfig('stripe_price_comercial_anual_id', anual.id, 'texto', 'Price ID activo del plan comercial ANUAL en Stripe.', panel.usuarioId);
    }
    resetearCacheConfig();

    await registrarAuditoria(panel, {
        accion: 'precio_mensual_cambiar',
        entidadTipo: 'configuracion',
        entidadId: null,
        datosPrevios: { precioMensual: precioActual, priceMensualId: priceMensualActualId },
        datosNuevos: { precioMensual: nuevoPrecioMensual, priceMensualId: mensual.id, anualRecalculado: anual ? precioAnual : null, modo: ctx.modo },
        motivo: null,
    });

    return {
        ok: true,
        precioMensual: nuevoPrecioMensual,
        priceMensualId: mensual.id,
        anual: anual ? { precio: precioAnual, priceId: anual.id } : null,
        modo: ctx.modo,
    };
}

// =============================================================================
// ACTIVAR / DESACTIVAR EL PLAN ANUAL
// =============================================================================

/**
 * ON: crea el Price anual (10× el mensual actual) y lo siembra → el registro ofrece "Anual".
 * OFF: archiva el Price anual y vacía su clave → el registro deja de ofrecerlo. Las suscripciones anuales
 * vigentes NO se tocan (siguen cobrándose en Stripe; solo se deja de ofrecer a nuevos registros).
 */
export async function activarPlanAnual(panel: UsuarioPanel, activo: boolean): Promise<ResultadoPlanAnual> {
    const ctx = await contextoStripe();
    if (!ctx) return { ok: false, status: 502, mensaje: 'No se pudo leer el Price actual en Stripe. Revisa la configuración.' };

    if (activo) {
        const precioMensual = await obtenerConfigNumero('precio_membresia_mxn', 849);
        const precioAnual = precioMensual * FACTOR_ANUAL;
        let anual: Stripe.Price;
        try {
            anual = await crearOReusarPrice(ctx.productId, precioAnual, 'year');
        } catch (error) {
            console.error('[PrecioMembresia] No se pudo crear el Price anual:', error);
            return { ok: false, status: 502, mensaje: 'No se pudo crear el Price anual en Stripe.' };
        }
        await upsertConfig('precio_membresia_anual_mxn', String(precioAnual), 'numero', 'Precio anual de la membresía comercial (MXN) — 10 meses, 2 gratis.', panel.usuarioId);
        await upsertConfig('stripe_price_comercial_anual_id', anual.id, 'texto', 'Price ID activo del plan comercial ANUAL en Stripe.', panel.usuarioId);
        resetearCacheConfig();

        await registrarAuditoria(panel, {
            accion: 'plan_anual_activar',
            entidadTipo: 'configuracion',
            entidadId: null,
            datosPrevios: null,
            datosNuevos: { precioAnual, priceAnualId: anual.id, modo: ctx.modo },
            motivo: null,
        });
        return { ok: true, activo: true, anual: { precio: precioAnual, priceId: anual.id }, modo: ctx.modo };
    }

    // Desactivar: archivar el Price anual (si existe) y vaciar su clave.
    const priceAnualActualId = await obtenerConfigTexto('stripe_price_comercial_anual_id', '');
    await archivarPrice(priceAnualActualId);
    await upsertConfig('stripe_price_comercial_anual_id', '', 'texto', 'Price ID activo del plan comercial ANUAL en Stripe.', panel.usuarioId);
    resetearCacheConfig();

    await registrarAuditoria(panel, {
        accion: 'plan_anual_desactivar',
        entidadTipo: 'configuracion',
        entidadId: null,
        datosPrevios: { priceAnualId: priceAnualActualId },
        datosNuevos: { activo: false },
        motivo: null,
    });
    return { ok: true, activo: false, anual: null, modo: ctx.modo };
}
