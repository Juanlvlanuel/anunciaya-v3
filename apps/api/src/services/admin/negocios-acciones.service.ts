/**
 * admin/negocios-acciones.service.ts
 * ==================================
 * Acciones de ESCRITURA de la sección Negocios del Panel (Entrega 2 · Paradas 1 y 2).
 * Escriben en NUESTRA BD (fuente de verdad) y, cuando aplica, accionan Stripe vía las
 * helpers defensivas de `suscripciones/acciones-stripe.ts`. Si Stripe falla, el cambio
 * en BD se aplica igual y se devuelve `advertenciaStripe` para avisar al admin (§4.3).
 *
 *   - suspenderNegocio   — oculta temporal (activo=false, estado_admin='suspendido')
 *                          + PAUSA el cobro en Stripe (pause_collection 'void', sin deuda)
 *   - reactivarNegocio   — revierte la suspensión manual (activo=true, estado_admin='activo')
 *                          + REANUDA el cobro en Stripe
 *   - reasignarVendedor  — cambia/quita el vendedor atribuido (solo embajadorId; la región se deduce)
 *   - marcarPagado       — activa a mano (cortesías/efectivo/pago no registrado): estado_admin
 *                          ='activo' + activo=true + al_corriente + plazo elegido; opción de
 *                          pausar la tarjeta (toggle) y método de cobro 'manual'/'tarjeta'
 *   - cancelarNegocio    — baja recuperable (soft-delete): corta Stripe + degrada al dueño a
 *                          personal + estado_admin='archivado' + devuelve puntos de vales
 *
 * Modelo de estados (decisión de diseño): el eje ADMINISTRATIVO (`estado_admin`)
 * es la razón; la VISIBILIDAD efectiva la da `activo` (que el feed público ya
 * respeta). El webhook nunca toca `activo` → un pago no revive una suspensión
 * manual (+ guard defensivo en el webhook).
 *
 * Alcance por rol (las rutas restringen a superadmin/gerente; aquí se valida la
 * región): superadmin = cualquier negocio; gerente = solo los de su región.
 *
 * Ubicación: apps/api/src/services/admin/negocios-acciones.service.ts
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { negocios, embajadores, usuarios } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { notificarNegocioFueraDeCirculacion, limpiarNotificacionNegocioFueraDeCirculacion } from '../notificaciones.service.js';
import { pausarCobroSuscripcion, reanudarCobroSuscripcion, cancelarSuscripcion } from '../suscripciones/acciones-stripe.js';

// =============================================================================
// TIPOS
// =============================================================================

interface NegocioAccion {
    id: string;
    estadoAdmin: string;
    activo: boolean | null;
    embajadorId: string | null;
}

export type ResultadoAccion =
    | { ok: true; negocio: NegocioAccion; advertenciaStripe?: string | null }
    | { ok: false; status: number; mensaje: string };

// =============================================================================
// HELPER: cargar negocio validando alcance del rol
// =============================================================================

type NegocioCargado = {
    id: string;
    usuarioId: string;
    estadoAdmin: string;
    activo: boolean | null;
    esBorrador: boolean | null;
    onboardingCompletado: boolean;
    embajadorId: string | null;
    estadoMembresia: string;
    metodoCobro: string;
    /** Suscripción de Stripe del DUEÑO (vive en `usuarios`, no en `negocios`). */
    stripeSubscriptionId: string | null;
};

/** Carga el negocio y valida el alcance del actor. Devuelve el negocio, o un
 *  resultado de error (404 si no existe, 403 si está fuera de la región). */
