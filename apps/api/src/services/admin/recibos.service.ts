/**
 * admin/recibos.service.ts
 * ========================
 * Lecturas del módulo "Recibos" del Panel Admin: la lista global de RECIBOS foliados de DOS orígenes,
 * unificados por su folio (la secuencia es global, así que la numeración es continua):
 *   - 'membresia'  → `pagos_membresia` (manuales efectivo/transferencia/cortesía + cobros de tarjeta).
 *   - 'publicidad' → `publicidad_compras` con folio (alta manual con cobro + wizard pagado).
 * Permite buscar por folio o titular, descargar el PDF y reenviarlo por correo.
 *
 * ALCANCE POR ROL:
 *   - superadmin → todos.
 *   - gerente    → membresía de su región (negocio→matriz→ciudad→región) + publicidad con ≥1 ciudad en su región.
 *   - vendedor   → SOLO membresía de sus negocios atribuidos. **No ve los recibos de publicidad.**
 *
 * Cada recibo lleva su `origen`; las acciones (descargar/reenviar) lo usan para elegir el generador.
 *
 * Ubicación: apps/api/src/services/admin/recibos.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { resolverEmbajadorId } from './negocios.service.js';
import { prepararReciboPago } from './recibo-pago.service.js';
import { prepararReciboPublicidad } from './recibo-publicidad.service.js';
import { registrarAuditoria } from './auditoria.service.js';
import { enviarComprobantePagoMembresia, enviarComprobantePublicidad } from '../../utils/email.js';

export { panelConFiltroRegion } from './negocios.service.js';

export const ORDENES_RECIBO = ['folio_desc', 'folio_asc', 'fecha_recientes', 'fecha_antiguos'] as const;
export type OrdenRecibo = (typeof ORDENES_RECIBO)[number];
export type OrigenRecibo = 'membresia' | 'publicidad';

export interface FiltrosRecibos {
    busqueda?: string;
    negocioId?: string;
    desde?: string;
    hasta?: string;
    origen?: OrigenRecibo;       // filtra por tipo: solo membresía o solo publicidad (undefined = ambos)
    orden?: OrdenRecibo;
    pagina: number;
    porPagina: number;
}

export interface ReciboFila {
    id: string;
    origen: OrigenRecibo;
    folio: number | null;
    negocioId: string | null;
    negocioNombre: string | null;  // titular: negocio (membresía/comercial) o anunciante (publicidad personal)
    logoUrl: string | null;
    ciudad: string | null;
    concepto: string;
    monto: string | null;
    fechaPago: string | null;
    periodoHasta: string | null;
    correoDueno: string | null;
    registradoPorNombre: string | null;
    anulado: boolean;
}

export interface ListaRecibos {
    items: ReciboFila[];
    total: number;
    pagina: number;
    porPagina: number;
}

interface FilaUnion {
    id: string;
    origen: OrigenRecibo;
    folio: number | null;
    negocio_id: string | null;
    titular: string | null;
    logo_url: string | null;
    ciudad: string | null;
    concepto: string;
    monto: string | null;
    fecha_pago: string | null;
    periodo_hasta: string | null;
    correo: string | null;
    registrado_por: string | null;
    anulado: boolean;
}

/** Predicado de alcance para el lado de MEMBRESÍA (correlacionado sobre `pm.negocio_id`). */
async function alcanceMembresia(panel: UsuarioPanel): Promise<ReturnType<typeof sql> | 'vacio'> {
    if (panel.rolEquipo === 'superadmin') return sql`TRUE`;
    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return 'vacio';
        return sql`EXISTS (SELECT 1 FROM negocio_sucursales ns JOIN ciudades c ON c.id = ns.ciudad_id
            WHERE ns.negocio_id = pm.negocio_id AND ns.es_principal = true AND c.region_id = ${panel.regionId})`;
    }
    const embajadorId = await resolverEmbajadorId(panel.usuarioId);
    if (!embajadorId) return 'vacio';
    return sql`EXISTS (SELECT 1 FROM negocios n WHERE n.id = pm.negocio_id AND n.embajador_id = ${embajadorId})`;
}

