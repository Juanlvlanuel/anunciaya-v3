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

/** Una marca de un vendedor, vista por el gerente/super (solo lectura). */
export interface MarcaEquipo {
    id: string;
    lat: number;
    lng: number;
    tipo: string;
    nota: string | null;
    vendedorNombre: string | null;
    negocioNombre: string | null;
    createdAt: string | null;
}

/**
 * Marcas de los VENDEDORES, para que gerente/super las vean (solo lectura). Como una marca no
 * guarda ciudad de forma fiable, se liga al vendedor por su ZONA: "marcas de la ciudad X" = marcas
 * de los vendedores con zona asignada en X. Alcance: super = todas (o de la ciudad) · gerente = las
 * de vendedores con zona en su región (o en la ciudad indicada, que ya es de su región).
 */
export async function listarMarcasEquipo(panel: UsuarioPanel, ciudadId?: string): Promise<MarcaEquipo[]> {
    if (panel.rolEquipo === 'vendedor') return [];
    if (panel.rolEquipo === 'gerente' && !panel.regionId) return [];

    // Sub-filtro: embajadores con zona en el alcance (ciudad y/o región).
    const condZona: SQL[] = [sql`tz.embajador_id IS NOT NULL`];
    if (ciudadId) condZona.push(sql`tz.ciudad_id = ${ciudadId}`);
    if (panel.rolEquipo === 'gerente') condZona.push(sql`c.region_id = ${panel.regionId}`);

    // Super + "todas las ciudades" → todas las marcas; en otro caso, acota por los embajadores en alcance.
    const filtroEmbajador =
        panel.rolEquipo === 'superadmin' && !ciudadId
            ? sql``
            : sql`WHERE m.embajador_id IN (
                SELECT DISTINCT tz.embajador_id FROM territorio_zonas tz
                JOIN ciudades c ON c.id = tz.ciudad_id
                WHERE ${sql.join(condZona, sql` AND `)}
            )`;

    const filas = (await db.execute(sql`
        SELECT m.id::text AS id, m.lat AS lat, m.lng AS lng, m.tipo AS tipo, m.nota AS nota,
               m.created_at AS created_at, u.nombre AS vendedor_nombre, n.nombre AS negocio_nombre
        FROM territorio_marcas m
        JOIN embajadores e ON e.id = m.embajador_id
        LEFT JOIN usuarios u ON u.id = e.usuario_id
        LEFT JOIN negocios n ON n.id = m.negocio_id
        ${filtroEmbajador}
        ORDER BY m.created_at DESC
    `)).rows as Array<{ id: string; lat: string | number; lng: string | number; tipo: string; nota: string | null; created_at: string | null; vendedor_nombre: string | null; negocio_nombre: string | null }>;

    return filas.map((f) => ({
        id: f.id,
        lat: Number(f.lat),
        lng: Number(f.lng),
        tipo: f.tipo,
        nota: f.nota,
        vendedorNombre: f.vendedor_nombre,
        negocioNombre: f.negocio_nombre,
        createdAt: f.created_at,
    }));
}

/** Un negocio real de la app, para pintarlo en el mapa de territorios. */
export interface NegocioMapa {
    id: string;
    nombre: string;
    lat: number;
    lng: number;
    estado: string;             // efectivo: al_corriente / en_gracia / suspendido / cancelado
    embajadorId: string | null; // null = sin vendedor (auto-registrado)
    vendedorNombre: string | null;
}

/**
 * Negocios reales (con su ubicación de sucursal principal) para el mapa de Territorios. Alcance:
 *   - vendedor → SOLO sus negocios (`embajador_id` = su embajador).
 *   - gerente  → todos los de su región (con y sin vendedor) — el gerente decide a quién asignar.
 *   - super    → todos (o los de la ciudad indicada).
 * La ubicación sale de `negocio_sucursales.ubicacion` (geography Point) vía ST_Y/ST_X; las sucursales
 * sin ubicación capturada se omiten.
 */
export async function listarNegociosMapa(panel: UsuarioPanel, ciudadId?: string): Promise<NegocioMapa[]> {
    if (panel.rolEquipo === 'gerente' && !panel.regionId) return [];
    if (panel.rolEquipo === 'vendedor' && !panel.usuarioId) return [];

    const cond: SQL[] = [sql`s.ubicacion IS NOT NULL`];
    if (ciudadId) cond.push(sql`s.ciudad_id = ${ciudadId}`);
    if (panel.rolEquipo === 'gerente') {
        cond.push(sql`EXISTS (SELECT 1 FROM ciudades c WHERE c.id = s.ciudad_id AND c.region_id = ${panel.regionId})`);
    } else if (panel.rolEquipo === 'vendedor') {
        cond.push(sql`n.embajador_id IN (SELECT id FROM embajadores WHERE usuario_id = ${panel.usuarioId})`);
    }

    const filas = (await db.execute(sql`
        SELECT n.id::text AS id, n.nombre AS nombre,
               ST_Y(s.ubicacion::geometry) AS lat, ST_X(s.ubicacion::geometry) AS lng,
               CASE WHEN n.estado_admin = 'archivado' THEN 'cancelado'
                    WHEN n.estado_admin = 'suspendido' THEN 'suspendido'
                    ELSE n.estado_membresia END AS estado,
               n.embajador_id::text AS embajador_id,
               u.nombre AS vendedor_nombre
        FROM negocios n
        JOIN negocio_sucursales s ON s.negocio_id = n.id AND s.es_principal = true
        LEFT JOIN embajadores e ON e.id = n.embajador_id
        LEFT JOIN usuarios u ON u.id = e.usuario_id
        WHERE ${sql.join(cond, sql` AND `)}
        ORDER BY n.nombre
    `)).rows as Array<{ id: string; nombre: string; lat: string | number; lng: string | number; estado: string; embajador_id: string | null; vendedor_nombre: string | null }>;

    return filas.map((f) => ({
        id: f.id,
        nombre: f.nombre,
        lat: Number(f.lat),
        lng: Number(f.lng),
        estado: f.estado,
        embajadorId: f.embajador_id,
        vendedorNombre: f.vendedor_nombre,
    }));
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