async function cargarNegocioConAlcance(
    panel: UsuarioPanel,
    negocioId: string,
): Promise<{ ok: true; negocio: NegocioCargado } | { ok: false; status: number; mensaje: string }> {
    const [neg] = await db
        .select({
            id: negocios.id,
            usuarioId: negocios.usuarioId,
            estadoAdmin: negocios.estadoAdmin,
            activo: negocios.activo,
            esBorrador: negocios.esBorrador,
            onboardingCompletado: negocios.onboardingCompletado,
            embajadorId: negocios.embajadorId,
            estadoMembresia: negocios.estadoMembresia,
            metodoCobro: negocios.metodoCobro,
            // La suscripción de Stripe vive en el DUEÑO (join 1:1 negocio → usuario).
            stripeSubscriptionId: usuarios.stripeSubscriptionId,
        })
        .from(negocios)
        .leftJoin(usuarios, eq(usuarios.id, negocios.usuarioId))
        .where(eq(negocios.id, negocioId))
        .limit(1);

    if (!neg) return { ok: false, status: 404, mensaje: 'Negocio no encontrado' };

    // MANDO: el gerente solo actúa si la sucursal MATRIZ (es_principal) cae en su región
    // (deduce desde la ciudad; ya no compara `negocios.region_id`). El superadmin no entra
    // a este candado → manda sobre cualquier negocio.
    // ⚠️ DEBE COINCIDIR con la VISIBILIDAD de `condicionAlcance` en negocios.service.ts
    // (mismo predicado matriz → ciudad → región).
    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) {
            return { ok: false, status: 403, mensaje: 'No tienes una región asignada' };
        }
        const filas = (await db.execute(sql`
            SELECT EXISTS (
                SELECT 1 FROM negocio_sucursales ns
                JOIN ciudades c ON c.id = ns.ciudad_id
                WHERE ns.negocio_id = ${negocioId}
                  AND ns.es_principal = true
                  AND c.region_id = ${panel.regionId}
            ) AS tiene_mando
        `)).rows as Array<{ tiene_mando: boolean }>;
        if (!filas[0]?.tiene_mando) {
            return { ok: false, status: 403, mensaje: 'El negocio no está bajo tu mando: su sucursal matriz no está en tu región' };
        }
    }

    return { ok: true, negocio: neg };
}

// =============================================================================
// SUSPENDER (manual)
// =============================================================================

export async function suspenderNegocio(
    panel: UsuarioPanel,
    negocioId: string,
    motivo: string,
): Promise<ResultadoAccion> {
    const cargado = await cargarNegocioConAlcance(panel, negocioId);
    if (!cargado.ok) return cargado;
    const neg = cargado.negocio;

    if (neg.estadoAdmin === 'archivado') {
        return { ok: false, status: 409, mensaje: 'El negocio está cancelado/archivado' };
    }
    if (neg.estadoAdmin === 'suspendido') {
        return { ok: false, status: 409, mensaje: 'El negocio ya está suspendido' };
    }

    const ahora = new Date().toISOString();
    const [act] = await db
        .update(negocios)
        .set({ estadoAdmin: 'suspendido', activo: false, updatedAt: ahora })
        .where(eq(negocios.id, negocioId))
        .returning({
            id: negocios.id,
            estadoAdmin: negocios.estadoAdmin,
            activo: negocios.activo,
            embajadorId: negocios.embajadorId,
        });

    await registrarAuditoria(panel, {
        accion: 'negocio_suspender',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: { estadoAdmin: neg.estadoAdmin, activo: neg.activo },
        datosNuevos: { estadoAdmin: 'suspendido', activo: false },
        motivo,
    });

    // Pieza 3 (Stripe): además de esconder el negocio en NUESTRA BD, PAUSAR el cobro de la
    // tarjeta (pause_collection 'void' → no genera deuda) si el dueño tiene suscripción.
    // La BD ya quedó suspendida; si Stripe falla, se avisa pero NO se revierte (§4.3).
    let advertenciaStripe: string | null = null;
    if (neg.stripeSubscriptionId) {
        const r = await pausarCobroSuscripcion(neg.stripeSubscriptionId);
        if (!r.ok) advertenciaStripe = r.aviso ?? 'No se pudo pausar el cobro en Stripe.';
    }

    // Aviso persistente al dueño en su centro de notificaciones (modo personal).
    await notificarNegocioFueraDeCirculacion(negocioId);

    return { ok: true, negocio: act, advertenciaStripe };
}

// =============================================================================
// REACTIVAR (revierte una suspensión manual)
// =============================================================================

