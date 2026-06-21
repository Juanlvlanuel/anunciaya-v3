/**
 * diag-metricas-region.ts — DIAGNÓSTICO (solo lectura)
 * Verifica por qué "Toda la plataforma" ≠ suma de regiones en Métricas/Crecimiento:
 * negocios activos cuya región NO se puede deducir (matriz sin ciudad, o ciudad sin region_id).
 * EJECUTAR: cd apps/api && pnpm exec tsx scripts/diag-metricas-region.ts
 */
import { config } from 'dotenv';
config();
import { sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';

const SUB_ACTIVO = sql`n.estado_admin = 'activo' AND n.estado_membresia IN ('al_corriente','en_gracia')`;
const DESDE_12M = sql`ep.fecha_evento >= date_trunc('month', NOW()) - INTERVAL '11 months'`;

async function main() {
  const totalActivos = (await db.execute(sql`SELECT COUNT(*) AS n FROM negocios n WHERE ${SUB_ACTIVO}`)).rows[0];

  const porRegion = (await db.execute(sql`
    SELECT r.nombre AS region, COUNT(DISTINCT n.id) AS activos
    FROM negocios n
    JOIN negocio_sucursales ns ON ns.negocio_id = n.id AND ns.es_principal = true
    JOIN ciudades c ON c.id = ns.ciudad_id
    JOIN regiones r ON r.id = c.region_id
    WHERE ${SUB_ACTIVO}
    GROUP BY r.nombre ORDER BY activos DESC
  `)).rows;

  const huerfanos = (await db.execute(sql`
    SELECT n.nombre,
      EXISTS(SELECT 1 FROM negocio_sucursales s WHERE s.negocio_id=n.id AND s.es_principal=true) AS tiene_matriz,
      (SELECT s.ciudad_id IS NOT NULL FROM negocio_sucursales s WHERE s.negocio_id=n.id AND s.es_principal=true LIMIT 1) AS matriz_con_ciudad,
      (SELECT c.region_id IS NOT NULL FROM negocio_sucursales s JOIN ciudades c ON c.id=s.ciudad_id WHERE s.negocio_id=n.id AND s.es_principal=true LIMIT 1) AS ciudad_con_region
    FROM negocios n
    WHERE ${SUB_ACTIVO}
      AND NOT EXISTS (SELECT 1 FROM negocio_sucursales s JOIN ciudades c ON c.id=s.ciudad_id WHERE s.negocio_id=n.id AND s.es_principal=true AND c.region_id IS NOT NULL)
  `)).rows;

  const ingTotal = (await db.execute(sql`SELECT COALESCE(SUM(ep.monto),0) AS m FROM eventos_pago ep WHERE ep.tipo IN ('cobro_exitoso','pago_manual') AND ${DESDE_12M}`)).rows[0];
  const ingHuerfanos = (await db.execute(sql`
    SELECT COALESCE(SUM(ep.monto),0) AS m FROM eventos_pago ep
    WHERE ep.tipo IN ('cobro_exitoso','pago_manual') AND ${DESDE_12M}
      AND ep.negocio_id IN (SELECT n.id FROM negocios n WHERE NOT EXISTS (SELECT 1 FROM negocio_sucursales s JOIN ciudades c ON c.id=s.ciudad_id WHERE s.negocio_id=n.id AND s.es_principal=true AND c.region_id IS NOT NULL))
  `)).rows[0];

  console.log('\n── Negocios activos ──');
  console.log('Total (toda la plataforma):', totalActivos.n);
  console.log('Por región:', porRegion);
  console.log(`Sin región deducible: ${huerfanos.length}`);
  huerfanos.forEach((h: Record<string, unknown>) => console.log('  •', h.nombre, '| matriz:', h.tiene_matriz, '| matriz_con_ciudad:', h.matriz_con_ciudad, '| ciudad_con_region:', h.ciudad_con_region));

  console.log('\n── Ingresos 12 meses ──');
  console.log('Total:', Number(ingTotal.m).toFixed(2));
  console.log('De negocios SIN región:', Number(ingHuerfanos.m).toFixed(2));
  console.log('(Total − sin región debería ≈ suma de regiones)\n');
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
