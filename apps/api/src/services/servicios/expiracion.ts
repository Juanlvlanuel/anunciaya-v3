/**
 * services/servicios/expiracion.ts
 * =================================
 * Auto-pausa de publicaciones de Servicios que llevaron 30 días sin
 * interacción.
 *
 * Política:
 *   - Toda publicación tiene `expira_at = NOW() + 30 días` al crearse.
 *   - El cron corre cada 6h y pausa las que ya pasaron de `expira_at` y
 *     siguen activas.
 *   - El dueño puede reactivar manualmente desde "Mis Publicaciones" via
 *     `POST /publicaciones/:id/reactivar`, que resetea `expira_at` a
 *     NOW()+30d (ver `reactivarPublicacion` en `servicios.service.ts`).
 *
 * Notificaciones al dueño (Sprint 7.5+ cuando tengamos infra estable):
 *   - 3 días antes de vencer → "Tu publicación vence pronto, reactívala".
 *   - Al pausarse → "Tu publicación se pausó, reactívala".
 *
 * Por ahora este service SOLO auto-pausa. Las notif se agregan después
 * reutilizando el patrón de `services/marketplace/expiracion.ts`.
 *
 * Ubicación: apps/api/src/services/servicios/expiracion.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';

export interface ResultadoAutoPausaServicios {
    pausados: number;
    errores: number;
}

/**
 * UPDATE atómico que pasa a 'pausada' todas las publicaciones activas que
 * ya vencieron. Devuelve la cantidad afectada. Mejor que iterar fila por
 * fila — una sola query bloquea solo las filas vencidas y la transacción
 * es rapidísima.
 */
export async function autoPausarExpiradosServicios(): Promise<ResultadoAutoPausaServicios> {
    const resultado: ResultadoAutoPausaServicios = {
        pausados: 0,
        errores: 0,
    };

    try {
        const r = await db.execute<{ id: string }>(sql`
            UPDATE servicios_publicaciones
            SET estado = 'pausada',
                updated_at = NOW()
            WHERE estado = 'activa'
              AND deleted_at IS NULL
              AND expira_at < NOW()
            RETURNING id
        `);

        resultado.pausados = r.rows.length;
        return resultado;
    } catch (error) {
        console.error('Error en autoPausarExpiradosServicios:', error);
        resultado.errores = 1;
        return resultado;
    }
}
