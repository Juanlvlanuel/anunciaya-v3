/**
 * configuracionPublica.controller.ts
 * ==================================
 * Endpoint PÚBLICO (sin auth) para que la app web lea los valores del negocio que se muestran al
 * visitante antes de registrarse — hoy: la duración del trial (días gratis de la cuenta comercial)
 * y el precio mensual de la membresía comercial.
 *
 * Lee de `configuracion_sistema` con el mismo helper cacheado que el resto del backend, así que refleja
 * lo que el SuperAdmin configure en el Panel. Nunca expone datos sensibles: solo lo que la landing pinta.
 *
 * Ubicación: apps/api/src/controllers/configuracionPublica.controller.ts
 */

import type { Request, Response } from 'express';
import { obtenerConfigNumero, obtenerConfigTexto } from '../services/configuracion.service.js';

// =============================================================================
// GET /api/configuracion-publica   (público · valores que pinta la landing)
// =============================================================================

export async function obtenerConfigPublicaController(_req: Request, res: Response): Promise<void> {
    try {
        const [trialDias, precioMembresia, precioAnualConfig, priceAnualId] = await Promise.all([
            obtenerConfigNumero('trial_duracion_dias', 14),
            obtenerConfigNumero('precio_membresia_mxn', 849),
            obtenerConfigNumero('precio_membresia_anual_mxn', 0),
            obtenerConfigTexto('stripe_price_comercial_anual_id', ''),
        ]);
        // El anual se cobra como 10 meses (2 gratis); si aún no se sembró en config, se deriva del mensual.
        const precioMembresiaAnual = precioAnualConfig > 0 ? precioAnualConfig : precioMembresia * 10;
        // El plan anual solo se ofrece si su Price ya existe en Stripe (lo crea el botón del Panel).
        const anualDisponible = priceAnualId.trim() !== '';
        res.status(200).json({ success: true, data: { trialDias, precioMembresia, precioMembresiaAnual, anualDisponible } });
    } catch (error) {
        // La landing nunca debe romperse por esto: ante cualquier fallo, devolver los defaults.
        console.error('Error en obtenerConfigPublicaController:', error);
        res.status(200).json({ success: true, data: { trialDias: 14, precioMembresia: 849, precioMembresiaAnual: 8490, anualDisponible: false } });
    }
}
