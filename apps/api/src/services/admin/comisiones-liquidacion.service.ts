/**
 * admin/comisiones-liquidacion.service.ts
 * =======================================
 * Acciones de LIQUIDACIÓN del módulo "Vendedores y comisiones" (Fase 2 · pieza E). El lado de los EGRESOS:
 * lo que se le PAGA al vendedor (no confundir con el efectivo que él te entrega — pieza D).
 *
 *   - generarUrlComprobante  — presigned URL para subir la foto/comprobante del pago a R2 (carpeta 'comprobantes').
 *   - registrarPago          — el SuperAdmin paga a un vendedor: NETEA lo que el vendedor debe de efectivo
 *                              (pieza D), registra el egreso por el NETO y marca como PAGADAS las comisiones.
 *   - obtenerDatosCobro      — datos de cobro del vendedor (transferencia/efectivo). Los ve el super y el dueño.
 *   - guardarDatosCobro      — captura/edita los datos de cobro (el vendedor los suyos; el super por él).
 *
 * "registrar pagos = solo super" (es tesorería). Los DATOS DE COBRO los ve el super (para pagar) y el propio
 * vendedor (los captura); el gerente NO (dato sensible, no paga). La lectura del estado de cuenta y de la
 * bitácora vive en `vendedores.service.ts`.
 *
 * Ubicación: apps/api/src/services/admin/comisiones-liquidacion.service.ts
 */