export async function reactivarNegocio(
    panel: UsuarioPanel,
    negocioId: string,
    motivo?: string | null,
): Promise<ResultadoAccion> {
    const cargado = await cargarNegocioConAlcance(panel, negocioId);
    if (!cargado.ok) return cargado;
    const neg = cargado.negocio;

    if (neg.estadoAdmin !== 'suspendido') {
        return {
            ok: false,
            status: 409,
            mensaje:
                neg.estadoAdmin === 'archivado'
                    ? 'El negocio está cancelado/archivado y no se reactiva desde aquí'
                    : 'El negocio no está suspendido',
        };
    }

    const ahora = new Date().toISOString();
    const [act] = await db
        .update(negocios)
        .set({ estadoAdmin: 'activo', activo: true, updatedAt: ahora })
        .where(eq(negocios.id, negocioId))
        .returning({
            id: negocios.id,
            estadoAdmin: negocios.estadoAdmin,
            activo: negocios.activo,
            embajadorId: negocios.embajadorId,
        });

    await registrarAuditoria(panel, {
        accion: 'negocio_reactivar',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: { estadoAdmin: neg.estadoAdmin, activo: neg.activo },
        datosNuevos: { estadoAdmin: 'activo', activo: true },
        motivo: motivo ?? null,
    });

    // Pieza 3 (Stripe): además de mostrarlo de nuevo, REANUDAR el cobro de la tarjeta
    // (limpia pause_collection; el ciclo sigue de ahí en adelante, sin cobrar lo saltado).
    let advertenciaStripe: string | null = null;
    if (neg.stripeSubscriptionId) {
        const r = await reanudarCobroSuscripcion(neg.stripeSubscriptionId);
        if (!r.ok) advertenciaStripe = r.aviso ?? 'No se pudo reanudar el cobro en Stripe.';
    }

    // Negocio reactivado: borrar el aviso de "fuera de circulación" del dueño.
    await limpiarNotificacionNegocioFueraDeCirculacion(negocioId);

    return { ok: true, negocio: act, advertenciaStripe };
}

// =============================================================================
// REASIGNAR VENDEDOR (cambiar o quitar)
// =============================================================================

export async function reasignarVendedor(
    panel: UsuarioPanel,
    negocioId: string,
    embajadorId: string | null,
    motivo?: string | null,
): Promise<ResultadoAccion> {
    const cargado = await cargarNegocioConAlcance(panel, negocioId);
    if (!cargado.ok) return cargado;
    const neg = cargado.negocio;

    if (embajadorId !== null) {
        const [emb] = await db
            .select({ id: embajadores.id, estado: embajadores.estado })
            .from(embajadores)
            .where(eq(embajadores.id, embajadorId))
            .limit(1);

        if (!emb) return { ok: false, status: 404, mensaje: 'Vendedor no encontrado' };
        if (emb.estado !== 'activo') return { ok: false, status: 409, mensaje: 'El vendedor no está activo' };

        // El gerente solo asigna vendedores que CUBREN al menos una ciudad de SU región
        // (la región del vendedor se deduce de `embajador_ciudades`, ya no de
        // `embajadores.region_id`). El superadmin puede asignar cualquiera.
        if (panel.rolEquipo === 'gerente') {
            if (!panel.regionId) {
                return { ok: false, status: 403, mensaje: 'No tienes una región asignada' };
            }
            const filas = (await db.execute(sql`
                SELECT EXISTS (
                    SELECT 1 FROM embajador_ciudades ec
                    JOIN ciudades c ON c.id = ec.ciudad_id
                    WHERE ec.embajador_id = ${embajadorId} AND c.region_id = ${panel.regionId}
                ) AS cubre
            `)).rows as Array<{ cubre: boolean }>;
            if (!filas[0]?.cubre) {
                return { ok: false, status: 403, mensaje: 'El vendedor no cubre ninguna ciudad de tu región' };
            }
        }
    }

    // Sin cambio real → no escribir ni auditar. (La región del negocio ya no se guarda;
    // se deduce de la ciudad de sus sucursales, así que solo se compara el vendedor.)
    if ((neg.embajadorId ?? null) === embajadorId) {
        return { ok: false, status: 409, mensaje: 'El negocio ya tiene esa atribución' };
    }

    const ahora = new Date().toISOString();
    const [act] = await db
        .update(negocios)
        // Solo cambia el vendedor (dinero). Ya NO escribe region_id (se elimina en el Paso 10).
        .set({ embajadorId, updatedAt: ahora })
        .where(eq(negocios.id, negocioId))
        .returning({
            id: negocios.id,
            estadoAdmin: negocios.estadoAdmin,
            activo: negocios.activo,
            embajadorId: negocios.embajadorId,
        });

    await registrarAuditoria(panel, {
        accion: 'negocio_reasignar_vendedor',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: { embajadorId: neg.embajadorId },
        datosNuevos: { embajadorId },
        motivo: motivo ?? null,
    });

    return { ok: true, negocio: act };
}

