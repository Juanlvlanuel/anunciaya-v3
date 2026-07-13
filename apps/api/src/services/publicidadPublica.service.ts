/**
 * publicidadPublica.service.ts
 * ============================
 * GET /api/publicidad?ciudadId= (público, sin auth) — anuncios VIGENTES que se muestran
 * en una ciudad, agrupados por carrusel, para la columna derecha de la app (solo desktop).
 *
 * "Vigente" = compra con estado='activa' y aún no expirada. Se incluye un anuncio si la
 * ciudad pedida está entre las que compró (publicidad_compra_ciudades). Solo expone lo
 * mínimo para pintar/ampliar la imagen (piezaId + imagenUrl); el clic solo agranda la imagen.
 *
 * Ubicación: apps/api/src/services/publicidadPublica.service.ts
 */

import { and, eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { publicidadPiezas, publicidadCompras } from '../db/schemas/schema.js';
import { eliminarArchivo } from './r2.service.js';

export interface AnuncioPublico {
    piezaId: string;
    imagenUrl: string;
}

export interface PublicidadPublica {
    anuncios: AnuncioPublico[];
    patrocinadores: AnuncioPublico[];
    fundadores: AnuncioPublico[];
    /** ISO del expira_at más próximo entre lo que se muestra (o null). El cliente arma con esto un
     *  timer para quitar la pieza al instante justo cuando venza, sin recargar ni sondear. Los
     *  fundadores no vencen → no cuentan. */
    proximaExpiracion: string | null;
}

const VACIO: PublicidadPublica = { anuncios: [], patrocinadores: [], fundadores: [], proximaExpiracion: null };

export async function listarPublicidadPublica(ciudadId: string): Promise<PublicidadPublica> {
    if (!ciudadId) return VACIO;

    // Anuncios + Patrocinadores: piezas PAGADAS vigentes que se muestran en la ciudad.
    // ('fundadores' ya no se vende → se arma aparte desde los negocios marcados como regalo.)
    const filas = await db
        .select({
            piezaId: publicidadPiezas.id,
            carrusel: publicidadPiezas.carrusel,
            imagenUrl: publicidadPiezas.imagenUrl,
            expiraAt: publicidadCompras.expiraAt,
        })
        .from(publicidadPiezas)
        .innerJoin(publicidadCompras, eq(publicidadCompras.id, publicidadPiezas.compraId))
        .where(
            and(
                eq(publicidadCompras.estado, 'activa'),
                sql`${publicidadCompras.expiraAt} > now()`,
                sql`${publicidadCompras.renovacionDe} IS NULL`, // las filas de renovación NO son anuncios
                sql`${publicidadPiezas.carrusel} IN ('anuncios', 'patrocinadores')`,
                sql`EXISTS (SELECT 1 FROM publicidad_compra_ciudades pcc WHERE pcc.compra_id = ${publicidadCompras.id} AND pcc.ciudad_id = ${ciudadId})`,
            ),
        )
        .orderBy(sql`${publicidadPiezas.prioridad} DESC`, sql`${publicidadCompras.createdAt} DESC`);

    const out: PublicidadPublica = { anuncios: [], patrocinadores: [], fundadores: [], proximaExpiracion: null };
    let proxima: string | null = null;
    for (const f of filas) {
        const item: AnuncioPublico = { piezaId: f.piezaId, imagenUrl: f.imagenUrl };
        if (f.carrusel === 'anuncios') out.anuncios.push(item);
        else if (f.carrusel === 'patrocinadores') out.patrocinadores.push(item);
        // El más próximo a vencer entre lo mostrado → el cliente lo quita al instante al vencer.
        if (f.expiraAt && (!proxima || new Date(f.expiraAt) < new Date(proxima))) proxima = f.expiraAt;
    }
    out.proximaExpiracion = proxima;

    // Fundadores: REGALO a los negocios marcados de la ciudad (logo del negocio, por su sucursal principal).
    const fund = (await db.execute(sql`
        SELECT n.id::text AS pieza_id, n.logo_url AS imagen_url
        FROM negocios n
        JOIN negocio_sucursales ns ON ns.negocio_id = n.id AND ns.es_principal = true
        WHERE n.es_fundador = true AND n.activo = true AND n.logo_url IS NOT NULL AND ns.ciudad_id = ${ciudadId}
        ORDER BY n.created_at ASC
    `)).rows as Array<{ pieza_id: string; imagen_url: string }>;
    out.fundadores = fund.map((r) => ({ piezaId: r.pieza_id, imagenUrl: r.imagen_url }));

    return out;
}

/** Incrementa el contador de clics (el "ver grande") de una pieza. Best-effort. */
export async function registrarClickPieza(piezaId: string): Promise<void> {
    if (!piezaId) return;
    await db.execute(sql`UPDATE publicidad_piezas SET clicks = clicks + 1 WHERE id = ${piezaId}::uuid`);
}

/**
 * Borra de R2 las imágenes que un anunciante subió pero NO llegó a guardar (canceló el alta/wizard, o
 * reemplazó una creatividad por otra). Best-effort y SEGURO:
 *   - solo toca la carpeta `publicidad/` del bucket (nunca otras carpetas), y
 *   - solo borra una URL si NINGUNA pieza la usa (reference count) → una imagen ya ligada a un anuncio
 *     jamás se elimina, aunque el front la mande por error.
 * Así, al cerrar el modal el front manda todas las que subió en la sesión y el backend conserva las que
 * quedaron guardadas y limpia las sueltas. No lanza.
 */
export async function descartarImagenesHuerfanas(urls: string[]): Promise<{ borradas: number }> {
    if (!Array.isArray(urls)) return { borradas: 0 };
    let borradas = 0;
    for (const url of urls.slice(0, 12)) {
        try {
            if (typeof url !== 'string' || !url) continue;
            // Key relativa al bucket (la parte tras el dominio público).
            let key: string;
            try {
                key = new URL(url).pathname.replace(/^\/+/, '');
            } catch {
                continue;
            }
            if (!key.startsWith('publicidad/')) continue; // solo nuestra carpeta

            // ¿Alguna pieza la referencia? Si sí, está en uso → no tocar.
            const [{ usada }] = (await db.execute(sql`
                SELECT EXISTS(SELECT 1 FROM publicidad_piezas WHERE imagen_url = ${url}) AS usada
            `)).rows as Array<{ usada: boolean }>;
            if (usada) continue;

            const r = await eliminarArchivo(url);
            if (r.success) borradas++;
        } catch {
            /* best-effort: una falla no detiene al resto */
        }
    }
    return { borradas };
}