/** Predicado de alcance para el lado de PUBLICIDAD (correlacionado sobre `pc.id`). El vendedor: nada. */
function alcancePublicidad(panel: UsuarioPanel): ReturnType<typeof sql> {
    if (panel.rolEquipo === 'superadmin') return sql`TRUE`;
    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return sql`FALSE`;
        return sql`EXISTS (SELECT 1 FROM publicidad_compra_ciudades pcc JOIN ciudades c ON c.id = pcc.ciudad_id
            WHERE pcc.compra_id = pc.id AND c.region_id = ${panel.regionId})`;
    }
    return sql`FALSE`; // vendedor no ve recibos de publicidad
}

function ordenSql(orden?: OrdenRecibo): ReturnType<typeof sql> {
    switch (orden) {
        case 'folio_asc': return sql`folio ASC NULLS LAST`;
        case 'fecha_antiguos': return sql`fecha_pago ASC`;
        case 'fecha_recientes': return sql`fecha_pago DESC`;
        case 'folio_desc':
        default: return sql`folio DESC NULLS LAST`;
    }
}

export async function listarRecibos(panel: UsuarioPanel, filtros: FiltrosRecibos): Promise<ListaRecibos> {
    const alcMem = await alcanceMembresia(panel);
    const alcPub = alcancePublicidad(panel);
    const memVacio = alcMem === 'vacio';
    const alcMemSql = memVacio ? sql`FALSE` : alcMem;

    const like = filtros.busqueda ? `%${filtros.busqueda}%` : null;
    const negocioId = filtros.negocioId ?? null;
    const desde = filtros.desde ?? null;
    const hasta = filtros.hasta ?? null;
    const origen = filtros.origen ?? null;   // 'membresia' | 'publicidad' | null (ambos)

    // Filtros comunes por lado (búsqueda por folio/titular, negocio, fechas).
    const filtroMem = sql`
        ${alcMemSql}
        AND (${like}::text IS NULL OR CAST(pm.folio AS TEXT) ILIKE ${like} OR EXISTS (SELECT 1 FROM negocios n WHERE n.id = pm.negocio_id AND n.nombre ILIKE ${like}))
        AND (${negocioId}::uuid IS NULL OR pm.negocio_id = ${negocioId}::uuid)
        AND (${desde}::timestamptz IS NULL OR pm.fecha_pago >= ${desde}::timestamptz)
        AND (${hasta}::timestamptz IS NULL OR pm.fecha_pago <= ${hasta}::timestamptz)
        AND (${origen}::text IS NULL OR ${origen}::text = 'membresia')`;

    // El filtro por negocioId solo aplica a membresía (publicidad no es por negocio); con negocioId,
    // se excluye publicidad.
    const filtroPub = sql`
        pc.folio IS NOT NULL
        AND ${negocioId}::uuid IS NULL
        AND ${alcPub}
        AND (${like}::text IS NULL OR CAST(pc.folio AS TEXT) ILIKE ${like} OR EXISTS (SELECT 1 FROM usuarios u2 WHERE u2.id = pc.usuario_id AND TRIM(CONCAT(u2.nombre,' ',COALESCE(u2.apellidos,''))) ILIKE ${like}) OR EXISTS (SELECT 1 FROM negocios n2 WHERE n2.id = pc.negocio_id AND n2.nombre ILIKE ${like}))
        AND (${desde}::timestamptz IS NULL OR pc.created_at >= ${desde}::timestamptz)
        AND (${hasta}::timestamptz IS NULL OR pc.created_at <= ${hasta}::timestamptz)
        AND (${origen}::text IS NULL OR ${origen}::text = 'publicidad')`;

    const baseUnion = sql`
        SELECT 'membresia'::text AS origen, pm.id::text AS id, pm.folio,
               pm.negocio_id::text AS negocio_id, n.nombre AS titular, n.logo_url,
               c.nombre AS ciudad, pm.concepto, pm.monto::text AS monto,
               pm.fecha_pago::text AS fecha_pago, pm.periodo_hasta::text AS periodo_hasta,
               du.correo, TRIM(CONCAT(rg.nombre,' ',COALESCE(rg.apellidos,''))) AS registrado_por, pm.anulado
        FROM pagos_membresia pm
        LEFT JOIN negocios n ON n.id = pm.negocio_id
        LEFT JOIN negocio_sucursales s ON s.negocio_id = n.id AND s.es_principal = true
        LEFT JOIN ciudades c ON c.id = s.ciudad_id
        LEFT JOIN usuarios du ON du.id = n.usuario_id
        LEFT JOIN usuarios rg ON rg.id = pm.registrado_por
        WHERE ${filtroMem}
        UNION ALL
        SELECT 'publicidad'::text AS origen, pc.id::text AS id, pc.folio,
               pc.negocio_id::text AS negocio_id,
               COALESCE(n3.nombre, TRIM(CONCAT(u.nombre,' ',COALESCE(u.apellidos,'')))) AS titular, COALESCE(n3.logo_url, u.avatar_url) AS logo_url,
               NULL AS ciudad, pc.metodo_cobro AS concepto, pc.monto::text AS monto,
               pc.created_at::text AS fecha_pago, pc.expira_at::text AS periodo_hasta,
               u.correo, NULL AS registrado_por, false AS anulado
        FROM publicidad_compras pc
        JOIN usuarios u ON u.id = pc.usuario_id
        LEFT JOIN negocios n3 ON n3.id = pc.negocio_id
        WHERE ${filtroPub}`;

    const [{ total }] = (await db.execute(sql`SELECT count(*)::int AS total FROM (${baseUnion}) AS r`)).rows as Array<{ total: number }>;

    const offset = (filtros.pagina - 1) * filtros.porPagina;
    const filas = (await db.execute(sql`
        SELECT * FROM (${baseUnion}) AS r
        ORDER BY ${ordenSql(filtros.orden)}
        LIMIT ${filtros.porPagina} OFFSET ${offset}
    `)).rows as unknown as FilaUnion[];

    const items: ReciboFila[] = filas.map((f) => ({
        id: f.id,
        origen: f.origen,
        folio: f.folio ?? null,
        negocioId: f.negocio_id ?? null,
        negocioNombre: f.titular ?? null,
        logoUrl: f.logo_url ?? null,
        ciudad: f.ciudad ?? null,
        concepto: f.concepto,
        monto: f.monto ?? null,
        fechaPago: f.fecha_pago ?? null,
        periodoHasta: f.periodo_hasta ?? null,
        correoDueno: f.correo ?? null,
        registradoPorNombre: f.registrado_por?.trim() || null,
        anulado: f.anulado,
    }));

    return { items, total: Number(total), pagina: filtros.pagina, porPagina: filtros.porPagina };
}

