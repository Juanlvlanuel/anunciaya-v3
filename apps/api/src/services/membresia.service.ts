/**
 * membresia.service.ts
 * ====================
 * Lecturas de la membresía comercial DESDE EL LADO DEL DUEÑO (Mi Perfil — Modo Personal,
 * sección "Membresía / Pagos"). Es el espejo "self-service" de lo que el Panel Admin ve por
 * negocio, pero acotado SIEMPRE al negocio del usuario logueado (sin roles ni regiones).
 *
 * Por qué vive en Modo Personal: cuando un negocio se suspende/cancela el dueño baja a personal
 * y pierde Business Studio; si esto viviera en BS, un suspendido nunca podría regularizarse.
 * Ver docs/arquitectura/Mi_Perfil.md.
 *
 * Pieza 1 (vista de membresía + historial/recibos). Las piezas 2 (Customer Portal) y 3 (pago
 * manual con comprobante) se agregan después en este mismo módulo.
 *
 * Ubicación: apps/api/src/services/membresia.service.ts
 */

import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { negocios, pagosMembresia, pagosManualesSolicitudes, publicidadCompras, usuarios } from '../db/schemas/schema.js';
import { prepararReciboPago } from './admin/recibo-pago.service.js';
import { stripe } from '../config/stripe.js';
import { env } from '../config/env.js';
import { generarPresignedUrl } from './r2.service.js';
import { obtenerConfigJson, obtenerConfigNumero } from './configuracion.service.js';
import { cancelarSuscripcion } from './suscripciones/acciones-stripe.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface ReciboMembresia {
    id: string;
    folio: number | null;
    concepto: string;          // efectivo | transferencia | cortesia | tarjeta
    monto: string | null;      // MXN; NULL en cortesía
    fechaPago: string | null;
    periodoHasta: string | null;
    anulado: boolean;
}

export interface SolicitudPendiente {
    id: string;
    monto: string;
    mesesDeclarados: number;
    referencia: string | null;
    nota: string | null;
    comprobanteUrl: string;
    creadoAt: string;
}

/** Última solicitud RECHAZADA (cuando es la más reciente y el dueño aún no reenvía). */
export interface UltimoRechazo {
    id: string;
    monto: string;
    mesesDeclarados: number;
    motivo: string | null;
    revisadoAt: string | null;
}

/** Solicitud rechazada para el historial (constancia de pagos no aprobados). */
export interface SolicitudRechazada {
    id: string;
    monto: string;
    mesesDeclarados: number;
    motivo: string | null;
    comprobanteUrl: string;
    fecha: string | null; // cuándo se rechazó (revisadoAt)
}

export interface MiMembresia {
    tieneNegocio: boolean;
    /** ¿Tiene publicidad pagada o de cortesía vigente? (anuncios de la columna derecha). */
    tienePublicidad: boolean;
    solicitudPendiente: SolicitudPendiente | null;
    ultimoRechazo: UltimoRechazo | null;
    solicitudesRechazadas: SolicitudRechazada[];
    negocio: {
        id: string;
        nombre: string;
        logoUrl: string | null;
        estadoMembresia: string;   // al_corriente | en_gracia | suspendido | cancelado
        estadoAdmin: string;       // activo | suspendido | archivado
        metodoCobro: string;       // tarjeta | manual
        activo: boolean;
        fechaProximoCobro: string | null;
        fechaVencimiento: string | null;
        fechaLimiteGracia: string | null;
        fechaPrimerPago: string | null;
        // ¿El dueño puede abrir el Customer Portal de Stripe? (tiene stripe_customer_id).
        // El front lo usa para decidir si muestra el botón "Actualizar tarjeta…".
        puedeAbrirPortal: boolean;
    } | null;
    recibos: ReciboMembresia[];
}

// =============================================================================
// VISTA DE MEMBRESÍA DEL DUEÑO
// =============================================================================

/**
 * Devuelve el estado de la membresía del negocio del usuario logueado + su historial de recibos.
 * Si el usuario no tiene negocio (solo personal), devuelve `{ tieneNegocio: false }`.
 */
