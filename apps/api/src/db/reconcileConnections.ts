/**
 * reconcileConnections.ts
 * ========================
 * Conexiones secundarias a BD que usa exclusivamente el reconcile de R2.
 *
 * Problema que resuelve: el bucket R2 es compartido entre ambientes (desarrollo
 * y producción usan las mismas credenciales `R2_BUCKET_NAME`, `R2_PUBLIC_URL`).
 * Si el reconcile se ejecuta consultando solo UNA BD, puede considerar huérfanos
 * archivos que la OTRA BD sí usa — y al borrarlos rompe ese ambiente.
 *
 * Solución: al listar "URLs en uso", consultar TODAS las BDs disponibles y unir
 * los resultados. Solo los archivos que NINGUNA BD referencia son huérfanos
 * seguros de borrar.
 *
 * Comportamiento:
 *  - En local (`DB_ENVIRONMENT=local`) con `DATABASE_URL_PRODUCTION` configurada:
 *    → consulta ambas BDs (local + producción). El cleanup es seguro para ambos.
 *  - En producción (`isProduction=true`): solo consulta la BD principal.
 *    La BD local del desarrollador no es accesible desde internet.
 *  - Si alguna conexión falla, se omite con warning y continúa con las demás.
 *
 * ⚠️ IMPORTANTE: estas conexiones son READ-ONLY para el reconcile. Nunca usar
 * para escribir — las escrituras van siempre al `db` principal (`./index.ts`).
 *
 * Ubicación: apps/api/src/db/reconcileConnections.ts
 */

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.js';
import * as schema from './schemas/schema.js';
import { db as dbPrincipal } from './index.js';

const { Pool } = pg;

export interface ReconcileConnection {
    etiqueta: string;
    db: NodePgDatabase<typeof schema>;
}

// Pool secundario — se crea una sola vez (lazy) y se reutiliza
let poolSecundario: pg.Pool | null = null;
let dbSecundaria: NodePgDatabase<typeof schema> | null = null;
let intentoConexionSecundariaFallido = false;

function _obtenerUrlSecundaria(): string | null {
    // Determinar qué URL usar como secundaria según el ambiente actual.
    const isProduction = process.env.NODE_ENV === 'production';
    const dbEnv = env.DB_ENVIRONMENT;

    if (isProduction) {
        // En producción (Render) la BD local del dev no es accesible — no hay secundaria
        return null;
    }

    if (dbEnv === 'local') {
        // Ambiente local con producción accesible via URL remota
        return env.DATABASE_URL_PRODUCTION ?? null;
    }

    if (dbEnv === 'production') {
        // Dev conectado a prod como principal — secundaria sería local
        return env.DATABASE_URL;
    }

    return null;
}

function _inicializarConexionSecundaria(): void {
    if (dbSecundaria !== null || intentoConexionSecundariaFallido) return;

    const url = _obtenerUrlSecundaria();
    if (!url) {
        intentoConexionSecundariaFallido = true;
        return;
    }

    try {
        poolSecundario = new Pool({ connectionString: url });
        poolSecundario.on('error', (err) => {
            console.warn('[reconcile] Pool secundario error:', err.message);
        });
        dbSecundaria = drizzle(poolSecundario, { schema, casing: 'snake_case' });
        console.log('[reconcile] Conexión secundaria inicializada para consultas cross-ambiente');
    } catch (error) {
        console.warn('[reconcile] No se pudo inicializar conexión secundaria:', error);
        intentoConexionSecundariaFallido = true;
    }
}

/**
 * Retorna todas las conexiones que el reconcile debe consultar al listar
 * "URLs en uso". Siempre incluye la principal; suma la secundaria si está
 * disponible y no ha fallado.
 */
export function obtenerConexionesReconcile(): ReconcileConnection[] {
    _inicializarConexionSecundaria();

    const ambientePrincipal = env.DB_ENVIRONMENT === 'production' ? 'production' : 'local';
    const conexiones: ReconcileConnection[] = [
        { etiqueta: ambientePrincipal, db: dbPrincipal },
    ];

    if (dbSecundaria) {
        const ambienteSecundario = ambientePrincipal === 'production' ? 'local' : 'production';
        conexiones.push({ etiqueta: ambienteSecundario, db: dbSecundaria });
    }

    return conexiones;
}
