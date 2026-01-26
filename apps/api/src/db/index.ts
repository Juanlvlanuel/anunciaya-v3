import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schemas/schema.js';

const { Pool } = pg;

// Pool de conexiones a PostgreSQL usando DATABASE_URL validada
const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

// Instancia de Drizzle con todos los schemas
// ✨ ACTUALIZADO: Agregada configuración de casing para conversión automática
export const db = drizzle(pool, { 
  schema,
  casing: 'snake_case'  // Convierte automáticamente snake_case (BD) ↔️ camelCase (código)
});

// Exportar pool por si se necesita acceso directo
export { pool };