// =============================================================================
// MARCAR PAGADO (activación manual — SOLO SuperAdmin)
// =============================================================================

export interface OpcionesMarcarPagado {
    /** Fecha (ISO) hasta la que queda al corriente: escribe vencimiento y próximo cobro. */
    hasta: string;
    /** Toggle del diálogo: pausar el cobro automático de la tarjeta. Solo tiene efecto si
     *  el negocio tiene suscripción de Stripe; sin suscripción se ignora. */
    pausarStripe: boolean;
}

export async function marcarPagado(
    panel: UsuarioPanel,
    negocioId: string,
    opciones: OpcionesMarcarPagado,
): Promise<ResultadoAccion> {
    const cargado = await cargarNegocioConAlcance(panel, negocioId);
    if (!cargado.ok) return cargado;
    const neg = cargado.negocio;

    // Un negocio CANCELADO no se revive desde aquí (§4.8): sería un alta nueva.
    if (neg.estadoAdmin === 'archivado') {
        return { ok: false, status: 409, mensaje: 'El negocio está cancelado/archivado; no se puede marcar pagado.' };
    }

    const tieneSuscripcion = !!neg.stripeSubscriptionId;
    // Toggle ON + con suscripción → pausa la tarjeta (cortesía) y método 'manual'. Cualquier
    // otro caso con suscripción → método 'tarjeta' y se asegura de que el cobro siga corriendo
    // (p.ej. si venía pausado de una suspensión previa). Sin suscripción → siempre 'manual'.
    const debePausar = tieneSuscripcion && opciones.pausarStripe;
    const nuevoMetodoCobro: 'tarjeta' | 'manual' =
        tieneSuscripcion && !opciones.pausarStripe ? 'tarjeta' : 'manual';

    const ahora = new Date().toISOString();
    const [act] = await db
        .update(negocios)
        .set({
            estadoAdmin: 'activo',
            activo: true,
            estadoMembresia: 'al_corriente',
            metodoCobro: nuevoMetodoCobro,
            fechaVencimiento: opciones.hasta,
            fechaProximoCobro: opciones.hasta,
            fechaInicioGracia: null,
            fechaLimiteGracia: null,
            updatedAt: ahora,
        })
        .where(eq(negocios.id, negocioId))
        .returning({
            id: negocios.id,
            estadoAdmin: negocios.estadoAdmin,
            activo: negocios.activo,
            embajadorId: negocios.embajadorId,
        });

    // Stripe: sincroniza el cobro con la intención del admin (BD ya quedó activa; §4.3).
    let advertenciaStripe: string | null = null;
    if (tieneSuscripcion) {
        const r = debePausar
            ? await pausarCobroSuscripcion(neg.stripeSubscriptionId!)
            : await reanudarCobroSuscripcion(neg.stripeSubscriptionId!);
        if (!r.ok) advertenciaStripe = r.aviso ?? 'No se pudo sincronizar el cobro en Stripe.';
    }

    await registrarAuditoria(panel, {
        accion: 'negocio_marcar_pagado',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: {
            estadoAdmin: neg.estadoAdmin,
            activo: neg.activo,
            estadoMembresia: neg.estadoMembresia,
            metodoCobro: neg.metodoCobro,
        },
        datosNuevos: {
            estadoAdmin: 'activo',
            activo: true,
            estadoMembresia: 'al_corriente',
            metodoCobro: nuevoMetodoCobro,
            hasta: opciones.hasta,
            pausarStripe: debePausar,
        },
        motivo: null,
    });

    // Reaparece en circulación → borrar el aviso de "fuera de circulación" del dueño.
    await limpiarNotificacionNegocioFueraDeCirculacion(negocioId);

    return { ok: true, negocio: act, advertenciaStripe };
}