export async function obtenerMiMembresia(usuarioId: string): Promise<MiMembresia> {
    const [neg] = await db
        .select({
            id: negocios.id,
            nombre: negocios.nombre,
            logoUrl: negocios.logoUrl,
            estadoMembresia: negocios.estadoMembresia,
            estadoAdmin: negocios.estadoAdmin,
            metodoCobro: negocios.metodoCobro,
            activo: negocios.activo,
            fechaProximoCobro: negocios.fechaProximoCobro,
            fechaVencimiento: negocios.fechaVencimiento,
            fechaLimiteGracia: negocios.fechaLimiteGracia,
            fechaPrimerPago: negocios.fechaPrimerPago,
            stripeCustomerId: usuarios.stripeCustomerId,
        })
        .from(negocios)
        .innerJoin(usuarios, eq(usuarios.id, negocios.usuarioId))
        .where(eq(negocios.usuarioId, usuarioId))
        .limit(1);

    // ¿Tiene publicidad activa y vigente? (self-service, manual o cortesía).
    const pub = await db
        .select({ id: publicidadCompras.id })
        .from(publicidadCompras)
        .where(and(
            eq(publicidadCompras.usuarioId, usuarioId),
            eq(publicidadCompras.estado, 'activa'),
            gt(publicidadCompras.expiraAt, sql`now()`),
        ))
        .limit(1);
    const tienePublicidad = pub.length > 0;

    if (!neg) {
        return { tieneNegocio: false, tienePublicidad, solicitudPendiente: null, ultimoRechazo: null, solicitudesRechazadas: [], negocio: null, recibos: [] };
    }

    // Última solicitud (cualquier estado): si es 'pendiente' → "en revisión"; si es 'rechazado' → aviso de rechazo.
    const [solicitud] = await db
        .select({
            id: pagosManualesSolicitudes.id,
            monto: pagosManualesSolicitudes.monto,
            mesesDeclarados: pagosManualesSolicitudes.mesesDeclarados,
            referencia: pagosManualesSolicitudes.referencia,
            nota: pagosManualesSolicitudes.nota,
            comprobanteUrl: pagosManualesSolicitudes.comprobanteUrl,
            creadoAt: pagosManualesSolicitudes.creadoAt,
            estado: pagosManualesSolicitudes.estado,
            motivoRechazo: pagosManualesSolicitudes.motivoRechazo,
            revisadoAt: pagosManualesSolicitudes.revisadoAt,
        })
        .from(pagosManualesSolicitudes)
        .where(eq(pagosManualesSolicitudes.negocioId, neg.id))
        .orderBy(desc(pagosManualesSolicitudes.creadoAt))
        .limit(1);

    // Historial de comprobantes RECHAZADOS (constancia en el historial de pagos del dueño).
    const rechazadas = await db
        .select({
            id: pagosManualesSolicitudes.id,
            monto: pagosManualesSolicitudes.monto,
            mesesDeclarados: pagosManualesSolicitudes.mesesDeclarados,
            motivoRechazo: pagosManualesSolicitudes.motivoRechazo,
            comprobanteUrl: pagosManualesSolicitudes.comprobanteUrl,
            revisadoAt: pagosManualesSolicitudes.revisadoAt,
        })
        .from(pagosManualesSolicitudes)
        .where(and(eq(pagosManualesSolicitudes.negocioId, neg.id), eq(pagosManualesSolicitudes.estado, 'rechazado')))
        .orderBy(desc(pagosManualesSolicitudes.revisadoAt));

    const filas = await db
        .select({
            id: pagosMembresia.id,
            folio: pagosMembresia.folio,
            concepto: pagosMembresia.concepto,
            monto: pagosMembresia.monto,
            fechaPago: pagosMembresia.fechaPago,
            periodoHasta: pagosMembresia.periodoHasta,
            anulado: pagosMembresia.anulado,
        })
        .from(pagosMembresia)
        .where(eq(pagosMembresia.negocioId, neg.id))
        .orderBy(desc(pagosMembresia.folio), desc(pagosMembresia.fechaPago));

    return {
        tieneNegocio: true,
        tienePublicidad,
        solicitudPendiente:
            solicitud?.estado === 'pendiente'
                ? {
                      id: solicitud.id,
                      monto: solicitud.monto,
                      mesesDeclarados: solicitud.mesesDeclarados,
                      referencia: solicitud.referencia ?? null,
                      nota: solicitud.nota ?? null,
                      comprobanteUrl: solicitud.comprobanteUrl,
                      creadoAt: solicitud.creadoAt,
                  }
                : null,
        ultimoRechazo:
            solicitud?.estado === 'rechazado'
                ? {
                      id: solicitud.id,
                      monto: solicitud.monto,
                      mesesDeclarados: solicitud.mesesDeclarados,
                      motivo: solicitud.motivoRechazo ?? null,
                      revisadoAt: solicitud.revisadoAt ?? null,
                  }
                : null,
        solicitudesRechazadas: rechazadas.map((r) => ({
            id: r.id,
            monto: r.monto,
            mesesDeclarados: r.mesesDeclarados,
            motivo: r.motivoRechazo ?? null,
            comprobanteUrl: r.comprobanteUrl,
            fecha: r.revisadoAt ?? null,
        })),
        negocio: {
            id: neg.id,
            nombre: neg.nombre,
            logoUrl: neg.logoUrl,
            estadoMembresia: neg.estadoMembresia,
            estadoAdmin: neg.estadoAdmin,
            metodoCobro: neg.metodoCobro,
            activo: neg.activo ?? false,
            fechaProximoCobro: neg.fechaProximoCobro,
            fechaVencimiento: neg.fechaVencimiento,
            fechaLimiteGracia: neg.fechaLimiteGracia,
            fechaPrimerPago: neg.fechaPrimerPago,
            puedeAbrirPortal: !!neg.stripeCustomerId,
        },
        recibos: filas.map((f) => ({
            id: f.id,
            folio: f.folio ?? null,
            concepto: f.concepto,
            monto: f.monto ?? null,
            fechaPago: f.fechaPago ?? null,
            periodoHasta: f.periodoHasta ?? null,
            anulado: f.anulado,
        })),
    };
}