import { and, eq, asc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { embajadores, embajadorComisiones, pagosVendedor, vendedorDatosCobro, efectivoMovimientos } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { generarPresignedUrl } from '../r2.service.js';
import { saldoEfectivo } from './comisiones-efectivo.service.js';

const METODOS = ['transferencia', 'efectivo'] as const;
type Metodo = (typeof METODOS)[number];

export type ResultadoLiquidacion =
    | { ok: true }
    | { ok: false; status: number; mensaje: string };

// =============================================================================
// SUBIDA DEL COMPROBANTE (R2, presigned)
// =============================================================================

/** Presigned URL para subir la foto/comprobante del pago. Solo super (la ruta lo restringe). */
export async function generarUrlComprobante(nombreArchivo: string, contentType: string) {
    return generarPresignedUrl('comprobantes', nombreArchivo, contentType, 300, ['image/jpeg', 'image/png', 'image/webp']);
}

// =============================================================================
// HELPERS
// =============================================================================

/** Resuelve el embajadorId a partir del usuarioId del vendedor. null si no es vendedor. */
async function resolverEmbajador(usuarioId: string): Promise<string | null> {
    const [emb] = await db.select({ id: embajadores.id }).from(embajadores).where(eq(embajadores.usuarioId, usuarioId)).limit(1);
    return emb?.id ?? null;
}

/** Quién VE los datos de cobro de `usuarioId`: el super (los necesita para pagar) y el propio vendedor. */
function puedeVerDatosCobro(panel: UsuarioPanel, usuarioId: string): boolean {
    if (panel.rolEquipo === 'superadmin') return true;
    return panel.rolEquipo === 'vendedor' && panel.usuarioId === usuarioId;
}

/** Quién EDITA los datos de cobro: SOLO el propio vendedor. Es su dato bancario (a dónde va su dinero);
 *  que el super lo edite abriría un vector de fraude (desviar pagos). El super solo los lee, no los toca. */
function puedeEditarDatosCobro(panel: UsuarioPanel, usuarioId: string): boolean {
    return panel.rolEquipo === 'vendedor' && panel.usuarioId === usuarioId;
}

// =============================================================================
// REGISTRAR PAGO (solo super)
// =============================================================================

/** Redondea a 2 decimales (evita arrastre de flotante al acumular abonos). */
function redondear(n: number): number {
    return Math.round(n * 100) / 100;
}

export interface RegistrarPagoInput {
    montoTransferencia: number;  // ≥ 0
    montoEfectivo: number;       // ≥ 0
    fechaPago?: string;          // 'YYYY-MM-DD'; default hoy
    nota?: string | null;
    comprobanteUrl?: string | null;
}

/**
 * Registra un ABONO al vendedor (Liquidación v2). El super abona contra el saldo (= comisiones pendientes −
 * efectivo que el vendedor debe). El abono puede ser PARCIAL y DIVIDIDO (parte transferencia + parte efectivo);
 * se aplica FIFO a las comisiones pendientes (la más vieja primero), saldándolas total o parcialmente
 * (`monto_pagado`). El efectivo que el vendedor debe salda comisiones SIN egreso (compensación / neteo).
 */
export async function registrarPago(
    panel: UsuarioPanel,
    usuarioId: string,
    datos: RegistrarPagoInput,
): Promise<ResultadoLiquidacion & { devengadoPendiente?: number; compensado?: number; abonado?: number; saldoRestante?: number }> {
    if (panel.rolEquipo !== 'superadmin') {
        return { ok: false, status: 403, mensaje: 'Solo el superadmin registra pagos a vendedores.' };
    }
    const tTransfer = Number(datos.montoTransferencia) || 0;
    const tEfectivo = Number(datos.montoEfectivo) || 0;
    if (tTransfer < 0 || tEfectivo < 0) {
        return { ok: false, status: 400, mensaje: 'Los montos no pueden ser negativos.' };
    }
    const abono = redondear(tTransfer + tEfectivo);
    if (abono <= 0) {
        return { ok: false, status: 400, mensaje: 'Ingresa un monto a abonar (transferencia y/o efectivo).' };
    }

    const embajadorId = await resolverEmbajador(usuarioId);
    if (!embajadorId) return { ok: false, status: 404, mensaje: 'Vendedor no encontrado.' };

    // Comisiones pendientes (incluye parciales) en orden FIFO (la más vieja primero).
    const pendientes = await db
        .select({ id: embajadorComisiones.id, monto: embajadorComisiones.montoComision, pagado: embajadorComisiones.montoPagado })
        .from(embajadorComisiones)
        .where(and(eq(embajadorComisiones.embajadorId, embajadorId), eq(embajadorComisiones.estado, 'pendiente')))
        .orderBy(asc(embajadorComisiones.createdAt));

    const devengadoPendiente = redondear(pendientes.reduce((s, c) => s + (Number(c.monto) - Number(c.pagado)), 0));
    if (devengadoPendiente <= 0) {
        return { ok: false, status: 409, mensaje: 'Este vendedor no tiene comisiones pendientes.' };
    }

    // Neteo: lo que el vendedor debe de efectivo salda comisiones SIN egreso (compensación).
    const deuda = Math.max(0, await saldoEfectivo(embajadorId));
    const compensado = redondear(Math.min(deuda, devengadoPendiente));
    const saldoNeto = redondear(devengadoPendiente - compensado);

    if (abono > saldoNeto + 0.01) {
        return { ok: false, status: 400, mensaje: `El abono ($${abono.toLocaleString('es-MX')}) supera el saldo a pagar ($${saldoNeto.toLocaleString('es-MX')}).` };
    }

    const fechaPago = datos.fechaPago && /^\d{4}-\d{2}-\d{2}$/.test(datos.fechaPago)
        ? datos.fechaPago
        : new Date().toISOString().slice(0, 10);

    await db.transaction(async (tx) => {
        // 1) Saldar comisiones FIFO con (compensación + abono): sube monto_pagado, marca 'pagada' al completarse.
        let restante = redondear(compensado + abono);
        const ahora = new Date().toISOString();
        for (const c of pendientes) {
            if (restante <= 0) break;
            const faltante = redondear(Number(c.monto) - Number(c.pagado));
            if (faltante <= 0) continue;
            const aplica = redondear(Math.min(faltante, restante));
            const nuevoPagado = redondear(Number(c.pagado) + aplica);
            const saldada = nuevoPagado >= redondear(Number(c.monto)) - 0.001;
            await tx
                .update(embajadorComisiones)
                .set({ montoPagado: String(nuevoPagado), ...(saldada ? { estado: 'pagada', pagadaAt: ahora } : {}) })
                .where(eq(embajadorComisiones.id, c.id));
            restante = redondear(restante - aplica);
        }

        // 2) Egreso real: un registro por método con monto > 0 (parte transferencia, parte efectivo).
        let primerPagoId: string | null = null;
        const tramos: Array<{ metodo: Metodo; monto: number }> = [];
        if (tTransfer > 0) tramos.push({ metodo: 'transferencia', monto: tTransfer });
        if (tEfectivo > 0) tramos.push({ metodo: 'efectivo', monto: tEfectivo });
        for (const t of tramos) {
            const [pago] = await tx
                .insert(pagosVendedor)
                .values({
                    embajadorId,
                    monto: String(t.monto),
                    metodo: t.metodo,
                    fechaPago,
                    periodo: null,
                    nota: datos.nota ?? null,
                    comprobanteUrl: datos.comprobanteUrl ?? null,
                    registradoPor: panel.usuarioId,
                })
                .returning({ id: pagosVendedor.id });
            if (!primerPagoId) primerPagoId = pago.id;
        }

        // 3) Compensación del efectivo: baja la deuda del vendedor (un solo movimiento por esta operación).
        if (compensado > 0) {
            await tx.insert(efectivoMovimientos).values({
                embajadorId,
                tipo: 'compensacion',
                monto: String(compensado),
                pagoId: primerPagoId,
                fecha: fechaPago,
                registradoPor: panel.usuarioId,
                nota: 'Descontado del pago de comisiones',
            });
        }
    });

    await registrarAuditoria(panel, {
        accion: 'vendedor_registrar_pago',
        entidadTipo: 'embajador',
        entidadId: null,
        datosPrevios: null,
        datosNuevos: { embajadorId, transferencia: tTransfer, efectivo: tEfectivo, compensado, fechaPago, comprobante: !!datos.comprobanteUrl },
        motivo: null,
    });

    return { ok: true, devengadoPendiente, compensado, abonado: abono, saldoRestante: redondear(saldoNeto - abono) };
}

/**
 * Total de comisiones PENDIENTES de un vendedor (Σ montoComision − montoPagado de las que siguen en
 * estado 'pendiente'). Mismo cálculo que usa `registrarPago` (FIFO), expuesto para el KPI del Resumen
 * del vendedor.
 */
export async function comisionesPendientesDe(embajadorId: string): Promise<number> {
    const filas = await db
        .select({ monto: embajadorComisiones.montoComision, pagado: embajadorComisiones.montoPagado })
        .from(embajadorComisiones)
        .where(and(eq(embajadorComisiones.embajadorId, embajadorId), eq(embajadorComisiones.estado, 'pendiente')));
    return filas.reduce((s, c) => s + (Number(c.monto) - Number(c.pagado)), 0);
}

// =============================================================================
// DATOS DE COBRO (super + el propio vendedor)
// =============================================================================

export interface DatosCobro {
    metodo: string;
    banco: string | null;
    clabe: string | null;
    titular: string | null;
    nota: string | null;
    actualizadoEn: string | null;
}

export interface DatosCobroInput {
    metodo: Metodo;
    banco?: string | null;
    clabe?: string | null;
    titular?: string | null;
    nota?: string | null;
}

/** Lee los datos de cobro del vendedor (sin enmascarar: el super los necesita para pagar). null si no hay. */
export async function obtenerDatosCobro(
    panel: UsuarioPanel,
    usuarioId: string,
): Promise<{ ok: true; datos: DatosCobro | null } | { ok: false; status: number; mensaje: string }> {
    if (!puedeVerDatosCobro(panel, usuarioId)) {
        return { ok: false, status: 403, mensaje: 'No tienes acceso a los datos de cobro de este vendedor.' };
    }
    const embajadorId = await resolverEmbajador(usuarioId);
    if (!embajadorId) return { ok: false, status: 404, mensaje: 'Vendedor no encontrado.' };

    const [fila] = await db
        .select({
            metodo: vendedorDatosCobro.metodo,
            banco: vendedorDatosCobro.banco,
            clabe: vendedorDatosCobro.clabe,
            titular: vendedorDatosCobro.titular,
            nota: vendedorDatosCobro.nota,
            actualizadoEn: vendedorDatosCobro.updatedAt,
        })
        .from(vendedorDatosCobro)
        .where(eq(vendedorDatosCobro.embajadorId, embajadorId))
        .limit(1);

    return { ok: true, datos: fila ? { ...fila, banco: fila.banco ?? null, clabe: fila.clabe ?? null, titular: fila.titular ?? null, nota: fila.nota ?? null, actualizadoEn: fila.actualizadoEn ?? null } : null };
}

/** Captura/edita los datos de cobro (upsert, 1 por vendedor). El vendedor los suyos; el super por él. */
export async function guardarDatosCobro(
    panel: UsuarioPanel,
    usuarioId: string,
    datos: DatosCobroInput,
): Promise<ResultadoLiquidacion> {
    if (!puedeEditarDatosCobro(panel, usuarioId)) {
        return { ok: false, status: 403, mensaje: 'Solo el propio vendedor puede editar sus datos de cobro.' };
    }
    if (!METODOS.includes(datos.metodo)) {
        return { ok: false, status: 400, mensaje: 'Método de cobro inválido.' };
    }
    const clabe = datos.clabe ? datos.clabe.replace(/\D/g, '') : null;
    if (datos.metodo === 'transferencia' && clabe && clabe.length !== 18) {
        return { ok: false, status: 400, mensaje: 'La CLABE debe tener 18 dígitos.' };
    }

    const embajadorId = await resolverEmbajador(usuarioId);
    if (!embajadorId) return { ok: false, status: 404, mensaje: 'Vendedor no encontrado.' };

    const ahora = new Date().toISOString();
    await db
        .insert(vendedorDatosCobro)
        .values({
            embajadorId,
            metodo: datos.metodo,
            banco: datos.banco ?? null,
            clabe,
            titular: datos.titular ?? null,
            nota: datos.nota ?? null,
            actualizadoPor: panel.usuarioId,
            updatedAt: ahora,
        })
        .onConflictDoUpdate({
            target: vendedorDatosCobro.embajadorId,
            set: {
                metodo: datos.metodo,
                banco: datos.banco ?? null,
                clabe,
                titular: datos.titular ?? null,
                nota: datos.nota ?? null,
                actualizadoPor: panel.usuarioId,
                updatedAt: ahora,
            },
        });

    await registrarAuditoria(panel, {
        accion: 'vendedor_datos_cobro',
        entidadTipo: 'embajador',
        entidadId: null,
        datosPrevios: null,
        datosNuevos: { embajadorId, metodo: datos.metodo, tieneClabe: !!clabe },
        motivo: null,
    });

    return { ok: true };
}
