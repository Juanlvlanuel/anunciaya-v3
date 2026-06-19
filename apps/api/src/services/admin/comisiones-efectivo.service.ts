/**
 * admin/comisiones-efectivo.service.ts
 * ====================================
 * Cortes de efectivo del vendedor (Vendedores y comisiones · Fase 2 · pieza D). El efectivo que el
 * vendedor **te debe entregar** (cobró membresías en efectivo). NO confundir con la comisión que tú le
 * pagas (pieza E).
 *
 *   - saldoEfectivo             — cuánto te debe: Σ cobros − Σ (entregas + compensaciones).
 *   - registrarCobroEfectivo    — le carga deuda cuando cobra un pago en efectivo de un negocio (best-effort;
 *                                 lo llaman el alta manual y "marcar pagado" cuando los registra el VENDEDOR).
 *   - registrarMovimientoManual — el super/gerente registra a mano una ENTREGA del vendedor (baja la deuda).
 *                                 El cobro NO va a mano: se carga solo cuando el vendedor da de alta / marca pagado en efectivo.
 *
 * La COMPENSACIÓN (neteo: descontar la deuda al pagarle comisión) la hace `registrarPago` en
 * `comisiones-liquidacion.service.ts`, insertando un movimiento `tipo='compensacion'`.
 *
 * Ubicación: apps/api/src/services/admin/comisiones-efectivo.service.ts
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { embajadores, efectivoMovimientos } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';

export type ResultadoEfectivo = { ok: true } | { ok: false; status: number; mensaje: string };

/** Resuelve el embajadorId desde el usuarioId del vendedor. null si no es vendedor. */
async function resolverEmbajador(usuarioId: string): Promise<string | null> {
    const [emb] = await db.select({ id: embajadores.id }).from(embajadores).where(eq(embajadores.usuarioId, usuarioId)).limit(1);
    return emb?.id ?? null;
}

/** ¿El vendedor está en el alcance de quien actúa? Super = cualquiera; gerente = los de su región. */
async function vendedorEnAlcance(panel: UsuarioPanel, embajadorId: string): Promise<boolean> {
    if (panel.rolEquipo === 'superadmin') return true;
    if (panel.rolEquipo === 'gerente' && panel.regionId) {
        const filas = (await db.execute(sql`
            SELECT EXISTS (
                SELECT 1 FROM embajador_ciudades ec
                JOIN ciudades c ON c.id = ec.ciudad_id
                WHERE ec.embajador_id = ${embajadorId}::uuid AND c.region_id = ${panel.regionId}
            ) AS ok
        `)).rows as Array<{ ok: boolean }>;
        return !!filas[0]?.ok;
    }
    return false;
}

// =============================================================================
// SALDO
// =============================================================================

/** Cuánto te debe el vendedor en efectivo: Σ cobros − Σ (entregas + compensaciones). */
export async function saldoEfectivo(embajadorId: string): Promise<number> {
    const filas = await db
        .select({ tipo: efectivoMovimientos.tipo, total: sql<number>`COALESCE(SUM(${efectivoMovimientos.monto}), 0)` })
        .from(efectivoMovimientos)
        .where(eq(efectivoMovimientos.embajadorId, embajadorId))
        .groupBy(efectivoMovimientos.tipo);
    let cobros = 0;
    let abonos = 0;
    for (const f of filas) {
        const t = Number(f.total);
        if (f.tipo === 'cobro') cobros += t;
        else abonos += t; // entrega + compensacion
    }
    return cobros - abonos;
}

// =============================================================================
// COBRO (le carga deuda — automático en los puntos de pago en efectivo)
// =============================================================================

/** Registra que el vendedor cobró efectivo de un negocio (le carga deuda). Best-effort, no lanza. */
export async function registrarCobroEfectivo(
    embajadorId: string,
    negocioId: string,
    monto: number,
    registradoPor: string | null,
    fecha?: string,
): Promise<void> {
    try {
        if (!(monto > 0)) return;
        await db.insert(efectivoMovimientos).values({
            embajadorId,
            tipo: 'cobro',
            monto: String(monto),
            negocioId,
            fecha: fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : new Date().toISOString().slice(0, 10),
            registradoPor,
            nota: null,
        });
    } catch (err) {
        console.error('[Efectivo] No se pudo registrar el cobro en efectivo:', err);
    }
}

// =============================================================================
// MOVIMIENTO MANUAL (super / gerente registra un cobro o una entrega)
// =============================================================================

/**
 * El super/gerente registra a mano una `entrega` de efectivo del vendedor (baja su deuda). El COBRO no se
 * registra a mano: se carga solo en los puntos de pago en efectivo del vendedor (alta manual / marcar pagado).
 */
export async function registrarMovimientoManual(
    panel: UsuarioPanel,
    usuarioId: string,
    datos: { tipo: 'cobro' | 'entrega'; monto: number; fecha?: string; nota?: string | null },
): Promise<ResultadoEfectivo> {
    if (panel.rolEquipo !== 'superadmin' && panel.rolEquipo !== 'gerente') {
        return { ok: false, status: 403, mensaje: 'Solo el super o el gerente registran movimientos de efectivo.' };
    }
    if (datos.tipo !== 'entrega') {
        return { ok: false, status: 400, mensaje: 'Solo se registran ENTREGAS a mano; los cobros en efectivo se cargan solos.' };
    }
    if (!Number.isFinite(datos.monto) || datos.monto <= 0) {
        return { ok: false, status: 400, mensaje: 'El monto debe ser mayor que 0.' };
    }
    const embajadorId = await resolverEmbajador(usuarioId);
    if (!embajadorId) return { ok: false, status: 404, mensaje: 'Vendedor no encontrado.' };
    if (!(await vendedorEnAlcance(panel, embajadorId))) {
        return { ok: false, status: 403, mensaje: 'Ese vendedor no es de tu alcance.' };
    }

    const fecha = datos.fecha && /^\d{4}-\d{2}-\d{2}$/.test(datos.fecha) ? datos.fecha : new Date().toISOString().slice(0, 10);
    await db.insert(efectivoMovimientos).values({
        embajadorId,
        tipo: datos.tipo,
        monto: String(datos.monto),
        fecha,
        registradoPor: panel.usuarioId,
        nota: datos.nota ?? null,
    });

    await registrarAuditoria(panel, {
        accion: 'vendedor_efectivo_entrega',
        entidadTipo: 'embajador',
        entidadId: null,
        datosPrevios: null,
        datosNuevos: { embajadorId, tipo: datos.tipo, monto: datos.monto, fecha },
        motivo: null,
    });

    return { ok: true };
}
