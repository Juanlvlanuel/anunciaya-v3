/**
 * admin/altaManualNegocio.service.ts
 * ==================================
 * Alta MANUAL de un negocio en efectivo/transferencia desde el Panel (sin Stripe).
 * El negocio queda 100% fuera de Stripe (metodo_cobro='manual', sin customer ni suscripción)
 * y la cuenta del dueño nace SIN contraseña (modelo C: la define en su primer ingreso).
 *
 * El alta y el PRIMER PAGO van juntos: en una transacción crea usuario+negocio+sucursal
 * (reutilizando crearNegocioConDueno) y registra el pago en pagos_membresia (como marcarPagado).
 * La sucursal nace con su ciudad_id REAL (no 'Por configurar') para que el negocio sea visible
 * al gerente/vendedor de la región desde el primer momento.
 *
 * Atribución del vendedor: si lo registra un VENDEDOR se auto-atribuye (su propio embajador);
 * si lo registra gerente/superadmin, el vendedor llega en el body (con candado de región para
 * el gerente). Sin vendedor no bloquea.
 *
 * Ubicación: apps/api/src/services/admin/altaManualNegocio.service.ts
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { negocios, embajadores } from '../../db/schemas/schema.js';
import { crearNegocioConDueno } from '../negocioManagement.service.js';
import { registrarAuditoria } from './auditoria.service.js';
import { registrarPagoManual } from './pagos-manuales.service.js';
import { enviarEmailBienvenida } from '../../utils/email.js';
import { prepararReciboPago } from './recibo-pago.service.js';
import { devengarComisionAlta } from './comisiones-devengo.service.js';
import { registrarCobroEfectivo } from './comisiones-efectivo.service.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import type { AltaManualNegocioInput } from '../../validations/admin/altaManualNegocio.schema.js';

export type ResultadoAlta =
    | { ok: true; negocioId: string; usuarioId: string }
    | { ok: false; status: number; mensaje: string };

// =============================================================================
// CATÁLOGO DE CIUDADES (selector del formulario de alta)
// =============================================================================

export interface CiudadCatalogo {
    id: string;
    nombre: string;
    estado: string;
}

/**
 * Ciudades ACTIVAS del catálogo para poblar el selector del alta. Acotado a la región del
 * solicitante cuando la trae (gerente/vendedor por su región; superadmin por el ?regionId del
 * filtro, o todas si no envía). A diferencia de `listarCiudades` (filtro de la tabla, que solo
 * muestra ciudades ya usadas como sede), esto es el catálogo completo habilitable.
 */
export async function listarCatalogoCiudades(panel: UsuarioPanel): Promise<CiudadCatalogo[]> {
    const filtroRegion = panel.regionId ? sql` AND region_id = ${panel.regionId}` : sql``;
    const filas = (await db.execute(sql`
        SELECT id::text AS id, nombre, estado
        FROM ciudades
        WHERE activa = true${filtroRegion}
        ORDER BY importancia DESC, nombre ASC
    `)).rows as Array<{ id: string; nombre: string; estado: string }>;
    return filas.map((f) => ({ id: f.id, nombre: f.nombre, estado: f.estado }));
}

// =============================================================================
// CHEQUEO DE CORREO EN VIVO (aviso temprano del formulario de alta)
// =============================================================================

/**
 * ¿Ya existe una cuenta con ese correo? Replica EXACTAMENTE la comprobación del 409 del alta
 * manual (misma comparación) para que el aviso en vivo prediga el resultado del envío. El correo
 * debe llegar YA normalizado (lowercase/trim, igual que el schema Zod del alta). Responde solo un
 * booleano — no expone datos del usuario.
 */
export async function existeCorreo(correo: string): Promise<boolean> {
    return (await db.execute(
        sql`SELECT 1 FROM usuarios WHERE correo = ${correo} LIMIT 1`,
    )).rows.length > 0;
}

// =============================================================================
// ALTA MANUAL (escritura)
// =============================================================================

