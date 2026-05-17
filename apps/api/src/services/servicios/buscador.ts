/**
 * buscador.ts (Servicios)
 * ========================
 * Sugerencias en vivo del buscador de Servicios.
 *
 * Mismo patrón sobrio que `services/ofertas/buscador.ts`:
 *  - ILIKE simple sobre título + descripción + skills + requisitos.
 *  - Sin tabla de log, sin populares, sin Redis (dataset chico por ciudad).
 *  - Sin FTS — el volumen piloto en Peñasco es ~decenas, no miles.
 *
 * Visibilidad: replica los mismos filtros del feed (`obtenerFeed` /
 * `obtenerFeedInfinito`) para que las sugerencias NO incluyan publicaciones
 * pausadas, eliminadas, o de otras ciudades.
 *
 * Doc maestro: docs/estandares/PATRON_BUSCADOR_SECCION.md.
 *
 * Ubicación: apps/api/src/services/servicios/buscador.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import type { PrecioInput } from '../../validations/servicios.schema.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface SugerenciaServicioRow {
    publicacionId: string;
    titulo: string;
    fotos: string[];
    fotoPortadaIndex: number;
    precio: PrecioInput;
    modalidad: string;
    modo: string;
    tipo: string;
    ciudad: string;
    oferenteNombre: string;
    oferenteApellidos: string;
    oferenteAvatarUrl: string | null;
}

// =============================================================================
// SUGERENCIAS EN VIVO
// =============================================================================

/**
 * Devuelve top 5 publicaciones activas en la ciudad cuyo título, descripción,
 * skills o requisitos matchea el query del usuario (ILIKE substring,
 * accent-insensitive con `unaccent()`).
 *
 * El caller decide el debounce (300ms en el FE).
 *
 * Filtros heredados del feed:
 *  - estado='activa'
 *  - deleted_at IS NULL
 *  - dentro de la ciudad indicada
 */
export async function obtenerSugerenciasServicios(
    queryTexto: string,
    ciudad: string,
): Promise<{ success: true; data: SugerenciaServicioRow[] }> {
    const q = queryTexto.trim();
    if (q.length < 2) return { success: true, data: [] };
    if (!ciudad) return { success: true, data: [] };

    try {
        const patron = `%${q}%`;

        type Raw = {
            publicacion_id: string;
            titulo: string;
            fotos: string[] | null;
            foto_portada_index: number;
            precio: PrecioInput;
            modalidad: string;
            modo: string;
            tipo: string;
            ciudad: string;
            oferente_nombre: string;
            oferente_apellidos: string;
            oferente_avatar_url: string | null;
        };

        const resultado = await db.execute(sql`
            SELECT
                sp.id                  AS publicacion_id,
                sp.titulo              AS titulo,
                sp.fotos               AS fotos,
                sp.foto_portada_index  AS foto_portada_index,
                sp.precio              AS precio,
                sp.modalidad           AS modalidad,
                sp.modo                AS modo,
                sp.tipo                AS tipo,
                sp.ciudad              AS ciudad,
                u.nombre               AS oferente_nombre,
                u.apellidos            AS oferente_apellidos,
                u.avatar_url           AS oferente_avatar_url
            FROM servicios_publicaciones sp
            INNER JOIN usuarios u ON u.id = sp.usuario_id
            WHERE sp.estado = 'activa'
              AND sp.deleted_at IS NULL
              AND sp.ciudad = ${ciudad}
              AND (
                  unaccent(sp.titulo) ILIKE unaccent(${patron})
                  OR unaccent(sp.descripcion) ILIKE unaccent(${patron})
                  -- Skills y requisitos viven como arrays text[]; usamos
                  -- EXISTS + unnest para que un término matchee cualquier
                  -- entrada del array (ej. "plomería" en skills).
                  OR EXISTS (
                      SELECT 1 FROM unnest(sp.skills) skill
                      WHERE unaccent(skill) ILIKE unaccent(${patron})
                  )
                  OR EXISTS (
                      SELECT 1 FROM unnest(sp.requisitos) req
                      WHERE unaccent(req) ILIKE unaccent(${patron})
                  )
              )
            ORDER BY sp.updated_at DESC
            LIMIT 5
        `);

        const items = (resultado.rows as Raw[]).map((r) => ({
            publicacionId: r.publicacion_id,
            titulo: r.titulo,
            fotos: r.fotos ?? [],
            fotoPortadaIndex: r.foto_portada_index,
            precio: r.precio,
            modalidad: r.modalidad,
            modo: r.modo,
            tipo: r.tipo,
            ciudad: r.ciudad,
            oferenteNombre: r.oferente_nombre,
            oferenteApellidos: r.oferente_apellidos,
            oferenteAvatarUrl: r.oferente_avatar_url,
        }));

        return { success: true, data: items };
    } catch (error) {
        console.error('Error en obtenerSugerenciasServicios:', error);
        return { success: true, data: [] };
    }
}