// =============================================================================
// ALCANCE de un recibo concreto (para descargar/reenviar) — según origen
// =============================================================================

async function publicidadEnAlcance(panel: UsuarioPanel, id: string): Promise<boolean> {
    if (panel.rolEquipo === 'vendedor') return false;
    if (panel.rolEquipo === 'superadmin') {
        const [f] = (await db.execute(sql`SELECT 1 AS ok FROM publicidad_compras WHERE id = ${id}::uuid AND folio IS NOT NULL`)).rows as Array<{ ok: number }>;
        return !!f;
    }
    if (!panel.regionId) return false;
    const [f] = (await db.execute(sql`
        SELECT 1 AS ok FROM publicidad_compras pc
        WHERE pc.id = ${id}::uuid AND pc.folio IS NOT NULL
          AND EXISTS (SELECT 1 FROM publicidad_compra_ciudades pcc JOIN ciudades c ON c.id = pcc.ciudad_id WHERE pcc.compra_id = pc.id AND c.region_id = ${panel.regionId})
    `)).rows as Array<{ ok: number }>;
    return !!f;
}

async function membresiaEnAlcance(panel: UsuarioPanel, id: string): Promise<boolean> {
    const alc = await alcanceMembresia(panel);
    if (alc === 'vacio') return false;
    const [f] = (await db.execute(sql`SELECT 1 AS ok FROM pagos_membresia pm WHERE pm.id = ${id}::uuid AND ${alc}`)).rows as Array<{ ok: number }>;
    return !!f;
}

