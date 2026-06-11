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

import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { negocios, embajadores, usuarios, pagosMembresia } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import type { EditarPagoInput } from '../../validations/admin/editarPago.schema.js';
import { registrarAuditoria } from './auditoria.service.js';
import { notificarNegocioFueraDeCirculacion, limpiarNotificacionNegocioFueraDeCirculacion } from '../notificaciones.service.js';
import { pausarCobroSuscripcion, reanudarCobroSuscripcion, cancelarSuscripcion, empujarCobroSuscripcion } from '../suscripciones/acciones-stripe.js';
import { randomInt } from 'crypto';
import { guardarCodigoRecuperacion } from '../../utils/tokenStore.js';
import { enviarCodigoCrearContrasena, enviarCodigoRecuperacion } from '../../utils/email.js';

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
// CAMBIAR CORREO DEL DUEÑO (Fase 4 · rescatar alta manual con correo mal tecleado)
// =============================================================================

export type ResultadoCambioCorreo =
    | { ok: true; correoEnviado: boolean }
    | { ok: false; status: number; mensaje: string };

/**
 * Corrige el correo del DUEÑO de un negocio (caso: el vendedor lo tecleó mal en el alta manual y el
 * dueño nunca recibió el código para crear su contraseña). El cambio se guarda SIEMPRE; el correo
 * nuevo nace SIN verificar (modelo C: se verifica cuando el dueño cree su contraseña con el código).
 * Reenvía el código al correo corregido (best-effort) y DEVUELVE si el envío salió o no — a
 * diferencia de solicitarRecuperacion, que oculta el éxito por seguridad — para que el admin sepa
 * si el dueño ya lo recibió o debe reintentar. SuperAdmin (cualquiera) / Gerente (su región).
 */
