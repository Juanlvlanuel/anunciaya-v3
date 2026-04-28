#!/usr/bin/env tsx
/**
 * Conteo de ventas SIN CUPÓN confirmadas por operador en Matriz.
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SUCURSAL_MATRIZ = '41165179-a32a-4e37-a3cf-6e0e08bb9850';

async function main() {
  console.log('\n=== Ventas sin cupón confirmadas en Matriz, agrupadas por operador ===\n');

  const resultado = await pool.query(`
    SELECT
      COALESCE(
        CASE WHEN pt.empleado_id IS NOT NULL THEN 'empleado: ' || e.nombre END,
        CASE WHEN t.usuario_id IS NOT NULL THEN 'usuario: ' || u.nombre || ' ' || COALESCE(u.apellidos, '') END,
        '⚠️ sin operador'
      ) AS operador,
      COUNT(*)::int AS total_ventas
    FROM puntos_transacciones pt
    LEFT JOIN empleados e ON e.id = pt.empleado_id
    LEFT JOIN scanya_turnos t ON t.id = pt.turno_id
    LEFT JOIN usuarios u ON u.id = t.usuario_id
    WHERE pt.sucursal_id = $1
      AND pt.estado = 'confirmado'
      AND pt.cupon_uso_id IS NULL
    GROUP BY operador
    ORDER BY total_ventas DESC
  `, [SUCURSAL_MATRIZ]);

  console.table(resultado.rows);

  // Verificación: conteos adicionales
  console.log('\n=== Distribución de transacciones por estado y tipo de operador ===\n');
  const distribucion = await pool.query(`
    SELECT
      estado,
      CASE
        WHEN empleado_id IS NOT NULL THEN 'empleado'
        WHEN turno_id IS NOT NULL THEN 'usuario (via turno)'
        ELSE 'sin operador'
      END AS tipo_operador,
      CASE WHEN cupon_uso_id IS NULL THEN 'sin cupón' ELSE 'con cupón' END AS tipo_venta,
      COUNT(*)::int AS total
    FROM puntos_transacciones
    WHERE sucursal_id = $1
    GROUP BY 1, 2, 3
    ORDER BY 1, 2, 3
  `, [SUCURSAL_MATRIZ]);

  console.table(distribucion.rows);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