export async function altaManualNegocio(
    panel: UsuarioPanel,
    datos: AltaManualNegocioInput,
): Promise<ResultadoAlta> {
    // -------------------------------------------------------------------------
    // 0) Cortesía = regalar membresía → decisión de gerente/superadmin, NUNCA del vendedor de
    //    calle (riesgo de abuso/pérdida de ingreso). Candado real: la UI lo oculta, esto lo blinda.
    // -------------------------------------------------------------------------
    if (datos.concepto === 'cortesia' && panel.rolEquipo !== 'superadmin') {
        return { ok: false, status: 403, mensaje: 'Solo un administrador puede registrar una cortesía.' };
    }

    // -------------------------------------------------------------------------
    // 1) El correo NO debe existir (decisión: rechazar 409; el upgrade/revivir es posterior).
    // -------------------------------------------------------------------------
    const correoExiste = (await db.execute(
        sql`SELECT 1 FROM usuarios WHERE correo = ${datos.correo} LIMIT 1`,
    )).rows.length > 0;
    if (correoExiste) {
        return { ok: false, status: 409, mensaje: 'Ya existe una cuenta con ese correo.' };
    }

    // -------------------------------------------------------------------------
    // 2) Ciudad: debe existir, estar activa y (gerente/vendedor) ser de SU región.
    // -------------------------------------------------------------------------
    const [ciudad] = (await db.execute(sql`
        SELECT id::text AS id, nombre, estado, region_id::text AS region_id, activa
        FROM ciudades WHERE id = ${datos.ciudadId} LIMIT 1
    `)).rows as Array<{ id: string; nombre: string; estado: string; region_id: string | null; activa: boolean }>;

    if (!ciudad) return { ok: false, status: 404, mensaje: 'La ciudad seleccionada no existe.' };
    if (!ciudad.activa) return { ok: false, status: 409, mensaje: 'La ciudad seleccionada no está disponible.' };

    if (panel.rolEquipo === 'gerente' || panel.rolEquipo === 'vendedor') {
        if (!panel.regionId) return { ok: false, status: 403, mensaje: 'No tienes una región asignada.' };
        if (ciudad.region_id !== panel.regionId) {
            return { ok: false, status: 403, mensaje: 'La ciudad seleccionada no pertenece a tu región.' };
        }
    }

    // -------------------------------------------------------------------------
    // 3) Atribución del vendedor: auto (rol vendedor) o del body (gerente/superadmin).
    // -------------------------------------------------------------------------
    let embajadorId: string | null = null;
    if (panel.rolEquipo === 'vendedor') {
        const [emb] = (await db.execute(
            sql`SELECT id::text AS id FROM embajadores WHERE usuario_id = ${panel.usuarioId} AND estado = 'activo' LIMIT 1`,
        )).rows as Array<{ id: string }>;
        if (!emb) return { ok: false, status: 409, mensaje: 'Tu perfil de vendedor no está activo.' };
        embajadorId = emb.id;
    } else if (datos.embajadorId) {
        // Gerente/superadmin eligieron un vendedor: validar existencia + estado + (gerente) región.
        const [emb] = await db
            .select({ id: embajadores.id, estado: embajadores.estado })
            .from(embajadores)
            .where(eq(embajadores.id, datos.embajadorId))
            .limit(1);
        if (!emb) return { ok: false, status: 404, mensaje: 'Vendedor no encontrado.' };
        if (emb.estado !== 'activo') return { ok: false, status: 409, mensaje: 'El vendedor no está activo.' };
        if (panel.rolEquipo === 'gerente') {
            const cubre = (await db.execute(sql`
                SELECT EXISTS (
                    SELECT 1 FROM embajador_ciudades ec
                    JOIN ciudades c ON c.id = ec.ciudad_id
                    WHERE ec.embajador_id = ${datos.embajadorId} AND c.region_id = ${panel.regionId}
                ) AS cubre
            `)).rows as Array<{ cubre: boolean }>;
            if (!cubre[0]?.cubre) {
                return { ok: false, status: 403, mensaje: 'El vendedor no cubre ninguna ciudad de tu región.' };
            }
        }
        embajadorId = datos.embajadorId;
    }

    // -------------------------------------------------------------------------
    // 4) Fechas: el periodo en MESES define el vencimiento. fechaProximoCobro = vencimiento
    //    (igual que marcarPagado); fechaPrimerPago = hoy. El cron de Fase 3 vigilará fecha_vencimiento.
    // -------------------------------------------------------------------------
    // El vencimiento sale de la FECHA exacta (si se mandó) o de hoy + meses.
    let vencISO: string;
    if (datos.hasta) {
        vencISO = new Date(datos.hasta).toISOString();
    } else {
        const venc = new Date();
        venc.setMonth(venc.getMonth() + (datos.meses ?? 1));
        vencISO = venc.toISOString();
    }
    const hoyFecha = new Date().toISOString().slice(0, 10); // YYYY-MM-DD para la columna `date`

    // -------------------------------------------------------------------------
    // 5) Transacción atómica: crear (usuario+negocio+sucursal) + sellar fechas + registrar el pago.
    // -------------------------------------------------------------------------
    const creado = await db.transaction(async (tx) => {
        const { negocio } = await crearNegocioConDueno(tx, {
            nombre: datos.nombre,
            apellidos: datos.apellidos,
            correo: datos.correo,
            telefono: datos.telefono,
            contrasenaHash: null,            // modelo C: cuenta sin contraseña (la define en su 1er ingreso)
            correoVerificado: false,         // modelo C: el correo NO se verificó antes; se verifica al crear la contraseña
            autenticadoPorGoogle: false,
            stripeCustomerId: null,          // sin Stripe
            stripeSubscriptionId: null,      // sin Stripe
            embajadorId,
            nombreNegocio: datos.nombreNegocio,
            metodoCobro: 'manual',
            ciudad: ciudad.nombre,           // texto legible
            ciudadId: ciudad.id,             // FK para el alcance regional
        });

        // Cortesía: sin monto y sin "fecha de primer pago" (no hubo cobro real).
        const esCortesia = datos.concepto === 'cortesia';
        const montoRegistrado = esCortesia ? null : (datos.monto ?? null);

        await tx
            .update(negocios)
            .set({
                fechaVencimiento: vencISO,
                fechaProximoCobro: vencISO,
                fechaPrimerPago: esCortesia ? null : hoyFecha,
                updatedAt: new Date().toISOString(),
            })
            .where(eq(negocios.id, negocio.id));

        // Registro contable + gemelo en el libro mayor (bitácora), vía el helper único que también
        // usa marcarPagado. Antes el alta manual solo insertaba en pagos_membresia → su primer pago
        // no aparecía en el módulo Suscripciones. Es el PRIMER pago: sin `cobroPrevio` y método 'manual'.
        const { pagoId, folio } = await registrarPagoManual(tx, {
            negocioId: negocio.id,
            monto: montoRegistrado,
            concepto: datos.concepto,
            meses: datos.meses ?? null,
            hasta: vencISO,
            registradoPor: panel.usuarioId,
            metodoCobro: 'manual',
        });

        return { negocioId: negocio.id, usuarioId: negocio.usuarioId, pagoId, folio };
    });

    // -------------------------------------------------------------------------
    // 6) Auditoría (no crítica: registrarAuditoria nunca lanza).
    // -------------------------------------------------------------------------
    await registrarAuditoria(panel, {
        accion: 'negocio_alta_manual',
        entidadTipo: 'negocio',
        entidadId: creado.negocioId,
        datosPrevios: null,
        datosNuevos: {
            nombreNegocio: datos.nombreNegocio,
            correo: datos.correo,
            ciudadId: ciudad.id,
            ciudad: ciudad.nombre,
            metodoCobro: 'manual',
            concepto: datos.concepto,
            monto: datos.monto,
            meses: datos.meses ?? null,
            hasta: vencISO,
            embajadorId,
        },
        motivo: null,
    });

    // Comisión de alta del vendedor (pieza C): el alta manual con pago ES el primer pago → devéngala
    // (best-effort + idempotente; no hace nada si fue cortesía, sin vendedor, o ya existe).
    await devengarComisionAlta(creado.negocioId);
    // Efectivo por entregar (pieza D): si el VENDEDOR dio de alta cobrando en EFECTIVO, el dinero lo
    // recibió él y se lo debe entregar → se carga como "efectivo por entregar".
    if (panel.rolEquipo === 'vendedor' && datos.concepto === 'efectivo' && embajadorId && datos.monto) {
        await registrarCobroEfectivo(embajadorId, creado.negocioId, Number(datos.monto), panel.usuarioId);
    }

    // -------------------------------------------------------------------------
    // 7) Correo de bienvenida + comprobante del PRIMER PAGO (best-effort: si falla NO
    //    revierte el alta ya confirmada). El bloque-recibo (monto + vigencia) viaja en el
    //    mismo correo de bienvenida — defensa Camino B sin un segundo correo en el alta.
    // -------------------------------------------------------------------------
    const montoComprobante = datos.concepto === 'cortesia' ? null : (datos.monto ?? null);

    // Recibo PDF del PRIMER pago → R2 (best-effort). prepararReciboPago lee el pago recién creado
    // (sucursal, folio, actor), genera y sube el PDF; la bienvenida lleva su link de descarga.
    let reciboUrl: string | undefined;
    try {
        const rec = creado.pagoId ? await prepararReciboPago(creado.pagoId) : null;
        reciboUrl = rec?.reciboUrl;
    } catch {
        console.error('Error al emitir el recibo PDF (alta manual)');
    }

    try {
        await enviarEmailBienvenida(datos.correo, datos.nombre, datos.nombreNegocio, {
            nombreNegocio: datos.nombreNegocio,
            concepto: datos.concepto,
            monto: montoComprobante,
            hasta: vencISO,
            reciboUrl,
        });
    } catch {
        console.error('Error al enviar el correo de bienvenida del alta manual');
    }

    return { ok: true, negocioId: creado.negocioId, usuarioId: creado.usuarioId };
}
