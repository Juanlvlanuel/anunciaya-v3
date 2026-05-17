/**
 * servicios-validaciones.test.ts
 * ===============================
 * Tests del schema Zod `crearPublicacionSchema` de Servicios y helpers
 * relacionados (no toca BD).
 *
 * Cubre:
 *   - Coherencia modo/tipo (refines del schema)
 *   - Categoría solo para modo='solicito'
 *   - Precio discriminated union (5 variantes)
 *   - Presupuesto solo para tipo='solicito'
 *   - Confirmaciones obligatorias
 *   - Heurística de moderación pasiva
 *
 * EJECUTAR: cd apps/api && pnpm test -- servicios-validaciones
 *
 * UBICACIÓN: apps/api/src/__tests__/servicios-validaciones.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
    crearPublicacionSchema,
    crearResenaSchema,
} from '../validations/servicios.schema';

// =============================================================================
// Fixture base — una publicación de ofrezco válida y mínima
// =============================================================================

function publicacionValidaOfrezco() {
    return {
        modo: 'ofrezco' as const,
        tipo: 'servicio-persona' as const,
        subtipo: 'servicio-personal' as const,
        titulo: 'Plomería residencial 24h',
        descripcion:
            'Servicio de plomería para casa habitación. Reparación de fugas e instalación.',
        fotos: [],
        fotoPortadaIndex: 0,
        precio: { kind: 'hora' as const, monto: 350 },
        modalidad: 'presencial' as const,
        latitud: 31.3145,
        longitud: -113.5455,
        ciudad: 'Puerto Peñasco',
        zonasAproximadas: ['Centro'],
        skills: ['Plomería', 'Reparación'],
        requisitos: [],
        diasSemana: [],
        confirmaciones: {
            legal: true,
            verdadera: true,
            coordinacion: true,
            version: 'v2-2026-05-16',
        },
    };
}

function publicacionValidaSolicito() {
    return {
        ...publicacionValidaOfrezco(),
        modo: 'solicito' as const,
        tipo: 'solicito' as const,
        subtipo: 'servicio-puntual' as const,
        titulo: 'Busco fotógrafo para boda',
        descripcion:
            'Necesito fotógrafo para boda sábado 20 junio en Las Conchas.',
        precio: { kind: 'a-convenir' as const },
        presupuesto: { min: 3500, max: 5000 },
        categoria: 'eventos' as const,
        skills: [],
    };
}

// =============================================================================
// 1. Schema acepta publicaciones válidas
// =============================================================================

describe('crearPublicacionSchema — casos felices', () => {
    it('acepta una publicación válida de ofrezco', () => {
        const result = crearPublicacionSchema.safeParse(
            publicacionValidaOfrezco(),
        );
        expect(result.success).toBe(true);
    });

    it('acepta una publicación válida de solicito con presupuesto', () => {
        const result = crearPublicacionSchema.safeParse(
            publicacionValidaSolicito(),
        );
        expect(result.success).toBe(true);
    });

    it('acepta los 5 kinds de precio', () => {
        const variantes = [
            { kind: 'fijo', monto: 500, moneda: 'MXN' },
            { kind: 'hora', monto: 250 },
            { kind: 'mensual', monto: 8500 },
            { kind: 'rango', min: 1000, max: 2000, moneda: 'MXN' },
            { kind: 'a-convenir' },
        ];
        for (const precio of variantes) {
            const result = crearPublicacionSchema.safeParse({
                ...publicacionValidaOfrezco(),
                precio,
            });
            expect(result.success).toBe(true);
        }
    });
});

// =============================================================================
// 2. Refines — coherencia entre campos
// =============================================================================

describe('crearPublicacionSchema — refines de coherencia', () => {
    it('rechaza modo=ofrezco con tipo=solicito', () => {
        const result = crearPublicacionSchema.safeParse({
            ...publicacionValidaOfrezco(),
            tipo: 'solicito',
        });
        expect(result.success).toBe(false);
    });

    it('rechaza presupuesto cuando tipo NO es solicito', () => {
        const result = crearPublicacionSchema.safeParse({
            ...publicacionValidaOfrezco(),
            presupuesto: { min: 100, max: 200 },
        });
        expect(result.success).toBe(false);
    });

    it('rechaza categoria cuando modo NO es solicito', () => {
        const result = crearPublicacionSchema.safeParse({
            ...publicacionValidaOfrezco(),
            categoria: 'hogar',
        });
        expect(result.success).toBe(false);
    });

    it('rechaza si alguna confirmación es false', () => {
        const result = crearPublicacionSchema.safeParse({
            ...publicacionValidaOfrezco(),
            confirmaciones: {
                legal: true,
                verdadera: true,
                coordinacion: false,
                version: 'v2-2026-05-16',
            },
        });
        expect(result.success).toBe(false);
    });

    it('rechaza presupuesto con max < min', () => {
        const result = crearPublicacionSchema.safeParse({
            ...publicacionValidaSolicito(),
            presupuesto: { min: 5000, max: 1000 },
        });
        expect(result.success).toBe(false);
    });

    it('rechaza precio rango con max < min', () => {
        const result = crearPublicacionSchema.safeParse({
            ...publicacionValidaOfrezco(),
            precio: { kind: 'rango', min: 2000, max: 500 },
        });
        expect(result.success).toBe(false);
    });
});

// =============================================================================
// 3. Validaciones de campos individuales
// =============================================================================

describe('crearPublicacionSchema — límites de campos', () => {
    it('rechaza título menor a 10 caracteres', () => {
        const result = crearPublicacionSchema.safeParse({
            ...publicacionValidaOfrezco(),
            titulo: 'Corto',
        });
        expect(result.success).toBe(false);
    });

    it('rechaza descripción menor a 30 caracteres', () => {
        const result = crearPublicacionSchema.safeParse({
            ...publicacionValidaOfrezco(),
            descripcion: 'Muy corta.',
        });
        expect(result.success).toBe(false);
    });

    it('rechaza más de 6 fotos', () => {
        const fotos = Array.from(
            { length: 7 },
            (_, i) => `https://example.com/foto${i}.jpg`,
        );
        const result = crearPublicacionSchema.safeParse({
            ...publicacionValidaOfrezco(),
            fotos,
        });
        expect(result.success).toBe(false);
    });

    it('rechaza más de 8 skills', () => {
        const skills = Array.from({ length: 9 }, (_, i) => `Skill${i}`);
        const result = crearPublicacionSchema.safeParse({
            ...publicacionValidaOfrezco(),
            skills,
        });
        expect(result.success).toBe(false);
    });

    it('acepta categoria=empleo en solicito', () => {
        const result = crearPublicacionSchema.safeParse({
            ...publicacionValidaSolicito(),
            categoria: 'empleo',
            subtipo: 'busco-empleo',
        });
        expect(result.success).toBe(true);
    });
});

// =============================================================================
// 4. Schema de reseñas (Sprint 7.6)
// =============================================================================

describe('crearResenaSchema', () => {
    it('acepta rating 1-5 con texto', () => {
        for (let r = 1; r <= 5; r++) {
            const result = crearResenaSchema.safeParse({
                rating: r,
                texto: 'Excelente servicio.',
            });
            expect(result.success).toBe(true);
        }
    });

    it('rechaza rating 0 y rating 6', () => {
        expect(
            crearResenaSchema.safeParse({ rating: 0 }).success,
        ).toBe(false);
        expect(
            crearResenaSchema.safeParse({ rating: 6 }).success,
        ).toBe(false);
    });

    it('rechaza rating no entero', () => {
        expect(
            crearResenaSchema.safeParse({ rating: 4.5 }).success,
        ).toBe(false);
    });

    it('acepta texto vacío y lo normaliza a null', () => {
        const result = crearResenaSchema.safeParse({ rating: 5, texto: '' });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.texto).toBe(null);
        }
    });

    it('rechaza texto mayor a 200 chars', () => {
        const result = crearResenaSchema.safeParse({
            rating: 5,
            texto: 'a'.repeat(201),
        });
        expect(result.success).toBe(false);
    });
});
