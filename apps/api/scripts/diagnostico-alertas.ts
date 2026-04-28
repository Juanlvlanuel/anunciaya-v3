#!/usr/bin/env tsx
/**
 * Diagnóstico del refactor per-sucursal de alertas.
 *
 * 1. Muestra estado ANTES — alertas existentes con sus sucursal_id.
 * 2. Limpia las alertas de los 6 tipos per-sucursal que quedaron con sucursal_id NULL.
 * 3. Dispara ejecutarDeteccionDiaria + ejecutarDeteccionSemanal para el negocio.
 * 4. Muestra estado DESPUÉS — las alertas nuevas con su sucursal_id asignado.
 * 5. Resumen por (sucursal, tipo) para confirmar que cada alerta llegó donde toca.
 *
 * USO: pnpm tsx scripts/diagnostico-alertas.ts
 */

import pg from 'pg';
import { config } from 'dotenv';
import {
  ejecutarDeteccionDiaria,
  ejecutarDeteccionSemanal,
} from '../src/services/alertas-motor.service.js';

config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const TIPOS_PER_SUCURSAL = [
  'oferta_por_expirar',
  'cupones_por_expirar',
  'cupones_sin_canjear',
  'caida_ventas',
  'racha_resenas_negativas',
  'pico_actividad',
];

async function main() {
  // ─── 1. Negocio objetivo ────────────────────────────────────────────────
  console.log('\n=== 1. Localizando negocio ===\n');
  const negocio = await pool.query(
    `SELECT id, nombre FROM negocios WHERE nombre ILIKE '%imprenta findus%' LIMIT 1`
  );
  if (negocio.rows.length === 0) {
    console.error('⚠️  No se encontró el negocio "Imprenta FindUS". Ajusta el filtro del script.');
    process.exit(1);
  }
  const negocioId = negocio.rows[0].id as string;
  console.log(`Negocio: ${negocio.rows[0].nombre} (${negocioId})`);

  // ─── 2. Sucursales ──────────────────────────────────────────────────────
  const sucursalesRes = await pool.query(
    `SELECT id, nombre, es_principal
     FROM negocio_sucursales
     WHERE negocio_id = $1 AND activa = true
     ORDER BY es_principal DESC`,
    [negocioId]
  );
  console.log('\nSucursales activas:');
  console.table(sucursalesRes.rows);

  const sucMap = new Map<string, string>(
    sucursalesRes.rows.map((s) => [s.id as string, s.nombre as string])
  );
  const etiquetarSuc = (id: string | null) =>
    id === null ? '⚠️  NULL (global)' : sucMap.get(id) ?? `OTRA(${id.slice(0, 8)})`;

  // ─── 3. Estado ANTES ────────────────────────────────────────────────────
  console.log('\n=== 2. Alertas ANTES ===\n');
  const antes = await pool.query(
    `SELECT id, tipo, sucursal_id, titulo, leida, resuelta
     FROM alertas_seguridad
     WHERE negocio_id = $1
     ORDER BY created_at DESC`,
    [negocioId]
  );
  console.table(
    antes.rows.map((r) => ({
      tipo: r.tipo,
      sucursal: etiquetarSuc(r.sucursal_id),
      titulo: String(r.titulo ?? '').slice(0, 45),
      estado: r.resuelta ? 'resuelta' : r.leida ? 'leída' : 'pendiente',
    }))
  );

  // ─── 4. Limpiar alertas viejas con sucursal_id NULL de los 6 tipos ──────
  console.log('\n=== 3. Limpiando alertas viejas con sucursal_id NULL ===\n');
  const eliminadas = await pool.query(
    `DELETE FROM alertas_seguridad
     WHERE negocio_id = $1
       AND sucursal_id IS NULL
       AND tipo = ANY($2::text[])
     RETURNING id, tipo`,
    [negocioId, TIPOS_PER_SUCURSAL]
  );
  console.log(`Eliminadas: ${eliminadas.rowCount ?? 0}`);
  if (eliminadas.rowCount && eliminadas.rowCount > 0) {
    console.table(eliminadas.rows.map((r) => ({ id: r.id, tipo: r.tipo })));
  }

  // ─── 5. Disparar detecciones ────────────────────────────────────────────
  console.log('\n=== 4. Ejecutando detección diaria ===');
  await ejecutarDeteccionDiaria(negocioId);
  console.log('✅ Detección diaria ejecutada');

  console.log('\n=== 5. Ejecutando detección semanal ===');
  await ejecutarDeteccionSemanal(negocioId);
  console.log('✅ Detección semanal ejecutada');

  // ─── 6. Estado DESPUÉS ──────────────────────────────────────────────────
  console.log('\n=== 6. Alertas DESPUÉS ===\n');
  const despues = await pool.query(
    `SELECT id, tipo, sucursal_id, titulo, created_at
     FROM alertas_seguridad
     WHERE negocio_id = $1
     ORDER BY created_at DESC`,
    [negocioId]
  );
  console.table(
    despues.rows.map((r) => ({
      tipo: r.tipo,
      sucursal: etiquetarSuc(r.sucursal_id),
      titulo: String(r.titulo ?? '').slice(0, 45),
    }))
  );

  // ─── 7. Resumen por (sucursal, tipo) ────────────────────────────────────
  console.log('\n=== 7. Resumen por sucursal y tipo ===\n');
  const resumen = await pool.query(
    `SELECT sucursal_id, tipo, COUNT(*)::int AS total
     FROM alertas_seguridad
     WHERE negocio_id = $1
     GROUP BY sucursal_id, tipo
     ORDER BY sucursal_id NULLS FIRST, tipo`,
    [negocioId]
  );
  console.table(
    resumen.rows.map((r) => ({
      sucursal: etiquetarSuc(r.sucursal_id as string | null),
      tipo: r.tipo,
      total: r.total,
    }))
  );

  console.log('\n🔍 Revisa el panel de Alertas del Dashboard:');
  console.log('   - Con Matriz activa → deberías ver sus alertas + las globales');
  console.log('   - Con Sucursal Norte activa → deberías ver sus alertas + las globales');
  console.log('   - Las globales son: voucher_estancado, acumulacion_vouchers,');
  console.log('     cliente_vip_inactivo, puntos_por_expirar, recompensa_popular');

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
