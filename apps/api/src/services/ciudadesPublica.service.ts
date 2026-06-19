/**
 * ciudadesPublica.service.ts
 * ==========================
 * Lectura PÚBLICA (sin auth) del catálogo de ciudades ACTIVAS para el selector de
 * ubicación de la app (header, onboarding, sucursales…). Reemplaza el array
 * hardcodeado `ciudadesPopulares`: ahora lo que el SuperAdmin habilita en el Panel
 * (módulo Ciudades) aparece en la app sin redeploy.
 *
 * Forma compatible con la `interface Ciudad` del front (nombre/estado/coordenadas/
 * alias/importancia) + `id` y `slug` para guardar la FK `ciudad_id` al seleccionar.
 *
 * Ubicación: apps/api/src/services/ciudadesPublica.service.ts
 */

import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { ciudades } from '../db/schemas/schema.js';

export interface CiudadPublica {
    id: string;
    nombre: string;
    estado: string;
    slug: string;
    coordenadas: { lat: number | null; lng: number | null };
    alias: string[];
    importancia: number;
}

/** Ciudades activas, ordenadas por importancia (luego nombre) — como el buscador del front. */
export async function listarCiudadesPublicas(): Promise<CiudadPublica[]> {
    const filas = await db
        .select({
            id: ciudades.id,
            nombre: ciudades.nombre,
            estado: ciudades.estado,
            slug: ciudades.slug,
            lat: ciudades.lat,
            lng: ciudades.lng,
            alias: ciudades.alias,
            importancia: ciudades.importancia,
        })
        .from(ciudades)
        .where(eq(ciudades.activa, true))
        .orderBy(desc(ciudades.importancia), asc(ciudades.nombre));

    return filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        estado: f.estado,
        slug: f.slug,
        coordenadas: { lat: f.lat, lng: f.lng },
        alias: f.alias ?? [],
        importancia: f.importancia,
    }));
}
