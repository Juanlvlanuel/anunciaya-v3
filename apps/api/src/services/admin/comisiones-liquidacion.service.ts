/**
 * admin/comisiones-liquidacion.service.ts
 * =======================================
 * Acciones de LIQUIDACIÓN del módulo "Vendedores y comisiones" (Fase 2 · pieza E). El lado de los EGRESOS:
 * lo que se le PAGA al vendedor (no confundir con el efectivo que él te entrega — pieza D).
 *
 *   - generarUrlComprobante  — presigned URL para subir la foto/comprobante del pago a R2 (carpeta 'comprobantes').
 *   - registrarPago          — el SuperAdmin paga a un vendedor: crea la fila en pagos_vendedor y marca como
 *                              PAGADAS las comisiones que cubre (monto editable; el extra es un abono).
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
import { embajadores, embajadorComisiones, pagosVendedor, vendedorDatosCobro } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { generarPresignedUrl } from '../r2.service.js';

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
    monto: number;
    metodo: Metodo;
    fechaPago?: string;        // 'YYYY-MM-DD'; default hoy
    periodo?: string | null;   // 'YYYY-MM' que cubre, si aplica
    nota?: string | null;
    comprobanteUrl?: string | null;
    comisionIds: string[];     // comisiones PENDIENTES que este pago liquida (pueden ser 0)
}

export async function registrarPago(
    panel: UsuarioPanel,
    usuarioId: string,
    datos: RegistrarPagoInput,
): Promise<ResultadoLiquidacion & { pagoId?: string }> {
    if (panel.rolEquipo !== 'superadmin') {
        return { ok: false, status: 403, mensaje: 'Solo el superadmin registra pagos a vendedores.' };
    }
    if (!Number.isFinite(datos.monto) || datos.monto <= 0) {
        return { ok: false, status: 400, mensaje: 'El monto debe ser mayor que 0.' };
    }
    if (!METODOS.includes(datos.metodo)) {
        return { ok: false, status: 400, mensaje: 'Método de pago inválido.' };
    }

    const embajadorId = await resolverEmbajador(usuarioId);
    if (!embajadorId) return { ok: false, status: 404, mensaje: 'Vendedor no encontrado.' };

    // Validar que las comisiones a liquidar sean de ESTE vendedor y estén PENDIENTES.
    const ids = [...new Set(datos.comisionIds)];
    if (ids.length > 0) {
        const filas = await db
            .select({ id: embajadorComisiones.id, estado: embajadorComisiones.estado })
            .from(embajadorComisiones)
            .where(and(eq(embajadorComisiones.embajadorId, embajadorId), inArray(embajadorComisiones.id, ids)));
        if (filas.length !== ids.length) {
            return { ok: false, status: 400, mensaje: 'Alguna comisión seleccionada no es de este vendedor.' };
        }
        if (filas.some((f) => f.estado !== 'pendiente')) {
            return { ok: false, status: 409, mensaje: 'Alguna comisión seleccionada ya está pagada o cancelada.' };
        }
    }

    const fechaPago = datos.fechaPago && /^\d{4}-\d{2}-\d{2}$/.test(datos.fechaPago)
        ? datos.fechaPago
        : new Date().toISOString().slice(0, 10);

    // Transacción: registra el egreso y marca las comisiones cubiertas como pagadas (con su pago_id).
    const pagoId = await db.transaction(async (tx) => {
        const [pago] = await tx
            .insert(pagosVendedor)
            .values({
                embajadorId,
                monto: String(datos.monto),
                metodo: datos.metodo,
                fechaPago,
                periodo: datos.periodo ?? null,
                nota: datos.nota ?? null,
                comprobanteUrl: datos.comprobanteUrl ?? null,
                registradoPor: panel.usuarioId,
            })
            .returning({ id: pagosVendedor.id });

        if (ids.length > 0) {
            await tx
                .update(embajadorComisiones)
                .set({ estado: 'pagada', pagadaAt: new Date().toISOString(), pagoId: pago.id })
                .where(and(eq(embajadorComisiones.embajadorId, embajadorId), inArray(embajadorComisiones.id, ids)));
        }
        return pago.id;
    });

    await registrarAuditoria(panel, {
        accion: 'vendedor_registrar_pago',
        entidadTipo: 'embajador',
        entidadId: null,
        datosPrevios: null,
        datosNuevos: { embajadorId, monto: datos.monto, metodo: datos.metodo, fechaPago, comisiones: ids.length, comprobante: !!datos.comprobanteUrl },
        motivo: null,
    });

    return { ok: true, pagoId };
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
