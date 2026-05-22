/**
 * expiracion.ts
 * ===============
 * Helpers para calcular `expira_at` de cualquier entidad con TTL
 * (publicaciones de Servicios/MarketPlace, vouchers de CardYA, etc.)
 * respetando la zona horaria del usuario / negocio.
 *
 * ── PROBLEMA QUE RESUELVE ─────────────────────────────────────────────
 * El cálculo ingenuo `new Date(); d.setDate(d.getDate() + 30)` setea
 * `expira_at` a la HORA EXACTA de creación + N días. Una publicación
 * creada hoy a las 8pm vence a las 8pm del día N+30 — el usuario
 * pierde 4 horas del día. Si la creó a las 11pm pierde 1 hora; si a
 * las 1am le sobran 23 horas. TTL "efectivo" inconsistente.
 *
 * ── SOLUCIÓN ──────────────────────────────────────────────────────────
 * `sqlExpiracionFinDeDia(N, zona)` devuelve un SQL fragment que el
 * motor de Postgres evalúa como "23:59:59 del día N+TTL en la zona
 * horaria local". Eso garantiza que el usuario tenga el día completo
 * independientemente de la hora de creación.
 *
 *   Ejemplo (creación 17/05 8:10pm hora Hermosillo, TTL=5):
 *     - Antes (bug): expira_at = 21/05 8:10pm local
 *     - Después:     expira_at = 21/05 23:59:59 local
 *
 * ── POR QUÉ SQL Y NO JS ───────────────────────────────────────────────
 * Postgres maneja `AT TIME ZONE` con DST correctamente. Hacerlo en JS
 * requeriría `Intl.DateTimeFormat` + cálculo manual del offset, y
 * cualquier error de DST genera bugs sutiles solo visibles en abril/
 * octubre. Delegar al motor es más simple y a prueba de bombas.
 *
 * El SQL fragment se interpola dentro de un `db.execute(sql\`...\`)`
 * como cualquier otro valor escalar — Drizzle lo trata como subquery.
 *
 * Ubicación: apps/api/src/utils/expiracion.ts
 */

import { sql, type SQL } from 'drizzle-orm';
import type { ZonaHorariaMx } from './zonaHoraria.js';
import { zonaHorariaSQL } from './zonaHoraria.js';

/**
 * TTL por defecto para todas las entidades expirables (publicaciones,
 * vouchers, etc.). 30 días es el estándar histórico del proyecto.
 */
export const TTL_DIAS_DEFAULT = 30;

/**
 * Devuelve un SQL fragment que evalúa a un `timestamp with time zone`
 * representando el FIN DEL DÍA (23:59:59) del día N+ttlDias en la
 * zona horaria especificada.
 *
 * Uso típico (INSERT):
 *   await db.execute(sql\`
 *     INSERT INTO tabla (..., expira_at) VALUES (..., ${sqlExpiracionFinDeDia(30, 'America/Hermosillo')})
 *   \`);
 *
 * Uso típico (UPDATE):
 *   await db.execute(sql\`
 *     UPDATE tabla SET expira_at = ${sqlExpiracionFinDeDia(30, zona)} WHERE id = ${id}
 *   \`);
 *
 * @param ttlDias Días de TTL. Default 30.
 * @param zona Zona horaria IANA válida para México. Default 'America/Mexico_City'.
 */
export function sqlExpiracionFinDeDia(
    ttlDias: number = TTL_DIAS_DEFAULT,
    zona: ZonaHorariaMx = 'America/Mexico_City',
): SQL {
    // Validación defensiva: ttlDias debe ser entero positivo. Si llega un
    // valor inválido caemos al default — más seguro que generar SQL roto.
    const dias = Number.isFinite(ttlDias) && ttlDias > 0
        ? Math.floor(ttlDias)
        : TTL_DIAS_DEFAULT;

    // El truco SQL:
    //   1. NOW() AT TIME ZONE 'X'         → timestamp local en X (sin offset)
    //   2. ::date                          → solo fecha (día actual en X)
    //   3. + INTERVAL 'N days'             → día N+TTL
    //   4. ::timestamp                     → cast a timestamp (00:00:00)
    //   5. + INTERVAL '23h 59m 59s'        → fin del día
    //   6. AT TIME ZONE 'X'                → interpreta como hora local X
    //                                        y devuelve UTC para guardar
    //
    // sql.raw para el número de días: validado arriba (entero positivo),
    // no viene del usuario, no hay riesgo de SQL injection.
    return sql`(
        (((NOW() AT TIME ZONE ${zonaHorariaSQL(zona)})::date
            + INTERVAL '${sql.raw(String(dias))} days')::timestamp
            + INTERVAL '23 hours 59 minutes 59 seconds')
        AT TIME ZONE ${zonaHorariaSQL(zona)}
    )`;
}
