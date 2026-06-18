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

import { and, eq, inArray } from 'drizzle-orm';
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

/** ¿Quién puede ver/editar los datos de cobro de `usuarioId`? El super (cualquiera) y el propio vendedor. */
function puedeTocarDatosCobro(panel: UsuarioPanel, usuarioId: string): boolean {
    if (panel.rolEquipo === 'superadmin') return true;
    return panel.rolEquipo === 'vendedor' && panel.usuarioId === usuarioId;
}

// =============================================================================
// REGISTRAR PAGO (solo super)
// =============================================================================

export interface RegistrarPagoInput {
    metodo: Metodo;
    fechaPago?: string;        // 'YYYY-MM-DD'; default hoy
    periodo?: string | null;   // 'YYYY-MM' que cubre, si aplica
    nota?: string | null;
    comprobanteUrl?: string | null;
    comisionIds: string[];     // comisiones PENDIENTES que liquida (≥1; el monto sale de ellas)
}

export async function registrarPago(
    panel: UsuarioPanel,
    usuarioId: string,
    datos: RegistrarPagoInput,
): Promise<ResultadoLiquidacion & { pagoId?: string; bruto?: number; compensado?: number; neto?: number }> {
    if (panel.rolEquipo !== 'superadmin') {
        return { ok: false, status: 403, mensaje: 'Solo el superadmin registra pagos a vendedores.' };
    }
    if (!METODOS.includes(datos.metodo)) {
        return { ok: false, status: 400, mensaje: 'Método de pago inválido.' };
    }

    const embajadorId = await resolverEmbajador(usuarioId);
    if (!embajadorId) return { ok: false, status: 404, mensaje: 'Vendedor no encontrado.' };

    // Las comisiones a liquidar deben ser de ESTE vendedor y estar PENDIENTES. El BRUTO sale de ellas.
    const ids = [...new Set(datos.comisionIds)];
    if (ids.length === 0) {
        return { ok: false, status: 400, mensaje: 'Selecciona al menos una comisión pendiente.' };
    }
    const filas = await db
        .select({ id: embajadorComisiones.id, estado: embajadorComisiones.estado, monto: embajadorComisiones.montoComision })
        .from(embajadorComisiones)
        .where(and(eq(embajadorComisiones.embajadorId, embajadorId), inArray(embajadorComisiones.id, ids)));
    if (filas.length !== ids.length) {
        return { ok: false, status: 400, mensaje: 'Alguna comisión seleccionada no es de este vendedor.' };
    }
    if (filas.some((f) => f.estado !== 'pendiente')) {
        return { ok: false, status: 409, mensaje: 'Alguna comisión seleccionada ya está pagada o cancelada.' };
    }
    const bruto = filas.reduce((s, f) => s + Number(f.monto), 0);

    // NETEO (pieza D): se descuenta del pago lo que el vendedor te debe de efectivo. neto = bruto − compensado.
    const deuda = Math.max(0, await saldoEfectivo(embajadorId));
    const compensado = Math.min(bruto, deuda);
    const neto = bruto - compensado;

    const fechaPago = datos.fechaPago && /^\d{4}-\d{2}-\d{2}$/.test(datos.fechaPago)
        ? datos.fechaPago
        : new Date().toISOString().slice(0, 10);

    const pagoId = await db.transaction(async (tx) => {
        // El egreso real es el NETO. Si el neto es 0 (la deuda cubrió toda la comisión) no hay egreso que registrar.
        let pago: { id: string } | null = null;
        if (neto > 0) {
            const filasPago = await tx
                .insert(pagosVendedor)
                .values({
                    embajadorId,
                    monto: String(neto),
                    metodo: datos.metodo,
                    fechaPago,
                    periodo: datos.periodo ?? null,
                    nota: datos.nota ?? null,
                    comprobanteUrl: datos.comprobanteUrl ?? null,
                    registradoPor: panel.usuarioId,
                })
                .returning({ id: pagosVendedor.id });
            pago = filasPago[0];
        }

        // Las comisiones quedan pagadas (ligadas al pago si lo hubo).
        await tx
            .update(embajadorComisiones)
            .set({ estado: 'pagada', pagadaAt: new Date().toISOString(), pagoId: pago?.id ?? null })
            .where(and(eq(embajadorComisiones.embajadorId, embajadorId), inArray(embajadorComisiones.id, ids)));

        // La compensación BAJA la deuda de efectivo del vendedor.
        if (compensado > 0) {
            await tx.insert(efectivoMovimientos).values({
                embajadorId,
                tipo: 'compensacion',
                monto: String(compensado),
                pagoId: pago?.id ?? null,
                fecha: fechaPago,
                registradoPor: panel.usuarioId,
                nota: 'Descontado del pago de comisiones',
            });
        }

        return pago?.id ?? null;
    });

    await registrarAuditoria(panel, {
        accion: 'vendedor_registrar_pago',
        entidadTipo: 'embajador',
        entidadId: null,
        datosPrevios: null,
        datosNuevos: { embajadorId, bruto, compensado, neto, metodo: datos.metodo, fechaPago, comisiones: ids.length, comprobante: !!datos.comprobanteUrl },
        motivo: null,
    });

    return { ok: true, pagoId: pagoId ?? undefined, bruto, compensado, neto };
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
    if (!puedeTocarDatosCobro(panel, usuarioId)) {
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
    if (!puedeTocarDatosCobro(panel, usuarioId)) {
        return { ok: false, status: 403, mensaje: 'No puedes editar los datos de cobro de este vendedor.' };
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
