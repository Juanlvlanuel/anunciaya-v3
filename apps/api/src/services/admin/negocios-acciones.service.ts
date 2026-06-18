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
import { dispararDevengoMesActual, devengarComisionAlta } from './comisiones-devengo.service.js';
import { registrarCobroEfectivo } from './comisiones-efectivo.service.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import type { EditarPagoInput } from '../../validations/admin/editarPago.schema.js';
import { registrarAuditoria } from './auditoria.service.js';
import { resolverEmbajadorId } from './negocios.service.js';
import { notificarNegocioFueraDeCirculacion, limpiarNotificacionNegocioFueraDeCirculacion } from '../notificaciones.service.js';
import { pausarCobroSuscripcion, reanudarCobroSuscripcion, cancelarSuscripcion, empujarCobroSuscripcion, leerProximoCobroStripe } from '../suscripciones/acciones-stripe.js';
import { randomInt } from 'crypto';
import { guardarCodigoRecuperacion } from '../../utils/tokenStore.js';
import { enviarCodigoCrearContrasena, enviarCodigoRecuperacion, enviarComprobantePagoMembresia, enviarReciboCancelado } from '../../utils/email.js';
import { prepararReciboPago } from './recibo-pago.service.js';
import { registrarPagoManual } from './pagos-manuales.service.js';

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
    /** Próximo cobro vigente ANTES de la acción (para capturar la fecha previa al empujar Stripe). */
    fechaProximoCobro: string | null;
    /** Suscripción de Stripe del DUEÑO (vive en `usuarios`, no en `negocios`). */
    stripeSubscriptionId: string | null;
    /** Nombre del negocio — para el comprobante de pago al dueño. */
    nombreNegocio: string;
    /** Correo del DUEÑO (destinatario del comprobante). */
    correoDueno: string | null;
    /** Nombre del DUEÑO (saludo del comprobante). */
    nombreDueno: string | null;
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
            fechaProximoCobro: negocios.fechaProximoCobro,
            nombreNegocio: negocios.nombre,
            // La suscripción de Stripe y los datos de contacto viven en el DUEÑO (join 1:1).
            stripeSubscriptionId: usuarios.stripeSubscriptionId,
            correoDueno: usuarios.correo,
            nombreDueno: usuarios.nombre,
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

    // VENDEDOR: solo sobre los negocios de SU cartera (mismo embajador atribuido). Sin esto, un
    // vendedor podría actuar sobre cualquier negocio (el `if gerente` no lo cubre).
    if (panel.rolEquipo === 'vendedor') {
        const embId = await resolverEmbajadorId(panel.usuarioId);
        if (!embId || neg.embajadorId !== embId) {
            return { ok: false, status: 403, mensaje: 'El negocio no está en tu cartera.' };
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

    // El estado del negocio cambió (afecta el # de activos del vendedor): recalcula la comisión del mes
    // en curso (best-effort) sin esperar al cron diario.
    await dispararDevengoMesActual();
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

    // El estado del negocio cambió (afecta el # de activos del vendedor): recalcula la comisión del mes
    // en curso (best-effort) sin esperar al cron diario.
    await dispararDevengoMesActual();
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

    // Cambió la atribución → cambian los activos del vendedor anterior y del nuevo: recalcula la comisión
    // del mes en curso para ambos (best-effort) sin esperar al cron diario.
    await dispararDevengoMesActual();

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

    // La CORTESÍA (regalar membresía) es decisión EXCLUSIVA del superadmin: regalar ingreso es
    // sensible y no debe quedar en manos de gerentes ni vendedores. Candado real (la UI lo oculta).
    if (opciones.concepto === 'cortesia' && panel.rolEquipo !== 'superadmin') {
        return { ok: false, status: 403, mensaje: 'Solo un administrador puede registrar una cortesía.' };
    }

    // El VENDEDOR solo registra cobros en EFECTIVO/transferencia de sus negocios MANUALES (sin
    // tarjeta): los de tarjeta los cobra Stripe (no debe tocarlos). Su cartera ya la valida
    // cargarNegocioConAlcance.
    if (panel.rolEquipo === 'vendedor') {
        if (neg.stripeSubscriptionId) {
            return { ok: false, status: 403, mensaje: 'Este negocio cobra con tarjeta (Stripe); no puedes registrarle un pago manual.' };
        }
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

    // Fecha de cobro PREVIA a este pago (para devolver el adelanto si luego se anula). La verdad de
    // Stripe (`current_period_end`) manda sobre la BD: en un negocio recién creado en trial, la BD
    // puede no tener `fecha_proximo_cobro` todavía (la escribe el webhook `subscription.updated`,
    // que puede tardar). Sin suscripción, se usa la fecha de la BD.
    let cobroPrevioISO: string | null = neg.fechaProximoCobro;
    if (tieneSuscripcion) {
        const cobroStripe = await leerProximoCobroStripe(neg.stripeSubscriptionId!);
        if (cobroStripe) cobroPrevioISO = cobroStripe;
    }

    // Atómico: activar el negocio + dejar el registro contable van juntos o no van. Stripe
    // queda FUERA de la transacción (es externo; §4.3: la BD manda aunque Stripe falle).
    const { negocio: act, pagoId } = await db.transaction(async (tx) => {
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
                // "Cliente desde": sella el PRIMER pago real (no en cortesía). COALESCE → solo la 1ª vez.
                ...(opciones.concepto !== 'cortesia' ? { fechaPrimerPago: sql`COALESCE(${negocios.fechaPrimerPago}, CURRENT_DATE)` } : {}),
                updatedAt: ahora,
            })
            .where(eq(negocios.id, negocioId))
            .returning({
                id: negocios.id,
                estadoAdmin: negocios.estadoAdmin,
                activo: negocios.activo,
                embajadorId: negocios.embajadorId,
            });

        // Registro contable + gemelo en el libro mayor (bitácora), en la MISMA transacción, vía el
        // helper único que comparten marcarPagado y el alta manual. `cobroPrevio` = fecha de cobro
        // vigente ANTES de este pago: con tarjeta permite devolver el trial_end a la fecha original
        // si luego se anula el último pago (deshacer el adelanto). Cortesía = sin monto.
        const { pagoId: pagoManualId, folio } = await registrarPagoManual(tx, {
            negocioId,
            monto: montoRegistrado,
            concepto: opciones.concepto,
            meses: opciones.meses ?? null,
            hasta: opciones.hasta,
            registradoPor: panel.usuarioId,
            cobroPrevio: cobroPrevioISO,
            metodoCobro: nuevoMetodoCobro,
            fechaEvento: ahora,
        });

        return { negocio: actualizado, pagoId: pagoManualId, folio };
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

    // Comprobante al DUEÑO (defensa Camino B — "robo invisible"): genera el recibo PDF (R2) y manda
    // el correo con el link de descarga. Best-effort: ni el PDF ni el correo revierten el pago asentado.
    if (pagoId) {
        try {
            const rec = await prepararReciboPago(pagoId);
            if (rec?.correoDueno) {
                await enviarComprobantePagoMembresia(rec.correoDueno, rec.nombreDueno ?? '', {
                    nombreNegocio: rec.nombreNegocio,
                    concepto: rec.concepto,
                    monto: rec.monto,
                    hasta: rec.hasta,
                    reciboUrl: rec.reciboUrl,
                });
            }
        } catch {
            console.error('Error al emitir el comprobante de pago (marcarPagado)');
        }
    }

    // El estado del negocio cambió (afecta el # de activos del vendedor): recalcula la comisión del mes
    // en curso (best-effort) sin esperar al cron diario.
    await dispararDevengoMesActual();
    // Comisión de alta del vendedor (pieza C): si éste fue su primer pago real, devéngala (idempotente).
    await devengarComisionAlta(negocioId);
    // Efectivo por entregar (pieza D): si el VENDEDOR registró ESTE pago en EFECTIVO, el dinero lo recibió
    // él y se lo debe entregar a AnunciaYA → se carga como "efectivo por entregar". (Super/gerente lo
    // registran a mano; aquí solo cuando lo cobró el propio vendedor.)
    if (panel.rolEquipo === 'vendedor' && opciones.concepto === 'efectivo' && act.embajadorId && montoRegistrado) {
        await registrarCobroEfectivo(act.embajadorId, negocioId, Number(montoRegistrado), panel.usuarioId);
    }
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

    // El estado del negocio cambió (afecta el # de activos del vendedor): recalcula la comisión del mes
    // en curso (best-effort) sin esperar al cron diario.
    await dispararDevengoMesActual();
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

    // La CORTESÍA (regalar membresía) es exclusiva del superadmin: editar un pago a cortesía
    // equivale a regalar el periodo → ni gerente ni vendedor pueden.
    if (datos.concepto === 'cortesia' && panel.rolEquipo !== 'superadmin') {
        return { ok: false, status: 403, mensaje: 'Solo un administrador puede registrar una cortesía.' };
    }

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

    // Los cobros con TARJETA (Stripe) NO se editan desde el Panel: son cobros reales ya procesados por
    // Stripe; corregirlos a mano dejaría la BD divergente del cargo real.
    if (pago.concepto === 'tarjeta') {
        return { ok: false, status: 409, mensaje: 'Este pago se cobró con tarjeta (Stripe) y no se puede editar desde el Panel.' };
    }

    // Solo se edita el ÚLTIMO pago vigente (el que define "Vigencia hasta"). Un pago anterior es
    // historia financiera ya asentada: para corregirlo, anúlalo y regístralo de nuevo (deja rastro
    // auditable y no manipula ingresos pasados en silencio).
    const [reciente] = (await db.execute(sql`
        SELECT id::text AS id FROM pagos_membresia
        WHERE negocio_id = ${negocioId} AND anulado = false
        ORDER BY fecha_pago DESC, created_at DESC LIMIT 1
    `)).rows as Array<{ id: string }>;
    if (reciente?.id !== pagoId) {
        return { ok: false, status: 409, mensaje: 'Solo se puede editar el último pago. Para corregir uno anterior, anúlalo y regístralo de nuevo.' };
    }

    // Cortesía nunca lleva monto (decisión de producto + CHECK en BD).
    const montoNuevo = datos.concepto === 'cortesia' ? null : (datos.monto ?? null);

    // El periodo que cubre el pago SIEMPRE se deriva de cuándo se pagó + los meses indicados.
    const base = pago.fechaPago ? new Date(pago.fechaPago) : new Date();
    base.setMonth(base.getMonth() + datos.meses);
    const nuevoPeriodoHasta = base.toISOString();

    // Atómico: el pago corregido + el traslado de la vigencia (siempre: es el último pago) van juntos.
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

        // Sincronizar el evento gemelo en la bitácora financiera (eventos_pago): refleja la
        // corrección de monto + metadata (concepto/meses/vigencia). Antes el libro mayor quedaba viejo.
        await tx.execute(sql`
            UPDATE eventos_pago
            SET monto = ${montoNuevo != null ? String(montoNuevo) : null},
                metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ concepto: datos.concepto, meses: datos.meses, hasta: nuevoPeriodoHasta })}::jsonb
            WHERE referencia_id = ${pagoId} AND tipo = 'pago_manual'
        `);

        await tx
            .update(negocios)
            .set({ fechaVencimiento: nuevoPeriodoHasta, fechaProximoCobro: nuevoPeriodoHasta, updatedAt: new Date().toISOString() })
            .where(eq(negocios.id, negocioId));
    });

    await registrarAuditoria(panel, {
        accion: 'negocio_editar_pago',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: { pagoId, concepto: pago.concepto, monto: pago.monto, mesesCubiertos: pago.mesesCubiertos, periodoHasta: pago.periodoHasta },
        datosNuevos: { pagoId, concepto: datos.concepto, monto: montoNuevo, mesesCubiertos: datos.meses, periodoHasta: nuevoPeriodoHasta },
        motivo: null,
    });

    // Comprobante CORREGIDO al dueño (best-effort, como en marcarPagado §9.1): regenera el recibo
    // PDF (mismo folio) con los datos ya corregidos y reenvía el correo. No revierte la edición si
    // el PDF/correo fallan.
    try {
        const rec = await prepararReciboPago(pagoId);
        if (rec?.correoDueno) {
            await enviarComprobantePagoMembresia(rec.correoDueno, rec.nombreDueno ?? '', {
                nombreNegocio: rec.nombreNegocio,
                concepto: rec.concepto,
                monto: rec.monto,
                hasta: rec.hasta,
                reciboUrl: rec.reciboUrl,
                esCorreccion: true,
            });
        }
    } catch {
        console.error('Error al reenviar el comprobante de pago (editarPago)');
    }

    return { ok: true };
}