// =============================================================================
// CANCELAR (baja recuperable — SOLO SuperAdmin) — la acción es la fuente de verdad
// =============================================================================

export async function cancelarNegocio(
    panel: UsuarioPanel,
    negocioId: string,
    motivo: string,
): Promise<ResultadoAccion> {
    const cargado = await cargarNegocioConAlcance(panel, negocioId);
    if (!cargado.ok) return cargado;
    const neg = cargado.negocio;

    if (neg.estadoAdmin === 'archivado') {
        return { ok: false, status: 409, mensaje: 'El negocio ya está cancelado/archivado' };
    }

    const ahora = new Date().toISOString();

    // 1) Cortar la suscripción en Stripe (solo si hay). Defensivo; aviso visible si falla.
    let advertenciaStripe: string | null = null;
    if (neg.stripeSubscriptionId) {
        const r = await cancelarSuscripcion(neg.stripeSubscriptionId);
        if (!r.ok) advertenciaStripe = r.aviso ?? 'No se pudo cancelar la suscripción en Stripe.';
    }

    // 2) Degradar al dueño a personal COMPLETO (igual que revocarGerente), en el MISMO set
    //    (respeta el CHECK usuarios_modo_comercial_logico_check). Se MANTIENE negocioId: el
    //    archivado es recuperable y el negocio debe recordar a su dueño. NUNCA se expulsa a la
    //    persona (conserva cuenta, puntos e historial como cliente).
    await db
        .update(usuarios)
        .set({
            tieneModoComercial: false,
            modoActivo: 'personal',
            perfil: 'personal',
            updatedAt: ahora,
        })
        .where(eq(usuarios.id, neg.usuarioId));

    // 3) Archivar el negocio (soft-delete recuperable): fuera de circulación + cancelado.
    const [act] = await db
        .update(negocios)
        .set({
            estadoAdmin: 'archivado',
            activo: false,
            estadoMembresia: 'cancelado',
            updatedAt: ahora,
        })
        .where(eq(negocios.id, negocioId))
        .returning({
            id: negocios.id,
            estadoAdmin: negocios.estadoAdmin,
            activo: negocios.activo,
            embajadorId: negocios.embajadorId,
        });

    // 4) Devolver a los clientes los puntos de sus vales PENDIENTES en este negocio
    //    (idempotente). Import dinámico: mismo patrón que el webhook, evita ciclos de módulo.
    try {
        const { revertirVouchersPendientesPorCancelacion } = await import('../puntos.service.js');
        const reversion = await revertirVouchersPendientesPorCancelacion(negocioId);
        if (reversion.vouchersRevertidos > 0) {
            console.log(`↩️ Cancelación manual: ${reversion.vouchersRevertidos} vouchers, ${reversion.puntosDevueltos} pts devueltos (negocio ${negocioId}).`);
        }
    } catch (errRev) {
        console.error('Error devolviendo puntos de vouchers en cancelación manual:', errRev);
    }

    // 5) Auditoría.
    await registrarAuditoria(panel, {
        accion: 'negocio_cancelar',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: { estadoAdmin: neg.estadoAdmin, activo: neg.activo, estadoMembresia: neg.estadoMembresia },
        datosNuevos: { estadoAdmin: 'archivado', activo: false, estadoMembresia: 'cancelado' },
        motivo,
    });

    // 6) Notificar al dueño (idempotente tras B6: no duplica si el webhook también corre).
    await notificarNegocioFueraDeCirculacion(negocioId);

    // 7) Limpiar el enlace de suscripción AL FINAL: si se borra antes, el webhook de Stripe
    //    (customer.subscription.deleted) llegaría "ciego" (no encuentra al usuario por subId)
    //    y no podría hacer su refuerzo idempotente. Hecho aquí, el webhook refuerza y luego
    //    queda como no-op.
    if (neg.stripeSubscriptionId) {
        await db
            .update(usuarios)
            .set({ stripeSubscriptionId: null, updatedAt: new Date().toISOString() })
            .where(eq(usuarios.id, neg.usuarioId));
    }

    return { ok: true, negocio: act, advertenciaStripe };
}