// =============================================================================
// DESCARGAR UN RECIBO PROPIO
// =============================================================================

export type ResultadoDescargaRecibo =
    | { ok: true; reciboUrl: string }
    | { ok: false; status: number; mensaje: string };

/**
 * Genera/regenera el PDF de un recibo y devuelve su URL en R2, validando que el recibo
 * pertenezca al negocio del usuario logueado (alcance self-service, no roles del Panel).
 */
export async function descargarMiRecibo(
    usuarioId: string,
    reciboId: string
): Promise<ResultadoDescargaRecibo> {
    const [fila] = await db
        .select({ id: pagosMembresia.id })
        .from(pagosMembresia)
        .innerJoin(negocios, eq(negocios.id, pagosMembresia.negocioId))
        .where(and(eq(pagosMembresia.id, reciboId), eq(negocios.usuarioId, usuarioId)))
        .limit(1);

    if (!fila) return { ok: false, status: 404, mensaje: 'Recibo no encontrado.' };

    const rec = await prepararReciboPago(reciboId);
    if (!rec?.reciboUrl) return { ok: false, status: 502, mensaje: 'No se pudo generar el recibo PDF.' };
    return { ok: true, reciboUrl: rec.reciboUrl };
}

// =============================================================================
// CUSTOMER PORTAL DE STRIPE (recuperar tarjeta + pagar factura pendiente)
// =============================================================================

export type ResultadoPortal =
    | { ok: true; url: string }
    | { ok: false; status: number; mensaje: string };

/**
 * Crea una sesión del Customer Portal de Stripe para el usuario logueado y devuelve su URL.
 * Desde el portal, el dueño puede actualizar su tarjeta y pagar la factura pendiente (recupera
 * un negocio en gracia/suspendido por impago de tarjeta). Vuelve a `/perfil` al terminar.
 *
 * Requiere que el usuario tenga `stripe_customer_id` (membresía por tarjeta) y que el Customer
 * Portal esté configurado en el Dashboard de Stripe; si no lo está, Stripe lanza y se devuelve
 * un mensaje claro (no se rompe el endpoint).
 */
