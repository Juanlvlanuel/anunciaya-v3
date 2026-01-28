import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getDatabaseUrl } from '../config/env.js';
import * as schema from './schemas/schema.js';

const { Pool } = pg;

// Pool de conexiones a PostgreSQL
// ✨ ACTUALIZADO: Usa getDatabaseUrl() para cambiar entre local/producción
// Controla el ambiente desde .env con DB_ENVIRONMENT=local o production
const pool = new Pool({
  connectionString: getDatabaseUrl(),
});

// Verificar conexión al iniciar
pool.on('connect', () => {
  const ambiente = process.env.DB_ENVIRONMENT || 'local';
  console.log(`✅ Conectado a PostgreSQL [${ambiente.toUpperCase()}]`);
});

pool.on('error', (err) => {
  console.error('❌ Error en pool de PostgreSQL:', err);
});

// Instancia de Drizzle con todos los schemas
// ✨ Conversión automática snake_case (BD) ↔️ camelCase (código)
export const db = drizzle(pool, { 
  schema,
  casing: 'snake_case'
});

// Exportar pool por si se necesita acceso directo
export { pool };