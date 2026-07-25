/**
 * publicidad-imagen.service.ts
 * =============================
 * Cambiar la creatividad (imagen) y/o el encuadre de un anuncio ya ACTIVO, desde Mi Perfil, SIN pasar
 * por Renovar: no genera cobro, no toca vigencia ni ciudades, no permite agregar/quitar tamaños (eso
 * sigue siendo exclusivo de Renovar/Panel). Solo actualiza `imagen_url`/`pos_x`/`pos_y` de las piezas
 * que el anunciante ya tiene compradas.
 *
 * Ubicación: apps/api/src/services/publicidad-imagen.service.ts
 */

import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { CARRUSELES_VALIDOS, type CarruselPub } from './publicidad-precio.service.js';
import { notificarCambioPublicidad } from './publicidad-realtime.js';

export interface CambioImagenInput {
    cambios: Partial<Record<CarruselPub, { imagenUrl: string; posX: number; posY: number }>>;
}

export type ResultadoAccionPub =
    | { ok: true; estado: string }
    | { ok: false; status: number; mensaje: string };

/**
 * Actualiza imagen/encuadre de 1-2 piezas de un anuncio propio, activo. Valida propiedad, estado y que
 * los carruseles enviados ya existan en la compra (no agrega ni quita tamaños).
 */
export async function cambiarImagenAnuncio(usuarioId: string, compraId: string, input: CambioImagenInput): Promise<ResultadoAccionPub> {
    const [compra] = (await db.execute(sql`
        SELECT id::text AS id, usuario_id::text AS usuario_id, estado, renovacion_de::text AS renovacion_de
        FROM publicidad_compras WHERE id = ${compraId}::uuid LIMIT 1
    `)).rows as Array<{ id: string; usuario_id: string; estado: string; renovacion_de: string | null }>;
    if (!compra) return { ok: false, status: 404, mensaje: 'Anuncio no encontrado.' };
    if (compra.usuario_id !== usuarioId) return { ok: false, status: 403, mensaje: 'Este anuncio no es tuyo.' };
    if (compra.renovacion_de) return { ok: false, status: 400, mensaje: 'Ese registro es un pago de renovación, no un anuncio.' };
    if (compra.estado !== 'activa') return { ok: false, status: 409, mensaje: 'Solo puedes cambiar la imagen de un anuncio activo.' };

    const entradas = Object.entries(input.cambios ?? {}) as Array<[CarruselPub, { imagenUrl: string; posX: number; posY: number }]>;
    if (entradas.length === 0) return { ok: false, status: 400, mensaje: 'No hay cambios que guardar.' };
    for (const [carrusel, datos] of entradas) {
        if (!CARRUSELES_VALIDOS.includes(carrusel)) return { ok: false, status: 400, mensaje: 'Tamaño inválido.' };
        if (!datos.imagenUrl) return { ok: false, status: 400, mensaje: 'Falta la imagen.' };
        if (!Number.isInteger(datos.posX) || datos.posX < 0 || datos.posX > 100) return { ok: false, status: 400, mensaje: 'Posición X inválida.' };
        if (!Number.isInteger(datos.posY) || datos.posY < 0 || datos.posY > 100) return { ok: false, status: 400, mensaje: 'Posición Y inválida.' };
    }

    const actuales = (await db.execute(sql`
        SELECT carrusel, imagen_url FROM publicidad_piezas WHERE compra_id = ${compraId}::uuid
    `)).rows as Array<{ carrusel: string; imagen_url: string }>;
    const actualesMap = new Map(actuales.map((p) => [p.carrusel, p.imagen_url]));
    for (const [carrusel] of entradas) {
        if (!actualesMap.has(carrusel)) {
            return { ok: false, status: 400, mensaje: `Tu anuncio no tiene el tamaño "${carrusel}"; eso solo se cambia con Renovar.` };
        }
    }

    // Imágenes viejas de las piezas que van a cambiar (para limpiar R2 después, si quedan huérfanas).
    const viejas = entradas
        .map(([carrusel]) => actualesMap.get(carrusel)!)
        .filter((url, i, arr) => url && arr.indexOf(url) === i);

    await db.transaction(async (tx) => {
        for (const [carrusel, datos] of entradas) {
            await tx.execute(sql`
                UPDATE publicidad_piezas
                SET imagen_url = ${datos.imagenUrl}, pos_x = ${datos.posX}, pos_y = ${datos.posY}
                WHERE compra_id = ${compraId}::uuid AND carrusel = ${carrusel}
            `);
        }
        await tx.execute(sql`UPDATE publicidad_compras SET updated_at = now() WHERE id = ${compraId}::uuid`);
    });

    notificarCambioPublicidad('editar'); // se refleja al instante en la columna pública

    // Limpieza best-effort de las imágenes reemplazadas que nadie más usa.
    try {
        const { eliminarImagenSiHuerfana } = await import('./negocioManagement.service.js');
        const nuevas = new Set(entradas.map(([, datos]) => datos.imagenUrl));
        for (const url of viejas) {
            if (!nuevas.has(url)) await eliminarImagenSiHuerfana(url);
        }
    } catch (e) {
        console.error('Error limpiando imágenes reemplazadas en cambiarImagenAnuncio:', e);
    }

    return { ok: true, estado: compra.estado };
}
