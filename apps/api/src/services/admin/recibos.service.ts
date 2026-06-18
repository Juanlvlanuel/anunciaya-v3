/**
 * admin/recibos.service.ts
 * ========================
 * Lecturas del módulo "Recibos" del Panel Admin: la lista global de RECIBOS de pago de membresía
 * (tabla `pagos_membresia`, ya foliada — manuales efectivo/transferencia/cortesía + cobros de tarjeta).
 * Permite buscar por folio o negocio, ver el detalle, descargar el PDF y reenviarlo por correo.
 *
 * ALCANCE POR ROL:
 *   - superadmin → todos los recibos de la plataforma
 *   - gerente    → solo los de su región (negocio → sucursal MATRIZ → ciudad → región)
 *   - vendedor   → solo los de sus negocios atribuidos (negocio.embajador_id = su embajador)
 *
 * El predicado del gerente es el MISMO que el de Negocios/Suscripciones, correlacionado sobre
 * `pagos_membresia.negocio_id`. El del vendedor reusa `resolverEmbajadorId`.
 *
 * Solo lecturas + acciones de comprobante (descargar/reenviar el PDF ya existente). NO crea ni edita
 * pagos: eso vive en el webhook (tarjeta) y en marcarPagado/alta manual (manuales).
 *
 * Ubicación: apps/api/src/services/admin/recibos.service.ts
 */

import { and, eq, asc, desc, count, gte, lte, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db/index.js';
import { pagosMembresia, negocios, negocioSucursales, usuarios } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { resolverEmbajadorId } from './negocios.service.js';
import { prepararReciboPago } from './recibo-pago.service.js';
import { registrarAuditoria } from './auditoria.service.js';
import { enviarComprobantePagoMembresia } from '../../utils/email.js';

export { panelConFiltroRegion } from './negocios.service.js';

// =============================================================================
// TIPOS
// =============================================================================

export const ORDENES_RECIBO = ['folio_desc', 'folio_asc', 'fecha_recientes', 'fecha_antiguos'] as const;
export type OrdenRecibo = (typeof ORDENES_RECIBO)[number];

export interface FiltrosRecibos {
    busqueda?: string;   // por FOLIO (parcial) o nombre de negocio (ILIKE)
    negocioId?: string;  // deep-link: solo los de UN negocio
    desde?: string;      // fecha_pago >= (ISO)
    hasta?: string;      // fecha_pago <= (ISO)
    orden?: OrdenRecibo;
    pagina: number;      // 1-based
    porPagina: number;
}

/** Una fila de la lista de recibos. */
export interface ReciboFila {
    id: string;
    folio: number | null;
    negocioId: string;
    negocioNombre: string | null;
    logoUrl: string | null;
    ciudad: string | null;
    concepto: string;            // efectivo / transferencia / cortesia / tarjeta
    monto: string | null;        // numeric → string; el front formatea
    fechaPago: string | null;
    periodoHasta: string | null; // vigencia que cubre
    correoDueno: string | null;  // para precargar el reenvío
    registradoPorNombre: string | null;
    anulado: boolean;
}

export interface ListaRecibos {
    items: ReciboFila[];
    total: number;
    pagina: number;
    porPagina: number;
}

// =============================================================================
// ALCANCE POR ROL
// =============================================================================

/** Condición de alcance (WHERE) por rol, o 'vacio' si no puede ver nada. Super → null (ve todo). */
async function condicionAlcance(panel: UsuarioPanel): Promise<SQL | null | 'vacio'> {
    if (panel.rolEquipo === 'superadmin') return null;

    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return 'vacio';
        return sql`EXISTS (
            SELECT 1 FROM negocio_sucursales ns
            JOIN ciudades c ON c.id = ns.ciudad_id
            WHERE ns.negocio_id = ${pagosMembresia.negocioId} AND ns.es_principal = true AND c.region_id = ${panel.regionId}
        )`;
    }

    if (panel.rolEquipo === 'vendedor') {
        const embajadorId = await resolverEmbajadorId(panel.usuarioId);
        if (!embajadorId) return 'vacio';
        // El vendedor ve los recibos SOLO de sus negocios atribuidos (embajador_id).
        return sql`EXISTS (
            SELECT 1 FROM negocios n
            WHERE n.id = ${pagosMembresia.negocioId} AND n.embajador_id = ${embajadorId}
        )`;
    }

    return 'vacio';
}

