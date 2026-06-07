/**
 * utils/ciudades.ts
 * =================
 * Resuelve el TEXTO de una ciudad (el que escribe el selector del frontend) al `id`
 * de la fila correspondiente en la tabla `ciudades`, por SLUG normalizado.
 *
 * El slug DEBE ser idéntico al que se sembró en `ciudades` (Paso 2, `seed-ciudades.ts`,
 * vía `normalizarTexto` del catálogo). Se replica aquí esa misma normalización en lugar
 * de importarla de `packages/shared` para no acoplar el bundle del backend a ese paquete
 * (ningún service del backend lo importa hoy). La función es estable.
 *
 * Ubicación: apps/api/src/utils/ciudades.ts
 */

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

/** Slug normalizado: minúsculas, sin acentos, sin caracteres especiales, espacios -> '-'.
 *  Idéntico a `normalizarTexto(x).replace(/\s+/g,'-')` del Paso 2/Paso 6. */
export function slugCiudad(texto: string): string {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '') // quitar acentos (marcas diacríticas tras NFD)
        .replace(/[^a-z0-9\s]/g, '')    // quitar caracteres especiales
        .trim()
        .replace(/\s+/g, '-');
}

/**
 * Devuelve el `ciudades.id` que corresponde al texto de ciudad, o null si:
 *   - el texto está vacío o es el placeholder 'Por configurar', o
 *   - no casa con ninguna ciudad del catálogo (la sucursal queda sin región deducible
 *     hasta que se corrija — comportamiento aceptado).
 */
export async function resolverCiudadId(ciudadTexto?: string | null): Promise<string | null> {
    const texto = ciudadTexto?.trim();
    if (!texto || texto === 'Por configurar') return null;

    const slug = slugCiudad(texto);
    const filas = (await db.execute(
        sql`SELECT id::text AS id FROM ciudades WHERE slug = ${slug} LIMIT 1`,
    )).rows as Array<{ id: string }>;

    if (!filas[0]) {
        console.warn(`[ciudades] Sin ciudad para texto "${texto}" (slug "${slug}") - ciudad_id queda null.`);
        return null;
    }
    return filas[0].id;
}
