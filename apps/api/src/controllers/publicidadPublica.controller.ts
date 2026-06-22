/**
 * publicidadPublica.controller.ts
 * ===============================
 * GET /api/publicidad?ciudadId= (público, sin auth) — anuncios vigentes de una ciudad para
 * la columna derecha. Solo llama al service y nunca rompe la app (ante un fallo, vacío).
 *
 * Ubicación: apps/api/src/controllers/publicidadPublica.controller.ts
 */

import type { Request, Response } from 'express';
import { listarPublicidadPublica, registrarClickPieza, descartarImagenesHuerfanas } from '../services/publicidadPublica.service.js';
import { generarPresignedUrl } from '../services/r2.service.js';
import {
    calcularPrecioPublicidad,
    obtenerOpcionesPublicidad,
    CARRUSELES_VALIDOS,
    type CarruselPub,
} from '../services/publicidad-precio.service.js';
import { crearCheckoutPublicidad } from '../services/publicidad-checkout.service.js';

const TIPOS_IMG = ['image/jpeg', 'image/png', 'image/webp'];

export async function listarPublicidadPublicaController(req: Request, res: Response): Promise<void> {
    try {
        const ciudadId = typeof req.query.ciudadId === 'string' ? req.query.ciudadId.trim() : '';
        const data = await listarPublicidadPublica(ciudadId);
        res.status(200).json({ success: true, data });
    } catch (error) {
        // La columna de publicidad nunca debe romper la app: ante un fallo, devolver vacío.
        console.error('Error en listarPublicidadPublicaController:', error);
        res.status(200).json({ success: true, data: { anuncios: [], patrocinadores: [], fundadores: [] } });
    }
}

/**
 * POST /api/publicidad/upload-imagen (requiere auth) — genera una presigned URL para que el
 * anunciante (alta manual del Panel o wizard self-service) suba su creatividad a R2 (carpeta
 * 'publicidad'). Devuelve { uploadUrl, publicUrl }. Solo imágenes.
 */
export async function uploadImagenPublicidadController(req: Request, res: Response): Promise<void> {
    try {
        const { nombreArchivo, contentType } = (req.body ?? {}) as { nombreArchivo?: string; contentType?: string };
        if (!nombreArchivo || !contentType) {
            res.status(400).json({ success: false, message: 'Se requiere nombreArchivo y contentType' });
            return;
        }
        const resultado = await generarPresignedUrl('publicidad', nombreArchivo, contentType, 300, TIPOS_IMG);
        res.status(resultado.success ? 200 : resultado.code).json(resultado);
    } catch (error) {
        console.error('Error en uploadImagenPublicidadController:', error);
        res.status(500).json({ success: false, message: 'Error al generar URL de subida' });
    }
}

/**
 * POST /api/publicidad/imagenes-descartadas (requiere auth) — al cerrar el alta/wizard, el front manda
 * las creatividades que subió en la sesión; el service borra de R2 solo las que NO quedaron ligadas a
 * un anuncio (reference count). Best-effort: nunca rompe la UX.
 */
export async function descartarImagenesPublicidadController(req: Request, res: Response): Promise<void> {
    try {
        const urls = Array.isArray(req.body?.urls) ? (req.body.urls as string[]) : [];
        const data = await descartarImagenesHuerfanas(urls);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en descartarImagenesPublicidadController:', error);
        res.status(200).json({ success: true, data: { borradas: 0 } });
    }
}

/** POST /api/publicidad/pieza/:piezaId/click — cuenta el "ver grande" del anuncio. Nunca rompe. */
export async function clickPiezaController(req: Request, res: Response): Promise<void> {
    try {
        await registrarClickPieza(req.params.piezaId);
    } catch (error) {
        console.error('Error en clickPiezaController:', error);
    }
    res.status(200).json({ success: true });
}

/** GET /api/publicidad/opciones — precios base + reglas (límite, duración, descuento) para el wizard. */
export async function opcionesPublicidadController(_req: Request, res: Response): Promise<void> {
    try {
        const data = await obtenerOpcionesPublicidad();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en opcionesPublicidadController:', error);
        res.status(500).json({ success: false, message: 'Error al obtener las opciones' });
    }
}

/** GET /api/publicidad/precio?carruseles=anuncios,patrocinadores&ciudades=3 — desglose del precio. */
export async function precioPublicidadController(req: Request, res: Response): Promise<void> {
    try {
        const carrRaw = typeof req.query.carruseles === 'string' ? req.query.carruseles : '';
        const carruseles = carrRaw.split(',').map((s) => s.trim()).filter((c): c is CarruselPub => (CARRUSELES_VALIDOS as readonly string[]).includes(c));
        const ciudades = Math.max(1, parseInt(String(req.query.ciudades ?? '1'), 10) || 1);
        const meses = Math.max(1, parseInt(String(req.query.meses ?? '1'), 10) || 1);
        if (carruseles.length === 0) {
            res.status(400).json({ success: false, message: 'Elige al menos un carrusel.' });
            return;
        }
        const data = await calcularPrecioPublicidad(carruseles, ciudades, meses);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error en precioPublicidadController:', error);
        res.status(500).json({ success: false, message: 'Error al calcular el precio' });
    }
}

/** POST /api/publicidad/checkout (requiere auth) — wizard self-service: crea el anuncio pendiente y abre Stripe. */
export async function checkoutPublicidadController(req: Request, res: Response): Promise<void> {
    try {
        const usuarioId = (req.usuario as { usuarioId?: string } | undefined)?.usuarioId;
        if (!usuarioId) {
            res.status(401).json({ success: false, message: 'No autenticado' });
            return;
        }
        const body = (req.body ?? {}) as Record<string, unknown>;
        const resultado = await crearCheckoutPublicidad(usuarioId, {
            carruseles: (Array.isArray(body.carruseles) ? body.carruseles : []) as CarruselPub[],
            imagenes: (typeof body.imagenes === 'object' && body.imagenes !== null ? body.imagenes : {}) as Partial<Record<CarruselPub, string>>,
            ciudadIds: Array.isArray(body.ciudadIds) ? (body.ciudadIds as string[]) : [],
            meses: typeof body.meses === 'number' ? body.meses : undefined,
        });
        if (!resultado.ok) {
            res.status(resultado.status).json({ success: false, message: resultado.mensaje });
            return;
        }
        res.status(200).json({ success: true, data: { checkoutUrl: resultado.checkoutUrl } });
    } catch (error) {
        console.error('Error en checkoutPublicidadController:', error);
        res.status(500).json({ success: false, message: 'Error al iniciar el pago' });
    }
}