export async function crearSesionPortal(usuarioId: string): Promise<ResultadoPortal> {
    const [usr] = await db
        .select({ stripeCustomerId: usuarios.stripeCustomerId })
        .from(usuarios)
        .where(eq(usuarios.id, usuarioId))
        .limit(1);

    if (!usr?.stripeCustomerId) {
        return {
            ok: false,
            status: 409,
            mensaje: 'No tienes un método de pago por tarjeta registrado.',
        };
    }

    try {
        const sesion = await stripe.billingPortal.sessions.create({
            customer: usr.stripeCustomerId,
            return_url: `${env.FRONTEND_URL}/perfil`,
        });
        return { ok: true, url: sesion.url };
    } catch (error) {
        console.error('❌ Error al crear sesión del Customer Portal:', error);
        return {
            ok: false,
            status: 502,
            mensaje: 'No se pudo abrir el portal de pagos. Intenta más tarde.',
        };
    }
}

// =============================================================================
// PAGO MANUAL (transferencia/depósito + comprobante → cola de verificación)
// =============================================================================

export interface DatosCobro {
    banco: string;
    titular: string;
    clabe: string;
    cuenta: string;
    tarjeta: string;        // número de tarjeta (para depósito en OXXO)
    instrucciones: string;
}

/** Clave en `configuracion_sistema` donde el Panel guarda los datos de cobro para transferencias. */
export const CLAVE_DATOS_COBRO = 'datos_cobro_manual';

/** Datos de cobro vacíos por defecto (hasta que el super los configure desde el Panel). */
export const DATOS_COBRO_DEFAULT: DatosCobro = {
    banco: '',
    titular: '',
    clabe: '',
    cuenta: '',
    tarjeta: '',
    instrucciones: '',
};

/** Datos de la cuenta de AnunciaYA para que el dueño deposite/transfiera (los configura el Panel). */
export async function obtenerDatosCobro(): Promise<DatosCobro> {
    const datos = await obtenerConfigJson<Partial<DatosCobro>>(CLAVE_DATOS_COBRO, DATOS_COBRO_DEFAULT);
    return { ...DATOS_COBRO_DEFAULT, ...datos };
}

/**
 * Datos de cobro + el precio mensual de la membresía (MXN). El dueño paga meses COMPLETOS, así que
 * el front calcula el total = meses × precioMensual (no es un monto libre).
 */
export async function obtenerDatosCobroConPrecio(): Promise<DatosCobro & { precioMensual: number }> {
    const [datos, precioMensual] = await Promise.all([
        obtenerDatosCobro(),
        obtenerConfigNumero('precio_membresia_mxn', 849),
    ]);
    return { ...datos, precioMensual };
}

/** Presigned URL para subir el comprobante del pago manual a R2 (carpeta 'comprobantes'). */
export async function generarUrlComprobante(nombreArchivo: string, contentType: string) {
    return generarPresignedUrl('comprobantes', nombreArchivo, contentType, 300, ['image/jpeg', 'image/png', 'image/webp']);
}

export interface CrearSolicitudInput {
    monto: number;
    mesesDeclarados: number;
    referencia?: string | null;
    nota?: string | null;
    comprobanteUrl: string;
}

export type ResultadoSolicitud =
    | { ok: true; solicitudId: string }
    | { ok: false; status: number; mensaje: string };

/**
 * Crea una solicitud de pago manual (cola de verificación) para el negocio del usuario logueado.
 * Valida que tenga negocio, que no haya ya una pendiente, y los rangos de monto/meses.
 */
export async function crearSolicitudPagoManual(
    usuarioId: string,
    datos: CrearSolicitudInput
): Promise<ResultadoSolicitud> {
    const monto = Number(datos.monto);
    const meses = Number(datos.mesesDeclarados);
    if (!Number.isFinite(monto) || monto <= 0) {
        return { ok: false, status: 400, mensaje: 'El monto debe ser mayor a 0.' };
    }
    if (!Number.isInteger(meses) || meses < 1 || meses > 24) {
        return { ok: false, status: 400, mensaje: 'Los meses deben estar entre 1 y 24.' };
    }
    if (typeof datos.comprobanteUrl !== 'string' || !datos.comprobanteUrl.trim()) {
        return { ok: false, status: 400, mensaje: 'Falta el comprobante.' };
    }

    const [neg] = await db
        .select({ id: negocios.id })
        .from(negocios)
        .where(eq(negocios.usuarioId, usuarioId))
        .limit(1);

    if (!neg) {
        return { ok: false, status: 409, mensaje: 'No tienes un negocio asociado.' };
    }

    const [pendiente] = await db
        .select({ id: pagosManualesSolicitudes.id })
        .from(pagosManualesSolicitudes)
        .where(and(eq(pagosManualesSolicitudes.negocioId, neg.id), eq(pagosManualesSolicitudes.estado, 'pendiente')))
        .limit(1);

    if (pendiente) {
        return { ok: false, status: 409, mensaje: 'Ya tienes un pago en revisión.' };
    }

    const [creada] = await db
        .insert(pagosManualesSolicitudes)
        .values({
            negocioId: neg.id,
            usuarioId,
            monto: monto.toFixed(2),
            mesesDeclarados: meses,
            referencia: datos.referencia?.trim() || null,
            nota: datos.nota?.trim() || null,
            comprobanteUrl: datos.comprobanteUrl.trim(),
        })
        .returning({ id: pagosManualesSolicitudes.id });

    return { ok: true, solicitudId: creada.id };
}

