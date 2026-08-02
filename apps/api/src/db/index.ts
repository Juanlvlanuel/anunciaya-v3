import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as Sentry from '@sentry/node';
import { getDatabaseUrl } from '../config/env.js';
import * as schema from './schemas/schema.js';

const { Pool } = pg;

// Pool de conexiones a PostgreSQL — vía transaction pooler de Supabase (puerto 6543).
//
// `max` se subió de 5 a 10 el 1-ago-2026: con 5, una sola página que dispara varias
// queries en paralelo (dashboard, notificaciones, chat, sucursales…) ya podía saturar
// el pool con un solo usuario navegando — sin contar múltiples pestañas/dispositivos.
// Cuando el pool se saturaba, las peticiones en cola esperaban hasta `connectionTimeoutMillis`
// (20s) por una conexión libre, pero el frontend (`api.ts`) solo esperaba 10s — timeouts
// "falsos" en TODA la app (cualquier endpoint que tocara BD), sin relación con la sesión del
// usuario. Ver docs/estandares/LECCIONES_TECNICAS.md.
const pool = new Pool({
  connectionString: getDatabaseUrl(),
  max: 10,                          // máx. conexiones por proceso
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

// ============================================================================
// DIAGNÓSTICO DE SATURACIÓN DEL POOL
// ============================================================================
// Antes de esto no había NINGUNA visibilidad de cuántas conexiones estaban
// ocupadas/en espera — un incidente de saturación solo se veía por sus síntomas
// (timeouts en el frontend, sin evidencia del lado del servidor). Este chequeo
// deja rastro real: si hay queries esperando una conexión libre, se loguea (y en
// producción se manda a Sentry) con el estado del pool en ese momento.
let ultimaAlertaSaturacion = 0;
const INTERVALO_CHEQUEO_MS = 5_000;
const COOLDOWN_ALERTA_MS = 60_000; // no más de 1 alerta a Sentry por minuto

setInterval(() => {
  if (pool.waitingCount === 0) return;

  const estado = {
    total: pool.totalCount,
    libres: pool.idleCount,
    enEspera: pool.waitingCount,
    max: 10,
  };
  console.warn('⚠️  Pool de PostgreSQL saturado — peticiones esperando conexión libre:', estado);

  const ahora = Date.now();
  if (ahora - ultimaAlertaSaturacion > COOLDOWN_ALERTA_MS) {
    ultimaAlertaSaturacion = ahora;
    // No-op si Sentry no está inicializado (dev/sin DSN) — seguro llamarlo siempre.
    Sentry.captureMessage('Pool de PostgreSQL saturado', {
      level: 'warning',
      extra: estado,
    });
  }
}, INTERVALO_CHEQUEO_MS);

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