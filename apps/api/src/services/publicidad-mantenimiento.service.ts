/**
 * publicidad-mantenimiento.service.ts
 * ===================================
 * Mantenimiento periódico de los anuncios (Fase 2): expira los vencidos y avisa por correo a los
 * que están por vencer. Lo dispara el cron `publicidad.cron.ts`.
 *
 *   - expirarAnunciosVencidos      → 'activa' con expira_at < ahora → 'expirada' (dejan de mostrarse).
 *   - limpiarPendientesAbandonados → borra los 'pendiente' viejos (checkout iniciado pero nunca pagado).
 *   - avisarAnunciosPorVencer      → 'activa' que vencen en ≤ N días (config publicidad_aviso_dias) y aún
 *     sin avisar → correo al anunciante + marca `aviso_vencimiento_enviado` (no se repite).
 *
 * Ubicación: apps/api/src/services/publicidad-mantenimiento.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { obtenerConfigNumero } from './configuracion.service.js';
import { enviarAvisoVencimientoPublicidad } from '../utils/email.js';
import { notificarCambioPublicidad } from './publicidad-realtime.js';

export async function expirarAnunciosVencidos(): Promise<{ expirados: number }> {
    const r = await db.execute(sql`
        UPDATE publicidad_compras
        SET estado = 'expirada', updated_at = now()
        WHERE estado = 'activa' AND expira_at < now()
        RETURNING id
    `);
    // El carrusel público ya filtra por expira_at en vivo y el timer del cliente suele quitar la
    // pieza justo al vencer; este aviso es la red por si algún cliente no tenía el timer armado
    // (recién montado, tras reconexión, etc.).
    if (r.rows.length > 0) notificarCambioPublicidad('expiracion-cron');
    return { expirados: r.rows.length };
}

/**
 * Borra los anuncios que quedaron en 'pendiente' (checkout self-service iniciado pero nunca pagado:
 * pago rechazado o abandonado). La Checkout Session de Stripe caduca en ~1h, así que un pendiente más
 * viejo que eso jamás se pagará por su sesión. El DELETE arrastra piezas + ciudades (FK cascade); las
 * imágenes en R2 quedan sin referencia y las recoge el recolector. No toca pendientes recientes (un
 * checkout que puede estar en curso).
 */
export async function limpiarPendientesAbandonados(horas = 2): Promise<{ borrados: number }> {
    const r = await db.execute(sql`
        DELETE FROM publicidad_compras
        WHERE estado = 'pendiente' AND created_at < now() - (${horas} || ' hours')::interval
        RETURNING id
    `);
    return { borrados: r.rows.length };
}

function diasHasta(iso: string): number {
    return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

export async function avisarAnunciosPorVencer(): Promise<{ avisados: number; errores: number }> {
    const dias = await obtenerConfigNumero('publicidad_aviso_dias', 3);

    const filas = (await db.execute(sql`
        SELECT pc.id::text AS id, pc.expira_at AS expira_at, u.correo AS correo, u.nombre AS nombre
        FROM publicidad_compras pc
        JOIN usuarios u ON u.id = pc.usuario_id
        WHERE pc.estado = 'activa'
          AND pc.aviso_vencimiento_enviado = false
          AND pc.expira_at > now()
          AND pc.expira_at <= now() + (${dias} || ' days')::interval
    `)).rows as Array<{ id: string; expira_at: string; correo: string | null; nombre: string | null }>;

    let avisados = 0;
    let errores = 0;
    for (const f of filas) {
        try {
            if (f.correo) {
                await enviarAvisoVencimientoPublicidad(f.correo, f.nombre ?? '', diasHasta(f.expira_at));
            }
            await db.execute(sql`UPDATE publicidad_compras SET aviso_vencimiento_enviado = true WHERE id = ${f.id}::uuid`);
            avisados++;
        } catch (e) {
            errores++;
            console.error('[Publicidad] Error avisando vencimiento de', f.id, e);
        }
    }
    return { avisados, errores };
}

/**
 * Cuenta (sin actuar) cuántos registros tocaría una corrida del cron AHORA: anuncios por expirar +
 * pendientes abandonados por limpiar + avisos de vencimiento por enviar. Reusa las MISMAS condiciones
 * que `expirarAnunciosVencidos` / `limpiarPendientesAbandonados` / `avisarAnunciosPorVencer` (los 3
 * conjuntos son disjuntos por estado/vigencia) para que el preview del Panel no se desincronice de la
 * ejecución. Una sola query con 3 subselects. Para el bloque "Tareas programadas" de Mantenimiento.
 */
export async function contarMantenimientoPublicidad(horas = 2): Promise<number> {
    const dias = await obtenerConfigNumero('publicidad_aviso_dias', 3);
    const r = await db.execute<{ total: number }>(sql`
        SELECT
            (SELECT COUNT(*)::int FROM publicidad_compras
              WHERE estado = 'activa' AND expira_at < now())
          + (SELECT COUNT(*)::int FROM publicidad_compras
              WHERE estado = 'pendiente' AND created_at < now() - (${horas} || ' hours')::interval)
          + (SELECT COUNT(*)::int FROM publicidad_compras
              WHERE estado = 'activa'
                AND aviso_vencimiento_enviado = false
                AND expira_at > now()
                AND expira_at <= now() + (${dias} || ' days')::interval)
          AS total
    `);
    return Number(r.rows[0]?.total ?? 0);
}