export async function cambiarCorreoDueno(
    panel: UsuarioPanel,
    negocioId: string,
    correoNuevo: string,            // ya normalizado (lowercase/trim) por el schema Zod del controller
): Promise<ResultadoCambioCorreo> {
    const cargado = await cargarNegocioConAlcance(panel, negocioId);
    if (!cargado.ok) return cargado;

    const usuarioId = cargado.negocio.usuarioId;

    const [dueno] = await db
        .select({ correo: usuarios.correo, nombre: usuarios.nombre, contrasenaHash: usuarios.contrasenaHash })
        .from(usuarios)
        .where(eq(usuarios.id, usuarioId))
        .limit(1);
    if (!dueno) return { ok: false, status: 404, mensaje: 'No se encontró la cuenta del dueño.' };

    if (dueno.correo === correoNuevo) {
        return { ok: false, status: 409, mensaje: 'El dueño ya tiene ese correo.' };
    }

    // Unicidad: el correo nuevo no debe pertenecer a OTRA cuenta.
    const enUso = (await db.execute(
        sql`SELECT 1 FROM usuarios WHERE correo = ${correoNuevo} AND id <> ${usuarioId} LIMIT 1`,
    )).rows.length > 0;
    if (enUso) return { ok: false, status: 409, mensaje: 'Ya existe una cuenta con ese correo.' };

    const ahora = new Date().toISOString();

    // El correo nuevo nace SIN verificar (se verifica al crear la contraseña con el código).
    await db
        .update(usuarios)
        .set({ correo: correoNuevo, correoVerificado: false, correoVerificadoAt: null, updatedAt: ahora })
        .where(eq(usuarios.id, usuarioId));

    await registrarAuditoria(panel, {
        accion: 'negocio_cambiar_correo_dueno',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: { correo: dueno.correo },
        datosNuevos: { correo: correoNuevo },
        motivo: null,
    });

    // Reenvío del código al correo corregido (best-effort). Capturamos el resultado REAL del envío
    // para informar al admin (el cambio ya quedó guardado, falle o no el correo).
    let correoEnviado = false;
    try {
        const codigo = String(randomInt(100000, 1000000));
        const guardado = await guardarCodigoRecuperacion(correoNuevo, codigo);
        if (guardado) {
            const env = dueno.contrasenaHash
                ? await enviarCodigoRecuperacion(correoNuevo, dueno.nombre, codigo)
                : await enviarCodigoCrearContrasena(correoNuevo, dueno.nombre, codigo);
            correoEnviado = env.success;
        }
    } catch (error) {
        console.error('Error reenviando el código tras cambiar el correo del dueño:', error);
    }

    return { ok: true, correoEnviado };
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
        // Solo cambia el vendedor (dinero). Ya NO escribe region_id (se eliminó en el Paso 10).
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
// MARCAR PAGADO (activación manual — SuperAdmin + Gerente · alcance de región)
// =============================================================================

export interface OpcionesMarcarPagado {
    /** Fecha (ISO) hasta la que queda al corriente: escribe vencimiento y próximo cobro,
     *  y (con suscripción) es el nuevo trial_end que se empuja en Stripe. */
    hasta: string;
    /** Cómo pagó: efectivo/transferencia (ingreso, lleva monto) o cortesía (sin monto). */
    concepto: 'efectivo' | 'transferencia' | 'cortesia';
    /** Monto cobrado (MXN). Solo efectivo/transferencia; en cortesía va null. */
    monto?: number | null;
    /** N meses elegidos (modo "por meses"); null en "fecha exacta". Solo para el registro. */
    meses?: number | null;
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

    // Guard v1 (Opción A): con suscripción, "Marcar pagado" SOLO opera sobre negocios al
    // corriente. Si está en gracia/suspendido hay un cobro pendiente en Stripe (factura
    // abierta / reintentos), y empujar el ancla podría chocar con ese cobro → la
    // regularización del moroso se resuelve en una versión posterior. Sin suscripción no
    // hay factura de Stripe, así que ese caso NO lleva guard (sigue como hoy).
    if (tieneSuscripcion && neg.estadoMembresia !== 'al_corriente') {
        return {
            ok: false,
            status: 409,
            mensaje: 'Este negocio tiene un cobro pendiente en Stripe; aún no se puede marcar pagado por adelantado. La regularización de pagos atrasados llegará en una versión posterior.',
        };
    }

    // Con suscripción → 'tarjeta' (el cobro se difiere pero retoma SOLO al vencer el plazo).
    // Sin suscripción → 'manual' (no hay tarjeta que retome; es un registro en nuestra BD).
    const nuevoMetodoCobro: 'tarjeta' | 'manual' = tieneSuscripcion ? 'tarjeta' : 'manual';
    // Cortesía nunca lleva monto (decisión de producto + CHECK en BD).
    const montoRegistrado = opciones.concepto === 'cortesia' ? null : (opciones.monto ?? null);

    const ahora = new Date().toISOString();

    // Atómico: activar el negocio + dejar el registro contable van juntos o no van. Stripe
    // queda FUERA de la transacción (es externo; §4.3: la BD manda aunque Stripe falle).
    const act = await db.transaction(async (tx) => {
        const [actualizado] = await tx
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

        // Registro contable/histórico del pago manual (primer ladrillo de la bitácora).
        await tx.insert(pagosMembresia).values({
            negocioId,
            monto: montoRegistrado != null ? String(montoRegistrado) : null,
            concepto: opciones.concepto,
            mesesCubiertos: opciones.meses ?? null,
            periodoHasta: opciones.hasta,
            registradoPor: panel.usuarioId,
        });

        return actualizado;
    });

    // Stripe (fuera de la transacción): EMPUJA el próximo cobro a `hasta` (trial_end absoluto)
    // con retoma automática al vencer. Defensiva (§4.3): si falla, la BD ya quedó aplicada.
    let advertenciaStripe: string | null = null;
    if (tieneSuscripcion) {
        const r = await empujarCobroSuscripcion(neg.stripeSubscriptionId!, opciones.hasta);
        if (!r.ok) advertenciaStripe = r.aviso ?? 'No se pudo empujar el cobro en Stripe.';
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
            concepto: opciones.concepto,
            monto: montoRegistrado,
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

    // 2+3) Degradar al dueño y archivar el negocio van JUNTOS (transacción atómica): si uno
    //    falla, no queda el estado partido (dueño personal con negocio aún activo, o al revés).
    //    Stripe (paso 1) y los vouchers (paso 4, idempotente) quedan FUERA, por ser externos /
    //    con su propia transacción.
    //    - Degradar al dueño a personal COMPLETO (igual que revocarGerente), en el MISMO set
    //      (respeta el CHECK usuarios_modo_comercial_logico_check). Se MANTIENE negocioId: el
    //      archivado es recuperable y el negocio debe recordar a su dueño. NUNCA se expulsa a la
    //      persona (conserva cuenta, puntos e historial como cliente).
    //    - Archivar el negocio (soft-delete recuperable): fuera de circulación + cancelado.
    const act = await db.transaction(async (tx) => {
        await tx
            .update(usuarios)
            .set({
                tieneModoComercial: false,
                modoActivo: 'personal',
                perfil: 'personal',
                updatedAt: ahora,
            })
            .where(eq(usuarios.id, neg.usuarioId));

        const [archivado] = await tx
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
        return archivado;
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

// =============================================================================
// EDITAR UN PAGO DEL HISTORIAL (corregir concepto/monto/meses — super + gerente)
// =============================================================================

export type ResultadoEdicionPago =
    | { ok: true }
    | { ok: false; status: number; mensaje: string };

/**
 * Corrige una fila de `pagos_membresia` (concepto, monto y meses cubiertos) — p. ej. se capturó
 * "efectivo" cuando era "transferencia", o el monto/los meses están mal. NO cambia el
 * `metodo_cobro` ni toca Stripe. Cortesía ⇒ monto NULL (decisión + CHECK).
 *
 * Vigencia: el periodo que cubre el pago se recalcula SIEMPRE (= `fecha_pago` + meses), así cada
 * guardado deja el dato consistente (aunque los meses no cambien respecto al valor previo). Y si
 * ese pago es el MÁS RECIENTE del negocio (el que define la vigencia vigente), se traslada
 * `fecha_vencimiento`/`fecha_proximo_cobro`. Para pagos antiguos solo se corrige el registro (la
 * vigencia la define un pago posterior).
 *
 * Alcance: SuperAdmin (cualquiera) / Gerente (su región). El pago debe pertenecer al negocio.
 */
export async function editarPagoMembresia(
    panel: UsuarioPanel,
    negocioId: string,
    pagoId: string,
    datos: EditarPagoInput,
): Promise<ResultadoEdicionPago> {
    const cargado = await cargarNegocioConAlcance(panel, negocioId);
    if (!cargado.ok) return cargado;

    // El pago debe existir Y pertenecer a ESTE negocio (evita editar el de otro vía URL).
    const [pago] = await db
        .select({
            id: pagosMembresia.id,
            concepto: pagosMembresia.concepto,
            monto: pagosMembresia.monto,
            mesesCubiertos: pagosMembresia.mesesCubiertos,
            fechaPago: pagosMembresia.fechaPago,
            periodoHasta: pagosMembresia.periodoHasta,
        })
        .from(pagosMembresia)
        .where(and(eq(pagosMembresia.id, pagoId), eq(pagosMembresia.negocioId, negocioId)))
        .limit(1);
    if (!pago) return { ok: false, status: 404, mensaje: 'Pago no encontrado en este negocio.' };

    // Cortesía nunca lleva monto (decisión de producto + CHECK en BD).
    const montoNuevo = datos.concepto === 'cortesia' ? null : (datos.monto ?? null);

    // El periodo que cubre el pago SIEMPRE se deriva de cuándo se pagó + los meses indicados
    // (así cada guardado deja el dato consistente, aunque los meses no cambien respecto al previo).
    const base = pago.fechaPago ? new Date(pago.fechaPago) : new Date();
    base.setMonth(base.getMonth() + datos.meses);
    const nuevoPeriodoHasta = base.toISOString();

    // ¿este pago es el MÁS RECIENTE del negocio? → es el que define "Vigencia hasta".
    const [reciente] = (await db.execute(sql`
        SELECT id::text AS id FROM pagos_membresia
        WHERE negocio_id = ${negocioId}
        ORDER BY fecha_pago DESC, created_at DESC LIMIT 1
    `)).rows as Array<{ id: string }>;
    const trasladaVigencia = reciente?.id === pagoId;

    // Atómico: el pago corregido + (si aplica) el traslado de la vigencia van juntos.
    await db.transaction(async (tx) => {
        await tx
            .update(pagosMembresia)
            .set({
                concepto: datos.concepto,
                monto: montoNuevo != null ? String(montoNuevo) : null,
                mesesCubiertos: datos.meses,
                periodoHasta: nuevoPeriodoHasta,
            })
            .where(eq(pagosMembresia.id, pagoId));

        if (trasladaVigencia) {
            await tx
                .update(negocios)
                .set({ fechaVencimiento: nuevoPeriodoHasta, fechaProximoCobro: nuevoPeriodoHasta, updatedAt: new Date().toISOString() })
                .where(eq(negocios.id, negocioId));
        }
    });

    await registrarAuditoria(panel, {
        accion: 'negocio_editar_pago',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: { pagoId, concepto: pago.concepto, monto: pago.monto, mesesCubiertos: pago.mesesCubiertos, periodoHasta: pago.periodoHasta },
        datosNuevos: { pagoId, concepto: datos.concepto, monto: montoNuevo, mesesCubiertos: datos.meses, periodoHasta: nuevoPeriodoHasta, vigenciaTrasladada: trasladaVigencia },
        motivo: null,
    });

    return { ok: true };
}
