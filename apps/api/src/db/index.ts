import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getDatabaseUrl } from '../config/env.js';
import * as schema from './schemas/schema.js';

const { Pool } = pg;

// Pool de conexiones a PostgreSQL
const pool = new Pool({
  connectionString: getDatabaseUrl(),
});

// Bandera para mostrar mensaje solo una vez
let conexionMostrada = false;

pool.on('connect', () => {
  if (!conexionMostrada) {
    const ambiente = process.env.DB_ENVIRONMENT || 'local';
    console.log(`✅ Conectado a PostgreSQL [${ambiente.toUpperCase()}]`);
    conexionMostrada = true;
  }
});

pool.on('error', (err) => {
  console.error('❌ Error en pool de PostgreSQL:', err);
});

// Instancia de Drizzle con todos los schemas
export const db = drizzle(pool, { 
  schema,
  casing: 'snake_case'
});

export { pool };