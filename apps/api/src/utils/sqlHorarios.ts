/**
 * ============================================================================
 * FRAGMENTOS SQL DE HORARIOS
 * ============================================================================
 *
 * UBICACIÓN: apps/api/src/utils/sqlHorarios.ts
 *
 * PROPÓSITO:
 * Centralizar el cálculo de "¿está abierto ahora?" que antes vivía duplicado
 * en negocios.service.ts y votos.service.ts.
 *
 * Debe mantenerse alineado con apps/web/src/utils/horarios.ts
 */

import { sql, type SQL } from 'drizzle-orm';

/**
 * Fragmento que resuelve si la sucursal está abierta en este momento.
 *
 * Asume que la consulta tiene a `negocio_sucursales` con el alias `s`
 * (se usan `s.id` y `s.zona_horaria`).
 *
 * Contempla turnos que cierran de madrugada (ej. 20:00 → 03:00): a la 01:00 del
 * martes quien está abierto es el turno del LUNES, no el del martes. Por eso se
 * revisan dos días — el de hoy y el de ayer — y no solo el actual.
 */
export function sqlEstaAbierto(): SQL {
    const horaLocal = sql`(CURRENT_TIMESTAMP AT TIME ZONE s.zona_horaria)::time`;
    const diaLocal = sql`EXTRACT(DOW FROM (CURRENT_TIMESTAMP AT TIME ZONE s.zona_horaria))::INTEGER`;

    return sql`
        EXISTS (
            SELECT 1
            FROM negocio_horarios nh
            WHERE nh.sucursal_id = s.id
              AND nh.abierto = true
              AND nh.hora_apertura IS NOT NULL
              AND nh.hora_cierre IS NOT NULL
              AND CASE
                    -- Turno de HOY
                    WHEN nh.dia_semana = ${diaLocal} THEN
                        CASE
                            WHEN nh.hora_cierre < nh.hora_apertura
                                -- Cierra de madrugada: hoy solo cuenta desde que abre
                                THEN ${horaLocal} >= nh.hora_apertura
                            ELSE ${horaLocal} BETWEEN nh.hora_apertura AND nh.hora_cierre
                        END
                    -- Turno de AYER que cerró de madrugada y sigue vigente
                    WHEN nh.dia_semana = (${diaLocal} + 6) % 7 THEN
                        nh.hora_cierre < nh.hora_apertura
                        AND ${horaLocal} < nh.hora_cierre
                    ELSE false
                  END
        )
    `;
}
