/**
 * expiracion.ts
 * ==============
 * Lógica del ciclo de vida automático del MarketPlace (Sprint 7):
 *
 *   1. autoPausarExpirados()
 *      Pausa artículos vencidos (`expira_at < NOW()` y `estado='activa'`) y
 *      crea notificación tipo `marketplace_expirada` para cada vendedor.
 *
 *   2. notificarProximaExpiracion()
 *      Notifica con 3 días de anticipación a vendedores cuyas publicaciones
 *      van a expirar pronto. Tipo `marketplace_proxima_expirar`.
 *
 *   3. reactivarArticulo(articuloId, usuarioId)
 *      Endpoint del usuario: extiende `expira_at` 30 días más y vuelve a
 *      poner el artículo en `estado='activa'`.
 *
 * Idempotencia (CRÍTICA):
 *  - Antes de insertar cualquier notificación se verifica que NO exista ya
 *    una del mismo `tipo` con el mismo `referencia_id` (articuloId). Esto
 *    permite que el cron corra varias veces sin spamear al usuario.
 *
 * Doc maestro: docs/arquitectura/MarketPlace.md (§6 Estados + §7 TTL)
 * Sprint:      docs/prompts Marketplace/Sprint-7-Polish.md
 *
 * Ubicación: apps/api/src/services/marketplace/expiracion.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';

// =============================================================================
// HELPER — Crear notificación idempotente
// =============================================================================

type TipoNotificacionMarketplace =
    | 'marketplace_expirada'
    | 'marketplace_proxima_expirar'
    | 'marketplace_nuevo_mensaje';

/**
 * Crea una notificación para el vendedor solo si NO existe ya una del mismo
 * `tipo` apuntando al mismo `referencia_id` (articulo). Devuelve true si se
 * creó, false si fue saltada por idempotencia.
 *
 * `referencia_id` es VARCHAR(100) en BD — guardamos el UUID como string.
 */
async function crearNotificacionMarketplace(
    usuarioId: string,
    tipo: TipoNotificacionMarketplace,
    titulo: string,
    mensaje: string,
    articuloId: string
): Promise<boolean> {
    // 1) Idempotencia: ¿ya existe?
    const existente = await db.execute(sql`
        SELECT 1 FROM notificaciones
        WHERE usuario_id = ${usuarioId}
          AND tipo = ${tipo}
          AND referencia_id = ${articuloId}
          AND referencia_tipo = 'marketplace'
        LIMIT 1
    `);
    if (existente.rows.length > 0) {
        return false;
    }

    // 2) Insertar
    await db.execute(sql`
        INSERT INTO notificaciones (
            usuario_id, modo, tipo, titulo, mensaje,
            referencia_id, referencia_tipo, icono
        ) VALUES (
            ${usuarioId},
            'personal',
            ${tipo},
            ${titulo},
            ${mensaje},
            ${articuloId},
            'marketplace',
            ${tipo === 'marketplace_expirada' ? 'alert' : 'clock'}
        )
    `);
    return true;
}

// =============================================================================
// 1. AUTO-PAUSAR EXPIRADOS
// =============================================================================

export interface ResultadoAutoPausa {
    pausados: number;
    notificacionesCreadas: number;
    notificacionesSkipped: number;
    errores: number;
}

/**
 * Pausa todos los artículos cuyo `expira_at < NOW()` y `estado='activa'`.
 * Por cada uno, crea (idempotentemente) una notificación al vendedor.
 *
 * Nota sobre el race condition: si el cron corre justo cuando el vendedor
 * está reactivando, el UPDATE puede afectar 0 filas — eso está bien, el
 * artículo ya tiene nuevo `expira_at` futuro y no entra en el WHERE.
 */
export async function autoPausarExpirados(): Promise<ResultadoAutoPausa> {
    const resultado: ResultadoAutoPausa = {
        pausados: 0,
        notificacionesCreadas: 0,
        notificacionesSkipped: 0,
        errores: 0,
    };

    try {
        // 1) UPDATE masivo + RETURNING para obtener los pausados.
        const r = await db.execute(sql`
            UPDATE articulos_marketplace
            SET estado = 'pausada', updated_at = NOW()
            WHERE estado = 'activa'
              AND deleted_at IS NULL
              AND expira_at < NOW()
            RETURNING id, usuario_id, titulo
        `);

        const articulos = r.rows as Array<{
            id: string;
            usuario_id: string;
            titulo: string;
        }>;
        resultado.pausados = articulos.length;

        // 2) Crear notificaciones idempotentes
        for (const a of articulos) {
            try {
                const creada = await crearNotificacionMarketplace(
                    a.usuario_id,
                    'marketplace_expirada',
                    'Tu publicación expiró',
                    `"${a.titulo}" se pausó automáticamente. Reactívala con un click si sigue disponible.`,
                    a.id
                );
                if (creada) {
                    resultado.notificacionesCreadas++;
                } else {
                    resultado.notificacionesSkipped++;
                }
            } catch (err) {
                console.error(`[Marketplace expiracion] Error notificando ${a.id}:`, err);
                resultado.errores++;
            }
        }
    } catch (err) {
        console.error('[Marketplace expiracion] Error en autoPausarExpirados:', err);
        resultado.errores++;
    }

    return resultado;
}

