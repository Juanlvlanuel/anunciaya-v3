/**
 * marketplace-busco-validaciones.test.ts
 * =======================================
 * Tests del doble sentido Vendo/Busco en MarketPlace:
 *   - Ramificación por `modo` de `crearArticuloSchema` (Zod).
 *   - Reconciliación de la moderación (`validarTextoPublicacion`) según el modo.
 *
 * EJECUTAR: cd apps/api && pnpm test -- marketplace-busco-validaciones
 * Doc: docs/arquitectura/Marketplace_Busco.md
 */

import { describe, it, expect } from 'vitest';
import { crearArticuloSchema } from '../validations/marketplace.schema.js';
import { validarTextoPublicacion } from '../services/marketplace/filtros.js';

// Payload base de una VENTA válida (modo 'vendo' por default).
function ventaValida() {
    return {
        titulo: 'Bicicleta rodada 26',
        descripcion: 'Bicicleta de montaña en buen estado, poco uso.',
        precio: 2800,
        fotos: ['https://cdn.anunciaya.mx/marketplace/foto1.jpg'],
        fotoPortadaIndex: 0,
        latitud: 31.3,
        longitud: -113.5,
        ciudad: 'Puerto Peñasco',
        zonaAproximada: 'Centro',
    };
}

// Payload base de una BÚSQUEDA válida (modo 'busco').
function busquedaValida() {
    return {
        modo: 'busco' as const,
        titulo: 'Busco cama matrimonial',
        descripcion: 'Necesito una cama matrimonial en buen estado.',
        latitud: 31.3,
        longitud: -113.5,
        ciudad: 'Puerto Peñasco',
        zonaAproximada: 'Centro',
    };
}

describe('crearArticuloSchema — modo vendo', () => {
    it('acepta una venta válida (default modo=vendo)', () => {
        const r = crearArticuloSchema.safeParse(ventaValida());
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.modo).toBe('vendo');
    });

    it('rechaza venta sin precio', () => {
        const { precio, ...sinPrecio } = ventaValida();
        void precio;
        const r = crearArticuloSchema.safeParse(sinPrecio);
        expect(r.success).toBe(false);
    });

    it('rechaza venta sin fotos', () => {
        const r = crearArticuloSchema.safeParse({ ...ventaValida(), fotos: [] });
        expect(r.success).toBe(false);
    });

    it('rechaza venta con presupuesto (solo aplica a búsquedas)', () => {
        const r = crearArticuloSchema.safeParse({
            ...ventaValida(),
            presupuesto: { min: 100, max: 200 },
        });
        expect(r.success).toBe(false);
    });

    it('acepta venta sin zona (la zona es opcional)', () => {
        const { zonaAproximada, ...sinZona } = ventaValida();
        void zonaAproximada;
        const r = crearArticuloSchema.safeParse(sinZona);
        expect(r.success).toBe(true);
    });
});

describe('crearArticuloSchema — modo busco', () => {
    it('acepta una búsqueda válida sin precio ni fotos', () => {
        const r = crearArticuloSchema.safeParse(busquedaValida());
        expect(r.success).toBe(true);
        if (r.success) {
            expect(r.data.modo).toBe('busco');
            expect(r.data.precio).toBeUndefined();
        }
    });

    it('acepta una búsqueda con presupuesto {min,max}', () => {
        const r = crearArticuloSchema.safeParse({
            ...busquedaValida(),
            presupuesto: { min: 500, max: 1500 },
            urgente: true,
        });
        expect(r.success).toBe(true);
    });

    it('acepta una búsqueda sin zona (opcional)', () => {
        const { zonaAproximada, ...sinZona } = busquedaValida();
        void zonaAproximada;
        const r = crearArticuloSchema.safeParse(sinZona);
        expect(r.success).toBe(true);
    });

    it('rechaza búsqueda con precio', () => {
        const r = crearArticuloSchema.safeParse({
            ...busquedaValida(),
            precio: 500,
        });
        expect(r.success).toBe(false);
    });

    it('rechaza búsqueda con condición (campo de venta)', () => {
        const r = crearArticuloSchema.safeParse({
            ...busquedaValida(),
            condicion: 'usado',
        });
        expect(r.success).toBe(false);
    });

    it('rechaza presupuesto con max < min', () => {
        const r = crearArticuloSchema.safeParse({
            ...busquedaValida(),
            presupuesto: { min: 1500, max: 500 },
        });
        expect(r.success).toBe(false);
    });
});

describe('validarTextoPublicacion — reconciliación por modo', () => {
    it('en modo vendo, "busco una cama" sugiere cambiar (categoría busqueda)', () => {
        const r = validarTextoPublicacion('Busco una cama', 'Necesito comprar una cama', 'vendo');
        expect(r.valido).toBe(false);
        expect(r.categoria).toBe('busqueda');
    });

    it('en modo busco, "busco una cama" NO se marca (es lo esperado)', () => {
        const r = validarTextoPublicacion('Busco una cama', 'Necesito comprar una cama', 'busco');
        expect(r.valido).toBe(true);
    });

    it('las palabras prohibidas se rechazan en ambos modos', () => {
        const vendo = validarTextoPublicacion('Vendo boletos de rifa', 'Gran rifa', 'vendo');
        const busco = validarTextoPublicacion('Busco boletos de rifa', 'Para la rifa', 'busco');
        expect(vendo.valido).toBe(false);
        expect(vendo.severidad).toBe('rechazo');
        expect(busco.valido).toBe(false);
        expect(busco.severidad).toBe('rechazo');
    });
});