// =============================================================================
// CAMBIAR MÉTODO DE COBRO: TARJETA → MANUAL
// =============================================================================

export type ResultadoCambioCobro =
    | { ok: true; advertencia?: string }
    | { ok: false; status: number; mensaje: string };

/**
 * Pasa el negocio de cobro con TARJETA a MANUAL (transferencia/depósito). Cancela el cobro
 * automático en Stripe SIN archivar el negocio y RESPETA la vigencia restante (no toca
 * `fecha_vencimiento`). A partir del vencimiento, el cron `expirarManualesVencidos` aplica la
 * misma gracia que tarjeta.
 *
 * Truco clave: se limpia `usuarios.stripe_subscription_id` ANTES de cancelar en Stripe; así, cuando
 * llegue el webhook `subscription.deleted` (reason 'cancellation_requested'), `procesarCancelacionSuscripcion`
 * no encuentra al negocio por ese id y NO lo archiva (solo cancelar desde el Panel archiva).
 */
export async function cambiarAPagoManual(usuarioId: string): Promise<ResultadoCambioCobro> {
    const [row] = await db
        .select({
            negocioId: negocios.id,
            metodoCobro: negocios.metodoCobro,
            estadoAdmin: negocios.estadoAdmin,
            stripeSubscriptionId: usuarios.stripeSubscriptionId,
        })
        .from(negocios)
        .innerJoin(usuarios, eq(usuarios.id, negocios.usuarioId))
        .where(eq(negocios.usuarioId, usuarioId))
        .limit(1);

    if (!row) return { ok: false, status: 409, mensaje: 'No tienes un negocio asociado.' };
    if (row.estadoAdmin === 'archivado') return { ok: false, status: 409, mensaje: 'Tu negocio está cancelado.' };
    if (row.metodoCobro !== 'tarjeta' || !row.stripeSubscriptionId) {
        return { ok: false, status: 409, mensaje: 'Tu cobro actual no es con tarjeta.' };
    }

    const subId = row.stripeSubscriptionId;

    // Limpia el sub_id + pasa a manual ANTES de cancelar (para que el webhook no archive).
    await db.transaction(async (tx) => {
        await tx
            .update(usuarios)
            .set({ stripeSubscriptionId: null, updatedAt: new Date().toISOString() })
            .where(eq(usuarios.id, usuarioId));
        await tx
            .update(negocios)
            .set({ metodoCobro: 'manual', updatedAt: new Date().toISOString() })
            .where(eq(negocios.id, row.negocioId));
    });

    // Stripe fuera de la transacción (§4.3: la BD manda aunque Stripe falle). Reusa el helper que
    // es idempotente y trata una sub ya inexistente (resource_missing) como cancelada → sin advertencia.
    const r = await cancelarSuscripcion(subId);
    const advertencia = r.ok
        ? undefined
        : r.aviso ?? 'Desactivamos el cobro automático, pero hubo un problema al cancelar en Stripe. Si ves un cargo, contacta a soporte.';

    return { ok: true, advertencia };
}

export default {
    obtenerMiMembresia,
    descargarMiRecibo,
    crearSesionPortal,
    obtenerDatosCobro,
    generarUrlComprobante,
    crearSolicitudPagoManual,
    cambiarAPagoManual,
    obtenerDatosCobroConPrecio,
};
