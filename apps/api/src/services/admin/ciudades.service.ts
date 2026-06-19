/**
 * admin/ciudades.service.ts
 * =========================
 * Lecturas del módulo Ciudades del Panel Admin (catálogo de ciudades + regiones).
 *
 * Solo SuperAdmin (lo protege el gate global de routes/admin/index.ts). No hay
 * alcance por rol: el catálogo es estructura de plataforma, no se acota por región.
 *
 * Dos lecturas:
 *   1. listarCiudadesCatalogo — todas las ciudades con su región resuelta + filtros.
 *   2. listarRegionesConConteo — todas las regiones (activas e inactivas) con su # de ciudades.
 *
 * Las ACCIONES (crear/editar/activar/agrupar) viven en `ciudades-acciones.service.ts`.
 *
 * Ubicación: apps/api/src/services/admin/ciudades.service.ts
 */

import { and, asc, count, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { ciudades, regiones } from '../../db/schemas/schema.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface CiudadCatalogo {
    id: string;
    nombre: string;
    estado: string;
    pais: string;
    slug: string;
    lat: number | null;
    lng: number | null;
    alias: string[] | null;
    importancia: number;
    activa: boolean;
    regionId: string | null;
    regionNombre: string | null;
}

export interface RegionConConteo {
    id: string;
    nombre: string;
    activa: boolean;
    totalCiudades: number;
}

/** Filtro especial: ciudades sin región asignada. */
export const REGION_SIN = '__none';

/** Estado de actividad para filtrar la lista. */
export type FiltroActiva = 'todas' | 'activas' | 'inactivas';

export interface FiltrosCiudades {
    busqueda?: string;      // contra nombre/estado (ILIKE)
    regionId?: string;      // uuid | REGION_SIN | undefined (todas)
    estado?: string;        // estado exacto (ej. "Sonora")
    activa?: FiltroActiva;  // default 'todas'
}

// =============================================================================
// LECTURAS
// =============================================================================

/**
 * Catálogo completo de ciudades con su región resuelta (leftJoin) y filtros.
 * Orden por defecto: estado (A–Z) y, dentro de cada estado, nombre (A–Z) — para
 * gestionar el catálogo agrupado por estado. (El selector del front público usará
 * su propio orden por importancia cuando se conecte en la Fase 2 / Frente B.)
 */
export async function listarCiudadesCatalogo(filtros: FiltrosCiudades = {}): Promise<CiudadCatalogo[]> {
    const condiciones: SQL[] = [];

    const busqueda = filtros.busqueda?.trim();
    if (busqueda) {
        const patron = `%${busqueda}%`;
        condiciones.push(sql`(${ciudades.nombre} ILIKE ${patron} OR ${ciudades.estado} ILIKE ${patron})`);
    }

    if (filtros.regionId === REGION_SIN) {
        condiciones.push(isNull(ciudades.regionId));
    } else if (filtros.regionId) {
        condiciones.push(eq(ciudades.regionId, filtros.regionId));
    }

    const estado = filtros.estado?.trim();
    if (estado) condiciones.push(eq(ciudades.estado, estado));

    if (filtros.activa === 'activas') condiciones.push(eq(ciudades.activa, true));
    else if (filtros.activa === 'inactivas') condiciones.push(eq(ciudades.activa, false));

    return db
        .select({
            id: ciudades.id,
            nombre: ciudades.nombre,
            estado: ciudades.estado,
            pais: ciudades.pais,
            slug: ciudades.slug,
            lat: ciudades.lat,
            lng: ciudades.lng,
            alias: ciudades.alias,
            importancia: ciudades.importancia,
            activa: ciudades.activa,
            regionId: ciudades.regionId,
            regionNombre: regiones.nombre,
        })
        .from(ciudades)
        .leftJoin(regiones, eq(regiones.id, ciudades.regionId))
        .where(condiciones.length ? and(...condiciones) : undefined)
        .orderBy(asc(ciudades.estado), asc(ciudades.nombre));
}

/**
 * Todas las regiones (activas e inactivas) con cuántas ciudades agrupan. El
 * leftJoin + groupBy deja en 0 las regiones vacías. Ordenadas por nombre.
 *
 * Distinto de `regiones.service.ts → listarRegiones` (ese solo trae activas, sin
 * conteo, para el filtro global del Panel). Aquí se gestiona el catálogo completo.
 */
export async function listarRegionesConConteo(): Promise<RegionConConteo[]> {
    return db
        .select({
            id: regiones.id,
            nombre: regiones.nombre,
            activa: regiones.activa,
            totalCiudades: count(ciudades.id),
        })
        .from(regiones)
        .leftJoin(ciudades, eq(ciudades.regionId, regiones.id))
        .groupBy(regiones.id, regiones.nombre, regiones.activa)
        .orderBy(asc(regiones.nombre));
}
