#!/usr/bin/env tsx
/**
 * Diagnóstico: avatares de usuarios que aparecen en interacciones
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('\n=== Usuarios con nombre Ana y su avatar_url ===\n');
  const r = await pool.query(`
    SELECT id, nombre, avatar_url
    FROM usuarios
    WHERE nombre ILIKE '%ana%'
    LIMIT 10
  `);
  console.table(r.rows);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