// =============================================================================
// REENVIAR EL RECIBO DE UN PAGO (super + gerente + vendedor · alcance por rol)
// =============================================================================

export type ResultadoReenvio =
    | { ok: true; correoEnviado: boolean }
    | { ok: false; status: number; mensaje: string };

/**
 * Reenvía el comprobante de un pago ya registrado al correo del dueño (caso: no le llegó, lo borró,
 * o se le corrigió el correo). **Regenera** el recibo PDF con los datos actuales del pago (mismo
 * folio) → así el recibo siempre refleja el estado vigente (útil tras editar un pago). Devuelve si el
 * correo salió. Alcance: SuperAdmin (cualquiera) / Gerente (su región) / Vendedor (su cartera). El pago debe ser del negocio.
 */
export async function reenviarReciboPago(
    panel: UsuarioPanel,
    negocioId: string,
    pagoId: string,
): Promise<ResultadoReenvio> {
    const cargado = await cargarNegocioConAlcance(panel, negocioId);
    if (!cargado.ok) return cargado;

    // El pago debe existir Y pertenecer a ESTE negocio (evita reenviar el de otro vía URL).
    const [pago] = await db
        .select({ id: pagosMembresia.id })
        .from(pagosMembresia)
        .where(and(eq(pagosMembresia.id, pagoId), eq(pagosMembresia.negocioId, negocioId)))
        .limit(1);
    if (!pago) return { ok: false, status: 404, mensaje: 'Pago no encontrado en este negocio.' };

    const rec = await prepararReciboPago(pagoId);
    if (!rec) return { ok: false, status: 404, mensaje: 'No se pudo preparar el recibo.' };
    if (!rec.correoDueno) return { ok: false, status: 409, mensaje: 'El dueño no tiene un correo registrado.' };

    let correoEnviado = false;
    try {
        const env = await enviarComprobantePagoMembresia(rec.correoDueno, rec.nombreDueno ?? '', {
            nombreNegocio: rec.nombreNegocio,
            concepto: rec.concepto,
            monto: rec.monto,
            hasta: rec.hasta,
            reciboUrl: rec.reciboUrl,
        });
        correoEnviado = env.success;
    } catch {
        console.error('Error al reenviar el comprobante de pago');
    }

    await registrarAuditoria(panel, {
        accion: 'negocio_reenviar_recibo',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: null,
        datosNuevos: { pagoId, correoEnviado },
        motivo: null,
    });

    return { ok: true, correoEnviado };
}

