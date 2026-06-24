/**
 * admin/territorios.service.ts
 * ============================
 * Lecturas del módulo Territorios del Panel Admin (sección nueva en "Red de ventas").
 *
 * G.1 · Zonas: las particiones del mapa que el gerente/super dibuja y asigna a vendedores.
 * Esta es la capa de LECTURA (Fase 1 · VER): listar las zonas con su ciudad y su vendedor
 * asignado, acotadas por el rol. Las acciones (crear/editar/asignar/borrar) viven en
 * `territorios-acciones.service.ts` (Fase 2).
 *
 * Alcance por rol (calcado de `vendedores.service.ts`):
 *   - superadmin → todas las zonas (sin condición).
 *   - gerente    → zonas cuya ciudad cae en su región (`ciudades.region_id = panel.regionId`).
 *   - vendedor   → solo SUS zonas (la del embajador ligado a su usuario) — "su pedazo asignado".
 *
 * Ubicación: apps/api/src/services/admin/territorios.service.ts
 */

import { and, asc, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { territorioZonas, ciudades, embajadores, usuarios } from '../../db/schemas/schema.js';
import type { UsuarioPanel } from '../../middleware/panel.middleware.js';

export interface PoligonoGeoJSON {
    type: 'Polygon';
    coordinates: number[][][];
}

export interface ZonaTerritorio {
    id: string;
    ciudadId: string;
    ciudadNombre: string | null;
    embajadorId: string | null;       // null = zona sin asignar
    vendedorNombre: string | null;    // nombre del vendedor asignado (si hay)
    nombre: string;
    poligono: PoligonoGeoJSON;
    color: string | null;
    createdAt: string | null;
}

export interface FiltrosZonas {
    ciudadId?: string;
}

/**
 * Condición de alcance (WHERE) por rol, o `'vacio'` si el rol no puede ver nada
 * (gerente sin región / vendedor sin usuario). Superadmin → null (ve todo).
 */
function condicionAlcance(panel: UsuarioPanel): SQL | null | 'vacio' {
    if (panel.rolEquipo === 'superadmin') return null;

    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return 'vacio';
        // La zona pertenece a una ciudad de su región.
        return sql`EXISTS (
            SELECT 1 FROM ciudades c
            WHERE c.id = ${territorioZonas.ciudadId} AND c.region_id = ${panel.regionId}
        )`;
    }

    if (panel.rolEquipo === 'vendedor') {
        if (!panel.usuarioId) return 'vacio';
        // Solo las zonas asignadas a SU embajador (su pedazo).
        return sql`${territorioZonas.embajadorId} IN (
            SELECT id FROM embajadores WHERE usuario_id = ${panel.usuarioId}
        )`;
    }

    return 'vacio';
}

/**
 * Lista las zonas visibles para el rol, opcionalmente filtradas por ciudad. Trae el
 * nombre de la ciudad y el del vendedor asignado (leftJoin → null si sin asignar).
 */
export async function listarZonas(panel: UsuarioPanel, filtros: FiltrosZonas = {}): Promise<ZonaTerritorio[]> {
    const alcance = condicionAlcance(panel);
    if (alcance === 'vacio') return [];

    const cond: SQL[] = [];
    if (alcance) cond.push(alcance);
    if (filtros.ciudadId) cond.push(eq(territorioZonas.ciudadId, filtros.ciudadId));

    const filas = await db
        .select({
            id: territorioZonas.id,
            ciudadId: territorioZonas.ciudadId,
            ciudadNombre: ciudades.nombre,
            embajadorId: territorioZonas.embajadorId,
            vendedorNombre: usuarios.nombre,
            nombre: territorioZonas.nombre,
            poligono: territorioZonas.poligono,
            color: territorioZonas.color,
            createdAt: territorioZonas.createdAt,
        })
        .from(territorioZonas)
        .leftJoin(ciudades, eq(ciudades.id, territorioZonas.ciudadId))
        .leftJoin(embajadores, eq(embajadores.id, territorioZonas.embajadorId))
        .leftJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
        .where(cond.length ? and(...cond) : undefined)
        .orderBy(asc(territorioZonas.nombre));

    return filas as ZonaTerritorio[];
}

/** Ciudades sobre las que el rol puede dibujar zonas (super = todas activas · gerente = las de su región). */
export async function listarCiudadesDelAlcance(panel: UsuarioPanel): Promise<Array<{ id: string; nombre: string; lat: number | null; lng: number | null }>> {
    if (panel.rolEquipo === 'superadmin') {
        return db
            .select({ id: ciudades.id, nombre: ciudades.nombre, lat: ciudades.lat, lng: ciudades.lng })
            .from(ciudades)
            .where(eq(ciudades.activa, true))
            .orderBy(asc(ciudades.nombre));
    }
    if (panel.rolEquipo === 'gerente') {
        if (!panel.regionId) return [];
        return db
            .select({ id: ciudades.id, nombre: ciudades.nombre, lat: ciudades.lat, lng: ciudades.lng })
            .from(ciudades)
            .where(and(eq(ciudades.activa, true), eq(ciudades.regionId, panel.regionId)))
            .orderBy(asc(ciudades.nombre));
    }
    return [];
}

/** Vendedores asignables a una zona según el rol (super = todos activos · gerente = los de su región). */
export async function listarVendedoresAsignables(panel: UsuarioPanel): Promise<Array<{ embajadorId: string; nombre: string | null }>> {
    if (panel.rolEquipo === 'vendedor') return [];

    if (panel.rolEquipo === 'superadmin') {
        return db
            .select({ embajadorId: embajadores.id, nombre: usuarios.nombre })
            .from(embajadores)
            .leftJoin(usuarios, eq(usuarios.id, embajadores.usuarioId))
            .where(eq(embajadores.estado, 'activo'))
            .orderBy(asc(usuarios.nombre));
    }

    // gerente: vendedores con al menos una ciudad de su región.
    if (!panel.regionId) return [];
    const filas = (await db.execute(sql`
        SELECT DISTINCT e.id::text AS embajador_id, u.nombre AS nombre
        FROM embajadores e
        JOIN usuarios u ON u.id = e.usuario_id
        JOIN embajador_ciudades ec ON ec.embajador_id = e.id
        JOIN ciudades c ON c.id = ec.ciudad_id
        WHERE e.estado = 'activo' AND c.region_id = ${panel.regionId}
        ORDER BY u.nombre
    `)).rows as Array<{ embajador_id: string; nombre: string | null }>;
    return filas.map((f) => ({ embajadorId: f.embajador_id, nombre: f.nombre }));
}
