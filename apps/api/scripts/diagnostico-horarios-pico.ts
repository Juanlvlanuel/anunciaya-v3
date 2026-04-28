#!/usr/bin/env tsx
/**
 * Diagnóstico zona horaria en Horarios Pico (Reportes BS).
 *
 * Hipótesis: el servidor PostgreSQL puede estar aplicando DST a la zona
 * 'America/Mexico_City' aunque México eliminó el horario de verano en
 * 2022. Eso causaría que una venta a las 09:05 hora local aparezca en el
 * bucket 10 (offset +1h por DST mal aplicado).
 *
 * Este script toma las últimas 10 transacciones confirmadas y muestra:
 *   1. created_at raw (ISO con offset)
 *   2. created_at AT TIME ZONE 'America/Mexico_City' (zona IANA)
 *   3. created_at AT TIME ZONE 'Etc/GMT+6' (offset fijo -06:00, sin DST)
 *   4. EXTRACT(HOUR) con cada método
 *
 * Si col 2 y 3 dan horas distintas para una misma fila, el server está
 * aplicando DST y el fix es usar offset fijo en la query de reportes.
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('\n=== Zona horaria del servidor PostgreSQL ===\n');
  const tz = await pool.query(`SHOW timezone`);
  console.log('TimeZone config:', tz.rows[0]);

  const ahora = await pool.query(`
    SELECT
      NOW() AS utc_now,
      NOW() AT TIME ZONE 'America/Mexico_City' AS mex_iana,
      NOW() AT TIME ZONE 'Etc/GMT+6' AS mex_offset,
      EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/Mexico_City')::int AS hora_iana,
      EXTRACT(HOUR FROM NOW() AT TIME ZONE 'Etc/GMT+6')::int AS hora_offset
  `);
  console.log('\n=== NOW() comparado ===');
  console.table(ahora.rows);

  console.log('\n=== Últimas 10 transacciones confirmadas — comparación ===\n');
  const r = await pool.query(`
    SELECT
      id,
      created_at::text AS raw,
      (created_at AT TIME ZONE 'America/Mexico_City')::text AS iana,
      (created_at AT TIME ZONE 'Etc/GMT+6')::text AS offset_fijo,
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Mexico_City')::int AS hora_iana,
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'Etc/GMT+6')::int AS hora_offset
    FROM puntos_transacciones
    WHERE estado = 'confirmado'
    ORDER BY created_at DESC
    LIMIT 10
  `);
  console.table(r.rows);

  console.log('\n=== Diagnóstico ===');
  const diferentes = r.rows.filter((row) => row.hora_iana !== row.hora_offset);
  if (diferentes.length === 0) {
    console.log('✅ IANA y offset fijo dan la misma hora — el servidor NO aplica DST a México.');
    console.log('   El bug debe estar en otro lugar (frontend, otra query, datos mal grabados).');
  } else {
    console.log(`⚠️  ${diferentes.length}/${r.rows.length} filas con hora_iana ≠ hora_offset`);
    console.log('   El servidor está aplicando DST viejo a America/Mexico_City.');
    console.log('   Fix: cambiar AT TIME ZONE \'America/Mexico_City\' por AT TIME ZONE \'Etc/GMT+6\' en reportes.service.ts');
  }

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