// =============================================================================
// ANULAR UN PAGO (borrado lógico — super + gerente · solo negocios manuales)
// =============================================================================

export type ResultadoAnulacion =
    | { ok: true; advertenciaStripe: string | null }
    | { ok: false; status: number; mensaje: string };

/**
 * Anula (borrado lógico) un pago registrado por error. El pago NO se borra: se marca `anulado`
 * (con quién/cuándo/por qué). En la MISMA transacción: (1) marca el pago, (2) saca su ingreso del
 * libro mayor (`eventos_pago.monto = NULL` → deja de sumar en KPIs), (3) **recalcula la vigencia**
 * del negocio desde el pago más reciente NO anulado; si ya no queda ninguno, la DEVUELVE a la fecha
 * de cobro original (la previa al primer pago manual, `cobro_previo`). Luego avisa al dueño (correo
 * de cancelación, best-effort).
 *
 * **Negocios con tarjeta (Stripe):** anular es SIMÉTRICO a "Registrar pago". Como aquel empuja el
 * `trial_end`, al anular se RE-EMPUJA el cobro: a la vigencia recalculada si queda otro pago, o a la
 * fecha de cobro ORIGINAL si se anuló el último → la fecha "regresa" sola y la cancelación se refleja
 * en Stripe. Si no hay fecha a la cual volver (pagos viejos sin `cobro_previo`, o ya pasó) o Stripe
 * la rechaza, NO se toca Stripe y se devuelve `advertenciaStripe` para ajustarlo a mano (§4.3: la BD
 * manda; la parte de Stripe nunca se entierra en un log).
 *
 * Alcance: SuperAdmin / Gerente (su región).
 */