function ordenarPor(orden?: OrdenRecibo): SQL[] {
    switch (orden) {
        case 'folio_asc':
            return [asc(pagosMembresia.folio)];
        case 'fecha_antiguos':
            return [asc(pagosMembresia.fechaPago)];
        case 'fecha_recientes':
            return [desc(pagosMembresia.fechaPago)];
        case 'folio_desc':
        default:
            return [sql`${pagosMembresia.folio} DESC NULLS LAST`];
    }
}

/** Búsqueda por folio (parcial) o nombre de negocio — como condición que sirve en total y página. */
function condicionBusqueda(busqueda?: string): SQL | undefined {
    if (!busqueda) return undefined;
    const like = `%${busqueda}%`;
    return sql`(
        CAST(${pagosMembresia.folio} AS TEXT) ILIKE ${like}
        OR EXISTS (SELECT 1 FROM negocios n WHERE n.id = ${pagosMembresia.negocioId} AND n.nombre ILIKE ${like})
    )`;
}

// =============================================================================
// 1. LISTA PAGINADA
// =============================================================================

export async function listarRecibos(panel: UsuarioPanel, filtros: FiltrosRecibos): Promise<ListaRecibos> {
    const alcance = await condicionAlcance(panel);
    if (alcance === 'vacio') {
        return { items: [], total: 0, pagina: filtros.pagina, porPagina: filtros.porPagina };
    }

    const cond: SQL[] = [];
    if (alcance) cond.push(alcance);
    const condBusqueda = condicionBusqueda(filtros.busqueda);
    if (condBusqueda) cond.push(condBusqueda);
    if (filtros.negocioId) cond.push(eq(pagosMembresia.negocioId, filtros.negocioId));
    if (filtros.desde) cond.push(gte(pagosMembresia.fechaPago, filtros.desde));
    if (filtros.hasta) cond.push(lte(pagosMembresia.fechaPago, filtros.hasta));
    const where = cond.length ? and(...cond) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(pagosMembresia).where(where);

    const dueno = alias(usuarios, 'dueno');
    const registrador = alias(usuarios, 'registrador');
    const offset = (filtros.pagina - 1) * filtros.porPagina;
    const filas = await db
        .select({
            id: pagosMembresia.id,
            folio: pagosMembresia.folio,
            negocioId: pagosMembresia.negocioId,
            negocioNombre: negocios.nombre,
            logoUrl: negocios.logoUrl,
            ciudad: negocioSucursales.ciudad,
            concepto: pagosMembresia.concepto,
            monto: pagosMembresia.monto,
            fechaPago: pagosMembresia.fechaPago,
            periodoHasta: pagosMembresia.periodoHasta,
            correoDueno: dueno.correo,
            registradorNombre: registrador.nombre,
            registradorApellidos: registrador.apellidos,
            anulado: pagosMembresia.anulado,
        })
        .from(pagosMembresia)
        .leftJoin(negocios, eq(negocios.id, pagosMembresia.negocioId))
        .leftJoin(negocioSucursales, and(eq(negocioSucursales.negocioId, negocios.id), eq(negocioSucursales.esPrincipal, true)))
        .leftJoin(dueno, eq(dueno.id, negocios.usuarioId))
        .leftJoin(registrador, eq(registrador.id, pagosMembresia.registradoPor))
        .where(where)
        .orderBy(...ordenarPor(filtros.orden))
        .limit(filtros.porPagina)
        .offset(offset);

    const items: ReciboFila[] = filas.map((f) => ({
        id: f.id,
        folio: f.folio ?? null,
        negocioId: f.negocioId,
        negocioNombre: f.negocioNombre ?? null,
        logoUrl: f.logoUrl ?? null,
        ciudad: f.ciudad ?? null,
        concepto: f.concepto,
        monto: f.monto ?? null,
        fechaPago: f.fechaPago ?? null,
        periodoHasta: f.periodoHasta ?? null,
        correoDueno: f.correoDueno ?? null,
        registradoPorNombre: f.registradorNombre ? `${f.registradorNombre} ${f.registradorApellidos ?? ''}`.trim() : null,
        anulado: f.anulado,
    }));

    return { items, total: Number(total), pagina: filtros.pagina, porPagina: filtros.porPagina };
}