// =============================================================================
// 2. NOTIFICAR PRÓXIMA EXPIRACIÓN (3 DÍAS ANTES)
// =============================================================================

export interface ResultadoProximaExpiracion {
    candidatos: number;
    notificacionesCreadas: number;
    notificacionesSkipped: number;
    errores: number;
}

/**
 * Detecta artículos cuya `expira_at` cae dentro de la ventana de 3 a 4 días
 * a partir de NOW() (se da 1 día de tolerancia para que aunque el cron no
 * corra exactamente cada 24h, los artículos no se queden sin aviso).
 *
 * Idempotente — solo se notifica si NO existe ya `marketplace_proxima_expirar`
 * para ese artículo.
 */
export async function notificarProximaExpiracion(): Promise<ResultadoProximaExpiracion> {
    const resultado: ResultadoProximaExpiracion = {
        candidatos: 0,
        notificacionesCreadas: 0,
        notificacionesSkipped: 0,
        errores: 0,
    };

    try {
        const r = await db.execute(sql`
            SELECT id, usuario_id, titulo
            FROM articulos_marketplace
            WHERE estado = 'activa'
              AND deleted_at IS NULL
              AND expira_at BETWEEN NOW() + INTERVAL '3 days' AND NOW() + INTERVAL '4 days'
        `);

        const articulos = r.rows as Array<{
            id: string;
            usuario_id: string;
            titulo: string;
        }>;
        resultado.candidatos = articulos.length;

        for (const a of articulos) {
            try {
                const creada = await crearNotificacionMarketplace(
                    a.usuario_id,
                    'marketplace_proxima_expirar',
                    'Tu publicación expira pronto',
                    `"${a.titulo}" expira en 3 días. ¿Quieres extenderla?`,
                    a.id
                );
                if (creada) {
                    resultado.notificacionesCreadas++;
                } else {
                    resultado.notificacionesSkipped++;
                }
            } catch (err) {
                console.error(
                    `[Marketplace expiracion] Error notif próxima exp ${a.id}:`,
                    err
                );
                resultado.errores++;
            }
        }
    } catch (err) {
        console.error('[Marketplace expiracion] Error en notificarProximaExpiracion:', err);
        resultado.errores++;
    }

    return resultado;
}

// =============================================================================
// 3. REACTIVAR ARTÍCULO (acción del usuario)
// =============================================================================

/**
 * El dueño reactiva un artículo `pausada`. Se valida que sea el dueño y que
 * el estado actual sea `pausada`. Extiende `expira_at = NOW() + 30 días` y
 * vuelve a `estado='activa'`.
 */
export async function reactivarArticulo(articuloId: string, usuarioId: string) {
    try {
        const verificacion = await db.execute(sql`
            SELECT usuario_id, estado
            FROM articulos_marketplace
            WHERE id = ${articuloId}
              AND deleted_at IS NULL
            LIMIT 1
        `);

        if (verificacion.rows.length === 0) {
            return { success: false, message: 'Artículo no encontrado', code: 404 };
        }

        const actual = verificacion.rows[0] as { usuario_id: string; estado: string };

        if (actual.usuario_id !== usuarioId) {
            return {
                success: false,
                message: 'No tienes permiso para reactivar este artículo',
                code: 403,
            };
        }

        if (actual.estado !== 'pausada') {
            return {
                success: false,
                message: `Solo puedes reactivar artículos pausados (estado actual: ${actual.estado})`,
                code: 409,
            };
        }

        await db.execute(sql`
            UPDATE articulos_marketplace
            SET estado = 'activa',
                expira_at = NOW() + INTERVAL '30 days',
                updated_at = NOW()
            WHERE id = ${articuloId}
        `);

        return {
            success: true,
            message: 'Tu publicación está activa de nuevo. Expira en 30 días.',
            data: { estado: 'activa' as const },
        };
    } catch (error) {
        console.error('[Marketplace expiracion] Error en reactivarArticulo:', error);
        throw error;
    }
}