// =============================================================================
// DESCARGAR (genera/regenera el PDF y devuelve su URL en R2)
// =============================================================================

export type ResultadoDescarga = { ok: true; reciboUrl: string } | { ok: false; status: number; mensaje: string };

export async function descargarRecibo(panel: UsuarioPanel, reciboId: string, origen: OrigenRecibo): Promise<ResultadoDescarga> {
    if (origen === 'publicidad') {
        if (!(await publicidadEnAlcance(panel, reciboId))) return { ok: false, status: 404, mensaje: 'Recibo no encontrado.' };
        const rec = await prepararReciboPublicidad(reciboId, true);
        if (!rec?.reciboUrl) return { ok: false, status: 502, mensaje: 'No se pudo generar el recibo PDF.' };
        return { ok: true, reciboUrl: rec.reciboUrl };
    }
    if (!(await membresiaEnAlcance(panel, reciboId))) return { ok: false, status: 404, mensaje: 'Recibo no encontrado.' };
    const rec = await prepararReciboPago(reciboId);
    if (!rec?.reciboUrl) return { ok: false, status: 502, mensaje: 'No se pudo generar el recibo PDF.' };
    return { ok: true, reciboUrl: rec.reciboUrl };
}

// =============================================================================
// REENVIAR el comprobante por correo
// =============================================================================

export type ResultadoReenvio = { ok: true; enviados: number } | { ok: false; status: number; mensaje: string };

export async function reenviarRecibo(panel: UsuarioPanel, reciboId: string, correos: string[], origen: OrigenRecibo): Promise<ResultadoReenvio> {
    let enviados = 0;

    if (origen === 'publicidad') {
        if (!(await publicidadEnAlcance(panel, reciboId))) return { ok: false, status: 404, mensaje: 'Recibo no encontrado.' };
        const rec = await prepararReciboPublicidad(reciboId, true);
        if (!rec) return { ok: false, status: 404, mensaje: 'Recibo no encontrado.' };
        for (const correo of correos) {
            try {
                await enviarComprobantePublicidad(correo, rec.nombre ?? '', {
                    titular: rec.titular, carruseles: rec.carruseles, concepto: rec.concepto,
                    monto: rec.monto, folio: rec.folio, hasta: rec.hasta, reciboUrl: rec.reciboUrl,
                });
                enviados++;
            } catch {
                console.error('[Recibos] No se pudo reenviar (publicidad) a', correo);
            }
        }
        await registrarAuditoria(panel, { accion: 'recibo_reenviar', entidadTipo: 'publicidad', entidadId: reciboId, datosPrevios: null, datosNuevos: { correos, enviados }, motivo: null });
        if (enviados === 0) return { ok: false, status: 502, mensaje: 'No se pudo enviar el comprobante a ningún correo.' };
        return { ok: true, enviados };
    }

    if (!(await membresiaEnAlcance(panel, reciboId))) return { ok: false, status: 404, mensaje: 'Recibo no encontrado.' };
    const rec = await prepararReciboPago(reciboId);
    if (!rec) return { ok: false, status: 404, mensaje: 'Recibo no encontrado.' };
    for (const correo of correos) {
        try {
            await enviarComprobantePagoMembresia(correo, rec.nombreDueno ?? '', {
                nombreNegocio: rec.nombreNegocio, concepto: rec.concepto, monto: rec.monto, hasta: rec.hasta, reciboUrl: rec.reciboUrl,
            });
            enviados++;
        } catch {
            console.error('[Recibos] No se pudo reenviar el comprobante a', correo);
        }
    }
    await registrarAuditoria(panel, { accion: 'recibo_reenviar', entidadTipo: 'negocio', entidadId: reciboId, datosPrevios: null, datosNuevos: { reciboId, correos, enviados }, motivo: null });
    if (enviados === 0) return { ok: false, status: 502, mensaje: 'No se pudo enviar el comprobante a ningún correo.' };
    return { ok: true, enviados };
}