// =============================================================================
// 2. VERIFICAR ALCANCE DE UN RECIBO (para descargar / reenviar)
// =============================================================================

/** ¿El recibo `reciboId` está dentro del alcance del panel? Devuelve el negocioId si sí; null si no. */
export async function reciboEnAlcance(panel: UsuarioPanel, reciboId: string): Promise<string | null> {
    const alcance = await condicionAlcance(panel);
    if (alcance === 'vacio') return null;
    const cond: SQL[] = [eq(pagosMembresia.id, reciboId)];
    if (alcance) cond.push(alcance);
    const [fila] = await db
        .select({ negocioId: pagosMembresia.negocioId })
        .from(pagosMembresia)
        .where(and(...cond))
        .limit(1);
    return fila?.negocioId ?? null;
}

// =============================================================================
// 3. DESCARGAR (genera/regenera el PDF y devuelve su URL en R2)
// =============================================================================

export type ResultadoDescarga = { ok: true; reciboUrl: string } | { ok: false; status: number; mensaje: string };

export async function descargarRecibo(panel: UsuarioPanel, reciboId: string): Promise<ResultadoDescarga> {
    const negocioId = await reciboEnAlcance(panel, reciboId);
    if (!negocioId) return { ok: false, status: 404, mensaje: 'Recibo no encontrado.' };
    const rec = await prepararReciboPago(reciboId);
    if (!rec?.reciboUrl) return { ok: false, status: 502, mensaje: 'No se pudo generar el recibo PDF.' };
    return { ok: true, reciboUrl: rec.reciboUrl };
}

// =============================================================================
// 4. REENVIAR el comprobante por correo a 1+ destinatarios
// =============================================================================

export type ResultadoReenvio = { ok: true; enviados: number } | { ok: false; status: number; mensaje: string };

/**
 * Regenera el recibo PDF y envía el comprobante a la lista de correos indicada (independiente del
 * correo registrado del negocio; el front precarga el del dueño pero se puede cambiar/agregar otros).
 */
export async function reenviarRecibo(panel: UsuarioPanel, reciboId: string, correos: string[]): Promise<ResultadoReenvio> {
    const negocioId = await reciboEnAlcance(panel, reciboId);
    if (!negocioId) return { ok: false, status: 404, mensaje: 'Recibo no encontrado.' };
    const rec = await prepararReciboPago(reciboId);
    if (!rec) return { ok: false, status: 404, mensaje: 'Recibo no encontrado.' };

    let enviados = 0;
    for (const correo of correos) {
        try {
            await enviarComprobantePagoMembresia(correo, rec.nombreDueno ?? '', {
                nombreNegocio: rec.nombreNegocio,
                concepto: rec.concepto,
                monto: rec.monto,
                hasta: rec.hasta,
                reciboUrl: rec.reciboUrl,
            });
            enviados++;
        } catch {
            console.error('[Recibos] No se pudo reenviar el comprobante a', correo);
        }
    }

    await registrarAuditoria(panel, {
        accion: 'recibo_reenviar',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: null,
        datosNuevos: { reciboId, correos, enviados },
        motivo: null,
    });

    if (enviados === 0) return { ok: false, status: 502, mensaje: 'No se pudo enviar el comprobante a ningún correo.' };
    return { ok: true, enviados };
}
