/**
 * admin/negocios-acciones.service.ts
 * ==================================
 * Acciones de ESCRITURA de la sección Negocios del Panel (Entrega 2 · Parada 1).
 * Solo escriben en NUESTRA BD — NO tocan Stripe (eso es la Parada 2).
 *
 *   - suspenderNegocio   — oculta temporal (activo=false, estado_admin='suspendido')
 *   - reactivarNegocio   — revierte la suspensión manual (activo=true, estado_admin='activo')
 *   - reasignarVendedor  — cambia/quita el vendedor atribuido (embajadorId + regionId)
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

import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { negocios, embajadores } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';
import { registrarAuditoria } from './auditoria.service.js';
import { notificarNegocioFueraDeCirculacion, limpiarNotificacionNegocioFueraDeCirculacion } from '../notificaciones.service.js';

// =============================================================================
// TIPOS
// =============================================================================

interface NegocioAccion {
    id: string;
    estadoAdmin: string;
    activo: boolean | null;
    embajadorId: string | null;
    regionId: string | null;
}

export type ResultadoAccion =
    | { ok: true; negocio: NegocioAccion }
    | { ok: false; status: number; mensaje: string };

// =============================================================================
// HELPER: cargar negocio validando alcance del rol
// =============================================================================

type NegocioCargado = {
    id: string;
    estadoAdmin: string;
    activo: boolean | null;
    esBorrador: boolean | null;
    onboardingCompletado: boolean;
    embajadorId: string | null;
    regionId: string | null;
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
            estadoAdmin: negocios.estadoAdmin,
            activo: negocios.activo,
            esBorrador: negocios.esBorrador,
            onboardingCompletado: negocios.onboardingCompletado,
            embajadorId: negocios.embajadorId,
            regionId: negocios.regionId,
        })
        .from(negocios)
        .where(eq(negocios.id, negocioId))
        .limit(1);

    if (!neg) return { ok: false, status: 404, mensaje: 'Negocio no encontrado' };

    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId || neg.regionId !== panel.regionId) {
            return { ok: false, status: 403, mensaje: 'El negocio no pertenece a tu región' };
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
            regionId: negocios.regionId,
        });

    await registrarAuditoria(panel, {
        accion: 'negocio_suspender',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: { estadoAdmin: neg.estadoAdmin, activo: neg.activo },
        datosNuevos: { estadoAdmin: 'suspendido', activo: false },
        motivo,
    });

    // Aviso persistente al dueño en su centro de notificaciones (modo personal).
    await notificarNegocioFueraDeCirculacion(negocioId);

    return { ok: true, negocio: act };
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
            regionId: negocios.regionId,
        });

    await registrarAuditoria(panel, {
        accion: 'negocio_reactivar',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: { estadoAdmin: neg.estadoAdmin, activo: neg.activo },
        datosNuevos: { estadoAdmin: 'activo', activo: true },
        motivo: motivo ?? null,
    });

    // Negocio reactivado: borrar el aviso de "fuera de circulación" del dueño.
    await limpiarNotificacionNegocioFueraDeCirculacion(negocioId);

    return { ok: true, negocio: act };
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

    // Región resultante: al QUITAR se mantiene la región actual (el gerente sigue
    // viendo el negocio de su zona). Al ASIGNAR, pasa a la región del nuevo vendedor.
    let nuevaRegionId: string | null = neg.regionId;

    if (embajadorId !== null) {
        const [emb] = await db
            .select({ id: embajadores.id, regionId: embajadores.regionId, estado: embajadores.estado })
            .from(embajadores)
            .where(eq(embajadores.id, embajadorId))
            .limit(1);

        if (!emb) return { ok: false, status: 404, mensaje: 'Vendedor no encontrado' };
        if (emb.estado !== 'activo') return { ok: false, status: 409, mensaje: 'El vendedor no está activo' };

        // El gerente solo puede asignar vendedores de SU región.
        if (panel.rolEquipo === 'gerente' && emb.regionId !== panel.regionId) {
            return { ok: false, status: 403, mensaje: 'El vendedor no pertenece a tu región' };
        }

        nuevaRegionId = emb.regionId;
    }

    // Sin cambio real → no escribir ni auditar.
    if ((neg.embajadorId ?? null) === embajadorId && (neg.regionId ?? null) === nuevaRegionId) {
        return { ok: false, status: 409, mensaje: 'El negocio ya tiene esa atribución' };
    }

    const ahora = new Date().toISOString();
    const [act] = await db
        .update(negocios)
        .set({ embajadorId, regionId: nuevaRegionId, updatedAt: ahora })
        .where(eq(negocios.id, negocioId))
        .returning({
            id: negocios.id,
            estadoAdmin: negocios.estadoAdmin,
            activo: negocios.activo,
            embajadorId: negocios.embajadorId,
            regionId: negocios.regionId,
        });

    await registrarAuditoria(panel, {
        accion: 'negocio_reasignar_vendedor',
        entidadTipo: 'negocio',
        entidadId: negocioId,
        datosPrevios: { embajadorId: neg.embajadorId, regionId: neg.regionId },
        datosNuevos: { embajadorId, regionId: nuevaRegionId },
        motivo: motivo ?? null,
    });

    return { ok: true, negocio: act };
}
