/**
 * configuracion.service.ts
 * ========================
 * Helper central para leer la tabla global `configuracionSistema` (clave-valor).
 *
 * Antes esta tabla estaba poblada pero NADIE la leía (decorativa). Este helper
 * la conecta: lee por clave, castea según el tipo esperado y cachea en memoria
 * con TTL para no golpear la BD en cada consulta.
 *
 * Patrón de cache calcado de `coyo/categoriasCatalogo.service.ts` (variables
 * module-level + TTL + fallback graceful).
 *
 * El valor por defecto se pasa en CADA llamada (2º argumento): si la clave no
 * existe o el valor viene mal, se devuelve ese default — nunca truena.
 *
 * Ubicación: apps/api/src/services/configuracion.service.ts
 */

import { db } from '../db/index.js';
import { configuracionSistema } from '../db/schemas/schema.js';
import { eq } from 'drizzle-orm';

// =============================================================================
// CACHE EN MEMORIA (module-level, TTL 5 min)
// =============================================================================

interface EntradaCache {
    valor: string; // valor crudo (text) tal cual está en la BD
    tipo: string;  // 'numero' | 'texto' | 'booleano' | 'json'
    expiraEn: number;
}

const cache = new Map<string, EntradaCache>();
const TTL_MS = 5 * 60 * 1000; // 5 minutos

/** Limpia el cache (útil para tests o tras cambiar configs desde el Panel). */
export function resetearCacheConfig(): void {
    cache.clear();
}

/**
 * Lee la fila cruda de una clave (con cache). Devuelve null si no existe.
 * Fallback graceful: si la query falla, reutiliza el cache vencido si lo hay.
 */
async function leerConfigCruda(clave: string): Promise<{ valor: string; tipo: string } | null> {
    const ahora = Date.now();
    const cacheado = cache.get(clave);
    if (cacheado && cacheado.expiraEn > ahora) {
        return { valor: cacheado.valor, tipo: cacheado.tipo };
    }

    try {
        const [fila] = await db
            .select({ valor: configuracionSistema.valor, tipo: configuracionSistema.tipo })
            .from(configuracionSistema)
            .where(eq(configuracionSistema.clave, clave))
            .limit(1);

        if (!fila) return null;

        cache.set(clave, { valor: fila.valor, tipo: fila.tipo, expiraEn: ahora + TTL_MS });
        return { valor: fila.valor, tipo: fila.tipo };
    } catch (error) {
        console.error(`[Config] Error leyendo '${clave}':`, error);
        // Fallback graceful: usa el cache vencido si existe; si no, null.
        return cacheado ? { valor: cacheado.valor, tipo: cacheado.tipo } : null;
    }
}

// =============================================================================
// LECTORES TIPADOS
// =============================================================================

/** Lee una config numérica. Devuelve `porDefecto` si no existe o no es un número válido. */
export async function obtenerConfigNumero(clave: string, porDefecto: number): Promise<number> {
    const fila = await leerConfigCruda(clave);
    if (!fila) return porDefecto;
    const n = Number(fila.valor);
    return Number.isFinite(n) ? n : porDefecto;
}

/** Lee una config de texto. Devuelve `porDefecto` si no existe. */
export async function obtenerConfigTexto(clave: string, porDefecto: string): Promise<string> {
    const fila = await leerConfigCruda(clave);
    if (!fila) return porDefecto;
    return fila.valor;
}

/** Lee una config booleana ('true'/'1' = true, 'false'/'0' = false). `porDefecto` si no existe o ambigua. */
export async function obtenerConfigBooleano(clave: string, porDefecto: boolean): Promise<boolean> {
    const fila = await leerConfigCruda(clave);
    if (!fila) return porDefecto;
    const v = fila.valor.trim().toLowerCase();
    if (v === 'true' || v === '1') return true;
    if (v === 'false' || v === '0') return false;
    return porDefecto;
}