export async function anularPagoMembresia(
    panel: UsuarioPanel,
    negocioId: string,
    pagoId: string,
    motivo: string,
): Promise<ResultadoAnulacion> {
    const cargado = await cargarNegocioConAlcance(panel, negocioId);
    if (!cargado.ok) return cargado;
    const neg = cargado.negocio;

    const [pago] = await db
        .select({
            id: pagosMembresia.id,
            anulado: pagosMembresia.anulado,
            monto: pagosMembresia.monto,
            folio: pagosMembresia.folio,
            concepto: pagosMembresia.concepto,
            periodoHasta: pagosMembresia.periodoHasta,
        })
        .from(pagosMembresia)
        .where(and(eq(pagosMembresia.id, pagoId), eq(pagosMembresia.negocioId, negocioId)))
        .limit(1);
    if (!pago) return { ok: false, status: 404, mensaje: 'Pago no encontrado en este negocio.' };
    if (pago.anulado) return { ok: false, status: 409, mensaje: 'Este pago ya está anulado.' };

    // Los cobros con TARJETA (Stripe) NO se anulan desde el Panel: el cobro real ya ocurrió en Stripe.
    // Un reembolso, si aplica, se hace en Stripe (a futuro como acción dedicada).
    if (pago.concepto === 'tarjeta') {
        return { ok: false, status: 409, mensaje: 'Este pago se cobró con tarjeta (Stripe) y no se puede anular desde el Panel.' };
    }

    const ahora = new Date().toISOString();

    const stripeTarget = await db.transaction(async (tx) => {
        // 1) Marcar el pago como anulado (no se borra: queda para auditoría).
        await tx
            .update(pagosMembresia)
            .set({ anulado: true, anuladoAt: ahora, anuladoPor: panel.usuarioId, motivoAnulacion: motivo })
            .where(eq(pagosMembresia.id, pagoId));

        // 2) Sacar el ingreso del libro mayor: monto=NULL (deja de sumar en KPIs) + metadata anulado.
        await tx.execute(sql`
            UPDATE eventos_pago
            SET monto = NULL,
                metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ anulado: true, motivo, anuladoAt: ahora })}::jsonb
            WHERE referencia_id = ${pagoId} AND tipo = 'pago_manual'
        `);

        // 3) Recalcular la vigencia desde el pago más reciente NO anulado.
        const [vig] = (await tx.execute(sql`
            SELECT periodo_hasta::text AS periodo_hasta
            FROM pagos_membresia
            WHERE negocio_id = ${negocioId} AND anulado = false
            ORDER BY fecha_pago DESC, created_at DESC
            LIMIT 1
        `)).rows as Array<{ periodo_hasta: string }>;
        if (vig?.periodo_hasta) {
            await tx
                .update(negocios)
                .set({ fechaVencimiento: vig.periodo_hasta, fechaProximoCobro: vig.periodo_hasta, updatedAt: ahora })
                .where(eq(negocios.id, negocioId));
            return vig.periodo_hasta;
        }

        // 3b) Ya no queda pago vigente: DEVOLVER el cobro a la fecha ORIGINAL — la que había antes
        // del PRIMER pago manual (`cobro_previo` del más antiguo). Solo si es FUTURA; si ya pasó o
        // no se guardó (pagos previos a la migración), se deja como está y se avisa a mano.
        const [previo] = (await tx.execute(sql`
            SELECT cobro_previo::text AS cobro_previo
            FROM pagos_membresia
            WHERE negocio_id = ${negocioId} AND cobro_previo IS NOT NULL
            ORDER BY fecha_pago ASC, created_at ASC
            LIMIT 1
        `)).rows as Array<{ cobro_previo: string | null }>;
        const original = previo?.cobro_previo ?? null;
        if (original && new Date(original).getTime() > Date.parse(ahora)) {
            await tx
                .update(negocios)
                .set({ fechaVencimiento: original, fechaProximoCobro: original, updatedAt: ahora })
                .where(eq(negocios.id, negocioId));
            return original;
        }
        return null;
    });

    // Stripe (fuera de la transacción, §4.3): simétrico a "Registrar pago". Como aquel empujó el
    // trial_end al registrar, al anular lo RE-EMPUJAMOS: a la vigencia recalculada si queda otro
    // pago, o a la fecha de cobro ORIGINAL (previa al primer pago manual) si se anuló el último →
    // la fecha "regresa" sola. Si no hay fecha a la cual volver (pagos viejos sin el dato, o ya
    // pasó) o Stripe la rechaza, NO se toca Stripe y se avisa para ajustarlo a mano.
    let advertenciaStripe: string | null = null;
    if (neg.stripeSubscriptionId) {
        if (stripeTarget) {
            const r = await empujarCobroSuscripcion(neg.stripeSubscriptionId, stripeTarget);
            if (!r.ok) advertenciaStripe = r.aviso ?? 'No se pudo reajustar el cobro en Stripe.';
        } else {
            advertenciaStripe = 'Ya no queda ningún pago vigente; ajusta el cobro de la tarjeta directamente en Stripe.';
        }
    }

    await registrarAuditoria(panel, {
        accion: 'negocio_anular_pago',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: { pagoId, folio: pago.folio, monto: pago.monto, concepto: pago.concepto, periodoHasta: pago.periodoHasta },
        datosNuevos: { anulado: true },
        motivo,
    });

    // Aviso al dueño (best-effort): correo de cancelación del recibo.
    try {
        const [d] = (await db.execute(sql`
            SELECT u.correo, u.nombre, n.nombre AS nombre_negocio
            FROM negocios n JOIN usuarios u ON u.id = n.usuario_id
            WHERE n.id = ${negocioId} LIMIT 1
        `)).rows as Array<{ correo: string | null; nombre: string | null; nombre_negocio: string }>;
        if (d?.correo) {
            await enviarReciboCancelado(d.correo, d.nombre ?? '', {
                nombreNegocio: d.nombre_negocio,
                folio: pago.folio ?? pagoId,
                monto: pago.monto != null ? Number(pago.monto) : null,
                motivo,
            });
        }
    } catch {
        console.error('Error al enviar el aviso de recibo cancelado');
    }

    return { ok: true, advertenciaStripe };
}
