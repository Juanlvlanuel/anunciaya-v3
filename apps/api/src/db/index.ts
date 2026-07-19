import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getDatabaseUrl } from '../config/env.js';
import * as schema from './schemas/schema.js';

const { Pool } = pg;

// Pool de conexiones a PostgreSQL — vía transaction pooler de Supabase (puerto 6543).
// Límites conservadores para no saturar el pooler: pocas conexiones por proceso +
// liberación de las inactivas. Así los reinicios del watcher (tsx) en dev no acumulan
// conexiones zombi.
const pool = new Pool({
  connectionString: getDatabaseUrl(),
  max: 5,                          // máx. conexiones por proceso (el default de pg es 10)
  idleTimeoutMillis: 30_000,       // cierra conexiones inactivas a los 30 s (evita reabrir
                                    // conexión nueva cada vez que varios crons disparan casi
                                    // juntos tras un rato de inactividad)
  connectionTimeoutMillis: 20_000, // Supabase Free + transaction pooler puede tardar más de
                                    // 10s en aceptar conexiones nuevas bajo ráfaga
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

// Cierre limpio del pool al apagar/reiniciar el proceso (incluido el restart del watcher
// `tsx` en dev): libera las conexiones en el pooler de Supabase para no dejar sesiones zombi
// que agoten el límite (session mode). Sin esto, un proceso muerto abruptamente deja
// conexiones colgadas hasta que el pooler las detecte (minutos).
let cerrandoPool = false;
async function cerrarPool(): Promise<void> {
  if (cerrandoPool) return;
  cerrandoPool = true;
  try {
    await pool.end();
  } catch {
    // ignorar errores al cerrar el pool
  }
}
process.once('SIGTERM', () => { void cerrarPool().finally(() => process.exit(0)); });
process.once('SIGINT', () => { void cerrarPool().finally(() => process.exit(0)); });