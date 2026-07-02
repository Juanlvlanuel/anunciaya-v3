/**
 * reconcileConnections.ts
 * ========================
 * Conexiones de BD que consulta el reconcile de R2 al listar "URLs en uso".
 *
 * HISTORIA: cuando dev y prod COMPARTÍAN un solo bucket R2, este módulo abría una
 * conexión secundaria (cross-ambiente) para consultar AMBAS BDs y así no borrar
 * archivos que solo existían en el otro ambiente.
 *
 * Desde la SEPARACIÓN de buckets (jul 2026) cada ambiente tiene el suyo
 * (dev=`anunciaya-tickets`, prod=`anunciaya-prod`), seleccionado por
 * `R2_BUCKET_NAME`/`R2_PUBLIC_URL`. Por lo tanto el reconcile de cada ambiente
 * consulta SOLO su propia BD: los objetos de su bucket únicamente pueden estar
 * referenciados por su propia BD. Ya no hay cruce entre ambientes.
 *
 * Se conserva la forma `obtenerConexionesReconcile()` (lista de conexiones) para
 * no tocar los consumidores (`listarUrlsEnUso` / `detectarReferenciasRotas`),
 * pero ahora siempre devuelve una sola: la del ambiente actual.
 *
 * ⚠️ Estas conexiones son READ-ONLY para el reconcile. Las escrituras van siempre
 * al `db` principal (`./index.ts`).
 *
 * Ubicación: apps/api/src/db/reconcileConnections.ts
 */

import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { env } from '../config/env.js';
import * as schema from './schemas/schema.js';
import { db as dbPrincipal } from './index.js';

export interface ReconcileConnection {
    etiqueta: string;
    db: NodePgDatabase<typeof schema>;
}

/**
 * Retorna la(s) conexión(es) que el reconcile debe consultar al listar "URLs en
 * uso". Tras la separación de buckets es únicamente la BD del ambiente actual.
 */
export function obtenerConexionesReconcile(): ReconcileConnection[] {
    const ambiente = env.DB_ENVIRONMENT === 'production' ? 'production' : 'local';
    return [{ etiqueta: ambiente, db: dbPrincipal }];
}
